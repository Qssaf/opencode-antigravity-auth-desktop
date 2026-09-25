/**
 * Model Resolution with Thinking Tier Support
 *
 * Resolves model names with tier suffixes (e.g., gemini-3-pro-high, claude-opus-4-6-thinking-low)
 * to their actual API model names and corresponding thinking configurations.
 */

import type { ResolvedModel, ThinkingTier, GoogleSearchConfig } from "./types";

export interface ModelResolverOptions {
  cli_first?: boolean;
}

/**
 * Thinking tier budgets by model family.
 * Claude and Gemini 2.5 Pro use numeric budgets.
 */
export const THINKING_TIER_BUDGETS = {
  claude: { low: 8192, medium: 16384, high: 32768 },
  "gemini-2.5-pro": { low: 8192, medium: 16384, high: 32768 },
  "gemini-2.5-flash": { low: 6144, medium: 12288, high: 24576 },
  default: { low: 4096, medium: 8192, high: 16384 },
} as const;

/**
 * Gemini 3 uses thinkingLevel strings instead of numeric budgets.
 * Flash supports: minimal, low, medium, high
 * Pro supports: low, high (no minimal/medium)
 */
export const GEMINI_3_THINKING_LEVELS = [
  "minimal",
  "low",
  "medium",
  "high",
] as const;

/**
 * Model aliases - maps user-friendly names to API model names.
 *
 * Format:
 * - Gemini 3 Pro variants: gemini-3-pro-{low,medium,high}
 * - Claude thinking variants: claude-{model}-thinking-{low,medium,high}
 * - Claude non-thinking: claude-{model} (no -thinking suffix)
 */
export const MODEL_ALIASES: Record<string, string> = {
  "gemini-flash-latest": "gemini-3.7-flash",
  "gemini-flash-lite-latest": "gemini-3.5-flash-lite",

  // Gemini 3 variants - for Gemini CLI only (tier stripped, thinkingLevel used)
  // For Antigravity, these are bypassed and full model name is kept
  "gemini-3-pro-low": "gemini-3-pro",
  "gemini-3-pro-high": "gemini-3-pro",
  "gemini-3.1-pro-low": "gemini-3.1-pro",
  "gemini-3.1-pro-high": "gemini-3.1-pro",
  "gemini-3-flash-low": "gemini-3-flash",
  "gemini-3-flash-medium": "gemini-3-flash",
  "gemini-3-flash-high": "gemini-3-flash",
  "gemini-3.7-flash-minimal": "gemini-3.7-flash",
  "gemini-3.7-flash-low": "gemini-3.7-flash",
  "gemini-3.7-flash-medium": "gemini-3.7-flash",
  "gemini-3.7-flash-high": "gemini-3.7-flash",

  // Claude proxy names (gemini- prefix for compatibility)
  "gemini-claude-opus-4-6-thinking-low": "claude-opus-4-6-thinking",
  "gemini-claude-opus-4-6-thinking-medium": "claude-opus-4-6-thinking",
  "gemini-claude-opus-4-6-thinking-high": "claude-opus-4-6-thinking",
  "gemini-claude-sonnet-4-6": "claude-sonnet-4-6",

  // Image generation models - only gemini-3-pro-image is available via Antigravity API
  // Note: gemini-2.5-flash-image (Nano Banana) is NOT supported by Antigravity - only Google AI API
  // Reference: Antigravity-Manager/src-tauri/src/proxy/common/model_mapping.rs
};

const TIER_REGEX = /-(minimal|low|medium|high)$/;
const QUOTA_PREFIX_REGEX = /^antigravity-/i;
const GEMINI_3_PRO_REGEX = /^gemini-3(?:\.\d+)?-pro/i;
const GEMINI_3_FLASH_REGEX = /^gemini-3(?:\.\d+)?-flash/i;
const GEMINI_3_PRO_TIER_REGEX =
  /^(gemini-3(?:\.\d+)?-pro)(?:-(minimal|low|medium|high))?$/i;
const GEMINI_36_FLASH_REGEX =
  /^gemini-3\.6-flash(?:-(low|medium|high))?$/i;
const GEMINI_36_FLASH_MODELS = {
  low: "gemini-3.6-flash-low",
  medium: "gemini-3.6-flash-medium",
  high: "gemini-3.6-flash-high",
} as const;
const GEMINI_37_FLASH_REGEX =
  /^gemini-3\.7-flash(?:-(minimal|low|medium|high))?$/i;
const GEMINI_37_FLASH_MODELS = {
  low: "gemini-3.7-flash-low",
  medium: "gemini-3.7-flash-medium",
  high: "gemini-3.7-flash-high",
} as const;
const GEMINI_38_FLASH_REGEX =
  /^gemini-3\.8-flash(?:-(low|medium|high))?$/i;
const GEMINI_38_FLASH_MODELS = {
  low: "gemini-3.8-flash-low",
  medium: "gemini-3.8-flash-medium",
  high: "gemini-3.8-flash-high",
} as const;
/**
 * Dotted-minor Gemini generations (gemini-3.1, gemini-3.5, ...) use BARE model
 * names on the Gemini CLI backend, unlike the legacy 3.0 line (gemini-3-pro) which
 * uses a "-preview" suffix. Confirmed against the antigravity (`agy`) and `gemini`
 * CLIs, which ship `gemini-3.1-pro` (no `-preview`).
 */
const GEMINI_DOTTED_MINOR_REGEX = /^gemini-3\.(?:[1-9]\d*)/i;

// ANTIGRAVITY_ONLY_MODELS removed - all models now default to antigravity

/**
 * Image generation models - always route to Antigravity.
 * These models don't support thinking and require imageConfig.
 */
const IMAGE_GENERATION_MODELS = /image|imagen/i;

// Legacy LEGACY_ANTIGRAVITY_GEMINI3 regex removed - all Gemini models now default to antigravity

/**
 * Models that support thinking tier suffixes.
 * Only these models should have -low/-medium/-high stripped as thinking tiers.
 * GPT models like gpt-oss-120b-medium should NOT have -medium stripped.
 */
function supportsThinkingTiers(model: string): boolean {
  const lower = model.toLowerCase();
  return (
    lower.includes("gemini-3") ||
    lower.includes("gemini-2.5") ||
    (lower.includes("claude") && lower.includes("thinking"))
  );
}

/**
 * Extracts thinking tier from model name suffix.
 * Only extracts tier for models that support thinking tiers.
 */
function extractThinkingTierFromModel(model: string): ThinkingTier | undefined {
  // Only extract tier for models that support thinking tiers
  if (!supportsThinkingTiers(model)) {
    return undefined;
  }
  const tierMatch = model.match(TIER_REGEX);
  return tierMatch?.[1] as ThinkingTier | undefined;
}

/**
 * Determines the budget family for a model.
 */
function getBudgetFamily(model: string): keyof typeof THINKING_TIER_BUDGETS {
  if (model.includes("claude")) {
    return "claude";
  }
  if (model.includes("gemini-2.5-pro")) {
    return "gemini-2.5-pro";
  }
  if (model.includes("gemini-2.5-flash")) {
    return "gemini-2.5-flash";
  }
  return "default";
}

/**
 * Checks if a model is a thinking-capable model.
 */
function isThinkingCapableModel(model: string): boolean {
  const lower = model.toLowerCase();
  return (
    lower.includes("thinking") ||
    lower.includes("gemini-3") ||
    lower.includes("gemini-2.5")
  );
}

export function isGemini3ProModel(model: string): boolean {
  return GEMINI_3_PRO_REGEX.test(model);
}

export function isGemini3FlashModel(model: string): boolean {
  return GEMINI_3_FLASH_REGEX.test(model);
}

/**
 * Antigravity retired Gemini 3 Pro and Gemini 3.5 Flash. Their backend ids still
 * answer HTTP 200, but with canned text ("... is no longer available. Please
 * switch to Gemini 3.1 Pro / Gemini 3.7 Flash ...") instead of a model response,
 * so a request for them moves to the successor the backend names, keeping the
 * requested tier. `gemini-3-flash-agent` and `gemini-3.5-flash-extra-low` are the
 * retired 3.5 Flash High and Low backend ids.
 *
 * `gemini-pro-agent` is the backend id of Gemini 3.1 Pro (High) (see
 * toAntigravityWireModel). It resolves as `gemini-3.1-pro-high` so the Gemini 3
 * handling keyed on the model name (thinkingLevel, thought signatures) applies.
 */
export function remapRetiredAntigravityGeminiModel(model: string): string {
  const lower = model.toLowerCase();
  if (lower === "gemini-pro-agent") return "gemini-3.1-pro-high";
  if (lower === "gemini-3-flash-agent") return "gemini-3.7-flash-high";
  if (lower === "gemini-3.5-flash-extra-low") return "gemini-3.7-flash-low";
  const pro = lower.match(/^gemini-3-pro(-(?:low|medium|high))?$/);
  if (pro) return `gemini-3.1-pro${pro[1] ?? ""}`;
  const flash = lower.match(/^gemini-3\.5-flash(-(?:minimal|low|medium|high))?$/);
  if (flash) return `gemini-3.7-flash${flash[1] ?? ""}`;
  return model;
}

/**
 * Backend ids Antigravity renamed. `fetchAvailableModels` lists them under
 * `deprecatedModelIds` (gemini-3.1-pro-high -> gemini-pro-agent), and the old id
 * answers HTTP 400 "Request contains an invalid argument" to every request.
 * Applied only to the id put on the wire, so everything keyed on the model name
 * keeps seeing gemini-3.1-pro-high.
 */
const ANTIGRAVITY_WIRE_MODEL_IDS: Readonly<Record<string, string>> = {
  "gemini-3.1-pro-high": "gemini-pro-agent",
};

export function toAntigravityWireModel(model: string): string {
  return ANTIGRAVITY_WIRE_MODEL_IDS[model.toLowerCase()] ?? model;
}

/**
 * Antigravity serves Gemini 3.1 Pro as a low and a high backend id; the low one
 * caps thinking near 1k tokens (registry thinkingBudget 1001). High is the
 * default, and only an explicit low (or minimal, which Pro rejects) selects low.
 */
export function resolveAntigravityGemini3ProBackendModel(
  model: string,
  thinkingLevel?: string,
): string | undefined {
  const match = model.replace(QUOTA_PREFIX_REGEX, "").match(GEMINI_3_PRO_TIER_REGEX);
  if (!match) {
    return undefined;
  }
  const level = (thinkingLevel ?? match[2] ?? "high").toLowerCase();
  const tier = level === "low" || level === "minimal" ? "low" : "high";
  return `${match[1]}-${tier}`;
}

/**
 * Antigravity exposes Gemini 3.6 Flash as separate tier-specific backend ids.
 * The public Gemini API and Gemini CLI continue to use the bare stable id.
 */
export function resolveAntigravityGemini36FlashBackendModel(
  model: string,
  thinkingLevel?: string,
): string | undefined {
  const modelWithoutQuota = model.replace(QUOTA_PREFIX_REGEX, "");
  const match = modelWithoutQuota.match(GEMINI_36_FLASH_REGEX);
  if (!match) {
    return undefined;
  }

  const rawLevel = (thinkingLevel ?? match[1] ?? "medium").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return undefined;
  }
  return GEMINI_36_FLASH_MODELS[level];
}

/**
 * AGY exposes Gemini 3.7 Flash only through tier-specific backend ids.
 * Minimal is retained as a compatibility alias for low, but is not advertised.
 */
export function resolveAntigravityGemini37FlashBackendModel(
  model: string,
  thinkingLevel?: string,
): string | undefined {
  const modelWithoutQuota = model.replace(QUOTA_PREFIX_REGEX, "");
  const match = modelWithoutQuota.match(GEMINI_37_FLASH_REGEX);
  if (!match) {
    return undefined;
  }

  const rawLevel = (thinkingLevel ?? match[1] ?? "medium").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return undefined;
  }
  return GEMINI_37_FLASH_MODELS[level];
}

/**
 * Antigravity exposes Gemini 3.8 Flash as separate tier-specific backend ids,
 * following the same scheme as 3.6/3.7 Flash. The public Gemini API and Gemini CLI
 * continue to use the bare stable id.
 */
export function resolveAntigravityGemini38FlashBackendModel(
  model: string,
  thinkingLevel?: string,
): string | undefined {
  const modelWithoutQuota = model.replace(QUOTA_PREFIX_REGEX, "");
  const match = modelWithoutQuota.match(GEMINI_38_FLASH_REGEX);
  if (!match) {
    return undefined;
  }

  const rawLevel = (thinkingLevel ?? match[1] ?? "medium").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return undefined;
  }
  return GEMINI_38_FLASH_MODELS[level];
}

/**
 * Picks the Antigravity backend id for a Gemini 3 model and the thinking level to
 * send with it. Gemini 3.1 Pro and 3.7/3.8 Flash reject thinkingLevel "minimal"
 * with HTTP 400, so it is sent as low. Returns undefined for models that go out
 * under their own name.
 */
export function resolveAntigravityGeminiBackend(
  model: string,
  thinkingLevel?: string,
): { model: string; thinkingLevel?: string } | undefined {
  const tieredFlash =
    resolveAntigravityGemini38FlashBackendModel(model, thinkingLevel) ??
    resolveAntigravityGemini37FlashBackendModel(model, thinkingLevel);
  if (tieredFlash) {
    return {
      model: tieredFlash,
      thinkingLevel: thinkingLevel === "minimal" ? "low" : thinkingLevel,
    };
  }
  const flash36 = resolveAntigravityGemini36FlashBackendModel(model, thinkingLevel);
  if (flash36) {
    return { model: flash36, thinkingLevel };
  }
  const pro = resolveAntigravityGemini3ProBackendModel(model, thinkingLevel);
  if (pro) {
    return { model: pro, thinkingLevel: pro.endsWith("-low") ? "low" : "high" };
  }
  return undefined;
}

export function getDefaultGemini3ThinkingLevel(model: string): string {
  const normalized = model.toLowerCase().replace(QUOTA_PREFIX_REGEX, "");
  if (/^gemini-3\.[678]-flash(?:-|$)/.test(normalized)) {
    return "medium";
  }
  if (/^gemini-3\.5-flash-lite(?:-|$)/.test(normalized)) {
    return "minimal";
  }
  if (isGemini3ProModel(normalized) && !IMAGE_GENERATION_MODELS.test(normalized)) {
    return /-low$/.test(normalized) ? "low" : "high";
  }
  return "low";
}


/**
 * Resolves a model name with optional tier suffix and quota prefix to its actual API model name
 * and corresponding thinking configuration.
 *
 * Quota routing:
 * - Default to Antigravity quota unless cli_first is enabled or a model is public-only
 * - Fallback to Gemini CLI happens at account rotation level when Antigravity is exhausted
 * - "antigravity-" prefix marks explicit quota (no fallback allowed)
 * - Claude and image models always use Antigravity
 *
 * Examples:
 * - "gemini-2.5-flash" → { quotaPreference: "antigravity" }
 * - "gemini-3-pro-preview" → { quotaPreference: "antigravity" }
 * - "antigravity-gemini-3-pro-high" → { quotaPreference: "antigravity", explicitQuota: true }
 * - "claude-opus-4-6-thinking-medium" → { quotaPreference: "antigravity" }
 *
 * @param requestedModel - The model name from the request
 * @param options - Optional configuration including cli_first preference
 * @returns Resolved model with thinking configuration
 */
export function resolveModelWithTier(
  requestedModel: string,
  options: ModelResolverOptions = {},
): ResolvedModel {
  const isAntigravity = QUOTA_PREFIX_REGEX.test(requestedModel);
  const strippedModel = requestedModel.replace(QUOTA_PREFIX_REGEX, "");
  const modelWithoutQuota = isAntigravity
    ? remapRetiredAntigravityGeminiModel(strippedModel)
    : strippedModel;

  const tier = extractThinkingTierFromModel(modelWithoutQuota);
  const baseName = tier
    ? modelWithoutQuota.replace(TIER_REGEX, "")
    : modelWithoutQuota;

  const isImageModel = IMAGE_GENERATION_MODELS.test(modelWithoutQuota);
  const isClaudeModel = modelWithoutQuota.toLowerCase().includes("claude");

  // Models default to Antigravity unless cli_first is enabled.
  // Fallback to gemini-cli happens at the account rotation level when Antigravity is exhausted
  const preferGeminiCli =
    !isAntigravity &&
    options.cli_first === true && !isImageModel && !isClaudeModel;
  const quotaPreference = preferGeminiCli
    ? ("gemini-cli" as const)
    : ("antigravity" as const);
  const explicitQuota = isAntigravity || isImageModel;

  const isGemini3 = modelWithoutQuota.toLowerCase().startsWith("gemini-3");
  const skipAlias = isAntigravity && isGemini3;

  // Antigravity API: Gemini 3.1 Pro and 3.6+ Flash take tier-specific backend ids
  //                  (see the resolveAntigravityGemini*BackendModel helpers);
  //                  other gemini-3-flash models use bare name + thinkingLevel param.
  // Pro defaults to the high tier unless an explicit tier is provided.
  const isGemini3Flash = isGemini3FlashModel(modelWithoutQuota);

  let effectiveTier = tier;
  let antigravityModel = modelWithoutQuota;
  if (skipAlias) {
    const gemini38FlashBackendModel =
      resolveAntigravityGemini38FlashBackendModel(modelWithoutQuota, tier);
    const gemini37FlashBackendModel =
      resolveAntigravityGemini37FlashBackendModel(modelWithoutQuota, effectiveTier);
    const gemini36FlashBackendModel =
      resolveAntigravityGemini36FlashBackendModel(modelWithoutQuota, effectiveTier);
    const gemini3ProBackendModel = isImageModel
      ? undefined
      : resolveAntigravityGemini3ProBackendModel(modelWithoutQuota, effectiveTier);
    if (gemini38FlashBackendModel) {
      antigravityModel = gemini38FlashBackendModel;
    } else if (gemini37FlashBackendModel) {
      antigravityModel = gemini37FlashBackendModel;
      if (String(effectiveTier) === "minimal") {
        effectiveTier = "low";
      }
    } else if (gemini36FlashBackendModel) {
      antigravityModel = gemini36FlashBackendModel;
    } else if (gemini3ProBackendModel) {
      antigravityModel = gemini3ProBackendModel;
      if (effectiveTier) {
        effectiveTier = gemini3ProBackendModel.endsWith("-low") ? "low" : "high";
      }
    } else if (isGemini3Flash && effectiveTier) {
      antigravityModel = baseName;
    }
  }

  const actualModel = skipAlias
    ? antigravityModel
    : MODEL_ALIASES[modelWithoutQuota] || MODEL_ALIASES[baseName] || baseName;

  const resolvedModel = actualModel;

  const isThinking = isThinkingCapableModel(resolvedModel);

  // Image generation models don't support thinking - return early without thinking config
  if (isImageModel) {
    return {
      actualModel: resolvedModel,
      isThinkingModel: false,
      isImageModel: true,
      quotaPreference,
      explicitQuota,
    };
  }

  // Check if this is a Gemini 3 model (works for both aliased and skipAlias paths)
  const isEffectiveGemini3 = resolvedModel.toLowerCase().includes("gemini-3");
  const isClaudeThinking =
    resolvedModel.toLowerCase().includes("claude") &&
    resolvedModel.toLowerCase().includes("thinking");

  if (!effectiveTier) {
    // Gemini 3 models without explicit tier get a default thinkingLevel
    if (isEffectiveGemini3) {
      return {
        actualModel: resolvedModel,
        thinkingLevel: getDefaultGemini3ThinkingLevel(resolvedModel),
        isThinkingModel: true,
        quotaPreference,
        explicitQuota,
      };
    }
    // Claude thinking models without explicit tier get max budget (32768)
    // Per Anthropic docs, budget_tokens is required when enabling extended thinking
    if (isClaudeThinking) {
      return {
        actualModel: resolvedModel,
        thinkingBudget: THINKING_TIER_BUDGETS.claude.high,
        isThinkingModel: true,
        quotaPreference,
        explicitQuota,
      };
    }
    return {
      actualModel: resolvedModel,
      isThinkingModel: isThinking,
      quotaPreference,
      explicitQuota,
    };
  }

  // Gemini 3 models with tier always get thinkingLevel set
  if (isEffectiveGemini3) {
    return {
      actualModel: resolvedModel,
      thinkingLevel: effectiveTier,
      tier: effectiveTier,
      isThinkingModel: true,
      quotaPreference,
      explicitQuota,
    };
  }

  const budgetFamily = getBudgetFamily(resolvedModel);
  const budgets = THINKING_TIER_BUDGETS[budgetFamily];
  const thinkingBudget = budgets[effectiveTier];

  return {
    actualModel: resolvedModel,
    thinkingBudget,
    tier: effectiveTier,
    isThinkingModel: isThinking,
    quotaPreference,
    explicitQuota,
  };
}

/**
 * Gets the model family for routing decisions.
 */
export function getModelFamily(
  model: string,
): "claude" | "gemini-flash" | "gemini-pro" {
  const lower = model.toLowerCase();
  if (lower.includes("claude")) {
    return "claude";
  }
  if (lower.includes("flash")) {
    return "gemini-flash";
  }
  return "gemini-pro";
}

/**
 * Variant config from OpenCode's providerOptions.
 */
export interface VariantConfig {
  thinkingBudget?: number;
  googleSearch?: GoogleSearchConfig;
}

/**
 * Maps a thinking budget to Gemini 3 thinking level.
 * ≤8192 → low, ≤16384 → medium, >16384 → high
 */
function budgetToGemini3Level(budget: number): "low" | "medium" | "high" {
  if (budget <= 8192) return "low";
  if (budget <= 16384) return "medium";
  return "high";
}

/**
 * Resolves model name for a specific headerStyle (quota fallback support).
 * Transforms model names when switching between gemini-cli and antigravity quotas.
 *
 * Issue #103: When quota fallback occurs, model names need to be transformed:
 * - gemini-3-flash-preview (gemini-cli) → gemini-3-flash (antigravity)
 * - gemini-3-pro-preview (gemini-cli) → gemini-3-pro-low (antigravity)
 * - gemini-3-flash (antigravity) → gemini-3-flash-preview (gemini-cli)
 */
/**
 * Maps Antigravity-only bare Gemini ids to the public Gemini API equivalent
 * served by `generativelanguage.googleapis.com/v1beta`. Verified live against
 * GET /v1beta/models (May 2026).
 *
 * Used by `resolveModelForHeaderStyle(..., "agy-sdk")` so that when OAuth
 * Antigravity quota is exhausted and the api-key fallback kicks in, requests
 * for `antigravity-gemini-3.1-pro` (etc.) are rewritten to the public-API
 * variant Google actually serves — instead of producing a deterministic 404
 * on the bare id.
 *
 * Returns `undefined` when the model is Antigravity-only but has no known
 * public-API equivalent (e.g. Claude models). Callers should treat that as
 * "not servable via api-key path" and route accordingly.
 */
const ANTIGRAVITY_TO_PUBLIC_API_MODEL_MAP: ReadonlyMap<string, string> =
  new Map([
    ["gemini-3-pro", "gemini-3-pro-preview"],
    ["gemini-3-flash", "gemini-3-flash-preview"],
    ["gemini-3.1-pro", "gemini-3.1-pro-preview"],
    ["gemini-3.1-flash", "gemini-3.1-flash-lite"],
  ]);

export function mapAntigravityModelToPublicApi(
  model: string,
): string | undefined {
  const stripped = model.toLowerCase().replace(/^antigravity-/, "");
  // Strip tier suffixes (-minimal/-low/-medium/-high) so
  // `antigravity-gemini-3.1-pro-high` maps the same as `antigravity-gemini-3.1-pro`.
  const base = stripped.replace(/-(minimal|low|medium|high)$/, "");
  return ANTIGRAVITY_TO_PUBLIC_API_MODEL_MAP.get(base);
}

export function resolveModelForHeaderStyle(
  requestedModel: string,
  headerStyle: "antigravity" | "gemini-cli" | "agy-sdk",
): ResolvedModel {
  const aliasResolvedModel = MODEL_ALIASES[requestedModel];
  // The tier aliases strip the tier for Gemini CLI; Antigravity keeps it in the backend id.
  const keepsTier = headerStyle === "antigravity" && TIER_REGEX.test(requestedModel);
  if (aliasResolvedModel && !keepsTier) {
    return resolveModelForHeaderStyle(aliasResolvedModel, headerStyle);
  }

  const lower = requestedModel.toLowerCase();
  const isGemini3 = lower.includes("gemini-3");

  if (headerStyle === "agy-sdk") {
    const modelWithTier = requestedModel.replace(/^antigravity-/i, "");
    const stripped = modelWithTier.replace(/-(minimal|low|medium|high)$/i, "");
    // Translate Antigravity-only ids (e.g. `gemini-3.1-pro`) to the public Gemini
    // API equivalent (`gemini-3.1-pro-preview`). Falls back to the bare stripped
    // name when no translation exists (covers `gemini-3.5-flash`, etc.).
    const transformedModel =
      mapAntigravityModelToPublicApi(stripped) ?? stripped;
    return {
      ...resolveModelWithTier(modelWithTier),
      actualModel: transformedModel,
      quotaPreference: "agy-sdk",
      explicitQuota: false,
    };
  }

  if (!isGemini3) {
    return resolveModelWithTier(requestedModel);
  }

  if (headerStyle === "antigravity") {
    // resolveModelWithTier picks the Pro tier and remaps retired ids.
    const transformedModel = requestedModel
      .replace(/-preview-customtools$/i, "")
      .replace(/-preview$/i, "")
      .replace(/^antigravity-/i, "");

    const prefixedModel = `antigravity-${transformedModel}`;
    return resolveModelWithTier(prefixedModel);
  }

  if (headerStyle === "gemini-cli") {
    let transformedModel = requestedModel
      .replace(/^antigravity-/i, "")
      .replace(/-(minimal|low|medium|high)$/i, "");

    // Only the legacy 3.0 line takes a "-preview" suffix on the Gemini CLI backend.
    // Dotted-minor generations (gemini-3.1+, gemini-3.5, ...) use bare names there.
    const hasPreviewSuffix = /-preview($|-)/i.test(transformedModel);
    const usesBareName = GEMINI_DOTTED_MINOR_REGEX.test(transformedModel);
    if (usesBareName && /-preview$/i.test(transformedModel)) {
      transformedModel = transformedModel.replace(/-preview$/i, "");
    } else if (!hasPreviewSuffix && !usesBareName) {
      transformedModel = `${transformedModel}-preview`;
    }

    return {
      ...resolveModelWithTier(transformedModel),
      quotaPreference: "gemini-cli",
    };
  }

  return resolveModelWithTier(requestedModel);
}

/**
 * Resolves model with variant config from providerOptions.
 * Variant config takes priority over tier suffix in model name.
 */
export function resolveModelWithVariant(
  requestedModel: string,
  variantConfig?: VariantConfig,
): ResolvedModel {
  const base = resolveModelWithTier(requestedModel);

  if (!variantConfig) {
    return base;
  }

  // Apply Google Search config if present
  if (variantConfig.googleSearch) {
    base.googleSearch = variantConfig.googleSearch;
    base.configSource = "variant";
  }

  if (!variantConfig.thinkingBudget) {
    return base;
  }

  const budget = variantConfig.thinkingBudget;
  const isGemini3 = base.actualModel.toLowerCase().includes("gemini-3");

  if (isGemini3) {
    const level = budgetToGemini3Level(budget);
    const isAntigravityGemini3Pro =
      base.quotaPreference === "antigravity" &&
      isGemini3ProModel(base.actualModel);

    const actualModel = isAntigravityGemini3Pro
      ? (resolveAntigravityGemini3ProBackendModel(base.actualModel, level) ?? base.actualModel)
      : base.actualModel;

    return {
      ...base,
      actualModel,
      thinkingLevel: level,
      thinkingBudget: undefined,
      configSource: "variant",
    };
  }

  return {
    ...base,
    thinkingBudget: budget,
    configSource: "variant",
  };
}
