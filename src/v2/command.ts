/**
 * The `/antigravity` command on OpenCode 2.x.
 *
 * OpenCode 1.x showed an interactive account menu inside `opencode auth login`.
 * OpenCode 2.x owns that prompt and runs plugins in a server process with no
 * stdin, so the menu cannot exist there. A command can: OpenCode 2.x lets a
 * plugin register one (`ctx.command.transform`) and write a message into the
 * session without a model turn (`ctx.session.synthetic`), which is how the
 * account pool becomes manageable from inside OpenCode again:
 *
 *   /antigravity                 list the accounts
 *   /antigravity add             sign in and add another Google account
 *   /antigravity enable 2        put account 2 back into rotation
 *   /antigravity disable 2       take account 2 out of rotation
 *   /antigravity remove 2        delete account 2
 *   /antigravity quota           remaining quota per account
 *   /antigravity verify [n|all]  check accounts against Antigravity
 */

import { ANTIGRAVITY_PROVIDER_ID } from "../constants";
import {
  allAccountIndices,
  deleteAccount,
  parseAccountNumber,
  renderAccounts,
  renderQuota,
  renderVerification,
  setAccountEnabled,
} from "../plugin/account-admin";
import { addAccountViaBrowser } from "../plugin/account-login";
import type { LoginHelpers } from "../plugin/account-login";
import { createLogger } from "../plugin/logger";
import type { PluginClient } from "../plugin/types";
import type { CommandDefinition, CommandInvocation } from "./types";

const log = createLogger("v2-command");

export const ACCOUNT_COMMAND_NAME = "antigravity";

const USAGE = [
  "Antigravity accounts:",
  "  /antigravity                 list stored accounts",
  "  /antigravity add             sign in and add another Google account",
  "  /antigravity enable <n>      put account n back into rotation",
  "  /antigravity disable <n>     take account n out of rotation",
  "  /antigravity remove <n>      delete account n",
  "  /antigravity quota           remaining quota per account",
  "  /antigravity verify [n|all]  check accounts against Antigravity",
].join("\n");

/**
 * What the command needs from the runtime: a way to write into the session, the
 * OAuth helpers, and the two hooks that make a change take effect on the
 * requests already running — the in-memory pool and the cached auth loader.
 */
export interface AccountCommandDeps {
  post(sessionID: string, text: string): Promise<void>;
  helpers: LoginHelpers;
  client: PluginClient;
  /** Mirrors a change into the pool the request path is holding right now. */
  live: {
    setEnabled(index: number, enabled: boolean): void;
    remove(index: number): void;
  };
  /** Makes the next request rebuild the account pool from disk. */
  invalidate(): void;
  verify: Parameters<typeof renderVerification>[1];
}

function splitArguments(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function createAccountCommand(deps: AccountCommandDeps): CommandDefinition {
  async function run(input: CommandInvocation): Promise<string> {
    const [subcommand = "", argument] = splitArguments(input.prompt.text);

    switch (subcommand.toLowerCase()) {
      case "":
      case "list":
        return `${await renderAccounts()}\n\n${USAGE}`;

      case "help":
        return USAGE;

      case "add": {
        // The sign-in takes as long as the person takes, so the URL is posted
        // first and the outcome follows as its own message.
        const login = addAccountViaBrowser(deps.helpers, {
          onAuthorizationUrl: async (url) => {
            await deps.post(
              input.sessionID,
              [
                "Opening Google sign-in. Pick the account you want to ADD:",
                "",
                url,
                "",
                "The account is stored as soon as the browser redirects back.",
              ].join("\n"),
            );
          },
        });

        void login
          .then(async (result) => {
            if (result.ok) deps.invalidate();
            await deps.post(input.sessionID, result.message);
          })
          .catch(async (error: unknown) => {
            log.warn("Account sign-in failed", { error: String(error) });
            await deps
              .post(input.sessionID, `Sign-in failed: ${error instanceof Error ? error.message : String(error)}`)
              .catch(() => {});
          });

        // Nothing to post yet: `onAuthorizationUrl` already did.
        return "";
      }

      case "enable":
      case "disable": {
        const index = parseAccountNumber(argument);
        if (index === null) {
          return `Usage: /antigravity ${subcommand.toLowerCase()} <account number>\n\n${await renderAccounts()}`;
        }
        const enabled = subcommand.toLowerCase() === "enable";
        const result = await setAccountEnabled(index, enabled);
        if (result.ok && result.index !== undefined) {
          deps.live.setEnabled(result.index, enabled);
          deps.invalidate();
        }
        return `${result.message}\n\n${await renderAccounts()}`;
      }

      case "remove":
      case "delete": {
        const index = parseAccountNumber(argument);
        if (index === null) {
          return `Usage: /antigravity remove <account number>\n\n${await renderAccounts()}`;
        }
        const result = await deleteAccount(index);
        if (result.ok && result.index !== undefined) {
          deps.live.remove(result.index);
          deps.invalidate();
        }
        return `${result.message}\n\n${await renderAccounts()}`;
      }

      case "quota":
        return renderQuota(deps.client, ANTIGRAVITY_PROVIDER_ID);

      case "verify": {
        const indices =
          argument === undefined || argument === "all"
            ? await allAccountIndices()
            : (() => {
                const index = parseAccountNumber(argument);
                return index === null ? null : [index];
              })();
        if (indices === null) {
          return "Usage: /antigravity verify [<account number>|all]";
        }
        if (indices.length === 0) {
          return renderAccounts();
        }
        return renderVerification(indices, deps.verify, deps.client, ANTIGRAVITY_PROVIDER_ID);
      }

      default:
        return `Unknown subcommand \`${subcommand}\`.\n\n${USAGE}`;
    }
  }

  return {
    name: ACCOUNT_COMMAND_NAME,
    description: "Manage the Google accounts the Antigravity plugin rotates between",
    execute: async (input) => {
      let text: string;
      try {
        text = await run(input);
      } catch (error) {
        log.warn("Command failed", { error: String(error) });
        text = `/antigravity failed: ${error instanceof Error ? error.message : String(error)}`;
      }
      if (text) {
        await deps.post(input.sessionID, text);
      }
    },
  };
}
