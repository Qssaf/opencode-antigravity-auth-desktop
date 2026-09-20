import { describe, expect, it } from "vitest";
import {
  catalogFromDefinitions,
  legacyVariantsToV2,
  mergeCatalog,
  migrateModelSettings,
  toV2Model,
  translateVariantSettings,
} from "./models";
import type { ModelInfo } from "./types";

describe("translateVariantSettings", () => {
  it("moves thinkingLevel into thinkingConfig", () => {
    expect(translateVariantSettings({ thinkingLevel: "high" })).toEqual({
      thinkingConfig: { thinkingLevel: "high" },
    });
  });

  it("moves thinkingBudget into thinkingConfig", () => {
    expect(translateVariantSettings({ thinkingBudget: 8192 })).toEqual({
      thinkingConfig: { thinkingBudget: 8192 },
    });
  });

  it("keeps an explicit thinkingConfig value over the legacy key", () => {
    expect(
      translateVariantSettings({ thinkingLevel: "low", thinkingConfig: { thinkingLevel: "high" } }),
    ).toEqual({ thinkingConfig: { thinkingLevel: "high" } });
  });

  it("merges legacy keys into a partial thinkingConfig", () => {
    expect(
      translateVariantSettings({ thinkingBudget: 4096, thinkingConfig: { includeThoughts: true } }),
    ).toEqual({ thinkingConfig: { includeThoughts: true, thinkingBudget: 4096 } });
  });

  it("passes unrelated settings through untouched", () => {
    expect(translateVariantSettings({ temperature: 0.2 })).toEqual({ temperature: 0.2 });
  });

  it("adds no thinkingConfig when there is nothing to translate", () => {
    expect(translateVariantSettings({})).toEqual({});
  });
});

describe("legacyVariantsToV2", () => {
  it("converts a variants record into id/settings entries", () => {
    expect(legacyVariantsToV2({ low: { thinkingLevel: "low" }, high: { thinkingLevel: "high" } })).toEqual([
      { id: "low", settings: { thinkingConfig: { thinkingLevel: "low" } } },
      { id: "high", settings: { thinkingConfig: { thinkingLevel: "high" } } },
    ]);
  });

  it("returns an empty list for a missing or malformed record", () => {
    expect(legacyVariantsToV2(undefined)).toEqual([]);
    expect(legacyVariantsToV2("nope")).toEqual([]);
    expect(legacyVariantsToV2({ low: "nope" })).toEqual([]);
  });
});

describe("toV2Model", () => {
  it("builds a model from a 1.x definition", () => {
    const model = toV2Model("google", "antigravity-gemini-3-pro", {
      name: "Gemini 3 Pro (Antigravity)",
      limit: { context: 1048576, output: 65535 },
      modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      variants: { high: { thinkingLevel: "high" } },
    });

    expect(model).toMatchObject({
      id: "antigravity-gemini-3-pro",
      modelID: "antigravity-gemini-3-pro",
      providerID: "google",
      name: "Gemini 3 Pro (Antigravity)",
      capabilities: { tools: true, input: ["text", "image", "pdf"], output: ["text"] },
      variants: [{ id: "high", settings: { thinkingConfig: { thinkingLevel: "high" } } }],
      status: "active",
      enabled: true,
      limit: { context: 1048576, output: 65535 },
    });
    expect(model.cost).toEqual([{ input: 0, output: 0, cache: { read: 0, write: 0 } }]);
  });

  it("falls back to defaults for missing fields", () => {
    const model = toV2Model("google", "mystery-model", {});
    expect(model.name).toBe("mystery-model");
    expect(model.capabilities.input).toEqual(["text", "image", "pdf"]);
    expect(model.limit.context).toBeGreaterThan(0);
    expect(model.limit.output).toBeGreaterThan(0);
    expect(model.variants).toEqual([]);
  });

  it("omits an input limit that was not provided", () => {
    expect(toV2Model("google", "m", { limit: { context: 10, output: 5 } }).limit).not.toHaveProperty("input");
  });

  it("honours tool_call: false", () => {
    expect(toV2Model("google", "m", { tool_call: false }).capabilities.tools).toBe(false);
  });
});

function model(overrides: Partial<ModelInfo> = {}): ModelInfo {
  return { ...toV2Model("google", "m", {}), ...overrides };
}

describe("migrateModelSettings", () => {
  it("rewrites legacy thinking keys on variants", () => {
    const migrated = migrateModelSettings(
      model({ variants: [{ id: "high", settings: { thinkingLevel: "high" } }] }),
    );
    expect(migrated.variants[0]?.settings).toEqual({ thinkingConfig: { thinkingLevel: "high" } });
  });

  it("rewrites legacy thinking keys on model settings", () => {
    const migrated = migrateModelSettings(model({ settings: { thinkingBudget: 1024 } }));
    expect(migrated.settings).toEqual({ thinkingConfig: { thinkingBudget: 1024 } });
  });

  it("returns the same object when nothing needs migrating", () => {
    const input = model({ variants: [{ id: "high", settings: { thinkingConfig: { thinkingLevel: "high" } } }] });
    expect(migrateModelSettings(input)).toBe(input);
  });
});

describe("mergeCatalog", () => {
  it("adds models the provider does not have", () => {
    const catalog = catalogFromDefinitions("google", { "antigravity-gemini-3-pro": { name: "Pro" } });
    const merged = mergeCatalog(new Map(), catalog);
    expect(merged?.map((m) => m.id)).toEqual(["antigravity-gemini-3-pro"]);
  });

  it("keeps the existing model when the provider already has that id", () => {
    const existing = new Map([["m", model({ name: "User configured" })]]);
    const catalog = new Map([["m", model({ name: "Plugin default" })], ["n", model({ id: "n" })]]);
    const merged = mergeCatalog(existing, catalog);
    expect(merged?.find((m) => m.id === "m")?.name).toBe("User configured");
    expect(merged?.map((m) => m.id)).toContain("n");
  });

  it("migrates legacy thinking keys on existing models", () => {
    const existing = new Map([["m", model({ variants: [{ id: "low", settings: { thinkingLevel: "low" } }] })]]);
    const merged = mergeCatalog(existing, new Map());
    expect(merged?.[0]?.variants[0]?.settings).toEqual({ thinkingConfig: { thinkingLevel: "low" } });
  });

  it("returns undefined when the provider already matches", () => {
    const existing = new Map([["m", model()]]);
    expect(mergeCatalog(existing, new Map([["m", model({ name: "other" })]]))).toBeUndefined();
  });
});
