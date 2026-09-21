import { describe, expect, it } from "vitest";

import { __testExports, fetchRateLimitSummary, findRateLimitBucket, isGeminiRateLimitGroup } from "./quota.ts";

describe("Antigravity quota aggregation", () => {
  it("uses the best available Gemini variant instead of the most exhausted rollout variant", () => {
    const summary = __testExports.aggregateQuota({
      "gemini-3.5-flash-low": {
        displayName: "Gemini 3.5 Flash Low",
        quotaInfo: {
          remainingFraction: 1,
          resetTime: "2026-05-26T18:00:00Z",
        },
      },
      "gemini-3-flash-agent": {
        displayName: "Gemini 3 Flash Agent",
        quotaInfo: {
          remainingFraction: 0,
          resetTime: "2026-05-27T18:00:00Z",
        },
      },
    });

    expect(summary.groups["gemini-flash"]?.remainingFraction).toBe(1);
    expect(summary.groups["gemini-flash"]?.resetTime).toBe("2026-05-26T18:00:00Z");
    expect(summary.groups["gemini-flash"]?.modelCount).toBe(2);
  });

  it("keeps resetTime coupled to the model whose remainingFraction is displayed", () => {
    const summary = __testExports.aggregateQuota({
      "gemini-3.5-flash-low": {
        displayName: "Gemini 3.5 Flash Low",
        quotaInfo: {
          remainingFraction: 1,
          resetTime: "2026-05-27T18:00:00Z",
        },
      },
      "gemini-3-flash-agent": {
        displayName: "Gemini 3 Flash Agent",
        quotaInfo: {
          remainingFraction: 0,
          resetTime: "2026-05-26T18:00:00Z",
        },
      },
    });

    // The displayed remainingFraction (1) belongs to gemini-3.5-flash-low, so the
    // reset time must be that same model's reset time, not the earliest across models.
    expect(summary.groups["gemini-flash"]?.remainingFraction).toBe(1);
    expect(summary.groups["gemini-flash"]?.resetTime).toBe("2026-05-27T18:00:00Z");
  });

  it("takes the resetTime of the winning model regardless of iteration order", () => {
    const summary = __testExports.aggregateQuota({
      "gemini-3-flash-agent": {
        displayName: "Gemini 3 Flash Agent",
        quotaInfo: {
          remainingFraction: 0.2,
          resetTime: "2026-05-26T18:00:00Z",
        },
      },
      "gemini-3.5-flash-low": {
        displayName: "Gemini 3.5 Flash Low",
        quotaInfo: {
          remainingFraction: 0.9,
          resetTime: "2026-05-28T18:00:00Z",
        },
      },
    });

    expect(summary.groups["gemini-flash"]?.remainingFraction).toBe(0.9);
    expect(summary.groups["gemini-flash"]?.resetTime).toBe("2026-05-28T18:00:00Z");
  });

  it("breaks equal-remainingFraction ties by keeping the earliest reset time", () => {
    // Both models are equally drained; the representative reset time must be the
    // earliest, regardless of iteration order (the later-reset model is first).
    const summary = __testExports.aggregateQuota({
      "gemini-3.5-flash-low": {
        displayName: "Gemini 3.5 Flash Low",
        quotaInfo: {
          remainingFraction: 0.5,
          resetTime: "2026-05-28T18:00:00Z",
        },
      },
      "gemini-3-flash-agent": {
        displayName: "Gemini 3 Flash Agent",
        quotaInfo: {
          remainingFraction: 0.5,
          resetTime: "2026-05-26T18:00:00Z",
        },
      },
    });

    expect(summary.groups["gemini-flash"]?.remainingFraction).toBe(0.5);
    expect(summary.groups["gemini-flash"]?.resetTime).toBe("2026-05-26T18:00:00Z");
  });

  it("ignores unparseable reset times", () => {
    const summary = __testExports.aggregateQuota({
      "gemini-3-flash-agent": {
        displayName: "Gemini 3 Flash Agent",
        quotaInfo: {
          remainingFraction: 0.5,
          resetTime: "not-a-date",
        },
      },
    });

    expect(summary.groups["gemini-flash"]?.remainingFraction).toBe(0.5);
    expect(summary.groups["gemini-flash"]?.resetTime).toBeUndefined();
  });
});

describe("mapWithConcurrency", () => {
  it("preserves result ordering by input index", async () => {
    const items = [10, 20, 30, 40, 50];
    const results = await __testExports.mapWithConcurrency(items, 3, async (item, index) => {
      // Stagger completion so out-of-order finishes would surface ordering bugs.
      await new Promise((resolve) => setTimeout(resolve, (items.length - index) * 2));
      return item * 2;
    });
    expect(results).toEqual([20, 40, 60, 80, 100]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);
    await __testExports.mapWithConcurrency(items, 3, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return item;
    });
    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("returns an empty array for empty input", async () => {
    const results = await __testExports.mapWithConcurrency([], 3, async (item) => item);
    expect(results).toEqual([]);
  });
});

describe("fetchRateLimitSummary", () => {
  const summaryPayload = {
    description: "Your plan's limits",
    groups: [
      {
        displayName: "Gemini models",
        buckets: [
          { bucketId: "g-w", displayName: "Weekly", window: "weekly", remainingFraction: 0.57, resetTime: "2026-09-24T00:00:00Z" },
          { bucketId: "g-5", displayName: "5 hour", window: "5h", remainingFraction: 1 },
        ],
      },
      {
        displayName: "Claude and GPT models",
        buckets: [
          { bucketId: "c-w", displayName: "Weekly", window: "weekly", remainingFraction: 0.99, disabled: false },
        ],
      },
    ],
  };

  it("reads the weekly and 5-hour buckets Google reports", async () => {
    const calls: Array<{ url: string; headers: Record<string, string> }> = [];
    global.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string> });
      return new Response(JSON.stringify(summaryPayload), { status: 200 });
    }) as unknown as typeof fetch;

    const summary = await fetchRateLimitSummary("token", "project-1");

    expect(calls[0]?.url).toContain("/v1internal:retrieveUserQuotaSummary");
    // The roster the backend serves depends on the client it thinks is calling.
    expect(calls[0]?.headers["User-Agent"]).toContain("antigravity/");
    expect(summary.error).toBeUndefined();
    expect(summary.groups).toHaveLength(2);

    const geminiWeekly = findRateLimitBucket(summary, isGeminiRateLimitGroup, "weekly");
    expect(geminiWeekly?.remainingFraction).toBe(0.57);
    expect(geminiWeekly?.resetTime).toBe("2026-09-24T00:00:00Z");

    const thirdPartyWeekly = findRateLimitBucket(summary, (group) => !isGeminiRateLimitGroup(group), "weekly");
    expect(thirdPartyWeekly?.remainingFraction).toBe(0.99);
  });

  it("falls through to the next host on 403/404/5xx", async () => {
    const seen: string[] = [];
    global.fetch = (async (url: string) => {
      seen.push(new URL(url).host);
      return seen.length === 1
        ? new Response("nope", { status: 404 })
        : new Response(JSON.stringify(summaryPayload), { status: 200 });
    }) as unknown as typeof fetch;

    const summary = await fetchRateLimitSummary("token");

    expect(seen.length).toBeGreaterThan(1);
    expect(summary.groups).toHaveLength(2);
  });

  it("reports a failure instead of throwing", async () => {
    global.fetch = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const summary = await fetchRateLimitSummary("token");

    expect(summary.groups).toEqual([]);
    expect(summary.error).toContain("offline");
  });
});
