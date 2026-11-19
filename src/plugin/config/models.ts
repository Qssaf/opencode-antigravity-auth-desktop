import type { ProviderModel } from "../types";
import {
  isGemini2Model,
  isGemini3OrLaterModel,
  isGemini4HydrogenModel,
  isGemini4NeonModel,
  remapRetiredAntigravityGeminiModel,
  toAntigravityWireModel,
} from "../transform/model-resolver";

export type ModelThinkingLevel = "minimal" | "low" | "medium" | "high" | "xhigh";

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
}

export type AntigravityAvailableModels = Record<string, AntigravityAvailableModel>;

const DEFAULT_MODALITIES: ModelModalities = {
  input: ["text", "image", "pdf"],
  output: ["text"],
};

/**
 * Gemini 4 Hydrogen and Neon variants. One shared, frozen object so the static
 * definitions and discovered ids cannot drift apart or mutate each other.
 */
const GEMINI_4_XHIGH_VARIANTS: Record<string, ModelVariant> = Object.freeze({
  low: { thinkingLevel: "low" },
  medium: { thinkingLevel: "medium" },
  high: { thinkingLevel: "high" },
  xhigh: { thinkingLevel: "xhigh" },
});

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
  // Paid Google AI Pro or Ultra, like Argon. Antigravity serves it as
  // gemini-4-hydrogen-{low,medium,high,xhigh} (see
  // resolveAntigravityGemini4HydrogenBackendModel), with a 1M context.
  "antigravity-gemini-4-hydrogen": {
    name: "Gemini 4 Hydrogen (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: GEMINI_4_XHIGH_VARIANTS,
  },
  // Same paid Pro or Ultra entitlement as Hydrogen. Antigravity serves it as
  // gemini-4-neon-{low,medium,high,xhigh} (see
  // resolveAntigravityGemini4NeonBackendModel) with the 256K output Google
  // reports for it.
  "antigravity-gemini-4-neon": {
    name: "Gemini 4 Neon (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 262144 },
    modalities: DEFAULT_MODALITIES,
    variants: GEMINI_4_XHIGH_VARIANTS,
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
  if (isGemini4HydrogenModel(normalized) || isGemini4NeonModel(normalized)) {
    return GEMINI_4_XHIGH_VARIANTS;
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

export function modelsFromAntigravityAvailableModels(
  models: AntigravityAvailableModels,
): OpencodeModelDefinitions {
  const definitions: OpencodeModelDefinitions = {};

  for (const [sourceId, entry] of Object.entries(models)) {
    // Unlabeled entries are tab-completion, internal chat and "-tiered" routing
    // ids, not models the Antigravity IDE offers for chat.
    if (!entry.displayName) continue;
    const modelId = antigravityModelIdFromEntry(sourceId, entry);
    if (!modelId) continue;
    // Retired and renamed ids are served under their successor's catalog entry.
    const backendId = modelId.replace(/^antigravity-/, "");
    if (
      isGemini2Model(backendId) ||
      remapRetiredAntigravityGeminiModel(backendId) !== backendId ||
      toAntigravityWireModel(backendId) !== backendId
    ) {
      continue;
    }

    const variants = defaultVariantsForModel(modelId);
    const discovered: OpencodeModelDefinition = {
      name: entry.displayName ? `${entry.displayName} (Antigravity)` : `${titleFromModelId(modelId)} (Antigravity)`,
      limit: defaultLimitForModel(modelId),
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
