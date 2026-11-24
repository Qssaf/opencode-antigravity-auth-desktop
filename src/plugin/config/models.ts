import type { ProviderModel } from "../types";
import {
  isGemini2Model,
  isGemini3OrLaterModel,
  remapRetiredAntigravityGeminiModel,
  toAntigravityWireModel,
} from "../transform/model-resolver";

export type ModelThinkingLevel = "minimal" | "low" | "medium" | "high";

export interface ModelThinkingConfig {
  thinkingBudget: number;
}

export interface ModelVariant {
  thinkingLevel?: ModelThinkingLevel;
  thinkingConfig?: ModelThinkingConfig;
}

export interface ModelLimit {
  context: number;
  output: number;
}

export type ModelModality = "text" | "image" | "pdf";

export interface ModelModalities {
  input: ModelModality[];
  output: ModelModality[];
}

export interface OpencodeModelDefinition extends ProviderModel {
  name: string;
  temperature?: boolean;
  limit: ModelLimit;
  modalities: ModelModalities;
  variants?: Record<string, ModelVariant>;
}

export type OpencodeModelDefinitions = Record<string, OpencodeModelDefinition>;

export interface GeminiApiModel {
  name?: string;
  baseModelId?: string;
  displayName?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

export interface AntigravityAvailableModel {
  displayName?: string;
  modelName?: string;
  /** Listed but not served to this account (a paid-plan model on a free one). */
  disabled?: boolean;
  supportsThinking?: boolean;
  /** Context window Google reports for this backend id. */
  maxTokens?: number;
  /** Output limit Google reports for this backend id. */
  maxOutputTokens?: number;
}

export type AntigravityAvailableModels = Record<string, AntigravityAvailableModel>;

/**
 * A family Google groups its tier-specific ids under
 * (`claude-opus-5-5` covering `claude-opus-5-5-{low,medium,high}`), so discovery
 * can offer one OpenCode model per family instead of one per tier.
 */
export interface AntigravityGroupedModel {
  displayName?: string;
  supportedThinkingLevels?: Array<{
    thinkingSuffix?: string;
    thinkingDisplayName?: string;
  }>;
}

export type AntigravityGroupedModels = Record<string, AntigravityGroupedModel>;

const DEFAULT_MODALITIES: ModelModalities = {
  input: ["text", "image", "pdf"],
  output: ["text"],
};

export const OPENCODE_MODEL_DEFINITIONS: OpencodeModelDefinitions = {
  "antigravity-gemini-3.8-flash": {
    name: "Gemini 3.8 Flash (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    },
  },
  // Google AI Ultra and paid (non-trial) Google AI Pro only. Antigravity serves
  // it as gemini-4-argon-{low,medium,high} (see
  // resolveAntigravityGemini4ArgonBackendModel), with a 1M context like the API.
  "antigravity-gemini-4-argon": {
    name: "Gemini 4 Argon (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    },
  },
};

/**
 * Chat models Antigravity serves under an id it leaves unlabeled, offered only
 * when an account's `fetchAvailableModels` lists them. Gemini 4 Hydrogen Sonar
 * is served to free accounts (with quota) while the labeled Gemini 4 Hydrogen
 * is disabled there (seen 2026-11-20); it takes low, medium and high thinking.
 */
const UNLABELED_ANTIGRAVITY_MODELS: Readonly<Record<string, OpencodeModelDefinition>> = {
  "gemini-4-hydrogen-sonar": {
    name: "Gemini 4 Hydrogen Sonar (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    },
  },
};

function modelIdFromGeminiName(name: string | undefined): string | null {
  if (!name) return null;
  const id = name.replace(/^models\//, "").trim();
  return id || null;
}

function supportsGeminiGeneration(model: GeminiApiModel): boolean {
  const methods = model.supportedGenerationMethods ?? [];
  return methods.includes("generateContent") || methods.includes("streamGenerateContent");
}

function titleFromModelId(modelId: string): string {
  return modelId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Appends the Antigravity suffix, dropping a trailing parenthetical Google
 * already used for the thinking tier ("GPT-OSS 120B (Medium)") so the name does
 * not stack two of them.
 */
function antigravityDisplayName(displayName: string | undefined, modelId: string): string {
  const fallback = titleFromModelId(modelId);
  const base = (displayName ?? fallback).replace(/\s*\([^()]*\)\s*$/, "").trim();
  return `${base || fallback} (Antigravity)`;
}

function defaultLimitForModel(modelId: string): ModelLimit {
  if (modelId.includes("claude")) {
    return { context: 200000, output: 64000 };
  }
  return { context: 1048576, output: 65536 };
}

function defaultVariantsForModel(modelId: string): Record<string, ModelVariant> | undefined {
  const normalized = modelId.toLowerCase().replace(/^antigravity-/, "");
  if (normalized.includes("claude") && normalized.includes("thinking")) {
    return {
      low: { thinkingConfig: { thinkingBudget: 8192 } },
      max: { thinkingConfig: { thinkingBudget: 32768 } },
    };
  }
  if (isGemini3OrLaterModel(normalized)) {
    if (normalized.includes("pro")) {
      return {
        low: { thinkingLevel: "low" },
        high: { thinkingLevel: "high" },
      };
    }
    if (normalized.includes("flash")) {
      return {
        minimal: { thinkingLevel: "minimal" },
        low: { thinkingLevel: "low" },
        medium: { thinkingLevel: "medium" },
        high: { thinkingLevel: "high" },
      };
    }
  }
  return undefined;
}

function mergeWithStaticDefinition(
  modelId: string,
  discovered: OpencodeModelDefinition,
): OpencodeModelDefinition {
  const existing = OPENCODE_MODEL_DEFINITIONS[modelId];
  if (!existing) return discovered;

  return {
    ...existing,
    ...discovered,
    // Curated limits win, so a registry entry cannot shrink a curated model's
    // context.
    limit: existing.limit,
    modalities: discovered.modalities ?? existing.modalities,
    variants: existing.variants ?? discovered.variants,
  };
}

function antigravityModelIdFromEntry(sourceId: string, entry: AntigravityAvailableModel): string | null {
  const rawId = (entry.modelName || sourceId).trim();
  if (!rawId) return null;
  const modelId = rawId.replace(/^models\//, "");
  return modelId.startsWith("antigravity-") ? modelId : `antigravity-${modelId}`;
}

export function modelsFromGeminiApi(models: GeminiApiModel[]): OpencodeModelDefinitions {
  const definitions: OpencodeModelDefinitions = {};

  for (const model of models) {
    if (!supportsGeminiGeneration(model)) continue;
    const modelId = modelIdFromGeminiName(model.name) || model.baseModelId;
    // Gemini 2 is no longer offered.
    if (!modelId || isGemini2Model(modelId)) continue;

    const variants = defaultVariantsForModel(modelId);
    const discovered: OpencodeModelDefinition = {
      name: model.displayName ? `${model.displayName} (Gemini API)` : `${titleFromModelId(modelId)} (Gemini API)`,
      limit: {
        context: model.inputTokenLimit ?? defaultLimitForModel(modelId).context,
        output: model.outputTokenLimit ?? defaultLimitForModel(modelId).output,
      },
      modalities: DEFAULT_MODALITIES,
      ...(variants ? { variants } : {}),
    };
    definitions[modelId] = mergeWithStaticDefinition(modelId, discovered);
  }

  return definitions;
}

/** Backend ids Antigravity no longer serves under their own name. */
function isRetiredOrRenamedAntigravityModel(backendId: string): boolean {
  return (
    isGemini2Model(backendId) ||
    remapRetiredAntigravityGeminiModel(backendId) !== backendId ||
    toAntigravityWireModel(backendId) !== backendId
  );
}

/**
 * Thinking levels an OpenCode variant can carry. `xhigh` is accepted ahead of
 * the Gemini 4 Hydrogen variant type so a grouped family that declares it still
 * exposes the tier.
 */
function isModelThinkingLevel(value: string): value is ModelThinkingLevel {
  return (
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
  );
}

/**
 * Context/output limits from the registry, falling back to the family default
 * when Google sends none.
 */
function limitFromEntry(modelId: string, entry: AntigravityAvailableModel | undefined): ModelLimit {
  const fallback = defaultLimitForModel(modelId);
  return {
    context: entry?.maxTokens ?? fallback.context,
    output: entry?.maxOutputTokens ?? fallback.output,
  };
}

/**
 * Collapses one `groupedModels` family into a single OpenCode model whose
 * variants are its tier suffixes, returning the family's child backend ids so
 * the caller suppresses the `-low`/`-medium`/`-high` duplicates.
 */
function groupedModelDefinition(
  groupId: string,
  group: AntigravityGroupedModel,
  models: AntigravityAvailableModels,
): { definition: OpencodeModelDefinition; childIds: string[] } | undefined {
  const variants: Record<string, ModelVariant> = {};
  const childIds: string[] = [];
  let firstChild: AntigravityAvailableModel | undefined;

  for (const level of group.supportedThinkingLevels ?? []) {
    const suffix = level.thinkingSuffix?.trim().toLowerCase();
    if (!suffix) continue;
    const childId = `${groupId}-${suffix}`;
    const entry = models[childId];
    // A group is only offered when Google actually serves at least one child;
    // display-less ids are internal routing entries, as in the registry pass.
    if (!entry || !entry.displayName || entry.disabled || childId.endsWith("-disabled")) continue;
    if (isRetiredOrRenamedAntigravityModel(childId)) continue;
    childIds.push(childId);
    firstChild ??= entry;
    if (isModelThinkingLevel(suffix)) {
      variants[suffix] = { thinkingLevel: suffix };
    }
  }

  if (childIds.length === 0) return undefined;

  return {
    definition: {
      name: antigravityDisplayName(group.displayName, groupId),
      limit: limitFromEntry(`antigravity-${groupId}`, firstChild),
      modalities: DEFAULT_MODALITIES,
      ...(Object.keys(variants).length > 0 ? { variants } : {}),
    },
    childIds,
  };
}

export function modelsFromAntigravityAvailableModels(
  models: AntigravityAvailableModels,
  groupedModels?: AntigravityGroupedModels,
): OpencodeModelDefinitions {
  const definitions: OpencodeModelDefinitions = {};
  // Child ids of a collapsed family, plus the family id itself: OpenCode shows
  // one model per family, not one per thinking tier.
  const groupedIds = new Set<string>();

  for (const [groupId, group] of Object.entries(groupedModels ?? {})) {
    const collapsed = groupedModelDefinition(groupId, group, models);
    if (!collapsed) continue;
    definitions[`antigravity-${groupId}`] = mergeWithStaticDefinition(
      `antigravity-${groupId}`,
      collapsed.definition,
    );
    for (const childId of collapsed.childIds) groupedIds.add(childId);
    groupedIds.add(groupId);
  }

  for (const [sourceId, entry] of Object.entries(models)) {
    if (entry.disabled) continue;
    const unlabeled = UNLABELED_ANTIGRAVITY_MODELS[sourceId];
    if (unlabeled) {
      definitions[`antigravity-${sourceId}`] = unlabeled;
      continue;
    }
    // Other unlabeled entries are tab-completion, internal chat and "-tiered"
    // routing ids, not models the Antigravity IDE offers for chat.
    if (!entry.displayName) continue;
    const modelId = antigravityModelIdFromEntry(sourceId, entry);
    if (!modelId) continue;
    // Retired and renamed ids are served under their successor's catalog entry.
    const backendId = modelId.replace(/^antigravity-/, "");
    if (isRetiredOrRenamedAntigravityModel(backendId)) {
      continue;
    }
    if (groupedIds.has(backendId)) continue;

    const variants = entry.supportsThinking ? defaultVariantsForModel(modelId) : undefined;
    const discovered: OpencodeModelDefinition = {
      name: antigravityDisplayName(entry.displayName, modelId),
      limit: limitFromEntry(modelId, entry),
      modalities: DEFAULT_MODALITIES,
      ...(variants ? { variants } : {}),
    };
    definitions[modelId] = mergeWithStaticDefinition(modelId, discovered);
  }

  return definitions;
}

export function mergeModelDefinitions(...definitions: Record<string, ProviderModel>[]): Record<string, ProviderModel> {
  return Object.assign({}, ...definitions);
}
