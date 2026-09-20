import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAccountsCli } from "./accounts";
import type { AccountStorageV4 } from "../plugin/storage";

// The CLI reaches the plugin runtime for its OAuth helpers, which pulls in the
// OpenCode SDK; its published `tool` entry does not resolve under vitest.
vi.mock("@opencode-ai/plugin", () => ({
  tool: Object.assign((definition: unknown) => definition, {
    schema: {
      string: () => ({ describe: () => ({}) }),
      boolean: () => ({ optional: () => ({ default: () => ({ describe: () => ({}) }) }) }),
      array: () => ({ optional: () => ({ describe: () => ({}) }) }),
    },
  }),
}));

let configDir: string;
let logged: string[];

async function writeStorage(storage: AccountStorageV4): Promise<void> {
  await fs.writeFile(
    join(configDir, "antigravity-accounts.json"),
    JSON.stringify(storage, null, 2),
    "utf-8",
  );
}

async function readStorage(): Promise<AccountStorageV4> {
  const content = await fs.readFile(join(configDir, "antigravity-accounts.json"), "utf-8");
  return JSON.parse(content) as AccountStorageV4;
}

function twoAccounts(): AccountStorageV4 {
  return {
    version: 4,
    accounts: [
      { email: "first@example.com", refreshToken: "token-1", addedAt: 1, lastUsed: 2, enabled: true },
      { email: "second@example.com", refreshToken: "token-2", addedAt: 1, lastUsed: 2, enabled: true },
    ],
    activeIndex: 0,
  };
}

describe("runAccountsCli", () => {
  beforeEach(async () => {
    configDir = await fs.mkdtemp(join(tmpdir(), "antigravity-cli-"));
    process.env.OPENCODE_CONFIG_DIR = configDir;
    logged = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.OPENCODE_CONFIG_DIR;
    await fs.rm(configDir, { recursive: true, force: true });
  });

  it("lists every stored account, including disabled ones", async () => {
    const storage = twoAccounts();
    storage.accounts[1]!.enabled = false;
    await writeStorage(storage);

    expect(await runAccountsCli(["list"])).toBe(0);

    const output = logged.join("\n");
    expect(output).toContain("1. first@example.com");
    expect(output).toContain("2. second@example.com");
    expect(output).toContain("disabled");
  });

  it("says so when nothing is stored yet", async () => {
    expect(await runAccountsCli(["list"])).toBe(0);
    expect(logged.join("\n")).toContain("No Google accounts are stored");
  });

  it("disables and re-enables an account by its listed number", async () => {
    await writeStorage(twoAccounts());

    expect(await runAccountsCli(["disable", "2"])).toBe(0);
    expect((await readStorage()).accounts[1]?.enabled).toBe(false);

    expect(await runAccountsCli(["enable", "2"])).toBe(0);
    expect((await readStorage()).accounts[1]?.enabled).toBe(true);
  });

  it("removes one account and leaves the rest alone", async () => {
    await writeStorage(twoAccounts());

    expect(await runAccountsCli(["remove", "1"])).toBe(0);

    const remaining = (await readStorage()).accounts;
    expect(remaining.map((account) => account.email)).toEqual(["second@example.com"]);
  });

  it("rejects an out-of-range or unparseable account number", async () => {
    await writeStorage(twoAccounts());

    expect(await runAccountsCli(["disable", "7"])).toBe(1);
    expect(await runAccountsCli(["disable", "not-a-number"])).toBe(2);
    expect((await readStorage()).accounts.every((account) => account.enabled !== false)).toBe(true);
  });

  it("reports an unknown command with the usage text", async () => {
    expect(await runAccountsCli(["nope"])).toBe(2);
    expect(logged.join("\n")).toContain("Usage:");
  });
});
