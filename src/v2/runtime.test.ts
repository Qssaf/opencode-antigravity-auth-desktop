import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@opencode-ai/plugin", () => ({
  tool: Object.assign((definition: unknown) => definition, {
    schema: {
      string: () => ({ describe: () => ({}) }),
      boolean: () => ({ optional: () => ({ default: () => ({ describe: () => ({}) }) }) }),
      array: () => ({ optional: () => ({ describe: () => ({}) }) }),
    },
  }),
}));

import { acquireRuntime, RUNTIME_LINGER_MS, V2Runtime } from "./runtime";
import type { Context } from "./types";

function fakeContext(directory: string): Context {
  return { location: { directory } } as unknown as Context;
}

describe("acquireRuntime", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await fs.mkdtemp(join(tmpdir(), "antigravity-runtime-"));
    process.env.OPENCODE_CONFIG_DIR = configDir;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(async () => {
    // Let any lingering runtime from a test finish disposing.
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.OPENCODE_CONFIG_DIR;
    await fs.rm(configDir, { recursive: true, force: true });
  });

  it("reuses the runtime when a location attaches again right after the last one left", async () => {
    const dispose = vi.spyOn(V2Runtime.prototype, "dispose");
    const flush = vi.spyOn(V2Runtime.prototype, "flush");

    const first = await acquireRuntime(fakeContext(configDir));
    await first.release();
    // The account pool is saved as soon as the last location leaves.
    expect(flush).toHaveBeenCalledTimes(1);

    const second = await acquireRuntime(fakeContext(configDir));
    expect(second.runtime).toBe(first.runtime);

    await vi.advanceTimersByTimeAsync(RUNTIME_LINGER_MS * 2);
    expect(dispose).not.toHaveBeenCalled();
    await second.release();
  });

  it("disposes the runtime once nothing attaches within the linger time", async () => {
    const dispose = vi.spyOn(V2Runtime.prototype, "dispose");

    const first = await acquireRuntime(fakeContext(configDir));
    await first.release();
    expect(dispose).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(RUNTIME_LINGER_MS);
    expect(dispose).toHaveBeenCalledTimes(1);

    const next = await acquireRuntime(fakeContext(configDir));
    expect(next.runtime).not.toBe(first.runtime);
    await next.release();
  });
});
