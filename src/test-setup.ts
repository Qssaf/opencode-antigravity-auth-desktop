import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, vi } from "vitest";

// Every test file starts in a throwaway config directory. Without it a test
// that does not set its own reads the user's antigravity.json and accounts,
// and with `debug` on there writes log files that rotate their real logs away.
const testConfigDir = mkdtempSync(join(tmpdir(), "antigravity-test-config-"));
process.env.OPENCODE_CONFIG_DIR = testConfigDir;
afterAll(() => rmSync(testConfigDir, { recursive: true, force: true }));

// Tests stub `fetch` for Google's endpoints; the HTTP/2 client the plugin
// uses for them is routed through it. google-http.test.ts tests the
// real client.
vi.mock("./antigravity/google-http", async (importOriginal) => {
  const original = await importOriginal<typeof import("./antigravity/google-http")>();
  return {
    ...original,
    googleRequest: (url: string, init: RequestInit) => fetch(url, init),
    googleFetch: (url: string | URL, init?: RequestInit) => fetch(url, init),
  };
});
