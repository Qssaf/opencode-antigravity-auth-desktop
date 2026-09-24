import { promises as fs } from "node:fs";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  renameSync,
  copyFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { createHash, randomBytes } from "node:crypto";
import lockfile from "proper-lockfile";
import type { HeaderStyle } from "../constants";
import { createLogger } from "./logger";

const log = createLogger("storage");

/**
 * Files/directories that should be gitignored in the config directory.
 * These contain sensitive data or machine-specific state.
 */
export const GITIGNORE_ENTRIES = [
  ".gitignore",
  "antigravity-accounts.json",
  "antigravity-accounts.json.*.tmp",
  "antigravity-signature-cache.json",
  "antigravity-logs/",
];

/**
 * Ensures a .gitignore file exists in the config directory with entries
 * for sensitive files. Creates the file if missing, or appends missing
 * entries if it already exists.
 */
export async function ensureGitignore(configDir: string): Promise<void> {
  const gitignorePath = join(configDir, ".gitignore");

  try {
    let content: string;
    let existingLines: string[] = [];

    try {
      content = await fs.readFile(gitignorePath, "utf-8");
      existingLines = content.split("\n").map((line) => line.trim());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        return;
      }
      content = "";
    }

    const missingEntries = GITIGNORE_ENTRIES.filter(
      (entry) => !existingLines.includes(entry),
    );

    if (missingEntries.length === 0) {
      return;
    }

    if (content === "") {
      await fs.writeFile(
        gitignorePath,
        missingEntries.join("\n") + "\n",
        "utf-8",
      );
      log.info("Created .gitignore in config directory");
    } else {
      const suffix = content.endsWith("\n") ? "" : "\n";
      await fs.appendFile(
        gitignorePath,
        suffix + missingEntries.join("\n") + "\n",
        "utf-8",
      );
      log.info("Updated .gitignore with missing entries", {
        added: missingEntries,
      });
    }
  } catch {
    // Non-critical feature
  }
}

/**
 * Synchronous version of ensureGitignore for use in sync code paths.
 */
export function ensureGitignoreSync(configDir: string): void {
  const gitignorePath = join(configDir, ".gitignore");

  try {
    let content: string;
    let existingLines: string[] = [];

    if (existsSync(gitignorePath)) {
      content = readFileSync(gitignorePath, "utf-8");
      existingLines = content.split("\n").map((line) => line.trim());
    } else {
      content = "";
    }

    const missingEntries = GITIGNORE_ENTRIES.filter(
      (entry) => !existingLines.includes(entry),
    );

    if (missingEntries.length === 0) {
      return;
    }

    if (content === "") {
      writeFileSync(gitignorePath, missingEntries.join("\n") + "\n", "utf-8");
      log.info("Created .gitignore in config directory");
    } else {
      const suffix = content.endsWith("\n") ? "" : "\n";
      appendFileSync(
        gitignorePath,
        suffix + missingEntries.join("\n") + "\n",
        "utf-8",
      );
      log.info("Updated .gitignore with missing entries", {
        added: missingEntries,
      });
    }
  } catch {
    // Non-critical feature
  }
}

export type ModelFamily = "claude" | "gemini";
export type { HeaderStyle };

export interface RateLimitState {
  claude?: number;
  gemini?: number;
}

export interface RateLimitStateV3 {
  claude?: number;
  "gemini-antigravity"?: number;
  "gemini-cli"?: number;
  [key: string]: number | undefined;
}

export interface AccountMetadataV1 {
  email?: string;
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
  addedAt: number;
  lastUsed: number;
  isRateLimited?: boolean;
  rateLimitResetTime?: number;
  lastSwitchReason?: "rate-limit" | "initial" | "rotation";
}

export interface AccountStorageV1 {
  version: 1;
  accounts: AccountMetadataV1[];
  activeIndex: number;
}

export interface AccountMetadata {
  email?: string;
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
  addedAt: number;
  lastUsed: number;
  lastSwitchReason?: "rate-limit" | "initial" | "rotation";
  rateLimitResetTimes?: RateLimitState;
}

export interface AccountStorage {
  version: 2;
  accounts: AccountMetadata[];
  activeIndex: number;
}

export type CooldownReason = "auth-failure" | "network-error" | "project-error" | "validation-required";

export interface AccountMetadataV3 {
  email?: string;
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
  addedAt: number;
  lastUsed: number;
  enabled?: boolean;
  lastSwitchReason?: "rate-limit" | "initial" | "rotation";
  rateLimitResetTimes?: RateLimitStateV3;
  /**
   * Per-quota-key SET timestamps (key -> setAt epoch ms). Lets mergeAccountStorage
   * order a limit against a clear (compare setAt vs clearedAt) so the LATEST mutation
   * wins regardless of which writer's snapshot arrives last.
   */
  rateLimitSetTimes?: Record<string, number>;
  /**
   * Per-quota-key clear markers (key -> clearedAt epoch ms). Lets mergeAccountStorage
   * distinguish "this pool's limit was intentionally cleared" from "this writer never
   * touched this pool", so a clear is not silently resurrected from on-disk state.
   */
  clearedQuotaKeys?: Record<string, number>;
  /**
   * Per-quota-key GENERATION each tombstone cleared (key -> the cleared limit's setAt).
   * A tombstone only supersedes a limit of that generation or older, so a stale process
   * that passively expires an OLD limit cannot erase a NEWER limit written elsewhere.
   */
  clearedSetTimes?: Record<string, number>;
  coolingDownUntil?: number;
  cooldownReason?: CooldownReason;
  /** Per-account device fingerprint for rate limit mitigation */
  fingerprint?: import("./fingerprint").Fingerprint;
  fingerprintHistory?: import("./fingerprint").FingerprintVersion[];
  /** Set when Google asks the user to verify this account before requests can continue. */
  verificationRequired?: boolean;
  verificationRequiredAt?: number;
  verificationRequiredReason?: string;
  verificationUrl?: string;
  /** Cached soft quota data */
  cachedQuota?: Record<string, { remainingFraction?: number; resetTime?: string; modelCount: number }>;
  cachedQuotaUpdatedAt?: number;
}

export interface AccountStorageV3 {
  version: 3;
  accounts: AccountMetadataV3[];
  activeIndex: number;
  activeIndexByFamily?: {
    claude?: number;
    gemini?: number;
  };
}

export interface AccountStorageV4 {
  version: 4;
  accounts: AccountMetadataV3[];
  activeIndex: number;
  deletedRefreshTokenHashes?: string[];
  activeIndexByFamily?: {
    claude?: number;
    gemini?: number;
  };
}

type AnyAccountStorage =
  | AccountStorageV1
  | AccountStorage
  | AccountStorageV3
  | AccountStorageV4;

/**
 * Gets the legacy Windows config directory (%APPDATA%\opencode).
 * Used for migration from older plugin versions.
 */
function getLegacyWindowsConfigDir(): string {
  return join(
    process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
    "opencode",
  );
}

/**
 * Gets the config directory path, with the following precedence:
 * 1. OPENCODE_CONFIG_DIR env var (if set)
 * 2. ~/.config/opencode (all platforms, including Windows)
 *
 * On Windows, also checks for legacy %APPDATA%\opencode path for migration.
 */
function getConfigDir(): string {
  // 1. Check for explicit override via env var
  if (process.env.OPENCODE_CONFIG_DIR) {
    return process.env.OPENCODE_CONFIG_DIR;
  }

  // 2. Use ~/.config/opencode on all platforms (including Windows)
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdgConfig, "opencode");
}

/**
 * Migrates config from legacy Windows location to the new path.
 * Moves the file if legacy exists and new doesn't.
 * Returns true if migration was performed.
 */
function migrateLegacyWindowsConfig(): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  const newPath = join(getConfigDir(), "antigravity-accounts.json");
  const legacyPath = join(
    getLegacyWindowsConfigDir(),
    "antigravity-accounts.json",
  );

  // Only migrate if legacy exists and new doesn't
  if (!existsSync(legacyPath) || existsSync(newPath)) {
    return false;
  }

  try {
    // Ensure new config directory exists
    const newConfigDir = getConfigDir();

    mkdirSync(newConfigDir, { recursive: true });

    // Try rename first (atomic, but fails across filesystems)
    try {
      renameSync(legacyPath, newPath);
      log.info("Migrated Windows config via rename", { from: legacyPath, to: newPath });
    } catch {
      // Fallback: copy then delete (for cross-filesystem moves)
      copyFileSync(legacyPath, newPath);
      unlinkSync(legacyPath);
      log.info("Migrated Windows config via copy+delete", { from: legacyPath, to: newPath });
    }

    return true;
  } catch (error) {
    log.warn("Failed to migrate legacy Windows config, will use legacy path", {
      legacyPath,
      newPath,
      error: String(error),
    });
    return false;
  }
}

/**
 * Gets the storage path, migrating from legacy Windows location if needed.
 * On Windows, attempts to move legacy config to new path for alignment.
 */
function getStoragePathWithMigration(): string {
  const newPath = join(getConfigDir(), "antigravity-accounts.json");

  // On Windows, attempt to migrate legacy config to new location
  if (process.platform === "win32") {
    migrateLegacyWindowsConfig();

    // If migration failed and legacy still exists, fall back to it
    if (!existsSync(newPath)) {
      const legacyPath = join(
        getLegacyWindowsConfigDir(),
        "antigravity-accounts.json",
      );
      if (existsSync(legacyPath)) {
        log.info("Using legacy Windows config path (migration failed)", {
          legacyPath,
          newPath,
        });
        return legacyPath;
      }
    }
  }

  return newPath;
}

export function getStoragePath(): string {
  return getStoragePathWithMigration();
}

/**
 * Gets the config directory path. Exported for use by other modules.
 */
export { getConfigDir };

const LOCK_OPTIONS = {
  stale: 10000,
  retries: {
    retries: 5,
    minTimeout: 100,
    maxTimeout: 1000,
    factor: 2,
  },
};

/**
 * Ensures the file has secure permissions (0600) on POSIX systems.
 * This is a best-effort operation and ignores errors on Windows/unsupported FS.
 */
async function ensureSecurePermissions(path: string): Promise<void> {
  try {
    await fs.chmod(path, 0o600);
  } catch {
    // Ignore errors (e.g. Windows, file doesn't exist, FS doesn't support chmod)
  }
}

async function ensureFileExists(path: string): Promise<void> {
  try {
    await fs.access(path);
  } catch {
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(
      path,
      JSON.stringify({ version: 4, accounts: [], activeIndex: 0 }, null, 2),
      { encoding: "utf-8", mode: 0o600 },
    );
  }
}

async function withFileLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  await ensureFileExists(path);
  let release: (() => Promise<void>) | null = null;
  try {
    release = await lockfile.lock(path, LOCK_OPTIONS);
    return await fn();
  } finally {
    if (release) {
      try {
        await release();
      } catch (unlockError) {
        log.warn("Failed to release lock", { error: String(unlockError) });
      }
    }
  }
}

/**
 * How long a clear marker remains authoritative before it is pruned during merge.
 * Kept in sync with RATE_LIMIT_CLEAR_TTL_MS in accounts.ts.
 */
const RATE_LIMIT_CLEAR_TTL_MS = 24 * 60 * 60 * 1000;

/** Keep only finite numeric timestamps (drops corrupt/foreign values). */
function numericTimestamp(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

interface ClearMarker {
  clearedAt: number;
  /** Generation (setAt) of the limit this tombstone cleared; undefined for legacy tombstones. */
  clearedSetAt: number | undefined;
}

/**
 * Filter a clear-marker map to the ACTIVE set: finite numbers within the TTL window,
 * paired with the generation each tombstone cleared. Done ONCE up front so expired
 * markers cannot delete a live limit and then vanish.
 */
function activeClearMarkers(
  source: Record<string, number> | undefined,
  setGenerations: Record<string, number> | undefined,
  now: number,
): Map<string, ClearMarker> {
  const out = new Map<string, ClearMarker>();
  if (!source) return out;
  for (const [key, value] of Object.entries(source)) {
    const clearedAt = numericTimestamp(value);
    if (clearedAt === undefined) continue;
    if (now - clearedAt > RATE_LIMIT_CLEAR_TTL_MS) continue;
    out.set(key, { clearedAt, clearedSetAt: numericTimestamp(setGenerations?.[key]) });
  }
  return out;
}

type KeyMutation =
  | { kind: "set"; at: number | undefined; reset: number }
  | { kind: "clear"; at: number; clearedSetAt: number | undefined }
  | { kind: "none" };

/** Describe one writer's latest mutation for a single key (a live limit wins over a tombstone). */
function sideMutation(
  limit: number | undefined,
  setAt: number | undefined,
  clear: ClearMarker | undefined,
): KeyMutation {
  if (typeof limit === "number") {
    return { kind: "set", at: setAt, reset: limit };
  }
  if (clear) {
    return { kind: "clear", at: clear.clearedAt, clearedSetAt: clear.clearedSetAt };
  }
  return { kind: "none" };
}

/**
 * Merge rate-limit state for a single account across two storage snapshots.
 *
 * Resolution is per key, by MUTATION ORDER, so the LATEST change wins regardless of
 * which writer's snapshot arrives last:
 * - Per-key basis, so two instances writing DIFFERENT pools on the same account both
 *   survive — a whole-object replace would drop the other writer's pool.
 * - Each side's latest mutation is a SET (with rateLimitSetTimes[key] = setAt) or a
 *   CLEAR (with clearedQuotaKeys[key] = clearedAt and clearedSetTimes[key] = the
 *   GENERATION it cleared). Reset time is never used for ordering (it is a future value).
 * - A tombstone is GENERATION-VERSIONED: it only supersedes a limit whose setAt is
 *   <= the generation it cleared. So a stale process that passively expires an OLD limit
 *   (recording clearedAt = now) cannot erase a NEWER limit another process wrote after
 *   that generation — the newer limit's setAt exceeds the cleared generation and wins.
 * - Clear markers are TTL-filtered ONCE up front, so an expired tombstone can neither
 *   delete a live limit nor be re-persisted. Surviving timestamps/generations are carried
 *   forward so future merges stay orderable.
 *
 * Backward compatibility: when a generation or set timestamp is missing (older writer),
 * mutations are unorderable and we fall back to INCOMING (the authoritative in-memory
 * writer). For an unorderable SET-vs-SET conflict we keep incoming's reset and carry
 * forward whichever valid setAt exists, so a legacy no-setAt disk limit cannot override
 * a newer incoming set or discard its timestamp.
 */
function mergeRateLimitState(
  existing: AccountMetadataV3,
  incoming: AccountMetadataV3,
): Pick<
  AccountMetadataV3,
  "rateLimitResetTimes" | "rateLimitSetTimes" | "clearedQuotaKeys" | "clearedSetTimes"
> {
  const now = Date.now();

  const eLimits = existing.rateLimitResetTimes ?? {};
  const iLimits = incoming.rateLimitResetTimes ?? {};
  const eSet = existing.rateLimitSetTimes ?? {};
  const iSet = incoming.rateLimitSetTimes ?? {};
  const eClear = activeClearMarkers(existing.clearedQuotaKeys, existing.clearedSetTimes, now);
  const iClear = activeClearMarkers(incoming.clearedQuotaKeys, incoming.clearedSetTimes, now);

  const keys = new Set<string>([
    ...Object.keys(eLimits),
    ...Object.keys(iLimits),
    ...eClear.keys(),
    ...iClear.keys(),
  ]);

  const mergedLimits: RateLimitStateV3 = {};
  const mergedSet: Record<string, number> = {};
  const mergedCleared: Record<string, number> = {};
  const mergedClearedSet: Record<string, number> = {};

  for (const key of keys) {
    const eMut = sideMutation(numericTimestamp(eLimits[key]), numericTimestamp(eSet[key]), eClear.get(key));
    const iMut = sideMutation(numericTimestamp(iLimits[key]), numericTimestamp(iSet[key]), iClear.get(key));

    const winner = resolveKeyMutation(eMut, iMut);
    if (winner.kind === "set") {
      mergedLimits[key] = winner.reset;
      if (winner.at !== undefined) {
        mergedSet[key] = winner.at;
      }
    } else if (winner.kind === "clear") {
      mergedCleared[key] = winner.at;
      if (winner.clearedSetAt !== undefined) {
        mergedClearedSet[key] = winner.clearedSetAt;
      }
    }
  }

  return {
    rateLimitResetTimes: mergedLimits,
    rateLimitSetTimes: Object.keys(mergedSet).length > 0 ? mergedSet : undefined,
    clearedQuotaKeys: Object.keys(mergedCleared).length > 0 ? mergedCleared : undefined,
    clearedSetTimes: Object.keys(mergedClearedSet).length > 0 ? mergedClearedSet : undefined,
  };
}

/**
 * Pick the winning mutation for a key.
 *
 * Unifying rule: a mutation is VERSIONED when it carries the timestamp needed to order
 * it — a SET with setAt, or a CLEAR with clearedSetAt (the generation it cleared).
 * - Both versioned → order precisely (generation/timestamp compare).
 * - Exactly one versioned → the VERSIONED side wins; the unversioned side cannot prove
 *   it saw the other's generation, so it must not override.
 * - Neither versioned → fall back to direction: incoming (authoritative writer) wins.
 */
function resolveKeyMutation(existing: KeyMutation, incoming: KeyMutation): KeyMutation {
  if (existing.kind === "none") return incoming;
  if (incoming.kind === "none") return existing;

  if (existing.kind === "set" && incoming.kind === "set") {
    return resolveSetVsSet(existing, incoming);
  }

  if (existing.kind === "clear" && incoming.kind === "clear") {
    // Both cleared → still cleared. Keep the richer marker (latest clear, newest generation).
    return {
      kind: "clear",
      at: Math.max(existing.at, incoming.at),
      clearedSetAt: maxDefined(existing.clearedSetAt, incoming.clearedSetAt),
    };
  }

  // One SET, one CLEAR.
  const set = (existing.kind === "set" ? existing : incoming) as Extract<KeyMutation, { kind: "set" }>;
  const clear = (existing.kind === "clear" ? existing : incoming) as Extract<KeyMutation, { kind: "clear" }>;
  const setVersioned = set.at !== undefined;
  const clearVersioned = clear.clearedSetAt !== undefined;

  if (setVersioned && clearVersioned) {
    // Generation-versioned: a clear only supersedes a limit of the generation it cleared
    // or older. A newer generation (setAt > clearedSetAt) is a limit the clear never saw.
    return set.at! > clear.clearedSetAt! ? set : clear;
  }

  if (setVersioned !== clearVersioned) {
    // Exactly one side is versioned → it wins. An unversioned clear cannot erase a
    // versioned set (it can't prove it cleared that generation), and vice versa.
    return setVersioned ? set : clear;
  }

  // Neither versioned → direction-based: incoming (authoritative in-memory writer) wins.
  return incoming;
}

/**
 * Resolve a SET-vs-SET conflict.
 * - Both versioned → latest setAt wins (ties → incoming).
 * - Exactly one versioned → the VERSIONED set wins outright, reset AND setAt together
 *   (never mix a legacy reset with the other side's timestamp).
 * - Neither versioned → incoming (authoritative) wins.
 */
function resolveSetVsSet(
  existing: Extract<KeyMutation, { kind: "set" }>,
  incoming: Extract<KeyMutation, { kind: "set" }>,
): KeyMutation {
  const existingVersioned = existing.at !== undefined;
  const incomingVersioned = incoming.at !== undefined;

  if (existingVersioned && incomingVersioned) {
    return incoming.at! >= existing.at! ? incoming : existing;
  }
  if (existingVersioned !== incomingVersioned) {
    return existingVersioned ? existing : incoming;
  }
  return incoming;
}

/** Return the larger of two optional numbers, or whichever is defined. */
function maxDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

function mergeAccountStorage(
  existing: AccountStorageV4,
  incoming: AccountStorageV4,
): AccountStorageV4 {
  const accountMap = new Map<string, AccountMetadataV3>();
  const deletedRefreshTokenHashes = new Set([
    ...(existing.deletedRefreshTokenHashes ?? []),
    ...(incoming.deletedRefreshTokenHashes ?? []),
  ]);

  for (const acc of existing.accounts) {
    if (acc.refreshToken && !deletedRefreshTokenHashes.has(hashRefreshToken(acc.refreshToken))) {
      accountMap.set(acc.refreshToken, acc);
    }
  }

  for (const acc of incoming.accounts) {
    if (acc.refreshToken && !deletedRefreshTokenHashes.has(hashRefreshToken(acc.refreshToken))) {
      const existingAcc = accountMap.get(acc.refreshToken);
      if (existingAcc) {
        accountMap.set(acc.refreshToken, {
          ...existingAcc,
          ...acc,
          // Preserve manually configured projectId/managedProjectId if not in incoming
          projectId: acc.projectId ?? existingAcc.projectId,
          managedProjectId: acc.managedProjectId ?? existingAcc.managedProjectId,
          ...mergeRateLimitState(existingAcc, acc),
          lastUsed: Math.max(existingAcc.lastUsed || 0, acc.lastUsed || 0),
        });
      } else {
        accountMap.set(acc.refreshToken, acc);
      }
    }
  }

  const accounts = Array.from(accountMap.values());
  return {
    version: 4,
    accounts,
    activeIndex: remapActiveIndex(incoming.accounts, accounts, incoming.activeIndex),
    activeIndexByFamily: remapActiveIndexByFamily(
      incoming.activeIndexByFamily,
      incoming.accounts,
      accounts,
    ),
    deletedRefreshTokenHashes: deletedRefreshTokenHashes.size > 0
      ? Array.from(deletedRefreshTokenHashes)
      : undefined,
  };
}

/** The form a deleted refresh token is remembered in (`deletedRefreshTokenHashes`). */
export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function deduplicateAccountsByEmail<
  T extends { email?: string; lastUsed?: number; addedAt?: number },
>(accounts: T[]): T[] {
  const emailToNewestIndex = new Map<string, number>();
  const indicesToKeep = new Set<number>();

  // First pass: find the newest account for each email (by lastUsed, then addedAt)
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (!acc) continue;

    if (!acc.email) {
      // No email - keep this account (can't deduplicate without email)
      indicesToKeep.add(i);
      continue;
    }

    const existingIndex = emailToNewestIndex.get(acc.email);
    if (existingIndex === undefined) {
      emailToNewestIndex.set(acc.email, i);
      continue;
    }

    // Compare to find which is newer
    const existing = accounts[existingIndex];
    if (!existing) {
      emailToNewestIndex.set(acc.email, i);
      continue;
    }

    // Prefer higher lastUsed, then higher addedAt
    // Compare fields separately to avoid integer overflow with large timestamps
    const currLastUsed = acc.lastUsed || 0;
    const existLastUsed = existing.lastUsed || 0;
    const currAddedAt = acc.addedAt || 0;
    const existAddedAt = existing.addedAt || 0;

    const isNewer =
      currLastUsed > existLastUsed ||
      (currLastUsed === existLastUsed && currAddedAt > existAddedAt);

    if (isNewer) {
      emailToNewestIndex.set(acc.email, i);
    }
  }

  // Add all the newest email-based indices to the keep set
  for (const idx of emailToNewestIndex.values()) {
    indicesToKeep.add(idx);
  }

  // Build the deduplicated list, preserving original order for kept items
  const result: T[] = [];
  for (let i = 0; i < accounts.length; i++) {
    if (indicesToKeep.has(i)) {
      const acc = accounts[i];
      if (acc) {
        result.push(acc);
      }
    }
  }

  return result;
}

function accountIdentity(account: AccountMetadataV3): string {
  return account.email
    ? `email:${account.email}`
    : `refreshToken:${account.refreshToken}`;
}

function clampActiveIndex(activeIndex: number, accountCount: number): number {
  if (accountCount === 0) {
    return 0;
  }

  const index = Number.isFinite(activeIndex) ? activeIndex : 0;
  return Math.max(0, Math.min(index, accountCount - 1));
}

function remapActiveIndex(
  accounts: AccountMetadataV3[],
  deduplicatedAccounts: AccountMetadataV3[],
  activeIndex: number,
): number {
  const fallbackIndex = clampActiveIndex(activeIndex, deduplicatedAccounts.length);
  const selectedAccount = accounts[activeIndex];

  if (!selectedAccount) {
    return fallbackIndex;
  }

  const selectedIdentity = accountIdentity(selectedAccount);
  const remappedIndex = deduplicatedAccounts.findIndex(
    (account) => accountIdentity(account) === selectedIdentity,
  );

  return remappedIndex === -1 ? fallbackIndex : remappedIndex;
}

function remapActiveIndexByFamily(
  activeIndexByFamily: AccountStorageV4["activeIndexByFamily"],
  accounts: AccountMetadataV3[],
  deduplicatedAccounts: AccountMetadataV3[],
): AccountStorageV4["activeIndexByFamily"] {
  if (!activeIndexByFamily) {
    return undefined;
  }

  return {
    ...(activeIndexByFamily.claude === undefined
      ? {}
      : {
          claude: remapActiveIndex(
            accounts,
            deduplicatedAccounts,
            activeIndexByFamily.claude,
          ),
        }),
    ...(activeIndexByFamily.gemini === undefined
      ? {}
      : {
          gemini: remapActiveIndex(
            accounts,
            deduplicatedAccounts,
            activeIndexByFamily.gemini,
          ),
        }),
  };
}

function migrateV1ToV2(v1: AccountStorageV1): AccountStorage {
  return {
    version: 2,
    accounts: v1.accounts.map((acc) => {
      const rateLimitResetTimes: RateLimitState = {};
      if (
        acc.isRateLimited &&
        acc.rateLimitResetTime &&
        acc.rateLimitResetTime > Date.now()
      ) {
        rateLimitResetTimes.claude = acc.rateLimitResetTime;
        rateLimitResetTimes.gemini = acc.rateLimitResetTime;
      }
      return {
        email: acc.email,
        refreshToken: acc.refreshToken,
        projectId: acc.projectId,
        managedProjectId: acc.managedProjectId,
        addedAt: acc.addedAt,
        lastUsed: acc.lastUsed,
        lastSwitchReason: acc.lastSwitchReason,
        rateLimitResetTimes:
          Object.keys(rateLimitResetTimes).length > 0
            ? rateLimitResetTimes
            : undefined,
      };
    }),
    activeIndex: v1.activeIndex,
  };
}

export function migrateV2ToV3(v2: AccountStorage): AccountStorageV3 {
  return {
    version: 3,
    accounts: v2.accounts.map((acc) => {
      const rateLimitResetTimes: RateLimitStateV3 = {};
      if (
        acc.rateLimitResetTimes?.claude &&
        acc.rateLimitResetTimes.claude > Date.now()
      ) {
        rateLimitResetTimes.claude = acc.rateLimitResetTimes.claude;
      }
      if (
        acc.rateLimitResetTimes?.gemini &&
        acc.rateLimitResetTimes.gemini > Date.now()
      ) {
        rateLimitResetTimes["gemini-antigravity"] =
          acc.rateLimitResetTimes.gemini;
      }
      return {
        email: acc.email,
        refreshToken: acc.refreshToken,
        projectId: acc.projectId,
        managedProjectId: acc.managedProjectId,
        addedAt: acc.addedAt,
        lastUsed: acc.lastUsed,
        lastSwitchReason: acc.lastSwitchReason,
        rateLimitResetTimes:
          Object.keys(rateLimitResetTimes).length > 0
            ? rateLimitResetTimes
            : undefined,
      };
    }),
    activeIndex: v2.activeIndex,
  };
}

export function migrateV3ToV4(v3: AccountStorageV3): AccountStorageV4 {
  return {
    version: 4,
    accounts: v3.accounts.map((acc) => ({
      ...acc,
      fingerprint: undefined,
      fingerprintHistory: undefined,
    })),
    activeIndex: v3.activeIndex,
    activeIndexByFamily: v3.activeIndexByFamily,
  };
}

export async function loadAccounts(): Promise<AccountStorageV4 | null> {
  try {
    const path = getStoragePath();
    // Ensure permissions are correct on load (fixes existing files)
    await ensureSecurePermissions(path);

    const content = await fs.readFile(path, "utf-8");
    const data = JSON.parse(content) as AnyAccountStorage;

    if (!Array.isArray(data.accounts)) {
      log.warn("Invalid storage format, ignoring");
      return null;
    }

    let storage: AccountStorageV4;

    if (data.version === 1) {
      log.info("Migrating account storage from v1 to v4");
      const v2 = migrateV1ToV2(data);
      const v3 = migrateV2ToV3(v2);
      storage = migrateV3ToV4(v3);
      try {
        await saveAccounts(storage);
        log.info("Migration to v4 complete");
      } catch (saveError) {
        log.warn("Failed to persist migrated storage", {
          error: String(saveError),
        });
      }
    } else if (data.version === 2) {
      log.info("Migrating account storage from v2 to v4");
      const v3 = migrateV2ToV3(data);
      storage = migrateV3ToV4(v3);
      try {
        await saveAccounts(storage);
        log.info("Migration to v4 complete");
      } catch (saveError) {
        log.warn("Failed to persist migrated storage", {
          error: String(saveError),
        });
      }
    } else if (data.version === 3) {
      log.info("Migrating account storage from v3 to v4");
      storage = migrateV3ToV4(data);
      try {
        await saveAccounts(storage);
        log.info("Migration to v4 complete");
      } catch (saveError) {
        log.warn("Failed to persist migrated storage", {
          error: String(saveError),
        });
      }
    } else if (data.version === 4) {
      storage = data;
    } else {
      log.warn("Unknown storage version, ignoring", {
        version: (data as { version?: unknown }).version,
      });
      return null;
    }

    // Validate accounts have required fields
    const deletedRefreshTokenHashes = new Set(
      (storage.deletedRefreshTokenHashes ?? []).filter((hash): hash is string => typeof hash === "string"),
    );
    const validAccounts = storage.accounts.filter(
      (a): a is AccountMetadataV3 => {
        return (
          !!a &&
          typeof a === "object" &&
          typeof (a as AccountMetadataV3).refreshToken === "string" &&
          !deletedRefreshTokenHashes.has(hashRefreshToken((a as AccountMetadataV3).refreshToken))
        );
      },
    );

    // Deduplicate accounts by email (keeps newest entry for each email)
    const deduplicatedAccounts = deduplicateAccountsByEmail(validAccounts);

    const activeIndex = remapActiveIndex(
      validAccounts,
      deduplicatedAccounts,
      storage.activeIndex,
    );

    return {
      version: 4,
      accounts: deduplicatedAccounts,
      activeIndex,
      deletedRefreshTokenHashes: deletedRefreshTokenHashes.size > 0
        ? Array.from(deletedRefreshTokenHashes)
        : undefined,
      activeIndexByFamily: remapActiveIndexByFamily(
        storage.activeIndexByFamily,
        validAccounts,
        deduplicatedAccounts,
      ),
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    log.error("Failed to load account storage", { error: String(error) });
    return null;
  }
}

export async function saveAccounts(storage: AccountStorageV4): Promise<void> {
  const path = getStoragePath();
  const configDir = dirname(path);
  await fs.mkdir(configDir, { recursive: true });
  await ensureGitignore(configDir);

  await withFileLock(path, async () => {
    const existing = await loadAccountsUnsafe();
    const merged = existing ? mergeAccountStorage(existing, storage) : storage;
    await writeAccountsAtomically(path, merged);
  });
}

/**
 * Save accounts storage by replacing the entire file (no merge).
 * Use this for destructive operations like delete where we need to
 * remove accounts that would otherwise be merged back from existing storage.
 */
export async function saveAccountsReplace(storage: AccountStorageV4): Promise<void> {
  const path = getStoragePath();
  const configDir = dirname(path);
  await fs.mkdir(configDir, { recursive: true });
  await ensureGitignore(configDir);

  await withFileLock(path, async () => {
    const existing = await loadAccountsUnsafe();
    const deletedRefreshTokenHashes = new Set([
      ...(existing?.deletedRefreshTokenHashes ?? []),
      ...(storage.deletedRefreshTokenHashes ?? []),
    ]);
    await writeAccountsAtomically(path, {
      ...storage,
      accounts: storage.accounts.filter(
        (account) => !deletedRefreshTokenHashes.has(hashRefreshToken(account.refreshToken)),
      ),
      deletedRefreshTokenHashes: deletedRefreshTokenHashes.size > 0
        ? Array.from(deletedRefreshTokenHashes)
        : undefined,
    });
  });
}

export async function removeAccountFromStorage(refreshToken: string): Promise<void> {
  const path = getStoragePath();
  const configDir = dirname(path);
  await fs.mkdir(configDir, { recursive: true });
  await ensureGitignore(configDir);

  await withFileLock(path, async () => {
    const existing = await loadAccountsUnsafe();
    if (!existing) return;
    const accounts = existing.accounts.filter((account) => account.refreshToken !== refreshToken);
    const deletedRefreshTokenHashes = new Set(existing.deletedRefreshTokenHashes ?? []);
    deletedRefreshTokenHashes.add(hashRefreshToken(refreshToken));

    await writeAccountsAtomically(path, {
      version: 4,
      accounts,
      activeIndex: remapActiveIndex(existing.accounts, accounts, existing.activeIndex),
      deletedRefreshTokenHashes: Array.from(deletedRefreshTokenHashes),
      activeIndexByFamily: remapActiveIndexByFamily(
        existing.activeIndexByFamily,
        existing.accounts,
        accounts,
      ),
    });
  });
}

async function writeAccountsAtomically(path: string, storage: AccountStorageV4): Promise<void> {
  const tempPath = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  const content = JSON.stringify(storage, null, 2);

  try {
    await fs.writeFile(tempPath, content, { encoding: "utf-8", mode: 0o600 });
    await fs.rename(tempPath, path);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors because the temporary file may not exist.
    }
    throw error;
  }
}

async function loadAccountsUnsafe(): Promise<AccountStorageV4 | null> {
  try {
    const path = getStoragePath();
    // Ensure permissions are correct on load (fixes existing files)
    await ensureSecurePermissions(path);

    const content = await fs.readFile(path, "utf-8");
    const parsed = JSON.parse(content) as AnyAccountStorage;

    if (parsed.version === 1) {
      return remapDeduplicatedStorage(
        migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed))),
      );
    }
    if (parsed.version === 2) {
      return remapDeduplicatedStorage(migrateV3ToV4(migrateV2ToV3(parsed)));
    }
    if (parsed.version === 3) {
      return remapDeduplicatedStorage(migrateV3ToV4(parsed));
    }

    if (parsed.version === 4) {
      return remapDeduplicatedStorage(parsed);
    }

    return null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    return null;
  }
}

function remapDeduplicatedStorage(storage: AccountStorageV4): AccountStorageV4 {
  const deduplicatedAccounts = deduplicateAccountsByEmail(storage.accounts);

  return {
    ...storage,
    accounts: deduplicatedAccounts,
    activeIndex: remapActiveIndex(
      storage.accounts,
      deduplicatedAccounts,
      storage.activeIndex,
    ),
    activeIndexByFamily: remapActiveIndexByFamily(
      storage.activeIndexByFamily,
      storage.accounts,
      deduplicatedAccounts,
    ),
  };
}

export async function clearAccounts(): Promise<void> {
  try {
    const path = getStoragePath();
    await fs.unlink(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      log.error("Failed to clear account storage", { error: String(error) });
    }
  }
}
