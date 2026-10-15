import { describe, it, expect } from "vitest";
import {
  remapRetiredAntigravityGeminiModel,
  resolveAntigravityGeminiBackend,
  resolveModelForHeaderStyle,
  resolveModelWithTier,
  toAntigravityWireModel,
} from "./model-resolver";
import { prepareAntigravityRequest } from "../request";
import {
  OPENCODE_MODEL_DEFINITIONS,
  modelsFromAntigravityAvailableModels,
} from "../config/models";

// Backend ids that answer with "no longer available" text (retired) or HTTP 400 (renamed).
const DEAD_BACKEND_IDS = new Set([
  "gemini-3-pro-low",
  "gemini-3-pro-high",
  "gemini-3.5-flash-low",
  "gemini-3.5-flash-extra-low",
  "gemini-3-flash-agent",
  "gemini-3.1-pro-high",
  "gemini-3.1-pro-low",
  "gemini-pro-agent",
]);

function send(model: string, thinkingConfig: Record<string, unknown> | undefined, headerStyle: "antigravity" | "gemini-cli" = "antigravity") {
  const result = prepareAntigravityRequest(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        ...(thinkingConfig ? { generationConfig: { thinkingConfig } } : {}),
      }),
    },
    "token",
    "project",
    undefined,
    headerStyle,
  );
  const body = JSON.parse(result.init.body as string);
  return { result, body, thinking: body.request.generationConfig?.thinkingConfig };
}

describe("retired and renamed Antigravity ids", () => {
  it.each([
    ["gemini-3-pro", "gemini-3.8-flash"],
    ["gemini-3-pro-low", "gemini-3.8-flash-low"],
    ["gemini-3-pro-high", "gemini-3.8-flash-high"],
    ["gemini-3.1-pro", "gemini-3.8-flash"],
    ["gemini-3.1-pro-low", "gemini-3.8-flash-low"],
    ["gemini-3.1-pro-preview-customtools", "gemini-3.8-flash"],
    ["gemini-3-flash", "gemini-3.8-flash"],
    ["gemini-3-flash-preview", "gemini-3.8-flash"],
    ["gemini-3.1-flash-lite", "gemini-3.8-flash"],
    ["gemini-2.5-pro", "gemini-3.8-flash"],
    ["gemini-3.5-flash", "gemini-3.8-flash"],
    ["gemini-3.5-flash-minimal", "gemini-3.8-flash-low"],
    ["gemini-3.5-flash-medium", "gemini-3.8-flash-medium"],
    ["gemini-3.6-flash-low", "gemini-3.8-flash-low"],
    ["gemini-3.7-flash-high", "gemini-3.8-flash-high"],
    ["gemini-3.5-flash-lite", "gemini-3.8-flash"],
    ["gemini-3.5-flash-lite-minimal", "gemini-3.8-flash-low"],
    ["gemini-3-flash-agent", "gemini-3.8-flash-high"],
    ["gemini-3.5-flash-extra-low", "gemini-3.8-flash-low"],
    ["gemini-pro-agent", "gemini-3.8-flash-high"],
  ])("remaps %s to %s", (from, to) => {
    expect(remapRetiredAntigravityGeminiModel(from)).toBe(to);
  });

  it.each([
    "gemini-3-pro-image",
    "gemini-3.8-flash",
    "gemini-3.8-flash-medium",
    "gemini-4-argon",
    "gemini-4-argon-low",
    // Models Google may add later are not treated as retired.
    "gemini-3.9-flash",
    "gemini-3.8-pro",
  ])(
    "leaves %s alone",
    (model) => {
      expect(remapRetiredAntigravityGeminiModel(model)).toBe(model);
    },
  );
});

describe("models Antigravity no longer serves", () => {
  it.each(["gemini-3.1-pro", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash"])(
    "routes %s to the Gemini CLI quota first",
    (model) => {
      const result = resolveModelWithTier(model);
      expect(result.quotaPreference).toBe("gemini-cli");
      // Not explicit: when the Gemini CLI quota runs out it may fall back to Antigravity.
      expect(result.explicitQuota).toBe(false);
    },
  );

  it.each(["gemini-3.8-flash", "gemini-4-argon", "gemini-3.9-flash"])("keeps %s on Antigravity first", (model) => {
    expect(resolveModelWithTier(model).quotaPreference).toBe("antigravity");
  });

  it("falls back to Antigravity as Gemini 3.8 Flash at the same tier", () => {
    expect(resolveModelForHeaderStyle("gemini-3-pro-preview", "antigravity").actualModel).toBe("gemini-3.8-flash-high");
    expect(resolveModelForHeaderStyle("gemini-3.1-pro-low", "antigravity").actualModel).toBe("gemini-3.8-flash-low");
    expect(resolveModelForHeaderStyle("gemini-3.1-pro-low", "gemini-cli").actualModel).toBe("gemini-3.1-pro");
  });

  it("does not resolve the retired 3.5 Flash Low id to a nonexistent backend id", () => {
    expect(resolveModelWithTier("antigravity-gemini-3.5-flash-extra-low").actualModel).toBe("gemini-3.8-flash-low");
  });
});

describe("resolveAntigravityGeminiBackend", () => {
  it.each([
    ["gemini-3.8-flash-medium", "minimal", "gemini-3.8-flash-low", "low"],
    ["gemini-4-argon-medium", "minimal", "gemini-4-argon-low", "low"],
    ["gemini-4-argon", "high", "gemini-4-argon-high", "high"],
  ])("%s with %s -> %s / %s", (model, level, backend, sentLevel) => {
    expect(resolveAntigravityGeminiBackend(model, level)).toEqual({ model: backend, thinkingLevel: sentLevel });
  });
});

describe("prepareAntigravityRequest wire model", () => {
  it.each([
    ["antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingLevel: "high" }, "gemini-3.8-flash-high"],
    ["antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingBudget: 32768 }, "gemini-3.8-flash-high"],
    ["antigravity-gemini-3.1-pro-low", undefined, "gemini-3.8-flash-low"],
    ["antigravity-gemini-pro-agent", undefined, "gemini-3.8-flash-high"],
    ["antigravity-gemini-3-flash", undefined, "gemini-3.8-flash-high"],
    ["antigravity-gemini-3.1-flash-lite", { includeThoughts: true, thinkingLevel: "minimal" }, "gemini-3.8-flash-low"],
  ])("sends %s %j to Antigravity as %s", (model, thinkingConfig, backend) => {
    const { body } = send(model, thinkingConfig);
    expect(body.model).toBe(backend);
  });

  it("does not rename the Gemini CLI model id", () => {
    const { body } = send("antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingLevel: "high" }, "gemini-cli");
    expect(body.model).toBe("gemini-3.1-pro");
  });

  it.each(["antigravity-gemini-3.5-flash", "antigravity-gemini-3.6-flash", "antigravity-gemini-3.7-flash"])(
    "sends dropped %s to 3.8 Flash at the requested level",
    (model) => {
      const { body, thinking } = send(model, { includeThoughts: true, thinkingLevel: "medium" });
      expect(body.model).toBe("gemini-3.8-flash-medium");
      expect(thinking).toMatchObject({ thinkingLevel: "medium" });
    },
  );

  it.each([
    [undefined, "gemini-4-argon-high", "high"],
    ["low", "gemini-4-argon-low", "low"],
    ["medium", "gemini-4-argon-medium", "medium"],
    ["high", "gemini-4-argon-high", "high"],
  ])("sends Gemini 4 Argon with variant %s as %s", (level, backend, sentLevel) => {
    const { result, body, thinking } = send(
      "antigravity-gemini-4-argon",
      level ? { includeThoughts: true, thinkingLevel: level } : undefined,
    );
    expect(body.model).toBe(backend);
    expect(thinking).toMatchObject({ thinkingLevel: sentLevel });
    // Gemini 3+ handling (thinkingLevel, thought signatures) applies to Argon.
    expect(thinking.thinkingBudget).toBeUndefined();
    expect(result.effectiveModel).toBe(backend);
  });

  it("sends minimal as low where the backend rejects minimal", () => {
    expect(send("gemini-3.8-flash", { includeThoughts: true, thinkingLevel: "minimal" }).thinking).toMatchObject({ thinkingLevel: "low" });
    expect(send("antigravity-gemini-4-argon", { includeThoughts: true, thinkingLevel: "minimal" }).thinking).toMatchObject({ thinkingLevel: "low" });
  });

  it("never sends a retired or renamed backend id for any advertised model and variant", () => {
    for (const [id, definition] of Object.entries(OPENCODE_MODEL_DEFINITIONS)) {
      if (id.includes("claude")) continue;
      const levels = [undefined, ...Object.keys(definition.variants ?? {})];
      for (const level of levels) {
        const { body } = send(id, level ? { includeThoughts: true, thinkingLevel: level } : undefined);
        expect(DEAD_BACKEND_IDS.has(body.model), `${id}#${level ?? "default"} -> ${body.model}`).toBe(false);
      }
    }
  });
});

describe("advertised catalog", () => {
  it("offers only Gemini 3.8 Flash and Gemini 4 Argon on Antigravity", () => {
    expect(Object.keys(OPENCODE_MODEL_DEFINITIONS).filter((id) => id.startsWith("antigravity-")).sort()).toEqual([
      "antigravity-gemini-3.8-flash",
      "antigravity-gemini-4-argon",
    ]);
    for (const id of [
      "antigravity-gemini-3-pro",
      "antigravity-gemini-3.5-flash",
      "antigravity-gemini-3.6-flash",
      "antigravity-gemini-3.7-flash",
      "antigravity-claude-sonnet-4-6",
      "antigravity-claude-opus-4-6-thinking",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
    ]) {
      expect(OPENCODE_MODEL_DEFINITIONS[id], id).toBeUndefined();
    }
    expect(Object.keys(OPENCODE_MODEL_DEFINITIONS["antigravity-gemini-4-argon"]?.variants ?? {})).toEqual([
      "low",
      "medium",
      "high",
    ]);
  });

  it("discovery skips unlabeled, retired and renamed registry entries", () => {
    const discovered = modelsFromAntigravityAvailableModels({
      chat_20706: {},
      tab_flash_lite_preview: {},
      "gemini-3.8-flash-tiered": {},
      "gemini-3-flash-agent": { displayName: "Gemini 3.5 Flash (High)" },
      "gemini-3.5-flash-low": { displayName: "Gemini 3.5 Flash (Medium)" },
      "gemini-3.5-flash-extra-low": { displayName: "Gemini 3.5 Flash (Low)" },
      "gemini-3.7-flash-medium": { displayName: "Gemini 3.7 Flash (Medium)" },
      "gemini-3.6-flash-high": { displayName: "Gemini 3.6 Flash (High)" },
      "gemini-3.1-pro-high": { displayName: "Gemini 3.1 Pro (High)" },
      "gemini-pro-agent": { displayName: "Gemini 3.1 Pro (High)" },
      "gemini-3.1-pro-low": { displayName: "Gemini 3.1 Pro (Low)" },
      "gemini-3.1-flash-lite": { displayName: "Gemini 3.1 Flash Lite" },
      "gemini-3.8-flash-medium": { displayName: "Gemini 3.8 Flash (Medium)" },
      "gemini-4-argon-high": { displayName: "Gemini 4 Argon (High)" },
    });
    expect(Object.keys(discovered).sort()).toEqual([
      "antigravity-gemini-3.8-flash-medium",
      "antigravity-gemini-4-argon-high",
    ]);
  });
});
