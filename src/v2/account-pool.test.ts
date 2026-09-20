/**
 * Accounts from OpenCode 1.x live in `antigravity-accounts.json`, not in
 * OpenCode 2.x's credential store. Callers that read `getAuth()` directly (the
 * `google_search` tool, model discovery) must still see an account, otherwise
 * they report "not authenticated" while ordinary requests work.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const loadAccounts = vi.fn();

vi.mock("./proxy", () => ({ registerProxyRoute: vi.fn() }));
vi.mock("../plugin", () => ({ createAntigravityRuntime: vi.fn(), oauthFlowHelpers: {} }));
vi.mock("../plugin/storage", () => ({ loadAccounts }));

const { promoteAccountFromPool } = await import("./runtime");

function account(overrides: Record<string, unknown> = {}) {
  return {
    email: "a@example.com",
    refreshToken: "refresh-a",
    projectId: "project-a",
    managedProjectId: "managed-a",
    addedAt: 1,
    lastUsed: 1,
    enabled: true,
    ...overrides,
  };
}

beforeEach(() => {
  loadAccounts.mockReset();
});

describe("promoteAccountFromPool", () => {
  it("promotes the active account as OAuth auth with a packed refresh string", async () => {
    loadAccounts.mockResolvedValue({ version: 4, accounts: [account()], activeIndex: 0 });
    const promoted = await promoteAccountFromPool();
    expect(promoted?.auth).toEqual({
      type: "oauth",
      refresh: "refresh-a|project-a|managed-a",
      access: "",
      expires: 0,
    });
  });

  it("follows the pool's active index", async () => {
    loadAccounts.mockResolvedValue({
      version: 4,
      accounts: [account(), account({ email: "b@example.com", refreshToken: "refresh-b" })],
      activeIndex: 1,
    });
    expect((await promoteAccountFromPool())?.auth).toMatchObject({ refresh: expect.stringContaining("refresh-b") });
  });

  it("skips a disabled active account", async () => {
    loadAccounts.mockResolvedValue({
      version: 4,
      accounts: [account({ enabled: false }), account({ refreshToken: "refresh-b" })],
      activeIndex: 0,
    });
    expect((await promoteAccountFromPool())?.auth).toMatchObject({ refresh: expect.stringContaining("refresh-b") });
  });

  it("falls back to the first usable account when the index is out of range", async () => {
    loadAccounts.mockResolvedValue({ version: 4, accounts: [account()], activeIndex: 7 });
    expect((await promoteAccountFromPool())?.auth).toMatchObject({ refresh: expect.stringContaining("refresh-a") });
  });

  it("gives different accounts different signatures so the loader re-runs", async () => {
    loadAccounts.mockResolvedValue({ version: 4, accounts: [account()], activeIndex: 0 });
    const first = await promoteAccountFromPool();
    loadAccounts.mockResolvedValue({
      version: 4,
      accounts: [account({ refreshToken: "refresh-b" })],
      activeIndex: 0,
    });
    const second = await promoteAccountFromPool();
    expect(second?.signature).not.toBe(first?.signature);
    expect(first?.signature).not.toContain("refresh-a");
  });

  it("returns nothing when the pool is empty, unusable or unreadable", async () => {
    loadAccounts.mockResolvedValue({ version: 4, accounts: [], activeIndex: 0 });
    expect(await promoteAccountFromPool()).toBeUndefined();

    loadAccounts.mockResolvedValue(null);
    expect(await promoteAccountFromPool()).toBeUndefined();

    loadAccounts.mockResolvedValue({ version: 4, accounts: [account({ enabled: false })], activeIndex: 0 });
    expect(await promoteAccountFromPool()).toBeUndefined();

    loadAccounts.mockResolvedValue({ version: 4, accounts: [account({ refreshToken: "" })], activeIndex: 0 });
    expect(await promoteAccountFromPool()).toBeUndefined();

    loadAccounts.mockRejectedValue(new Error("unreadable"));
    expect(await promoteAccountFromPool()).toBeUndefined();
  });
});
