import { afterEach, describe, expect, it, vi } from "vitest";
import { generateFingerprint } from "./fingerprint";
import { recordAntigravityAvailableModels, resetAntigravityModelCatalogForTests } from "./model-catalog";
import { prepareAntigravityRequest } from "./request";
import { TITLE_REQUEST_HEADER } from "../v2/request-kind";

afterEach(() => resetAntigravityModelCatalogForTests());

const URL_38 =
  "https://generativelanguage.googleapis.com/v1beta/models/antigravity-gemini-3.8-flash:streamGenerateContent?alt=sse";

function send(
  chat: string | undefined,
  messages: number,
  fingerprint = generateFingerprint(),
  extraHeaders: Record<string, string> = {},
) {
  const contents = Array.from({ length: messages }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "model",
    parts: [{ text: `message ${i}` }],
  }));
  const prepared = prepareAntigravityRequest(
    URL_38,
    {
      method: "POST",
      headers: { ...(chat ? { "x-opencode-session": chat } : {}), ...extraHeaders },
      body: JSON.stringify({ contents, generationConfig: { thinkingConfig: { thinkingLevel: "high", includeThoughts: true } } }),
    },
    "token",
    "aicode-consumers",
    undefined,
    "antigravity",
    false,
    { fingerprint },
  );
  return {
    body: JSON.parse(prepared.init.body as string),
    headers: new Headers(prepared.init.headers),
  };
}

describe("Antigravity CLI wire format", () => {
  it("lays the request out as agy 1.5.18 does", () => {
    const { body, headers } = send("ses_layout", 1);

    expect(Object.keys(body)).toEqual(["project", "requestId", "request", "model", "userAgent", "requestType"]);
    expect(body).toMatchObject({ project: "aicode-consumers", model: "gemini-3.8-flash-high", userAgent: "antigravity", requestType: "agent" });
    expect(body.requestId).toMatch(/^agent\/[0-9a-f-]{36}\/\d{13}\/[0-9a-f-]{36}\/1$/);
    expect(Object.keys(body.request).slice(-3)).toEqual(["labels", "generationConfig", "sessionId"]);
    expect(body.request.generationConfig.thinkingConfig.thinkingLevel).toBe("HIGH");
    expect(body.request.sessionId).toMatch(/^-?\d{1,19}$/);

    const [, cascade, , trajectory] = body.requestId.split("/");
    expect(body.request.labels).toEqual({
      cascade_id: cascade,
      last_step_index: "0",
      model_enum: "MODEL_PLACEHOLDER_M318",
      request_id: `${trajectory}-0`,
      root_cascade_id: cascade,
      trajectory_id: trajectory,
      trajectory_source: "CORTEX_TRAJECTORY_SOURCE_CLI",
      used_claude: "false",
      used_claude_conservative: "false",
      used_non_gemini_model: "false",
    });
    // agy sends no Accept header; `?alt=sse` selects the stream.
    expect(headers.has("accept")).toBe(false);
  });

  it("drops the Accept header OpenCode adds", () => {
    const { headers } = send("ses_accept", 1, generateFingerprint(), { accept: "text/event-stream" });
    expect(headers.has("accept")).toBe(false);
  });

  it("keeps a chat's ids and counts its requests and messages", () => {
    const fingerprint = generateFingerprint();
    const first = send("ses_counting", 1, fingerprint).body;
    const second = send("ses_counting", 3, fingerprint).body;
    const other = send("ses_other", 1, fingerprint).body;

    expect(second.request.labels.cascade_id).toBe(first.request.labels.cascade_id);
    expect(second.request.labels.trajectory_id).toBe(first.request.labels.trajectory_id);
    expect(second.request.labels.request_id.endsWith("-1")).toBe(true);
    expect(second.request.labels.last_step_index).toBe("2");
    expect(second.requestId.endsWith("/3")).toBe(true);
    expect(other.request.labels.cascade_id).not.toBe(first.request.labels.cascade_id);
    // One session id per account, the same in every chat.
    expect(other.request.sessionId).toBe(first.request.sessionId);
  });

  it("gives each account its own session id", () => {
    expect(send("ses_a", 1).body.request.sessionId).not.toBe(send("ses_a", 1).body.request.sessionId);
  });

  it("starts a new conversation when a chat moves to another account, so no ids link the two", () => {
    const first = send("ses_moving", 1).body;
    const second = send("ses_moving", 3).body;
    expect(second.request.labels.cascade_id).not.toBe(first.request.labels.cascade_id);
    expect(second.request.labels.request_id.endsWith("-0")).toBe(true);
  });

  it("sends a title request as a conversation of its own, without touching the chat's", () => {
    const fingerprint = generateFingerprint();
    const chat = send("ses_titled", 1, fingerprint).body;
    const title = send("ses_titled", 1, fingerprint, { [TITLE_REQUEST_HEADER]: "1" });
    const next = send("ses_titled", 3, fingerprint).body;

    expect(title.body.request.labels.cascade_id).not.toBe(chat.request.labels.cascade_id);
    expect(title.headers.has(TITLE_REQUEST_HEADER)).toBe(false);
    expect(next.request.labels.cascade_id).toBe(chat.request.labels.cascade_id);
    expect(next.request.labels.request_id.endsWith("-1")).toBe(true);
  });

  it("puts the system prompt's role before its parts, as agy does", () => {
    const prepared = prepareAntigravityRequest(
      URL_38,
      {
        method: "POST",
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are a coding agent." }] },
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
        }),
      },
      "token",
      "aicode-consumers",
      undefined,
      "antigravity",
    );
    expect(Object.keys(JSON.parse(prepared.init.body as string).request.systemInstruction)).toEqual(["role", "parts"]);
  });

  it("counts every tool result as a step, as agy does", () => {
    const prepared = prepareAntigravityRequest(
      URL_38,
      {
        method: "POST",
        headers: { "x-opencode-session": "ses_steps" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: "read both" }] },
            { role: "model", parts: [{ functionCall: { id: "a", name: "read", args: {} } }, { functionCall: { id: "b", name: "read", args: {} } }] },
            {
              role: "user",
              parts: [
                { functionResponse: { id: "a", name: "read", response: { content: "one" } } },
                { functionResponse: { id: "b", name: "read", response: { content: "two" } } },
              ],
            },
          ],
        }),
      },
      "token",
      "aicode-consumers",
      undefined,
      "antigravity",
      false,
      { fingerprint: generateFingerprint() },
    );
    // agy numbers them: the request (0), the model's answer (1), each tool run (2, 3).
    const body = JSON.parse(prepared.init.body as string);
    expect(body.request.labels.last_step_index).toBe("3");
    expect(body.requestId.endsWith("/4")).toBe(true);
  });

  it("sends every function in one tools entry, as agy 1.5.18 does", () => {
    const prepared = prepareAntigravityRequest(
      URL_38,
      {
        method: "POST",
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
          tools: [
            {
              functionDeclarations: [
                { name: "read", description: "Read", parameters: { type: "object", properties: { path: { type: "string" } } } },
                { name: "write", description: "Write", parameters: { type: "object", properties: { path: { type: "string" } } } },
              ],
            },
            { googleSearch: {} },
            { functionDeclarations: [{ name: "edit", description: "Edit", parameters: { type: "object", properties: { path: { type: "string" } } } }] },
          ],
        }),
      },
      "token",
      "aicode-consumers",
      undefined,
      "antigravity",
    );
    const tools = JSON.parse(prepared.init.body as string).request.tools as Array<{ functionDeclarations?: Array<{ name: string }> }>;
    // A tool that is not a function keeps its place after the merged entry.
    expect(tools.map((tool) => tool.functionDeclarations?.map((declaration) => declaration.name) ?? Object.keys(tool))).toEqual([
      ["read", "write", "edit"],
      ["googleSearch"],
    ]);
  });

  it("names tool calls with stable UUIDs, as agy does", () => {
    const uuid = "70565840-407e-41c8-b16c-4a34f4ba4c3e";
    const sendCalls = () => {
      const prepared = prepareAntigravityRequest(
        URL_38,
        {
          method: "POST",
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: "read it" }] },
              { role: "model", parts: [{ functionCall: { id: "tool_9d3431172cc042e681a7c1ab122c5b60", name: "read", args: {} }, thoughtSignature: "s".repeat(64) }] },
              { role: "user", parts: [{ functionResponse: { id: "tool_9d3431172cc042e681a7c1ab122c5b60", name: "read", response: { content: "x" } } }] },
              { role: "model", parts: [{ functionCall: { id: uuid, name: "read", args: {} }, thoughtSignature: "s".repeat(64) }] },
            ],
          }),
        },
        "token",
        "aicode-consumers",
        undefined,
        "antigravity",
      );
      const contents = JSON.parse(prepared.init.body as string).request.contents as Array<{ parts: Array<Record<string, { id?: string }>> }>;
      return contents.flatMap((content) => content.parts).map((part) => (part.functionCall ?? part.functionResponse)?.id).filter(Boolean);
    };

    const [call, result, kept] = sendCalls();
    expect(call).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(result).toBe(call);
    expect(kept).toBe(uuid);
    // The same history gets the same ids next time.
    expect(sendCalls()[0]).toBe(call);
  });

  it("sends tool results as agy does: a model turn of { output } results", () => {
    const prepared = prepareAntigravityRequest(
      URL_38,
      {
        method: "POST",
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: "read both" }] },
            {
              role: "model",
              parts: [
                { functionCall: { id: "a", name: "read", args: {} }, thoughtSignature: "s".repeat(64) },
                { functionCall: { id: "b", name: "read", args: {} } },
              ],
            },
            {
              role: "user",
              parts: [
                { functionResponse: { id: "a", name: "read", response: { name: "read", content: "first file" } } },
                { functionResponse: { id: "b", name: "read", response: { name: "read", content: { error: "missing" } } } },
              ],
            },
          ],
        }),
      },
      "token",
      "aicode-consumers",
      undefined,
      "antigravity",
    );
    const contents = JSON.parse(prepared.init.body as string).request.contents as Array<{ role: string; parts: Array<{ functionResponse?: { response: unknown } }> }>;
    expect(contents.map((content) => content.role)).toEqual(["user", "model", "model"]);
    expect(contents[2]!.parts.map((part) => part.functionResponse?.response)).toEqual([
      { output: "first file" },
      { output: JSON.stringify({ error: "missing" }) },
    ]);
  });

  function modelEnumFor(model: string): string | undefined {
    const prepared = prepareAntigravityRequest(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "x-opencode-session": "ses_enum" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
      },
      "token",
      "aicode-consumers",
      undefined,
      "antigravity",
      false,
      { fingerprint: generateFingerprint() },
    );
    return JSON.parse(prepared.init.body as string).request.labels.model_enum;
  }

  it("labels Gemini 4 Hydrogen with the model ids Google's fetchAvailableModels lists", () => {
    expect(modelEnumFor("antigravity-gemini-4-hydrogen-high")).toBe("MODEL_PLACEHOLDER_M525");
    expect(modelEnumFor("antigravity-gemini-4-hydrogen-medium")).toBe("MODEL_PLACEHOLDER_M526");
    expect(modelEnumFor("antigravity-gemini-4-hydrogen-low")).toBe("MODEL_PLACEHOLDER_M527");
    expect(modelEnumFor("antigravity-gemini-4-hydrogen-xhigh")).toBe("MODEL_PLACEHOLDER_M528");
  });

  it("sends no model_enum for a model whose id Google has not told us", () => {
    expect(modelEnumFor("antigravity-gemini-4-argon-high")).toBeUndefined();
  });

  it("keeps using Google's model_enum after the fetched list has gone stale", () => {
    vi.useFakeTimers();
    try {
      recordAntigravityAvailableModels({ "gemini-4-argon-high": { model: "MODEL_PLACEHOLDER_M900" } });
      vi.advanceTimersByTime(3 * 60 * 60 * 1000);
      expect(modelEnumFor("antigravity-gemini-4-argon-high")).toBe("MODEL_PLACEHOLDER_M900");
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores a model id in Google's list that is not a string", () => {
    const malformed = JSON.parse('{"gemini-4-hydrogen-xhigh":{"model":528}}') as Parameters<
      typeof recordAntigravityAvailableModels
    >[0];
    recordAntigravityAvailableModels(malformed);
    expect(modelEnumFor("antigravity-gemini-4-hydrogen-xhigh")).toBe("MODEL_PLACEHOLDER_M528");
  });

  it("takes the model_enum from Google's own model list once it has been fetched", () => {
    recordAntigravityAvailableModels({
      "gemini-4-argon-high": { displayName: "Gemini 4 Argon (High)", model: "MODEL_PLACEHOLDER_M900" },
      "gemini-4-hydrogen-xhigh": { displayName: "Gemini 4 Hydrogen (XHigh)", model: "MODEL_PLACEHOLDER_M901" },
    });
    expect(modelEnumFor("antigravity-gemini-4-argon-high")).toBe("MODEL_PLACEHOLDER_M900");
    expect(modelEnumFor("antigravity-gemini-4-hydrogen-xhigh")).toBe("MODEL_PLACEHOLDER_M901");
    // A model the list does not mention keeps its known id.
    expect(modelEnumFor("antigravity-gemini-4-hydrogen-low")).toBe("MODEL_PLACEHOLDER_M527");
  });
});

