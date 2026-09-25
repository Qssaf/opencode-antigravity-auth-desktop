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
    ["gemini-3-pro", "gemini-3.1-pro"],
    ["gemini-3-pro-low", "gemini-3.1-pro-low"],
    ["gemini-3-pro-high", "gemini-3.1-pro-high"],
    ["gemini-3.5-flash", "gemini-3.7-flash"],
    ["gemini-3.5-flash-minimal", "gemini-3.7-flash-minimal"],
    ["gemini-3.5-flash-medium", "gemini-3.7-flash-medium"],
    ["gemini-3-flash-agent", "gemini-3.7-flash-high"],
    ["gemini-3.5-flash-extra-low", "gemini-3.7-flash-low"],
    ["gemini-pro-agent", "gemini-3.1-pro-high"],
  ])("remaps %s to %s", (from, to) => {
    expect(remapRetiredAntigravityGeminiModel(from)).toBe(to);
  });

  it.each(["gemini-3-pro-image", "gemini-3.5-flash-lite", "gemini-3.1-pro", "gemini-3-flash", "gemini-3.1-flash-lite"])(
    "leaves %s alone",
    (model) => {
      expect(remapRetiredAntigravityGeminiModel(model)).toBe(model);
    },
  );

  it("sends Gemini 3.1 Pro High under its current backend id", () => {
    expect(toAntigravityWireModel("gemini-3.1-pro-high")).toBe("gemini-pro-agent");
    expect(toAntigravityWireModel("gemini-3.1-pro-low")).toBe("gemini-3.1-pro-low");
  });
});

describe("Gemini 3.1 Pro tier", () => {
  it("defaults to the high tier", () => {
    const result = resolveModelWithTier("antigravity-gemini-3.1-pro");
    expect(result.actualModel).toBe("gemini-3.1-pro-high");
    expect(result.thinkingLevel).toBe("high");
  });

  it("keeps an explicit low tier", () => {
    const result = resolveModelWithTier("antigravity-gemini-3.1-pro-low");
    expect(result.actualModel).toBe("gemini-3.1-pro-low");
    expect(result.thinkingLevel).toBe("low");
  });

  it("picks the successor for the gemini-cli -> antigravity fallback of retired ids", () => {
    expect(resolveModelForHeaderStyle("gemini-3-pro-preview", "antigravity").actualModel).toBe("gemini-3.1-pro-high");
    expect(resolveModelForHeaderStyle("gemini-3.5-flash", "antigravity").actualModel).toBe("gemini-3.7-flash-medium");
  });

  it("keeps the tier of a non-prefixed tier-suffixed Pro id on Antigravity", () => {
    expect(resolveModelForHeaderStyle("gemini-3.1-pro-low", "antigravity").actualModel).toBe("gemini-3.1-pro-low");
    expect(resolveModelForHeaderStyle("gemini-3.1-pro-high", "antigravity").actualModel).toBe("gemini-3.1-pro-high");
    expect(resolveModelForHeaderStyle("gemini-3.1-pro-low", "gemini-cli").actualModel).toBe("gemini-3.1-pro");
  });

  it("does not resolve the retired 3.5 Flash Low id to a nonexistent backend id", () => {
    expect(resolveModelWithTier("antigravity-gemini-3.5-flash-extra-low").actualModel).toBe("gemini-3.7-flash-low");
  });
});

describe("resolveAntigravityGeminiBackend", () => {
  it.each([
    ["gemini-3.8-flash-medium", "minimal", "gemini-3.8-flash-low", "low"],
    ["gemini-3.7-flash-medium", "minimal", "gemini-3.7-flash-low", "low"],
    ["gemini-3.1-pro-high", "minimal", "gemini-3.1-pro-low", "low"],
    ["gemini-3.1-pro-high", "medium", "gemini-3.1-pro-high", "high"],
    ["gemini-3.1-pro-low", "high", "gemini-3.1-pro-high", "high"],
    ["gemini-3.6-flash-medium", "minimal", "gemini-3.6-flash-low", "minimal"],
  ])("%s with %s -> %s / %s", (model, level, backend, sentLevel) => {
    expect(resolveAntigravityGeminiBackend(model, level)).toEqual({ model: backend, thinkingLevel: sentLevel });
  });
});

describe("prepareAntigravityRequest wire model", () => {
  it.each([
    ["antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingLevel: "high" }],
    ["antigravity-gemini-3.1-pro", { includeThoughts: true }],
    ["antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingBudget: 32768 }],
    ["antigravity-gemini-3.1-pro-high", undefined],
    ["antigravity-gemini-3.1-pro-low", { includeThoughts: true, thinkingLevel: "high" }],
    ["antigravity-gemini-pro-agent", undefined],
    ["antigravity-gemini-3-pro", undefined],
    ["gemini-3.1-pro", { includeThoughts: true, thinkingLevel: "high" }],
    ["gemini-3-pro-preview", undefined],
  ])("%s %j goes out as gemini-pro-agent with thinkingLevel high", (model, thinkingConfig) => {
    const { result, body, thinking } = send(model, thinkingConfig);
    expect(body.model).toBe("gemini-pro-agent");
    expect(thinking).toMatchObject({ thinkingLevel: "high" });
    // Name-keyed Gemini 3 handling (thought signatures, thinkingLevel) still sees a Gemini 3 id.
    expect(result.effectiveModel).toBe("gemini-3.1-pro-high");
  });

  it("sends an explicit low Pro variant to the low backend id", () => {
    const { body, thinking } = send("antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingLevel: "low" });
    expect(body.model).toBe("gemini-3.1-pro-low");
    expect(thinking).toMatchObject({ thinkingLevel: "low" });
  });

  it("does not rename the Gemini CLI model id", () => {
    const { body } = send("antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingLevel: "high" }, "gemini-cli");
    expect(body.model).toBe("gemini-3.1-pro");
  });

  it("sends a retired 3.5 Flash variant to 3.7 Flash", () => {
    const { body, thinking } = send("antigravity-gemini-3.5-flash", { includeThoughts: true, thinkingLevel: "high" });
    expect(body.model).toBe("gemini-3.7-flash-high");
    expect(thinking).toMatchObject({ thinkingLevel: "high" });
  });

  it("sends minimal as low where the backend rejects minimal", () => {
    expect(send("gemini-3.8-flash", { includeThoughts: true, thinkingLevel: "minimal" }).thinking).toMatchObject({ thinkingLevel: "low" });
    expect(send("antigravity-gemini-3.1-pro", { includeThoughts: true, thinkingLevel: "minimal" }).thinking).toMatchObject({ thinkingLevel: "low" });
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
  it("drops retired Antigravity ids and adds Gemini 3.1 Flash Lite", () => {
    for (const id of ["antigravity-gemini-3-pro", "antigravity-gemini-3.5-flash"]) {
      expect(OPENCODE_MODEL_DEFINITIONS[id], id).toBeUndefined();
    }
    expect(OPENCODE_MODEL_DEFINITIONS["antigravity-gemini-3.1-flash-lite"]).toBeDefined();
  });

  it("discovery skips unlabeled, retired and renamed registry entries", () => {
    const discovered = modelsFromAntigravityAvailableModels({
      chat_20706: {},
      tab_flash_lite_preview: {},
      "gemini-3.8-flash-tiered": {},
      "gemini-3-flash-agent": { displayName: "Gemini 3.5 Flash (High)" },
      "gemini-3.5-flash-low": { displayName: "Gemini 3.5 Flash (Medium)" },
      "gemini-3.5-flash-extra-low": { displayName: "Gemini 3.5 Flash (Low)" },
      "gemini-3.1-pro-high": { displayName: "Gemini 3.1 Pro (High)" },
      "gemini-pro-agent": { displayName: "Gemini 3.1 Pro (High)" },
      "gemini-3.1-pro-low": { displayName: "Gemini 3.1 Pro (Low)" },
      "gemini-3.1-flash-lite": { displayName: "Gemini 3.1 Flash Lite" },
    });
    expect(Object.keys(discovered).sort()).toEqual([
      "antigravity-gemini-3.1-flash-lite",
      "antigravity-gemini-3.1-pro-low",
    ]);
  });
});
