import { beforeEach, describe, expect, it, vi } from "vitest";

// Mirror plugin.test.ts: the plugin module imports `tool` from the SDK. It is
// only invoked inside createAntigravityPlugin (not at module load), but we mock
// it defensively so importing the module never touches the real SDK surface.
vi.mock("@opencode-ai/plugin", () => ({
  tool: Object.assign(
    (definition: unknown) => definition,
    {
      schema: {
        string: () => ({ describe: () => ({}) }),
        boolean: () => ({ optional: () => ({ default: () => ({ describe: () => ({}) }) }) }),
        array: () => ({ optional: () => ({ describe: () => ({}) }) }),
      },
    },
  ),
}));

const { loopEscapeTestHooks } = await import("./plugin");
const { ANTIGRAVITY_ENDPOINT_FALLBACKS, ANTIGRAVITY_ENDPOINT_PROD } = await import("./constants");

const hooks = loopEscapeTestHooks;

beforeEach(() => {
  hooks.resetAllInternalState();
});

describe("fix 1: capacity-retry loop escape decision (hasUsableEndpointAfterIndex)", () => {
  // ANTIGRAVITY_ENDPOINT_FALLBACKS = [DAILY, AUTOPUSH, PROD]; PROD is the last entry.
  const prodIndex = ANTIGRAVITY_ENDPOINT_FALLBACKS.indexOf(ANTIGRAVITY_ENDPOINT_PROD);

  it("PROD is the only usable endpoint for gemini-cli (sandbox endpoints skipped)", () => {
    for (let i = 0; i < ANTIGRAVITY_ENDPOINT_FALLBACKS.length; i++) {
      const endpoint = ANTIGRAVITY_ENDPOINT_FALLBACKS[i]!;
      const usable = hooks.isEndpointUsableForHeaderStyle(endpoint, "gemini-cli");
      expect(usable).toBe(endpoint === ANTIGRAVITY_ENDPOINT_PROD);
    }
  });

  it("all endpoints are usable for the antigravity header style", () => {
    for (const endpoint of ANTIGRAVITY_ENDPOINT_FALLBACKS) {
      expect(hooks.isEndpointUsableForHeaderStyle(endpoint, "antigravity")).toBe(true);
    }
  });

  it("gemini-cli has NO usable endpoint after PROD -> must switch account after capacity exhaustion", () => {
    expect(hooks.hasUsableEndpointAfterIndex(prodIndex, "gemini-cli")).toBe(false);
    if (prodIndex > 0) {
      expect(hooks.hasUsableEndpointAfterIndex(0, "gemini-cli")).toBe(true);
      expect(hooks.hasUsableEndpointAfterIndex(prodIndex - 1, "gemini-cli")).toBe(true);
    }
  });

  it("antigravity still tries later endpoints, but switches after the last one", () => {
    for (let i = 0; i < ANTIGRAVITY_ENDPOINT_FALLBACKS.length - 1; i++) {
      expect(hooks.hasUsableEndpointAfterIndex(i, "antigravity")).toBe(true);
    }
    // After the final endpoint there is nothing left -> switch account.
    expect(
      hooks.hasUsableEndpointAfterIndex(ANTIGRAVITY_ENDPOINT_FALLBACKS.length - 1, "antigravity"),
    ).toBe(false);
  });
});

describe("fix 2: warmup retry cap actually engages", () => {
  it("stops attempting warmup after MAX_WARMUP_RETRIES (2) failed attempts", () => {
    const sessionId = "session-warmup-failures";
    // Two attempts are allowed...
    expect(hooks.trackWarmupAttempt(sessionId)).toBe(true);
    expect(hooks.getWarmupAttemptCount(sessionId)).toBe(1);
    expect(hooks.trackWarmupAttempt(sessionId)).toBe(true);
    expect(hooks.getWarmupAttemptCount(sessionId)).toBe(2);
    // ...the third is capped (previously the dead cap allowed it forever).
    expect(hooks.trackWarmupAttempt(sessionId)).toBe(false);
    expect(hooks.getWarmupAttemptCount(sessionId)).toBe(2);
  });

  it("stops attempting warmup once a session has succeeded", () => {
    const sessionId = "session-warmup-success";
    expect(hooks.trackWarmupAttempt(sessionId)).toBe(true);
    hooks.markWarmupSuccess(sessionId);
    expect(hooks.trackWarmupAttempt(sessionId)).toBe(false);
  });

  it("counts attempts independently per session", () => {
    expect(hooks.trackWarmupAttempt("a")).toBe(true);
    expect(hooks.trackWarmupAttempt("b")).toBe(true);
    expect(hooks.getWarmupAttemptCount("a")).toBe(1);
    expect(hooks.getWarmupAttemptCount("b")).toBe(1);
  });

  it("retrying the OLDEST tracked session at capacity does not reset its count (eviction guard)", () => {
    const cap = hooks.MAX_WARMUP_SESSIONS;
    // Fill the map to exactly capacity; the oldest key is "s0".
    for (let i = 0; i < cap; i++) {
      expect(hooks.trackWarmupAttempt(`s${i}`)).toBe(true);
    }
    // Retry the oldest session. Before the fix, unconditional eviction deleted
    // "s0" first, resetting its count to 0 and wrongly permitting a 3rd attempt.
    expect(hooks.trackWarmupAttempt("s0")).toBe(true);
    expect(hooks.getWarmupAttemptCount("s0")).toBe(2); // incremented, not reset to 1
    // The cap now holds for s0.
    expect(hooks.trackWarmupAttempt("s0")).toBe(false);
  });
});

describe("fix 1 (review): capacity fallback prefers the alternate quota pool on the same account", () => {
  // The terminal capacity-escape marks the current pool rate-limited BEFORE asking
  // for the available header style, so getAvailableHeaderStyle returns the ALTERNATE
  // pool and resolveQuotaFallbackHeaderStyle yields it — letting the request retry
  // gemini-cli on the SAME account before the whole account is excluded.
  it("resolveQuotaFallbackHeaderStyle returns the alternate style, and null once both are locked", () => {
    // antigravity exhausted, gemini-cli still available -> fall back to gemini-cli
    expect(
      hooks.resolveQuotaFallbackHeaderStyle({
        family: "gemini",
        headerStyle: "antigravity",
        alternateStyle: "gemini-cli",
      }),
    ).toBe("gemini-cli");
    // Both pools locked (getAvailableHeaderStyle would return null) -> no fallback,
    // escape to account rotation.
    expect(
      hooks.resolveQuotaFallbackHeaderStyle({
        family: "gemini",
        headerStyle: "antigravity",
        alternateStyle: null,
      }),
    ).toBe(null);
    // Alternate equals current (e.g. current pool not yet marked) -> no fallback.
    expect(
      hooks.resolveQuotaFallbackHeaderStyle({
        family: "gemini",
        headerStyle: "antigravity",
        alternateStyle: "antigravity",
      }),
    ).toBe(null);
    // Claude has no alternate quota pool.
    expect(
      hooks.resolveQuotaFallbackHeaderStyle({
        family: "claude",
        headerStyle: "antigravity",
        alternateStyle: "gemini-cli",
      }),
    ).toBe(null);
  });
});

describe("fix 3: index-keyed state remap after account removal", () => {
  it("remapIndexAfterRemoval drops the removed index and shifts higher indices down", () => {
    expect(hooks.remapIndexAfterRemoval(0, 1)).toBe(0); // below removed -> unchanged
    expect(hooks.remapIndexAfterRemoval(1, 1)).toBe(null); // removed -> dropped
    expect(hooks.remapIndexAfterRemoval(2, 1)).toBe(1); // above removed -> shift down
    expect(hooks.remapIndexAfterRemoval(3, 1)).toBe(2);
  });

  it("remapIndexSetAfterRemoval shifts a Set in place", () => {
    const set = new Set<number>([0, 2, 3]);
    hooks.remapIndexSetAfterRemoval(set, 1);
    // 0 stays, index 1 was not present, 2->1, 3->2
    expect([...set].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it("remaps accountFailureState and rateLimitStateByAccountQuota, preserving values and quota keys", () => {
    // Seed distinct, identifiable values at four indices.
    hooks.seedAccountFailure(0, 10);
    hooks.seedAccountFailure(1, 11);
    hooks.seedAccountFailure(2, 12);
    hooks.seedAccountFailure(3, 13);

    hooks.seedRateLimitState(0, "gemini-cli", 100);
    hooks.seedRateLimitState(1, "gemini-cli", 101);
    hooks.seedRateLimitState(2, "gemini-antigravity", 102);
    hooks.seedRateLimitState(3, "claude", 103);

    // Remove the account at index 1 (renumbers 2->1, 3->2).
    hooks.remapAccountStateAfterRemoval(1);

    // accountFailureState: index 0 unchanged, 1 dropped, 2's value now at 1, 3's at 2.
    expect(hooks.getAccountFailureCount(0)).toBe(10);
    expect(hooks.getAccountFailureCount(1)).toBe(12);
    expect(hooks.getAccountFailureCount(2)).toBe(13);
    expect(hooks.getAccountFailureCount(3)).toBe(undefined);

    // rateLimitStateByAccountQuota: removed index dropped, higher indices shifted,
    // and the quota key travels with the value.
    expect(hooks.getRateLimitConsecutive(0, "gemini-cli")).toBe(100);
    expect(hooks.getRateLimitConsecutive(1, "gemini-cli")).toBe(undefined); // old index-1 entry gone
    expect(hooks.getRateLimitConsecutive(1, "gemini-antigravity")).toBe(102); // was index 2
    expect(hooks.getRateLimitConsecutive(2, "claude")).toBe(103); // was index 3
    expect(hooks.getRateLimitConsecutive(3, "claude")).toBe(undefined);
  });
});
