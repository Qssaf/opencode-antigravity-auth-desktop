import { afterEach, describe, expect, it } from "vitest";

import { startOAuthListener } from "./server";
import type { OAuthListener } from "./server";

const CALLBACK = "http://127.0.0.1:51121/oauth-callback";

describe("startOAuthListener", () => {
  let listener: OAuthListener | undefined;

  afterEach(async () => {
    await listener?.close().catch(() => {});
    listener = undefined;
  });

  it("resolves with the redirect that carries the authorization code", async () => {
    listener = await startOAuthListener();
    const callback = listener.waitForCallback();

    const response = await fetch(`${CALLBACK}?code=abc&state=xyz`);

    expect(response.status).toBe(200);
    const url = await callback;
    expect(url.searchParams.get("code")).toBe("abc");
  });

  it("fails the login, not reports success, when Google returns an error", async () => {
    listener = await startOAuthListener();
    const callback = listener.waitForCallback();
    callback.catch(() => {});

    const response = await fetch(`${CALLBACK}?error=access_denied&state=xyz`);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("access_denied");
    await expect(callback).rejects.toThrow("access_denied");
  });

  it("keeps waiting when a request reaches the callback path without a code", async () => {
    listener = await startOAuthListener();
    const callback = listener.waitForCallback();

    const stray = await fetch(CALLBACK);
    expect(stray.status).toBe(400);

    const response = await fetch(`${CALLBACK}?code=later&state=xyz`);
    expect(response.status).toBe(200);
    expect((await callback).searchParams.get("code")).toBe("later");
  });
});
