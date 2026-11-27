/**
 * Live cache of the public Gemini API model catalog (`GET
 * generativelanguage.googleapis.com/v1beta/models`) and the Antigravity model
 * registry (`POST v1internal:fetchAvailableModels`), sourced from model discovery
 * and quota fetches.
 *
 * Routing decisions and dynamic model resolution use this live data to discover
 * new and updated models directly from Google's registries without requiring manual
 * plugin updates.
 */
import type { AntigravityAvailableModels, GeminiApiModel } from "./config/models";

const CATALOG_TTL_MS = 60 * 60 * 1000;

interface PublicModelCatalog {
  ids: ReadonlySet<string>;
  fetchedAt: number;
}

interface AntigravityModelCatalog {
  models: AntigravityAvailableModels;
  fetchedAt: number;
}

let catalog: PublicModelCatalog | undefined;
let antigravityCatalog: AntigravityModelCatalog | undefined;

function modelIdFromName(model: GeminiApiModel): string | null {
  const raw = (model.name ? model.name.replace(/^models\//, "") : model.baseModelId)?.trim();
  return raw || null;
}

/**
 * Records a freshly-fetched public Gemini API model list. Called as a side
 * effect of the existing model-discovery fetch — no extra network round trip.
 */
export function recordPublicGeminiApiModels(models: GeminiApiModel[]): void {
  const ids = new Set<string>();
  for (const model of models) {
    const id = modelIdFromName(model);
    if (id) ids.add(id.toLowerCase());
  }
  if (ids.size === 0) return;
  catalog = { ids, fetchedAt: Date.now() };
}

/**
 * Returns the live set of public Gemini API model ids, or `undefined` when no
 * catalog has been fetched yet (cold start) or the cached one is stale.
 * Callers should fall back to static heuristics in the `undefined` case.
 */
export function getPublicGeminiApiModelIds(): ReadonlySet<string> | undefined {
  if (!catalog) return undefined;
  if (Date.now() - catalog.fetchedAt > CATALOG_TTL_MS) return undefined;
  return catalog.ids;
}

/**
 * Records available models from the Antigravity model registry (`fetchAvailableModels`).
 * Called as a side effect of quota checks and model discovery.
 */
export function recordAntigravityAvailableModels(models: AntigravityAvailableModels): void {
  if (!models || Object.keys(models).length === 0) return;
  antigravityCatalog = {
    models: { ...models },
    fetchedAt: Date.now(),
  };
}

/**
 * Returns the cached Antigravity available models, or `undefined` when no catalog
 * has been fetched yet or the cached one is stale.
 */
export function getCachedAntigravityAvailableModels(): AntigravityAvailableModels | undefined {
  if (!antigravityCatalog) return undefined;
  if (Date.now() - antigravityCatalog.fetchedAt > CATALOG_TTL_MS) return undefined;
  return antigravityCatalog.models;
}

/**
 * The enum name Google's model list gives a wire model id (`MODEL_PLACEHOLDER_M528`).
 * Read from the last list fetched however old: an id does not expire with the cache.
 */
export function getAntigravityModelEnum(wireModel: string): string | undefined {
  const model = antigravityCatalog?.models[wireModel]?.model;
  return typeof model === "string" && model.length > 0 ? model : undefined;
}

export function resetPublicGeminiApiModelCatalogForTests(): void {
  catalog = undefined;
}

export function resetAntigravityModelCatalogForTests(): void {
  antigravityCatalog = undefined;
}

export function resetModelCatalogsForTests(): void {
  catalog = undefined;
  antigravityCatalog = undefined;
}
