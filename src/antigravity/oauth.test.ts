import { describe, expect, it } from "vitest";

import { authorizeAntigravity } from "./oauth";

describe("authorizeAntigravity", () => {
  it("asks Google to show the account chooser so another account can be added", async () => {
    const { url } = await authorizeAntigravity();
    const prompt = new URL(url).searchParams.get("prompt")?.split(" ") ?? [];

    // Without `select_account`, Google silently reuses the browser's current
    // session and a second login returns the account already in the pool.
    expect(prompt).toContain("select_account");
    // `consent` still has to be there, or Google may not issue a refresh token.
    expect(prompt).toContain("consent");
  });

  it("keeps PKCE and offline access on the authorization URL", async () => {
    const authorization = await authorizeAntigravity("my-project");
    const params = new URL(authorization.url).searchParams;

    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBeTruthy();
    expect(params.get("access_type")).toBe("offline");

    const state = JSON.parse(Buffer.from(params.get("state") ?? "", "base64url").toString("utf8"));
    expect(state.verifier).toBe(authorization.verifier);
    expect(state.projectId).toBe("my-project");
  });
});
