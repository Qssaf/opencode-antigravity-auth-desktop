import {
  ANTIGRAVITY_ENDPOINT_FALLBACKS,
  ANTIGRAVITY_ENDPOINT_PROD,
  getAntigravityHeaders,
  getRandomizedHeaders,
  ANTIGRAVITY_PROVIDER_ID,
} from "../constants";
import { accessTokenExpired, formatRefreshParts, parseRefreshParts } from "./auth";
import { logQuotaFetch, logQuotaStatus } from "./debug";
import { ensureProjectContext } from "./project";
import { refreshAccessToken } from "./token";
import { getModelFamily } from "./transform/model-resolver";
import { recordAntigravityAvailableModels } from "./model-catalog";
import type { PluginClient, OAuthAuthDetails } from "./types";
import type { AccountMetadataV3 } from "./storage";

const FETCH_TIMEOUT_MS = 10000;

export type QuotaGroup = "claude" | "gemini-pro" | "gemini-flash";

export interface QuotaGroupSummary {
  remainingFraction?: number;
  resetTime?: string;
  modelCount: number;
}

export interface QuotaSummary {
  groups: Partial<Record<QuotaGroup, QuotaGroupSummary>>;
  modelCount: number;
  error?: string;
}

// Gemini CLI quota types
export interface GeminiCliQuotaModel {
  modelId: string;
  remainingFraction: number;
  resetTime?: string;
}

export interface GeminiCliQuotaSummary {
  models: GeminiCliQuotaModel[];
  error?: string;
}

interface RetrieveUserQuotaResponse {
  buckets?: {
    remainingAmount?: string;
    remainingFraction?: number;
    resetTime?: string;
    tokenType?: string;
    modelId?: string;
  }[];
}

/**
 * A rate-limit bucket as `retrieveUserQuotaSummary` reports it. Google serves
 * one per window per model group, and whichever empties first is what blocks a
 * request — so the weekly bucket matters as much as the 5-hour one.
 */
export interface RateLimitBucket {
  bucketId: string;
  displayName: string;
  /** Usually `weekly` or `5h`. */
  window: string;
  remainingFraction: number;
  remainingAmount?: string;
  disabled: boolean;
  resetTime?: string;
  description?: string;
}

export interface RateLimitGroup {
  displayName: string;
  description?: string;
  buckets: RateLimitBucket[];
}

export interface RateLimitSummary {
  description?: string;
  groups: RateLimitGroup[];
  error?: string;
}

interface RetrieveUserQuotaSummaryResponse {
  description?: string;
  groups?: {
    displayName?: string;
    description?: string;
    buckets?: {
      bucketId?: string;
      displayName?: string;
      window?: string;
      remainingFraction?: number;
      remainingAmount?: string;
      disabled?: boolean;
      resetTime?: string;
      description?: string;
    }[];
  }[];
}

export type AccountQuotaStatus = "ok" | "disabled" | "error";

export interface AccountQuotaResult {
  index: number;
  email?: string;
  status: AccountQuotaStatus;
  error?: string;
  disabled?: boolean;
  quota?: QuotaSummary;
  geminiCliQuota?: GeminiCliQuotaSummary;
  /** Weekly and 5-hour rate-limit buckets per model group. */
  rateLimits?: RateLimitSummary;
  updatedAccount?: AccountMetadataV3;
}

export interface FetchAvailableModelsResponse {
  models?: Record<string, FetchAvailableModelEntry>;
}

export interface FetchAvailableModelEntry {
  quotaInfo?: {
    remainingFraction?: number;
    resetTime?: string;
  };
  displayName?: string;
  modelName?: string;
}

function buildAuthFromAccount(account: AccountMetadataV3): OAuthAuthDetails {
  return {
    type: "oauth",
    refresh: formatRefreshParts({
      refreshToken: account.refreshToken,
      projectId: account.projectId,
      managedProjectId: account.managedProjectId,
    }),
    access: undefined,
    expires: undefined,
  };
}

function normalizeRemainingFraction(value: unknown): number {
  // If value is missing or invalid, treat as exhausted (0%)
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseResetTime(resetTime?: string): number | null {
  if (!resetTime) return null;
  const timestamp = Date.parse(resetTime);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return timestamp;
}

function classifyQuotaGroup(modelName: string, displayName?: string): QuotaGroup | null {
  const combined = `${modelName} ${displayName ?? ""}`.toLowerCase();
  if (combined.includes("claude")) {
    return "claude";
  }
  const isGemini3 = combined.includes("gemini-3") || combined.includes("gemini 3");
  if (!isGemini3) {
    return null;
  }
  const family = getModelFamily(modelName);
  return family === "gemini-flash" ? "gemini-flash" : "gemini-pro";
}

function aggregateQuota(models?: Record<string, FetchAvailableModelEntry>): QuotaSummary {
  const groups: Partial<Record<QuotaGroup, QuotaGroupSummary>> = {};
  if (!models) {
    return { groups, modelCount: 0 };
  }

  let totalCount = 0;
  for (const [modelName, entry] of Object.entries(models)) {
    const group = classifyQuotaGroup(modelName, entry.displayName ?? entry.modelName);
    if (!group) {
      continue;
    }
    const quotaInfo = entry.quotaInfo;
    const remainingFraction = quotaInfo
      ? normalizeRemainingFraction(quotaInfo.remainingFraction)
      : undefined;
    const resetTime = quotaInfo?.resetTime;
    const resetTimestamp = parseResetTime(resetTime);

    // Only report a reset time we can actually parse; keep it coupled to the
    // model whose remainingFraction we display.
    const validResetTime = resetTimestamp !== null ? resetTime : undefined;

    totalCount += 1;

    const existing = groups[group];
    const nextCount = (existing?.modelCount ?? 0) + 1;

    // Keep remainingFraction and resetTime coupled to the SAME model. The
    // representative model for a group is the one with the highest remaining
    // fraction; when a model wins that comparison we take its resetTime too.
    let nextRemaining = existing?.remainingFraction;
    let nextResetTime = existing?.resetTime;

    if (existing === undefined) {
      // First model in the group establishes the baseline coupled pair.
      nextRemaining = remainingFraction;
      nextResetTime = validResetTime;
    } else if (
      remainingFraction !== undefined &&
      (existing.remainingFraction === undefined || remainingFraction > existing.remainingFraction)
    ) {
      // This model has strictly more remaining quota — it becomes representative.
      nextRemaining = remainingFraction;
      nextResetTime = validResetTime;
    } else if (
      remainingFraction !== undefined &&
      existing.remainingFraction !== undefined &&
      remainingFraction === existing.remainingFraction
    ) {
      // Tie on remaining fraction: break deterministically by keeping the
      // earliest valid reset time so we never report a far-future reset when an
      // equally-drained sibling model resets sooner.
      const existingResetTimestamp = parseResetTime(existing.resetTime);
      if (
        resetTimestamp !== null &&
        (existingResetTimestamp === null || resetTimestamp < existingResetTimestamp)
      ) {
        nextResetTime = validResetTime;
      }
    }
    // Otherwise keep the existing coupled (remainingFraction, resetTime) pair.

    groups[group] = {
      remainingFraction: nextRemaining,
      resetTime: nextResetTime,
      modelCount: nextCount,
    };
  }

  return { groups, modelCount: totalCount };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  // The signal stays armed while the caller reads the body, so a response that
  // stalls mid-body cannot hang the quota check either.
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

export async function fetchAvailableModels(
  accessToken: string,
  projectId: string,
): Promise<FetchAvailableModelsResponse> {
  const endpoint = ANTIGRAVITY_ENDPOINT_PROD;
  const quotaUserAgent = getAntigravityHeaders()["User-Agent"] || "antigravity/windows/amd64";
  const errors: string[] = [];

  const body = projectId ? { project: projectId } : {};
  const response = await fetchWithTimeout(`${endpoint}/v1internal:fetchAvailableModels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": quotaUserAgent,
    },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return (await response.json()) as FetchAvailableModelsResponse;
  }

  const message = await response.text().catch(() => "");
  const snippet = message.trim().slice(0, 200);
  errors.push(
    `fetchAvailableModels ${response.status} at ${endpoint}${snippet ? `: ${snippet}` : ""}`,
  );

  throw new Error(errors.join("; ") || "fetchAvailableModels failed");
}

async function fetchGeminiCliQuota(
  accessToken: string,
  projectId: string,
): Promise<RetrieveUserQuotaResponse> {
  const endpoint = ANTIGRAVITY_ENDPOINT_PROD;
  // Use Gemini CLI user-agent to get CLI quota buckets (not Antigravity buckets)
  const platform = process.platform || "darwin";
  const arch = process.arch || "arm64";
  const geminiCliUserAgent = `GeminiCLI/1.0.0/gemini-2.5-pro (${platform}; ${arch})`;

  const body = projectId ? { project: projectId } : {};
  
  try {
    const response = await fetchWithTimeout(`${endpoint}/v1internal:retrieveUserQuota`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": geminiCliUserAgent,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = (await response.json()) as RetrieveUserQuotaResponse;
      return data;
    }

    // Non-OK response - return empty buckets
    return { buckets: [] };
  } catch {
    // Network error or timeout - return empty buckets
    return { buckets: [] };
  }
}

function aggregateGeminiCliQuota(response: RetrieveUserQuotaResponse): GeminiCliQuotaSummary {
  const models: GeminiCliQuotaModel[] = [];
  
  if (!response.buckets || response.buckets.length === 0) {
    return { models };
  }

  for (const bucket of response.buckets) {
    if (!bucket.modelId) {
      continue;
    }
    
    // Filter out models we don't care about for Gemini CLI quotas
    // Only show gemini-3* and gemini-2.5-pro models (the premium ones)
    const modelId = bucket.modelId;
    const isRelevantModel = 
      modelId.startsWith("gemini-3") || 
      modelId === "gemini-2.5-pro";
    
    if (!isRelevantModel) {
      continue;
    }
    
    models.push({
      modelId: bucket.modelId,
      remainingFraction: normalizeRemainingFraction(bucket.remainingFraction),
      resetTime: bucket.resetTime,
    });
  }

  // Sort by model ID for consistent display
  models.sort((a, b) => a.modelId.localeCompare(b.modelId));

  return { models };
}

function applyAccountUpdates(account: AccountMetadataV3, auth: OAuthAuthDetails): AccountMetadataV3 | undefined {
  const parts = parseRefreshParts(auth.refresh);
  if (!parts.refreshToken) {
    return undefined;
  }

  const updated: AccountMetadataV3 = {
    ...account,
    refreshToken: parts.refreshToken,
    projectId: parts.projectId ?? account.projectId,
    managedProjectId: parts.managedProjectId ?? account.managedProjectId,
  };

  const changed =
    updated.refreshToken !== account.refreshToken ||
    updated.projectId !== account.projectId ||
    updated.managedProjectId !== account.managedProjectId;

  return changed ? updated : undefined;
}

// Max accounts to check simultaneously. Bounded to avoid bursting the provider
// with a token refresh + project-context resolution + quota fetch per account.
const QUOTA_CHECK_CONCURRENCY = 3;

/**
 * Run an async mapper over items with a bounded number of concurrent workers.
 * Results preserve the original item order regardless of completion order.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (items.length === 0) {
    return results;
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        break;
      }
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      results[index] = await fn(item, index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * Fetch and aggregate quota for a single account.
 * Never throws — failures are captured in the returned result's status/error.
 */
/**
 * Tries each Antigravity host in turn, as the quota endpoints are not served
 * from all of them at all times: a 403/404/5xx means "ask the next host", any
 * other response is the answer.
 */
async function fetchWithEndpointFallback(
  requestPath: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  let lastError: unknown;
  for (const endpoint of ANTIGRAVITY_ENDPOINT_FALLBACKS) {
    try {
      const response = await fetchWithTimeout(`${endpoint}${requestPath}`, options, timeoutMs);
      if (response.ok) {
        return response;
      }
      if (response.status === 403 || response.status === 404 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status} at ${endpoint}`);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All Antigravity endpoints failed");
}

/**
 * Reads the account's rate-limit buckets (`retrieveUserQuotaSummary`).
 *
 * This is the call that reports the weekly pool, which the per-model
 * `fetchAvailableModels` quota does not cover.
 */
export async function fetchRateLimitSummary(
  accessToken: string,
  projectId?: string,
): Promise<RateLimitSummary> {
  const body = projectId ? { project: projectId } : {};

  try {
    const response = await fetchWithEndpointFallback("/v1internal:retrieveUserQuotaSummary", {
      method: "POST",
      headers: {
        // The CLI-style `antigravity/<version> <platform>` agent, not the
        // Electron one: the backend keys what it reports off the client it
        // thinks is calling.
        ...getRandomizedHeaders("antigravity"),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { groups: [], error: `HTTP ${response.status}${text ? `: ${text.slice(0, 100)}` : ""}` };
    }

    const data = (await response.json()) as RetrieveUserQuotaSummaryResponse;
    return normalizeRateLimitSummary(data);
  } catch (error) {
    return { groups: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function normalizeRateLimitSummary(payload: RetrieveUserQuotaSummaryResponse): RateLimitSummary {
  const groups = (payload.groups ?? []).map((group): RateLimitGroup => ({
    displayName: group.displayName || "Unknown group",
    description: group.description || undefined,
    buckets: (group.buckets ?? []).map((bucket): RateLimitBucket => ({
      bucketId: bucket.bucketId || "",
      displayName: bucket.displayName || bucket.bucketId || "",
      window: bucket.window || "",
      remainingFraction: normalizeRemainingFraction(bucket.remainingFraction) ?? 0,
      remainingAmount: bucket.remainingAmount,
      disabled: bucket.disabled === true,
      resetTime: bucket.resetTime,
      description: bucket.description || undefined,
    })),
  }));

  return { description: payload.description || undefined, groups };
}

/** Google names the Gemini group in `displayName`; everything else is third-party. */
export function isGeminiRateLimitGroup(group: RateLimitGroup): boolean {
  return /gemini/i.test(group.displayName);
}

/** Finds one window's bucket (`weekly`, `5h`) in the first matching group. */
export function findRateLimitBucket(
  summary: RateLimitSummary | undefined,
  matches: (group: RateLimitGroup) => boolean,
  window: string,
): RateLimitBucket | undefined {
  const group = summary?.groups.find(matches);
  return group?.buckets.find((bucket) => bucket.window === window);
}

async function checkSingleAccountQuota(
  account: AccountMetadataV3,
  index: number,
  client: PluginClient,
  providerId: string,
): Promise<AccountQuotaResult> {
  const disabled = account.enabled === false;

  let auth = buildAuthFromAccount(account);

  try {
    if (accessTokenExpired(auth)) {
      const refreshed = await refreshAccessToken(auth, client, providerId);
      if (!refreshed) {
        throw new Error("Token refresh failed");
      }
      auth = refreshed;
    }

    const projectContext = await ensureProjectContext(auth);
    auth = projectContext.auth;
    const updatedAccount = applyAccountUpdates(account, auth);

    let quotaResult: QuotaSummary;
    let geminiCliQuotaResult: GeminiCliQuotaSummary;

    // Fetch both Antigravity and Gemini CLI quotas in parallel
    const [antigravityResponse, geminiCliResponse, rateLimitSummary] = await Promise.all([
      fetchAvailableModels(auth.access ?? "", projectContext.effectiveProjectId)
        .catch((): FetchAvailableModelsResponse => ({ models: undefined })),
      fetchGeminiCliQuota(auth.access ?? "", projectContext.effectiveProjectId),
      fetchRateLimitSummary(auth.access ?? "", projectContext.effectiveProjectId),
    ]);

    // Process Antigravity quota
    if (antigravityResponse.models === undefined) {
      quotaResult = {
        groups: {},
        modelCount: 0,
        error: "Failed to fetch Antigravity quota",
      };
    } else {
      recordAntigravityAvailableModels(antigravityResponse.models);
      quotaResult = aggregateQuota(antigravityResponse.models);
    }

    // Process Gemini CLI quota
    geminiCliQuotaResult = aggregateGeminiCliQuota(geminiCliResponse);
    if (geminiCliResponse.buckets === undefined || geminiCliResponse.buckets.length === 0) {
      geminiCliQuotaResult.error = geminiCliQuotaResult.models.length === 0
        ? "No Gemini CLI quota available"
        : undefined;
    }

    // Log quota status for each family
    for (const [family, groupQuota] of Object.entries(quotaResult.groups)) {
      const remainingPercent = (groupQuota.remainingFraction ?? 0) * 100;
      logQuotaStatus(account.email, index, remainingPercent, family);
    }

    return {
      index,
      email: account.email,
      status: "ok",
      disabled,
      quota: quotaResult,
      geminiCliQuota: geminiCliQuotaResult,
      rateLimits: rateLimitSummary,
      updatedAccount,
    };
  } catch (error) {
    logQuotaFetch(
      "error",
      undefined,
      `account=${account.email ?? index} error=${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      index,
      email: account.email,
      status: "error",
      disabled,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkAccountsQuota(
  accounts: AccountMetadataV3[],
  client: PluginClient,
  providerId = ANTIGRAVITY_PROVIDER_ID,
): Promise<AccountQuotaResult[]> {
  logQuotaFetch("start", accounts.length);

  // Check accounts with bounded concurrency; results stay ordered by index.
  const results = await mapWithConcurrency(accounts, QUOTA_CHECK_CONCURRENCY, (account, index) =>
    checkSingleAccountQuota(account, index, client, providerId),
  );

  logQuotaFetch(
    "complete",
    accounts.length,
    `ok=${results.filter((r) => r.status === "ok").length} errors=${results.filter((r) => r.status === "error").length}`,
  );
  return results;
}

export const __testExports = {
  aggregateQuota,
  mapWithConcurrency,
}
