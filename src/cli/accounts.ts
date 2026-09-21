/**
 * Standalone Antigravity account manager.
 *
 * Inside OpenCode, accounts are managed by the menu in `opencode auth login`
 * (on both generations). This CLI is the same set of operations for when
 * OpenCode is not running — recovering a pool that has gone wrong, scripting,
 * or checking quota from a shell:
 *
 *   antigravity-accounts            # installed
 *   npm run accounts                # from a clone of this repo
 *
 * It edits `antigravity-accounts.json` directly, so quit OpenCode first: a
 * running instance holds the pool in memory and can write its own copy back
 * over a change made here.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { ANTIGRAVITY_PROVIDER_ID } from "../constants";
import { oauthFlowHelpers, verifyAccountAccess } from "../plugin";
import {
  accountLabel,
  accountState,
  allAccountIndices,
  deleteAccount,
  loadAccountPool,
  parseAccountNumber,
  renderAccountList,
  renderAccounts,
  renderQuota,
  renderVerification,
  setAccountEnabled,
} from "../plugin/account-admin";
import { addAccountViaBrowser, completePastedLogin, createAuthorization } from "../plugin/account-login";
import type { AccountLoginResult } from "../plugin/account-login";
import { pressEnterToContinue } from "../plugin/cli";
import { updateOpencodeConfig } from "../plugin/config/updater";
import { checkAccountsQuota } from "../plugin/quota";
import { clearAccounts } from "../plugin/storage";
import type { AccountStorageV4 } from "../plugin/storage";
import type { PluginClient } from "../plugin/types";
import { showAccountDetails, showAuthMenu, isTTY } from "../plugin/ui/auth-menu";
import type { AccountInfo } from "../plugin/ui/auth-menu";
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
  quota [--detailed]     Show rate limits per account (--json for raw data)
  verify [<n>|--all]     Check whether accounts can reach Antigravity
  help                   Show this help

Inside OpenCode, \`opencode auth login\` shows the same menu without stopping
the app.
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

function toAccountInfos(storage: AccountStorageV4): AccountInfo[] {
  const now = Date.now();
  return storage.accounts.map((account, index) => ({
    email: account.email,
    index,
    addedAt: account.addedAt,
    lastUsed: account.lastUsed,
    status: accountState(account, now),
    isCurrentAccount: index === (storage.activeIndex ?? 0),
    enabled: account.enabled !== false,
  }));
}

// -- login -------------------------------------------------------------------

/** Pastes the redirect URL by hand, for SSH, containers and `--no-browser`. */
async function addAccountManually(): Promise<AccountLoginResult> {
  const { url, state } = await createAuthorization(oauthFlowHelpers);
  console.log("\nOpen this URL and pick the Google account you want to add:\n");
  console.log(`${url}\n`);
  await oauthFlowHelpers.openBrowser(url);

  if (!input.isTTY) {
    return {
      ok: false,
      message: "Pasting the redirect URL needs an interactive terminal. Run this command from one.",
    };
  }

  const pasted = await readLine("Paste the full redirect URL (or just the code): ");
  return completePastedLogin(oauthFlowHelpers, pasted, state);
}

async function addAccount(options: { noBrowser: boolean }): Promise<boolean> {
  const result = options.noBrowser
    ? await addAccountManually()
    : await addAccountViaBrowser(oauthFlowHelpers, {
        onAuthorizationUrl: (url) => {
          console.log("\nOpen this URL and pick the Google account you want to add:\n");
          console.log(`${url}\n`);
          console.log("Waiting for the browser redirect...");
        },
      });

  console.log(`\n${result.message}\n`);
  return result.ok;
}

// -- interactive menu --------------------------------------------------------

async function runMenu(): Promise<void> {
  for (;;) {
    const storage = await loadAccountPool();
    if (!storage) {
      console.log(renderAccountList(storage));
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
        console.log(`\n${await renderQuota(client, ANTIGRAVITY_PROVIDER_ID, { detailed: true })}\n`);
        await pressEnterToContinue();
        break;

      case "verify": {
        const answer = await readLine("Account number to verify: ");
        const index = parseAccountNumber(answer);
        if (index !== null) {
          console.log(
            `\n${await renderVerification([index], verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID)}\n`,
          );
        }
        await pressEnterToContinue();
        break;
      }

      case "verify-all":
        console.log(
          `\n${await renderVerification(
            await allAccountIndices(),
            verifyAccountAccess,
            client,
            ANTIGRAVITY_PROVIDER_ID,
          )}\n`,
        );
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
          const result = await setAccountEnabled(index, action.account.enabled === false);
          console.log(`\n${result.message}\n`);
          await pressEnterToContinue();
        } else if (choice === "delete") {
          const result = await deleteAccount(index);
          console.log(`\n${result.message}\n`);
          await pressEnterToContinue();
        } else if (choice === "refresh") {
          const label = accountLabel(storage.accounts[index], index);
          console.log(`\nSign in again as ${label} to replace its token.\n`);
          await addAccount({ noBrowser: false });
          await pressEnterToContinue();
        } else if (choice === "verify") {
          console.log(
            `\n${await renderVerification([index], verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID)}\n`,
          );
          await pressEnterToContinue();
        }
        break;
      }
    }
  }
}

// -- entry point -------------------------------------------------------------

export async function runAccountsCli(argv: readonly string[]): Promise<number> {
  const [command = "", ...rest] = argv;
  const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
  const positional = rest.filter((arg) => !arg.startsWith("--"));

  switch (command) {
    case "":
      if (isTTY() && input.isTTY) {
        await runMenu();
      } else {
        console.log(await renderAccounts());
      }
      return 0;

    case "list":
      console.log(await renderAccounts());
      return 0;

    case "add":
      return (await addAccount({ noBrowser: flags.has("--no-browser") })) ? 0 : 1;

    case "enable":
    case "disable": {
      const index = parseAccountNumber(positional[0]);
      if (index === null) {
        console.log(`Usage: antigravity-accounts ${command} <account number>`);
        return 2;
      }
      const result = await setAccountEnabled(index, command === "enable");
      console.log(result.message);
      return result.ok ? 0 : 1;
    }

    case "remove": {
      if (flags.has("--all")) {
        await clearAccounts();
        console.log("All accounts deleted.");
        return 0;
      }
      const index = parseAccountNumber(positional[0]);
      if (index === null) {
        console.log("Usage: antigravity-accounts remove <account number> | --all");
        return 2;
      }
      const result = await deleteAccount(index);
      console.log(result.message);
      return result.ok ? 0 : 1;
    }

    case "quota": {
      if (flags.has("--json")) {
        const storage = await loadAccountPool();
        if (!storage) {
          console.log(await renderAccounts());
          return 1;
        }
        const results = await checkAccountsQuota(storage.accounts, client, ANTIGRAVITY_PROVIDER_ID);
        console.log(JSON.stringify({ activeIndex: storage.activeIndex ?? 0, accounts: results }, null, 2));
        return 0;
      }
      console.log(await renderQuota(client, ANTIGRAVITY_PROVIDER_ID, { detailed: flags.has("--detailed") }));
      return 0;
    }

    case "verify": {
      const indices = await allAccountIndices();
      if (indices.length === 0) {
        console.log(await renderAccounts());
        return 1;
      }
      if (flags.has("--all") || positional.length === 0) {
        console.log(await renderVerification(indices, verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID));
        return 0;
      }
      const index = parseAccountNumber(positional[0]);
      if (index === null) {
        console.log("Usage: antigravity-accounts verify [<account number>|--all]");
        return 2;
      }
      console.log(await renderVerification([index], verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID));
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
