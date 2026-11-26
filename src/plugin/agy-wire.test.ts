import { describe, expect, it } from "vitest";
import { generateFingerprint } from "./fingerprint";
import { prepareAntigravityRequest } from "./request";
import { TITLE_REQUEST_HEADER } from "../v2/request-kind";

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
  it("lays the request out as agy 1.5.3 does", () => {
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

  it("gives each function its own tools entry, as agy does", () => {
    const prepared = prepareAntigravityRequest(
      URL_38,
      {
        method: "POST",
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
          tools: [{
            functionDeclarations: [
              { name: "read", description: "Read", parameters: { type: "object", properties: { path: { type: "string" } } } },
              { name: "write", description: "Write", parameters: { type: "object", properties: { path: { type: "string" } } } },
            ],
          }],
        }),
      },
      "token",
      "aicode-consumers",
      undefined,
      "antigravity",
    );
    const tools = JSON.parse(prepared.init.body as string).request.tools as Array<{ functionDeclarations: Array<{ name: string }> }>;
    expect(tools.map((tool) => tool.functionDeclarations.map((declaration) => declaration.name))).toEqual([["read"], ["write"]]);
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

  it("includes Antigravity 2.35.0 model_enum labels for Gemini 4 Argon and Hydrogen tiers", () => {
    const cases: Array<[string, string]> = [
      ["antigravity-gemini-4-argon-high", "MODEL_PLACEHOLDER_M417"],
      ["antigravity-gemini-4-argon-medium", "MODEL_PLACEHOLDER_M418"],
      ["antigravity-gemini-4-argon-low", "MODEL_PLACEHOLDER_M419"],
      ["antigravity-gemini-4-hydrogen-high", "MODEL_PLACEHOLDER_M461"],
      ["antigravity-gemini-4-hydrogen-medium", "MODEL_PLACEHOLDER_M462"],
      ["antigravity-gemini-4-hydrogen-low", "MODEL_PLACEHOLDER_M463"],
      ["antigravity-gemini-4-hydrogen-xhigh", "MODEL_PLACEHOLDER_M464"],
    ];

    for (const [model, expectedEnum] of cases) {
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
      const body = JSON.parse(prepared.init.body as string);
      expect(body.request.labels.model_enum).toBe(expectedEnum);
    }
  });
});

