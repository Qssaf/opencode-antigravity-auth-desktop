import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountManager } from "./accounts";
import type { AccountStorageV4 } from "./storage";

/**
 * Test: Antigravity-first fallback logic
 * 
 * Requirement: Exhaust Antigravity across ALL accounts before falling back to Gemini CLI
 * 
 * Scenario:
 * - Account 0: antigravity rate-limited, gemini-cli available
 * - Account 1: antigravity available
 * 
 * Expected: Switch to Account 1 (use antigravity), NOT fall back to gemini-cli on Account 0
 */
describe("Antigravity-first fallback", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("Pre-check fallback logic", () => {
    it("switches to an account that still has antigravity quota", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
        activeIndexByFamily: { claude: 0, gemini: 0 },
      };

      const manager = new AccountManager(undefined, stored);
      const accounts = manager.getAccounts();
      
      // Account 0's antigravity is rate-limited
      manager.markRateLimited(accounts[0]!, 60000, "gemini", "antigravity");
      
      // Account 1's antigravity is available
      // (not rate-limited for antigravity)

      // Should switch to account 1, which has antigravity quota
      
      const nextAccount = manager.getCurrentOrNextForFamily(
        "gemini",
        null,
        "sticky",
        "antigravity"
      );

      expect(nextAccount?.index).toBe(1);
      expect(manager.isRateLimitedForHeaderStyle(nextAccount!, "gemini", "antigravity")).toBe(false);
    });

    it("leaves no account to switch to once every account exhausted antigravity", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
        activeIndexByFamily: { claude: 0, gemini: 0 },
      };

      const manager = new AccountManager(undefined, stored);
      const accounts = manager.getAccounts();
      
      // Both accounts' antigravity are rate-limited
      manager.markRateLimited(accounts[0]!, 60000, "gemini", "antigravity");
      manager.markRateLimited(accounts[1]!, 60000, "gemini", "antigravity");

      // Verify no account has antigravity available
      expect(manager.peekOtherAccountForFamily("gemini", null, "antigravity", 100, 600_000, new Set([0]))).toBeNull();
      expect(manager.peekOtherAccountForFamily("gemini", null, "antigravity", 100, 600_000, new Set([1]))).toBeNull();

      // There is no Gemini CLI quota to fall back to.
      expect(manager.getCurrentOrNextForFamily("gemini", null, "sticky", "antigravity")).toBeNull();
    });
  });
});
