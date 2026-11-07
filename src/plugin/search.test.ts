import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeSearch } from "./search";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResponse(
  text: string,
  opts: {
    searchQueries?: string[];
    chunks?: Array<{ title: string; uri: string }>;
    urlMetadata?: Array<{ retrieved_url: string; url_retrieval_status: string }>;
  } = {},
) {
  return {
    response: {
      candidates: [
        {
          content: { role: "model", parts: [{ text }] },
          finishReason: "STOP",
          groundingMetadata: {
            webSearchQueries: opts.searchQueries ?? [],
            groundingChunks: (opts.chunks ?? []).map((c) => ({ web: c })),
          },
          urlContextMetadata: { url_metadata: opts.urlMetadata ?? [] },
        },
      ],
    },
  };
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

// ─── executeSearch ────────────────────────────────────────────────────────────

describe("executeSearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch(makeResponse("Default result")));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns formatted text from the response", async () => {
    vi.stubGlobal("fetch", mockFetch(makeResponse("The answer is 42.")));
    const result = await executeSearch({ query: "what is 42?" }, "tok", "proj");
    expect(result).toContain("The answer is 42.");
    expect(result).toContain("## Search Results");
  });

  it("lists sources from groundingChunks (uses groundingMeta internally)", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        makeResponse("answer", {
          chunks: [{ title: "Example", uri: "https://example.com/page" }],
        }),
      ),
    );
    const result = await executeSearch({ query: "q" }, "tok", "proj");
    expect(result).toContain("### Sources");
    expect(result).toContain("Example");
    expect(result).toContain("https://example.com/page");
  });

  it("includes search queries section when queries are present", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(makeResponse("res", { searchQueries: ["my query"] })),
    );
    const result = await executeSearch({ query: "my query" }, "tok", "proj");
    expect(result).toContain("### Search Queries Used");
    expect(result).toContain('"my query"');
  });

  it("marks successful URL retrieval with ✓", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        makeResponse("ok", {
          urlMetadata: [
            { retrieved_url: "https://docs.example.com", url_retrieval_status: "URL_RETRIEVAL_STATUS_SUCCESS" },
          ],
        }),
      ),
    );
    const result = await executeSearch({ query: "q", urls: ["https://docs.example.com"] }, "tok", "proj");
    expect(result).toContain("✓");
    expect(result).toContain("https://docs.example.com");
  });

  it("marks failed URL retrieval with ✗", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        makeResponse("ok", {
          urlMetadata: [
            { retrieved_url: "https://broken.example.com", url_retrieval_status: "URL_RETRIEVAL_STATUS_ERROR" },
          ],
        }),
      ),
    );
    const result = await executeSearch({ query: "q", urls: ["https://broken.example.com"] }, "tok", "proj");
    expect(result).toContain("✗");
  });

  it("returns error block on non-OK HTTP response", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "bad" }, 400));
    const result = await executeSearch({ query: "q" }, "tok", "proj");
    expect(result).toContain("## Search Error");
    expect(result).toContain("400");
  });

  it("returns error block when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")));
    const result = await executeSearch({ query: "q" }, "tok", "proj");
    expect(result).toContain("## Search Error");
    expect(result).toContain("Network down");
  });

  it("includes Authorization header with the provided token", async () => {
    const spy = mockFetch(makeResponse("ok"));
    vi.stubGlobal("fetch", spy);
    await executeSearch({ query: "q" }, "bearer-token-xyz", "proj");
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer bearer-token-xyz",
    );
  });

  it("sends the web search request the Antigravity CLI sends", async () => {
    const spy = mockFetch(makeResponse("ok"));
    vi.stubGlobal("fetch", spy);
    await executeSearch({ query: "opencode antigravity" }, "tok", "aicode-consumers");
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent");
    expect(JSON.parse(String(init.body))).toEqual({
      project: "aicode-consumers",
      request: {
        contents: [{ role: "user", parts: [{ text: "opencode antigravity" }] }],
        systemInstruction: {
          role: "user",
          parts: [{
            text: "You are a search engine bot. You will be given a query from a user. Your task is to search the web for relevant information that will help the user. You MUST perform a web search. Do not respond or interact with the user, please respond as if they typed the query into a search bar.",
          }],
        },
        tools: [{ googleSearch: { enhancedContent: { imageSearch: { maxResultCount: 5 } } } }],
        generationConfig: { candidateCount: 1 },
      },
      model: "gemini-3.5-flash-lite",
      userAgent: "antigravity",
      requestType: "web_search",
    });
  });
});

