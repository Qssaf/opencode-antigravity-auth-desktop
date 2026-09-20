import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_COMMAND_NAME, createAccountCommand } from "./command";
import type { AccountCommandDeps } from "./command";
import type { CommandInvocation } from "./types";
import type { AccountStorageV4 } from "../plugin/storage";

// The command module reaches the plugin runtime's OAuth helpers only through
// the deps below, but the CLI-shared modules pull in the OpenCode SDK, whose
// published `tool` entry does not resolve under vitest.
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
let posted: string[];
let setEnabledCalls: Array<[number, boolean]>;
let removeCalls: number[];
let invalidated: number;

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

function deps(overrides: Partial<AccountCommandDeps> = {}): AccountCommandDeps {
  return {
    post: async (_sessionID, text) => {
      posted.push(text);
    },
    helpers: {
      openBrowser: async () => true,
      shouldSkipLocalServer: () => true,
      getStateFromAuthorizationUrl: () => "state",
      extractOAuthCallbackParams: () => null,
      parseOAuthCallbackInput: () => ({ error: "not used" }),
      persistAccountPool: async () => undefined,
    },
    client: {} as AccountCommandDeps["client"],
    live: {
      setEnabled: (index, enabled) => {
        setEnabledCalls.push([index, enabled]);
      },
      remove: (index) => {
        removeCalls.push(index);
      },
    },
    invalidate: () => {
      invalidated += 1;
    },
    verify: async () => ({ status: "ok", message: "ok" }),
    ...overrides,
  };
}

function invocation(text: string): CommandInvocation {
  return { sessionID: "ses_1", prompt: { text }, delivery: "steer" };
}

async function run(text: string, overrides?: Partial<AccountCommandDeps>): Promise<string> {
  await createAccountCommand(deps(overrides)).execute(invocation(text));
  // `add` finishes in the background so the command does not block the session.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return posted.join("\n---\n");
}

describe("createAccountCommand", () => {
  beforeEach(async () => {
    configDir = await fs.mkdtemp(join(tmpdir(), "antigravity-command-"));
    process.env.OPENCODE_CONFIG_DIR = configDir;
    posted = [];
    setEnabledCalls = [];
    removeCalls = [];
    invalidated = 0;
  });

  afterEach(async () => {
    delete process.env.OPENCODE_CONFIG_DIR;
    await fs.rm(configDir, { recursive: true, force: true });
  });

  it("registers under a name users can type", () => {
    const command = createAccountCommand(deps());
    expect(ACCOUNT_COMMAND_NAME).toBe("antigravity");
    expect(command.name).toBe(ACCOUNT_COMMAND_NAME);
    expect(command.description).toBeTruthy();
  });

  it("lists accounts and the usage when called bare", async () => {
    await writeStorage(twoAccounts());

    const output = await run("");

    expect(output).toContain("1. first@example.com");
    expect(output).toContain("2. second@example.com");
    expect(output).toContain("/antigravity add");
  });

  it("disables an account, syncs the live pool and reloads it", async () => {
    await writeStorage(twoAccounts());

    const output = await run("disable 2");

    expect((await readStorage()).accounts[1]?.enabled).toBe(false);
    expect(setEnabledCalls).toEqual([[1, false]]);
    expect(invalidated).toBe(1);
    expect(output).toContain("second@example.com disabled");
    expect(output).toContain("disabled]");
  });

  it("re-enables an account", async () => {
    const storage = twoAccounts();
    storage.accounts[1]!.enabled = false;
    await writeStorage(storage);

    await run("enable 2");

    expect((await readStorage()).accounts[1]?.enabled).toBe(true);
    expect(setEnabledCalls).toEqual([[1, true]]);
  });

  it("removes an account and detaches it from the running pool", async () => {
    await writeStorage(twoAccounts());

    const output = await run("remove 1");

    expect((await readStorage()).accounts.map((account) => account.email)).toEqual(["second@example.com"]);
    expect(removeCalls).toEqual([0]);
    expect(invalidated).toBe(1);
    expect(output).toContain("Deleted first@example.com");
  });

  it("does not touch the pool for a bad account number", async () => {
    await writeStorage(twoAccounts());

    const output = await run("disable nine");

    expect(output).toContain("Usage: /antigravity disable <account number>");
    expect(setEnabledCalls).toEqual([]);
    expect(invalidated).toBe(0);
    expect((await readStorage()).accounts.every((account) => account.enabled !== false)).toBe(true);
  });

  it("reports an out-of-range account without changing anything", async () => {
    await writeStorage(twoAccounts());

    const output = await run("remove 9");

    expect(output).toContain("No account 9");
    expect(removeCalls).toEqual([]);
    expect((await readStorage()).accounts).toHaveLength(2);
  });

  it("verifies every account when asked for all", async () => {
    await writeStorage(twoAccounts());

    const output = await run("verify all");

    expect(output).toContain("first@example.com: ok");
    expect(output).toContain("second@example.com: ok");
  });

  it("reports a blocked account with its verification URL", async () => {
    await writeStorage(twoAccounts());

    const output = await run("verify 1", {
      verify: async () => ({
        status: "blocked",
        message: "Verify this account",
        verifyUrl: "https://example.com/verify",
      }),
    });

    expect(output).toContain("needs Google verification");
    expect(output).toContain("https://example.com/verify");
  });

  it("explains an unknown subcommand", async () => {
    const output = await run("frobnicate");

    expect(output).toContain("Unknown subcommand");
    expect(output).toContain("/antigravity quota");
  });

  it("surfaces a failed sign-in instead of throwing", async () => {
    // shouldSkipLocalServer() is true in the test helpers, so the browser flow
    // reports that it cannot receive the redirect here.
    const output = await run("add");

    expect(output).toContain("cannot receive the OAuth redirect");
    expect(invalidated).toBe(0);
  });

  it("reports a thrown error as command output instead of failing the session", async () => {
    await writeStorage(twoAccounts());

    const output = await run("verify all", {
      verify: async () => {
        throw new Error("probe exploded");
      },
    });

    expect(output).toContain("/antigravity failed: probe exploded");
  });
});
