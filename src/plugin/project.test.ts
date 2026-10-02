import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureProjectContext, invalidateProjectContextCache, loadManagedProject, onboardManagedProject } from "./project";

describe("project context cache", () => {
  afterEach(() => {
    invalidateProjectContextCache();
  });

  it("hands back the caller's access token, not the one cached with the project", async () => {
    const refresh = "refresh-token|project|managed";
    await ensureProjectContext({ type: "oauth", refresh, access: "old-access", expires: 1 });

    const result = await ensureProjectContext({ type: "oauth", refresh, access: "new-access", expires: 2 });

    expect(result.effectiveProjectId).toBe("managed");
    expect(result.auth.access).toBe("new-access");
    expect(result.auth.expires).toBe(2);
  });
});

describe("project resolution requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bounds loadCodeAssist with a timeout, so a stalled endpoint cannot hang the first request", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ cloudaicompanionProject: "p" })));
    vi.stubGlobal("fetch", fetchMock);

    await loadManagedProject("access-token", "project");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("bounds onboardUser with a timeout", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ done: true, response: { cloudaicompanionProject: { id: "managed" } } })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(onboardManagedProject("access-token", "FREE", "project")).resolves.toBe("managed");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("moves on to the next endpoint when one fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("The operation was aborted due to timeout", "TimeoutError"))
      .mockResolvedValue(new Response(JSON.stringify({ cloudaicompanionProject: "p" })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadManagedProject("access-token", "project")).resolves.toEqual({ cloudaicompanionProject: "p" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
