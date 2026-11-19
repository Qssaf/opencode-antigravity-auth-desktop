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

  it("records one account-wide refusal for Argon, Hydrogen and Neon alike", () => {
    // Gemini 4 Argon, Hydrogen and Neon share a single paid Pro/Ultra
    // entitlement on the account, so the store is deliberately keyed per
    // account with no model dimension: a refusal recorded after any one of the
    // three is reported for the account as a whole. The three triggers are
    // listed to pin that accepted design, not because the store takes a model.
    for (const trigger of ["gemini-4-argon", "gemini-4-hydrogen", "gemini-4-neon"]) {
      resetUltraModelRefusals();
      markUltraModelRefused("token-a", 1_000);
      expect(isUltraModelRefused("token-a", 1_000), `after a ${trigger} refusal`).toBe(true);
      // Another account is never affected by this account's refusal.
      expect(isUltraModelRefused("token-b", 1_000), `after a ${trigger} refusal`).toBe(false);
    }
  });

  it("treats 404 as a refusal, and 403 or 400 only when they are about the model's entitlement", () => {
    expect(isUltraEntitlementRefusal(404, "")).toBe(true);
    // A plain 403 is a credential or access problem.
    expect(isUltraEntitlementRefusal(403, "The caller does not have permission")).toBe(false);
    expect(isUltraEntitlementRefusal(403, "Permission denied on resource project", true)).toBe(true);
    expect(isUltraEntitlementRefusal(403, "Requires a Google AI Ultra subscription")).toBe(true);
    expect(isUltraEntitlementRefusal(400, "This model requires a Google AI Ultra subscription.")).toBe(true);
    expect(isUltraEntitlementRefusal(400, "Request contains an invalid argument.")).toBe(false);
    expect(isUltraEntitlementRefusal(400, "thinking level not available for this tier")).toBe(false);
    expect(isUltraEntitlementRefusal(429, "Resource exhausted")).toBe(false);
    expect(isUltraEntitlementRefusal(500, "ultra")).toBe(false);
  });

  it("names the requested model and how many accounts were refused", () => {
    expect(ultraRequiredMessage("Gemini 4 Argon", 1)).toContain("your signed-in account");
    expect(ultraRequiredMessage("Gemini 4 Argon", 3)).toContain("all 3 signed-in accounts");
    expect(ultraRequiredMessage("Gemini 4 Hydrogen", 2)).toContain(
      "Gemini 4 Hydrogen needs a paid Google AI Pro or Google AI Ultra subscription",
    );
    expect(ultraRequiredMessage("Gemini 4 Hydrogen", 2)).toContain("all 2 signed-in accounts");
    expect(ultraRequiredMessage("Gemini 4 Neon", 2)).toContain(
      "Gemini 4 Neon needs a paid Google AI Pro or Google AI Ultra subscription",
    );
  });
});
