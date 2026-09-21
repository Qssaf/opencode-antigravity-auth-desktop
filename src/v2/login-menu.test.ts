import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ALL_ACCOUNTS_VALUE,
  accountOptions,
  activeAccountCredential,
  answeredAccount,
  answeredAction,
  buildLoginForm,
  runManagementAction,
  withKeepOpenHint,
} from "./login-menu";
import type { ManagementDeps } from "./login-menu";
import type { AccountStorageV4 } from "../plugin/storage";
import type { StringFormField } from "./types";

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
  return JSON.parse(
    await fs.readFile(join(configDir, "antigravity-accounts.json"), "utf-8"),
  ) as AccountStorageV4;
}

function management(): Omit<ManagementDeps, "client" | "integrationID"> & {
  client: ManagementDeps["client"];
  integrationID: string;
} {
  return {
    client: {} as ManagementDeps["client"],
    integrationID: "google",
    verify: async () => ({ status: "ok", message: "ok" }),
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
  };
}

describe("login menu", () => {
  beforeEach(async () => {
    configDir = await fs.mkdtemp(join(tmpdir(), "antigravity-login-menu-"));
    process.env.OPENCODE_CONFIG_DIR = configDir;
    setEnabledCalls = [];
    removeCalls = [];
    invalidated = 0;
  });

  afterEach(async () => {
    delete process.env.OPENCODE_CONFIG_DIR;
    await fs.rm(configDir, { recursive: true, force: true });
  });

  it("offers every stored account plus an all-accounts entry", async () => {
    const storage = twoAccounts();
    storage.accounts[1]!.enabled = false;
    await writeStorage(storage);

    const options = await accountOptions();

    expect(options.map((option) => option.value)).toEqual(["1", "2", ALL_ACCOUNTS_VALUE]);
    expect(options[0]?.label).toBe("1. first@example.com");
    expect(options[0]?.description).toContain("current");
    expect(options[1]?.description).toContain("disabled");
  });

  it("offers no options when nothing is stored", async () => {
    expect(await accountOptions()).toEqual([]);
  });

  it("collapses to a plain sign-in when there is nothing to manage", () => {
    const form = buildLoginForm([]);

    expect(form.map((field) => field.key)).toEqual(["noBrowser", "projectId"]);
    expect(form.every((field) => field.hidden)).toBe(true);
  });

  it("asks what to do when accounts are stored", async () => {
    await writeStorage(twoAccounts());

    const form = buildLoginForm(await accountOptions());
    const action = form.find((field) => field.key === "action") as StringFormField | undefined;
    const account = form.find((field) => field.key === "account") as StringFormField | undefined;

    expect(action?.options?.map((option) => option.value)).toEqual([
      "add",
      "list",
      "enable",
      "disable",
      "remove",
      "quota",
      "verify",
    ]);
    expect(action?.default).toBe("add");
    // The account picker is hidden for the actions that do not need one.
    expect(account?.when).toEqual([
      { key: "action", op: "neq", value: "add" },
      { key: "action", op: "neq", value: "list" },
      { key: "action", op: "neq", value: "quota" },
    ]);
    expect(account?.options?.map((option) => option.label)).toContain("2. second@example.com");
  });

  it("defaults to adding an account when no action was answered", () => {
    expect(answeredAction({})).toBe("add");
    expect(answeredAction({ action: "nonsense" })).toBe("add");
    expect(answeredAction({ action: "disable" })).toBe("disable");
  });

  it("reads the picked account as a zero-based index", () => {
    expect(answeredAccount({ account: "2" })).toBe(1);
    expect(answeredAccount({ account: ALL_ACCOUNTS_VALUE })).toBe("all");
    expect(answeredAccount({})).toBeNull();
    expect(answeredAccount({ account: "0" })).toBeNull();
  });

  it("disables the picked account and syncs the running pool", async () => {
    await writeStorage(twoAccounts());

    const outcome = await runManagementAction("disable", 1, management());

    expect((await readStorage()).accounts[1]?.enabled).toBe(false);
    expect(setEnabledCalls).toEqual([[1, false]]);
    expect(invalidated).toBe(1);
    expect(outcome.changed).toBe(true);
    expect(outcome.text).toContain("second@example.com disabled");
  });

  it("removes the picked account", async () => {
    await writeStorage(twoAccounts());

    const outcome = await runManagementAction("remove", 0, management());

    expect((await readStorage()).accounts.map((account) => account.email)).toEqual(["second@example.com"]);
    expect(removeCalls).toEqual([0]);
    expect(outcome.text).toContain("Deleted first@example.com");
  });

  it("explains when an action needs one account and got none", async () => {
    await writeStorage(twoAccounts());

    const outcome = await runManagementAction("disable", "all", management());

    expect(outcome.changed).toBe(false);
    expect(outcome.text).toContain('Pick a single account for "disable"');
    expect(setEnabledCalls).toEqual([]);
  });

  it("lists without changing anything", async () => {
    await writeStorage(twoAccounts());

    const outcome = await runManagementAction("list", null, management());

    expect(outcome.changed).toBe(false);
    expect(outcome.text).toContain("1. first@example.com");
    expect(invalidated).toBe(0);
  });

  it("verifies every account when all is picked", async () => {
    await writeStorage(twoAccounts());

    const outcome = await runManagementAction("verify", "all", management());

    expect(outcome.text).toContain("first@example.com: ok");
    expect(outcome.text).toContain("second@example.com: ok");
  });

  it("hands back the active account so the login flow can finish", async () => {
    await writeStorage(twoAccounts());

    const credential = await activeAccountCredential();

    expect(credential?.type).toBe("oauth");
    expect(credential?.refresh.startsWith("token-1")).toBe(true);
    expect(credential?.metadata?.email).toBe("first@example.com");
  });

  it("has no credential to hand back when the pool is empty", async () => {
    expect(await activeAccountCredential()).toBeNull();
  });

  it("points at the CLI for a menu that does not close after one action", () => {
    // OpenCode ends the login flow once authorize resolves, so the looping
    // menu lives in the standalone CLI.
    const text = withKeepOpenHint("2 account(s):");

    expect(text).toContain("2 account(s):");
    expect(text).toContain("antigravity-accounts");
  });
});
