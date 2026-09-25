import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountManager, type ModelFamily, parseRateLimitReason, calculateBackoffMs, resolveQuotaGroup, RATE_LIMIT_CLEAR_TTL_MS } from "./accounts";
import type { AccountStorageV4 } from "./storage";
import type { OAuthAuthDetails } from "./types";
import * as storageModule from "./storage";

// Mock storage to prevent test data from leaking to real config files
vi.mock("./storage", async (importOriginal) => {
  const original = await importOriginal<typeof import("./storage")>();
  return {
    ...original,
    saveAccounts: vi.fn().mockResolvedValue(undefined),
    saveAccountsReplace: vi.fn().mockResolvedValue(undefined),
    removeAccountFromStorage: vi.fn().mockResolvedValue(undefined),
  };
});

/** Promise.withResolvers stand-in: that API needs Node 22, and CI runs Node 20. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("AccountManager", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal("process", { ...process, pid: 0 });
  });

  it("treats on-disk storage as source of truth, even when empty", () => {
    const fallback: OAuthAuthDetails = {
      type: "oauth",
      refresh: "r1|p1",
      access: "access",
      expires: 123,
    };

    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [],
      activeIndex: 0,
    };

    const manager = new AccountManager(fallback, stored);
    expect(manager.getAccountCount()).toBe(0);
  });

  it("returns current account when not rate-limited for family", () => {
    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const account = manager.getCurrentOrNextForFamily(family);

    expect(account).not.toBeNull();
    expect(account?.index).toBe(0);
  });

  it("switches to next account when current is rate-limited for family", () => {
    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const firstAccount = manager.getCurrentOrNextForFamily(family);
    manager.markRateLimited(firstAccount!, 60000, family);

    const secondAccount = manager.getCurrentOrNextForFamily(family);
    expect(secondAccount?.index).toBe(1);
  });

  it("returns null when all accounts are rate-limited for family", () => {
    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const accounts = manager.getAccounts();
    accounts.forEach((acc) => manager.markRateLimited(acc, 60000, family));

    const next = manager.getCurrentOrNextForFamily(family);
    expect(next).toBeNull();
  });

  it("skips accounts listed in excludeIndices (lets the retry loop make progress)", () => {
    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "gemini";
    const model = "antigravity-gemini-3.1-pro";

    // Excluding accounts 0 and 1 must yield account 2 — never an excluded one.
    const selected = manager.getCurrentOrNextForFamily(
      family, model, "hybrid", "antigravity", false, 100, 600_000, new Set([0, 1]),
    );
    expect(selected?.index).toBe(2);

    // Excluding every account must yield null (so the caller stops switching).
    const none = manager.getCurrentOrNextForFamily(
      family, model, "hybrid", "antigravity", false, 100, 600_000, new Set([0, 1, 2]),
    );
    expect(none).toBeNull();
  });

  it("un-rate-limits accounts after timeout expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";
    const account = manager.getCurrentOrNextForFamily(family);

    account!.rateLimitResetTimes[family] = Date.now() - 10000;

    const next = manager.getCurrentOrNextForFamily(family);
    expect(next?.parts.refreshToken).toBe("r1");
  });

  it("returns minimum wait time for family", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";
    const accounts = manager.getAccounts();

    manager.markRateLimited(accounts[0]!, 30000, family);
    manager.markRateLimited(accounts[1]!, 60000, family);

    expect(manager.getMinWaitTimeForFamily(family)).toBe(30000);
  });

  it("tracks rate limits per model family independently", () => {
    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);

    const account = manager.getCurrentOrNextForFamily("claude");
    expect(account?.index).toBe(0);

    manager.markRateLimited(account!, 60000, "claude");

    expect(manager.getMinWaitTimeForFamily("claude")).toBeGreaterThan(0);
    expect(manager.getMinWaitTimeForFamily("gemini")).toBe(0);

    const geminiOnAccount0 = manager.getNextForFamily("gemini");
    expect(geminiOnAccount0?.index).toBe(0);

    const claudeBlocked = manager.getNextForFamily("claude");
    expect(claudeBlocked).toBeNull();
  });

  it("getCurrentOrNextForFamily sticks to same account until rate-limited", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const first = manager.getCurrentOrNextForFamily(family);
    expect(first?.parts.refreshToken).toBe("r1");

    const second = manager.getCurrentOrNextForFamily(family);
    expect(second?.parts.refreshToken).toBe("r1");

    const third = manager.getCurrentOrNextForFamily(family);
    expect(third?.parts.refreshToken).toBe("r1");

    manager.markRateLimited(first!, 60_000, family);

    const fourth = manager.getCurrentOrNextForFamily(family);
    expect(fourth?.parts.refreshToken).toBe("r2");

    const fifth = manager.getCurrentOrNextForFamily(family);
    expect(fifth?.parts.refreshToken).toBe("r2");
  });

  it("removes an account and keeps cursor consistent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 1,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const picked = manager.getCurrentOrNextForFamily(family);
    expect(picked?.parts.refreshToken).toBe("r2");

    manager.removeAccount(picked!);
    expect(manager.getAccountCount()).toBe(2);

    const next = manager.getNextForFamily(family);
    expect(next?.parts.refreshToken).toBe("r3");
  });

  it("attaches fallback access tokens only to the matching stored account", () => {
    const fallback: OAuthAuthDetails = {
      type: "oauth",
      refresh: "r2|p2",
      access: "access-2",
      expires: 123,
    };

    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(fallback, stored);
    const snapshot = manager.getAccountsSnapshot();

    expect(snapshot[0]?.access).toBeUndefined();
    expect(snapshot[0]?.expires).toBeUndefined();
    expect(snapshot[1]?.access).toBe("access-2");
    expect(snapshot[1]?.expires).toBe(123);
  });

  it("debounces toast display for same account", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);

    expect(manager.shouldShowAccountToast(0)).toBe(true);
    manager.markToastShown(0);

    expect(manager.shouldShowAccountToast(0)).toBe(false);

    expect(manager.shouldShowAccountToast(1)).toBe(true);

    vi.setSystemTime(new Date(31000));
    expect(manager.shouldShowAccountToast(0)).toBe(true);
  });

  describe("header style fallback for Gemini", () => {
    it("tracks rate limits separately for each header style", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 60000, "gemini", "antigravity");

      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "antigravity")).toBe(true);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "gemini-cli")).toBe(false);
    });

    it("getAvailableHeaderStyle returns antigravity first for Gemini", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBe("antigravity");
    });

    it("getAvailableHeaderStyle returns gemini-cli when antigravity is rate-limited", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 60000, "gemini", "antigravity");

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBe("gemini-cli");
    });

    it("getAvailableHeaderStyle returns null when both header styles are rate-limited", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 60000, "gemini", "antigravity");
      manager.markRateLimited(account!, 60000, "gemini", "gemini-cli");

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBeNull();
    });

    it("getAvailableHeaderStyle always returns antigravity for Claude", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      expect(manager.getAvailableHeaderStyle(account!, "claude")).toBe("antigravity");
    });

    it("getAvailableHeaderStyle returns null for Claude when rate-limited", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markRateLimited(account!, 60000, "claude", "antigravity");

      expect(manager.getAvailableHeaderStyle(account!, "claude")).toBeNull();
    });

    it("Gemini rate limits expire independently per header style", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 30000, "gemini", "antigravity");
      manager.markRateLimited(account!, 60000, "gemini", "gemini-cli");

      vi.setSystemTime(new Date(35000));

      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "antigravity")).toBe(false);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "gemini-cli")).toBe(true);

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBe("antigravity");
    });

    it("getMinWaitTimeForFamily considers both Gemini header styles", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 30000, "gemini", "antigravity");

      expect(manager.getMinWaitTimeForFamily("gemini")).toBe(0);

      manager.markRateLimited(account!, 60000, "gemini", "gemini-cli");

      expect(manager.getMinWaitTimeForFamily("gemini")).toBe(30000);
    });
  });

  describe("per-family account tracking", () => {
    it("tracks current account independently per model family", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);

      const claudeAccount = manager.getCurrentOrNextForFamily("claude");
      expect(claudeAccount?.parts.refreshToken).toBe("r1");

      manager.markRateLimited(claudeAccount!, 60000, "claude");

      const nextClaude = manager.getCurrentOrNextForFamily("claude");
      expect(nextClaude?.parts.refreshToken).toBe("r2");

      const geminiAccount = manager.getCurrentOrNextForFamily("gemini");
      expect(geminiAccount?.parts.refreshToken).toBe("r1");
    });

    it("switching Claude account does not affect Gemini account selection", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);

      expect(manager.getCurrentOrNextForFamily("gemini")?.parts.refreshToken).toBe("r1");

      const claude1 = manager.getCurrentOrNextForFamily("claude");
      manager.markRateLimited(claude1!, 60000, "claude");

      expect(manager.getCurrentOrNextForFamily("claude")?.parts.refreshToken).toBe("r2");
      expect(manager.getCurrentOrNextForFamily("gemini")?.parts.refreshToken).toBe("r1");

      const claude2 = manager.getCurrentOrNextForFamily("claude");
      manager.markRateLimited(claude2!, 60000, "claude");

      expect(manager.getCurrentOrNextForFamily("claude")?.parts.refreshToken).toBe("r3");
      expect(manager.getCurrentOrNextForFamily("gemini")?.parts.refreshToken).toBe("r1");
    });

    it("persists per-family indices to storage", async () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);

      const claude = manager.getCurrentOrNextForFamily("claude");
      manager.markRateLimited(claude!, 60000, "claude");
      manager.getCurrentOrNextForFamily("claude");

      expect(manager.getCurrentAccountForFamily("claude")?.index).toBe(1);
      expect(manager.getCurrentAccountForFamily("gemini")?.index).toBe(0);
    });

    it("loads per-family indices from storage", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
        activeIndexByFamily: {
          claude: 2,
          gemini: 1,
        },
      };

      const manager = new AccountManager(undefined, stored);

      expect(manager.getCurrentAccountForFamily("claude")?.parts.refreshToken).toBe("r3");
      expect(manager.getCurrentAccountForFamily("gemini")?.parts.refreshToken).toBe("r2");
    });

    it("falls back to activeIndex when activeIndexByFamily is not present", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 1,
      };

      const manager = new AccountManager(undefined, stored);

      expect(manager.getCurrentAccountForFamily("claude")?.parts.refreshToken).toBe("r2");
      expect(manager.getCurrentAccountForFamily("gemini")?.parts.refreshToken).toBe("r2");
    });
  });

  describe("account cooldown (non-429 errors)", () => {
    it("marks account as cooling down with reason", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account!, 30000, "auth-failure");

      expect(manager.isAccountCoolingDown(account!)).toBe(true);
    });

    it("cooldown expires after duration", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account!, 30000, "network-error");

      expect(manager.isAccountCoolingDown(account!)).toBe(true);

      vi.setSystemTime(new Date(35000));

      expect(manager.isAccountCoolingDown(account!)).toBe(false);
    });

    it("clearAccountCooldown removes cooldown state", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account!, 30000, "auth-failure");
      expect(manager.isAccountCoolingDown(account!)).toBe(true);

      manager.clearAccountCooldown(account!);
      expect(manager.isAccountCoolingDown(account!)).toBe(false);
    });

    it("cooling down account is skipped in getCurrentOrNextForFamily", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account1 = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account1!, 30000, "project-error");

      const next = manager.getCurrentOrNextForFamily("claude");
      expect(next?.parts.refreshToken).toBe("r2");
    });

    it("cooldown is independent from rate limits", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markAccountCoolingDown(account!, 30000, "auth-failure");

      expect(manager.isAccountCoolingDown(account!)).toBe(true);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "antigravity")).toBe(false);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "gemini-cli")).toBe(false);
    });
  });

  describe("account selection strategies", () => {
    describe("sticky strategy (default)", () => {
      it("returns same account on consecutive calls", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        const second = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        const third = manager.getCurrentOrNextForFamily("claude", null, "sticky");

        expect(first?.index).toBe(0);
        expect(second?.index).toBe(0);
        expect(third?.index).toBe(0);
      });

      it("switches account only when current is rate-limited", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        expect(first?.index).toBe(0);

        manager.markRateLimited(first!, 60000, "claude");

        const second = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        expect(second?.index).toBe(1);
      });
    });

    describe("round-robin strategy", () => {
      it("rotates to next account on each call", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const second = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const third = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const fourth = manager.getCurrentOrNextForFamily("claude", null, "round-robin");

        const indices = [first?.index, second?.index, third?.index, fourth?.index];
        expect(new Set(indices).size).toBeGreaterThanOrEqual(2);
      });

      it("skips rate-limited accounts", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const accounts = manager.getAccounts();
        manager.markRateLimited(accounts[1]!, 60000, "claude");

        const first = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const second = manager.getCurrentOrNextForFamily("claude", null, "round-robin");

        expect(first?.index).not.toBe(1);
        expect(second?.index).not.toBe(1);
      });
    });

    describe("hybrid strategy", () => {
      it("returns fresh (untouched) accounts first", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        const second = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        const third = manager.getCurrentOrNextForFamily("claude", null, "hybrid");

        const indices = [first?.index, second?.index, third?.index];
        expect(indices).toContain(0);
        expect(indices).toContain(1);
        expect(indices).toContain(2);
      });

      it("continues to return valid accounts after all touched", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        manager.getCurrentOrNextForFamily("claude", null, "hybrid");

        const third = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        const fourth = manager.getCurrentOrNextForFamily("claude", null, "hybrid");

        expect(third).not.toBeNull();
        expect(fourth).not.toBeNull();
        expect([0, 1]).toContain(third?.index);
        expect([0, 1]).toContain(fourth?.index);
      });
    });

    describe("hybrid strategy with token bucket", () => {
      it("returns account based on health and token availability", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        expect(first).not.toBeNull();
        expect([0, 1, 2]).toContain(first?.index);
      });

      it("skips rate-limited accounts", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const accounts = manager.getAccounts();
        manager.markRateLimited(accounts[0]!, 60000, "claude");

        const selected = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        expect(selected?.index).toBe(1);
      });

      it("skips cooling down accounts", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const accounts = manager.getAccounts();
        manager.markAccountCoolingDown(accounts[0]!, 60000, "auth-failure");

        const selected = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        expect(selected?.index).toBe(1);
      });

      it("falls back to sticky when all accounts unavailable", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(0));

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const selected = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        expect(selected?.index).toBe(0);
      });

      it("updates lastUsed and currentAccountIndexByFamily on selection", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(5000));

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const selected = manager.getCurrentOrNextForFamily("claude", null, "hybrid");

        expect(selected).not.toBeNull();
        expect(selected!.lastUsed).toBe(5000);
        expect(manager.getCurrentAccountForFamily("claude")?.index).toBe(selected?.index);
      });
    });
  });

  describe("touchedForQuota tracking", () => {
    it("marks account as touched with timestamp", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1000));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      manager.markTouchedForQuota(account, "claude:antigravity");

      expect(account.touchedForQuota["claude:antigravity"]).toBe(1000);
    });

    it("isFreshForQuota returns true for untouched accounts", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      expect(manager.isFreshForQuota(account, "claude:antigravity")).toBe(true);
    });

    it("isFreshForQuota returns false for recently touched accounts", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1000));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      manager.markTouchedForQuota(account, "claude:antigravity");

      expect(manager.isFreshForQuota(account, "claude:antigravity")).toBe(false);
    });

    it("isFreshForQuota returns true after quota reset time passes", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1000));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      manager.markTouchedForQuota(account, "claude");
      expect(manager.isFreshForQuota(account, "claude")).toBe(false);
      
      manager.markRateLimited(account, 60000, "claude", "antigravity");
      
      vi.setSystemTime(new Date(70000));
      expect(manager.isFreshForQuota(account, "claude")).toBe(true);
    });
  });

  describe("consecutiveFailures tracking", () => {
    it("initializes consecutiveFailures as undefined", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      expect(account.consecutiveFailures).toBeUndefined();
    });

    it("can increment and reset consecutiveFailures", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      account.consecutiveFailures = (account.consecutiveFailures ?? 0) + 1;
      expect(account.consecutiveFailures).toBe(1);

      account.consecutiveFailures = (account.consecutiveFailures ?? 0) + 1;
      expect(account.consecutiveFailures).toBe(2);

      account.consecutiveFailures = 0;
      expect(account.consecutiveFailures).toBe(0);
    });
  });

  describe("Issue #147: headerStyle-aware account selection", () => {
    it("skips account when requested headerStyle is rate-limited even if other style is available", () => {
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
      const firstAccount = manager.getCurrentOrNextForFamily("gemini");

      // Mark ONLY antigravity as rate-limited (gemini-cli is still available)
      manager.markRateLimited(firstAccount!, 60000, "gemini", "antigravity");

      // Verify: antigravity is limited, gemini-cli is not
      expect(manager.isRateLimitedForHeaderStyle(firstAccount!, "gemini", "antigravity")).toBe(true);
      expect(manager.isRateLimitedForHeaderStyle(firstAccount!, "gemini", "gemini-cli")).toBe(false);

      // BUG: When we explicitly request antigravity headerStyle, 
      // we should skip this account and get the next one
      // Current behavior: returns the same account because "family" is not fully limited
      const nextAccount = manager.getCurrentOrNextForFamily(
        "gemini", 
        null, 
        "sticky", 
        "antigravity"  // Explicitly requesting antigravity
      );

      // Verifies headerStyle-aware account selection: should skip account 0
      // because its antigravity quota is limited, even though gemini-cli is available
      expect(nextAccount?.index).toBe(1);
    });

    it("returns same account when a different headerStyle is rate-limited", () => {
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
      const firstAccount = manager.getCurrentOrNextForFamily("gemini");

      // Mark gemini-cli as rate-limited (antigravity is still available)
      manager.markRateLimited(firstAccount!, 60000, "gemini", "gemini-cli");

      // When requesting antigravity, should return the same account
      // because antigravity quota is still available
      const nextAccount = manager.getCurrentOrNextForFamily(
        "gemini", 
        null, 
        "sticky", 
        "antigravity"  // Requesting antigravity which is NOT limited
      );

      expect(nextAccount?.index).toBe(0); // Should stay on account 0
    });
  });

  describe("Issue #174: saveToDisk throttling", () => {
    it("requestSaveToDisk coalesces multiple calls into one write", async () => {
      vi.useFakeTimers();

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const saveSpy = vi.spyOn(manager, "saveToDisk").mockResolvedValue();

      manager.requestSaveToDisk();
      manager.requestSaveToDisk();
      manager.requestSaveToDisk();

      expect(saveSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1500);

      expect(saveSpy).toHaveBeenCalledTimes(1);

      saveSpy.mockRestore();
    });

    it("flushSaveToDisk waits for pending save to complete", async () => {
      vi.useFakeTimers();

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const saveSpy = vi.spyOn(manager, "saveToDisk").mockResolvedValue();

      manager.requestSaveToDisk();

      const flushPromise = manager.flushSaveToDisk();

      await vi.advanceTimersByTimeAsync(1500);
      await flushPromise;

      expect(saveSpy).toHaveBeenCalledTimes(1);

      saveSpy.mockRestore();
    });

    it("does not save again if no new requestSaveToDisk after flush", async () => {
      vi.useFakeTimers();

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const saveSpy = vi.spyOn(manager, "saveToDisk").mockResolvedValue();

      manager.requestSaveToDisk();
      await vi.advanceTimersByTimeAsync(1500);

      expect(saveSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(3000);

      expect(saveSpy).toHaveBeenCalledTimes(1);

      saveSpy.mockRestore();
    });

    it("waits for an in-flight save before persisting a revoked-account removal", async () => {
      const staleSave = deferred();
      vi.mocked(storageModule.saveAccounts).mockImplementationOnce(async () => staleSave.promise);
      vi.mocked(storageModule.removeAccountFromStorage).mockClear();
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "revoked", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "valid", projectId: "p2", addedAt: 2, lastUsed: 0 },
        ],
        activeIndex: 0,
      };
      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0];
      if (!account) throw new Error("Revoked account not found");

      const inFlightSave = manager.saveToDisk();
      await vi.waitFor(() => expect(storageModule.saveAccounts).toHaveBeenCalledOnce());
      manager.removeAccount(account);
      const removal = manager.persistAccountRemoval("revoked");
      await Promise.resolve();

      expect(storageModule.removeAccountFromStorage).not.toHaveBeenCalled();
      staleSave.resolve();
      await inFlightSave;
      await removal;
      expect(storageModule.removeAccountFromStorage).toHaveBeenCalledWith("revoked");
    });
  });

  describe("Rate Limit Reason Classification", () => {
    it("getMinWaitTimeForFamily respects strict header style", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 30000, "gemini", "antigravity", "gemini-3-pro-image");

      expect(
        manager.getMinWaitTimeForFamily(
          "gemini",
          "gemini-3-pro-image",
          "antigravity",
          true,
        ),
      ).toBe(30000);

      expect(manager.getMinWaitTimeForFamily("gemini", "gemini-3-pro-image")).toBe(0);
    });

    describe("parseRateLimitReason", () => {
      it("parses QUOTA_EXHAUSTED from reason field", () => {
        expect(parseRateLimitReason("QUOTA_EXHAUSTED", undefined)).toBe("QUOTA_EXHAUSTED");
        expect(parseRateLimitReason("quota_exhausted", undefined)).toBe("QUOTA_EXHAUSTED");
      });

      it("parses RATE_LIMIT_EXCEEDED from reason field", () => {
        expect(parseRateLimitReason("RATE_LIMIT_EXCEEDED", undefined)).toBe("RATE_LIMIT_EXCEEDED");
      });

      it("parses MODEL_CAPACITY_EXHAUSTED from reason field", () => {
        expect(parseRateLimitReason("MODEL_CAPACITY_EXHAUSTED", undefined)).toBe("MODEL_CAPACITY_EXHAUSTED");
      });

      it("falls back to message parsing when reason is absent", () => {
        expect(parseRateLimitReason(undefined, "Rate limit exceeded per minute")).toBe("RATE_LIMIT_EXCEEDED");
        expect(parseRateLimitReason(undefined, "Too many requests")).toBe("RATE_LIMIT_EXCEEDED");
        expect(parseRateLimitReason(undefined, "Quota exhausted for today")).toBe("QUOTA_EXHAUSTED");
      });

      it("returns UNKNOWN when no pattern matches", () => {
        expect(parseRateLimitReason(undefined, "Some other error")).toBe("UNKNOWN");
        expect(parseRateLimitReason(undefined, undefined)).toBe("UNKNOWN");
      });
    });

    describe("calculateBackoffMs", () => {
      it("uses retryAfterMs when provided", () => {
        expect(calculateBackoffMs("QUOTA_EXHAUSTED", 0, 120_000)).toBe(120_000);
        expect(calculateBackoffMs("RATE_LIMIT_EXCEEDED", 0, 45_000)).toBe(45_000);
      });

      it("enforces minimum 2s backoff", () => {
        expect(calculateBackoffMs("QUOTA_EXHAUSTED", 0, 500)).toBe(2_000);
        expect(calculateBackoffMs("RATE_LIMIT_EXCEEDED", 0, 1_000)).toBe(2_000);
      });

      it("applies exponential backoff for QUOTA_EXHAUSTED", () => {
        expect(calculateBackoffMs("QUOTA_EXHAUSTED", 0)).toBe(60_000);
        expect(calculateBackoffMs("QUOTA_EXHAUSTED", 1)).toBe(300_000);
        expect(calculateBackoffMs("QUOTA_EXHAUSTED", 2)).toBe(1_800_000);
        expect(calculateBackoffMs("QUOTA_EXHAUSTED", 3)).toBe(7_200_000);
        expect(calculateBackoffMs("QUOTA_EXHAUSTED", 10)).toBe(7_200_000);
      });

      it("returns fixed backoff for RATE_LIMIT_EXCEEDED", () => {
        expect(calculateBackoffMs("RATE_LIMIT_EXCEEDED", 0)).toBe(30_000);
        expect(calculateBackoffMs("RATE_LIMIT_EXCEEDED", 5)).toBe(30_000);
      });

      it("returns short backoff for MODEL_CAPACITY_EXHAUSTED", () => {
        // Base backoff is 45s with ±15s jitter (range: 30s to 60s)
        const result = calculateBackoffMs("MODEL_CAPACITY_EXHAUSTED", 0);
        expect(result).toBeGreaterThanOrEqual(30_000);
        expect(result).toBeLessThanOrEqual(60_000);
      });

      it("returns soft retry for SERVER_ERROR", () => {
        expect(calculateBackoffMs("SERVER_ERROR", 0)).toBe(20_000);
      });

      it("returns default backoff for UNKNOWN", () => {
        expect(calculateBackoffMs("UNKNOWN", 0)).toBe(60_000);
      });
    });

    describe("markRateLimitedWithReason", () => {
      it("tracks consecutive failures and applies escalating backoff", () => {
        vi.useFakeTimers();
        vi.setSystemTime(1000);

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const account = manager.getAccounts()[0]!;

        const backoff1 = manager.markRateLimitedWithReason(
          account, "gemini", "antigravity", null, "QUOTA_EXHAUSTED"
        );
        expect(backoff1).toBe(60_000);
        expect(account.consecutiveFailures).toBe(1);

        const backoff2 = manager.markRateLimitedWithReason(
          account, "gemini", "antigravity", null, "QUOTA_EXHAUSTED"
        );
        expect(backoff2).toBe(300_000);
        expect(account.consecutiveFailures).toBe(2);

        const backoff3 = manager.markRateLimitedWithReason(
          account, "gemini", "antigravity", null, "QUOTA_EXHAUSTED"
        );
        expect(backoff3).toBe(1_800_000);
        expect(account.consecutiveFailures).toBe(3);

        vi.useRealTimers();
      });

      it("uses provided retryAfterMs over calculated backoff", () => {
        vi.useFakeTimers();
        vi.setSystemTime(1000);

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const account = manager.getAccounts()[0]!;

        const backoff = manager.markRateLimitedWithReason(
          account, "gemini", "antigravity", null, "QUOTA_EXHAUSTED", 180_000
        );
        expect(backoff).toBe(180_000);

        vi.useRealTimers();
      });
    });

    describe("markRequestSuccess", () => {
      it("resets consecutive failure counter", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const account = manager.getAccounts()[0]!;

        account.consecutiveFailures = 5;
        manager.markRequestSuccess(account);
        expect(account.consecutiveFailures).toBe(0);
      });
    });

    describe("Optimistic Reset", () => {
      it("shouldTryOptimisticReset returns true when min wait time <= 2s", () => {
        vi.useFakeTimers();
        vi.setSystemTime(10_000);

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0, rateLimitResetTimes: { "gemini-antigravity": 11_500, "gemini-cli": 11_500 } },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        expect(manager.shouldTryOptimisticReset("gemini")).toBe(true);

        vi.useRealTimers();
      });

      it("shouldTryOptimisticReset returns false when min wait time > 2s", () => {
        vi.useFakeTimers();
        vi.setSystemTime(10_000);

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0, rateLimitResetTimes: { "gemini-antigravity": 15_000, "gemini-cli": 15_000 } },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        expect(manager.shouldTryOptimisticReset("gemini")).toBe(false);

        vi.useRealTimers();
      });

      it("shouldTryOptimisticReset returns false when accounts are available", () => {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        expect(manager.shouldTryOptimisticReset("gemini")).toBe(false);
      });

      it("clearAllRateLimitsForFamily clears rate limits and failure counters", () => {
        vi.useFakeTimers();
        vi.setSystemTime(10_000);

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0, rateLimitResetTimes: { "gemini-antigravity": 70_000, "gemini-cli": 80_000 } },
            { refreshToken: "r2", projectId: "p2", addedAt: 2, lastUsed: 0, rateLimitResetTimes: { "gemini-antigravity": 90_000 } },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const accounts = manager.getAccounts();
        accounts[0]!.consecutiveFailures = 3;
        accounts[1]!.consecutiveFailures = 2;

        manager.clearAllRateLimitsForFamily("gemini");

        expect(accounts[0]!.rateLimitResetTimes["gemini-antigravity"]).toBeUndefined();
        expect(accounts[0]!.rateLimitResetTimes["gemini-cli"]).toBeUndefined();
        expect(accounts[1]!.rateLimitResetTimes["gemini-antigravity"]).toBeUndefined();
        expect(accounts[0]!.consecutiveFailures).toBe(0);
        expect(accounts[1]!.consecutiveFailures).toBe(0);

        vi.useRealTimers();
      });
    });
  });

  describe("Failure TTL Expiration", () => {
    it("resets consecutiveFailures when lastFailureTime exceeds TTL", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      // First failure
      manager.markRateLimitedWithReason(account!, "claude", "antigravity", null, "QUOTA_EXHAUSTED", null, 3600_000);
      expect(account!.consecutiveFailures).toBe(1);
      expect(account!.lastFailureTime).toBe(0);

      // Advance time past TTL (1 hour = 3600s)
      vi.setSystemTime(new Date(3700_000)); // 3700 seconds later

      // Next failure should reset count because TTL expired
      manager.markRateLimitedWithReason(account!, "claude", "antigravity", null, "QUOTA_EXHAUSTED", null, 3600_000);
      expect(account!.consecutiveFailures).toBe(1); // Reset to 0, then +1

      vi.useRealTimers();
    });

    it("keeps consecutiveFailures when within TTL", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      // First failure
      manager.markRateLimitedWithReason(account!, "claude", "antigravity", null, "QUOTA_EXHAUSTED", null, 3600_000);
      expect(account!.consecutiveFailures).toBe(1);

      // Advance time within TTL
      vi.setSystemTime(new Date(1800_000)); // 30 minutes later (within 1 hour TTL)

      // Next failure should increment
      manager.markRateLimitedWithReason(account!, "claude", "antigravity", null, "QUOTA_EXHAUSTED", null, 3600_000);
      expect(account!.consecutiveFailures).toBe(2);

      vi.useRealTimers();
    });
  });

  describe("Fingerprint History", () => {
    it("regenerateAccountFingerprint saves old fingerprint to history", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");
      
      // Set initial fingerprint
      const originalFingerprint = account!.fingerprint;
      
      // Regenerate
      const newFingerprint = manager.regenerateAccountFingerprint(0);
      
      expect(newFingerprint).not.toBeNull();
      expect(newFingerprint).not.toEqual(originalFingerprint);
      expect(account!.fingerprintHistory?.length).toBeGreaterThanOrEqual(0);
    });

    it("restoreAccountFingerprint restores from history", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1000)); // Start at 1000 to avoid 0 being falsy

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.getCurrentOrNextForFamily("claude");
      
      // Generate initial fingerprint
      const original = manager.regenerateAccountFingerprint(0);
      const originalDeviceId = original?.deviceId;
      
      vi.setSystemTime(new Date(2000));
      
      // Generate second fingerprint (pushes first to history at index 0)
      manager.regenerateAccountFingerprint(0);
      
      // History[0] should be the "original" fingerprint
      const history = manager.getAccountFingerprintHistory(0);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0]?.fingerprint.deviceId).toBe(originalDeviceId);
      
      vi.setSystemTime(new Date(3000));
      
      // Restore from history[0] - should get the "original" back
      // Note: restore also pushes current to history, so after restore:
      // - Current = original fingerprint
      // - History[0] = what was current before restore
      const restored = manager.restoreAccountFingerprint(0, 0);
      
      expect(restored).not.toBeNull();
      expect(restored?.deviceId).toBe(originalDeviceId);

      vi.useRealTimers();
    });

    it("getAccountFingerprintHistory returns empty array for new account", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      
      const history = manager.getAccountFingerprintHistory(0);
      expect(history).toEqual([]);
    });

    it("limits fingerprint history to MAX_FINGERPRINT_HISTORY", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      
      // Regenerate 7 times (should only keep 5 in history)
      for (let i = 0; i < 7; i++) {
        manager.regenerateAccountFingerprint(0);
      }
      
      const history = manager.getAccountFingerprintHistory(0);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe("soft quota threshold", () => {
    it("skips account over soft quota threshold in sticky mode", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 2, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.05, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);
      expect(account?.parts.refreshToken).toBe("r2");
    });

    it("allows gemini-cli selection when only Antigravity quota is exhausted", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };
      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { "gemini-pro": { remainingFraction: 0, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily(
        "gemini",
        "gemini-2.5-pro",
        "sticky",
        "gemini-cli",
        false,
        90,
      );

      expect(account?.parts.refreshToken).toBe("r1");
    });

    it("fails open for a cached quota whose reset time has elapsed", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-28T16:00:00Z"));
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };
      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, {
        claude: {
          remainingFraction: 0.05,
          resetTime: "2026-01-28T15:00:00Z",
          modelCount: 1,
        },
      });

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);

      expect(account?.parts.refreshToken).toBe("r1");
      vi.useRealTimers();
    });

    it("allows account under soft quota threshold", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.15, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);
      expect(account?.parts.refreshToken).toBe("r1");
    });

    it("threshold of 100 disables soft quota protection", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.01, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 100);
      expect(account?.parts.refreshToken).toBe("r1");
    });

    it("returns null when all accounts over threshold", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 2, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.05, modelCount: 1 } });
      manager.updateQuotaCache(1, { claude: { remainingFraction: 0.08, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);
      expect(account).toBeNull();
    });

    it("returns null in hybrid mode when every account is over soft quota threshold", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 2, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { "gemini-pro": { remainingFraction: 0, modelCount: 1 } });
      manager.updateQuotaCache(1, { "gemini-pro": { remainingFraction: 0, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily("gemini", null, "hybrid", "antigravity", false, 90);
      expect(account).toBeNull();
    });

    it("skips account over threshold in round-robin mode", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 2, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.05, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily("claude", null, "round-robin", "antigravity", false, 90);
      expect(account?.parts.refreshToken).toBe("r2");
    });

    it("account without cached quota is not skipped", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);
      expect(account?.parts.refreshToken).toBe("r1");
    });

    it("handles remainingFraction of 0 (fully exhausted)", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 2, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0, modelCount: 1 } });

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);
      expect(account?.parts.refreshToken).toBe("r2");
    });

    it("ignores stale quota cache (over 10 minutes old)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.05, modelCount: 1 } });

      vi.setSystemTime(new Date(11 * 60 * 1000));

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);
      expect(account?.parts.refreshToken).toBe("r1");

      vi.useRealTimers();
    });

    it("fails open when cachedQuotaUpdatedAt is missing", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const acc = (manager as any).accounts[0];
      acc.cachedQuota = { claude: { remainingFraction: 0.05, modelCount: 1 } };
      acc.cachedQuotaUpdatedAt = undefined;

      const account = manager.getCurrentOrNextForFamily("claude", null, "sticky", "antigravity", false, 90);
      expect(account?.parts.refreshToken).toBe("r1");
    });
  });

  describe("getMinWaitTimeForSoftQuota", () => {
    it("returns 0 when accounts are available (under threshold)", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.15, modelCount: 1 } });

      const waitMs = manager.getMinWaitTimeForSoftQuota("claude", 90, 10 * 60 * 1000);
      expect(waitMs).toBe(0);
    });

    it("returns null when no resetTime available", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { claude: { remainingFraction: 0.05, modelCount: 1 } });

      const waitMs = manager.getMinWaitTimeForSoftQuota("claude", 90, 10 * 60 * 1000);
      expect(waitMs).toBeNull();
    });

    it("returns wait time from resetTime when over threshold", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-28T10:00:00Z"));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { 
        claude: { 
          remainingFraction: 0.05, 
          resetTime: "2026-01-28T15:00:00Z",
          modelCount: 1 
        } 
      });

      const waitMs = manager.getMinWaitTimeForSoftQuota("claude", 90, 10 * 60 * 1000);
      expect(waitMs).toBe(5 * 60 * 60 * 1000);

      vi.useRealTimers();
    });

    it("returns 0 when resetTime is in the past because the account is available", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-28T16:00:00Z"));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { 
        claude: { 
          remainingFraction: 0.05, 
          resetTime: "2026-01-28T15:00:00Z",
          modelCount: 1 
        } 
      });

      const waitMs = manager.getMinWaitTimeForSoftQuota("claude", 90, 10 * 60 * 1000);
      expect(waitMs).toBe(0);

      vi.useRealTimers();
    });

    it("returns minimum wait time across multiple accounts", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-28T10:00:00Z"));

      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 2, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      manager.updateQuotaCache(0, { 
        claude: { remainingFraction: 0.05, resetTime: "2026-01-28T15:00:00Z", modelCount: 1 } 
      });
      manager.updateQuotaCache(1, { 
        claude: { remainingFraction: 0.08, resetTime: "2026-01-28T12:00:00Z", modelCount: 1 } 
      });

      const waitMs = manager.getMinWaitTimeForSoftQuota("claude", 90, 10 * 60 * 1000);
      expect(waitMs).toBe(2 * 60 * 60 * 1000);

      vi.useRealTimers();
    });
  });

  describe("hybrid strategy uses style-aware rate-limit check", () => {
    it("does not select an account whose requested header-style pool is exhausted (other style has room)", () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const family: ModelFamily = "gemini";
      const model = "antigravity-gemini-3.1-pro";

      // Exhaust ONLY the antigravity pool for this model; gemini-cli still has room.
      const account = manager.getAccounts()[0]!;
      manager.markRateLimited(account, 60_000, family, "antigravity", model);

      // isRateLimitedForFamily would report false here (cli pool has room), so the
      // buggy hybrid branch would happily select this account for antigravity.
      const selected = manager.getCurrentOrNextForFamily(
        family, model, "hybrid", "antigravity", false, 100, 600_000,
      );

      // With the style-aware check, no account is available for antigravity.
      expect(selected).toBeNull();

      // Sanity: the same account IS available for the gemini-cli style.
      const cliSelected = manager.getCurrentOrNextForFamily(
        family, model, "hybrid", "gemini-cli", false, 100, 600_000,
      );
      expect(cliSelected?.index).toBe(0);
    });
  });

  describe("flushSaveToDisk awaits in-flight writes", () => {
    it("resolves only after a write triggered by requestSaveToDisk has settled", async () => {
      vi.useFakeTimers();
      try {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };
        const manager = new AccountManager(undefined, stored);

        let resolveSave: (() => void) | undefined;
        let saveCompleted = false;
        const saveToDiskSpy = vi
          .spyOn(manager, "saveToDisk")
          .mockImplementation(
            () =>
              new Promise<void>((resolve) => {
                resolveSave = () => {
                  saveCompleted = true;
                  resolve();
                };
              }),
          );

        // Schedule a debounced save and let the 1s timer fire → executeSave starts,
        // clears savePending, and begins the (still pending) write.
        manager.requestSaveToDisk();
        await vi.advanceTimersByTimeAsync(1000);
        expect(saveToDiskSpy).toHaveBeenCalledTimes(1);
        expect(saveCompleted).toBe(false);

        // flushSaveToDisk must NOT resolve while the write is still in flight.
        let flushResolved = false;
        const flush = manager.flushSaveToDisk().then(() => {
          flushResolved = true;
        });
        await Promise.resolve();
        expect(flushResolved).toBe(false);

        // Complete the in-flight write; only now may flush resolve.
        resolveSave?.();
        await flush;
        expect(flushResolved).toBe(true);
        expect(saveCompleted).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("resolves only after BOTH an active save and a newer pending save settle", async () => {
      vi.useFakeTimers();
      try {
        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };
        const manager = new AccountManager(undefined, stored);

        const resolvers: Array<() => void> = [];
        const saveToDiskSpy = vi
          .spyOn(manager, "saveToDisk")
          .mockImplementation(
            () => new Promise<void>((resolve) => { resolvers.push(resolve); }),
          );

        // Save A: schedule + fire timer → executeSave A starts write #1 (in flight),
        // savePending cleared, activeSave = A.
        manager.requestSaveToDisk();
        await vi.advanceTimersByTimeAsync(1000);
        expect(saveToDiskSpy).toHaveBeenCalledTimes(1);

        // Save B: a NEWER debounced save is scheduled while A is still in flight.
        manager.requestSaveToDisk();

        let flushResolved = false;
        const flush = manager.flushSaveToDisk().then(() => { flushResolved = true; });
        await Promise.resolve();
        expect(flushResolved).toBe(false);

        // Complete A. flush must NOT resolve — B's timer has not even fired yet.
        resolvers[0]?.();
        await vi.advanceTimersByTimeAsync(0);
        expect(flushResolved).toBe(false);

        // B's debounce timer fires → executeSave B starts write #2 (in flight).
        await vi.advanceTimersByTimeAsync(1000);
        expect(saveToDiskSpy).toHaveBeenCalledTimes(2);
        expect(flushResolved).toBe(false);

        // Only after B settles may flush resolve.
        resolvers[1]?.();
        await flush;
        expect(flushResolved).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("snapshot records cleared quota keys", () => {
    it("emits a clearedQuotaKeys marker so a cleared limit survives merge", async () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };
      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      manager.markRateLimited(account, 60_000, "claude");
      // Optimistic reset clears the claude limit in memory.
      manager.clearAllRateLimitsForFamily("claude");

      const saveSpy = vi.mocked(storageModule.saveAccounts);
      saveSpy.mockClear();
      await manager.saveToDisk();

      expect(saveSpy).toHaveBeenCalledTimes(1);
      const snapshot = saveSpy.mock.calls[0]![0];
      const persisted = snapshot.accounts[0]!;
      expect(persisted.rateLimitResetTimes?.claude).toBeUndefined();
      expect(persisted.clearedQuotaKeys?.claude).toBeGreaterThan(0);
    });

    it("prunes expired, superseded, and dead markers from memory during serialization", async () => {
      const stored: AccountStorageV4 = {
        version: 4,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };
      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;
      const now = Date.now();

      // Expired clear marker (older than TTL) — must be dropped in place.
      account.clearedQuotaKeys["claude"] = now - RATE_LIMIT_CLEAR_TTL_MS - 60_000;
      // Superseded clear marker (a live limit exists for the same key) — must be dropped.
      account.rateLimitResetTimes["gemini-antigravity"] = now + 1_000_000;
      account.rateLimitSetTimes["gemini-antigravity"] = now;
      account.clearedQuotaKeys["gemini-antigravity"] = now;
      // Dead set timestamp (no live limit for the key) — must be dropped.
      account.rateLimitSetTimes["gemini-cli"] = now;
      // A valid, current clear marker — must survive.
      account.clearedQuotaKeys["gemini-cli"] = now;

      const saveSpy = vi.mocked(storageModule.saveAccounts);
      saveSpy.mockClear();
      await manager.saveToDisk();

      // In-memory maps were pruned in place.
      expect(account.clearedQuotaKeys["claude"]).toBeUndefined();
      expect(account.clearedQuotaKeys["gemini-antigravity"]).toBeUndefined();
      expect(account.rateLimitSetTimes["gemini-cli"]).toBeUndefined();
      // Live-limit set marker and the valid clear marker survive.
      expect(account.rateLimitSetTimes["gemini-antigravity"]).toBe(now);
      expect(account.clearedQuotaKeys["gemini-cli"]).toBe(now);

      // The persisted snapshot reflects the pruned state.
      const persisted = saveSpy.mock.calls[0]![0].accounts[0]!;
      expect(persisted.clearedQuotaKeys).toEqual({ "gemini-cli": now });
      expect(persisted.rateLimitSetTimes).toEqual({ "gemini-antigravity": now });
    });

    it("records the cleared generation (setAt) when a limit passively expires", async () => {
      vi.useFakeTimers();
      try {
        const base = 1_000_000;
        vi.setSystemTime(new Date(base));

        const stored: AccountStorageV4 = {
          version: 4,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };
        const manager = new AccountManager(undefined, stored);
        const account = manager.getAccounts()[0]!;

        // Limit set at `base` (this is the generation).
        manager.markRateLimited(account, 1_000, "claude");
        expect(account.rateLimitSetTimes["claude"]).toBe(base);

        // Time advances past the reset → passive expiry records a tombstone.
        vi.setSystemTime(new Date(base + 5_000));
        // Any read path triggers clearExpiredRateLimits.
        manager.getMinWaitTimeForFamily("claude");

        const saveSpy = vi.mocked(storageModule.saveAccounts);
        saveSpy.mockClear();
        await manager.saveToDisk();

        const persisted = saveSpy.mock.calls[0]![0].accounts[0]!;
        expect(persisted.rateLimitResetTimes?.claude).toBeUndefined();
        // The tombstone is versioned with the GENERATION it cleared (the original setAt),
        // not merely the wall-clock time of expiry.
        expect(persisted.clearedSetTimes?.claude).toBe(base);
        expect(persisted.clearedQuotaKeys?.claude).toBe(base + 5_000);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

describe("resolveQuotaGroup", () => {
  it("returns model-based quota group when model is provided", () => {
    expect(resolveQuotaGroup("claude", "claude-opus-4-6-thinking")).toBe("claude");
    expect(resolveQuotaGroup("gemini", "gemini-2.5-pro")).toBe("gemini-pro");
    expect(resolveQuotaGroup("gemini", "gemini-2.5-flash")).toBe("gemini-flash");
  });

  it("falls back to claude for claude family when no model", () => {
    expect(resolveQuotaGroup("claude", null)).toBe("claude");
    expect(resolveQuotaGroup("claude", undefined)).toBe("claude");
  });

  it("falls back to gemini-pro for gemini family when no model", () => {
    expect(resolveQuotaGroup("gemini", null)).toBe("gemini-pro");
    expect(resolveQuotaGroup("gemini", undefined)).toBe("gemini-pro");
  });

  it("model takes precedence over family", () => {
    // Even if family says claude, model determines the quota group
    expect(resolveQuotaGroup("gemini", "gemini-2.5-flash")).toBe("gemini-flash");
    expect(resolveQuotaGroup("gemini", "gemini-3-pro")).toBe("gemini-pro");
  });
});
