/**
 * Model catalog for OpenCode 2.x.
 *
 * The plugin's model definitions use the OpenCode 1.x config shape
 * (`limit`, `modalities`, `variants: { low: { thinkingLevel: "low" } }`).
 * OpenCode 2.x models are `Model.Info` records whose variants are
 * `{ id, settings }` entries, and the native Gemini protocol reads thinking
 * options from `settings.thinkingConfig`, not from a top-level
 * `settings.thinkingLevel`. Both conversions live here.
 */

import type { ProviderModel } from "../plugin/types";
import type { ModelCost, ModelInfo, ModelVariant } from "./types";

const DEFAULT_INPUT_MODALITIES = ["text", "image", "pdf"] as const;
const DEFAULT_OUTPUT_MODALITIES = ["text"] as const;
const DEFAULT_CONTEXT_LIMIT = 1_048_576;
const DEFAULT_OUTPUT_LIMIT = 65_536;

/** Antigravity usage is not billed per token; shown as free, as the 1.x plugin did. */
const FREE_COST: readonly ModelCost[] = [{ input: 0, output: 0, cache: { read: 0, write: 0 } }];

function isFree(cost: readonly ModelCost[] | undefined): boolean {
  return (cost ?? []).every(
    (entry) => entry.input === 0 && entry.output === 0 && entry.cache.read === 0 && entry.cache.write === 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function stringList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const items = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return items.length > 0 ? items : [...fallback];
}

/**
 * True when `settings` uses the OpenCode 1.x thinking keys, which the native
 * Gemini protocol ignores.
 */
function hasLegacyThinkingKeys(settings: Readonly<Record<string, unknown>>): boolean {
  return "thinkingLevel" in settings || "thinkingBudget" in settings;
}

/**
 * Moves top-level `thinkingLevel` / `thinkingBudget` into `thinkingConfig`,
 * the shape the native Gemini protocol turns into `generationConfig`.
 * An explicit `thinkingConfig` value wins over the legacy keys.
 */
export function translateVariantSettings(
  settings: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const { thinkingLevel, thinkingBudget, thinkingConfig, ...rest } = settings;
  const config: Record<string, unknown> = isRecord(thinkingConfig) ? { ...thinkingConfig } : {};
  if (typeof thinkingLevel === "string" && config.thinkingLevel === undefined) {
    config.thinkingLevel = thinkingLevel;
  }
  if (typeof thinkingBudget === "number" && config.thinkingBudget === undefined) {
    config.thinkingBudget = thinkingBudget;
  }
  return Object.keys(config).length > 0 ? { ...rest, thinkingConfig: config } : rest;
}

/** Converts a 1.x `variants` record into 2.x variant entries. */
export function legacyVariantsToV2(variants: unknown): ModelVariant[] {
  if (!isRecord(variants)) return [];
  const converted: ModelVariant[] = [];
  for (const [id, value] of Object.entries(variants)) {
    if (!id || !isRecord(value)) continue;
    converted.push({ id, settings: translateVariantSettings(value) });
  }
  return converted;
}

/** Builds a 2.x model from a plugin (1.x config shaped) model definition. */
export function toV2Model(providerID: string, id: string, definition: ProviderModel): ModelInfo {
  const limit = isRecord(definition.limit) ? definition.limit : {};
  const modalities = isRecord(definition.modalities) ? definition.modalities : {};
  const name = typeof definition.name === "string" && definition.name.length > 0 ? definition.name : id;

  return {
    id,
    modelID: id,
    providerID,
    name,
    capabilities: {
      tools: definition.tool_call !== false,
      input: stringList(modalities.input, DEFAULT_INPUT_MODALITIES),
      output: stringList(modalities.output, DEFAULT_OUTPUT_MODALITIES),
    },
    variants: legacyVariantsToV2(definition.variants),
    time: { released: 0 },
    cost: FREE_COST,
    status: "active",
    enabled: true,
    limit: {
      context: positiveInt(limit.context, DEFAULT_CONTEXT_LIMIT),
      ...(typeof limit.input === "number" && limit.input > 0 ? { input: limit.input } : {}),
      output: positiveInt(limit.output, DEFAULT_OUTPUT_LIMIT),
    },
  };
}

/**
 * Rewrites 1.x thinking keys in an existing model (typically one the user
 * configured in an OpenCode 1.x style config, which 2.x normalizes to
 * `settings.thinkingLevel`). Returns the same object when nothing changes.
 */
export function migrateModelSettings(model: ModelInfo): ModelInfo {
  let changed = false;

  const variants = model.variants.map((variant) => {
    if (!variant.settings || !hasLegacyThinkingKeys(variant.settings)) return variant;
    changed = true;
    return { ...variant, settings: translateVariantSettings(variant.settings) };
  });

  let settings = model.settings;
  if (settings && hasLegacyThinkingKeys(settings)) {
    changed = true;
    settings = translateVariantSettings(settings);
  }

  return changed ? { ...model, variants, ...(settings ? { settings } : {}) } : model;
}

export function catalogFromDefinitions(
  providerID: string,
  definitions: Readonly<Record<string, ProviderModel>>,
): Map<string, ModelInfo> {
  const catalog = new Map<string, ModelInfo>();
  for (const [id, definition] of Object.entries(definitions)) {
    catalog.set(id, toV2Model(providerID, id, definition));
  }
  return catalog;
}

export interface MergeCatalogOptions {
  /**
   * Requests are served by the Antigravity account pool, so the provider's own
   * models (priced from the public Gemini API) are shown as free too.
   */
  free?: boolean;
}

/**
 * Adds catalog models the provider does not have yet and migrates legacy
 * thinking keys on models it does have. Existing models keep every other
 * field (apart from their price when `free`), so user configuration always
 * wins over the plugin defaults.
 *
 * Returns `undefined` when the provider already matches, so callers can skip
 * rewriting the provider's model inventory.
 */
export function mergeCatalog(
  existing: ReadonlyMap<string, ModelInfo>,
  catalog: ReadonlyMap<string, ModelInfo>,
  options: MergeCatalogOptions = {},
): ModelInfo[] | undefined {
  const merged = new Map<string, ModelInfo>();
  let changed = false;

  for (const [id, model] of existing) {
    let next = migrateModelSettings(model);
    if (options.free && !isFree(next.cost)) {
      next = { ...next, cost: FREE_COST };
    }
    if (next !== model) changed = true;
    merged.set(id, next);
  }

  for (const [id, model] of catalog) {
    if (merged.has(id)) continue;
    merged.set(id, model);
    changed = true;
  }

  return changed ? [...merged.values()] : undefined;
}
