import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountQuotaResult } from "./quota";
import type { AccountStorageV4 } from "./storage";
import type { PluginClient } from "./types";

const checkAccountsQuota = vi.hoisted(() => vi.fn());

// The renderer is the unit under test; the network call it wraps is not.
vi.mock("./quota", async (importOriginal) => {
  const original = await importOriginal<typeof import("./quota")>();
  return { ...original, checkAccountsQuota };
});

const { renderQuota } = await import("./account-admin");

const client = {} as PluginClient;

let configDir: string;

function storage(): AccountStorageV4 {
  return {
    version: 4,
    accounts: [
      { email: "first@example.com", refreshToken: "token-1", addedAt: 1, lastUsed: 2, enabled: true },
      { email: "second@example.com", refreshToken: "token-2", addedAt: 1, lastUsed: 2, enabled: true },
    ],
    activeIndex: 0,
  };
}

function quotaResult(index: number, email: string, overrides: Partial<AccountQuotaResult> = {}): AccountQuotaResult {
  const inTwoDays = new Date(Date.now() + 2 * 86400000 + 3600000).toISOString();
  return {
    index,
    email,
    status: "ok",
    rateLimits: {
      groups: [
        {
          displayName: "Gemini models",
          buckets: [
            { bucketId: "g-w", displayName: "Weekly", window: "weekly", remainingFraction: 0.57, disabled: false, resetTime: inTwoDays },
            { bucketId: "g-5", displayName: "5 hour", window: "5h", remainingFraction: 1, disabled: false },
          ],
        },
        {
          displayName: "Claude and GPT models",
          buckets: [
            { bucketId: "c-w", displayName: "Weekly", window: "weekly", remainingFraction: 0.99, disabled: false },
            { bucketId: "c-5", displayName: "5 hour", window: "5h", remainingFraction: 0, disabled: true },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe("renderQuota", () => {
  beforeEach(async () => {
    configDir = await fs.mkdtemp(join(tmpdir(), "antigravity-quota-"));
    process.env.OPENCODE_CONFIG_DIR = configDir;
    await fs.writeFile(
      join(configDir, "antigravity-accounts.json"),
      JSON.stringify(storage()),
      "utf-8",
    );
    checkAccountsQuota.mockReset();
  });

  afterEach(async () => {
    delete process.env.OPENCODE_CONFIG_DIR;
    await fs.rm(configDir, { recursive: true, force: true });
  });

  it("puts both windows for both model groups in one row per account", async () => {
    checkAccountsQuota.mockResolvedValue([
      quotaResult(0, "first@example.com"),
      quotaResult(1, "second@example.com", { disabled: true }),
    ]);

    const output = await renderQuota(client, "google");
    const [first] = output.split("\n").filter((line) => line.includes("first@example.com"));

    expect(output).toContain("Gemini weekly");
    expect(output).toContain("Claude/GPT 5-hour");
    // 57% with its countdown, then a full 5-hour pool.
    expect(first).toMatch(/57% \(2d [^)]+\)/);
    expect(first).toContain("100%");
    expect(first).toContain("ACTIVE");
    // An exhausted bucket is called out rather than shown as a bare 0%.
    expect(output).toContain("[exhausted]");
    expect(output.split("\n").find((line) => line.includes("second@example.com"))).toContain("DISABLED");
  });

  it("reports N/A for a window the backend did not return", async () => {
    checkAccountsQuota.mockResolvedValue([
      quotaResult(0, "first@example.com", { rateLimits: { groups: [] } }),
    ]);

    const output = await renderQuota(client, "google");

    expect(output).toContain("N/A");
  });

  it("keeps a failed account in the table with its error", async () => {
    checkAccountsQuota.mockResolvedValue([
      { index: 0, email: "first@example.com", status: "error", error: "Token refresh failed" },
    ]);

    const output = await renderQuota(client, "google");

    expect(output).toContain("ERROR");
    expect(output).toContain("Token refresh failed");
  });

  it("lists every bucket and model pool when detailed", async () => {
    checkAccountsQuota.mockResolvedValue([
      quotaResult(0, "first@example.com", {
        quota: { groups: { claude: { remainingFraction: 0.4, modelCount: 2 } }, modelCount: 2 },
        geminiCliQuota: { models: [{ modelId: "gemini-3-pro", remainingFraction: 0.8 }] },
      }),
    ]);

    const output = await renderQuota(client, "google", { detailed: true });

    expect(output).toContain("Gemini models");
    expect(output).toContain("Claude and GPT models");
    expect(output).toContain("Model pools (5-hour)");
    expect(output).toContain("CLI gemini-3-pro");
  });

  it("says so when no account is stored", async () => {
    await fs.rm(join(configDir, "antigravity-accounts.json"));

    expect(await renderQuota(client, "google")).toContain("No Google accounts are stored");
    expect(checkAccountsQuota).not.toHaveBeenCalled();
  });
});
