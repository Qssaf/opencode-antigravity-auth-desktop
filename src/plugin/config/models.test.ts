import { describe, expect, it } from "vitest";

import {
  OPENCODE_MODEL_DEFINITIONS,
  modelsFromAntigravityAvailableModels,
  modelsFromGeminiApi,
} from "./models";

const getModel = (name: string) => {
  const model = OPENCODE_MODEL_DEFINITIONS[name];
  if (!model) {
    throw new Error(`Missing model definition for ${name}`);
  }
  return model;
};

describe("OPENCODE_MODEL_DEFINITIONS", () => {
  it("includes the full set of configured models", () => {
    const modelNames = Object.keys(OPENCODE_MODEL_DEFINITIONS).sort();

    expect(modelNames).toEqual([
      "antigravity-gemini-3.8-flash",
      "antigravity-gemini-4-argon",
    ]);
  });

  it("defines Gemini 3 variants for Antigravity models", () => {
    expect(getModel("antigravity-gemini-3.8-flash").variants).toEqual({
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    });
    expect(getModel("antigravity-gemini-3.8-flash").temperature).toBe(false);
  });

  it("offers Gemini 4 Argon with low, medium and high thinking and no temperature", () => {
    const argon = getModel("antigravity-gemini-4-argon");
    expect(argon.variants).toEqual({
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    });
    expect(argon.temperature).toBe(false);
    expect(argon.name).toContain("Ultra");
  });
});

describe("dynamic model discovery helpers", () => {
  it("converts Gemini models.list metadata into OpenCode models", () => {
    const models = modelsFromGeminiApi([
      {
        name: "models/gemini-3.9-flash",
        displayName: "Gemini 3.9 Flash",
        inputTokenLimit: 1000,
        outputTokenLimit: 2000,
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/text-embedding-004",
        displayName: "Text Embedding 004",
        supportedGenerationMethods: ["embedContent"],
      },
    ]);

    // Gemini 2 is no longer offered.
    expect(models["gemini-2.5-flash"]).toBeUndefined();
    expect(models["gemini-3.9-flash"]).toMatchObject({
      name: "Gemini 3.9 Flash (Gemini API)",
      limit: { context: 1000, output: 2000 },
      modalities: { input: ["text", "image", "pdf"], output: ["text"] },
    });
    expect(models["text-embedding-004"]).toBeUndefined();
  });

  it("keeps Gemini models.list resource names distinct from shared base aliases", () => {
    const models = modelsFromGeminiApi([
      {
        name: "models/gemini-3.9-flash-001",
        baseModelId: "gemini-3.9-flash",
        displayName: "Gemini 3.9 Flash 001",
        inputTokenLimit: 1000,
        outputTokenLimit: 2000,
        supportedGenerationMethods: ["generateContent"],
      },
      {
        name: "models/gemini-3.9-flash-002",
        baseModelId: "gemini-3.9-flash",
        displayName: "Gemini 3.9 Flash 002",
        inputTokenLimit: 3000,
        outputTokenLimit: 4000,
        supportedGenerationMethods: ["generateContent"],
      },
    ]);

    expect(models["gemini-3.9-flash-001"]?.limit).toEqual({ context: 1000, output: 2000 });
    expect(models["gemini-3.9-flash-002"]?.limit).toEqual({ context: 3000, output: 4000 });
  });

  it("converts Antigravity available models while preserving curated variants and inferring dynamic ones", () => {
    const models = modelsFromAntigravityAvailableModels({
      "gemini-3-flash": {
        displayName: "Gemini 3 Flash",
        modelName: "gemini-3-flash",
      },
      "gemini-3.6-flash": {
        displayName: "Gemini 3.6 Flash",
        modelName: "gemini-3.6-flash",
      },
      "gemini-3.7-flash": {
        displayName: "Gemini 3.7 Flash",
        modelName: "gemini-3.7-flash",
      },
      "gemini-3.8-flash": {
        displayName: "Gemini 3.8 Flash Preview",
        modelName: "gemini-3.8-flash",
      },
      "gemini-3.8-pro": {
        displayName: "Gemini 3.8 Pro Preview",
        modelName: "gemini-3.8-pro",
      },
      "claude-sonnet-4-6": {
        displayName: "Claude Sonnet 4.6",
      },
    });

    // Models Antigravity no longer serves are left out even when the registry still lists them.
    expect(models["antigravity-gemini-3-flash"]).toBeUndefined();
    expect(models["antigravity-gemini-3.6-flash"]).toBeUndefined();
    expect(models["antigravity-gemini-3.7-flash"]).toBeUndefined();
    expect(models["antigravity-gemini-3.8-flash"]?.variants).toEqual({
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    });
    // Inferred variants for dynamically discovered models not in static table
    expect(models["antigravity-gemini-3.8-pro"]?.variants).toEqual({
      low: { thinkingLevel: "low" },
      high: { thinkingLevel: "high" },
    });
    expect(models["antigravity-claude-sonnet-4-6"]).toMatchObject({
      name: "Claude Sonnet 4.6 (Antigravity)",
      limit: { context: 200000, output: 64000 },
    });
  });
});
