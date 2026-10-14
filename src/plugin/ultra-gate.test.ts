import { afterEach, describe, expect, it } from "vitest";

import {
  isUltraEntitlementRefusal,
  isUltraModelRefused,
  markUltraModelRefused,
  resetUltraModelRefusals,
  ULTRA_REFUSAL_TTL_MS,
  ultraRequiredMessage,
} from "./ultra-gate";

describe("ultra-gate", () => {
  afterEach(() => resetUltraModelRefusals());

  it("remembers a refusal per account until it expires", () => {
    markUltraModelRefused("token-a", 1_000);
    expect(isUltraModelRefused("token-a", 1_000)).toBe(true);
    expect(isUltraModelRefused("token-b", 1_000)).toBe(false);
    expect(isUltraModelRefused("token-a", 1_000 + ULTRA_REFUSAL_TTL_MS)).toBe(false);
    // An expired refusal is dropped, not just ignored.
    expect(isUltraModelRefused("token-a", 1_000)).toBe(false);
  });

  it("treats 403 and 404 as a refusal, and a 400 only when it is about the subscription", () => {
    expect(isUltraEntitlementRefusal(404, "")).toBe(true);
    expect(isUltraEntitlementRefusal(403, "")).toBe(true);
    expect(isUltraEntitlementRefusal(400, "This model requires a Google AI Ultra subscription.")).toBe(true);
    expect(isUltraEntitlementRefusal(400, "Request contains an invalid argument.")).toBe(false);
    expect(isUltraEntitlementRefusal(429, "Resource exhausted")).toBe(false);
    expect(isUltraEntitlementRefusal(500, "ultra")).toBe(false);
  });

  it("names how many accounts were refused", () => {
    expect(ultraRequiredMessage("Gemini 4 Argon", 1)).toContain("your signed-in account");
    expect(ultraRequiredMessage("Gemini 4 Argon", 3)).toContain("all 3 signed-in accounts");
  });
});
