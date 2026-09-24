import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  deduplicateAccountsByEmail,
  hashRefreshToken,
  migrateV2ToV3,
  loadAccounts,
  removeAccountFromStorage,
  saveAccounts,
  type AccountMetadata,
  type AccountStorage,
  type AccountStorageV4,
} from "./storage";
import { promises as fs } from "node:fs";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";

vi.mock("proper-lockfile", () => ({
  default: {
    lock: vi.fn().mockResolvedValue(vi.fn().mockResolvedValue(undefined)),
  },
}));

describe("deduplicateAccountsByEmail", () => {
  it("returns empty array for empty input", () => {
    const result = deduplicateAccountsByEmail([]);
    expect(result).toEqual([]);
  });

  it("returns single account unchanged", () => {
    const accounts: AccountMetadata[] = [
      {
        email: "test@example.com",
        refreshToken: "r1",
        addedAt: 1000,
        lastUsed: 2000,
      },
    ];
    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toEqual(accounts);
  });

  it("keeps accounts without email (cannot deduplicate)", () => {
    const accounts: AccountMetadata[] = [
      { refreshToken: "r1", addedAt: 1000, lastUsed: 2000 },
      { refreshToken: "r2", addedAt: 1100, lastUsed: 2100 },
    ];
    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toHaveLength(2);
    expect(result[0]?.refreshToken).toBe("r1");
    expect(result[1]?.refreshToken).toBe("r2");
  });

  it("deduplicates accounts with same email, keeping newest by lastUsed", () => {
    const accounts: AccountMetadata[] = [
      {
        email: "test@example.com",
        refreshToken: "old-token",
        addedAt: 1000,
        lastUsed: 1000,
      },
      {
        email: "test@example.com",
        refreshToken: "new-token",
        addedAt: 2000,
        lastUsed: 3000,
      },
    ];
    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toHaveLength(1);
    expect(result[0]?.refreshToken).toBe("new-token");
    expect(result[0]?.email).toBe("test@example.com");
  });

  it("deduplicates accounts with same email, keeping newest by addedAt when lastUsed is equal", () => {
    const accounts: AccountMetadata[] = [
      {
        email: "test@example.com",
        refreshToken: "old-token",
        addedAt: 1000,
        lastUsed: 0,
      },
      {
        email: "test@example.com",
        refreshToken: "new-token",
        addedAt: 2000,
        lastUsed: 0,
      },
    ];
    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toHaveLength(1);
    expect(result[0]?.refreshToken).toBe("new-token");
  });

  it("handles multiple duplicate emails correctly", () => {
    const accounts: AccountMetadata[] = [
      {
        email: "alice@example.com",
        refreshToken: "alice-old",
        addedAt: 1000,
        lastUsed: 1000,
      },
      {
        email: "bob@example.com",
        refreshToken: "bob-old",
        addedAt: 1000,
        lastUsed: 1000,
      },
      {
        email: "alice@example.com",
        refreshToken: "alice-new",
        addedAt: 2000,
        lastUsed: 3000,
      },
      {
        email: "bob@example.com",
        refreshToken: "bob-new",
        addedAt: 2000,
        lastUsed: 3000,
      },
      {
        email: "alice@example.com",
        refreshToken: "alice-mid",
        addedAt: 1500,
        lastUsed: 2000,
      },
    ];
    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toHaveLength(2);

    const alice = result.find((a) => a.email === "alice@example.com");
    const bob = result.find((a) => a.email === "bob@example.com");

    expect(alice?.refreshToken).toBe("alice-new");
    expect(bob?.refreshToken).toBe("bob-new");
  });

  it("preserves order of kept accounts based on newest entry index", () => {
    const accounts: AccountMetadata[] = [
      {
        email: "first@example.com",
        refreshToken: "first-old",
        addedAt: 1000,
        lastUsed: 1000,
      },
      {
        email: "second@example.com",
        refreshToken: "second-new",
        addedAt: 3000,
        lastUsed: 3000,
      },
      {
        email: "first@example.com",
        refreshToken: "first-new",
        addedAt: 2000,
        lastUsed: 2000,
      },
    ];
    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toHaveLength(2);
    // Kept entries are at indices 1 (second@) and 2 (first@), so order is second, first
    expect(result[0]?.email).toBe("second@example.com");
    expect(result[1]?.email).toBe("first@example.com");
  });

  it("mixes accounts with and without email correctly", () => {
    const accounts: AccountMetadata[] = [
      {
        email: "test@example.com",
        refreshToken: "r1",
        addedAt: 1000,
        lastUsed: 1000,
      },
      { refreshToken: "no-email-1", addedAt: 1500, lastUsed: 1500 },
      {
        email: "test@example.com",
        refreshToken: "r2",
        addedAt: 2000,
        lastUsed: 2000,
      },
      { refreshToken: "no-email-2", addedAt: 2500, lastUsed: 2500 },
    ];
    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toHaveLength(3);

    // no-email-1 at index 1
    // r2 (newest for test@example.com) at index 2
    // no-email-2 at index 3
    expect(result[0]?.refreshToken).toBe("no-email-1");
    expect(result[1]?.refreshToken).toBe("r2");
    expect(result[2]?.refreshToken).toBe("no-email-2");
  });

  it("handles exact scenario from issue #24 (11 duplicate accounts)", () => {
    // Simulate user logging in 11 times with the same account
    const accounts: AccountMetadata[] = [];
    for (let i = 0; i < 11; i++) {
      accounts.push({
        email: "user@example.com",
        refreshToken: `token-${i}`,
        addedAt: 1000 + i * 100,
        lastUsed: 1000 + i * 100,
      });
    }

    const result = deduplicateAccountsByEmail(accounts);
    expect(result).toHaveLength(1);
    expect(result[0]?.refreshToken).toBe("token-10"); // The newest one
    expect(result[0]?.email).toBe("user@example.com");
  });
});

describe("removeAccountFromStorage", () => {
  it("removes only the revoked identity while preserving concurrently added accounts", async () => {
    const stored = {
      version: 4,
      accounts: [
        { refreshToken: "revoked", email: "revoked@example.com", addedAt: 1, lastUsed: 1 },
        { refreshToken: "existing", email: "existing@example.com", addedAt: 2, lastUsed: 2 },
        { refreshToken: "concurrent", email: "concurrent@example.com", addedAt: 3, lastUsed: 3 },
      ],
      activeIndex: 2,
      activeIndexByFamily: { claude: 1, gemini: 2 },
    } satisfies AccountStorageV4;
    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      if (String(path).endsWith(".gitignore")) {
        return [
          "antigravity-accounts.json",
          "antigravity-accounts.json.*.tmp",
          "antigravity-signature-cache.json",
          "antigravity-logs/",
        ].join("\n");
      }
      return JSON.stringify(stored);
    });

    await removeAccountFromStorage("revoked");

    const saveCall = vi.mocked(fs.writeFile).mock.calls.find(
      ([path]) => String(path).includes(".tmp"),
    );
    if (!saveCall) throw new Error("Account storage was not written");
    const saved = JSON.parse(String(saveCall[1])) as AccountStorageV4;
    expect(saved.accounts.map((account) => account.refreshToken)).toEqual(["existing", "concurrent"]);
    expect(saved.activeIndex).toBe(1);
    expect(saved.activeIndexByFamily).toEqual({ claude: 0, gemini: 1 });
  });

  it("does not resurrect a removed account when a stale snapshot saves later", async () => {
    const initial: AccountStorageV4 = {
      version: 4,
      accounts: [
        { refreshToken: "revoked", addedAt: 1, lastUsed: 1 },
        { refreshToken: "valid", addedAt: 2, lastUsed: 2 },
      ],
      activeIndex: 1,
      activeIndexByFamily: { claude: 1, gemini: 1 },
    };
    let diskContent = JSON.stringify(initial);
    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      if (String(path).endsWith(".gitignore")) return "";
      return diskContent;
    });
    vi.mocked(fs.writeFile).mockImplementation(async (path, data) => {
      if (String(path).includes(".tmp")) diskContent = String(data);
    });

    await removeAccountFromStorage("revoked");
    await saveAccounts(initial);

    const saved = JSON.parse(diskContent) as AccountStorageV4;
    expect(saved.accounts.map((account) => account.refreshToken)).toEqual(["valid"]);
    expect(saved.activeIndex).toBe(0);
    expect(saved.activeIndexByFamily).toEqual({ claude: 0, gemini: 0 });
    expect(diskContent).not.toContain("revoked");
  });

  it("drops a replaced token instead of keeping it next to its replacement", async () => {
    // Signing in again as the same account swaps its refresh token. The save
    // merges by token, so only the tombstone keeps the old entry from staying.
    let diskContent = JSON.stringify({
      version: 4,
      accounts: [{ refreshToken: "old-token", email: "same@example.com", addedAt: 1, lastUsed: 1 }],
      activeIndex: 0,
    } satisfies AccountStorageV4);
    vi.mocked(fs.readFile).mockImplementation(async (path) => {
      if (String(path).endsWith(".gitignore")) return "";
      return diskContent;
    });
    vi.mocked(fs.writeFile).mockImplementation(async (path, data) => {
      if (String(path).includes(".tmp")) diskContent = String(data);
    });

    await saveAccounts({
      version: 4,
      accounts: [{ refreshToken: "new-token", email: "same@example.com", addedAt: 1, lastUsed: 2 }],
      activeIndex: 0,
      deletedRefreshTokenHashes: [hashRefreshToken("old-token")],
    });

    const saved = JSON.parse(diskContent) as AccountStorageV4;
    expect(saved.accounts.map((account) => account.refreshToken)).toEqual(["new-token"]);
  });
});

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn().mockResolvedValue(undefined),
      access: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn(),
      rename: vi.fn().mockResolvedValue(undefined),
      appendFile: vi.fn(),
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    appendFileSync: vi.fn(),
  };
});

describe("Storage Migration", () => {
  const now = Date.now();
  const future = now + 100000;
  const past = now - 100000;

  describe("migrateV2ToV3", () => {
    it("converts gemini rate limits to gemini-antigravity", () => {
      const v2: AccountStorage = {
        version: 2,
        accounts: [
          {
            refreshToken: "r1",
            addedAt: now,
            lastUsed: now,
            rateLimitResetTimes: {
              gemini: future,
            },
          },
        ],
        activeIndex: 0,
      };

      const v3 = migrateV2ToV3(v2);

      expect(v3.version).toBe(3);
      const account = v3.accounts[0];
      if (!account) throw new Error("Account not found");

      expect(account.rateLimitResetTimes).toEqual({
        "gemini-antigravity": future,
      });
      expect(account.rateLimitResetTimes?.["gemini-cli"]).toBeUndefined();
    });

    it("preserves claude rate limits", () => {
      const v2: AccountStorage = {
        version: 2,
        accounts: [
          {
            refreshToken: "r1",
            addedAt: now,
            lastUsed: now,
            rateLimitResetTimes: {
              claude: future,
            },
          },
        ],
        activeIndex: 0,
      };

      const v3 = migrateV2ToV3(v2);
      const account = v3.accounts[0];
      if (!account) throw new Error("Account not found");

      expect(account.rateLimitResetTimes).toEqual({
        claude: future,
      });
    });

    it("handles mixed rate limits correctly", () => {
      const v2: AccountStorage = {
        version: 2,
        accounts: [
          {
            refreshToken: "r1",
            addedAt: now,
            lastUsed: now,
            rateLimitResetTimes: {
              claude: future,
              gemini: future,
            },
          },
        ],
        activeIndex: 0,
      };

      const v3 = migrateV2ToV3(v2);
      const account = v3.accounts[0];
      if (!account) throw new Error("Account not found");

      expect(account.rateLimitResetTimes).toEqual({
        claude: future,
        "gemini-antigravity": future,
      });
    });

    it("filters out expired rate limits", () => {
      const v2: AccountStorage = {
        version: 2,
        accounts: [
          {
            refreshToken: "r1",
            addedAt: now,
            lastUsed: now,
            rateLimitResetTimes: {
              claude: past,
              gemini: future,
            },
          },
        ],
        activeIndex: 0,
      };

      const v3 = migrateV2ToV3(v2);
      const account = v3.accounts[0];
      if (!account) throw new Error("Account not found");

      expect(account.rateLimitResetTimes).toEqual({
        "gemini-antigravity": future,
      });
      expect(account.rateLimitResetTimes?.claude).toBeUndefined();
    });

    it("removes rateLimitResetTimes object if all keys are expired", () => {
      const v2: AccountStorage = {
        version: 2,
        accounts: [
          {
            refreshToken: "r1",
            addedAt: now,
            lastUsed: now,
            rateLimitResetTimes: {
              claude: past,
              gemini: past,
            },
          },
        ],
        activeIndex: 0,
      };

      const v3 = migrateV2ToV3(v2);
      const account = v3.accounts[0];
      if (!account) throw new Error("Account not found");

      expect(account.rateLimitResetTimes).toBeUndefined();
    });
  });

  describe("loadAccounts migration integration", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("keeps the selected account when email deduplication reorders accounts", async () => {
      // Given: the persisted index selects B between two versions of A.
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          version: 4,
          accounts: [
            {
              email: "a@example.com",
              refreshToken: "a-old",
              addedAt: 1,
              lastUsed: 1,
            },
            {
              email: "b@example.com",
              refreshToken: "b",
              addedAt: 2,
              lastUsed: 2,
            },
            {
              email: "a@example.com",
              refreshToken: "a-new",
              addedAt: 3,
              lastUsed: 3,
            },
          ],
          activeIndex: 1,
        }),
      );

      // When: storage is loaded and A's old entry is removed.
      const result = await loadAccounts();

      // Then: B remains the active account even though it moved to index zero.
      expect(result?.accounts.map((account) => account.email)).toEqual([
        "b@example.com",
        "a@example.com",
      ]);
      expect(result?.activeIndex).toBe(0);
      expect(result?.accounts[result.activeIndex ?? 0]?.email).toBe(
        "b@example.com",
      );
    });

    it("remaps family selections by account identity after email deduplication", async () => {
      // Given: Claude selects A while Gemini selects B in the persisted ordering.
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          version: 4,
          accounts: [
            {
              email: "a@example.com",
              refreshToken: "a-old",
              addedAt: 1,
              lastUsed: 1,
            },
            {
              email: "b@example.com",
              refreshToken: "b",
              addedAt: 2,
              lastUsed: 2,
            },
            {
              email: "a@example.com",
              refreshToken: "a-new",
              addedAt: 3,
              lastUsed: 3,
            },
          ],
          activeIndex: 0,
          activeIndexByFamily: {
            claude: 0,
            gemini: 1,
          },
        }),
      );

      // When: storage is loaded and duplicate emails are compacted.
      const result = await loadAccounts();

      // Then: family choices still resolve to their originally selected emails.
      expect(result?.activeIndex).toBe(1);
      expect(result?.activeIndexByFamily).toEqual({
        claude: 1,
        gemini: 0,
      });
      expect(
        result?.accounts[result.activeIndexByFamily?.claude ?? 0]?.email,
      ).toBe("a@example.com");
      expect(
        result?.accounts[result.activeIndexByFamily?.gemini ?? 0]?.email,
      ).toBe("b@example.com");
    });

    it("migrates V2 storage on load and persists V4", async () => {
      const v2Data = {
        version: 2,
        accounts: [
          {
            refreshToken: "r1",
            addedAt: now,
            lastUsed: now,
            rateLimitResetTimes: {
              gemini: future,
            },
          },
        ],
        activeIndex: 0,
      };

      // Mock readFile to return different values based on path
      vi.mocked(fs.readFile).mockImplementation((path) => {
        if ((path as string).endsWith(".gitignore")) {
          const error = new Error("ENOENT") as NodeJS.ErrnoException;
          error.code = "ENOENT";
          return Promise.reject(error);
        }
        return Promise.resolve(JSON.stringify(v2Data));
      });

      const result = await loadAccounts();

      expect(result).not.toBeNull();
      expect(result?.version).toBe(4);

      const account = result?.accounts[0];
      if (!account) throw new Error("Account not found");

      expect(account.rateLimitResetTimes).toEqual({
        "gemini-antigravity": future,
      });

      expect(fs.writeFile).toHaveBeenCalled();
      
      const saveCall = vi.mocked(fs.writeFile).mock.calls.find(
        (call) => (call[0] as string).includes(".tmp")
      );
      if (!saveCall) throw new Error("saveAccounts was not called (tmp file not found)");

      const savedContent = JSON.parse(saveCall[1] as string);
      expect(savedContent.version).toBe(4);
      expect(savedContent.accounts[0].rateLimitResetTimes).toEqual({
        "gemini-antigravity": future,
      });

      const gitignoreCall = vi.mocked(fs.writeFile).mock.calls.find(
        (call) => (call[0] as string).includes(".gitignore")
      );
      expect(gitignoreCall).toBeDefined();
    });
  });

  describe("ensureGitignore", () => {
    const configDir = "/tmp/opencode-test";

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("creates .gitignore when file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: "ENOENT" });

      const { ensureGitignore } = await import("./storage");
      await ensureGitignore(configDir);

      expect(fs.writeFile).toHaveBeenCalled();
      const [path, content] = vi.mocked(fs.writeFile).mock.calls[0]!;
      expect(path).toContain(".gitignore");
      expect(content).toContain("antigravity-accounts.json");
      expect(content).toContain("antigravity-signature-cache.json");
      expect(content).toContain("antigravity-logs/");
    });

    it("appends missing entries to existing .gitignore", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("existing-entry");

      const { ensureGitignore } = await import("./storage");
      await ensureGitignore(configDir);

      expect(fs.appendFile).toHaveBeenCalled();
      const [path, content] = vi.mocked(fs.appendFile).mock.calls[0]!;
      expect(path).toContain(".gitignore");
      expect(content).toContain("antigravity-accounts.json");
      expect((content as string).startsWith("\n")).toBe(true);
    });

    it("does nothing when all entries already exist", async () => {
      const existing = [
        ".gitignore",
        "antigravity-accounts.json",
        "antigravity-accounts.json.*.tmp",
        "antigravity-signature-cache.json",
        "antigravity-logs/",
      ].join("\n");
      vi.mocked(fs.readFile).mockResolvedValue(existing);

      const { ensureGitignore } = await import("./storage");
      await ensureGitignore(configDir);

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it("handles permission errors gracefully", async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: "EACCES" });

      const { ensureGitignore } = await import("./storage");
      await expect(ensureGitignore(configDir)).resolves.not.toThrow();

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe("ensureGitignoreSync", () => {
    const configDir = "/tmp/opencode-test-sync";

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("creates .gitignore when file does not exist", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const { ensureGitignoreSync } = await import("./storage");
      ensureGitignoreSync(configDir);

      expect(writeFileSync).toHaveBeenCalled();
      const [path, content] = vi.mocked(writeFileSync).mock.calls[0]!;
      expect(path).toContain(".gitignore");
      expect(content).toContain("antigravity-accounts.json");
      expect(content).toContain("antigravity-signature-cache.json");
      expect(content).toContain("antigravity-logs/");
    });

    it("appends missing entries to existing .gitignore", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue("existing-entry");

      const { ensureGitignoreSync } = await import("./storage");
      ensureGitignoreSync(configDir);

      expect(appendFileSync).toHaveBeenCalled();
      const [path, content] = vi.mocked(appendFileSync).mock.calls[0]!;
      expect(path).toContain(".gitignore");
      expect(content).toContain("antigravity-accounts.json");
      expect((content as string).startsWith("\n")).toBe(true);
    });

    it("does nothing when all entries already exist", async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const existing = [
        ".gitignore",
        "antigravity-accounts.json",
        "antigravity-accounts.json.*.tmp",
        "antigravity-signature-cache.json",
        "antigravity-logs/",
      ].join("\n");
      vi.mocked(readFileSync).mockReturnValue(existing);

      const { ensureGitignoreSync } = await import("./storage");
      ensureGitignoreSync(configDir);

      expect(writeFileSync).not.toHaveBeenCalled();
      expect(appendFileSync).not.toHaveBeenCalled();
    });
  });
});

describe("saveAccounts merge — cleared rate limits are not resurrected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockDisk(existing: AccountStorageV4): void {
    vi.mocked(fs.readFile).mockImplementation((path) => {
      if ((path as string).endsWith(".gitignore")) {
        const error = new Error("ENOENT") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        return Promise.reject(error);
      }
      return Promise.resolve(JSON.stringify(existing));
    });
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
  }

  function readMergedSnapshot(): AccountStorageV4 {
    const tmpCall = vi.mocked(fs.writeFile).mock.calls.find(
      (call) => (call[0] as string).includes(".tmp"),
    );
    if (!tmpCall) throw new Error("atomic write (tmp file) not found");
    return JSON.parse(tmpCall[1] as string) as AccountStorageV4;
  }

  it("does not re-merge a rate-limit key that was cleared in the incoming snapshot", async () => {
    // On disk: account r1 is rate-limited for claude.
    mockDisk({
      version: 4,
      accounts: [
        {
          email: "a@example.com",
          refreshToken: "r1",
          addedAt: 1,
          lastUsed: 5,
          rateLimitResetTimes: { claude: 9_999_999_999_999 },
        },
      ],
      activeIndex: 0,
    });

    // Incoming snapshot: same account, claude limit CLEARED. The snapshot carries an
    // explicit clearedQuotaKeys marker so the merge drops the stale on-disk value.
    await saveAccounts({
      version: 4,
      accounts: [
        {
          email: "a@example.com",
          refreshToken: "r1",
          addedAt: 1,
          lastUsed: 6,
          rateLimitResetTimes: {},
          clearedQuotaKeys: { claude: Date.now() },
        },
      ],
      activeIndex: 0,
    });

    const merged = readMergedSnapshot();
    expect(merged.accounts).toHaveLength(1);
    // The cleared limit must NOT be resurrected from disk.
    expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBeUndefined();
  });

  it("preserves a concurrent per-pool update on the same account (no whole-object loss)", async () => {
    // On disk: instance A already recorded a claude limit for this account.
    mockDisk({
      version: 4,
      accounts: [
        {
          email: "a@example.com",
          refreshToken: "r1",
          addedAt: 1,
          lastUsed: 5,
          rateLimitResetTimes: { claude: 9_999_999_999_999 },
        },
      ],
      activeIndex: 0,
    });

    // Incoming: a stale instance B writes a DIFFERENT pool (gemini-antigravity) and
    // never touched claude (no claude limit, no claude clear marker). A whole-object
    // replace would delete A's claude limit; the per-key union must keep both.
    await saveAccounts({
      version: 4,
      accounts: [
        {
          email: "a@example.com",
          refreshToken: "r1",
          addedAt: 1,
          lastUsed: 6,
          rateLimitResetTimes: { "gemini-antigravity": 8_888_888_888_888 },
        },
      ],
      activeIndex: 0,
    });

    const merged = readMergedSnapshot();
    expect(merged.accounts[0]?.rateLimitResetTimes).toEqual({
      claude: 9_999_999_999_999,
      "gemini-antigravity": 8_888_888_888_888,
    });
  });

  it("a re-set limit supersedes a clear marker for the same key", async () => {
    mockDisk({
      version: 4,
      accounts: [
        {
          email: "a@example.com",
          refreshToken: "r1",
          addedAt: 1,
          lastUsed: 5,
          // Disk still remembers an old clear for claude...
          clearedQuotaKeys: { claude: Date.now() - 1000 },
        },
      ],
      activeIndex: 0,
    });

    // ...but the live writer has re-set a claude limit. The limit must win and the
    // stale clear marker must not survive.
    await saveAccounts({
      version: 4,
      accounts: [
        {
          email: "a@example.com",
          refreshToken: "r1",
          addedAt: 1,
          lastUsed: 6,
          rateLimitResetTimes: { claude: 7_777_777_777_777 },
        },
      ],
      activeIndex: 0,
    });

    const merged = readMergedSnapshot();
    expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBe(7_777_777_777_777);
    expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBeUndefined();
  });

  it("falls back to the on-disk limits when incoming omits the field entirely", async () => {
    // Foreign/older writer stored a limit on disk.
    mockDisk({
      version: 4,
      accounts: [
        {
          email: "a@example.com",
          refreshToken: "r1",
          addedAt: 1,
          lastUsed: 5,
          rateLimitResetTimes: { claude: 9_999_999_999_999 },
        },
      ],
      activeIndex: 0,
    });

    // Incoming has NO rateLimitResetTimes (undefined) — should not wipe disk state.
    await saveAccounts({
      version: 4,
      accounts: [
        { email: "a@example.com", refreshToken: "r1", addedAt: 1, lastUsed: 6 },
      ],
      activeIndex: 0,
    });

    const merged = readMergedSnapshot();
    expect(merged.accounts[0]?.rateLimitResetTimes).toEqual({
      claude: 9_999_999_999_999,
    });
  });

  it("still unions accounts from the in-memory snapshot and disk", async () => {
    mockDisk({
      version: 4,
      accounts: [
        { email: "disk@example.com", refreshToken: "disk", addedAt: 1, lastUsed: 5 },
      ],
      activeIndex: 0,
    });

    await saveAccounts({
      version: 4,
      accounts: [
        {
          email: "mem@example.com",
          refreshToken: "mem",
          addedAt: 2,
          lastUsed: 6,
          rateLimitResetTimes: {},
        },
      ],
      activeIndex: 0,
    });

    const merged = readMergedSnapshot();
    const tokens = merged.accounts.map((a) => a.refreshToken).sort();
    expect(tokens).toEqual(["disk", "mem"]);
  });

  describe("conflicts resolve by mutation order (setAt vs clearedAt)", () => {
    const nowTs = Date.now();
    const FUTURE = nowTs + 1_000_000_000;
    const T_OLD = nowTs - 20_000;
    const T_NEW = nowTs - 1_000;
    const TTL_MS = 24 * 60 * 60 * 1000;

    it("a stale incoming CLEAR does not erase a NEWER re-limit on disk", async () => {
      // Disk: account was re-limited recently (setAt = T_NEW).
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: FUTURE },
            rateLimitSetTimes: { claude: T_NEW },
          },
        ],
        activeIndex: 0,
      });

      // Incoming: a delayed writer that cleared claude EARLIER (clearedAt = T_OLD).
      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: {},
            clearedQuotaKeys: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // Newer set beats older clear → the re-limit survives.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBe(FUTURE);
      expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBeUndefined();
    });

    it("a stale incoming SET does not resurrect an OLDER cleared limit on disk", async () => {
      // Disk: claude was cleared recently (clearedAt = T_NEW), and that tombstone cleared
      // generation T_OLD — the very generation the stale writer below still holds.
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            clearedQuotaKeys: { claude: T_NEW },
            clearedSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      // Incoming: a delayed writer whose claude limit was set EARLIER (setAt = T_OLD).
      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: { claude: FUTURE },
            rateLimitSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // Newer clear beats older set → the stale limit is NOT resurrected.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBeUndefined();
      expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBe(T_NEW);
    });

    it("a NEWER incoming clear beats an older disk set (same generation)", async () => {
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: FUTURE },
            rateLimitSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      // Incoming cleared exactly the generation on disk (clearedSetAt = T_OLD).
      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: {},
            clearedQuotaKeys: { claude: T_NEW },
            clearedSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBeUndefined();
      expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBe(T_NEW);
    });

    it("an EXPIRED incoming tombstone does not delete a live disk limit (TTL filtered once)", async () => {
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: FUTURE },
            rateLimitSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      // Incoming tombstone is older than the TTL → must be ignored entirely.
      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: {},
            clearedQuotaKeys: { claude: nowTs - TTL_MS - 60_000 },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // Live limit preserved; the expired tombstone neither deletes it nor is re-persisted.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBe(FUTURE);
      expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBeUndefined();
    });

    it("passive expiry in a stale process does not erase a newer limit (generation-versioned tombstone)", async () => {
      // Interleaving:
      //  - Process B held an OLD claude limit set at T_OLD.
      //  - Process A wrote a NEWER claude limit set at T_NEW (T_OLD < T_NEW), now on disk.
      //  - Process B only now notices its OLD limit expired and records a tombstone with
      //    clearedAt = FRESH (later than T_NEW) but that cleared GENERATION T_OLD.
      const FRESH = nowTs; // clearedAt is later than the newer set — would win under naive ordering.
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: FUTURE },
            rateLimitSetTimes: { claude: T_NEW },
          },
        ],
        activeIndex: 0,
      });

      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: {},
            clearedQuotaKeys: { claude: FRESH },
            clearedSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // The tombstone only cleared generation T_OLD; the newer T_NEW limit survives even
      // though its clearedAt is later.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBe(FUTURE);
      expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBeUndefined();
    });

    it("a tombstone still supersedes the generation it actually cleared", async () => {
      // Disk holds the very generation (T_OLD) that the incoming tombstone cleared.
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: FUTURE },
            rateLimitSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: {},
            clearedQuotaKeys: { claude: T_NEW },
            clearedSetTimes: { claude: T_OLD },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // setAt (T_OLD) <= clearedSetAt (T_OLD) → the clear wins, limit removed.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBeUndefined();
      expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBe(T_NEW);
    });

    it("a legacy no-setAt disk limit does not override a newer incoming set (SET-vs-SET fallback)", async () => {
      // Legacy disk: a claude limit with a HIGHER reset but NO set timestamp.
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: 9_000_000_000_000 },
          },
        ],
        activeIndex: 0,
      });

      // Incoming: a newer set with a valid setAt but a LOWER reset.
      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: { claude: 5_000_000_000_000 },
            rateLimitSetTimes: { claude: T_NEW },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // Incoming (versioned) wins despite its lower reset, and its setAt is carried
      // forward so future merges stay orderable — not discarded.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBe(5_000_000_000_000);
      expect(merged.accounts[0]?.rateLimitSetTimes?.claude).toBe(T_NEW);
    });

    it("an unversioned CLEAR does not erase a versioned SET (legacy limit passively expired)", async () => {
      // Concrete interleaving (Codex): A has a versioned limit on disk; B loaded a LEGACY
      // limit (no setAt), then passively expired it producing an UNVERSIONED tombstone
      // (clearedAt, no clearedSetAt). Timestamps are relative to now — a tombstone older
      // than the 24h TTL would be filtered out before reaching the exactly-one-versioned
      // branch, silently passing this test even if the branch regressed.
      const NOW = Date.now();
      const SET_AT = NOW - 60_000;
      const CLEARED_AT = NOW - 30_000;
      const RESET_AT = NOW + 3_600_000;
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: RESET_AT },
            rateLimitSetTimes: { claude: SET_AT },
          },
        ],
        activeIndex: 0,
      });

      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: {},
            clearedQuotaKeys: { claude: CLEARED_AT },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // The unversioned clear can't prove it saw the SET_AT generation → A's versioned set survives.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBe(RESET_AT);
      expect(merged.accounts[0]?.rateLimitSetTimes?.claude).toBe(SET_AT);
      expect(merged.accounts[0]?.clearedQuotaKeys?.claude).toBeUndefined();
    });

    it("a versioned disk SET survives a legacy incoming SET (reverse orientation of the fallback)", async () => {
      // Disk: A's versioned set {reset:1000, setAt:200}.
      mockDisk({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 5,
            rateLimitResetTimes: { claude: 1000 },
            rateLimitSetTimes: { claude: 200 },
          },
        ],
        activeIndex: 0,
      });

      // Incoming: a stale LEGACY writer with a different reset and NO setAt.
      await saveAccounts({
        version: 4,
        accounts: [
          {
            email: "a@example.com",
            refreshToken: "r1",
            addedAt: 1,
            lastUsed: 6,
            rateLimitResetTimes: { claude: 250 },
          },
        ],
        activeIndex: 0,
      });

      const merged = readMergedSnapshot();
      // The VERSIONED disk set wins outright — reset AND setAt together, never mixed with
      // the legacy incoming reset.
      expect(merged.accounts[0]?.rateLimitResetTimes?.claude).toBe(1000);
      expect(merged.accounts[0]?.rateLimitSetTimes?.claude).toBe(200);
    });
  });
});
