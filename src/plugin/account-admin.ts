/**
 * Account-pool administration, rendered as plain text.
 *
 * One implementation serves both surfaces that manage accounts: the menu the
 * OpenCode 2.x login form prompts (`src/v2/login-menu.ts`) and the standalone
 * CLI (`src/cli/accounts.ts`). Every operation returns text the caller prints,
 * with no ANSI escapes, so it reads the same in a terminal and in OpenCode's
 * own login UI.
 */

import { checkAccountsQuota, findRateLimitBucket, isGeminiRateLimitGroup } from "./quota";
import type { AccountQuotaResult, RateLimitSummary } from "./quota";
import { loadAccounts, removeAccountFromStorage, saveAccounts } from "./storage";
import type { AccountMetadataV3, AccountStorageV4 } from "./storage";
import type { PluginClient } from "./types";

/** What an account is currently able to do, derived from its stored state. */
export type AccountState = "active" | "rate-limited" | "verification-required";

export interface AccountAdminResult {
  /** False when the account did not exist or the pool was empty. */
  readonly ok: boolean;
  readonly message: string;
  /** Set when a stored account was changed, for syncing the live pool. */
  readonly index?: number;
}

export interface VerificationOutcome {
  readonly status: "ok" | "blocked" | "error";
  readonly message: string;
  readonly verifyUrl?: string;
}

/** Probe used by `renderVerification`, supplied by the caller to avoid a cycle. */
export type VerifyAccount = (
  account: AccountMetadataV3,
  client: PluginClient,
  providerId: string,
) => Promise<VerificationOutcome>;

export function accountLabel(account: AccountMetadataV3 | undefined, index: number): string {
  return account?.email || `Account ${index + 1}`;
}

export function accountState(account: AccountMetadataV3, now = Date.now()): AccountState {
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

/** The stored pool, or null when nothing usable is stored yet. */
export async function loadAccountPool(): Promise<AccountStorageV4 | null> {
  const storage = await loadAccounts();
  return storage && storage.accounts.length > 0 ? storage : null;
}

export const NO_ACCOUNTS_MESSAGE =
  "No Google accounts are stored. Run `opencode auth login` to sign in.";

export function renderAccountList(storage: AccountStorageV4 | null): string {
  if (!storage || storage.accounts.length === 0) {
    return NO_ACCOUNTS_MESSAGE;
  }

  const now = Date.now();
  const lines = storage.accounts.map((account, index) => {
    const flags = [
      index === (storage.activeIndex ?? 0) ? "current" : "",
      account.enabled === false ? "disabled" : "",
      accountState(account, now) === "active" ? "" : accountState(account, now),
    ].filter(Boolean);
    const suffix = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
    return `  ${index + 1}. ${accountLabel(account, index)}${suffix}`;
  });

  return [`${storage.accounts.length} account(s):`, ...lines].join("\n");
}

export async function renderAccounts(): Promise<string> {
  return renderAccountList(await loadAccountPool());
}

export async function setAccountEnabled(index: number, enabled: boolean): Promise<AccountAdminResult> {
  const storage = await loadAccountPool();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    return { ok: false, message: `No account ${index + 1}. ${await renderAccounts()}` };
  }

  account.enabled = enabled;
  await saveAccounts(storage);
  return {
    ok: true,
    index,
    message: `${accountLabel(account, index)} ${enabled ? "enabled" : "disabled"}.`,
  };
}

/**
 * Enables or disables several accounts in one read/write, so a batch cannot be
 * half-applied by concurrent saves. `applied` holds the refresh tokens of the
 * accounts changed: the live pool may number its accounts differently from the
 * file, so the token is what identifies an account there.
 */
export async function setAccountsEnabled(
  indices: readonly number[],
  enabled: boolean,
): Promise<AccountAdminResult & { applied: string[] }> {
  const storage = await loadAccountPool();
  if (!storage) {
    return { ok: false, applied: [], message: NO_ACCOUNTS_MESSAGE };
  }

  const applied: string[] = [];
  const labels: string[] = [];
  const missing: number[] = [];

  for (const index of new Set(indices)) {
    const account = storage.accounts[index];
    if (!account) {
      missing.push(index + 1);
      continue;
    }
    account.enabled = enabled;
    applied.push(account.refreshToken);
    labels.push(accountLabel(account, index));
  }

  if (applied.length > 0) {
    await saveAccounts(storage);
  }

  const done = labels.length > 0 ? `${labels.join(", ")} ${enabled ? "enabled" : "disabled"}.` : "";
  const skipped = missing.length > 0 ? `No account ${missing.join(", ")}.` : "";
  return {
    ok: applied.length > 0,
    applied,
    message: [done, skipped].filter(Boolean).join(" ") || NO_ACCOUNTS_MESSAGE,
  };
}

/**
 * Deletes several accounts. They are resolved to refresh tokens before the
 * first delete, because removing one renumbers the accounts after it.
 * `applied` holds those refresh tokens, as for `setAccountsEnabled`.
 */
export async function deleteAccounts(
  indices: readonly number[],
): Promise<AccountAdminResult & { applied: string[] }> {
  const storage = await loadAccountPool();
  if (!storage) {
    return { ok: false, applied: [], message: NO_ACCOUNTS_MESSAGE };
  }

  const targets: Array<{ label: string; refreshToken: string }> = [];
  const missing: number[] = [];
  for (const index of new Set(indices)) {
    const account = storage.accounts[index];
    if (!account) {
      missing.push(index + 1);
      continue;
    }
    targets.push({ label: accountLabel(account, index), refreshToken: account.refreshToken });
  }

  for (const target of targets) {
    await removeAccountFromStorage(target.refreshToken);
  }

  const done = targets.length > 0 ? `Deleted ${targets.map((t) => t.label).join(", ")}.` : "";
  const skipped = missing.length > 0 ? `No account ${missing.join(", ")}.` : "";
  return {
    ok: targets.length > 0,
    applied: targets.map((t) => t.refreshToken),
    message: [done, skipped].filter(Boolean).join(" ") || NO_ACCOUNTS_MESSAGE,
  };
}

export async function deleteAccount(index: number): Promise<AccountAdminResult> {
  const storage = await loadAccountPool();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    return { ok: false, message: `No account ${index + 1}. ${await renderAccounts()}` };
  }

  await removeAccountFromStorage(account.refreshToken);
  return { ok: true, index, message: `Deleted ${accountLabel(account, index)}.` };
}

// -- quota -------------------------------------------------------------------

/** `2d 13h 40m` — the coarse countdown the quota table shows. */
function formatCountdown(resetTime?: string): string {
  if (!resetTime) return "";
  const ms = Date.parse(resetTime) - Date.now();
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "resetting";

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.max(1, Math.floor(ms / 1000))}s`);
  return parts.join(" ");
}

function formatPercent(remaining?: number): string {
  return typeof remaining === "number" ? `${Math.round(remaining * 100)}%`.padStart(4) : " N/A";
}

/** One table cell: `100% (4h 59m)`. */
function formatBucketCell(summary: RateLimitSummary | undefined, gemini: boolean, window: string): string {
  const bucket = findRateLimitBucket(
    summary,
    (group) => (gemini ? isGeminiRateLimitGroup(group) : !isGeminiRateLimitGroup(group)),
    window,
  );
  if (!bucket) return "N/A";
  const countdown = formatCountdown(bucket.resetTime);
  const exhausted = bucket.disabled ? " [exhausted]" : "";
  return `${formatPercent(bucket.remainingFraction)}${countdown ? ` (${countdown})` : ""}${exhausted}`;
}

function accountStatusLabel(result: AccountQuotaResult, activeIndex: number): string {
  if (result.status === "error") return "ERROR";
  if (result.disabled) return "DISABLED";
  return result.index === activeIndex ? "ACTIVE" : "OK";
}

/** Renders rows as a box-drawn table, sized to the widest cell in each column. */
function renderTable(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => (row[column] ?? "").length)),
  );
  const line = (left: string, middle: string, right: string) =>
    left + widths.map((width) => "─".repeat(width + 2)).join(middle) + right;
  const row = (cells: readonly string[]) =>
    `│ ${widths.map((width, column) => (cells[column] ?? "").padEnd(width)).join(" │ ")} │`;

  return [
    line("┌", "┬", "┐"),
    row(headers),
    line("├", "┼", "┤"),
    ...rows.map(row),
    line("└", "┴", "┘"),
  ].join("\n");
}

const RATE_LIMIT_HEADERS = [
  "Account",
  "Status",
  "Gemini weekly",
  "Gemini 5-hour",
  "Claude/GPT weekly",
  "Claude/GPT 5-hour",
] as const;

/** The per-group buckets behind the table, as `renderQuota({ detailed: true })` prints them. */
function renderRateLimitDetail(result: AccountQuotaResult): string[] {
  const lines: string[] = [];
  const summary = result.rateLimits;

  if (summary?.error) {
    lines.push(`  rate limits: ${summary.error}`);
    return lines;
  }
  if (!summary || summary.groups.length === 0) {
    lines.push("  rate limits: none reported");
    return lines;
  }

  for (const group of summary.groups) {
    lines.push(`  ${group.displayName}${group.description ? ` — ${group.description}` : ""}`);
    for (const bucket of group.buckets) {
      const countdown = formatCountdown(bucket.resetTime);
      lines.push(
        `    ${bucket.displayName.padEnd(18)} ${formatPercent(bucket.remainingFraction)}` +
          `${countdown ? ` (resets in ${countdown})` : ""}${bucket.disabled ? " [exhausted]" : ""}`,
      );
    }
  }
  return lines;
}

/** The per-model Antigravity and Gemini CLI pools, under the rate-limit table. */
function renderModelQuotaDetail(result: AccountQuotaResult): string[] {
  const lines: string[] = [];
  const groups = result.quota?.groups ?? {};
  const rows: Array<[string, { remainingFraction?: number; resetTime?: string } | undefined]> = [
    ["Claude", groups.claude],
    ["Gemini 3 Pro", groups["gemini-pro"]],
    ["Gemini 3 Flash", groups["gemini-flash"]],
  ];
  const known = rows.filter(([, data]) => data);

  if (known.length === 0) {
    lines.push(`  Antigravity: ${result.quota?.error ?? "no quota information"}`);
  } else {
    for (const [name, data] of known) {
      const countdown = formatCountdown(data?.resetTime);
      lines.push(
        `    ${name.padEnd(18)} ${formatPercent(data?.remainingFraction)}${countdown ? ` (resets in ${countdown})` : ""}`,
      );
    }
  }

  for (const model of result.geminiCliQuota?.models ?? []) {
    const countdown = formatCountdown(model.resetTime);
    lines.push(
      `    ${`CLI ${model.modelId}`.padEnd(18)} ${formatPercent(model.remainingFraction)}` +
        `${countdown ? ` (resets in ${countdown})` : ""}`,
    );
  }
  return lines;
}

export interface QuotaRenderOptions {
  /** Also print every rate-limit bucket and model pool per account. */
  detailed?: boolean;
}

export async function renderQuota(
  client: PluginClient,
  providerId: string,
  options: QuotaRenderOptions = {},
): Promise<string> {
  const storage = await loadAccountPool();
  if (!storage) {
    return NO_ACCOUNTS_MESSAGE;
  }

  const results = await checkAccountsQuota(storage.accounts, client, providerId);
  const activeIndex = storage.activeIndex ?? 0;

  const rows = results.map((result) => {
    const label = result.email || `Account ${result.index + 1}`;
    const status = accountStatusLabel(result, activeIndex);
    if (result.status === "error") {
      // Kept short: one long message would widen the column past the table.
      const reason = result.error ?? "unknown error";
      return [label, status, reason.length > 38 ? `${reason.slice(0, 37)}…` : reason, "", "", ""];
    }
    return [
      label,
      status,
      formatBucketCell(result.rateLimits, true, "weekly"),
      formatBucketCell(result.rateLimits, true, "5h"),
      formatBucketCell(result.rateLimits, false, "weekly"),
      formatBucketCell(result.rateLimits, false, "5h"),
    ];
  });

  const blocks = [
    "Antigravity rate limits (weekly + 5-hour, per model group)",
    renderTable(RATE_LIMIT_HEADERS, rows),
    "Weekly follows your plan tier; the 5-hour pool smooths global demand. Whichever empties first blocks you.",
  ];

  if (options.detailed) {
    for (const result of results) {
      const label = result.email || `Account ${result.index + 1}`;
      const detail = [`${label}${result.disabled ? " [disabled]" : ""}`];
      if (result.status === "error") {
        detail.push(`  error: ${result.error}`);
      } else {
        detail.push(...renderRateLimitDetail(result));
        detail.push("  Model pools (5-hour)");
        detail.push(...renderModelQuotaDetail(result));
      }
      blocks.push(detail.join("\n"));
    }
  }

  return blocks.join("\n\n");
}

// -- verification ------------------------------------------------------------

export async function renderVerification(
  indices: readonly number[],
  verify: VerifyAccount,
  client: PluginClient,
  providerId: string,
): Promise<string> {
  const storage = await loadAccountPool();
  if (!storage) {
    return NO_ACCOUNTS_MESSAGE;
  }

  const lines: string[] = [];
  for (const index of indices) {
    const account = storage.accounts[index];
    if (!account) {
      lines.push(`No account ${index + 1}.`);
      continue;
    }

    const label = accountLabel(account, index);
    const verification = await verify(account, client, providerId);
    if (verification.status === "ok") {
      lines.push(`${label}: ok`);
      continue;
    }
    if (verification.status === "blocked") {
      lines.push(`${label}: needs Google verification`);
      lines.push(`  ${verification.message}`);
      if (verification.verifyUrl) {
        lines.push(`  ${verification.verifyUrl}`);
      }
      continue;
    }
    lines.push(`${label}: error - ${verification.message}`);
  }

  return lines.join("\n");
}

/** Every stored account's index, for "all accounts" operations. */
export async function allAccountIndices(): Promise<number[]> {
  const storage = await loadAccountPool();
  return storage ? storage.accounts.map((_, index) => index) : [];
}

/**
 * Parses a 1-based account number as typed by a user. Returns null when it is
 * not a positive integer.
 */
export function parseAccountNumber(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed - 1 : null;
}
