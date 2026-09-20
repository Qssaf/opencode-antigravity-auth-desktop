/**
 * Standalone Antigravity account manager.
 *
 * OpenCode 1.x ran the multi-account menu inside `opencode auth login`, because
 * the plugin owned that prompt. OpenCode 2.x (and the desktop app) own the login
 * UI themselves and run plugins in a server process with no stdin, so that menu
 * is unreachable there: a second `auth login` only adds a credential, and there
 * is no way to list, enable, disable or drop the accounts the plugin rotates
 * between.
 *
 * This CLI is that missing surface. It works on both OpenCode generations
 * because it talks to `antigravity-accounts.json` directly:
 *
 *   npx -p @pieliesdie/opencode-antigravity-auth antigravity-accounts
 *
 * or, with the package installed, `antigravity-accounts <command>`.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { authorizeAntigravity, exchangeAntigravity } from "../antigravity/oauth";
import type { AntigravityTokenExchangeResult } from "../antigravity/oauth";
import { ANTIGRAVITY_PROVIDER_ID } from "../constants";
import { oauthFlowHelpers, verifyAccountAccess } from "../plugin";
import { pressEnterToContinue } from "../plugin/cli";
import { updateOpencodeConfig } from "../plugin/config/updater";
import { checkAccountsQuota } from "../plugin/quota";
import { startOAuthListener } from "../plugin/server";
import {
  clearAccounts,
  loadAccounts,
  removeAccountFromStorage,
  saveAccounts,
} from "../plugin/storage";
import type { AccountMetadataV3, AccountStorageV4 } from "../plugin/storage";
import type { PluginClient } from "../plugin/types";
import { showAccountDetails, showAuthMenu, isTTY } from "../plugin/ui/auth-menu";
import type { AccountInfo, AccountStatus } from "../plugin/ui/auth-menu";
import { createLegacyClient } from "../v2/legacy-client";

const USAGE = `Antigravity account manager

Usage:
  antigravity-accounts [command]

Commands:
  (none)                 Interactive menu (falls back to \`list\` without a TTY)
  list                   Show stored accounts
  add [--no-browser]     Sign in and add another Google account
  enable <n>             Re-enable account n (1-based)
  disable <n>            Exclude account n from rotation
  remove <n> | --all     Delete account n, or every account
  quota                  Show remaining quota per account
  verify [<n>|--all]     Check whether accounts can reach Antigravity
  help                   Show this help
`;

/**
 * The plugin's runtime `client` is an OpenCode server handle. Nothing this CLI
 * calls needs one (token refresh and quota checks only take it to hand on), so
 * the 2.x stand-in is reused rather than talking to a running OpenCode.
 */
const client: PluginClient = createLegacyClient();

async function readLine(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function accountLabel(account: AccountMetadataV3 | undefined, index: number): string {
  return account?.email || `Account ${index + 1}`;
}

function accountStatus(account: AccountMetadataV3, now = Date.now()): AccountStatus {
  if (account.verificationRequired) {
    return "verification-required";
  }
  if (account.coolingDownUntil && account.coolingDownUntil > now) {
    return "rate-limited";
  }
  const limits = account.rateLimitResetTimes;
  if (limits && Object.values(limits).some((reset) => typeof reset === "number" && reset > now)) {
    return "rate-limited";
  }
  return "active";
}

function toAccountInfos(storage: AccountStorageV4): AccountInfo[] {
  const now = Date.now();
  return storage.accounts.map((account, index) => ({
    email: account.email,
    index,
    addedAt: account.addedAt,
    lastUsed: account.lastUsed,
    status: accountStatus(account, now),
    isCurrentAccount: index === (storage.activeIndex ?? 0),
    enabled: account.enabled !== false,
  }));
}

/** The stored pool, or null when nothing usable is stored yet. */
async function readStorage(): Promise<AccountStorageV4 | null> {
  const storage = await loadAccounts();
  return storage && storage.accounts.length > 0 ? storage : null;
}

function printAccounts(storage: AccountStorageV4 | null): void {
  if (!storage || storage.accounts.length === 0) {
    console.log("No accounts stored. Run `antigravity-accounts add` to sign in.");
    return;
  }

  console.log(`${storage.accounts.length} account(s):`);
  storage.accounts.forEach((account, index) => {
    const flags = [
      index === (storage.activeIndex ?? 0) ? "current" : "",
      account.enabled === false ? "disabled" : "",
      accountStatus(account) === "active" ? "" : accountStatus(account),
    ].filter(Boolean);
    const suffix = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
    console.log(`  ${index + 1}. ${accountLabel(account, index)}${suffix}`);
  });
}

// -- account mutations -------------------------------------------------------

async function setAccountEnabled(index: number, enabled: boolean): Promise<boolean> {
  const storage = await readStorage();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    console.log(`No account ${index + 1}.`);
    return false;
  }

  account.enabled = enabled;
  await saveAccounts(storage);
  console.log(`${accountLabel(account, index)} ${enabled ? "enabled" : "disabled"}.`);
  return true;
}

async function removeAccount(index: number): Promise<boolean> {
  const storage = await readStorage();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    console.log(`No account ${index + 1}.`);
    return false;
  }

  await removeAccountFromStorage(account.refreshToken);
  console.log(`Deleted ${accountLabel(account, index)}.`);
  return true;
}

// -- login -------------------------------------------------------------------

async function completeWithListener(
  authorizationUrl: string,
  fallbackState: string,
): Promise<AntigravityTokenExchangeResult> {
  let listener: Awaited<ReturnType<typeof startOAuthListener>> | null = null;
  try {
    listener = await startOAuthListener();
  } catch {
    // Port busy or not bindable — fall back to pasting the redirect URL.
    return completeManually(fallbackState);
  }

  try {
    await oauthFlowHelpers.openBrowser(authorizationUrl);
    const callbackUrl = await listener.waitForCallback();
    const params = oauthFlowHelpers.extractOAuthCallbackParams(callbackUrl);
    if (!params) {
      return { type: "failed", error: "Missing code or state in the callback URL" };
    }
    return await exchangeAntigravity(params.code, params.state);
  } catch (error) {
    return { type: "failed", error: error instanceof Error ? error.message : String(error) };
  } finally {
    await listener.close().catch(() => {});
  }
}

async function completeManually(fallbackState: string): Promise<AntigravityTokenExchangeResult> {
  if (!input.isTTY) {
    return {
      type: "failed",
      error: "Pasting the redirect URL needs an interactive terminal. Run this command from one.",
    };
  }
  const pasted = await readLine("Paste the full redirect URL (or just the code): ");
  const params = oauthFlowHelpers.parseOAuthCallbackInput(pasted, fallbackState);
  if ("error" in params) {
    return { type: "failed", error: params.error };
  }
  return exchangeAntigravity(params.code, params.state);
}

async function addAccount(options: { noBrowser: boolean }): Promise<boolean> {
  const before = (await readStorage())?.accounts.length ?? 0;
  const authorization = await authorizeAntigravity("");
  const fallbackState = oauthFlowHelpers.getStateFromAuthorizationUrl(authorization.url);

  console.log("\nOpen this URL and pick the Google account you want to add:\n");
  console.log(`${authorization.url}\n`);

  const manual = options.noBrowser || oauthFlowHelpers.shouldSkipLocalServer();
  const result = manual
    ? await (async () => {
        await oauthFlowHelpers.openBrowser(authorization.url);
        return completeManually(fallbackState);
      })()
    : await completeWithListener(authorization.url, fallbackState);

  if (result.type === "failed") {
    console.log(`\nSign-in failed: ${result.error}\n`);
    return false;
  }

  await oauthFlowHelpers.persistAccountPool([result], false);

  const after = (await readStorage())?.accounts.length ?? before;
  const who = result.email ? ` (${result.email})` : "";
  if (after > before) {
    console.log(`\nAdded account${who}. ${after} account(s) stored.\n`);
  } else {
    console.log(
      `\nSigned in${who}, but the pool still holds ${after} account(s) — Google returned an account that was already stored. ` +
        "Pick a different account on the Google chooser to add another one.\n",
    );
  }
  return true;
}

// -- quota & verification ----------------------------------------------------

function formatResetTime(resetTime?: string): string {
  if (!resetTime) return "";
  const ms = Date.parse(resetTime) - Date.now();
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return " (resetting)";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return ` (resets in ${minutes}m)`;
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? ` (resets in ${days}d ${hours % 24}h)` : ` (resets in ${hours}h)`;
}

function formatRemaining(remaining?: number): string {
  return typeof remaining === "number" ? `${Math.round(remaining * 100)}%` : "unknown";
}

async function showQuota(): Promise<void> {
  const storage = await readStorage();
  if (!storage) {
    printAccounts(storage);
    return;
  }

  console.log("\nChecking quota for every account...\n");
  const results = await checkAccountsQuota(storage.accounts, client, ANTIGRAVITY_PROVIDER_ID);

  for (const result of results) {
    const label = result.email || `Account ${result.index + 1}`;
    console.log(`${label}${result.disabled ? " [disabled]" : ""}`);

    if (result.status === "error") {
      console.log(`  error: ${result.error}\n`);
      continue;
    }

    const groups = result.quota?.groups ?? {};
    const rows: Array<[string, { remainingFraction?: number; resetTime?: string } | undefined]> = [
      ["Claude", groups.claude],
      ["Gemini 3 Pro", groups["gemini-pro"]],
      ["Gemini 3 Flash", groups["gemini-flash"]],
    ];
    const known = rows.filter((row) => row[1]);
    if (known.length === 0) {
      console.log(`  Antigravity: ${result.quota?.error ?? "no quota information"}`);
    } else {
      for (const [name, data] of known) {
        console.log(`  ${name.padEnd(16)} ${formatRemaining(data?.remainingFraction)}${formatResetTime(data?.resetTime)}`);
      }
    }

    for (const model of result.geminiCliQuota?.models ?? []) {
      console.log(
        `  ${`CLI ${model.modelId}`.padEnd(16)} ${formatRemaining(model.remainingFraction)}${formatResetTime(model.resetTime)}`,
      );
    }
    console.log("");
  }
}

async function verifyAccounts(indices: number[]): Promise<void> {
  const storage = await readStorage();
  if (!storage) {
    printAccounts(storage);
    return;
  }

  for (const index of indices) {
    const account = storage.accounts[index];
    if (!account) {
      console.log(`No account ${index + 1}.`);
      continue;
    }

    process.stdout.write(`${accountLabel(account, index)} ... `);
    const verification = await verifyAccountAccess(account, client, ANTIGRAVITY_PROVIDER_ID);
    if (verification.status === "ok") {
      console.log("ok");
      continue;
    }
    if (verification.status === "blocked") {
      console.log("needs verification");
      console.log(`  ${verification.message}`);
      if (verification.verifyUrl) {
        console.log(`  ${verification.verifyUrl}`);
      }
      continue;
    }
    console.log(`error: ${verification.message}`);
  }
  console.log("");
}

// -- interactive menu --------------------------------------------------------

async function runMenu(): Promise<void> {
  for (;;) {
    const storage = await readStorage();
    if (!storage) {
      printAccounts(storage);
      const answer = await readLine("Add an account now? [y/N]: ");
      if (answer.toLowerCase().startsWith("y")) {
        await addAccount({ noBrowser: false });
        continue;
      }
      return;
    }

    const action = await showAuthMenu(toAccountInfos(storage));

    switch (action.type) {
      case "cancel":
        return;

      case "add":
        await addAccount({ noBrowser: false });
        await pressEnterToContinue();
        break;

      case "check":
        await showQuota();
        await pressEnterToContinue();
        break;

      case "verify": {
        const answer = await readLine("Account number to verify: ");
        const index = Number.parseInt(answer, 10) - 1;
        if (Number.isInteger(index) && index >= 0) {
          await verifyAccounts([index]);
        }
        await pressEnterToContinue();
        break;
      }

      case "verify-all":
        await verifyAccounts(storage.accounts.map((_, index) => index));
        await pressEnterToContinue();
        break;

      case "configure-models": {
        const result = await updateOpencodeConfig();
        console.log(
          result.success
            ? `\nModels configured in ${result.configPath}\n`
            : `\nCould not configure models: ${result.error}\n`,
        );
        await pressEnterToContinue();
        break;
      }

      case "delete-all":
        await clearAccounts();
        console.log("\nAll accounts deleted.\n");
        await pressEnterToContinue();
        break;

      case "select-account": {
        const choice = await showAccountDetails(action.account);
        const index = action.account.index;
        if (choice === "toggle") {
          await setAccountEnabled(index, action.account.enabled === false);
          await pressEnterToContinue();
        } else if (choice === "delete") {
          await removeAccount(index);
          await pressEnterToContinue();
        } else if (choice === "refresh") {
          console.log("\nSign in again with the SAME Google account to replace its token.\n");
          await addAccount({ noBrowser: false });
          await pressEnterToContinue();
        } else if (choice === "verify") {
          await verifyAccounts([index]);
          await pressEnterToContinue();
        }
        break;
      }
    }
  }
}

// -- entry point -------------------------------------------------------------

function parseIndexArgument(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed - 1;
}

export async function runAccountsCli(argv: readonly string[]): Promise<number> {
  const [command = "", ...rest] = argv;
  const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
  const positional = rest.filter((arg) => !arg.startsWith("--"));

  switch (command) {
    case "":
      if (isTTY() && input.isTTY) {
        await runMenu();
      } else {
        printAccounts(await readStorage());
      }
      return 0;

    case "list":
      printAccounts(await readStorage());
      return 0;

    case "add":
      return (await addAccount({ noBrowser: flags.has("--no-browser") })) ? 0 : 1;

    case "enable":
    case "disable": {
      const index = parseIndexArgument(positional[0]);
      if (index === null) {
        console.log(`Usage: antigravity-accounts ${command} <account number>`);
        return 2;
      }
      return (await setAccountEnabled(index, command === "enable")) ? 0 : 1;
    }

    case "remove": {
      if (flags.has("--all")) {
        await clearAccounts();
        console.log("All accounts deleted.");
        return 0;
      }
      const index = parseIndexArgument(positional[0]);
      if (index === null) {
        console.log("Usage: antigravity-accounts remove <account number> | --all");
        return 2;
      }
      return (await removeAccount(index)) ? 0 : 1;
    }

    case "quota":
      await showQuota();
      return 0;

    case "verify": {
      const storage = await readStorage();
      if (!storage) {
        printAccounts(storage);
        return 1;
      }
      if (flags.has("--all") || positional.length === 0) {
        await verifyAccounts(storage.accounts.map((_, index) => index));
        return 0;
      }
      const index = parseIndexArgument(positional[0]);
      if (index === null) {
        console.log("Usage: antigravity-accounts verify [<account number>|--all]");
        return 2;
      }
      await verifyAccounts([index]);
      return 0;
    }

    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      return 0;

    default:
      console.log(`Unknown command: ${command}\n`);
      console.log(USAGE);
      return 2;
  }
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  try {
    process.exitCode = await runAccountsCli(argv);
  } catch (error) {
    console.error(`antigravity-accounts: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
