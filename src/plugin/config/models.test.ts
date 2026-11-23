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
    // Paid Pro accounts get it too, so the name no longer says Ultra.
    expect(argon.name).toBe("Gemini 4 Argon (Antigravity)");
    expect(argon.limit).toEqual({ context: 1048576, output: 65536 });
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
        supportsThinking: true,
      },
      "gemini-3.8-pro": {
        displayName: "Gemini 3.8 Pro Preview",
        modelName: "gemini-3.8-pro",
        supportsThinking: true,
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
    expect(models["antigravity-gemini-3.8-flash"]?.limit).toEqual({ context: 1048576, output: 65536 });
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

  it("leaves out models Google marks disabled for the account", () => {
    const models = modelsFromAntigravityAvailableModels({
      "gemini-4-hydrogen-disabled": { displayName: "Gemini 4 Hydrogen", disabled: true },
      "gemini-3.9-flash": { displayName: "Gemini 3.9 Flash" },
    });

    expect(Object.keys(models)).toEqual(["antigravity-gemini-3.9-flash"]);
  });

  it("offers Gemini 4 Hydrogen Sonar when an account is served it, though Google leaves it unlabeled", () => {
    const models = modelsFromAntigravityAvailableModels({
      "gemini-4-hydrogen-sonar": {},
      "gemini-3.8-flash-tiered": {},
      tab_flash_lite_preview: {},
    });

    expect(Object.keys(models)).toEqual(["antigravity-gemini-4-hydrogen-sonar"]);
    expect(models["antigravity-gemini-4-hydrogen-sonar"]).toMatchObject({
      name: "Gemini 4 Hydrogen Sonar (Antigravity)",
      limit: { context: 1048576, output: 65536 },
      variants: {
        low: { thinkingLevel: "low" },
        medium: { thinkingLevel: "medium" },
        high: { thinkingLevel: "high" },
      },
    });
  });

  it("gives thinking variants only to models Google says think", () => {
    const models = modelsFromAntigravityAvailableModels({
      "gemini-3.1-flash-image": { displayName: "Gemini 3.1 Flash Image" },
      "gemini-3.9-flash": { displayName: "Gemini 3.9 Flash", supportsThinking: true },
    });

    expect(Object.keys(models)).toEqual(["antigravity-gemini-3.1-flash-image", "antigravity-gemini-3.9-flash"]);
    expect(models["antigravity-gemini-3.1-flash-image"]?.variants).toBeUndefined();
    expect(Object.keys(models["antigravity-gemini-3.9-flash"]?.variants ?? {})).toEqual(["minimal", "low", "medium", "high"]);
  });

  it("honours the registry's token limits for an ungrouped model", () => {
    const models = modelsFromAntigravityAvailableModels({
      "gpt-oss-120b-medium": {
        displayName: "GPT-OSS 120B (Medium)",
        maxTokens: 131072,
        maxOutputTokens: 32768,
        supportsThinking: true,
        modelProvider: "MODEL_PROVIDER_OPENAI",
      },
    });

    expect(models["antigravity-gpt-oss-120b-medium"]).toMatchObject({
      name: "GPT-OSS 120B (Medium) (Antigravity)",
      limit: { context: 131072, output: 32768 },
    });
  });
});

describe("grouped model discovery", () => {
  const claudeChildren = {
    "claude-opus-5-5-low": {
      displayName: "Claude Opus 5.5 (Low)",
      maxTokens: 1000000,
      maxOutputTokens: 128000,
      supportsThinking: true,
      supportsAdaptiveThinking: true,
    },
    "claude-opus-5-5-medium": {
      displayName: "Claude Opus 5.5 (Medium)",
      maxTokens: 1000000,
      maxOutputTokens: 128000,
      supportsThinking: true,
      supportsAdaptiveThinking: true,
    },
    "claude-opus-5-5-high": {
      displayName: "Claude Opus 5.5 (High)",
      maxTokens: 1000000,
      maxOutputTokens: 128000,
      supportsThinking: true,
      supportsAdaptiveThinking: true,
    },
  };
  const claudeGroup = {
    "claude-opus-5-5": {
      displayName: "Claude Opus 5.5",
      supportedThinkingLevels: [
        { thinkingSuffix: "low" },
        { thinkingSuffix: "medium" },
        { thinkingSuffix: "high" },
      ],
    },
  };

  it("collapses a group into one model whose variants are its thinking tiers", () => {
    const models = modelsFromAntigravityAvailableModels(claudeChildren, claudeGroup);

    expect(Object.keys(models)).toEqual(["antigravity-claude-opus-5-5"]);
    expect(models["antigravity-claude-opus-5-5"]).toMatchObject({
      name: "Claude Opus 5.5 (Antigravity)",
      limit: { context: 1000000, output: 128000 },
      modalities: { input: ["text", "image", "pdf"], output: ["text"] },
      variants: {
        low: { thinkingLevel: "low" },
        medium: { thinkingLevel: "medium" },
        high: { thinkingLevel: "high" },
      },
    });
  });

  it("suppresses the tier ids so OpenCode shows one entry per family", () => {
    const models = modelsFromAntigravityAvailableModels(
      {
        ...claudeChildren,
        "gpt-oss-120b-medium": {
          displayName: "GPT-OSS 120B (Medium)",
          maxTokens: 131072,
          maxOutputTokens: 32768,
        },
      },
      claudeGroup,
    );

    expect(Object.keys(models).sort()).toEqual([
      "antigravity-claude-opus-5-5",
      "antigravity-gpt-oss-120b-medium",
    ]);
  });

  it("skips a group whose children are all disabled or absent", () => {
    const models = modelsFromAntigravityAvailableModels(
      {
        "claude-sonnet-5-5-low": { displayName: "Claude Sonnet 5.5 (Low)", disabled: true },
        "claude-sonnet-5-5-high": { displayName: "Claude Sonnet 5.5 (High)", disabled: true },
      },
      {
        "claude-sonnet-5-5": {
          displayName: "Claude Sonnet 5.5",
          supportedThinkingLevels: [
            { thinkingSuffix: "low" },
            { thinkingSuffix: "medium" },
            { thinkingSuffix: "high" },
          ],
        },
        "claude-haiku-5-5": {
          displayName: "Claude Haiku 5.5",
          supportedThinkingLevels: [{ thinkingSuffix: "high" }],
        },
      },
    );

    expect(models).toEqual({});
  });

  it("keeps the curated name, limit and variants of a static family", () => {
    const models = modelsFromAntigravityAvailableModels(
      {
        "gemini-3.8-flash-low": { displayName: "Gemini 3.8 Flash (Low)", maxTokens: 1234, maxOutputTokens: 5678 },
        "gemini-3.8-flash-high": { displayName: "Gemini 3.8 Flash (High)", maxTokens: 1234, maxOutputTokens: 5678 },
      },
      {
        "gemini-3.8-flash": {
          displayName: "Gemini 3.8 Flash",
          supportedThinkingLevels: [{ thinkingSuffix: "low" }, { thinkingSuffix: "high" }],
        },
      },
    );

    expect(models["antigravity-gemini-3.8-flash"]).toMatchObject({
      name: "Gemini 3.8 Flash (Antigravity)",
      limit: { context: 1048576, output: 65536 },
      variants: {
        low: { thinkingLevel: "low" },
        medium: { thinkingLevel: "medium" },
        high: { thinkingLevel: "high" },
      },
    });
  });

  it("still lists tier ids separately without grouped metadata (1-arg compatibility)", () => {
    const models = modelsFromAntigravityAvailableModels(claudeChildren);

    expect(Object.keys(models).sort()).toEqual([
      "antigravity-claude-opus-5-5-high",
      "antigravity-claude-opus-5-5-low",
      "antigravity-claude-opus-5-5-medium",
    ]);
  });
});
