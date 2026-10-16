/**
 * Model Resolution with Thinking Tier Support
 *
 * Resolves model names with tier suffixes (e.g., gemini-3.1-pro-high, gemini-4-argon-low)
 * to their actual API model names and corresponding thinking configurations.
 */

import type { ResolvedModel, ThinkingTier, GoogleSearchConfig } from "./types";


/**
 * Thinking tier budgets by model family, for models that take a numeric budget
 * instead of a thinking level.
 */
export const THINKING_TIER_BUDGETS = {
  claude: { low: 8192, medium: 16384, high: 32768 },
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
  "gemini-flash-latest": "gemini-3.8-flash",
  "gemini-flash-lite-latest": "gemini-3.8-flash",

  // Gemini 3 tier variants - tier stripped, thinkingLevel used (API-key path)
  // For Antigravity, these are bypassed and full model name is kept
  "gemini-3-pro-low": "gemini-3-pro",
  "gemini-3-pro-high": "gemini-3-pro",
  "gemini-3.1-pro-low": "gemini-3.1-pro",
  "gemini-3.1-pro-high": "gemini-3.1-pro",
  "gemini-3-flash-low": "gemini-3-flash",
  "gemini-3-flash-medium": "gemini-3-flash",
  "gemini-3-flash-high": "gemini-3-flash",

  // Image generation models - only gemini-3-pro-image is available via Antigravity API
  // Reference: Antigravity-Manager/src-tauri/src/proxy/common/model_mapping.rs
};

const TIER_REGEX = /-(minimal|low|medium|high)$/;
const QUOTA_PREFIX_REGEX = /^antigravity-/i;
const GEMINI_3_PRO_REGEX = /^gemini-3(?:\.\d+)?-pro/i;
const GEMINI_3_FLASH_REGEX = /^gemini-3(?:\.\d+)?-flash/i;
const GEMINI_3_PRO_TIER_REGEX =
  /^(gemini-3(?:\.\d+)?-pro)(?:-(minimal|low|medium|high))?$/i;
const GEMINI_38_FLASH_REGEX =
  /^gemini-3\.8-flash(?:-(minimal|low|medium|high))?$/i;
const GEMINI_38_FLASH_MODELS = {
  low: "gemini-3.8-flash-low",
  medium: "gemini-3.8-flash-medium",
  high: "gemini-3.8-flash-high",
} as const;
const GEMINI_4_ARGON_REGEX =
  /^gemini-4-argon(?:-(minimal|low|medium|high))?$/i;
const GEMINI_4_ARGON_MODELS = {
  low: "gemini-4-argon-low",
  medium: "gemini-4-argon-medium",
  high: "gemini-4-argon-high",
} as const;
/**
 * Gemini generations that take a thinkingLevel string and thought signatures:
 * Gemini 3 and every later one (gemini-3.8-flash, gemini-4-argon, ...).
 */
const GEMINI_3_OR_LATER_REGEX = /gemini-(?:[3-9]|[1-9]\d+)(?=[.-]|$)/i;

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
 */
function supportsThinkingTiers(model: string): boolean {
  const lower = model.toLowerCase();
  return (
    isGemini3OrLaterModel(lower) ||
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
  return "default";
}

/**
 * Checks if a model is a thinking-capable model.
 */
function isThinkingCapableModel(model: string): boolean {
  const lower = model.toLowerCase();
  return (
    lower.includes("thinking") ||
    isGemini3OrLaterModel(lower)
  );
}

export function isGemini3ProModel(model: string): boolean {
  return GEMINI_3_PRO_REGEX.test(model);
}

export function isGemini3FlashModel(model: string): boolean {
  return GEMINI_3_FLASH_REGEX.test(model);
}

/**
 * True for Gemini 3 and later (Gemini 4 Argon included): the generations that
 * take a thinkingLevel instead of a budget and return thought signatures.
 */
export function isGemini3OrLaterModel(model: string): boolean {
  return GEMINI_3_OR_LATER_REGEX.test(model);
}

/**
 * Gemini models the plugin no longer offers on any quota: every Gemini 2 chat
 * model (2.0, 2.5, with any lite/preview/dated suffix) and the 3.5-3.7 Flash
 * and 3.5 Flash-Lite that Google dropped.
 */
const DROPPED_GEMINI_REGEX =
  /^gemini-(?:2(?:\.\d+)?-(?:pro|flash)(?:-lite)?(?:-preview)?(?:-\d{2}-\d{2}|-\d{3})?|3\.[567]-flash(?:-lite)?)(?:-(minimal|low|medium|high))?$/;

/**
 * A request for a dropped Gemini model (see DROPPED_GEMINI_REGEX), with or
 * without a tier suffix, moves to Gemini 3.8 Flash at the same tier, so
 * sessions still set to an old model keep working. The tier is kept as is:
 * the public Gemini API serves minimal, and the Antigravity backend resolver
 * turns it into low.
 */
export function remapDroppedGeminiModel(model: string): string {
  const dropped = model.toLowerCase().match(DROPPED_GEMINI_REGEX);
  if (!dropped) return model;
  return toGemini38Flash(dropped[1]);
}

/** True for any Gemini 2 model id, with or without the `antigravity-` prefix. */
export function isGemini2Model(model: string): boolean {
  return /^(?:antigravity-)?gemini-2(?:[.-]|$)/i.test(model);
}

function toGemini38Flash(tier: string | undefined): string {
  return tier ? `gemini-3.8-flash-${tier}` : "gemini-3.8-flash";
}

/**
 * Gemini chat models of the generations Antigravity no longer serves (2.0, 2.5,
 * 3, 3.1, 3.5-3.7), with any preview/custom-tools and tier suffix. Listed
 * explicitly so a model Google adds later (gemini-3.9-flash, ...) is left alone.
 */
const RETIRED_ANTIGRAVITY_GEMINI_REGEX =
  /^gemini-(?:2\.0|2\.5|3|3\.0|3\.1|3\.5|3\.6|3\.7)-(?:pro|flash)(?:-lite)?(?:-preview)?(?:-customtools)?(?:-(minimal|low|medium|high))?$/;

/**
 * Antigravity now serves only Gemini 3.8 Flash and Gemini 4 Argon. A request
 * for a retired Gemini chat model on Antigravity (Gemini 2.5, 3 Pro, 3.1 Pro,
 * 3 Flash, 3.1 Flash-Lite, the dropped 3.5-3.7 Flash) moves to Gemini 3.8 Flash
 * at the same tier, so sessions still set to an old model keep working.
 * Retired backend ids get the same treatment: `gemini-pro-agent` (3.1 Pro High),
 * `gemini-3-flash-agent` (3.5 Flash High) and `gemini-3.5-flash-extra-low`.
 * Image models are left alone.
 */
export function remapRetiredAntigravityGeminiModel(model: string): string {
  const lower = model.toLowerCase();
  if (lower === "gemini-pro-agent" || lower === "gemini-3-flash-agent") return "gemini-3.8-flash-high";
  if (lower === "gemini-3.5-flash-extra-low") return "gemini-3.8-flash-low";
  const retired = lower.match(RETIRED_ANTIGRAVITY_GEMINI_REGEX);
  if (!retired) return model;
  // Minimal becomes low, the lowest tier 3.8 Flash serves on Antigravity.
  return toGemini38Flash(retired[1] === "minimal" ? "low" : retired[1]);
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
 * Antigravity exposes Gemini 3.8 Flash as separate tier-specific backend ids.
 * The public Gemini API continues to use the bare stable id.
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

  // High by default: 3.8 Flash is used for agent work, where medium's shorter
  // thinking showed up as weaker answers. A variant or tier suffix still wins.
  const rawLevel = (thinkingLevel ?? match[1] ?? "high").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return undefined;
  }
  return GEMINI_38_FLASH_MODELS[level];
}

/**
 * Antigravity serves Gemini 4 Argon (Google AI Ultra only) as tier-specific
 * backend ids, gemini-4-argon-{low,medium,high}, like 3.8 Flash. High is the
 * default; minimal is accepted as low.
 */
export function resolveAntigravityGemini4ArgonBackendModel(
  model: string,
  thinkingLevel?: string,
): string | undefined {
  const match = model.replace(QUOTA_PREFIX_REGEX, "").match(GEMINI_4_ARGON_REGEX);
  if (!match) {
    return undefined;
  }
  const rawLevel = (thinkingLevel ?? match[1] ?? "high").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return undefined;
  }
  return GEMINI_4_ARGON_MODELS[level];
}

/** True for Gemini 4 Argon under any of its names or backend ids. */
export function isGemini4ArgonModel(model: string): boolean {
  return /(?:^|[-/])gemini-4-argon(?:-|$)/i.test(model);
}

/**
 * Picks the Antigravity backend id for a Gemini 3 or later model and the
 * thinking level to send with it. Gemini 3.1 Pro, 3.8 Flash and 4 Argon reject
 * thinkingLevel "minimal" with HTTP 400, so it is sent as low. Returns undefined
 * for models that go out under their own name.
 */
export function resolveAntigravityGeminiBackend(
  model: string,
  thinkingLevel?: string,
): { model: string; thinkingLevel?: string } | undefined {
  const tiered =
    resolveAntigravityGemini38FlashBackendModel(model, thinkingLevel) ??
    resolveAntigravityGemini4ArgonBackendModel(model, thinkingLevel);
  if (tiered) {
    return {
      model: tiered,
      thinkingLevel: thinkingLevel === "minimal" ? "low" : thinkingLevel,
    };
  }
  const pro = resolveAntigravityGemini3ProBackendModel(model, thinkingLevel);
  if (pro) {
    return { model: pro, thinkingLevel: pro.endsWith("-low") ? "low" : "high" };
  }
  return undefined;
}

export function getDefaultGemini3ThinkingLevel(model: string): string {
  const normalized = model.toLowerCase().replace(QUOTA_PREFIX_REGEX, "");
  const tiered = /^gemini-(?:3\.8-flash|4-argon)(?:-(low|medium|high))?$/.exec(normalized);
  if (tiered) {
    return tiered[1] ?? "high";
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
 * Quota routing: every model uses the Antigravity quota. Google deprecated the
 * Gemini CLI quota, so a model Antigravity no longer serves, with or without the
 * "antigravity-" prefix, becomes Gemini 3.8 Flash at the same tier.
 *
 * Examples:
 * - "gemini-3.8-flash" → { actualModel: "gemini-3.8-flash", quotaPreference: "antigravity" }
 * - "gemini-3-pro-preview" → { actualModel: "gemini-3.8-flash" }
 * - "antigravity-gemini-4-argon-high" → { actualModel: "gemini-4-argon-high", explicitQuota: true }
 *
 * @param requestedModel - The model name from the request
 * @returns Resolved model with thinking configuration
 */
export function resolveModelWithTier(requestedModel: string): ResolvedModel {
  return resolveModel(requestedModel, true);
}

/**
 * `onAntigravity` false is the public Gemini API (API-key) path, which still
 * serves models Antigravity retired (gemini-3-flash-preview, ...) under their
 * own names: only the models Google dropped everywhere are remapped there.
 */
function resolveModel(requestedModel: string, onAntigravity: boolean): ResolvedModel {
  const isAntigravity = QUOTA_PREFIX_REGEX.test(requestedModel);
  const strippedModel = requestedModel.replace(QUOTA_PREFIX_REGEX, "");
  const withoutDropped = remapDroppedGeminiModel(strippedModel);
  const modelWithoutQuota = onAntigravity || isAntigravity
    ? remapRetiredAntigravityGeminiModel(withoutDropped)
    : withoutDropped;

  const tier = extractThinkingTierFromModel(modelWithoutQuota);
  const baseName = tier
    ? modelWithoutQuota.replace(TIER_REGEX, "")
    : modelWithoutQuota;

  const isImageModel = IMAGE_GENERATION_MODELS.test(modelWithoutQuota);
  const quotaPreference = "antigravity" as const;
  const explicitQuota = isAntigravity || isImageModel;

  const isGemini3 = isGemini3OrLaterModel(modelWithoutQuota);
  const skipAlias = isAntigravity && isGemini3;

  // Antigravity API: Gemini 3.1 Pro, 3.8 Flash and 4 Argon take tier-specific backend ids
  //                  (see the resolveAntigravityGemini*BackendModel helpers);
  //                  other gemini-3-flash models use bare name + thinkingLevel param.
  // Pro defaults to the high tier unless an explicit tier is provided.
  const isGemini3Flash = isGemini3FlashModel(modelWithoutQuota);

  let effectiveTier = tier;
  let antigravityModel = modelWithoutQuota;
  if (skipAlias) {
    const tieredBackendModel =
      resolveAntigravityGemini38FlashBackendModel(modelWithoutQuota, tier) ??
      resolveAntigravityGemini4ArgonBackendModel(modelWithoutQuota, tier);
    const gemini3ProBackendModel = isImageModel
      ? undefined
      : resolveAntigravityGemini3ProBackendModel(modelWithoutQuota, effectiveTier);
    if (tieredBackendModel) {
      antigravityModel = tieredBackendModel;
      if (String(effectiveTier) === "minimal") {
        effectiveTier = "low";
      }
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

  // Check if this is a Gemini 3 or later model (works for both aliased and skipAlias paths)
  const isEffectiveGemini3 = isGemini3OrLaterModel(resolvedModel);
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

/**
 * Resolves the model id to send for a route: Antigravity (OAuth), or the public
 * Gemini API through an API key (`agy-sdk`).
 */
export function resolveModelForHeaderStyle(
  requestedModel: string,
  headerStyle: "antigravity" | "agy-sdk",
): ResolvedModel {
  const aliasResolvedModel = MODEL_ALIASES[requestedModel];
  // The tier aliases only strip the tier, which every branch below does itself
  // while keeping it: in the backend id on Antigravity, as the thinking level on
  // the API-key path.
  const keepsTier = TIER_REGEX.test(requestedModel);
  if (aliasResolvedModel && !keepsTier) {
    return resolveModelForHeaderStyle(aliasResolvedModel, headerStyle);
  }

  const isGemini3 = isGemini3OrLaterModel(requestedModel);

  if (headerStyle === "agy-sdk") {
    const modelWithTier = remapDroppedGeminiModel(requestedModel.replace(/^antigravity-/i, ""));
    const stripped = modelWithTier.replace(/-(minimal|low|medium|high)$/i, "");
    // Translate Antigravity-only ids (e.g. `gemini-3.1-pro`) to the public Gemini
    // API equivalent (`gemini-3.1-pro-preview`). Falls back to the bare stripped
    // name when no translation exists (covers `gemini-3.8-flash`, etc.).
    const transformedModel =
      mapAntigravityModelToPublicApi(stripped) ?? stripped;
    return {
      ...resolveModel(modelWithTier, false),
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
  const isGemini3 = isGemini3OrLaterModel(base.actualModel);

  if (isGemini3) {
    const level = budgetToGemini3Level(budget);
    // On Antigravity the tier is part of the backend id, so it follows the level.
    const backend = base.quotaPreference === "antigravity"
      ? resolveAntigravityGeminiBackend(base.actualModel, level)
      : undefined;

    return {
      ...base,
      actualModel: backend?.model ?? base.actualModel,
      thinkingLevel: backend?.thinkingLevel ?? level,
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
