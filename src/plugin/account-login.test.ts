import { describe, expect, it, vi } from "vitest";

vi.mock("../antigravity/oauth", () => ({
  authorizeAntigravity: vi.fn(),
  exchangeAntigravity: vi.fn(async () => ({
    type: "success",
    refresh: "new-refresh",
    access: "access",
    expires: Date.now() + 3_600_000,
    email: "a@example.com",
    projectId: "",
  })),
}));

vi.mock("./account-admin", () => ({
  loadAccountPool: vi.fn(async () => ({ accounts: [{ email: "a@example.com" }, { email: "b@example.com" }] })),
}));

const { completePastedLogin } = await import("./account-login");

describe("completePastedLogin", () => {
  it("reports a sign-in to a stored account as renewing that account, not as a failed add", async () => {
    const result = await completePastedLogin(
      {
        openBrowser: vi.fn(),
        getStateFromAuthorizationUrl: vi.fn(),
        parseOAuthCallbackInput: () => ({ code: "code", state: "state" }),
        persistAccountPool: vi.fn(async () => {}),
      },
      "code",
      "state",
    );

    expect(result).toMatchObject({ ok: true, added: false, total: 2 });
    expect(result.message).toContain("Signed in again as a@example.com: its saved sign-in was renewed.");
  });
});
