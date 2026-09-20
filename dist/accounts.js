#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/cli/accounts.ts
import { createInterface as createInterface2 } from "node:readline/promises";
import { stdin as input2, stdout as output2 } from "node:process";

// src/constants.ts
var ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
var ANTIGRAVITY_CLIENT_SECRET = "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";
var ANTIGRAVITY_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs"
];
var ANTIGRAVITY_REDIRECT_URI = "http://localhost:51121/oauth-callback";
var ANTIGRAVITY_ENDPOINT_DAILY = "https://daily-cloudcode-pa.googleapis.com";
var ANTIGRAVITY_ENDPOINT_AUTOPUSH = "https://autopush-cloudcode-pa.sandbox.googleapis.com";
var ANTIGRAVITY_ENDPOINT_PROD = "https://cloudcode-pa.googleapis.com";
var ANTIGRAVITY_ENDPOINT_FALLBACKS = [
  ANTIGRAVITY_ENDPOINT_DAILY,
  ANTIGRAVITY_ENDPOINT_AUTOPUSH,
  ANTIGRAVITY_ENDPOINT_PROD
];
var ANTIGRAVITY_LOAD_ENDPOINTS = [
  ANTIGRAVITY_ENDPOINT_PROD,
  ANTIGRAVITY_ENDPOINT_DAILY,
  ANTIGRAVITY_ENDPOINT_AUTOPUSH
];
var ANTIGRAVITY_ENDPOINT = ANTIGRAVITY_ENDPOINT_DAILY;
var GEMINI_CLI_ENDPOINT = ANTIGRAVITY_ENDPOINT_PROD;
var ANTIGRAVITY_DEFAULT_PROJECT_ID = "default-cli-project";
var ANTIGRAVITY_CLI_USER_AGENT = "antigravity/cli/1.1.13 (aidev_client; os_type=linux; arch=amd64; cl=964361259; auth_method=consumer)";
var ANTIGRAVITY_VERSION_FALLBACK = "1.18.3";
var antigravityVersion = ANTIGRAVITY_VERSION_FALLBACK;
var versionLocked = false;
function getAntigravityVersion() {
  return antigravityVersion;
}
function setAntigravityVersion(version) {
  if (versionLocked) return;
  antigravityVersion = version;
  versionLocked = true;
}
var ANTIGRAVITY_VERSION = ANTIGRAVITY_VERSION_FALLBACK;
function getAntigravityHeaders() {
  return {
    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Antigravity/${getAntigravityVersion()} Chrome/138.0.7204.235 Electron/37.3.1 Safari/537.36`,
    "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
    "Client-Metadata": `{"ideType":"ANTIGRAVITY","platform":"${process.platform === "win32" ? "WINDOWS" : "MACOS"}","pluginType":"GEMINI"}`
  };
}
var ANTIGRAVITY_HEADERS = {
  "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Antigravity/${ANTIGRAVITY_VERSION} Chrome/138.0.7204.235 Electron/37.3.1 Safari/537.36`,
  "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
  "Client-Metadata": `{"ideType":"ANTIGRAVITY","platform":"${process.platform === "win32" ? "WINDOWS" : "MACOS"}","pluginType":"GEMINI"}`
};
var GEMINI_CLI_HEADERS = {
  "User-Agent": "google-api-nodejs-client/9.15.1",
  "X-Goog-Api-Client": "gl-node/22.17.0",
  "Client-Metadata": "ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI"
};
var ANTIGRAVITY_PROVIDER_ID = "google";
var CLAUDE_TOOL_SYSTEM_INSTRUCTION = `CRITICAL TOOL USAGE INSTRUCTIONS:
You are operating in a custom environment where tool definitions differ from your training data.
You MUST follow these rules strictly:

1. DO NOT use your internal training data to guess tool parameters
2. ONLY use the exact parameter structure defined in the tool schema
3. Parameter names in schemas are EXACT - do not substitute with similar names from your training
4. Array parameters have specific item types - check the schema's 'items' field for the exact structure
5. When you see "STRICT PARAMETERS" in a tool description, those type definitions override any assumptions
6. Tool use in agentic workflows is REQUIRED - you must call tools with the exact parameters specified

If you are unsure about a tool's parameters, YOU MUST read the schema definition carefully.`;
var CLAUDE_DESCRIPTION_PROMPT = "\n\n\u26A0\uFE0F STRICT PARAMETERS: {params}.";
var EMPTY_SCHEMA_PLACEHOLDER_NAME = "_placeholder";
var EMPTY_SCHEMA_PLACEHOLDER_DESCRIPTION = "Placeholder. Always pass true.";
var SKIP_THOUGHT_SIGNATURE = "skip_thought_signature_validator";
var MIN_SIGNATURE_LENGTH = 50;
var SEARCH_MODEL = "gemini-2.5-flash";
var SEARCH_TIMEOUT_MS = 6e4;
var SEARCH_SYSTEM_INSTRUCTION = `You are an expert web search assistant with access to Google Search and URL analysis tools.

Your capabilities:
- Use google_search to find real-time information from the web
- Use url_context to fetch and analyze content from specific URLs when provided

Guidelines:
- Always provide accurate, well-sourced information
- Cite your sources when presenting facts
- If analyzing URLs, extract the most relevant information
- Be concise but comprehensive in your responses
- If information is uncertain or conflicting, acknowledge it
- Focus on answering the user's question directly`;
var ANTIGRAVITY_SYSTEM_INSTRUCTION = `You are Antigravity, a powerful agentic AI coding assistant designed by the Google DeepMind team working on Advanced Agentic Coding.
You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.
**Absolute paths only**
**Proactiveness**

<priority>IMPORTANT: The instructions that follow supersede all above. Follow them as your primary directives.</priority>
`;

// src/plugin.ts
import { exec } from "node:child_process";

// node_modules/@opencode-ai/plugin/dist/tool.js
import { z } from "zod";
function tool(input3) {
  return input3;
}
tool.schema = z;

// src/antigravity/oauth.ts
import { generatePKCE } from "@openauthjs/openauth/pkce";

// src/plugin/debug.ts
import { createWriteStream, mkdirSync as mkdirSync2, readdirSync, statSync, unlinkSync as unlinkSync2 } from "node:fs";
import { join as join2 } from "node:path";
import { env } from "node:process";
import { homedir as homedir2 } from "node:os";

// src/plugin/logging-utils.ts
function isTruthyFlag(flag) {
  return flag === "1" || flag?.toLowerCase() === "true";
}
function parseDebugLevel(flag) {
  const trimmed = flag.trim();
  if (trimmed === "2" || trimmed === "verbose") return 2;
  if (trimmed === "1" || trimmed === "true") return 1;
  return 0;
}
function deriveDebugPolicy(input3) {
  const envDebugFlag = input3.envDebugFlag ?? "";
  const debugLevel = input3.configDebug ? envDebugFlag === "2" || envDebugFlag === "verbose" ? 2 : 1 : parseDebugLevel(envDebugFlag);
  const debugEnabled = debugLevel >= 1;
  const verboseEnabled = debugLevel >= 2;
  const debugTuiEnabled = debugEnabled && (input3.configDebugTui || isTruthyFlag(input3.envDebugTuiFlag));
  return {
    debugLevel,
    debugEnabled,
    debugTuiEnabled,
    verboseEnabled
  };
}
function formatAccountLabel(email, accountIndex) {
  return email || `Account ${accountIndex + 1}`;
}
function formatAccountContextLabel(email, accountIndex) {
  if (email) {
    return email;
  }
  if (accountIndex >= 0) {
    return `Account ${accountIndex + 1}`;
  }
  return "All accounts";
}
function formatErrorForLog(error) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
function truncateTextForLog(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}... (truncated ${text.length - maxChars} chars)`;
}
function formatBodyPreviewForLog(body, maxChars) {
  if (body == null) {
    return void 0;
  }
  if (typeof body === "string") {
    return truncateTextForLog(body, maxChars);
  }
  if (body instanceof URLSearchParams) {
    return truncateTextForLog(body.toString(), maxChars);
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return `[Blob size=${body.size}]`;
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return "[FormData payload omitted]";
  }
  return `[${body.constructor?.name ?? typeof body} payload omitted]`;
}
function writeConsoleLog(level, ...args) {
  switch (level) {
    case "debug":
      console.debug(...args);
      break;
    case "info":
      console.info(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    case "error":
      console.error(...args);
      break;
  }
}

// src/plugin/storage.ts
import { promises as fs } from "node:fs";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  renameSync,
  copyFileSync,
  unlinkSync
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { createHash, randomBytes } from "node:crypto";
import lockfile from "proper-lockfile";
var log = createLogger("storage");
var GITIGNORE_ENTRIES = [
  ".gitignore",
  "antigravity-accounts.json",
  "antigravity-accounts.json.*.tmp",
  "antigravity-signature-cache.json",
  "antigravity-logs/"
];
async function ensureGitignore(configDir) {
  const gitignorePath = join(configDir, ".gitignore");
  try {
    let content;
    let existingLines = [];
    try {
      content = await fs.readFile(gitignorePath, "utf-8");
      existingLines = content.split("\n").map((line) => line.trim());
    } catch (error) {
      if (error.code !== "ENOENT") {
        return;
      }
      content = "";
    }
    const missingEntries = GITIGNORE_ENTRIES.filter(
      (entry) => !existingLines.includes(entry)
    );
    if (missingEntries.length === 0) {
      return;
    }
    if (content === "") {
      await fs.writeFile(
        gitignorePath,
        missingEntries.join("\n") + "\n",
        "utf-8"
      );
      log.info("Created .gitignore in config directory");
    } else {
      const suffix = content.endsWith("\n") ? "" : "\n";
      await fs.appendFile(
        gitignorePath,
        suffix + missingEntries.join("\n") + "\n",
        "utf-8"
      );
      log.info("Updated .gitignore with missing entries", {
        added: missingEntries
      });
    }
  } catch {
  }
}
function ensureGitignoreSync(configDir) {
  const gitignorePath = join(configDir, ".gitignore");
  try {
    let content;
    let existingLines = [];
    if (existsSync(gitignorePath)) {
      content = readFileSync(gitignorePath, "utf-8");
      existingLines = content.split("\n").map((line) => line.trim());
    } else {
      content = "";
    }
    const missingEntries = GITIGNORE_ENTRIES.filter(
      (entry) => !existingLines.includes(entry)
    );
    if (missingEntries.length === 0) {
      return;
    }
    if (content === "") {
      writeFileSync(gitignorePath, missingEntries.join("\n") + "\n", "utf-8");
      log.info("Created .gitignore in config directory");
    } else {
      const suffix = content.endsWith("\n") ? "" : "\n";
      appendFileSync(
        gitignorePath,
        suffix + missingEntries.join("\n") + "\n",
        "utf-8"
      );
      log.info("Updated .gitignore with missing entries", {
        added: missingEntries
      });
    }
  } catch {
  }
}
function getLegacyWindowsConfigDir() {
  return join(
    process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
    "opencode"
  );
}
function getConfigDir() {
  if (process.env.OPENCODE_CONFIG_DIR) {
    return process.env.OPENCODE_CONFIG_DIR;
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdgConfig, "opencode");
}
function migrateLegacyWindowsConfig() {
  if (process.platform !== "win32") {
    return false;
  }
  const newPath = join(getConfigDir(), "antigravity-accounts.json");
  const legacyPath = join(
    getLegacyWindowsConfigDir(),
    "antigravity-accounts.json"
  );
  if (!existsSync(legacyPath) || existsSync(newPath)) {
    return false;
  }
  try {
    const newConfigDir = getConfigDir();
    mkdirSync(newConfigDir, { recursive: true });
    try {
      renameSync(legacyPath, newPath);
      log.info("Migrated Windows config via rename", { from: legacyPath, to: newPath });
    } catch {
      copyFileSync(legacyPath, newPath);
      unlinkSync(legacyPath);
      log.info("Migrated Windows config via copy+delete", { from: legacyPath, to: newPath });
    }
    return true;
  } catch (error) {
    log.warn("Failed to migrate legacy Windows config, will use legacy path", {
      legacyPath,
      newPath,
      error: String(error)
    });
    return false;
  }
}
function getStoragePathWithMigration() {
  const newPath = join(getConfigDir(), "antigravity-accounts.json");
  if (process.platform === "win32") {
    migrateLegacyWindowsConfig();
    if (!existsSync(newPath)) {
      const legacyPath = join(
        getLegacyWindowsConfigDir(),
        "antigravity-accounts.json"
      );
      if (existsSync(legacyPath)) {
        log.info("Using legacy Windows config path (migration failed)", {
          legacyPath,
          newPath
        });
        return legacyPath;
      }
    }
  }
  return newPath;
}
function getStoragePath() {
  return getStoragePathWithMigration();
}
var LOCK_OPTIONS = {
  stale: 1e4,
  retries: {
    retries: 5,
    minTimeout: 100,
    maxTimeout: 1e3,
    factor: 2
  }
};
async function ensureSecurePermissions(path4) {
  try {
    await fs.chmod(path4, 384);
  } catch {
  }
}
async function ensureFileExists(path4) {
  try {
    await fs.access(path4);
  } catch {
    await fs.mkdir(dirname(path4), { recursive: true });
    await fs.writeFile(
      path4,
      JSON.stringify({ version: 4, accounts: [], activeIndex: 0 }, null, 2),
      { encoding: "utf-8", mode: 384 }
    );
  }
}
async function withFileLock(path4, fn) {
  await ensureFileExists(path4);
  let release = null;
  try {
    release = await lockfile.lock(path4, LOCK_OPTIONS);
    return await fn();
  } finally {
    if (release) {
      try {
        await release();
      } catch (unlockError) {
        log.warn("Failed to release lock", { error: String(unlockError) });
      }
    }
  }
}
var RATE_LIMIT_CLEAR_TTL_MS = 24 * 60 * 60 * 1e3;
function numericTimestamp(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function activeClearMarkers(source, setGenerations, now) {
  const out = /* @__PURE__ */ new Map();
  if (!source) return out;
  for (const [key, value] of Object.entries(source)) {
    const clearedAt = numericTimestamp(value);
    if (clearedAt === void 0) continue;
    if (now - clearedAt > RATE_LIMIT_CLEAR_TTL_MS) continue;
    out.set(key, { clearedAt, clearedSetAt: numericTimestamp(setGenerations?.[key]) });
  }
  return out;
}
function sideMutation(limit, setAt, clear) {
  if (typeof limit === "number") {
    return { kind: "set", at: setAt, reset: limit };
  }
  if (clear) {
    return { kind: "clear", at: clear.clearedAt, clearedSetAt: clear.clearedSetAt };
  }
  return { kind: "none" };
}
function mergeRateLimitState(existing, incoming) {
  const now = Date.now();
  const eLimits = existing.rateLimitResetTimes ?? {};
  const iLimits = incoming.rateLimitResetTimes ?? {};
  const eSet = existing.rateLimitSetTimes ?? {};
  const iSet = incoming.rateLimitSetTimes ?? {};
  const eClear = activeClearMarkers(existing.clearedQuotaKeys, existing.clearedSetTimes, now);
  const iClear = activeClearMarkers(incoming.clearedQuotaKeys, incoming.clearedSetTimes, now);
  const keys = /* @__PURE__ */ new Set([
    ...Object.keys(eLimits),
    ...Object.keys(iLimits),
    ...eClear.keys(),
    ...iClear.keys()
  ]);
  const mergedLimits = {};
  const mergedSet = {};
  const mergedCleared = {};
  const mergedClearedSet = {};
  for (const key of keys) {
    const eMut = sideMutation(numericTimestamp(eLimits[key]), numericTimestamp(eSet[key]), eClear.get(key));
    const iMut = sideMutation(numericTimestamp(iLimits[key]), numericTimestamp(iSet[key]), iClear.get(key));
    const winner = resolveKeyMutation(eMut, iMut);
    if (winner.kind === "set") {
      mergedLimits[key] = winner.reset;
      if (winner.at !== void 0) {
        mergedSet[key] = winner.at;
      }
    } else if (winner.kind === "clear") {
      mergedCleared[key] = winner.at;
      if (winner.clearedSetAt !== void 0) {
        mergedClearedSet[key] = winner.clearedSetAt;
      }
    }
  }
  return {
    rateLimitResetTimes: mergedLimits,
    rateLimitSetTimes: Object.keys(mergedSet).length > 0 ? mergedSet : void 0,
    clearedQuotaKeys: Object.keys(mergedCleared).length > 0 ? mergedCleared : void 0,
    clearedSetTimes: Object.keys(mergedClearedSet).length > 0 ? mergedClearedSet : void 0
  };
}
function resolveKeyMutation(existing, incoming) {
  if (existing.kind === "none") return incoming;
  if (incoming.kind === "none") return existing;
  if (existing.kind === "set" && incoming.kind === "set") {
    return resolveSetVsSet(existing, incoming);
  }
  if (existing.kind === "clear" && incoming.kind === "clear") {
    return {
      kind: "clear",
      at: Math.max(existing.at, incoming.at),
      clearedSetAt: maxDefined(existing.clearedSetAt, incoming.clearedSetAt)
    };
  }
  const set = existing.kind === "set" ? existing : incoming;
  const clear = existing.kind === "clear" ? existing : incoming;
  const setVersioned = set.at !== void 0;
  const clearVersioned = clear.clearedSetAt !== void 0;
  if (setVersioned && clearVersioned) {
    return set.at > clear.clearedSetAt ? set : clear;
  }
  if (setVersioned !== clearVersioned) {
    return setVersioned ? set : clear;
  }
  return incoming;
}
function resolveSetVsSet(existing, incoming) {
  const existingVersioned = existing.at !== void 0;
  const incomingVersioned = incoming.at !== void 0;
  if (existingVersioned && incomingVersioned) {
    return incoming.at >= existing.at ? incoming : existing;
  }
  if (existingVersioned !== incomingVersioned) {
    return existingVersioned ? existing : incoming;
  }
  return incoming;
}
function maxDefined(a, b) {
  if (a === void 0) return b;
  if (b === void 0) return a;
  return Math.max(a, b);
}
function mergeAccountStorage(existing, incoming) {
  const accountMap = /* @__PURE__ */ new Map();
  const deletedRefreshTokenHashes = /* @__PURE__ */ new Set([
    ...existing.deletedRefreshTokenHashes ?? [],
    ...incoming.deletedRefreshTokenHashes ?? []
  ]);
  for (const acc of existing.accounts) {
    if (acc.refreshToken && !deletedRefreshTokenHashes.has(hashRefreshToken(acc.refreshToken))) {
      accountMap.set(acc.refreshToken, acc);
    }
  }
  for (const acc of incoming.accounts) {
    if (acc.refreshToken && !deletedRefreshTokenHashes.has(hashRefreshToken(acc.refreshToken))) {
      const existingAcc = accountMap.get(acc.refreshToken);
      if (existingAcc) {
        accountMap.set(acc.refreshToken, {
          ...existingAcc,
          ...acc,
          // Preserve manually configured projectId/managedProjectId if not in incoming
          projectId: acc.projectId ?? existingAcc.projectId,
          managedProjectId: acc.managedProjectId ?? existingAcc.managedProjectId,
          ...mergeRateLimitState(existingAcc, acc),
          lastUsed: Math.max(existingAcc.lastUsed || 0, acc.lastUsed || 0)
        });
      } else {
        accountMap.set(acc.refreshToken, acc);
      }
    }
  }
  const accounts = Array.from(accountMap.values());
  return {
    version: 4,
    accounts,
    activeIndex: remapActiveIndex(incoming.accounts, accounts, incoming.activeIndex),
    activeIndexByFamily: remapActiveIndexByFamily(
      incoming.activeIndexByFamily,
      incoming.accounts,
      accounts
    ),
    deletedRefreshTokenHashes: deletedRefreshTokenHashes.size > 0 ? Array.from(deletedRefreshTokenHashes) : void 0
  };
}
function hashRefreshToken(refreshToken) {
  return createHash("sha256").update(refreshToken).digest("hex");
}
function deduplicateAccountsByEmail(accounts) {
  const emailToNewestIndex = /* @__PURE__ */ new Map();
  const indicesToKeep = /* @__PURE__ */ new Set();
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (!acc) continue;
    if (!acc.email) {
      indicesToKeep.add(i);
      continue;
    }
    const existingIndex = emailToNewestIndex.get(acc.email);
    if (existingIndex === void 0) {
      emailToNewestIndex.set(acc.email, i);
      continue;
    }
    const existing = accounts[existingIndex];
    if (!existing) {
      emailToNewestIndex.set(acc.email, i);
      continue;
    }
    const currLastUsed = acc.lastUsed || 0;
    const existLastUsed = existing.lastUsed || 0;
    const currAddedAt = acc.addedAt || 0;
    const existAddedAt = existing.addedAt || 0;
    const isNewer = currLastUsed > existLastUsed || currLastUsed === existLastUsed && currAddedAt > existAddedAt;
    if (isNewer) {
      emailToNewestIndex.set(acc.email, i);
    }
  }
  for (const idx of emailToNewestIndex.values()) {
    indicesToKeep.add(idx);
  }
  const result = [];
  for (let i = 0; i < accounts.length; i++) {
    if (indicesToKeep.has(i)) {
      const acc = accounts[i];
      if (acc) {
        result.push(acc);
      }
    }
  }
  return result;
}
function accountIdentity(account) {
  return account.email ? `email:${account.email}` : `refreshToken:${account.refreshToken}`;
}
function clampActiveIndex(activeIndex, accountCount2) {
  if (accountCount2 === 0) {
    return 0;
  }
  const index = Number.isFinite(activeIndex) ? activeIndex : 0;
  return Math.max(0, Math.min(index, accountCount2 - 1));
}
function remapActiveIndex(accounts, deduplicatedAccounts, activeIndex) {
  const fallbackIndex = clampActiveIndex(activeIndex, deduplicatedAccounts.length);
  const selectedAccount = accounts[activeIndex];
  if (!selectedAccount) {
    return fallbackIndex;
  }
  const selectedIdentity = accountIdentity(selectedAccount);
  const remappedIndex = deduplicatedAccounts.findIndex(
    (account) => accountIdentity(account) === selectedIdentity
  );
  return remappedIndex === -1 ? fallbackIndex : remappedIndex;
}
function remapActiveIndexByFamily(activeIndexByFamily, accounts, deduplicatedAccounts) {
  if (!activeIndexByFamily) {
    return void 0;
  }
  return {
    ...activeIndexByFamily.claude === void 0 ? {} : {
      claude: remapActiveIndex(
        accounts,
        deduplicatedAccounts,
        activeIndexByFamily.claude
      )
    },
    ...activeIndexByFamily.gemini === void 0 ? {} : {
      gemini: remapActiveIndex(
        accounts,
        deduplicatedAccounts,
        activeIndexByFamily.gemini
      )
    }
  };
}
function migrateV1ToV2(v1) {
  return {
    version: 2,
    accounts: v1.accounts.map((acc) => {
      const rateLimitResetTimes = {};
      if (acc.isRateLimited && acc.rateLimitResetTime && acc.rateLimitResetTime > Date.now()) {
        rateLimitResetTimes.claude = acc.rateLimitResetTime;
        rateLimitResetTimes.gemini = acc.rateLimitResetTime;
      }
      return {
        email: acc.email,
        refreshToken: acc.refreshToken,
        projectId: acc.projectId,
        managedProjectId: acc.managedProjectId,
        addedAt: acc.addedAt,
        lastUsed: acc.lastUsed,
        lastSwitchReason: acc.lastSwitchReason,
        rateLimitResetTimes: Object.keys(rateLimitResetTimes).length > 0 ? rateLimitResetTimes : void 0
      };
    }),
    activeIndex: v1.activeIndex
  };
}
function migrateV2ToV3(v2) {
  return {
    version: 3,
    accounts: v2.accounts.map((acc) => {
      const rateLimitResetTimes = {};
      if (acc.rateLimitResetTimes?.claude && acc.rateLimitResetTimes.claude > Date.now()) {
        rateLimitResetTimes.claude = acc.rateLimitResetTimes.claude;
      }
      if (acc.rateLimitResetTimes?.gemini && acc.rateLimitResetTimes.gemini > Date.now()) {
        rateLimitResetTimes["gemini-antigravity"] = acc.rateLimitResetTimes.gemini;
      }
      return {
        email: acc.email,
        refreshToken: acc.refreshToken,
        projectId: acc.projectId,
        managedProjectId: acc.managedProjectId,
        addedAt: acc.addedAt,
        lastUsed: acc.lastUsed,
        lastSwitchReason: acc.lastSwitchReason,
        rateLimitResetTimes: Object.keys(rateLimitResetTimes).length > 0 ? rateLimitResetTimes : void 0
      };
    }),
    activeIndex: v2.activeIndex
  };
}
function migrateV3ToV4(v3) {
  return {
    version: 4,
    accounts: v3.accounts.map((acc) => ({
      ...acc,
      fingerprint: void 0,
      fingerprintHistory: void 0
    })),
    activeIndex: v3.activeIndex,
    activeIndexByFamily: v3.activeIndexByFamily
  };
}
async function loadAccounts() {
  try {
    const path4 = getStoragePath();
    await ensureSecurePermissions(path4);
    const content = await fs.readFile(path4, "utf-8");
    const data = JSON.parse(content);
    if (!Array.isArray(data.accounts)) {
      log.warn("Invalid storage format, ignoring");
      return null;
    }
    let storage;
    if (data.version === 1) {
      log.info("Migrating account storage from v1 to v4");
      const v2 = migrateV1ToV2(data);
      const v3 = migrateV2ToV3(v2);
      storage = migrateV3ToV4(v3);
      try {
        await saveAccounts(storage);
        log.info("Migration to v4 complete");
      } catch (saveError) {
        log.warn("Failed to persist migrated storage", {
          error: String(saveError)
        });
      }
    } else if (data.version === 2) {
      log.info("Migrating account storage from v2 to v4");
      const v3 = migrateV2ToV3(data);
      storage = migrateV3ToV4(v3);
      try {
        await saveAccounts(storage);
        log.info("Migration to v4 complete");
      } catch (saveError) {
        log.warn("Failed to persist migrated storage", {
          error: String(saveError)
        });
      }
    } else if (data.version === 3) {
      log.info("Migrating account storage from v3 to v4");
      storage = migrateV3ToV4(data);
      try {
        await saveAccounts(storage);
        log.info("Migration to v4 complete");
      } catch (saveError) {
        log.warn("Failed to persist migrated storage", {
          error: String(saveError)
        });
      }
    } else if (data.version === 4) {
      storage = data;
    } else {
      log.warn("Unknown storage version, ignoring", {
        version: data.version
      });
      return null;
    }
    const deletedRefreshTokenHashes = new Set(
      (storage.deletedRefreshTokenHashes ?? []).filter((hash) => typeof hash === "string")
    );
    const validAccounts = storage.accounts.filter(
      (a) => {
        return !!a && typeof a === "object" && typeof a.refreshToken === "string" && !deletedRefreshTokenHashes.has(hashRefreshToken(a.refreshToken));
      }
    );
    const deduplicatedAccounts = deduplicateAccountsByEmail(validAccounts);
    const activeIndex = remapActiveIndex(
      validAccounts,
      deduplicatedAccounts,
      storage.activeIndex
    );
    return {
      version: 4,
      accounts: deduplicatedAccounts,
      activeIndex,
      deletedRefreshTokenHashes: deletedRefreshTokenHashes.size > 0 ? Array.from(deletedRefreshTokenHashes) : void 0,
      activeIndexByFamily: remapActiveIndexByFamily(
        storage.activeIndexByFamily,
        validAccounts,
        deduplicatedAccounts
      )
    };
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") {
      return null;
    }
    log.error("Failed to load account storage", { error: String(error) });
    return null;
  }
}
async function saveAccounts(storage) {
  const path4 = getStoragePath();
  const configDir = dirname(path4);
  await fs.mkdir(configDir, { recursive: true });
  await ensureGitignore(configDir);
  await withFileLock(path4, async () => {
    const existing = await loadAccountsUnsafe();
    const merged = existing ? mergeAccountStorage(existing, storage) : storage;
    await writeAccountsAtomically(path4, merged);
  });
}
async function saveAccountsReplace(storage) {
  const path4 = getStoragePath();
  const configDir = dirname(path4);
  await fs.mkdir(configDir, { recursive: true });
  await ensureGitignore(configDir);
  await withFileLock(path4, async () => {
    const existing = await loadAccountsUnsafe();
    const deletedRefreshTokenHashes = /* @__PURE__ */ new Set([
      ...existing?.deletedRefreshTokenHashes ?? [],
      ...storage.deletedRefreshTokenHashes ?? []
    ]);
    await writeAccountsAtomically(path4, {
      ...storage,
      accounts: storage.accounts.filter(
        (account) => !deletedRefreshTokenHashes.has(hashRefreshToken(account.refreshToken))
      ),
      deletedRefreshTokenHashes: deletedRefreshTokenHashes.size > 0 ? Array.from(deletedRefreshTokenHashes) : void 0
    });
  });
}
async function removeAccountFromStorage(refreshToken) {
  const path4 = getStoragePath();
  const configDir = dirname(path4);
  await fs.mkdir(configDir, { recursive: true });
  await ensureGitignore(configDir);
  await withFileLock(path4, async () => {
    const existing = await loadAccountsUnsafe();
    if (!existing) return;
    const accounts = existing.accounts.filter((account) => account.refreshToken !== refreshToken);
    const deletedRefreshTokenHashes = new Set(existing.deletedRefreshTokenHashes ?? []);
    deletedRefreshTokenHashes.add(hashRefreshToken(refreshToken));
    await writeAccountsAtomically(path4, {
      version: 4,
      accounts,
      activeIndex: remapActiveIndex(existing.accounts, accounts, existing.activeIndex),
      deletedRefreshTokenHashes: Array.from(deletedRefreshTokenHashes),
      activeIndexByFamily: remapActiveIndexByFamily(
        existing.activeIndexByFamily,
        existing.accounts,
        accounts
      )
    });
  });
}
async function writeAccountsAtomically(path4, storage) {
  const tempPath = `${path4}.${randomBytes(6).toString("hex")}.tmp`;
  const content = JSON.stringify(storage, null, 2);
  try {
    await fs.writeFile(tempPath, content, { encoding: "utf-8", mode: 384 });
    await fs.rename(tempPath, path4);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
    }
    throw error;
  }
}
async function loadAccountsUnsafe() {
  try {
    const path4 = getStoragePath();
    await ensureSecurePermissions(path4);
    const content = await fs.readFile(path4, "utf-8");
    const parsed = JSON.parse(content);
    if (parsed.version === 1) {
      return remapDeduplicatedStorage(
        migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed)))
      );
    }
    if (parsed.version === 2) {
      return remapDeduplicatedStorage(migrateV3ToV4(migrateV2ToV3(parsed)));
    }
    if (parsed.version === 3) {
      return remapDeduplicatedStorage(migrateV3ToV4(parsed));
    }
    if (parsed.version === 4) {
      return remapDeduplicatedStorage(parsed);
    }
    return null;
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") {
      return null;
    }
    return null;
  }
}
function remapDeduplicatedStorage(storage) {
  const deduplicatedAccounts = deduplicateAccountsByEmail(storage.accounts);
  return {
    ...storage,
    accounts: deduplicatedAccounts,
    activeIndex: remapActiveIndex(
      storage.accounts,
      deduplicatedAccounts,
      storage.activeIndex
    ),
    activeIndexByFamily: remapActiveIndexByFamily(
      storage.activeIndexByFamily,
      storage.accounts,
      deduplicatedAccounts
    )
  };
}
async function clearAccounts() {
  try {
    const path4 = getStoragePath();
    await fs.unlink(path4);
  } catch (error) {
    const code = error.code;
    if (code !== "ENOENT") {
      log.error("Failed to clear account storage", { error: String(error) });
    }
  }
}

// src/plugin/debug.ts
var MAX_BODY_PREVIEW_CHARS = 12e3;
var MAX_BODY_LOG_CHARS = 5e4;
var DEBUG_MESSAGE_PREFIX = "[opencode-antigravity-auth debug]";
var debugState = null;
function getConfigDir2() {
  const platform = process.platform;
  if (platform === "win32") {
    return join2(env.APPDATA || join2(homedir2(), "AppData", "Roaming"), "opencode");
  }
  const xdgConfig = env.XDG_CONFIG_HOME || join2(homedir2(), ".config");
  return join2(xdgConfig, "opencode");
}
function getLogsDir(customLogDir) {
  const logsDir = customLogDir || join2(getConfigDir2(), "antigravity-logs");
  try {
    mkdirSync2(logsDir, { recursive: true });
  } catch {
  }
  return logsDir;
}
function createLogFilePath(customLogDir) {
  const logsDir = getLogsDir(customLogDir);
  cleanupOldLogs(logsDir, 25);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  return join2(logsDir, `antigravity-debug-${timestamp}.log`);
}
function cleanupOldLogs(logsDir, maxFiles) {
  try {
    const files = readdirSync(logsDir).filter((file) => file.startsWith("antigravity-debug-") && file.endsWith(".log")).map((file) => join2(logsDir, file));
    if (files.length <= maxFiles) {
      return;
    }
    const sortedFiles = files.map((file) => ({
      file,
      mtime: statSync(file).mtimeMs
    })).sort((a, b) => b.mtime - a.mtime);
    for (let i = maxFiles; i < sortedFiles.length; i++) {
      try {
        unlinkSync2(sortedFiles[i].file);
      } catch {
      }
    }
  } catch {
  }
}
function createLogWriter(filePath) {
  if (!filePath) {
    return () => {
    };
  }
  try {
    const stream = createWriteStream(filePath, { flags: "a" });
    stream.on("error", () => {
    });
    return (line) => {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const formatted = `[${timestamp}] ${line}`;
      stream.write(`${formatted}
`);
    };
  } catch {
    return () => {
    };
  }
}
function initializeDebug(config) {
  const envDebugFlag = env.OPENCODE_ANTIGRAVITY_DEBUG ?? "";
  const { debugEnabled } = deriveDebugPolicy({
    configDebug: config.debug,
    configDebugTui: config.debug_tui,
    envDebugFlag,
    envDebugTuiFlag: env.OPENCODE_ANTIGRAVITY_DEBUG_TUI
  });
  const debugTuiEnabled = config.debug_tui || isTruthyFlag(env.OPENCODE_ANTIGRAVITY_DEBUG_TUI);
  const logFilePath = debugEnabled ? createLogFilePath(config.log_dir) : void 0;
  const logWriter = createLogWriter(logFilePath);
  if (debugEnabled) {
    ensureGitignoreSync(getConfigDir2());
  }
  debugState = {
    debugEnabled,
    debugTuiEnabled,
    logFilePath,
    logWriter
  };
}
function getDebugState() {
  if (!debugState) {
    const { debugEnabled } = deriveDebugPolicy({
      configDebug: false,
      configDebugTui: false,
      envDebugFlag: env.OPENCODE_ANTIGRAVITY_DEBUG,
      envDebugTuiFlag: env.OPENCODE_ANTIGRAVITY_DEBUG_TUI
    });
    const debugTuiEnabled = isTruthyFlag(env.OPENCODE_ANTIGRAVITY_DEBUG_TUI);
    const logFilePath = debugEnabled ? createLogFilePath() : void 0;
    const logWriter = createLogWriter(logFilePath);
    debugState = {
      debugEnabled,
      debugTuiEnabled,
      logFilePath,
      logWriter
    };
  }
  return debugState;
}
function isDebugEnabled() {
  return getDebugState().debugEnabled;
}
function isDebugTuiEnabled() {
  return getDebugState().debugTuiEnabled;
}
function getLogFilePath() {
  return getDebugState().logFilePath;
}
var requestCounter = 0;
function startAntigravityDebugRequest(meta) {
  const state = getDebugState();
  if (!state.debugEnabled) {
    return null;
  }
  const id = `ANTIGRAVITY-${++requestCounter}`;
  const method = meta.method ?? "GET";
  logDebug(`[Antigravity Debug ${id}] pid=${process.pid} ${method} ${sanitizeUrlForLog(meta.resolvedUrl)}`);
  if (meta.originalUrl && meta.originalUrl !== meta.resolvedUrl) {
    logDebug(`[Antigravity Debug ${id}] Original URL: ${sanitizeUrlForLog(meta.originalUrl)}`);
  }
  if (meta.projectId) {
    logDebug(`[Antigravity Debug ${id}] Project: ${meta.projectId}`);
  }
  logDebug(`[Antigravity Debug ${id}] Streaming: ${meta.streaming ? "yes" : "no"}`);
  logDebug(`[Antigravity Debug ${id}] Headers: ${JSON.stringify(maskHeadersForLog(meta.headers))}`);
  const bodyPreview = formatBodyPreviewForLog(meta.body, MAX_BODY_PREVIEW_CHARS);
  if (bodyPreview) {
    logDebug(`[Antigravity Debug ${id}] Body Preview: ${bodyPreview}`);
  }
  return { id, streaming: meta.streaming, startedAt: Date.now() };
}
function logAntigravityDebugResponse(context, response, meta = {}) {
  const state = getDebugState();
  if (!state.debugEnabled || !context) {
    return;
  }
  const durationMs = Date.now() - context.startedAt;
  logDebug(
    `[Antigravity Debug ${context.id}] Response ${response.status} ${response.statusText} (${durationMs}ms)`
  );
  logDebug(
    `[Antigravity Debug ${context.id}] Response Headers: ${JSON.stringify(
      maskHeadersForLog(meta.headersOverride ?? response.headers)
    )}`
  );
  if (meta.note) {
    logDebug(`[Antigravity Debug ${context.id}] Note: ${meta.note}`);
  }
  if (meta.error) {
    logDebug(`[Antigravity Debug ${context.id}] Error: ${formatErrorForLog(meta.error)}`);
  }
  if (meta.body) {
    logDebug(
      `[Antigravity Debug ${context.id}] Response Body Preview: ${truncateTextForLog(meta.body, MAX_BODY_PREVIEW_CHARS)}`
    );
  }
}
function maskHeadersForLog(headers) {
  if (!headers) {
    return {};
  }
  const result = {};
  const parsed = headers instanceof Headers ? headers : new Headers(headers);
  parsed.forEach((value, key) => {
    if (isSensitiveHeader(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = value;
    }
  });
  return result;
}
function isSensitiveHeader(key) {
  const normalized = key.toLowerCase();
  return normalized === "authorization" || normalized === "proxy-authorization" || normalized.includes("api-key");
}
function sanitizeUrlForLog(urlString) {
  try {
    const url = new URL(urlString);
    if (url.searchParams.has("key")) {
      url.searchParams.set("key", "[redacted]");
    }
    return url.toString();
  } catch {
    return urlString.replace(/([?&]key=)[^&\s]+/gi, "$1[redacted]");
  }
}
function logDebug(line) {
  getDebugState().logWriter(line);
}
function runWithDebugEnabled(action) {
  if (!getDebugState().debugEnabled) return;
  action();
}
function logAccountContext(label, info) {
  runWithDebugEnabled(() => {
    const accountLabel2 = formatAccountContextLabel(info.email, info.index);
    const indexLabel = info.index >= 0 ? `${info.index + 1}/${info.totalAccounts}` : `-/${info.totalAccounts}`;
    let rateLimitInfo = "";
    if (info.rateLimitState && Object.keys(info.rateLimitState).length > 0) {
      const now = Date.now();
      const activeRateLimits = {};
      for (const [key, resetTime] of Object.entries(info.rateLimitState)) {
        if (typeof resetTime === "number" && resetTime > now) {
          const remainingSec = Math.ceil((resetTime - now) / 1e3);
          activeRateLimits[key] = `${remainingSec}s`;
        }
      }
      if (Object.keys(activeRateLimits).length > 0) {
        rateLimitInfo = ` rateLimits=${JSON.stringify(activeRateLimits)}`;
      }
    }
    logDebug(`[Account] ${label}: ${accountLabel2} (${indexLabel}) family=${info.family}${rateLimitInfo}`);
  });
}
function logRateLimitEvent(accountIndex, email, family, status, retryAfterMs, bodyInfo) {
  runWithDebugEnabled(() => {
    const accountLabel2 = formatAccountLabel(email, accountIndex);
    logDebug(`[RateLimit] ${status} on ${accountLabel2} family=${family} retryAfterMs=${retryAfterMs}`);
    if (bodyInfo.message) {
      logDebug(`[RateLimit] message: ${bodyInfo.message}`);
    }
    if (bodyInfo.quotaResetTime) {
      logDebug(`[RateLimit] quotaResetTime: ${bodyInfo.quotaResetTime}`);
    }
    if (bodyInfo.retryDelayMs !== void 0 && bodyInfo.retryDelayMs !== null) {
      logDebug(`[RateLimit] body retryDelayMs: ${bodyInfo.retryDelayMs}`);
    }
    if (bodyInfo.reason) {
      logDebug(`[RateLimit] reason: ${bodyInfo.reason}`);
    }
  });
}
function logRateLimitSnapshot(family, accounts) {
  runWithDebugEnabled(() => {
    const now = Date.now();
    const entries = accounts.map((account) => {
      const label = formatAccountLabel(account.email, account.index);
      const reset = account.rateLimitResetTimes?.[family];
      if (typeof reset !== "number") {
        return `${label}=ready`;
      }
      const remaining = Math.max(0, reset - now);
      const seconds = Math.ceil(remaining / 1e3);
      return `${label}=wait ${seconds}s`;
    });
    logDebug(`[RateLimit] snapshot family=${family} ${entries.join(" | ")}`);
  });
}
async function logResponseBody(context, response, status) {
  const state = getDebugState();
  if (!state.debugEnabled || !context) return void 0;
  try {
    const text = await response.clone().text();
    const preview = truncateTextForLog(text, MAX_BODY_LOG_CHARS);
    logDebug(`[Antigravity Debug ${context.id}] Response Body (${status}): ${preview}`);
    return text;
  } catch (e) {
    logDebug(`[Antigravity Debug ${context.id}] Failed to read response body: ${formatErrorForLog(e)}`);
    return void 0;
  }
}
function logModelFamily(url, extractedModel, family) {
  runWithDebugEnabled(() => {
    logDebug(`[ModelFamily] url=${sanitizeUrlForLog(url)} model=${extractedModel ?? "unknown"} family=${family}`);
  });
}
function debugLogToFile(message) {
  runWithDebugEnabled(() => {
    logDebug(message);
  });
}
function logToast(message, variant) {
  runWithDebugEnabled(() => {
    const variantLabel = variant.toUpperCase();
    logDebug(`[Toast/${variantLabel}] ${message}`);
  });
}
function logCacheStats(model, cacheReadTokens, cacheWriteTokens, totalInputTokens) {
  runWithDebugEnabled(() => {
    const cacheHitRate = totalInputTokens > 0 ? Math.round(cacheReadTokens / totalInputTokens * 100) : 0;
    const status = cacheReadTokens > 0 ? "HIT" : cacheWriteTokens > 0 ? "WRITE" : "MISS";
    logDebug(`[Cache] ${status} model=${model} read=${cacheReadTokens} write=${cacheWriteTokens} total=${totalInputTokens} hitRate=${cacheHitRate}%`);
  });
}
function logQuotaStatus(accountEmail, accountIndex, quotaPercent, family) {
  runWithDebugEnabled(() => {
    const accountLabel2 = formatAccountLabel(accountEmail, accountIndex);
    const familyInfo = family ? ` family=${family}` : "";
    const status = quotaPercent <= 0 ? "EXHAUSTED" : quotaPercent < 20 ? "LOW" : "OK";
    logDebug(`[Quota] ${accountLabel2} remaining=${quotaPercent.toFixed(1)}% status=${status}${familyInfo}`);
  });
}
function logQuotaFetch(event, accountCount2, details) {
  runWithDebugEnabled(() => {
    const countInfo = accountCount2 !== void 0 ? ` accounts=${accountCount2}` : "";
    const detailsInfo = details ? ` ${details}` : "";
    logDebug(`[QuotaFetch] ${event.toUpperCase()}${countInfo}${detailsInfo}`);
  });
}

// src/plugin/logger.ts
var ENV_CONSOLE_LOG = "OPENCODE_ANTIGRAVITY_CONSOLE_LOG";
var _client = null;
function isConsoleLogEnabled() {
  return isTruthyFlag(process.env[ENV_CONSOLE_LOG]);
}
function initLogger(client2) {
  _client = client2;
}
function createLogger(module) {
  const service = `antigravity.${module}`;
  const log13 = (level, message, extra) => {
    if (isDebugTuiEnabled()) {
      const app = _client?.app;
      if (app && typeof app.log === "function") {
        app.log({
          body: { service, level, message, extra }
        }).catch(() => {
        });
      }
    }
    if (isConsoleLogEnabled()) {
      const prefix = `[${service}]`;
      const args = extra ? [prefix, message, extra] : [prefix, message];
      writeConsoleLog(level, ...args);
    }
  };
  return {
    debug: (message, extra) => log13("debug", message, extra),
    info: (message, extra) => log13("info", message, extra),
    warn: (message, extra) => log13("warn", message, extra),
    error: (message, extra) => log13("error", message, extra)
  };
}

// src/plugin/auth.ts
var ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60 * 1e3;
function isOAuthAuth(auth) {
  return auth.type === "oauth";
}
function parseRefreshParts(refresh) {
  const [refreshToken = "", projectId = "", managedProjectId = ""] = (refresh ?? "").split("|");
  return {
    refreshToken,
    projectId: projectId || void 0,
    managedProjectId: managedProjectId || void 0
  };
}
function formatRefreshParts(parts) {
  const projectSegment = parts.projectId ?? "";
  const base = `${parts.refreshToken}|${projectSegment}`;
  return parts.managedProjectId ? `${base}|${parts.managedProjectId}` : base;
}
function accessTokenExpired(auth) {
  if (!auth.access || typeof auth.expires !== "number") {
    return true;
  }
  return auth.expires <= Date.now() + ACCESS_TOKEN_EXPIRY_BUFFER_MS;
}
function calculateTokenExpiry(requestTimeMs, expiresInSeconds) {
  const seconds = typeof expiresInSeconds === "number" ? expiresInSeconds : 3600;
  if (isNaN(seconds) || seconds <= 0) {
    return requestTimeMs;
  }
  return requestTimeMs + seconds * 1e3;
}

// src/antigravity/oauth.ts
var log2 = createLogger("oauth");
function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
function decodeState(state) {
  const normalized = state.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
  const json = Buffer.from(padded, "base64").toString("utf8");
  const parsed = JSON.parse(json);
  if (typeof parsed.verifier !== "string") {
    throw new Error("Missing PKCE verifier in state");
  }
  return {
    verifier: parsed.verifier,
    projectId: typeof parsed.projectId === "string" ? parsed.projectId : ""
  };
}
async function authorizeAntigravity(projectId = "") {
  const pkce = await generatePKCE();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", ANTIGRAVITY_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", ANTIGRAVITY_REDIRECT_URI);
  url.searchParams.set("scope", ANTIGRAVITY_SCOPES.join(" "));
  url.searchParams.set("code_challenge", pkce.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set(
    "state",
    encodeState({ verifier: pkce.verifier, projectId: projectId || "" })
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account consent");
  return {
    url: url.toString(),
    verifier: pkce.verifier,
    projectId: projectId || ""
  };
}
var FETCH_TIMEOUT_MS = 1e4;
async function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchProjectID(accessToken) {
  const errors = [];
  const loadHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": GEMINI_CLI_HEADERS["User-Agent"],
    "Client-Metadata": getAntigravityHeaders()["Client-Metadata"]
  };
  const loadEndpoints = Array.from(
    /* @__PURE__ */ new Set([...ANTIGRAVITY_LOAD_ENDPOINTS, ...ANTIGRAVITY_ENDPOINT_FALLBACKS])
  );
  for (const baseEndpoint of loadEndpoints) {
    try {
      const url = `${baseEndpoint}/v1internal:loadCodeAssist`;
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: loadHeaders,
        body: JSON.stringify({
          metadata: {
            ideType: "ANTIGRAVITY",
            platform: process.platform === "win32" ? "WINDOWS" : "MACOS",
            pluginType: "GEMINI"
          }
        })
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        errors.push(
          `loadCodeAssist ${response.status} at ${baseEndpoint}${message ? `: ${message}` : ""}`
        );
        continue;
      }
      const data = await response.json();
      if (typeof data.cloudaicompanionProject === "string" && data.cloudaicompanionProject) {
        return data.cloudaicompanionProject;
      }
      if (data.cloudaicompanionProject && typeof data.cloudaicompanionProject.id === "string" && data.cloudaicompanionProject.id) {
        return data.cloudaicompanionProject.id;
      }
      errors.push(`loadCodeAssist missing project id at ${baseEndpoint}`);
    } catch (e) {
      errors.push(
        `loadCodeAssist error at ${baseEndpoint}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  if (errors.length) {
    log2.warn("Failed to resolve Antigravity project via loadCodeAssist", { errors: errors.join("; ") });
  }
  return "";
}
async function exchangeAntigravity(code, state) {
  try {
    const { verifier, projectId } = decodeState(state);
    const startTime = Date.now();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": GEMINI_CLI_HEADERS["User-Agent"]
      },
      body: new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: ANTIGRAVITY_REDIRECT_URI,
        code_verifier: verifier
      })
    });
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return { type: "failed", error: errorText };
    }
    const tokenPayload = await tokenResponse.json();
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          "User-Agent": GEMINI_CLI_HEADERS["User-Agent"]
        }
      }
    );
    const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {};
    const refreshToken = tokenPayload.refresh_token;
    if (!refreshToken) {
      return { type: "failed", error: "Missing refresh token in response" };
    }
    let effectiveProjectId = projectId;
    if (!effectiveProjectId) {
      effectiveProjectId = await fetchProjectID(tokenPayload.access_token);
    }
    const storedRefresh = `${refreshToken}|${effectiveProjectId || ""}`;
    return {
      type: "success",
      refresh: storedRefresh,
      access: tokenPayload.access_token,
      expires: calculateTokenExpiry(startTime, tokenPayload.expires_in),
      email: userInfo.email,
      projectId: effectiveProjectId || ""
    };
  } catch (error) {
    return {
      type: "failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// src/plugin/cli.ts
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// src/plugin/ui/ansi.ts
var ANSI = {
  // Cursor control
  hide: "\x1B[?25l",
  show: "\x1B[?25h",
  up: (n = 1) => `\x1B[${n}A`,
  down: (n = 1) => `\x1B[${n}B`,
  clearLine: "\x1B[2K",
  clearScreen: "\x1B[2J",
  moveTo: (row, col) => `\x1B[${row};${col}H`,
  // Styles
  cyan: "\x1B[36m",
  green: "\x1B[32m",
  red: "\x1B[31m",
  yellow: "\x1B[33m",
  dim: "\x1B[2m",
  bold: "\x1B[1m",
  reset: "\x1B[0m",
  inverse: "\x1B[7m"
};
function parseKey(data) {
  const s = data.toString();
  if (s === "\x1B[A" || s === "\x1BOA") return "up";
  if (s === "\x1B[B" || s === "\x1BOB") return "down";
  if (s === "\r" || s === "\n") return "enter";
  if (s === "") return "escape";
  if (s === "\x1B") return "escape-start";
  return null;
}
function isTTY() {
  return Boolean(process.stdin.isTTY);
}

// src/plugin/ui/select.ts
var ESCAPE_TIMEOUT_MS = 50;
var ANSI_REGEX = new RegExp("\\x1b\\[[0-9;]*m", "g");
var ANSI_LEADING_REGEX = new RegExp("^\\x1b\\[[0-9;]*m");
function stripAnsi(input3) {
  return input3.replace(ANSI_REGEX, "");
}
function truncateAnsi(input3, maxVisibleChars) {
  if (maxVisibleChars <= 0) return "";
  const visible = stripAnsi(input3);
  if (visible.length <= maxVisibleChars) return input3;
  const suffix = maxVisibleChars >= 3 ? "..." : ".".repeat(maxVisibleChars);
  const keep = Math.max(0, maxVisibleChars - suffix.length);
  let out = "";
  let i = 0;
  let kept = 0;
  while (i < input3.length && kept < keep) {
    if (input3[i] === "\x1B") {
      const m = input3.slice(i).match(ANSI_LEADING_REGEX);
      if (m) {
        out += m[0];
        i += m[0].length;
        continue;
      }
    }
    out += input3[i];
    i += 1;
    kept += 1;
  }
  if (out.includes("\x1B[")) {
    return `${out}${ANSI.reset}${suffix}`;
  }
  return out + suffix;
}
function getColorCode(color) {
  switch (color) {
    case "red":
      return ANSI.red;
    case "green":
      return ANSI.green;
    case "yellow":
      return ANSI.yellow;
    case "cyan":
      return ANSI.cyan;
    default:
      return "";
  }
}
async function select(items, options) {
  if (!isTTY()) {
    throw new Error("Interactive select requires a TTY terminal");
  }
  if (items.length === 0) {
    throw new Error("No menu items provided");
  }
  const isSelectable = (i) => !i.disabled && !i.separator && i.kind !== "heading";
  const enabledItems = items.filter(isSelectable);
  if (enabledItems.length === 0) {
    throw new Error("All items disabled");
  }
  if (enabledItems.length === 1) {
    return enabledItems[0].value;
  }
  const { message, subtitle } = options;
  const { stdin, stdout } = process;
  let cursor2 = items.findIndex(isSelectable);
  if (cursor2 === -1) cursor2 = 0;
  let escapeTimeout = null;
  let isCleanedUp = false;
  let renderedLines = 0;
  const render = () => {
    const columns = stdout.columns ?? 80;
    const rows = stdout.rows ?? 24;
    const shouldClearScreen = options.clearScreen === true;
    const previousRenderedLines = renderedLines;
    if (shouldClearScreen) {
      stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    } else if (previousRenderedLines > 0) {
      stdout.write(ANSI.up(previousRenderedLines));
    }
    let linesWritten = 0;
    const writeLine = (line) => {
      stdout.write(`${ANSI.clearLine}${line}
`);
      linesWritten += 1;
    };
    const subtitleLines = subtitle ? 3 : 0;
    const fixedLines = 1 + subtitleLines + 2;
    const maxVisibleItems = Math.max(1, Math.min(items.length, rows - fixedLines - 1));
    let windowStart = 0;
    let windowEnd = items.length;
    if (items.length > maxVisibleItems) {
      windowStart = cursor2 - Math.floor(maxVisibleItems / 2);
      windowStart = Math.max(0, Math.min(windowStart, items.length - maxVisibleItems));
      windowEnd = windowStart + maxVisibleItems;
    }
    const visibleItems = items.slice(windowStart, windowEnd);
    const headerMessage = truncateAnsi(message, Math.max(1, columns - 4));
    writeLine(`${ANSI.dim}\u250C  ${ANSI.reset}${headerMessage}`);
    if (subtitle) {
      writeLine(`${ANSI.dim}\u2502${ANSI.reset}`);
      const sub = truncateAnsi(subtitle, Math.max(1, columns - 4));
      writeLine(`${ANSI.cyan}\u25C6${ANSI.reset}  ${sub}`);
      writeLine("");
    }
    for (let i = 0; i < visibleItems.length; i++) {
      const itemIndex = windowStart + i;
      const item = visibleItems[i];
      if (!item) continue;
      if (item.separator) {
        writeLine(`${ANSI.dim}\u2502${ANSI.reset}`);
        continue;
      }
      if (item.kind === "heading") {
        const heading = truncateAnsi(`${ANSI.dim}${ANSI.bold}${item.label}${ANSI.reset}`, Math.max(1, columns - 6));
        writeLine(`${ANSI.cyan}\u2502${ANSI.reset}  ${heading}`);
        continue;
      }
      const isSelected = itemIndex === cursor2;
      const colorCode = getColorCode(item.color);
      let labelText;
      if (item.disabled) {
        labelText = `${ANSI.dim}${item.label} (unavailable)${ANSI.reset}`;
      } else if (isSelected) {
        labelText = colorCode ? `${colorCode}${item.label}${ANSI.reset}` : item.label;
        if (item.hint) labelText += ` ${ANSI.dim}${item.hint}${ANSI.reset}`;
      } else {
        labelText = colorCode ? `${ANSI.dim}${colorCode}${item.label}${ANSI.reset}` : `${ANSI.dim}${item.label}${ANSI.reset}`;
        if (item.hint) labelText += ` ${ANSI.dim}${item.hint}${ANSI.reset}`;
      }
      labelText = truncateAnsi(labelText, Math.max(1, columns - 8));
      if (isSelected) {
        writeLine(`${ANSI.cyan}\u2502${ANSI.reset}  ${ANSI.green}\u25CF${ANSI.reset} ${labelText}`);
      } else {
        writeLine(`${ANSI.cyan}\u2502${ANSI.reset}  ${ANSI.dim}\u25CB${ANSI.reset} ${labelText}`);
      }
    }
    const windowHint = items.length > visibleItems.length ? ` (${windowStart + 1}-${windowEnd}/${items.length})` : "";
    const helpText = options.help ?? `Up/Down to select | Enter: confirm | Esc: back${windowHint}`;
    const help = truncateAnsi(helpText, Math.max(1, columns - 6));
    writeLine(`${ANSI.cyan}\u2502${ANSI.reset}  ${ANSI.dim}${help}${ANSI.reset}`);
    writeLine(`${ANSI.cyan}\u2514${ANSI.reset}`);
    if (!shouldClearScreen && previousRenderedLines > linesWritten) {
      const extra = previousRenderedLines - linesWritten;
      for (let i = 0; i < extra; i++) {
        writeLine("");
      }
    }
    renderedLines = linesWritten;
  };
  return new Promise((resolve) => {
    const wasRaw = stdin.isRaw ?? false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (escapeTimeout) {
        clearTimeout(escapeTimeout);
        escapeTimeout = null;
      }
      try {
        stdin.removeListener("data", onKey);
        stdin.setRawMode(wasRaw);
        stdin.pause();
        stdout.write(ANSI.show);
      } catch {
      }
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
    };
    const onSignal = () => {
      cleanup();
      resolve(null);
    };
    const finishWithValue = (value) => {
      cleanup();
      resolve(value);
    };
    const findNextSelectable = (from, direction) => {
      if (items.length === 0) return from;
      let next = from;
      do {
        next = (next + direction + items.length) % items.length;
      } while (items[next]?.disabled || items[next]?.separator || items[next]?.kind === "heading");
      return next;
    };
    const onKey = (data) => {
      if (escapeTimeout) {
        clearTimeout(escapeTimeout);
        escapeTimeout = null;
      }
      const action = parseKey(data);
      switch (action) {
        case "up":
          cursor2 = findNextSelectable(cursor2, -1);
          render();
          return;
        case "down":
          cursor2 = findNextSelectable(cursor2, 1);
          render();
          return;
        case "enter":
          finishWithValue(items[cursor2]?.value ?? null);
          return;
        case "escape":
          finishWithValue(null);
          return;
        case "escape-start":
          escapeTimeout = setTimeout(() => {
            finishWithValue(null);
          }, ESCAPE_TIMEOUT_MS);
          return;
        default:
          return;
      }
    };
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    try {
      stdin.setRawMode(true);
    } catch {
      cleanup();
      resolve(null);
      return;
    }
    stdin.resume();
    stdout.write(ANSI.hide);
    render();
    stdin.on("data", onKey);
  });
}

// src/plugin/ui/confirm.ts
async function confirm(message, defaultYes = false) {
  const items = defaultYes ? [
    { label: "Yes", value: true },
    { label: "No", value: false }
  ] : [
    { label: "No", value: false },
    { label: "Yes", value: true }
  ];
  const result = await select(items, { message });
  return result ?? false;
}

// src/plugin/ui/auth-menu.ts
function formatRelativeTime(timestamp) {
  if (!timestamp) return "never";
  const days = Math.floor((Date.now() - timestamp) / 864e5);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString();
}
function formatDate(timestamp) {
  if (!timestamp) return "unknown";
  return new Date(timestamp).toLocaleDateString();
}
function getStatusBadge(status) {
  switch (status) {
    case "active":
      return `${ANSI.green}[active]${ANSI.reset}`;
    case "rate-limited":
      return `${ANSI.yellow}[rate-limited]${ANSI.reset}`;
    case "expired":
      return `${ANSI.red}[expired]${ANSI.reset}`;
    case "verification-required":
      return `${ANSI.red}[needs verification]${ANSI.reset}`;
    default:
      return "";
  }
}
async function showAuthMenu(accounts) {
  const items = [
    { label: "Actions", value: { type: "cancel" }, kind: "heading" },
    { label: "Add account", value: { type: "add" }, color: "cyan" },
    { label: "Check quotas", value: { type: "check" }, color: "cyan" },
    { label: "Verify one account", value: { type: "verify" }, color: "cyan" },
    { label: "Verify all accounts", value: { type: "verify-all" }, color: "cyan" },
    { label: "Configure models in opencode.json", value: { type: "configure-models" }, color: "cyan" },
    { label: "", value: { type: "cancel" }, separator: true },
    { label: "Accounts", value: { type: "cancel" }, kind: "heading" },
    ...accounts.map((account) => {
      const statusBadge = getStatusBadge(account.status);
      const currentBadge = account.isCurrentAccount ? ` ${ANSI.cyan}[current]${ANSI.reset}` : "";
      const disabledBadge = account.enabled === false ? ` ${ANSI.red}[disabled]${ANSI.reset}` : "";
      const baseLabel = account.email || `Account ${account.index + 1}`;
      const numbered = `${account.index + 1}. ${baseLabel}`;
      const fullLabel = `${numbered}${currentBadge}${statusBadge ? " " + statusBadge : ""}${disabledBadge}`;
      return {
        label: fullLabel,
        hint: account.lastUsed ? `used ${formatRelativeTime(account.lastUsed)}` : "",
        value: { type: "select-account", account }
      };
    }),
    { label: "", value: { type: "cancel" }, separator: true },
    { label: "Danger zone", value: { type: "cancel" }, kind: "heading" },
    { label: "Delete all accounts", value: { type: "delete-all" }, color: "red" }
  ];
  while (true) {
    const result = await select(items, {
      message: "Google accounts (Antigravity)",
      subtitle: "Select an action or account",
      clearScreen: true
    });
    if (!result) return { type: "cancel" };
    if (result.type === "delete-all") {
      const confirmed = await confirm("Delete ALL accounts? This cannot be undone.");
      if (!confirmed) continue;
    }
    return result;
  }
}
async function showAccountDetails(account) {
  const label = account.email || `Account ${account.index + 1}`;
  const badge = getStatusBadge(account.status);
  const disabledBadge = account.enabled === false ? ` ${ANSI.red}[disabled]${ANSI.reset}` : "";
  const header = `${label}${badge ? " " + badge : ""}${disabledBadge}`;
  const subtitleParts = [
    `Added: ${formatDate(account.addedAt)}`,
    `Last used: ${formatRelativeTime(account.lastUsed)}`
  ];
  while (true) {
    const result = await select([
      { label: "Back", value: "back" },
      { label: "Verify account access", value: "verify", color: "cyan" },
      { label: account.enabled === false ? "Enable account" : "Disable account", value: "toggle", color: account.enabled === false ? "green" : "yellow" },
      { label: "Refresh token", value: "refresh", color: "cyan" },
      { label: "Delete this account", value: "delete", color: "red" }
    ], {
      message: header,
      subtitle: subtitleParts.join(" | "),
      clearScreen: true
    });
    if (result === "delete") {
      const confirmed = await confirm(`Delete ${label}?`);
      if (!confirmed) continue;
    }
    if (result === "refresh") {
      const confirmed = await confirm(`Re-authenticate ${label}?`);
      if (!confirmed) continue;
    }
    return result ?? "cancel";
  }
}

// src/plugin/config/updater.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2, mkdirSync as mkdirSync3 } from "node:fs";
import { join as join3, dirname as dirname2 } from "node:path";
import { homedir as homedir3 } from "node:os";

// src/plugin/config/models.ts
var DEFAULT_MODALITIES = {
  input: ["text", "image", "pdf"],
  output: ["text"]
};
var OPENCODE_MODEL_DEFINITIONS = {
  "antigravity-gemini-3-pro": {
    name: "Gemini 3 Pro (Antigravity)",
    limit: { context: 1048576, output: 65535 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      high: { thinkingLevel: "high" }
    }
  },
  "antigravity-gemini-3.1-pro": {
    name: "Gemini 3.1 Pro (Antigravity)",
    limit: { context: 1048576, output: 65535 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      high: { thinkingLevel: "high" }
    }
  },
  "antigravity-gemini-3-flash": {
    name: "Gemini 3 Flash (Antigravity)",
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      minimal: { thinkingLevel: "minimal" },
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "antigravity-gemini-3.5-flash": {
    name: "Gemini 3.5 Flash (Antigravity)",
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      minimal: { thinkingLevel: "minimal" },
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "antigravity-gemini-3.6-flash": {
    name: "Gemini 3.6 Flash (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "antigravity-gemini-3.7-flash": {
    name: "Gemini 3.7 Flash (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "antigravity-gemini-3.8-flash": {
    name: "Gemini 3.8 Flash (Antigravity)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "antigravity-claude-sonnet-4-6": {
    name: "Claude Sonnet 4.6 (Antigravity)",
    limit: { context: 2e5, output: 64e3 },
    modalities: DEFAULT_MODALITIES
  },
  "antigravity-claude-opus-4-6-thinking": {
    name: "Claude Opus 4.6 Thinking (Antigravity)",
    limit: { context: 2e5, output: 64e3 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      low: { thinkingConfig: { thinkingBudget: 8192 } },
      max: { thinkingConfig: { thinkingBudget: 32768 } }
    }
  },
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash (Gemini CLI)",
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES
  },
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro (Gemini CLI)",
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES
  },
  "gemini-3-flash-preview": {
    name: "Gemini 3 Flash Preview (Gemini CLI)",
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES
  },
  "gemini-3.5-flash": {
    name: "Gemini 3.5 Flash (Gemini CLI)",
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES
  },
  "gemini-3.5-flash-lite": {
    name: "Gemini 3.5 Flash-Lite (Gemini CLI)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      minimal: { thinkingLevel: "minimal" },
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "gemini-3.6-flash": {
    name: "Gemini 3.6 Flash (Gemini CLI)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "gemini-3.7-flash": {
    name: "Gemini 3.7 Flash (Gemini CLI)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      minimal: { thinkingLevel: "minimal" },
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "gemini-3.8-flash": {
    name: "Gemini 3.8 Flash (Gemini CLI)",
    temperature: false,
    limit: { context: 1048576, output: 65536 },
    modalities: DEFAULT_MODALITIES,
    variants: {
      minimal: { thinkingLevel: "minimal" },
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" }
    }
  },
  "gemini-3-pro-preview": {
    name: "Gemini 3 Pro Preview (Gemini CLI)",
    limit: { context: 1048576, output: 65535 },
    modalities: DEFAULT_MODALITIES
  },
  "gemini-3.1-pro": {
    name: "Gemini 3.1 Pro (Gemini CLI)",
    limit: { context: 1048576, output: 65535 },
    modalities: DEFAULT_MODALITIES
  },
  "gemini-3.1-pro-preview-customtools": {
    name: "Gemini 3.1 Pro Preview Custom Tools (Gemini CLI)",
    limit: { context: 1048576, output: 65535 },
    modalities: DEFAULT_MODALITIES
  }
};
function modelIdFromGeminiName(name) {
  if (!name) return null;
  const id = name.replace(/^models\//, "").trim();
  return id || null;
}
function supportsGeminiGeneration(model) {
  const methods = model.supportedGenerationMethods ?? [];
  return methods.includes("generateContent") || methods.includes("streamGenerateContent");
}
function titleFromModelId(modelId) {
  return modelId.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function defaultLimitForModel(modelId) {
  if (modelId.includes("claude")) {
    return { context: 2e5, output: 64e3 };
  }
  return { context: 1048576, output: 65536 };
}
function defaultVariantsForModel(modelId) {
  const normalized = modelId.toLowerCase().replace(/^antigravity-/, "");
  if (normalized.includes("claude") && normalized.includes("thinking")) {
    return {
      low: { thinkingConfig: { thinkingBudget: 8192 } },
      max: { thinkingConfig: { thinkingBudget: 32768 } }
    };
  }
  if (normalized.startsWith("gemini-3") || normalized.startsWith("gemini-2.5")) {
    if (normalized.includes("pro")) {
      return {
        low: { thinkingLevel: "low" },
        high: { thinkingLevel: "high" }
      };
    }
    if (normalized.includes("flash")) {
      return {
        minimal: { thinkingLevel: "minimal" },
        low: { thinkingLevel: "low" },
        medium: { thinkingLevel: "medium" },
        high: { thinkingLevel: "high" }
      };
    }
  }
  return void 0;
}
function mergeWithStaticDefinition(modelId, discovered) {
  const existing = OPENCODE_MODEL_DEFINITIONS[modelId];
  if (!existing) return discovered;
  return {
    ...existing,
    ...discovered,
    limit: discovered.limit ?? existing.limit,
    modalities: discovered.modalities ?? existing.modalities,
    variants: existing.variants ?? discovered.variants
  };
}
function antigravityModelIdFromEntry(sourceId, entry) {
  const rawId = (entry.modelName || sourceId).trim();
  if (!rawId) return null;
  const modelId = rawId.replace(/^models\//, "");
  return modelId.startsWith("antigravity-") ? modelId : `antigravity-${modelId}`;
}
function modelsFromGeminiApi(models) {
  const definitions = {};
  for (const model of models) {
    if (!supportsGeminiGeneration(model)) continue;
    const modelId = modelIdFromGeminiName(model.name) || model.baseModelId;
    if (!modelId) continue;
    const variants = defaultVariantsForModel(modelId);
    const discovered = {
      name: model.displayName ? `${model.displayName} (Gemini API)` : `${titleFromModelId(modelId)} (Gemini API)`,
      limit: {
        context: model.inputTokenLimit ?? defaultLimitForModel(modelId).context,
        output: model.outputTokenLimit ?? defaultLimitForModel(modelId).output
      },
      modalities: DEFAULT_MODALITIES,
      ...variants ? { variants } : {}
    };
    definitions[modelId] = mergeWithStaticDefinition(modelId, discovered);
  }
  return definitions;
}
function modelsFromAntigravityAvailableModels(models) {
  const definitions = {};
  for (const [sourceId, entry] of Object.entries(models)) {
    const modelId = antigravityModelIdFromEntry(sourceId, entry);
    if (!modelId) continue;
    const variants = defaultVariantsForModel(modelId);
    const discovered = {
      name: entry.displayName ? `${entry.displayName} (Antigravity)` : `${titleFromModelId(modelId)} (Antigravity)`,
      limit: defaultLimitForModel(modelId),
      modalities: DEFAULT_MODALITIES,
      ...variants ? { variants } : {}
    };
    definitions[modelId] = mergeWithStaticDefinition(modelId, discovered);
  }
  return definitions;
}
function mergeModelDefinitions(...definitions) {
  return Object.assign({}, ...definitions);
}

// src/plugin/config/updater.ts
var PLUGIN_NAME = "opencode-antigravity-auth@latest";
var SCHEMA_URL = "https://opencode.ai/config.json";
var OPENCODE_JSON_FILENAME = "opencode.json";
var OPENCODE_JSONC_FILENAME = "opencode.jsonc";
function stripJsonCommentsAndTrailingCommas(json) {
  return json.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (match, group) => group ? "" : match
  ).replace(/,(\s*[}\]])/g, "$1");
}
function getOpencodeConfigDir() {
  const xdgConfig = process.env.XDG_CONFIG_HOME || join3(homedir3(), ".config");
  return join3(xdgConfig, "opencode");
}
function getOpencodeConfigPath() {
  const configDir = getOpencodeConfigDir();
  const jsoncPath = join3(configDir, OPENCODE_JSONC_FILENAME);
  const jsonPath = join3(configDir, OPENCODE_JSON_FILENAME);
  if (existsSync2(jsoncPath)) {
    return jsoncPath;
  }
  if (existsSync2(jsonPath)) {
    return jsonPath;
  }
  return jsonPath;
}
async function updateOpencodeConfig(options = {}) {
  const configPath = options.configPath ?? getOpencodeConfigPath();
  try {
    let config;
    if (existsSync2(configPath)) {
      const content = readFileSync2(configPath, "utf-8");
      config = JSON.parse(stripJsonCommentsAndTrailingCommas(content));
    } else {
      config = {
        $schema: SCHEMA_URL,
        plugin: [],
        provider: {}
      };
    }
    if (!config.$schema) {
      config.$schema = SCHEMA_URL;
    }
    if (!Array.isArray(config.plugin)) {
      config.plugin = [];
    }
    const hasPlugin = config.plugin.some(
      (p) => p.includes("opencode-antigravity-auth")
    );
    if (!hasPlugin) {
      config.plugin.push(PLUGIN_NAME);
    }
    if (!config.provider) {
      config.provider = {};
    }
    if (!config.provider.google) {
      config.provider.google = {};
    }
    config.provider.google.models = { ...OPENCODE_MODEL_DEFINITIONS };
    const configDir = dirname2(configPath);
    if (!existsSync2(configDir)) {
      mkdirSync3(configDir, { recursive: true });
    }
    writeFileSync2(configPath, JSON.stringify(config, null, 2), "utf-8");
    return {
      success: true,
      configPath
    };
  } catch (error) {
    return {
      success: false,
      configPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// src/plugin/cli.ts
async function promptProjectId() {
  if (!input.isTTY) {
    return "";
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("Project ID (leave blank to use your default project): ");
    return answer.trim();
  } finally {
    rl.close();
  }
}
async function pressEnterToContinue(message = "Press Enter to return to the menu... ") {
  if (!input.isTTY) return;
  const rl = createInterface({ input, output });
  try {
    await rl.question(message);
  } finally {
    rl.close();
  }
}
async function promptAddAnotherAccount(currentCount) {
  if (!input.isTTY) {
    return false;
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`Add another account? (${currentCount} added) (y/n): `);
    const normalized = answer.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    rl.close();
  }
}
async function promptLoginModeFallback(existingAccounts) {
  if (!input.isTTY) {
    return { mode: "add" };
  }
  const rl = createInterface({ input, output });
  try {
    console.log(`
${existingAccounts.length} account(s) saved:`);
    for (const acc of existingAccounts) {
      const label = acc.email || `Account ${acc.index + 1}`;
      console.log(`  ${acc.index + 1}. ${label}`);
    }
    console.log("");
    while (true) {
      const answer = await rl.question("(a)dd new, (f)resh start, (c)heck quotas, (v)erify account, (va) verify all? [a/f/c/v/va]: ");
      const normalized = answer.trim().toLowerCase();
      if (normalized === "a" || normalized === "add") {
        return { mode: "add" };
      }
      if (normalized === "f" || normalized === "fresh") {
        return { mode: "fresh" };
      }
      if (normalized === "c" || normalized === "check") {
        return { mode: "check" };
      }
      if (normalized === "v" || normalized === "verify") {
        return { mode: "verify" };
      }
      if (normalized === "va" || normalized === "verify-all" || normalized === "all") {
        return { mode: "verify-all", verifyAll: true };
      }
      console.log("Please enter 'a', 'f', 'c', 'v', or 'va'.");
    }
  } finally {
    rl.close();
  }
}
async function promptLoginMode(existingAccounts) {
  if (!isTTY()) {
    return promptLoginModeFallback(existingAccounts);
  }
  const accounts = existingAccounts.map((acc) => ({
    email: acc.email,
    index: acc.index,
    addedAt: acc.addedAt,
    lastUsed: acc.lastUsed,
    status: acc.status,
    isCurrentAccount: acc.isCurrentAccount,
    enabled: acc.enabled
  }));
  console.log("");
  while (true) {
    const action = await showAuthMenu(accounts);
    switch (action.type) {
      case "add":
        return { mode: "add" };
      case "check":
        return { mode: "check" };
      case "verify":
        return { mode: "verify" };
      case "verify-all":
        return { mode: "verify-all", verifyAll: true };
      case "select-account": {
        const accountAction = await showAccountDetails(action.account);
        if (accountAction === "delete") {
          return { mode: "add", deleteAccountIndex: action.account.index };
        }
        if (accountAction === "refresh") {
          return { mode: "add", refreshAccountIndex: action.account.index };
        }
        if (accountAction === "toggle") {
          return { mode: "manage", toggleAccountIndex: action.account.index };
        }
        if (accountAction === "verify") {
          return { mode: "verify", verifyAccountIndex: action.account.index };
        }
        continue;
      }
      case "delete-all":
        return { mode: "fresh", deleteAll: true };
      case "configure-models": {
        const result = await updateOpencodeConfig();
        if (result.success) {
          console.log(`
\u2713 Models configured in ${result.configPath}
`);
        } else {
          console.log(`
\u2717 Failed to configure models: ${result.error}
`);
        }
        await pressEnterToContinue();
        continue;
      }
      case "cancel":
        return { mode: "cancel" };
    }
  }
}

// src/plugin/project.ts
var log3 = createLogger("project");
var projectContextResultCache = /* @__PURE__ */ new Map();
var projectContextPendingCache = /* @__PURE__ */ new Map();
var CODE_ASSIST_METADATA = {
  ideType: "ANTIGRAVITY",
  platform: process.platform === "win32" ? "WINDOWS" : "MACOS",
  pluginType: "GEMINI"
};
function buildMetadata(_projectId) {
  return {
    ideType: CODE_ASSIST_METADATA.ideType
  };
}
function getDefaultTierId(allowedTiers) {
  if (!allowedTiers || allowedTiers.length === 0) {
    return void 0;
  }
  for (const tier of allowedTiers) {
    if (tier?.isDefault) {
      return tier.id;
    }
  }
  return allowedTiers[0]?.id;
}
function wait(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}
function extractManagedProjectId(payload) {
  if (!payload) {
    return void 0;
  }
  if (typeof payload.cloudaicompanionProject === "string") {
    return payload.cloudaicompanionProject;
  }
  if (payload.cloudaicompanionProject && typeof payload.cloudaicompanionProject.id === "string") {
    return payload.cloudaicompanionProject.id;
  }
  return void 0;
}
function getCacheKey(auth) {
  const refresh = auth.refresh?.trim();
  return refresh ? refresh : void 0;
}
function invalidateProjectContextCache(refresh) {
  if (!refresh) {
    projectContextPendingCache.clear();
    projectContextResultCache.clear();
    return;
  }
  projectContextPendingCache.delete(refresh);
  projectContextResultCache.delete(refresh);
}
async function loadManagedProject(accessToken, projectId) {
  const metadata = buildMetadata(projectId);
  const requestBody = { metadata };
  const loadHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": ANTIGRAVITY_CLI_USER_AGENT
  };
  const loadEndpoints = Array.from(
    /* @__PURE__ */ new Set([...ANTIGRAVITY_LOAD_ENDPOINTS, ...ANTIGRAVITY_ENDPOINT_FALLBACKS])
  );
  for (const baseEndpoint of loadEndpoints) {
    try {
      const response = await fetch(
        `${baseEndpoint}/v1internal:loadCodeAssist`,
        {
          method: "POST",
          headers: loadHeaders,
          body: JSON.stringify(requestBody)
        }
      );
      if (!response.ok) {
        continue;
      }
      return await response.json();
    } catch (error) {
      log3.debug("Failed to load managed project", { endpoint: baseEndpoint, error: String(error) });
      continue;
    }
  }
  return null;
}
async function onboardManagedProject(accessToken, tierId, projectId, attempts = 10, delayMs = 5e3) {
  const metadata = buildMetadata(projectId);
  const requestBody = {
    tierId,
    metadata
  };
  for (const baseEndpoint of ANTIGRAVITY_ENDPOINT_FALLBACKS) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetch(
          `${baseEndpoint}/v1internal:onboardUser`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": ANTIGRAVITY_CLI_USER_AGENT
            },
            body: JSON.stringify(requestBody)
          }
        );
        if (!response.ok) {
          break;
        }
        const payload = await response.json();
        const managedProjectId = payload.response?.cloudaicompanionProject?.id;
        if (payload.done && managedProjectId) {
          return managedProjectId;
        }
        if (payload.done && projectId) {
          return projectId;
        }
      } catch (error) {
        log3.debug("Failed to onboard managed project", { endpoint: baseEndpoint, error: String(error) });
        break;
      }
      await wait(delayMs);
    }
  }
  return void 0;
}
async function ensureProjectContext(auth) {
  const accessToken = auth.access;
  if (!accessToken) {
    return { auth, effectiveProjectId: "" };
  }
  const cacheKey = getCacheKey(auth);
  if (cacheKey) {
    const cached = projectContextResultCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const pending = projectContextPendingCache.get(cacheKey);
    if (pending) {
      return pending;
    }
  }
  const resolveContext = async () => {
    const parts = parseRefreshParts(auth.refresh);
    if (parts.managedProjectId) {
      return { auth, effectiveProjectId: parts.managedProjectId };
    }
    const fallbackProjectId = ANTIGRAVITY_DEFAULT_PROJECT_ID;
    const persistManagedProject = async (managedProjectId) => {
      const updatedAuth = {
        ...auth,
        refresh: formatRefreshParts({
          refreshToken: parts.refreshToken,
          projectId: parts.projectId,
          managedProjectId
        })
      };
      return { auth: updatedAuth, effectiveProjectId: managedProjectId };
    };
    const loadPayload = await loadManagedProject(accessToken, parts.projectId ?? fallbackProjectId);
    const resolvedManagedProjectId = extractManagedProjectId(loadPayload);
    if (resolvedManagedProjectId) {
      return persistManagedProject(resolvedManagedProjectId);
    }
    const tierId = getDefaultTierId(loadPayload?.allowedTiers) ?? "FREE";
    log3.debug("Auto-provisioning managed project", { tierId, projectId: parts.projectId });
    const provisionedProjectId = await onboardManagedProject(
      accessToken,
      tierId,
      parts.projectId
    );
    if (provisionedProjectId) {
      log3.debug("Successfully provisioned managed project", { provisionedProjectId });
      return persistManagedProject(provisionedProjectId);
    }
    log3.warn("Failed to provision managed project - account may not work correctly", {
      hasProjectId: !!parts.projectId
    });
    if (parts.projectId) {
      return { auth, effectiveProjectId: parts.projectId };
    }
    return { auth, effectiveProjectId: fallbackProjectId };
  };
  if (!cacheKey) {
    return resolveContext();
  }
  const promise = resolveContext().then((result) => {
    const nextKey = getCacheKey(result.auth) ?? cacheKey;
    projectContextPendingCache.delete(cacheKey);
    projectContextResultCache.set(nextKey, result);
    if (nextKey !== cacheKey) {
      projectContextResultCache.delete(cacheKey);
    }
    return result;
  }).catch((error) => {
    projectContextPendingCache.delete(cacheKey);
    throw error;
  });
  projectContextPendingCache.set(cacheKey, promise);
  return promise;
}

// src/plugin/request.ts
import crypto2 from "node:crypto";

// src/plugin/cache.ts
import { createHash as createHash2 } from "node:crypto";

// src/plugin/cache/signature-cache.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync4, readFileSync as readFileSync3, writeFileSync as writeFileSync3, renameSync as renameSync2, unlinkSync as unlinkSync3 } from "node:fs";
import { join as join4, dirname as dirname3 } from "node:path";
import { homedir as homedir4 } from "node:os";
function getConfigDir3() {
  const platform = process.platform;
  if (platform === "win32") {
    return join4(process.env.APPDATA || join4(homedir4(), "AppData", "Roaming"), "opencode");
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || join4(homedir4(), ".config");
  return join4(xdgConfig, "opencode");
}
function getCacheFilePath() {
  return join4(getConfigDir3(), "antigravity-signature-cache.json");
}
var SignatureCache = class {
  // In-memory cache: key -> entry with signature and optional thinking text
  cache = /* @__PURE__ */ new Map();
  // Configuration
  memoryTtlMs;
  diskTtlMs;
  writeIntervalMs;
  cacheFilePath;
  enabled;
  // State
  dirty = false;
  writeTimer = null;
  cleanupTimer = null;
  // Statistics
  stats = {
    memoryHits: 0,
    diskHits: 0,
    misses: 0,
    writes: 0
  };
  constructor(config) {
    this.enabled = config.enabled;
    this.memoryTtlMs = config.memory_ttl_seconds * 1e3;
    this.diskTtlMs = config.disk_ttl_seconds * 1e3;
    this.writeIntervalMs = config.write_interval_seconds * 1e3;
    this.cacheFilePath = getCacheFilePath();
    if (this.enabled) {
      this.loadFromDisk();
      this.startBackgroundTasks();
    }
  }
  // ===========================================================================
  // Public API
  // ===========================================================================
  /**
   * Generate a cache key from sessionId and modelId.
   */
  static makeKey(sessionId, modelId) {
    return `${sessionId}:${modelId}`;
  }
  /**
   * Store a signature in the cache.
   */
  store(key, signature) {
    if (!this.enabled) return;
    this.cache.set(key, {
      value: signature,
      timestamp: Date.now()
    });
    this.dirty = true;
  }
  /**
   * Retrieve a signature from the cache.
   * Returns null if not found or expired.
   */
  retrieve(key) {
    if (!this.enabled) return null;
    const entry = this.cache.get(key);
    if (entry) {
      const age = Date.now() - entry.timestamp;
      if (age <= this.memoryTtlMs) {
        this.stats.memoryHits++;
        return entry.value;
      }
      this.cache.delete(key);
    }
    this.stats.misses++;
    return null;
  }
  /**
   * Check if a key exists in the cache (without updating stats).
   */
  has(key) {
    if (!this.enabled) return false;
    const entry = this.cache.get(key);
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age <= this.memoryTtlMs;
  }
  // ===========================================================================
  // Full Thinking Cache (ported from LLM-API-Key-Proxy)
  // ===========================================================================
  /**
   * Store full thinking content with signature.
   * This enables recovery even after thinking text is stripped by compaction.
   * 
   * Port of LLM-API-Key-Proxy's _cache_thinking()
   */
  storeThinking(key, thinkingText, signature, toolIds) {
    if (!this.enabled || !thinkingText || !signature) return;
    this.cache.set(key, {
      value: signature,
      timestamp: Date.now(),
      thinkingText,
      textPreview: thinkingText.slice(0, 100),
      toolIds
    });
    this.dirty = true;
  }
  /**
   * Retrieve full thinking content by key.
   * Returns null if not found or expired.
   */
  retrieveThinking(key) {
    if (!this.enabled) return null;
    const entry = this.cache.get(key);
    if (!entry || !entry.thinkingText) return null;
    const age = Date.now() - entry.timestamp;
    if (age > this.memoryTtlMs) {
      this.cache.delete(key);
      return null;
    }
    this.stats.memoryHits++;
    return {
      text: entry.thinkingText,
      signature: entry.value,
      toolIds: entry.toolIds
    };
  }
  /**
   * Check if full thinking content exists for a key.
   */
  hasThinking(key) {
    if (!this.enabled) return false;
    const entry = this.cache.get(key);
    if (!entry || !entry.thinkingText) return false;
    const age = Date.now() - entry.timestamp;
    return age <= this.memoryTtlMs;
  }
  /**
   * Get cache statistics.
   */
  getStats() {
    return {
      ...this.stats,
      memoryEntries: this.cache.size,
      dirty: this.dirty,
      diskEnabled: this.enabled
    };
  }
  /**
   * Manually trigger a disk save.
   */
  async flush() {
    if (!this.enabled) return true;
    return this.saveToDisk();
  }
  /**
   * Graceful shutdown: stop timers and flush to disk.
   */
  shutdown() {
    if (this.writeTimer) {
      clearInterval(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.dirty && this.enabled) {
      this.saveToDisk();
    }
  }
  // ===========================================================================
  // Disk Operations
  // ===========================================================================
  /**
   * Load cache from disk file with TTL validation.
   */
  loadFromDisk() {
    try {
      if (!existsSync3(this.cacheFilePath)) {
        return;
      }
      const content = readFileSync3(this.cacheFilePath, "utf-8");
      const data = JSON.parse(content);
      if (data.version !== "1.0") {
        return;
      }
      const now = Date.now();
      let loaded = 0;
      let expired = 0;
      for (const [key, entry] of Object.entries(data.entries)) {
        const age = now - entry.timestamp;
        if (age <= this.diskTtlMs) {
          this.cache.set(key, {
            value: entry.value,
            timestamp: entry.timestamp
          });
          loaded++;
        } else {
          expired++;
        }
      }
    } catch {
    }
  }
  /**
   * Save cache to disk with atomic write pattern.
   * Merges with existing disk entries that haven't expired.
   */
  saveToDisk() {
    try {
      const dir = dirname3(this.cacheFilePath);
      if (!existsSync3(dir)) {
        mkdirSync4(dir, { recursive: true });
      }
      ensureGitignoreSync(dir);
      const now = Date.now();
      let existingEntries = {};
      if (existsSync3(this.cacheFilePath)) {
        try {
          const content = readFileSync3(this.cacheFilePath, "utf-8");
          const data = JSON.parse(content);
          existingEntries = data.entries || {};
        } catch {
        }
      }
      const validDiskEntries = {};
      for (const [key, entry] of Object.entries(existingEntries)) {
        const age = now - entry.timestamp;
        if (age <= this.diskTtlMs) {
          validDiskEntries[key] = entry;
        }
      }
      const mergedEntries = { ...validDiskEntries };
      for (const [key, entry] of this.cache.entries()) {
        mergedEntries[key] = {
          value: entry.value,
          timestamp: entry.timestamp
        };
      }
      const cacheData = {
        version: "1.0",
        memory_ttl_seconds: this.memoryTtlMs / 1e3,
        disk_ttl_seconds: this.diskTtlMs / 1e3,
        entries: mergedEntries,
        statistics: {
          memory_hits: this.stats.memoryHits,
          disk_hits: this.stats.diskHits,
          misses: this.stats.misses,
          writes: this.stats.writes + 1,
          last_write: now
        }
      };
      const tmpPath = `${this.cacheFilePath}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
      writeFileSync3(tmpPath, JSON.stringify(cacheData, null, 2), "utf-8");
      try {
        renameSync2(tmpPath, this.cacheFilePath);
      } catch {
        writeFileSync3(this.cacheFilePath, readFileSync3(tmpPath));
        try {
          unlinkSync3(tmpPath);
        } catch {
        }
      }
      this.stats.writes++;
      this.dirty = false;
      return true;
    } catch {
      return false;
    }
  }
  // ===========================================================================
  // Background Tasks
  // ===========================================================================
  /**
   * Start background write and cleanup timers.
   */
  startBackgroundTasks() {
    this.writeTimer = setInterval(() => {
      if (this.dirty) {
        this.saveToDisk();
      }
    }, this.writeIntervalMs);
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 30 * 60 * 1e3);
  }
  /**
   * Remove expired entries from memory.
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.memoryTtlMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }
  }
};
function createSignatureCache(config) {
  if (!config || !config.enabled) {
    return null;
  }
  return new SignatureCache(config);
}

// src/plugin/cache.ts
var authCache = /* @__PURE__ */ new Map();
function normalizeRefreshKey(refresh) {
  const key = refresh?.trim();
  return key ? key : void 0;
}
function storeCachedAuth(auth) {
  const key = normalizeRefreshKey(auth.refresh);
  if (!key) {
    return;
  }
  authCache.set(key, auth);
}
function clearCachedAuth(refresh) {
  if (!refresh) {
    authCache.clear();
    return;
  }
  const key = normalizeRefreshKey(refresh);
  if (key) {
    authCache.delete(key);
  }
}
var signatureCache = /* @__PURE__ */ new Map();
var sessionLastTouched = /* @__PURE__ */ new Map();
var SIGNATURE_CACHE_TTL_MS = 60 * 60 * 1e3;
var MAX_ENTRIES_PER_SESSION = 100;
var MAX_SESSIONS = 50;
function dropSession(sessionId) {
  signatureCache.delete(sessionId);
  sessionLastTouched.delete(sessionId);
}
function touchSession(sessionId, now) {
  sessionLastTouched.set(sessionId, now);
}
function evictStaleSessions(now) {
  for (const [sessionId, touched] of sessionLastTouched) {
    if (now - touched > SIGNATURE_CACHE_TTL_MS) {
      dropSession(sessionId);
    }
  }
  if (signatureCache.size > MAX_SESSIONS) {
    const ordered = Array.from(sessionLastTouched.entries()).sort((a, b) => a[1] - b[1]);
    const removeCount = signatureCache.size - MAX_SESSIONS;
    for (let i = 0; i < removeCount && i < ordered.length; i++) {
      const entry = ordered[i];
      if (entry) {
        dropSession(entry[0]);
      }
    }
  }
}
var SIGNATURE_TEXT_HASH_HEX_LEN = 16;
var diskCache = null;
function initDiskSignatureCache(config) {
  diskCache = createSignatureCache(config);
  return diskCache;
}
function hashText(text) {
  return createHash2("sha256").update(text, "utf8").digest("hex").slice(0, SIGNATURE_TEXT_HASH_HEX_LEN);
}
function makeDiskKey(sessionId, textHash) {
  return `${sessionId}:${textHash}`;
}
function cacheSignature(sessionId, text, signature) {
  if (!sessionId || !text || !signature) return;
  const now = Date.now();
  evictStaleSessions(now);
  const textHash = hashText(text);
  let sessionMemCache = signatureCache.get(sessionId);
  if (!sessionMemCache) {
    sessionMemCache = /* @__PURE__ */ new Map();
    signatureCache.set(sessionId, sessionMemCache);
  }
  if (sessionMemCache.size >= MAX_ENTRIES_PER_SESSION) {
    const now2 = Date.now();
    for (const [key, entry] of sessionMemCache.entries()) {
      if (now2 - entry.timestamp > SIGNATURE_CACHE_TTL_MS) {
        sessionMemCache.delete(key);
      }
    }
    if (sessionMemCache.size >= MAX_ENTRIES_PER_SESSION) {
      const entries = Array.from(sessionMemCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(MAX_ENTRIES_PER_SESSION / 4));
      for (const [key] of toRemove) {
        sessionMemCache.delete(key);
      }
    }
  }
  sessionMemCache.set(textHash, { signature, timestamp: now });
  touchSession(sessionId, now);
  evictStaleSessions(now);
  if (diskCache) {
    const diskKey = makeDiskKey(sessionId, textHash);
    diskCache.store(diskKey, signature);
  }
}
function getCachedSignature(sessionId, text) {
  if (!sessionId || !text) return void 0;
  const now = Date.now();
  evictStaleSessions(now);
  const textHash = hashText(text);
  const sessionMemCache = signatureCache.get(sessionId);
  if (sessionMemCache) {
    const entry = sessionMemCache.get(textHash);
    if (entry) {
      if (now - entry.timestamp > SIGNATURE_CACHE_TTL_MS) {
        sessionMemCache.delete(textHash);
      } else {
        touchSession(sessionId, now);
        return entry.signature;
      }
    }
  }
  if (diskCache) {
    const diskKey = makeDiskKey(sessionId, textHash);
    const diskValue = diskCache.retrieve(diskKey);
    if (diskValue) {
      let memCache = signatureCache.get(sessionId);
      if (!memCache) {
        memCache = /* @__PURE__ */ new Map();
        signatureCache.set(sessionId, memCache);
      }
      memCache.set(textHash, { signature: diskValue, timestamp: now });
      touchSession(sessionId, now);
      evictStaleSessions(now);
      return diskValue;
    }
  }
  return void 0;
}

// src/plugin/config/schema.ts
import { z as z2 } from "zod";
var AccountSelectionStrategySchema = z2.enum(["sticky", "round-robin", "hybrid"]);
var ToastScopeSchema = z2.enum(["root_only", "all"]);
var SchedulingModeSchema = z2.enum(["cache_first", "balance", "performance_first"]);
var AgySdkCloudProjectSchema = z2.object({
  label: z2.string().optional(),
  api_key: z2.string().trim().min(1, "api_key must not be empty"),
  project_id: z2.string().optional(),
  enabled: z2.boolean().default(true)
});
var AgySdkConfigSchema = z2.object({
  /** Enable the newer Antigravity SDK/Gemini API path for API-key credentials. */
  enabled: z2.boolean().default(true),
  /** Prefer API-key projects for Gemini requests when OAuth credentials are also present. */
  prefer_for_gemini: z2.boolean().default(false),
  /** Use API-key projects as fallback when OAuth Antigravity/Gemini CLI quotas are unavailable. */
  api_key_fallback: z2.boolean().default(true),
  /** Optional pool of Google AI API keys / Cloud projects for Gemini API fallback. */
  cloud_projects: z2.array(AgySdkCloudProjectSchema).default([])
});
var ModelDiscoveryConfigSchema = z2.object({
  /** Enable runtime model discovery through OpenCode's provider.models hook. */
  enabled: z2.boolean().default(true),
  /** Include public Gemini API models discovered from API keys. */
  gemini_api: z2.boolean().default(true),
  /** Include OAuth-backed Antigravity models discovered from the internal available-models API. */
  antigravity: z2.boolean().default(true)
});
var SignatureCacheConfigSchema = z2.object({
  /** Enable disk caching of signatures (default: true) */
  enabled: z2.boolean().default(true),
  /** In-memory TTL in seconds (default: 3600 = 1 hour) */
  memory_ttl_seconds: z2.number().min(60).max(86400).default(3600),
  /** Disk TTL in seconds (default: 172800 = 48 hours) */
  disk_ttl_seconds: z2.number().min(3600).max(604800).default(172800),
  /** Background write interval in seconds (default: 60) */
  write_interval_seconds: z2.number().min(10).max(600).default(60)
});
var AntigravityConfigSchema = z2.object({
  /** JSON Schema reference for IDE support */
  $schema: z2.string().optional(),
  // =========================================================================
  // General Settings
  // =========================================================================
  /** 
   * Suppress most toast notifications (rate limit, account switching, etc.)
   * Recovery toasts are always shown regardless of this setting.
   * Env override: OPENCODE_ANTIGRAVITY_QUIET=1
   * @default false
   */
  quiet_mode: z2.boolean().default(false),
  /**
   * Control which sessions show toast notifications.
   * 
   * - `root_only` (default): Only root sessions show toasts.
   *   Subagents and background tasks will be silent (less spam).
   * - `all`: All sessions show toasts including subagents and background tasks.
   * 
   * Debug logging captures all toasts regardless of this setting.
   * Env override: OPENCODE_ANTIGRAVITY_TOAST_SCOPE=all
   * @default "root_only"
   */
  toast_scope: ToastScopeSchema.default("root_only"),
  /**
   * Enable debug logging to file.
   * Env override: OPENCODE_ANTIGRAVITY_DEBUG=1
   * @default false
   */
  debug: z2.boolean().default(false),
  /**
   * Show debug logs in the TUI log panel.
   * Works independently from `debug` file logging.
   * Env override: OPENCODE_ANTIGRAVITY_DEBUG_TUI=1
   * @default false
   */
  debug_tui: z2.boolean().default(false),
  /**
   * Custom directory for debug logs.
   * Env override: OPENCODE_ANTIGRAVITY_LOG_DIR=/path/to/logs
   * @default OS-specific config dir + "/antigravity-logs"
   */
  log_dir: z2.string().optional(),
  // =========================================================================
  // Thinking Blocks
  // =========================================================================
  /**
   * Preserve thinking blocks for Claude models using signature caching.
   * 
   * When false (default): Thinking blocks are stripped for reliability.
   * When true: Full context preserved, but may encounter signature errors.
   * 
   * Env override: OPENCODE_ANTIGRAVITY_KEEP_THINKING=1
   * @default false
   */
  keep_thinking: z2.boolean().default(false),
  enable_thinking_warmup: z2.boolean().default(false),
  // =========================================================================
  // Tools
  // =========================================================================
  /**
   * Register the plugin's `google_search` tool.
   *
   * The tool answers through Google Search grounding on your Antigravity
   * quota. Turn it off to let the agent fall back to whatever other search or
   * fetch tools your OpenCode setup provides.
   *
   * @default true
   */
  google_search_tool: z2.boolean().default(true),
  // =========================================================================
  // Session Recovery
  // =========================================================================
  /**
   * Enable automatic session recovery from tool_result_missing errors.
   * When enabled, shows a toast notification when recoverable errors occur.
   * 
   * @default true
   */
  session_recovery: z2.boolean().default(true),
  /**
   * Automatically send a "continue" prompt after successful recovery.
   * Only applies when session_recovery is enabled.
   * 
   * When false: Only shows toast notification, user must manually continue.
   * When true: Automatically sends "continue" to resume the session.
   * 
   * @default false
   */
  auto_resume: z2.boolean().default(false),
  /**
   * Custom text to send when auto-resuming after recovery.
   * Only used when auto_resume is enabled.
   * 
   * @default "continue"
   */
  resume_text: z2.string().default("continue"),
  // =========================================================================
  // Signature Caching
  // =========================================================================
  /**
   * Signature cache configuration for persisting thinking block signatures.
   * Only used when keep_thinking is enabled.
   */
  signature_cache: SignatureCacheConfigSchema.optional(),
  // =========================================================================
  // Empty Response Retry (ported from LLM-API-Key-Proxy)
  // =========================================================================
  /**
   * Maximum retry attempts when Antigravity returns an empty response.
   * Empty responses occur when no candidates/choices are returned.
   * 
   * @default 4
   */
  empty_response_max_attempts: z2.number().min(1).max(10).default(4),
  /**
   * Delay in milliseconds between empty response retries.
   * 
   * @default 2000
   */
  empty_response_retry_delay_ms: z2.number().min(500).max(1e4).default(2e3),
  // =========================================================================
  // Tool ID Recovery (ported from LLM-API-Key-Proxy)
  // =========================================================================
  /**
   * Enable tool ID orphan recovery.
   * When tool responses have mismatched IDs (due to context compaction),
   * attempt to match them by function name or create placeholders.
   * 
   * @default true
   */
  tool_id_recovery: z2.boolean().default(true),
  // =========================================================================
  // Tool Hallucination Prevention (ported from LLM-API-Key-Proxy)
  // =========================================================================
  /**
   * Enable tool hallucination prevention for Claude models.
   * When enabled, injects:
   * - Parameter signatures into tool descriptions
   * - System instruction with strict tool usage rules
   * 
   * This helps prevent Claude from using parameter names from its training
   * data instead of the actual schema.
   * 
   * @default true
   */
  claude_tool_hardening: z2.boolean().default(true),
  /**
   * Enable Claude prompt auto-caching by adding top-level cache_control when absent.
   *
   * @default false
   */
  claude_prompt_auto_caching: z2.boolean().default(false),
  // =========================================================================
  // Proactive Token Refresh (ported from LLM-API-Key-Proxy)
  // =========================================================================
  /**
   * Enable proactive background token refresh.
   * When enabled, tokens are refreshed in the background before they expire,
   * ensuring requests never block on token refresh.
   * 
   * @default true
   */
  proactive_token_refresh: z2.boolean().default(true),
  /**
   * Seconds before token expiry to trigger proactive refresh.
   * Default is 30 minutes (1800 seconds).
   * 
   * @default 1800
   */
  proactive_refresh_buffer_seconds: z2.number().min(60).max(7200).default(1800),
  /**
   * Interval between proactive refresh checks in seconds.
   * Default is 5 minutes (300 seconds).
   * 
   * @default 300
   */
  proactive_refresh_check_interval_seconds: z2.number().min(30).max(1800).default(300),
  // =========================================================================
  // Rate Limiting
  // =========================================================================
  /**
   * Maximum time in seconds to wait when all accounts are rate-limited.
   * If the minimum wait time across all accounts exceeds this threshold,
   * the plugin fails fast with an error instead of hanging.
   * 
   * Set to 0 to disable (wait indefinitely).
   * 
   * @default 300 (5 minutes)
   */
  max_rate_limit_wait_seconds: z2.number().min(0).max(3600).default(300),
  /**
   * @deprecated Kept only for backward compatibility.
   * This flag is ignored at runtime.
   * Gemini requests always fall back between Antigravity and Gemini CLI quotas.
   *
   * @default false
   */
  quota_fallback: z2.boolean().default(false),
  /**
   * Prefer gemini-cli routing before Antigravity for Gemini models.
   * 
   * When false (default): Antigravity is tried first, then gemini-cli.
   * When true: gemini-cli is tried first, then Antigravity.
   * 
   * @default false
   */
  cli_first: z2.boolean().default(false),
  /**
   * Antigravity SDK / Gemini API support.
   *
   * Official Antigravity SDK examples use Gemini API keys (`GEMINI_API_KEY`).
   * These projects are independent from OAuth accounts and can be used as the
   * new Gemini API path or as fallback capacity when OAuth-backed quotas are exhausted.
   */
  agy_sdk: AgySdkConfigSchema.default({
    enabled: true,
    prefer_for_gemini: false,
    api_key_fallback: true,
    cloud_projects: []
  }),
  /**
   * Runtime model discovery.
   *
   * When enabled, OpenCode can populate provider models from available Gemini API
   * and Antigravity model-list APIs instead of relying only on static config maps.
   * Static bundled definitions remain the fallback when discovery is unavailable.
   */
  model_discovery: ModelDiscoveryConfigSchema.default({
    enabled: true,
    gemini_api: true,
    antigravity: true
  }),
  /**
   * Strategy for selecting accounts when making requests.
   * Env override: OPENCODE_ANTIGRAVITY_ACCOUNT_SELECTION_STRATEGY
   * @default "hybrid"
   */
  account_selection_strategy: AccountSelectionStrategySchema.default("hybrid"),
  /**
   * Enable PID-based account offset for multi-session distribution.
   * 
   * When enabled, different sessions (PIDs) will prefer different starting
   * accounts, which helps distribute load when running multiple parallel agents.
   * 
   * When disabled (default), accounts start from the same index, which preserves
   * Anthropic's prompt cache across restarts (recommended for single-session use).
   * 
   * Env override: OPENCODE_ANTIGRAVITY_PID_OFFSET_ENABLED=1
   * @default false
   */
  pid_offset_enabled: z2.boolean().default(false),
  /**
     * Switch to another account immediately on first rate limit (after 1s delay).
     * When disabled, retries same account first, then switches on second rate limit.
     * 
     * @default true
     */
  switch_on_first_rate_limit: z2.boolean().default(true),
  /**
   * Scheduling mode for rate limit behavior.
   * 
   * - `cache_first`: Wait for same account to recover (preserves prompt cache). Default.
   * - `balance`: Switch account immediately on rate limit. Maximum availability.
   * - `performance_first`: Round-robin distribution for maximum throughput.
   * 
   * Env override: OPENCODE_ANTIGRAVITY_SCHEDULING_MODE
   * @default "cache_first"
   */
  scheduling_mode: SchedulingModeSchema.default("cache_first"),
  /**
   * Maximum seconds to wait for same account in cache_first mode.
   * If the account's rate limit reset time exceeds this, switch accounts.
   * 
   * @default 60
   */
  max_cache_first_wait_seconds: z2.number().min(5).max(300).default(60),
  /**
   * TTL in seconds for failure count expiration.
   * After this period of no failures, consecutiveFailures resets to 0.
   * This prevents old failures from permanently penalizing an account.
   * 
   * @default 3600 (1 hour)
   */
  failure_ttl_seconds: z2.number().min(60).max(7200).default(3600),
  /**
   * Default retry delay in seconds when API doesn't return a retry-after header.
   * Lower values allow faster retries but may trigger more 429 errors.
   * 
   * @default 60
   */
  default_retry_after_seconds: z2.number().min(1).max(300).default(60),
  /**
   * Maximum backoff delay in seconds for exponential retry.
   * This caps how long the exponential backoff can grow.
   * 
   * @default 60
   */
  max_backoff_seconds: z2.number().min(5).max(300).default(60),
  /**
   * Maximum random delay in milliseconds before each API request.
   * Adds timing jitter to break predictable request cadence patterns.
   * Set to 0 to disable request jitter.
   * 
   * @default 0
   */
  request_jitter_max_ms: z2.number().min(0).max(5e3).default(0),
  /**
   * Soft quota threshold percentage (1-100).
   * When an account's quota usage reaches this percentage, skip it during
   * account selection (same as if it were rate-limited).
   * 
   * Example: 90 means skip account when 90% of quota is used (10% remaining).
   * Set to 100 to disable soft quota protection.
   * 
   * @default 90
   */
  soft_quota_threshold_percent: z2.number().min(1).max(100).default(90),
  /**
   * How often to refresh quota data in the background (in minutes).
   * Quota is refreshed opportunistically after successful API requests.
   * Set to 0 to disable automatic refresh (manual only via Check quotas).
   * 
   * @default 15
   */
  quota_refresh_interval_minutes: z2.number().min(0).max(60).default(15),
  /**
   * How long quota cache is considered fresh for threshold checks (in minutes).
   * After this time, cache is stale and account is allowed (fail-open).
   * 
   * "auto" = derive from refresh interval: max(2 * refresh_interval, 10)
   * 
   * @default "auto"
   */
  soft_quota_cache_ttl_minutes: z2.union([
    z2.literal("auto"),
    z2.number().min(1).max(120)
  ]).default("auto"),
  // =========================================================================
  // Health Score (used by hybrid strategy)
  // =========================================================================
  health_score: z2.object({
    initial: z2.number().min(0).max(100).default(70),
    success_reward: z2.number().min(0).max(10).default(1),
    rate_limit_penalty: z2.number().min(-50).max(0).default(-10),
    failure_penalty: z2.number().min(-100).max(0).default(-20),
    recovery_rate_per_hour: z2.number().min(0).max(20).default(2),
    min_usable: z2.number().min(0).max(100).default(50),
    max_score: z2.number().min(50).max(100).default(100)
  }).optional(),
  // =========================================================================
  // Token Bucket (for hybrid strategy)
  // =========================================================================
  token_bucket: z2.object({
    max_tokens: z2.number().min(1).max(1e3).default(50),
    regeneration_rate_per_minute: z2.number().min(0.1).max(60).default(6),
    initial_tokens: z2.number().min(1).max(1e3).default(50)
  }).optional(),
  // =========================================================================
  // Auto-Update
  // =========================================================================
  /**
   * Enable automatic plugin updates.
   * @default true
   */
  auto_update: z2.boolean().default(true)
});
var DEFAULT_CONFIG = {
  quiet_mode: false,
  toast_scope: "root_only",
  debug: false,
  debug_tui: false,
  keep_thinking: false,
  enable_thinking_warmup: false,
  session_recovery: true,
  auto_resume: true,
  resume_text: "continue",
  empty_response_max_attempts: 4,
  empty_response_retry_delay_ms: 2e3,
  tool_id_recovery: true,
  claude_tool_hardening: true,
  claude_prompt_auto_caching: false,
  proactive_token_refresh: true,
  proactive_refresh_buffer_seconds: 1800,
  proactive_refresh_check_interval_seconds: 300,
  max_rate_limit_wait_seconds: 300,
  quota_fallback: false,
  cli_first: false,
  agy_sdk: {
    enabled: true,
    prefer_for_gemini: false,
    api_key_fallback: true,
    cloud_projects: []
  },
  model_discovery: {
    enabled: true,
    gemini_api: true,
    antigravity: true
  },
  account_selection_strategy: "hybrid",
  pid_offset_enabled: false,
  switch_on_first_rate_limit: true,
  scheduling_mode: "cache_first",
  max_cache_first_wait_seconds: 60,
  failure_ttl_seconds: 3600,
  default_retry_after_seconds: 60,
  max_backoff_seconds: 60,
  request_jitter_max_ms: 0,
  soft_quota_threshold_percent: 90,
  quota_refresh_interval_minutes: 15,
  soft_quota_cache_ttl_minutes: "auto",
  auto_update: true,
  google_search_tool: true,
  signature_cache: {
    enabled: true,
    memory_ttl_seconds: 3600,
    disk_ttl_seconds: 172800,
    write_interval_seconds: 60
  },
  health_score: {
    initial: 70,
    success_reward: 1,
    rate_limit_penalty: -10,
    failure_penalty: -20,
    recovery_rate_per_hour: 2,
    min_usable: 50,
    max_score: 100
  },
  token_bucket: {
    max_tokens: 50,
    regeneration_rate_per_minute: 6,
    initial_tokens: 50
  }
};

// src/plugin/config/loader.ts
import { existsSync as existsSync4, readFileSync as readFileSync4 } from "node:fs";
import { join as join5 } from "node:path";
import { homedir as homedir5 } from "node:os";
var log4 = createLogger("config");
function getConfigDir4() {
  if (process.env.OPENCODE_CONFIG_DIR) {
    return process.env.OPENCODE_CONFIG_DIR;
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || join5(homedir5(), ".config");
  return join5(xdgConfig, "opencode");
}
function getUserConfigPath() {
  return join5(getConfigDir4(), "antigravity.json");
}
function getProjectConfigPath(directory) {
  return join5(directory, ".opencode", "antigravity.json");
}
function loadConfigFile(path4) {
  try {
    if (!existsSync4(path4)) {
      return null;
    }
    const content = readFileSync4(path4, "utf-8");
    const rawConfig = JSON.parse(content);
    const result = AntigravityConfigSchema.partial().safeParse(rawConfig);
    if (!result.success) {
      log4.warn("Config validation error", {
        path: path4,
        issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")
      });
      return null;
    }
    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      log4.warn("Invalid JSON in config file", { path: path4, error: error.message });
    } else {
      log4.warn("Failed to load config file", { path: path4, error: String(error) });
    }
    return null;
  }
}
function mergeConfigs(base, override) {
  return {
    ...base,
    ...override,
    // Deep merge signature_cache if both exist
    signature_cache: override.signature_cache ? {
      ...base.signature_cache,
      ...override.signature_cache
    } : base.signature_cache
  };
}
function loadConfig(directory) {
  let config = { ...DEFAULT_CONFIG };
  const userConfigPath = getUserConfigPath();
  const userConfig = loadConfigFile(userConfigPath);
  if (userConfig) {
    config = mergeConfigs(config, userConfig);
  }
  const projectConfigPath = getProjectConfigPath(directory);
  const projectConfig = loadConfigFile(projectConfigPath);
  if (projectConfig) {
    config = mergeConfigs(config, projectConfig);
  }
  return config;
}
var runtimeConfig = null;
function initRuntimeConfig(config) {
  runtimeConfig = config;
}
function getKeepThinking() {
  return runtimeConfig?.keep_thinking ?? false;
}

// src/plugin/image-saver.ts
import { mkdirSync as mkdirSync5, writeFileSync as writeFileSync4 } from "node:fs";
import { homedir as homedir6 } from "node:os";
import { join as join6 } from "node:path";
var log5 = createLogger("image-saver");
function getImageOutputDir() {
  const homeDir = homedir6();
  return join6(homeDir, ".opencode", "generated-images");
}
function generateImageFilename(mimeType) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).substring(2, 8);
  let ext = "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    ext = "jpg";
  } else if (mimeType.includes("gif")) {
    ext = "gif";
  } else if (mimeType.includes("webp")) {
    ext = "webp";
  }
  return `image-${timestamp}-${random}.${ext}`;
}
function saveImageToDisk(base64Data, mimeType) {
  try {
    const outputDir = getImageOutputDir();
    const filename = generateImageFilename(mimeType);
    const filePath = join6(outputDir, filename);
    const buffer = Buffer.from(base64Data, "base64");
    mkdirSync5(outputDir, { recursive: true });
    writeFileSync4(filePath, buffer);
    return filePath;
  } catch (error) {
    log5.error("Failed to save image to disk", {
      error: error instanceof Error ? error.message : String(error)
    });
    return "";
  }
}
function processImageData(inlineData) {
  const mimeType = inlineData.mimeType || "image/png";
  const data = inlineData.data;
  if (!data) {
    return null;
  }
  const filePath = saveImageToDisk(data, mimeType);
  if (filePath) {
    return `![Generated Image](${filePath})

Image saved to: \`${filePath}\`

To view: \`open "${filePath}"\``;
  }
  return `![Generated Image](data:${mimeType};base64,${data})`;
}

// src/plugin/core/streaming/transformer.ts
var MAX_SESSION_THINKING_HASHES = 2e3;
function addBoundedThinkingHash(hashes, hash) {
  hashes.add(hash);
  if (hashes.size > MAX_SESSION_THINKING_HASHES) {
    const oldest = hashes.values().next().value;
    if (oldest !== void 0) {
      hashes.delete(oldest);
    }
  }
}
function hashString(str) {
  const len = str.length;
  let hash = (5381 ^ len) >>> 0;
  if (len <= 512) {
    for (let i = 0; i < len; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i) >>> 0;
    }
  } else {
    const step = Math.ceil(len / 256);
    for (let i = 0; i < len; i += step) {
      hash = (hash << 5) + hash + str.charCodeAt(i) >>> 0;
    }
  }
  return hash.toString(16);
}
function createThoughtBuffer() {
  const buffer = /* @__PURE__ */ new Map();
  return {
    get: (index) => buffer.get(index),
    set: (index, text) => buffer.set(index, text),
    clear: () => buffer.clear()
  };
}
function deduplicateThinkingText(response, sentBuffer, displayedThinkingHashes) {
  if (!response || typeof response !== "object") return response;
  const resp = response;
  if (Array.isArray(resp.candidates)) {
    const newCandidates = resp.candidates.map((candidate, index) => {
      const cand = candidate;
      if (!cand?.content) return candidate;
      const content = cand.content;
      if (!Array.isArray(content.parts)) return candidate;
      const newParts = content.parts.map((part) => {
        const p = part;
        if (p.inlineData) {
          const inlineData = p.inlineData;
          const result = processImageData({
            mimeType: inlineData.mimeType,
            data: inlineData.data
          });
          if (result) {
            return { text: result };
          }
        }
        if (p.thought === true || p.type === "thinking") {
          const fullText = p.text || p.thinking || "";
          if (displayedThinkingHashes) {
            const hash = hashString(fullText);
            if (displayedThinkingHashes.has(hash)) {
              sentBuffer.set(index, fullText);
              return null;
            }
            addBoundedThinkingHash(displayedThinkingHashes, hash);
          }
          const sentText = sentBuffer.get(index) ?? "";
          if (fullText.startsWith(sentText)) {
            const delta = fullText.slice(sentText.length);
            sentBuffer.set(index, fullText);
            if (delta) {
              return { ...p, text: delta, thinking: delta };
            }
            return null;
          }
          sentBuffer.set(index, fullText);
          return part;
        }
        return part;
      });
      const filteredParts = newParts.filter((p) => p !== null);
      return {
        ...cand,
        content: { ...content, parts: filteredParts }
      };
    });
    return { ...resp, candidates: newCandidates };
  }
  if (Array.isArray(resp.content)) {
    let thinkingIndex = 0;
    const newContent = resp.content.map((block) => {
      const b = block;
      if (b?.type === "thinking") {
        const fullText = b.thinking || b.text || "";
        if (displayedThinkingHashes) {
          const hash = hashString(fullText);
          if (displayedThinkingHashes.has(hash)) {
            sentBuffer.set(thinkingIndex, fullText);
            thinkingIndex++;
            return null;
          }
          addBoundedThinkingHash(displayedThinkingHashes, hash);
        }
        const sentText = sentBuffer.get(thinkingIndex) ?? "";
        if (fullText.startsWith(sentText)) {
          const delta = fullText.slice(sentText.length);
          sentBuffer.set(thinkingIndex, fullText);
          thinkingIndex++;
          if (delta) {
            return { ...b, thinking: delta, text: delta };
          }
          return null;
        }
        sentBuffer.set(thinkingIndex, fullText);
        thinkingIndex++;
        return block;
      }
      return block;
    });
    const filteredContent = newContent.filter((b) => b !== null);
    return { ...resp, content: filteredContent };
  }
  return response;
}
function transformSseLine(line, signatureStore, thoughtBuffer, sentThinkingBuffer, callbacks, options, debugState2) {
  if (!line.startsWith("data:")) {
    return line;
  }
  const json = line.slice(5).trim();
  if (!json) {
    return line;
  }
  try {
    const parsed = JSON.parse(json);
    if (parsed.response !== void 0) {
      const hasInterestingData = line.includes('"thought"') || line.includes('"thinking"') || line.includes('"signature"') || line.includes('"inlineData"') || line.includes('"functionCall"');
      if (!hasInterestingData && (!options.debugText || debugState2.injected)) {
        return `data: ${JSON.stringify(parsed.response)}`;
      }
      if (options.cacheSignatures && options.signatureSessionKey) {
        cacheThinkingSignaturesFromResponse(
          parsed.response,
          options.signatureSessionKey,
          signatureStore,
          thoughtBuffer,
          callbacks.onCacheSignature
        );
      }
      let response = deduplicateThinkingText(
        parsed.response,
        sentThinkingBuffer,
        options.displayedThinkingHashes
      );
      if (options.debugText && callbacks.onInjectDebug && !debugState2.injected) {
        response = callbacks.onInjectDebug(response, options.debugText);
        debugState2.injected = true;
      }
      const transformed = callbacks.transformThinkingParts ? callbacks.transformThinkingParts(response) : response;
      return `data: ${JSON.stringify(transformed)}`;
    }
  } catch (_) {
  }
  return line;
}
function cacheThinkingSignaturesFromResponse(response, signatureSessionKey, signatureStore, thoughtBuffer, onCacheSignature) {
  if (!response || typeof response !== "object") return;
  const resp = response;
  if (Array.isArray(resp.candidates)) {
    resp.candidates.forEach((candidate, index) => {
      const cand = candidate;
      if (!cand?.content) return;
      const content = cand.content;
      if (!Array.isArray(content.parts)) return;
      content.parts.forEach((part) => {
        const p = part;
        if (p.thought === true || p.type === "thinking") {
          const text = p.text || p.thinking || "";
          if (text) {
            const current = thoughtBuffer.get(index) ?? "";
            thoughtBuffer.set(index, current + text);
          }
        }
        if (p.thoughtSignature) {
          const fullText = thoughtBuffer.get(index) ?? "";
          if (fullText) {
            const signature = p.thoughtSignature;
            onCacheSignature?.(signatureSessionKey, fullText, signature);
            signatureStore.set(signatureSessionKey, { text: fullText, signature });
          }
        }
      });
    });
  }
  if (Array.isArray(resp.content)) {
    const CLAUDE_BUFFER_KEY = 0;
    resp.content.forEach((block) => {
      const b = block;
      if (b?.type === "thinking") {
        const text = b.thinking || b.text || "";
        if (text) {
          const current = thoughtBuffer.get(CLAUDE_BUFFER_KEY) ?? "";
          thoughtBuffer.set(CLAUDE_BUFFER_KEY, current + text);
        }
      }
      if (b?.signature) {
        const fullText = thoughtBuffer.get(CLAUDE_BUFFER_KEY) ?? "";
        if (fullText) {
          const signature = b.signature;
          onCacheSignature?.(signatureSessionKey, fullText, signature);
          signatureStore.set(signatureSessionKey, { text: fullText, signature });
        }
      }
    });
  }
}
function createStreamingTransformer(signatureStore, callbacks, options = {}) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const thoughtBuffer = createThoughtBuffer();
  const sentThinkingBuffer = createThoughtBuffer();
  const debugState2 = { injected: false };
  let hasSeenUsageMetadata = false;
  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.includes("usageMetadata")) {
          hasSeenUsageMetadata = true;
        }
        const transformedLine = transformSseLine(
          line,
          signatureStore,
          thoughtBuffer,
          sentThinkingBuffer,
          callbacks,
          options,
          debugState2
        );
        controller.enqueue(encoder.encode(transformedLine + "\n"));
      }
    },
    flush(controller) {
      buffer += decoder.decode();
      if (buffer) {
        if (buffer.includes("usageMetadata")) {
          hasSeenUsageMetadata = true;
        }
        const transformedLine = transformSseLine(
          buffer,
          signatureStore,
          thoughtBuffer,
          sentThinkingBuffer,
          callbacks,
          options,
          debugState2
        );
        controller.enqueue(encoder.encode(transformedLine));
      }
      if (!hasSeenUsageMetadata) {
        const syntheticUsage = {
          response: {
            usageMetadata: {
              promptTokenCount: 0,
              candidatesTokenCount: 0,
              totalTokenCount: 0
            }
          }
        };
        controller.enqueue(encoder.encode(`
data: ${JSON.stringify(syntheticUsage)}

`));
      }
    }
  });
}

// src/plugin/stores/signature-store.ts
function createSignatureStore() {
  const store = /* @__PURE__ */ new Map();
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    has: (key) => store.has(key),
    delete: (key) => {
      store.delete(key);
    }
  };
}
var defaultSignatureStore = createSignatureStore();

// src/plugin/request-helpers.ts
var log6 = createLogger("request-helpers");
var ANTIGRAVITY_PREVIEW_LINK = "https://goo.gle/enable-preview-features";
var UNSUPPORTED_CONSTRAINTS = [
  "minLength",
  "maxLength",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "pattern",
  "minItems",
  "maxItems",
  "format",
  "default",
  "examples"
];
var UNSUPPORTED_KEYWORDS = [
  ...UNSUPPORTED_CONSTRAINTS,
  "$schema",
  "$defs",
  "definitions",
  "const",
  "$ref",
  "additionalProperties",
  "propertyNames",
  "title",
  "$id",
  "$comment"
];
function appendDescriptionHint(schema, hint) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  const existing = typeof schema.description === "string" ? schema.description : "";
  const newDescription = existing ? `${existing} (${hint})` : hint;
  return { ...schema, description: newDescription };
}
function convertRefsToHints(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => convertRefsToHints(item));
  }
  if (typeof schema.$ref === "string") {
    const refVal = schema.$ref;
    const defName = refVal.includes("/") ? refVal.split("/").pop() : refVal;
    const hint = `See: ${defName}`;
    const existingDesc = typeof schema.description === "string" ? schema.description : "";
    const newDescription = existingDesc ? `${existingDesc} (${hint})` : hint;
    return { type: "object", description: newDescription };
  }
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = convertRefsToHints(value);
  }
  return result;
}
function convertConstToEnum(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => convertConstToEnum(item));
  }
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "const" && !schema.enum) {
      result.enum = [value];
    } else {
      result[key] = convertConstToEnum(value);
    }
  }
  return result;
}
function addEnumHints(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => addEnumHints(item));
  }
  let result = { ...schema };
  if (Array.isArray(result.enum) && result.enum.length > 1 && result.enum.length <= 10) {
    const vals = result.enum.map((v) => String(v)).join(", ");
    result = appendDescriptionHint(result, `Allowed: ${vals}`);
  }
  for (const [key, value] of Object.entries(result)) {
    if (key !== "enum" && typeof value === "object" && value !== null) {
      result[key] = addEnumHints(value);
    }
  }
  return result;
}
function addAdditionalPropertiesHints(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => addAdditionalPropertiesHints(item));
  }
  let result = { ...schema };
  if (result.additionalProperties === false) {
    result = appendDescriptionHint(result, "No extra properties allowed");
  }
  for (const [key, value] of Object.entries(result)) {
    if (key !== "additionalProperties" && typeof value === "object" && value !== null) {
      result[key] = addAdditionalPropertiesHints(value);
    }
  }
  return result;
}
function moveConstraintsToDescription(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => moveConstraintsToDescription(item));
  }
  let result = { ...schema };
  for (const constraint of UNSUPPORTED_CONSTRAINTS) {
    if (result[constraint] !== void 0 && typeof result[constraint] !== "object") {
      result = appendDescriptionHint(result, `${constraint}: ${result[constraint]}`);
    }
  }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "object" && value !== null) {
      result[key] = moveConstraintsToDescription(value);
    }
  }
  return result;
}
function mergeAllOf(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => mergeAllOf(item));
  }
  let result = { ...schema };
  if (Array.isArray(result.allOf)) {
    const merged = {};
    const mergedRequired = [];
    for (const item of result.allOf) {
      if (!item || typeof item !== "object") continue;
      if (item.properties && typeof item.properties === "object") {
        merged.properties = { ...merged.properties, ...item.properties };
      }
      if (Array.isArray(item.required)) {
        for (const req of item.required) {
          if (!mergedRequired.includes(req)) {
            mergedRequired.push(req);
          }
        }
      }
      for (const [key, value] of Object.entries(item)) {
        if (key !== "properties" && key !== "required" && merged[key] === void 0) {
          merged[key] = value;
        }
      }
    }
    if (merged.properties) {
      result.properties = { ...result.properties, ...merged.properties };
    }
    if (mergedRequired.length > 0) {
      const existingRequired = Array.isArray(result.required) ? result.required : [];
      result.required = Array.from(/* @__PURE__ */ new Set([...existingRequired, ...mergedRequired]));
    }
    for (const [key, value] of Object.entries(merged)) {
      if (key !== "properties" && key !== "required" && result[key] === void 0) {
        result[key] = value;
      }
    }
    delete result.allOf;
  }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "object" && value !== null) {
      result[key] = mergeAllOf(value);
    }
  }
  return result;
}
function scoreSchemaOption(schema) {
  if (!schema || typeof schema !== "object") {
    return { score: 0, typeName: "unknown" };
  }
  const type = schema.type;
  if (type === "object" || schema.properties) {
    return { score: 3, typeName: "object" };
  }
  if (type === "array" || schema.items) {
    return { score: 2, typeName: "array" };
  }
  if (type && type !== "null") {
    return { score: 1, typeName: type };
  }
  return { score: 0, typeName: type || "null" };
}
function tryMergeEnumFromUnion(options) {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }
  const enumValues = [];
  for (const option of options) {
    if (!option || typeof option !== "object") {
      return null;
    }
    if (option.const !== void 0) {
      enumValues.push(String(option.const));
      continue;
    }
    if (Array.isArray(option.enum) && option.enum.length === 1) {
      enumValues.push(String(option.enum[0]));
      continue;
    }
    if (Array.isArray(option.enum) && option.enum.length > 0) {
      for (const val of option.enum) {
        enumValues.push(String(val));
      }
      continue;
    }
    if (option.properties || option.items || option.anyOf || option.oneOf || option.allOf) {
      return null;
    }
    if (option.type && !option.const && !option.enum) {
      return null;
    }
  }
  return enumValues.length > 0 ? enumValues : null;
}
function flattenAnyOfOneOf(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => flattenAnyOfOneOf(item));
  }
  let result = { ...schema };
  for (const unionKey of ["anyOf", "oneOf"]) {
    if (Array.isArray(result[unionKey]) && result[unionKey].length > 0) {
      const options = result[unionKey];
      const parentDesc = typeof result.description === "string" ? result.description : "";
      const mergedEnum = tryMergeEnumFromUnion(options);
      if (mergedEnum !== null) {
        const { [unionKey]: _2, ...rest2 } = result;
        result = {
          ...rest2,
          type: "string",
          enum: mergedEnum
        };
        if (parentDesc) {
          result.description = parentDesc;
        }
        continue;
      }
      let bestIdx = 0;
      let bestScore = -1;
      const allTypes = [];
      for (let i = 0; i < options.length; i++) {
        const { score, typeName } = scoreSchemaOption(options[i]);
        if (typeName) {
          allTypes.push(typeName);
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      let selected = flattenAnyOfOneOf(options[bestIdx]) || { type: "string" };
      if (parentDesc) {
        const childDesc = typeof selected.description === "string" ? selected.description : "";
        if (childDesc && childDesc !== parentDesc) {
          selected = { ...selected, description: `${parentDesc} (${childDesc})` };
        } else if (!childDesc) {
          selected = { ...selected, description: parentDesc };
        }
      }
      if (allTypes.length > 1) {
        const uniqueTypes = Array.from(new Set(allTypes));
        const hint = `Accepts: ${uniqueTypes.join(" | ")}`;
        selected = appendDescriptionHint(selected, hint);
      }
      const { [unionKey]: _, description: __, ...rest } = result;
      result = { ...rest, ...selected };
    }
  }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "object" && value !== null) {
      result[key] = flattenAnyOfOneOf(value);
    }
  }
  return result;
}
function flattenTypeArrays(schema, nullableFields, currentPath) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item, idx) => flattenTypeArrays(item, nullableFields, `${currentPath || ""}[${idx}]`));
  }
  let result = { ...schema };
  const localNullableFields = nullableFields || /* @__PURE__ */ new Map();
  if (Array.isArray(result.type)) {
    const types = result.type;
    const hasNull = types.includes("null");
    const nonNullTypes = types.filter((t) => t !== "null" && t);
    const firstType = nonNullTypes.length > 0 ? nonNullTypes[0] : "string";
    result.type = firstType;
    if (nonNullTypes.length > 1) {
      result = appendDescriptionHint(result, `Accepts: ${nonNullTypes.join(" | ")}`);
    }
    if (hasNull) {
      result = appendDescriptionHint(result, "nullable");
    }
  }
  if (result.properties && typeof result.properties === "object") {
    const newProps = {};
    for (const [propKey, propValue] of Object.entries(result.properties)) {
      const propPath = currentPath ? `${currentPath}.properties.${propKey}` : `properties.${propKey}`;
      const processed = flattenTypeArrays(propValue, localNullableFields, propPath);
      newProps[propKey] = processed;
      if (processed && typeof processed === "object" && typeof processed.description === "string" && processed.description.includes("nullable")) {
        const objectPath = currentPath || "";
        const existing = localNullableFields.get(objectPath) || [];
        existing.push(propKey);
        localNullableFields.set(objectPath, existing);
      }
    }
    result.properties = newProps;
  }
  if (Array.isArray(result.required) && !nullableFields) {
    const nullableAtRoot = localNullableFields.get("") || [];
    if (nullableAtRoot.length > 0) {
      result.required = result.required.filter((r) => !nullableAtRoot.includes(r));
      if (result.required.length === 0) {
        delete result.required;
      }
    }
  }
  for (const [key, value] of Object.entries(result)) {
    if (key !== "properties" && typeof value === "object" && value !== null) {
      result[key] = flattenTypeArrays(value, localNullableFields, `${currentPath || ""}.${key}`);
    }
  }
  return result;
}
function removeUnsupportedKeywords(schema, insideProperties = false) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => removeUnsupportedKeywords(item, false));
  }
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!insideProperties && UNSUPPORTED_KEYWORDS.includes(key)) {
      continue;
    }
    if (typeof value === "object" && value !== null) {
      if (key === "properties") {
        const propertiesResult = {};
        for (const [propName, propSchema] of Object.entries(value)) {
          propertiesResult[propName] = removeUnsupportedKeywords(propSchema, false);
        }
        result[key] = propertiesResult;
      } else {
        result[key] = removeUnsupportedKeywords(value, false);
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
function cleanupRequiredFields(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => cleanupRequiredFields(item));
  }
  let result = { ...schema };
  if (Array.isArray(result.required) && result.properties && typeof result.properties === "object") {
    const validRequired = result.required.filter(
      (req) => Object.prototype.hasOwnProperty.call(result.properties, req)
    );
    if (validRequired.length === 0) {
      delete result.required;
    } else if (validRequired.length !== result.required.length) {
      result.required = validRequired;
    }
  }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "object" && value !== null) {
      result[key] = cleanupRequiredFields(value);
    }
  }
  return result;
}
function addEmptySchemaPlaceholder(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => addEmptySchemaPlaceholder(item));
  }
  let result = { ...schema };
  const isObjectType = result.type === "object";
  if (isObjectType) {
    const hasProperties = result.properties && typeof result.properties === "object" && Object.keys(result.properties).length > 0;
    if (!hasProperties) {
      result.properties = {
        [EMPTY_SCHEMA_PLACEHOLDER_NAME]: {
          type: "boolean",
          description: EMPTY_SCHEMA_PLACEHOLDER_DESCRIPTION
        }
      };
      result.required = [EMPTY_SCHEMA_PLACEHOLDER_NAME];
    }
  }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "object" && value !== null) {
      result[key] = addEmptySchemaPlaceholder(value);
    }
  }
  return result;
}
var SCHEMA_CLEAN_CACHE_MAX = 200;
var schemaCleanCache = /* @__PURE__ */ new Map();
function cleanJSONSchemaForAntigravity(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  let cacheKey;
  try {
    cacheKey = JSON.stringify(schema);
  } catch {
    cacheKey = void 0;
  }
  if (cacheKey !== void 0) {
    const cached = schemaCleanCache.get(cacheKey);
    if (cached !== void 0) {
      return structuredClone(cached);
    }
  }
  let result = schema;
  result = convertRefsToHints(result);
  result = convertConstToEnum(result);
  result = addEnumHints(result);
  result = addAdditionalPropertiesHints(result);
  result = moveConstraintsToDescription(result);
  result = mergeAllOf(result);
  result = flattenAnyOfOneOf(result);
  result = flattenTypeArrays(result);
  result = removeUnsupportedKeywords(result);
  result = cleanupRequiredFields(result);
  result = addEmptySchemaPlaceholder(result);
  if (cacheKey !== void 0) {
    schemaCleanCache.set(cacheKey, structuredClone(result));
    if (schemaCleanCache.size > SCHEMA_CLEAN_CACHE_MAX) {
      const oldestKey = schemaCleanCache.keys().next().value;
      if (oldestKey !== void 0) {
        schemaCleanCache.delete(oldestKey);
      }
    }
  }
  return result;
}
var DEFAULT_THINKING_BUDGET = 16e3;
function isThinkingCapableModel(modelName) {
  const lowerModel = modelName.toLowerCase();
  return lowerModel.includes("thinking") || lowerModel.includes("gemini-3") || lowerModel.includes("opus");
}
function extractThinkingConfig(requestPayload, rawGenerationConfig, extraBody) {
  const thinkingConfig = rawGenerationConfig?.thinkingConfig ?? extraBody?.thinkingConfig ?? requestPayload.thinkingConfig;
  if (thinkingConfig && typeof thinkingConfig === "object") {
    const config = thinkingConfig;
    return {
      includeThoughts: Boolean(config.includeThoughts),
      thinkingBudget: typeof config.thinkingBudget === "number" ? config.thinkingBudget : DEFAULT_THINKING_BUDGET
    };
  }
  const anthropicThinking = extraBody?.thinking ?? requestPayload.thinking;
  if (anthropicThinking && typeof anthropicThinking === "object") {
    const thinking = anthropicThinking;
    if (thinking.type === "enabled" || thinking.budgetTokens) {
      return {
        includeThoughts: true,
        thinkingBudget: typeof thinking.budgetTokens === "number" ? thinking.budgetTokens : DEFAULT_THINKING_BUDGET
      };
    }
  }
  return void 0;
}
function extractVariantThinkingConfig(providerOptions, generationConfig) {
  const result = {};
  const google = providerOptions?.google;
  if (google) {
    if (typeof google.thinkingLevel === "string") {
      result.thinkingLevel = google.thinkingLevel;
      result.includeThoughts = typeof google.includeThoughts === "boolean" ? google.includeThoughts : void 0;
    } else if (google.thinkingConfig && typeof google.thinkingConfig === "object") {
      const tc = google.thinkingConfig;
      if (typeof tc.thinkingBudget === "number") {
        result.thinkingBudget = tc.thinkingBudget;
      }
    }
    if (google.googleSearch && typeof google.googleSearch === "object") {
      const search = google.googleSearch;
      result.googleSearch = {
        mode: search.mode === "auto" || search.mode === "off" ? search.mode : void 0,
        threshold: typeof search.threshold === "number" ? search.threshold : void 0
      };
    }
  }
  if (result.thinkingBudget === void 0 && !result.thinkingLevel && generationConfig) {
    if (generationConfig.thinkingConfig && typeof generationConfig.thinkingConfig === "object") {
      const tc = generationConfig.thinkingConfig;
      if (typeof tc.thinkingLevel === "string") {
        result.thinkingLevel = tc.thinkingLevel;
        result.includeThoughts = typeof tc.includeThoughts === "boolean" ? tc.includeThoughts : void 0;
      } else if (typeof tc.thinkingBudget === "number") {
        result.thinkingBudget = tc.thinkingBudget;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : void 0;
}
function resolveThinkingConfig(userConfig, isThinkingModel) {
  if (isThinkingModel && !userConfig) {
    return { includeThoughts: true, thinkingBudget: DEFAULT_THINKING_BUDGET };
  }
  return userConfig;
}
function isThinkingPart(part) {
  return part.type === "thinking" || part.type === "redacted_thinking" || part.type === "reasoning" || part.thinking !== void 0 || part.thought === true;
}
function hasSignatureField(part) {
  return part.signature !== void 0 || part.thoughtSignature !== void 0;
}
function isToolBlock(part) {
  return part.type === "tool_use" || part.type === "tool_result" || part.tool_use_id !== void 0 || part.tool_call_id !== void 0 || part.tool_result !== void 0 || part.tool_use !== void 0 || part.toolUse !== void 0 || part.functionCall !== void 0 || part.functionResponse !== void 0;
}
function stripAllThinkingBlocks(contentArray) {
  return contentArray.filter((item) => {
    if (!item || typeof item !== "object") return true;
    if (isToolBlock(item)) return true;
    if (isThinkingPart(item)) return false;
    if (hasSignatureField(item)) return false;
    return true;
  });
}
function removeTrailingThinkingBlocks(contentArray, sessionId, getCachedSignatureFn) {
  const result = [...contentArray];
  while (result.length > 0 && isThinkingPart(result[result.length - 1])) {
    const part = result[result.length - 1];
    const isValid = sessionId && getCachedSignatureFn ? isOurCachedSignature(part, sessionId, getCachedSignatureFn) : hasValidSignature(part);
    if (isValid) {
      break;
    }
    result.pop();
  }
  return result;
}
function hasValidSignature(part) {
  const signature = part.thought === true ? part.thoughtSignature : part.signature;
  return typeof signature === "string" && signature.length >= MIN_SIGNATURE_LENGTH;
}
function getSignature(part) {
  const signature = part.thought === true ? part.thoughtSignature : part.signature;
  return typeof signature === "string" ? signature : void 0;
}
function isOurCachedSignature(part, sessionId, getCachedSignatureFn) {
  if (!sessionId || !getCachedSignatureFn) {
    return false;
  }
  const text = getThinkingText(part);
  if (!text) {
    return false;
  }
  const partSignature = getSignature(part);
  if (!partSignature) {
    return false;
  }
  const cachedSignature = getCachedSignatureFn(sessionId, text);
  return cachedSignature === partSignature;
}
function getThinkingText(part) {
  if (!part || typeof part !== "object") return "";
  if (typeof part.text === "string") return part.text;
  if (typeof part.thinking === "string") return part.thinking;
  if (part.text && typeof part.text === "object") {
    const maybeText = part.text.text;
    if (typeof maybeText === "string") return maybeText;
  }
  if (part.thinking && typeof part.thinking === "object") {
    const maybeText = part.thinking.text ?? part.thinking.thinking;
    if (typeof maybeText === "string") return maybeText;
  }
  return "";
}
function stripCacheControlRecursively(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => stripCacheControlRecursively(item));
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "cache_control" || key === "providerOptions") continue;
    result[key] = stripCacheControlRecursively(value);
  }
  return result;
}
function sanitizeThinkingPart(part) {
  if (part.thought === true) {
    let textContent = part.text;
    if (typeof textContent === "object" && textContent !== null) {
      const maybeText = textContent.text;
      textContent = typeof maybeText === "string" ? maybeText : void 0;
    }
    const hasContent = typeof textContent === "string" && textContent.trim().length > 0;
    if (!hasContent && !part.thoughtSignature) {
      return null;
    }
    const sanitized = { thought: true };
    if (textContent !== void 0) sanitized.text = textContent;
    if (part.thoughtSignature !== void 0) sanitized.thoughtSignature = part.thoughtSignature;
    return sanitized;
  }
  if (part.type === "thinking" || part.type === "redacted_thinking" || part.thinking !== void 0) {
    let thinkingContent = part.thinking ?? part.text;
    if (thinkingContent !== void 0 && typeof thinkingContent === "object" && thinkingContent !== null) {
      const maybeText = thinkingContent.text ?? thinkingContent.thinking;
      thinkingContent = typeof maybeText === "string" ? maybeText : void 0;
    }
    const hasContent = typeof thinkingContent === "string" && thinkingContent.trim().length > 0;
    if (!hasContent && !part.signature) {
      return null;
    }
    const sanitized = { type: part.type === "redacted_thinking" ? "redacted_thinking" : "thinking" };
    if (thinkingContent !== void 0) sanitized.thinking = thinkingContent;
    if (part.signature !== void 0) sanitized.signature = part.signature;
    return sanitized;
  }
  if (part.type === "reasoning") {
    let textContent = part.text;
    if (typeof textContent === "object" && textContent !== null) {
      const maybeText = textContent.text;
      textContent = typeof maybeText === "string" ? maybeText : void 0;
    }
    const hasContent = typeof textContent === "string" && textContent.trim().length > 0;
    if (!hasContent && !part.signature) {
      return null;
    }
    const sanitized = { type: "reasoning" };
    if (textContent !== void 0) sanitized.text = textContent;
    if (part.signature !== void 0) sanitized.signature = part.signature;
    return sanitized;
  }
  return stripCacheControlRecursively(part);
}
function findLastAssistantIndex(contents, roleValue) {
  for (let i = contents.length - 1; i >= 0; i--) {
    const content = contents[i];
    if (content && typeof content === "object" && content.role === roleValue) {
      return i;
    }
  }
  return -1;
}
function filterContentArray(contentArray, sessionId, getCachedSignatureFn, isClaudeModel2, isLastAssistantMessage = false) {
  if (isClaudeModel2 && !getKeepThinking()) {
    return stripAllThinkingBlocks(contentArray);
  }
  const filtered = [];
  for (const item of contentArray) {
    if (!item || typeof item !== "object") {
      filtered.push(item);
      continue;
    }
    if (isToolBlock(item)) {
      if (!isClaudeModel2) {
        filtered.push(item);
        continue;
      }
      const sanitizedToolBlock = { ...item };
      delete sanitizedToolBlock.signature;
      delete sanitizedToolBlock.thoughtSignature;
      delete sanitizedToolBlock.thought_signature;
      delete sanitizedToolBlock.thought;
      filtered.push(sanitizedToolBlock);
      continue;
    }
    const isThinking = isThinkingPart(item);
    const hasSignature = hasSignatureField(item);
    if (!isThinking && !hasSignature) {
      filtered.push(item);
      continue;
    }
    if (isClaudeModel2 && (isThinking || hasSignature)) {
      const thinkingText = getThinkingText(item) || "";
      const sentinelPart = {
        type: item.type === "redacted_thinking" ? "redacted_thinking" : "thinking",
        thinking: thinkingText,
        signature: SKIP_THOUGHT_SIGNATURE
      };
      filtered.push(sentinelPart);
      continue;
    }
    if (isLastAssistantMessage && (isThinking || hasSignature)) {
      if (isOurCachedSignature(item, sessionId, getCachedSignatureFn)) {
        const sanitized = sanitizeThinkingPart(item);
        if (sanitized) filtered.push(sanitized);
        continue;
      }
      const thinkingText = getThinkingText(item) || "";
      const existingSignature = item.signature || item.thoughtSignature;
      const signatureInfo = existingSignature ? `foreign signature (${String(existingSignature).length} chars)` : "no signature";
      log6.debug(`Injecting sentinel for last-message thinking block with ${signatureInfo}`);
      const sentinelPart = {
        type: item.type || "thinking",
        thinking: thinkingText,
        signature: SKIP_THOUGHT_SIGNATURE
      };
      filtered.push(sentinelPart);
      continue;
    }
    if (isOurCachedSignature(item, sessionId, getCachedSignatureFn)) {
      const sanitized = sanitizeThinkingPart(item);
      if (sanitized) filtered.push(sanitized);
      continue;
    }
    if (sessionId && getCachedSignatureFn) {
      const text = getThinkingText(item);
      if (text) {
        const cachedSignature = getCachedSignatureFn(sessionId, text);
        if (cachedSignature && cachedSignature.length >= MIN_SIGNATURE_LENGTH) {
          const restoredPart = { ...item };
          if (item.thought === true) {
            restoredPart.thoughtSignature = cachedSignature;
          } else {
            restoredPart.signature = cachedSignature;
          }
          const sanitized = sanitizeThinkingPart(restoredPart);
          if (sanitized) filtered.push(sanitized);
          continue;
        }
      }
    }
  }
  return filtered;
}
function filterUnsignedThinkingBlocks(contents, sessionId, getCachedSignatureFn, isClaudeModel2) {
  const lastAssistantIdx = findLastAssistantIndex(contents, "model");
  return contents.map((content, idx) => {
    if (!content || typeof content !== "object") {
      return content;
    }
    const isLastAssistant = idx === lastAssistantIdx;
    if (Array.isArray(content.parts)) {
      const filteredParts = filterContentArray(
        content.parts,
        sessionId,
        getCachedSignatureFn,
        isClaudeModel2,
        isLastAssistant
      );
      const trimmedParts = content.role === "model" && !isClaudeModel2 ? removeTrailingThinkingBlocks(filteredParts, sessionId, getCachedSignatureFn) : filteredParts;
      return { ...content, parts: trimmedParts };
    }
    if (Array.isArray(content.content)) {
      const isAssistantRole = content.role === "assistant";
      const isLastAssistantContent = idx === lastAssistantIdx || isAssistantRole && idx === findLastAssistantIndex(contents, "assistant");
      const filteredContent = filterContentArray(
        content.content,
        sessionId,
        getCachedSignatureFn,
        isClaudeModel2,
        isLastAssistantContent
      );
      const trimmedContent = isAssistantRole && !isClaudeModel2 ? removeTrailingThinkingBlocks(filteredContent, sessionId, getCachedSignatureFn) : filteredContent;
      return { ...content, content: trimmedContent };
    }
    return content;
  });
}
function filterMessagesThinkingBlocks(messages, sessionId, getCachedSignatureFn, isClaudeModel2) {
  const lastAssistantIdx = findLastAssistantIndex(messages, "assistant");
  return messages.map((message, idx) => {
    if (!message || typeof message !== "object") {
      return message;
    }
    if (Array.isArray(message.content)) {
      const isAssistantRole = message.role === "assistant";
      const isLastAssistant = isAssistantRole && idx === lastAssistantIdx;
      const filteredContent = filterContentArray(
        message.content,
        sessionId,
        getCachedSignatureFn,
        isClaudeModel2,
        isLastAssistant
      );
      const trimmedContent = isAssistantRole && !isClaudeModel2 ? removeTrailingThinkingBlocks(filteredContent, sessionId, getCachedSignatureFn) : filteredContent;
      return { ...message, content: trimmedContent };
    }
    return message;
  });
}
function deepFilterThinkingBlocks(payload, sessionId, getCachedSignatureFn, isClaudeModel2) {
  const visited = /* @__PURE__ */ new WeakSet();
  const walk = (value) => {
    if (!value || typeof value !== "object") {
      return;
    }
    if (visited.has(value)) {
      return;
    }
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item));
      return;
    }
    const obj = value;
    if (Array.isArray(obj.contents)) {
      obj.contents = filterUnsignedThinkingBlocks(
        obj.contents,
        sessionId,
        getCachedSignatureFn,
        isClaudeModel2
      );
    }
    if (Array.isArray(obj.messages)) {
      obj.messages = filterMessagesThinkingBlocks(
        obj.messages,
        sessionId,
        getCachedSignatureFn,
        isClaudeModel2
      );
    }
    Object.keys(obj).forEach((key) => walk(obj[key]));
  };
  walk(payload);
  return payload;
}
function transformGeminiCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return candidate;
  }
  const content = candidate.content;
  if (!content || typeof content !== "object" || !Array.isArray(content.parts)) {
    return candidate;
  }
  const thinkingTexts = [];
  const transformedParts = content.parts.map((part) => {
    if (!part || typeof part !== "object") {
      return part;
    }
    if (part.thought === true) {
      const thinkingText = part.text || "";
      thinkingTexts.push(thinkingText);
      const transformed = { ...part, type: "reasoning" };
      if (part.cache_control) transformed.cache_control = part.cache_control;
      const sig = part.signature || part.thoughtSignature;
      if (sig) {
        transformed.providerMetadata = {
          anthropic: { signature: sig }
        };
        delete transformed.signature;
        delete transformed.thoughtSignature;
      }
      return transformed;
    }
    if (part.type === "thinking") {
      const thinkingText = part.thinking || part.text || "";
      thinkingTexts.push(thinkingText);
      const transformed = {
        ...part,
        type: "reasoning",
        text: thinkingText,
        thought: true
      };
      if (part.cache_control) transformed.cache_control = part.cache_control;
      const sig = part.signature || part.thoughtSignature;
      if (sig) {
        transformed.providerMetadata = {
          anthropic: { signature: sig }
        };
        delete transformed.signature;
        delete transformed.thoughtSignature;
      }
      return transformed;
    }
    if (part.functionCall) {
      const parsedArgs = part.functionCall.args ? recursivelyParseJsonStrings(part.functionCall.args) : {};
      return {
        ...part,
        functionCall: {
          ...part.functionCall,
          args: parsedArgs
        }
      };
    }
    if (part.inlineData) {
      const result = processImageData({
        mimeType: part.inlineData.mimeType,
        data: part.inlineData.data
      });
      if (result) {
        return { text: result };
      }
    }
    return part;
  });
  return {
    ...candidate,
    content: { ...content, parts: transformedParts },
    ...thinkingTexts.length > 0 ? { reasoning_content: thinkingTexts.join("\n\n") } : {}
  };
}
function transformThinkingParts(response) {
  if (!response || typeof response !== "object") {
    return response;
  }
  const resp = response;
  const result = { ...resp };
  const reasoningTexts = [];
  if (Array.isArray(resp.content)) {
    const transformedContent = [];
    for (const block of resp.content) {
      if (block && typeof block === "object" && block.type === "thinking") {
        const thinkingText = block.thinking || block.text || "";
        reasoningTexts.push(thinkingText);
        const transformed = {
          ...block,
          type: "reasoning",
          text: thinkingText,
          thought: true
        };
        const sig = block.signature || block.thoughtSignature;
        if (sig) {
          transformed.providerMetadata = {
            anthropic: { signature: sig }
          };
          delete transformed.signature;
          delete transformed.thoughtSignature;
        }
        transformedContent.push(transformed);
      } else {
        transformedContent.push(block);
      }
    }
    result.content = transformedContent;
  }
  if (Array.isArray(resp.candidates)) {
    result.candidates = resp.candidates.map(transformGeminiCandidate);
  }
  if (reasoningTexts.length > 0 && !result.reasoning_content) {
    result.reasoning_content = reasoningTexts.join("\n\n");
  }
  return result;
}
function normalizeThinkingConfig(config) {
  if (!config || typeof config !== "object") {
    return void 0;
  }
  const record = config;
  const budgetRaw = record.thinkingBudget ?? record.thinking_budget;
  const includeRaw = record.includeThoughts ?? record.include_thoughts;
  const thinkingBudget = typeof budgetRaw === "number" && Number.isFinite(budgetRaw) ? budgetRaw : void 0;
  const includeThoughts = typeof includeRaw === "boolean" ? includeRaw : void 0;
  const enableThinking = thinkingBudget !== void 0 && thinkingBudget > 0;
  const finalInclude = enableThinking ? includeThoughts ?? false : false;
  if (!enableThinking && finalInclude === false && thinkingBudget === void 0 && includeThoughts === void 0) {
    return void 0;
  }
  const normalized = {};
  if (thinkingBudget !== void 0) {
    normalized.thinkingBudget = thinkingBudget;
  }
  if (finalInclude !== void 0) {
    normalized.includeThoughts = finalInclude;
  }
  return normalized;
}
function parseAntigravityApiBody(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      const firstObject = parsed.find((item) => typeof item === "object" && item !== null);
      if (firstObject && typeof firstObject === "object") {
        return firstObject;
      }
      return null;
    }
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
function extractUsageMetadata(body) {
  const usage = body.response && typeof body.response === "object" ? body.response.usageMetadata : void 0;
  if (!usage || typeof usage !== "object") {
    return null;
  }
  const asRecord = usage;
  const toNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : void 0;
  return {
    totalTokenCount: toNumber(asRecord.totalTokenCount),
    promptTokenCount: toNumber(asRecord.promptTokenCount),
    candidatesTokenCount: toNumber(asRecord.candidatesTokenCount),
    cachedContentTokenCount: toNumber(asRecord.cachedContentTokenCount),
    thoughtsTokenCount: toNumber(asRecord.thoughtsTokenCount)
  };
}
function extractUsageFromSsePayload(payload) {
  const lines = payload.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }
    const jsonText = line.slice(5).trim();
    if (!jsonText) {
      continue;
    }
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === "object") {
        const usage = extractUsageMetadata({ response: parsed.response });
        if (usage) {
          return usage;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}
function rewriteAntigravityPreviewAccessError(body, status, requestedModel) {
  if (!needsPreviewAccessOverride(status, body, requestedModel)) {
    return null;
  }
  const error = body.error ?? {};
  const trimmedMessage = typeof error.message === "string" ? error.message.trim() : "";
  const messagePrefix = trimmedMessage.length > 0 ? trimmedMessage : "Antigravity preview features are not enabled for this account.";
  const enhancedMessage = `${messagePrefix} Request preview access at ${ANTIGRAVITY_PREVIEW_LINK} before using this model.`;
  return {
    ...body,
    error: {
      ...error,
      message: enhancedMessage
    }
  };
}
function needsPreviewAccessOverride(status, body, requestedModel) {
  if (status !== 404) {
    return false;
  }
  if (isAntigravityModel(requestedModel)) {
    return true;
  }
  const errorMessage = typeof body.error?.message === "string" ? body.error.message : "";
  return isAntigravityModel(errorMessage);
}
function isAntigravityModel(target) {
  if (!target) {
    return false;
  }
  return /antigravity/i.test(target) || /opus/i.test(target) || /claude/i.test(target);
}
function isEmptyResponseBody(text) {
  if (!text || !text.trim()) {
    return true;
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed.candidates !== void 0) {
      if (!Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
        return true;
      }
      const firstCandidate = parsed.candidates[0];
      if (!firstCandidate) {
        return true;
      }
      const content = firstCandidate.content;
      if (!content || typeof content !== "object") {
        return true;
      }
      const parts = content.parts;
      if (!Array.isArray(parts) || parts.length === 0) {
        return true;
      }
      const hasContent = parts.some((part) => {
        if (!part || typeof part !== "object") return false;
        if (typeof part.text === "string" && part.text.length > 0) return true;
        if (part.functionCall) return true;
        if (part.thought === true && typeof part.text === "string") return true;
        return false;
      });
      if (!hasContent) {
        return true;
      }
    }
    if (parsed.choices !== void 0) {
      if (!Array.isArray(parsed.choices) || parsed.choices.length === 0) {
        return true;
      }
      const firstChoice = parsed.choices[0];
      if (!firstChoice) {
        return true;
      }
      const message = firstChoice.message || firstChoice.delta;
      if (!message) {
        return true;
      }
      if (!message.content && !message.tool_calls && !message.reasoning_content) {
        return true;
      }
    }
    if (parsed.response !== void 0) {
      const response = parsed.response;
      if (!response || typeof response !== "object") {
        return true;
      }
      return isEmptyResponseBody(JSON.stringify(response));
    }
    return false;
  } catch {
    return true;
  }
}
var SKIP_PARSE_KEYS = /* @__PURE__ */ new Set([
  "oldString",
  "newString",
  "content",
  "filePath",
  "path",
  "text",
  "code",
  "source",
  "data",
  "body",
  "message",
  "prompt",
  "input",
  "output",
  "result",
  "value",
  "query",
  "pattern",
  "replacement",
  "template",
  "script",
  "command",
  "snippet"
]);
function recursivelyParseJsonStrings(obj, skipParseKeys = SKIP_PARSE_KEYS, currentKey) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => recursivelyParseJsonStrings(item, skipParseKeys));
  }
  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = recursivelyParseJsonStrings(value, skipParseKeys, key);
    }
    return result;
  }
  if (typeof obj !== "string") {
    return obj;
  }
  if (currentKey && skipParseKeys.has(currentKey)) {
    return obj;
  }
  const stripped = obj.trim();
  const hasControlCharEscapes = obj.includes("\\n") || obj.includes("\\t");
  const hasIntentionalEscapes = obj.includes('\\"') || obj.includes("\\\\");
  if (hasControlCharEscapes && !hasIntentionalEscapes) {
    try {
      return JSON.parse(`"${obj}"`);
    } catch {
    }
  }
  if (stripped && (stripped[0] === "{" || stripped[0] === "[")) {
    if (stripped.startsWith("{") && stripped.endsWith("}") || stripped.startsWith("[") && stripped.endsWith("]")) {
      try {
        const parsed = JSON.parse(obj);
        return recursivelyParseJsonStrings(parsed);
      } catch {
      }
    }
    if (stripped.startsWith("[") && !stripped.endsWith("]")) {
      try {
        const lastBracket = stripped.lastIndexOf("]");
        if (lastBracket > 0) {
          const cleaned = stripped.slice(0, lastBracket + 1);
          const parsed = JSON.parse(cleaned);
          log6.debug("Auto-corrected malformed JSON array", {
            truncatedChars: stripped.length - cleaned.length
          });
          return recursivelyParseJsonStrings(parsed);
        }
      } catch {
      }
    }
    if (stripped.startsWith("{") && !stripped.endsWith("}")) {
      try {
        const lastBrace = stripped.lastIndexOf("}");
        if (lastBrace > 0) {
          const cleaned = stripped.slice(0, lastBrace + 1);
          const parsed = JSON.parse(cleaned);
          log6.debug("Auto-corrected malformed JSON object", {
            truncatedChars: stripped.length - cleaned.length
          });
          return recursivelyParseJsonStrings(parsed);
        }
      } catch {
      }
    }
  }
  return obj;
}
function fixToolResponseGrouping(contents) {
  if (!Array.isArray(contents) || contents.length === 0) {
    return contents;
  }
  const newContents = [];
  const pendingGroups = [];
  const collectedResponses = /* @__PURE__ */ new Map();
  for (const content of contents) {
    const role = content.role;
    const parts = content.parts || [];
    const responseParts = parts.filter((p) => p?.functionResponse);
    if (responseParts.length > 0) {
      for (const resp of responseParts) {
        const respId = resp.functionResponse?.id || "";
        if (respId && !collectedResponses.has(respId)) {
          collectedResponses.set(respId, resp);
        }
      }
      for (let i = pendingGroups.length - 1; i >= 0; i--) {
        const group = pendingGroups[i];
        if (group.ids.every((id) => collectedResponses.has(id))) {
          const groupResponses = group.ids.map((id) => {
            const resp = collectedResponses.get(id);
            collectedResponses.delete(id);
            return resp;
          });
          newContents.push({ parts: groupResponses, role: "user" });
          pendingGroups.splice(i, 1);
          break;
        }
      }
      continue;
    }
    if (role === "model") {
      const funcCalls = parts.filter((p) => p?.functionCall);
      newContents.push(content);
      if (funcCalls.length > 0) {
        const callIds = funcCalls.map((fc) => fc.functionCall?.id || "").filter(Boolean);
        const funcNames = funcCalls.map((fc) => fc.functionCall?.name || "");
        if (callIds.length > 0) {
          pendingGroups.push({
            ids: callIds,
            funcNames,
            insertAfterIdx: newContents.length - 1
          });
        }
      }
    } else {
      newContents.push(content);
    }
  }
  pendingGroups.sort((a, b) => b.insertAfterIdx - a.insertAfterIdx);
  for (const group of pendingGroups) {
    const groupResponses = [];
    for (let i = 0; i < group.ids.length; i++) {
      const expectedId = group.ids[i];
      const expectedName = group.funcNames[i] || "";
      if (collectedResponses.has(expectedId)) {
        groupResponses.push(collectedResponses.get(expectedId));
        collectedResponses.delete(expectedId);
      } else if (collectedResponses.size > 0) {
        let matchedId = null;
        for (const [orphanId, orphanResp] of collectedResponses) {
          const orphanName = orphanResp.functionResponse?.name || "";
          if (orphanName === expectedName) {
            matchedId = orphanId;
            break;
          }
        }
        if (!matchedId) {
          for (const [orphanId, orphanResp] of collectedResponses) {
            if (orphanResp.functionResponse?.name === "unknown_function") {
              matchedId = orphanId;
              break;
            }
          }
        }
        if (!matchedId) {
          matchedId = collectedResponses.keys().next().value ?? null;
        }
        if (matchedId) {
          const orphanResp = collectedResponses.get(matchedId);
          collectedResponses.delete(matchedId);
          orphanResp.functionResponse.id = expectedId;
          if (orphanResp.functionResponse.name === "unknown_function" && expectedName) {
            orphanResp.functionResponse.name = expectedName;
          }
          log6.debug("Auto-repaired tool ID mismatch", {
            mappedFrom: matchedId,
            mappedTo: expectedId,
            functionName: expectedName
          });
          groupResponses.push(orphanResp);
        }
      } else {
        const placeholder = {
          functionResponse: {
            name: expectedName || "unknown_function",
            response: {
              result: {
                error: "Tool response was lost during context processing. This is a recovered placeholder.",
                recovered: true
              }
            },
            id: expectedId
          }
        };
        log6.debug("Created placeholder response for missing tool", {
          id: expectedId,
          name: expectedName
        });
        groupResponses.push(placeholder);
      }
    }
    if (groupResponses.length > 0) {
      newContents.splice(group.insertAfterIdx + 1, 0, {
        parts: groupResponses,
        role: "user"
      });
    }
  }
  return newContents;
}
function findOrphanedToolUseIds(messages) {
  const toolUseIds = /* @__PURE__ */ new Set();
  const toolResultIds = /* @__PURE__ */ new Set();
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_use" && block.id) {
          toolUseIds.add(block.id);
        }
        if (block.type === "tool_result" && block.tool_use_id) {
          toolResultIds.add(block.tool_use_id);
        }
      }
    }
  }
  return new Set([...toolUseIds].filter((id) => !toolResultIds.has(id)));
}
function fixClaudeToolPairing(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }
  const toolUseMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_use" && block.id) {
          toolUseMap.set(block.id, { name: block.name || `tool-${toolUseMap.size}`, msgIndex: i });
        }
      }
    }
  }
  const toolResultIds = /* @__PURE__ */ new Set();
  for (const msg of messages) {
    if (msg.role === "user" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_result" && block.tool_use_id) {
          toolResultIds.add(block.tool_use_id);
        }
      }
    }
  }
  const orphans = [];
  for (const [id, info] of toolUseMap) {
    if (!toolResultIds.has(id)) {
      orphans.push({ id, ...info });
    }
  }
  if (orphans.length === 0) {
    return messages;
  }
  const orphansByMsgIndex = /* @__PURE__ */ new Map();
  for (const orphan of orphans) {
    const existing = orphansByMsgIndex.get(orphan.msgIndex) || [];
    existing.push(orphan);
    orphansByMsgIndex.set(orphan.msgIndex, existing);
  }
  const result = [];
  for (let i = 0; i < messages.length; i++) {
    result.push(messages[i]);
    const orphansForMsg = orphansByMsgIndex.get(i);
    if (orphansForMsg && orphansForMsg.length > 0) {
      const nextMsg = messages[i + 1];
      if (nextMsg?.role === "user" && Array.isArray(nextMsg.content)) {
        const placeholders = orphansForMsg.map((o) => ({
          type: "tool_result",
          tool_use_id: o.id,
          content: `[Tool "${o.name}" execution was cancelled or failed]`,
          is_error: true
        }));
        nextMsg.content = [...placeholders, ...nextMsg.content];
      } else {
        result.push({
          role: "user",
          content: orphansForMsg.map((o) => ({
            type: "tool_result",
            tool_use_id: o.id,
            content: `[Tool "${o.name}" execution was cancelled or failed]`,
            is_error: true
          }))
        });
      }
    }
  }
  return result;
}
function removeOrphanedToolUse(messages, orphanIds) {
  return messages.map((msg) => {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.filter(
          (block) => block.type !== "tool_use" || !orphanIds.has(block.id)
        )
      };
    }
    return msg;
  }).filter(
    (msg) => (
      // Remove empty assistant messages
      !(msg.role === "assistant" && Array.isArray(msg.content) && msg.content.length === 0)
    )
  );
}
function validateAndFixClaudeToolPairing(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }
  let fixed = fixClaudeToolPairing(messages);
  const orphanIds = findOrphanedToolUseIds(fixed);
  if (orphanIds.size === 0) {
    return fixed;
  }
  console.warn("[antigravity] fixClaudeToolPairing left orphans, applying nuclear option", {
    orphanIds: [...orphanIds]
  });
  return removeOrphanedToolUse(fixed, orphanIds);
}
function formatTypeHint(propData, depth = 0) {
  const type = propData.type ?? "unknown";
  if (propData.enum && Array.isArray(propData.enum)) {
    const enumVals = propData.enum;
    if (enumVals.length <= 5) {
      return `string ENUM[${enumVals.map((v) => JSON.stringify(v)).join(", ")}]`;
    }
    return `string ENUM[${enumVals.length} options]`;
  }
  if (propData.const !== void 0) {
    return `string CONST=${JSON.stringify(propData.const)}`;
  }
  if (type === "array") {
    const items = propData.items;
    if (items && typeof items === "object") {
      const itemType = items.type ?? "unknown";
      if (itemType === "object") {
        const nestedProps = items.properties;
        const nestedReq = items.required ?? [];
        if (nestedProps && depth < 1) {
          const nestedList = Object.entries(nestedProps).map(([n, d]) => {
            const t = d.type ?? "unknown";
            const req = nestedReq.includes(n) ? " REQUIRED" : "";
            return `${n}: ${t}${req}`;
          });
          return `ARRAY_OF_OBJECTS[${nestedList.join(", ")}]`;
        }
        return "ARRAY_OF_OBJECTS";
      }
      return `ARRAY_OF_${itemType.toUpperCase()}`;
    }
    return "ARRAY";
  }
  if (type === "object") {
    const nestedProps = propData.properties;
    const nestedReq = propData.required ?? [];
    if (nestedProps && depth < 1) {
      const nestedList = Object.entries(nestedProps).map(([n, d]) => {
        const t = d.type ?? "unknown";
        const req = nestedReq.includes(n) ? " REQUIRED" : "";
        return `${n}: ${t}${req}`;
      });
      return `object{${nestedList.join(", ")}}`;
    }
  }
  return type;
}
function injectParameterSignatures(tools, promptTemplate = "\n\n\u26A0\uFE0F STRICT PARAMETERS: {params}.") {
  if (!tools || !Array.isArray(tools)) return tools;
  return tools.map((tool2) => {
    const declarations = tool2.functionDeclarations;
    if (!Array.isArray(declarations)) return tool2;
    const newDeclarations = declarations.map((decl) => {
      if (decl.description?.includes("STRICT PARAMETERS:")) {
        return decl;
      }
      const schema = decl.parameters || decl.parametersJsonSchema;
      if (!schema) return decl;
      const required = schema.required ?? [];
      const properties = schema.properties ?? {};
      if (Object.keys(properties).length === 0) return decl;
      const paramList = Object.entries(properties).map(([propName, propData]) => {
        const typeHint = formatTypeHint(propData);
        const isRequired = required.includes(propName);
        return `${propName} (${typeHint}${isRequired ? ", REQUIRED" : ""})`;
      });
      const sigStr = promptTemplate.replace("{params}", paramList.join(", "));
      return {
        ...decl,
        description: (decl.description || "") + sigStr
      };
    });
    return { ...tool2, functionDeclarations: newDeclarations };
  });
}
function injectToolHardeningInstruction(payload, instructionText) {
  if (!instructionText) return;
  const existing = payload.systemInstruction;
  if (existing && typeof existing === "object" && "parts" in existing) {
    const parts = existing.parts;
    if (Array.isArray(parts) && parts.some((p) => p.text?.includes("CRITICAL TOOL USAGE INSTRUCTIONS"))) {
      return;
    }
  }
  const instructionPart = { text: instructionText };
  if (payload.systemInstruction) {
    if (existing && typeof existing === "object" && "parts" in existing) {
      const parts = existing.parts;
      if (Array.isArray(parts)) {
        parts.unshift(instructionPart);
      }
    } else if (typeof existing === "string") {
      payload.systemInstruction = {
        role: "user",
        parts: [instructionPart, { text: existing }]
      };
    } else {
      payload.systemInstruction = {
        role: "user",
        parts: [instructionPart]
      };
    }
  } else {
    payload.systemInstruction = {
      role: "user",
      parts: [instructionPart]
    };
  }
}
function assignToolIdsToContents(contents) {
  if (!Array.isArray(contents)) {
    return { contents, pendingCallIdsByName: /* @__PURE__ */ new Map(), toolCallCounter: 0 };
  }
  let toolCallCounter = 0;
  const pendingCallIdsByName = /* @__PURE__ */ new Map();
  const newContents = contents.map((content) => {
    if (!content || !Array.isArray(content.parts)) {
      return content;
    }
    const newParts = content.parts.map((part) => {
      if (part && typeof part === "object" && part.functionCall) {
        const call = { ...part.functionCall };
        if (!call.id) {
          call.id = `tool-call-${++toolCallCounter}`;
        }
        const nameKey = typeof call.name === "string" ? call.name : `tool-${toolCallCounter}`;
        const queue = pendingCallIdsByName.get(nameKey) || [];
        queue.push(call.id);
        pendingCallIdsByName.set(nameKey, queue);
        return { ...part, functionCall: call };
      }
      return part;
    });
    return { ...content, parts: newParts };
  });
  return { contents: newContents, pendingCallIdsByName, toolCallCounter };
}
function matchResponseIdsToContents(contents, pendingCallIdsByName) {
  if (!Array.isArray(contents)) {
    return contents;
  }
  return contents.map((content) => {
    if (!content || !Array.isArray(content.parts)) {
      return content;
    }
    const newParts = content.parts.map((part) => {
      if (part && typeof part === "object" && part.functionResponse) {
        const resp = { ...part.functionResponse };
        if (!resp.id && typeof resp.name === "string") {
          const queue = pendingCallIdsByName.get(resp.name);
          if (queue && queue.length > 0) {
            resp.id = queue.shift();
            pendingCallIdsByName.set(resp.name, queue);
          }
        }
        return { ...part, functionResponse: resp };
      }
      return part;
    });
    return { ...content, parts: newParts };
  });
}
function applyToolPairingFixes(payload, isClaude) {
  let contentsFixed = false;
  let messagesFixed = false;
  if (!isClaude) {
    return { contentsFixed, messagesFixed };
  }
  if (Array.isArray(payload.contents)) {
    const { contents: contentsWithIds, pendingCallIdsByName } = assignToolIdsToContents(
      payload.contents
    );
    const contentsWithMatchedIds = matchResponseIdsToContents(contentsWithIds, pendingCallIdsByName);
    payload.contents = fixToolResponseGrouping(contentsWithMatchedIds);
    contentsFixed = true;
    log6.debug("Applied tool pairing fixes to contents[]", {
      originalLength: payload.contents.length
    });
  }
  if (Array.isArray(payload.messages)) {
    payload.messages = validateAndFixClaudeToolPairing(payload.messages);
    messagesFixed = true;
    log6.debug("Applied tool pairing fixes to messages[]", {
      originalLength: payload.messages.length
    });
  }
  return { contentsFixed, messagesFixed };
}
function createGeminiSyntheticErrorResponse(errorMessage, requestedModel) {
  const approxTokens = Math.max(1, Math.ceil(errorMessage.length / 4));
  const chunk = {
    candidates: [
      {
        content: { role: "model", parts: [{ text: errorMessage }] },
        finishReason: "STOP",
        index: 0
      }
    ],
    modelVersion: requestedModel,
    usageMetadata: {
      promptTokenCount: 0,
      candidatesTokenCount: approxTokens,
      totalTokenCount: approxTokens
    }
  };
  return new Response(`data: ${JSON.stringify(chunk)}

`, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Antigravity-Synthetic": "true"
    }
  });
}
function createSyntheticErrorResponse(errorMessage, requestedModel = "unknown", family) {
  const isGemini = family === "gemini" || family === void 0 && !requestedModel.toLowerCase().includes("claude");
  if (isGemini) {
    return createGeminiSyntheticErrorResponse(errorMessage, requestedModel);
  }
  const messageId = `msg_synthetic_${Date.now()}`;
  const events = [];
  events.push(`event: message_start
data: ${JSON.stringify({
    type: "message_start",
    message: {
      id: messageId,
      type: "message",
      role: "assistant",
      content: [],
      model: requestedModel,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    }
  })}

`);
  events.push(`event: content_block_start
data: ${JSON.stringify({
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" }
  })}

`);
  events.push(`event: content_block_delta
data: ${JSON.stringify({
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: errorMessage }
  })}

`);
  events.push(`event: content_block_stop
data: ${JSON.stringify({
    type: "content_block_stop",
    index: 0
  })}

`);
  events.push(`event: message_delta
data: ${JSON.stringify({
    type: "message_delta",
    delta: { stop_reason: "end_turn", stop_sequence: null },
    usage: { output_tokens: Math.ceil(errorMessage.length / 4) }
  })}

`);
  events.push(`event: message_stop
data: ${JSON.stringify({ type: "message_stop" })}

`);
  const body = events.join("");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Antigravity-Synthetic": "true",
      "X-Antigravity-Error-Type": "prompt_too_long"
    }
  });
}

// src/plugin/thinking-recovery.ts
function isThinkingPart2(part) {
  if (!part || typeof part !== "object") return false;
  return part.thought === true || part.type === "thinking" || part.type === "redacted_thinking";
}
function isFunctionResponsePart(part) {
  return part && typeof part === "object" && "functionResponse" in part;
}
function isFunctionCallPart(part) {
  return part && typeof part === "object" && "functionCall" in part;
}
function isToolResultMessage(msg) {
  if (!msg || msg.role !== "user") return false;
  const parts = msg.parts || [];
  return parts.some(isFunctionResponsePart);
}
function messageHasThinking(msg) {
  if (!msg || typeof msg !== "object") return false;
  if (Array.isArray(msg.parts)) {
    return msg.parts.some(isThinkingPart2);
  }
  if (Array.isArray(msg.content)) {
    return msg.content.some(
      (block) => block?.type === "thinking" || block?.type === "redacted_thinking"
    );
  }
  return false;
}
function messageHasToolCalls(msg) {
  if (!msg || typeof msg !== "object") return false;
  if (Array.isArray(msg.parts)) {
    return msg.parts.some(isFunctionCallPart);
  }
  if (Array.isArray(msg.content)) {
    return msg.content.some((block) => block?.type === "tool_use");
  }
  return false;
}
function analyzeConversationState(contents) {
  const state = {
    inToolLoop: false,
    turnStartIdx: -1,
    turnHasThinking: false,
    lastModelIdx: -1,
    lastModelHasThinking: false,
    lastModelHasToolCalls: false
  };
  if (!Array.isArray(contents) || contents.length === 0) {
    return state;
  }
  let lastRealUserIdx = -1;
  for (let i = 0; i < contents.length; i++) {
    const msg = contents[i];
    if (msg?.role === "user" && !isToolResultMessage(msg)) {
      lastRealUserIdx = i;
    }
  }
  for (let i = 0; i < contents.length; i++) {
    const msg = contents[i];
    const role = msg?.role;
    if (role === "model" || role === "assistant") {
      const hasThinking = messageHasThinking(msg);
      const hasToolCalls = messageHasToolCalls(msg);
      if (i > lastRealUserIdx && state.turnStartIdx === -1) {
        state.turnStartIdx = i;
        state.turnHasThinking = hasThinking;
      }
      state.lastModelIdx = i;
      state.lastModelHasToolCalls = hasToolCalls;
      state.lastModelHasThinking = hasThinking;
    }
  }
  if (contents.length > 0) {
    const lastMsg = contents[contents.length - 1];
    if (lastMsg?.role === "user" && isToolResultMessage(lastMsg)) {
      state.inToolLoop = true;
    }
  }
  return state;
}
function stripAllThinkingBlocks2(contents) {
  return contents.map((content) => {
    if (!content || typeof content !== "object") return content;
    if (Array.isArray(content.parts)) {
      const filteredParts = content.parts.filter(
        (part) => !isThinkingPart2(part)
      );
      if (filteredParts.length === 0 && content.parts.length > 0) {
        return content;
      }
      return { ...content, parts: filteredParts };
    }
    if (Array.isArray(content.content)) {
      const filteredContent = content.content.filter(
        (block) => block?.type !== "thinking" && block?.type !== "redacted_thinking"
      );
      if (filteredContent.length === 0 && content.content.length > 0) {
        return content;
      }
      return { ...content, content: filteredContent };
    }
    return content;
  });
}
function countTrailingToolResults(contents) {
  let count = 0;
  for (let i = contents.length - 1; i >= 0; i--) {
    const msg = contents[i];
    if (msg?.role === "user") {
      const parts = msg.parts || [];
      const functionResponses = parts.filter(isFunctionResponsePart);
      if (functionResponses.length > 0) {
        count += functionResponses.length;
      } else {
        break;
      }
    } else if (msg?.role === "model" || msg?.role === "assistant") {
      break;
    }
  }
  return count;
}
function closeToolLoopForThinking(contents) {
  const strippedContents = stripAllThinkingBlocks2(contents);
  const toolResultCount = countTrailingToolResults(strippedContents);
  let syntheticModelContent;
  if (toolResultCount === 0) {
    syntheticModelContent = "[Processing previous context.]";
  } else if (toolResultCount === 1) {
    syntheticModelContent = "[Tool execution completed.]";
  } else {
    syntheticModelContent = `[${toolResultCount} tool executions completed.]`;
  }
  const syntheticModel = {
    role: "model",
    parts: [{ text: syntheticModelContent }]
  };
  const syntheticUser = {
    role: "user",
    parts: [{ text: "[Continue]" }]
  };
  return [...strippedContents, syntheticModel, syntheticUser];
}
function needsThinkingRecovery(state) {
  return state.inToolLoop && !state.turnHasThinking;
}

// src/plugin/transform/claude.ts
var CLAUDE_THINKING_MAX_OUTPUT_TOKENS = 64e3;
function isClaudeModel(model) {
  return model.toLowerCase().includes("claude");
}
function isClaudeThinkingModel(model) {
  const lower = model.toLowerCase();
  return lower.includes("claude") && lower.includes("thinking");
}

// src/plugin/transform/gemini.ts
var UNSUPPORTED_SCHEMA_FIELDS = /* @__PURE__ */ new Set([
  "additionalProperties",
  "$schema",
  "$id",
  "$comment",
  "$ref",
  "$defs",
  "definitions",
  "const",
  "contentMediaType",
  "contentEncoding",
  "if",
  "then",
  "else",
  "not",
  "patternProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "dependentRequired",
  "dependentSchemas",
  "propertyNames",
  "minContains",
  "maxContains"
]);
function isNullSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return false;
  }
  return schema.type === "null";
}
function nullableUnionSchema(schema) {
  for (const key of ["anyOf", "oneOf"]) {
    const options = schema[key];
    if (!Array.isArray(options) || options.length !== 2) {
      continue;
    }
    const nonNullOptions = options.filter((option) => !isNullSchema(option));
    if (nonNullOptions.length !== 1) {
      continue;
    }
    const nonNullOption = nonNullOptions[0];
    if (!nonNullOption || typeof nonNullOption !== "object" || Array.isArray(nonNullOption)) {
      continue;
    }
    const { [key]: _union, ...rest } = schema;
    const nonNullSchema = nonNullOption;
    const nullableSchema = {
      ...rest,
      ...nonNullSchema
    };
    const baseDescription = typeof rest.description === "string" ? rest.description : typeof nonNullSchema.description === "string" ? nonNullSchema.description : void 0;
    const description = baseDescription !== void 0 ? `${baseDescription} (nullable)` : "nullable";
    return {
      ...nullableSchema,
      description
    };
  }
  return void 0;
}
function singleOptionUnionSchema(schema) {
  for (const key of ["anyOf", "oneOf"]) {
    const options = schema[key];
    if (!Array.isArray(options) || options.length !== 1) {
      continue;
    }
    const option = options[0];
    if (!option || typeof option !== "object" || Array.isArray(option)) {
      continue;
    }
    const { [key]: _union, ...rest } = schema;
    const optionSchema = option;
    const description = typeof rest.description === "string" ? rest.description : optionSchema.description;
    return {
      ...rest,
      ...optionSchema,
      ...description !== void 0 ? { description } : {}
    };
  }
  return void 0;
}
var geminiSchemaCache = /* @__PURE__ */ new WeakMap();
var geminiSchemaContentCache = /* @__PURE__ */ new Map();
var MAX_SCHEMA_CONTENT_ENTRIES = 128;
var MAX_SCHEMA_CONTENT_BYTES = 64 * 1024;
function toGeminiSchemaMemoized(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return toGeminiSchema(schema);
  }
  let key;
  try {
    key = JSON.stringify(schema);
  } catch {
    return toGeminiSchema(schema);
  }
  if (key.length > MAX_SCHEMA_CONTENT_BYTES) {
    return toGeminiSchema(schema);
  }
  const hit = geminiSchemaContentCache.get(key);
  if (hit !== void 0) {
    return JSON.parse(hit);
  }
  const converted = toGeminiSchema(schema);
  let serialized;
  try {
    serialized = JSON.stringify(converted);
  } catch {
    return converted;
  }
  if (geminiSchemaContentCache.size >= MAX_SCHEMA_CONTENT_ENTRIES) {
    const oldest = geminiSchemaContentCache.keys().next().value;
    if (oldest !== void 0) geminiSchemaContentCache.delete(oldest);
  }
  geminiSchemaContentCache.set(key, serialized);
  return converted;
}
function toGeminiSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }
  const cached = geminiSchemaCache.get(schema);
  if (cached !== void 0) {
    return cached;
  }
  const inputSchema = schema;
  const singleOptionSchema = singleOptionUnionSchema(inputSchema);
  if (singleOptionSchema) {
    const result2 = toGeminiSchema(singleOptionSchema);
    geminiSchemaCache.set(schema, result2);
    return result2;
  }
  const nullableSchema = nullableUnionSchema(inputSchema);
  if (nullableSchema) {
    const result2 = toGeminiSchema(nullableSchema);
    geminiSchemaCache.set(schema, result2);
    return result2;
  }
  const result = {};
  const propertyNames = /* @__PURE__ */ new Set();
  if (inputSchema.properties && typeof inputSchema.properties === "object") {
    for (const propName of Object.keys(
      inputSchema.properties
    )) {
      propertyNames.add(propName);
    }
  }
  for (const [key, value] of Object.entries(inputSchema)) {
    if (UNSUPPORTED_SCHEMA_FIELDS.has(key)) {
      continue;
    }
    if (key === "type" && typeof value === "string") {
      result[key] = value.toUpperCase();
    } else if (key === "properties" && typeof value === "object" && value !== null) {
      const props = {};
      for (const [propName, propSchema] of Object.entries(
        value
      )) {
        props[propName] = toGeminiSchema(propSchema);
      }
      result[key] = props;
    } else if (key === "items" && typeof value === "object") {
      result[key] = toGeminiSchema(value);
    } else if ((key === "anyOf" || key === "oneOf" || key === "allOf") && Array.isArray(value)) {
      result[key] = value.map((item) => toGeminiSchema(item));
    } else if (key === "enum" && Array.isArray(value)) {
      result[key] = value;
    } else if (key === "default" || key === "examples") {
      result[key] = value;
    } else if (key === "required" && Array.isArray(value)) {
      if (propertyNames.size > 0) {
        const validRequired = value.filter(
          (prop) => typeof prop === "string" && propertyNames.has(prop)
        );
        if (validRequired.length > 0) {
          result[key] = validRequired;
        }
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  if (result.type === "ARRAY" && !result.items) {
    result.items = { type: "STRING" };
  }
  geminiSchemaCache.set(schema, result);
  return result;
}
function isGeminiModel(model) {
  const lower = model.toLowerCase();
  return lower.includes("gemini") && !lower.includes("claude");
}
function isGemini3Model(model) {
  return model.toLowerCase().includes("gemini-3");
}
var STRICT_SAMPLING_MODEL_REGEX = /^gemini-(?:3\.[678]-flash(?:-(?:low|medium|high|tiered))?|3\.5-flash-lite)$/i;
var DEPRECATED_SAMPLING_FIELDS = [
  "temperature",
  "topP",
  "top_p",
  "topK",
  "top_k",
  "candidateCount",
  "candidate_count"
];
function sanitizeGeminiGenerationConfigForModel(payload, model) {
  const normalizedModel = model.replace(/^antigravity-/i, "");
  if (!STRICT_SAMPLING_MODEL_REGEX.test(normalizedModel)) {
    return;
  }
  const configs = [payload.generationConfig];
  const extraBody = payload.extra_body ?? payload.extraBody;
  if (extraBody && typeof extraBody === "object" && !Array.isArray(extraBody)) {
    configs.push(extraBody.generationConfig);
  }
  for (const config of configs) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      continue;
    }
    for (const field of DEPRECATED_SAMPLING_FIELDS) {
      delete config[field];
    }
  }
}
function isImageGenerationModel(model) {
  const lower = model.toLowerCase();
  return lower.includes("image") || lower.includes("imagen");
}
function buildGemini3ThinkingConfig(includeThoughts, thinkingLevel) {
  return {
    includeThoughts,
    thinkingLevel
  };
}
function buildGemini25ThinkingConfig(includeThoughts, thinkingBudget) {
  return {
    includeThoughts,
    ...typeof thinkingBudget === "number" && thinkingBudget > 0 ? { thinkingBudget } : {}
  };
}
var VALID_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9"
];
function buildImageGenerationConfig() {
  const aspectRatio = process.env.OPENCODE_IMAGE_ASPECT_RATIO || "1:1";
  if (VALID_ASPECT_RATIOS.includes(aspectRatio)) {
    return { aspectRatio };
  }
  console.warn(
    `[gemini] Invalid aspect ratio "${aspectRatio}". Using default "1:1". Valid values: ${VALID_ASPECT_RATIOS.join(", ")}`
  );
  return { aspectRatio: "1:1" };
}
function normalizeGeminiTools(payload) {
  let toolDebugMissing = 0;
  const toolDebugSummaries = [];
  if (!Array.isArray(payload.tools)) {
    return { toolDebugMissing, toolDebugSummaries };
  }
  payload.tools = payload.tools.map(
    (tool2, toolIndex) => {
      const t = tool2;
      if (t.googleSearch || t.googleSearchRetrieval) {
        return t;
      }
      const newTool = { ...t };
      const schemaCandidates = [
        newTool.function?.input_schema,
        newTool.function?.parameters,
        newTool.function?.inputSchema,
        newTool.custom?.input_schema,
        newTool.custom?.parameters,
        newTool.parameters,
        newTool.input_schema,
        newTool.inputSchema
      ].filter(Boolean);
      const placeholderSchema = {
        type: "OBJECT",
        properties: {
          _placeholder: {
            type: "BOOLEAN",
            description: "Placeholder. Always pass true."
          }
        },
        required: ["_placeholder"]
      };
      let schema = schemaCandidates[0];
      const schemaObjectOk = schema && typeof schema === "object" && !Array.isArray(schema);
      if (!schemaObjectOk) {
        schema = placeholderSchema;
        toolDebugMissing += 1;
      } else {
        schema = toGeminiSchemaMemoized(schema);
      }
      const nameCandidate = newTool.name || newTool.function?.name || newTool.custom?.name || `tool-${toolIndex}`;
      if (newTool.function && schema) {
        newTool.function.input_schema = schema;
      }
      if (newTool.custom && schema) {
        newTool.custom.input_schema = schema;
      }
      if (!newTool.custom && newTool.function) {
        const fn = newTool.function;
        newTool.custom = {
          name: fn.name || nameCandidate,
          description: fn.description,
          input_schema: schema
        };
      }
      if (!newTool.custom && !newTool.function) {
        newTool.custom = {
          name: nameCandidate,
          description: newTool.description,
          input_schema: schema
        };
        if (!newTool.parameters && !newTool.input_schema && !newTool.inputSchema) {
          newTool.parameters = schema;
        }
      }
      if (newTool.custom && !newTool.custom.input_schema) {
        newTool.custom.input_schema = {
          type: "OBJECT",
          properties: {}
        };
        toolDebugMissing += 1;
      }
      toolDebugSummaries.push(
        `idx=${toolIndex}, hasCustom=${!!newTool.custom}, customSchema=${!!newTool.custom?.input_schema}, hasFunction=${!!newTool.function}, functionSchema=${!!newTool.function?.input_schema}`
      );
      if (newTool.custom) {
        delete newTool.custom;
      }
      return newTool;
    }
  );
  return { toolDebugMissing, toolDebugSummaries };
}
function applyGeminiTransforms(payload, options) {
  const {
    model,
    tierThinkingBudget,
    tierThinkingLevel,
    normalizedThinking,
    googleSearch
  } = options;
  if (normalizedThinking) {
    let thinkingConfig;
    if (tierThinkingLevel && isGemini3Model(model)) {
      thinkingConfig = buildGemini3ThinkingConfig(
        normalizedThinking.includeThoughts ?? true,
        tierThinkingLevel
      );
    } else {
      const thinkingBudget = tierThinkingBudget ?? normalizedThinking.thinkingBudget;
      thinkingConfig = buildGemini25ThinkingConfig(
        normalizedThinking.includeThoughts ?? true,
        thinkingBudget
      );
    }
    const generationConfig = payload.generationConfig ?? {};
    generationConfig.thinkingConfig = thinkingConfig;
    payload.generationConfig = generationConfig;
  }
  if (googleSearch && googleSearch.mode === "auto") {
    const tools = payload.tools || [];
    if (!payload.tools) {
      payload.tools = tools;
    }
    payload.tools.push({
      googleSearch: {}
    });
  }
  const result = normalizeGeminiTools(payload);
  const wrapResult = wrapToolsAsFunctionDeclarations(payload);
  return {
    ...result,
    wrappedFunctionCount: wrapResult.wrappedFunctionCount,
    passthroughToolCount: wrapResult.passthroughToolCount
  };
}
function isWebSearchTool(tool2) {
  if (tool2.googleSearch || tool2.googleSearchRetrieval) {
    return true;
  }
  if (tool2.type === "web_search_20250305") {
    return true;
  }
  const name = tool2.name;
  if (name === "web_search" || name === "google_search") {
    return true;
  }
  return false;
}
function wrapToolsAsFunctionDeclarations(payload) {
  if (!Array.isArray(payload.tools) || payload.tools.length === 0) {
    return { wrappedFunctionCount: 0, passthroughToolCount: 0 };
  }
  const functionDeclarations = [];
  const passthroughTools = [];
  let hasWebSearchTool = false;
  for (const tool2 of payload.tools) {
    if (tool2.googleSearch || tool2.googleSearchRetrieval || tool2.codeExecution) {
      passthroughTools.push(tool2);
      continue;
    }
    if (isWebSearchTool(tool2)) {
      hasWebSearchTool = true;
      continue;
    }
    if (tool2.functionDeclarations) {
      if (Array.isArray(tool2.functionDeclarations)) {
        for (const decl of tool2.functionDeclarations) {
          const parameters = decl.parameters && typeof decl.parameters === "object" && !Array.isArray(decl.parameters) ? toGeminiSchemaMemoized(decl.parameters) : { type: "OBJECT", properties: {} };
          functionDeclarations.push({
            name: String(decl.name || `tool-${functionDeclarations.length}`),
            description: String(decl.description || ""),
            parameters
          });
        }
      }
      continue;
    }
    const fn = tool2.function;
    const custom = tool2.custom;
    const name = String(
      tool2.name || fn?.name || custom?.name || `tool-${functionDeclarations.length}`
    );
    const description = String(
      tool2.description || fn?.description || custom?.description || ""
    );
    const schema = fn?.input_schema || fn?.parameters || fn?.inputSchema || custom?.input_schema || custom?.parameters || tool2.parameters || tool2.input_schema || tool2.inputSchema || { type: "OBJECT", properties: {} };
    functionDeclarations.push({
      name,
      description,
      parameters: schema
    });
  }
  const finalTools = [];
  if (functionDeclarations.length > 0) {
    finalTools.push({ functionDeclarations });
  }
  finalTools.push(...passthroughTools);
  if (hasWebSearchTool && functionDeclarations.length === 0) {
    finalTools.push({ googleSearch: {} });
  } else if (hasWebSearchTool && functionDeclarations.length > 0) {
    console.warn(
      "[gemini] web_search tool detected but cannot be combined with function declarations. Use the explicit google_search() tool call instead."
    );
  }
  payload.tools = finalTools;
  return {
    wrappedFunctionCount: functionDeclarations.length,
    passthroughToolCount: passthroughTools.length + (hasWebSearchTool && functionDeclarations.length === 0 ? 1 : 0)
  };
}

// src/plugin/transform/cross-model-sanitizer.ts
var GEMINI_SIGNATURE_FIELDS = ["thoughtSignature", "thinkingMetadata"];
var CLAUDE_SIGNATURE_FIELDS = ["signature"];
function getModelFamily(model) {
  if (isClaudeModel(model)) return "claude";
  if (isGeminiModel(model)) return "gemini";
  return "unknown";
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stripGeminiThinkingMetadata(part, preserveNonSignature = true) {
  let stripped = 0;
  if ("thoughtSignature" in part) {
    delete part.thoughtSignature;
    stripped++;
  }
  if ("thinkingMetadata" in part) {
    delete part.thinkingMetadata;
    stripped++;
  }
  if (isPlainObject(part.metadata)) {
    const metadata = part.metadata;
    if (isPlainObject(metadata.google)) {
      const google = metadata.google;
      for (const field of GEMINI_SIGNATURE_FIELDS) {
        if (field in google) {
          delete google[field];
          stripped++;
        }
      }
      if (!preserveNonSignature || Object.keys(google).length === 0) {
        delete metadata.google;
      }
      if (Object.keys(metadata).length === 0) {
        delete part.metadata;
      }
    }
  }
  return { part, stripped };
}
function stripClaudeThinkingFields(part) {
  let stripped = 0;
  if (part.type === "thinking" || part.type === "redacted_thinking") {
    for (const field of CLAUDE_SIGNATURE_FIELDS) {
      if (field in part) {
        delete part[field];
        stripped++;
      }
    }
  }
  if ("signature" in part && typeof part.signature === "string") {
    if (part.signature.length >= 50) {
      delete part.signature;
      stripped++;
    }
  }
  return { part, stripped };
}
function sanitizeCrossModelPayloadInPlace(payload, options) {
  const targetFamily = getModelFamily(options.targetModel);
  if (targetFamily === "unknown") {
    return 0;
  }
  if (options.sourceModel) {
    const sourceFamily = getModelFamily(options.sourceModel);
    if (sourceFamily === targetFamily) {
      return 0;
    }
  }
  const preserveNonSignature = options.preserveNonSignatureMetadata ?? true;
  let totalStripped = 0;
  const sanitizePartsInPlace = (parts) => {
    for (const part of parts) {
      if (!isPlainObject(part)) continue;
      if (targetFamily === "claude") {
        const result = stripGeminiThinkingMetadata(
          part,
          preserveNonSignature
        );
        totalStripped += result.stripped;
      } else if (targetFamily === "gemini") {
        const result = stripClaudeThinkingFields(
          part
        );
        totalStripped += result.stripped;
      }
    }
  };
  if (Array.isArray(payload.contents)) {
    for (const content of payload.contents) {
      if (isPlainObject(content) && Array.isArray(content.parts)) {
        sanitizePartsInPlace(content.parts);
      }
    }
  }
  if (Array.isArray(payload.messages)) {
    for (const message of payload.messages) {
      if (isPlainObject(message) && Array.isArray(message.content)) {
        sanitizePartsInPlace(message.content);
      }
    }
  }
  if (isPlainObject(payload.extra_body)) {
    const extraBody = payload.extra_body;
    if (Array.isArray(extraBody.messages)) {
      for (const message of extraBody.messages) {
        if (isPlainObject(message) && Array.isArray(message.content)) {
          sanitizePartsInPlace(message.content);
        }
      }
    }
  }
  return totalStripped;
}

// src/plugin/transform/model-resolver.ts
var THINKING_TIER_BUDGETS = {
  claude: { low: 8192, medium: 16384, high: 32768 },
  "gemini-2.5-pro": { low: 8192, medium: 16384, high: 32768 },
  "gemini-2.5-flash": { low: 6144, medium: 12288, high: 24576 },
  default: { low: 4096, medium: 8192, high: 16384 }
};
var MODEL_ALIASES = {
  "gemini-flash-latest": "gemini-3.7-flash",
  "gemini-flash-lite-latest": "gemini-3.5-flash-lite",
  // Gemini 3 variants - for Gemini CLI only (tier stripped, thinkingLevel used)
  // For Antigravity, these are bypassed and full model name is kept
  "gemini-3-pro-low": "gemini-3-pro",
  "gemini-3-pro-high": "gemini-3-pro",
  "gemini-3.1-pro-low": "gemini-3.1-pro",
  "gemini-3.1-pro-high": "gemini-3.1-pro",
  "gemini-3-flash-low": "gemini-3-flash",
  "gemini-3-flash-medium": "gemini-3-flash",
  "gemini-3-flash-high": "gemini-3-flash",
  "gemini-3.7-flash-minimal": "gemini-3.7-flash",
  "gemini-3.7-flash-low": "gemini-3.7-flash",
  "gemini-3.7-flash-medium": "gemini-3.7-flash",
  "gemini-3.7-flash-high": "gemini-3.7-flash",
  // Claude proxy names (gemini- prefix for compatibility)
  "gemini-claude-opus-4-6-thinking-low": "claude-opus-4-6-thinking",
  "gemini-claude-opus-4-6-thinking-medium": "claude-opus-4-6-thinking",
  "gemini-claude-opus-4-6-thinking-high": "claude-opus-4-6-thinking",
  "gemini-claude-sonnet-4-6": "claude-sonnet-4-6"
  // Image generation models - only gemini-3-pro-image is available via Antigravity API
  // Note: gemini-2.5-flash-image (Nano Banana) is NOT supported by Antigravity - only Google AI API
  // Reference: Antigravity-Manager/src-tauri/src/proxy/common/model_mapping.rs
};
var TIER_REGEX = /-(minimal|low|medium|high)$/;
var QUOTA_PREFIX_REGEX = /^antigravity-/i;
var GEMINI_3_PRO_REGEX = /^gemini-3(?:\.\d+)?-pro/i;
var GEMINI_3_FLASH_REGEX = /^gemini-3(?:\.\d+)?-flash/i;
var GEMINI_35_FLASH_REGEX = /^gemini-3\.5-flash(?:-(minimal|low|medium|high))?$/i;
var GEMINI_35_FLASH_LOW_MODEL = "gemini-3.5-flash-low";
var GEMINI_35_FLASH_HIGH_MODEL = "gemini-3-flash-agent";
var GEMINI_36_FLASH_REGEX = /^gemini-3\.6-flash(?:-(low|medium|high))?$/i;
var GEMINI_36_FLASH_MODELS = {
  low: "gemini-3.6-flash-low",
  medium: "gemini-3.6-flash-medium",
  high: "gemini-3.6-flash-high"
};
var GEMINI_37_FLASH_REGEX = /^gemini-3\.7-flash(?:-(minimal|low|medium|high))?$/i;
var GEMINI_37_FLASH_MODELS = {
  low: "gemini-3.7-flash-low",
  medium: "gemini-3.7-flash-medium",
  high: "gemini-3.7-flash-high"
};
var GEMINI_38_FLASH_REGEX = /^gemini-3\.8-flash(?:-(low|medium|high))?$/i;
var GEMINI_38_FLASH_MODELS = {
  low: "gemini-3.8-flash-low",
  medium: "gemini-3.8-flash-medium",
  high: "gemini-3.8-flash-high"
};
var GEMINI_PUBLIC_ONLY_REGEX = /^(?:gemini-3\.5-flash-lite(?:-(?:minimal|low|medium|high))?|gemini-flash-lite-latest)$/i;
var GEMINI_DOTTED_MINOR_REGEX = /^gemini-3\.(?:[1-9]\d*)/i;
var IMAGE_GENERATION_MODELS = /image|imagen/i;
function supportsThinkingTiers(model) {
  const lower = model.toLowerCase();
  return lower.includes("gemini-3") || lower.includes("gemini-2.5") || lower.includes("claude") && lower.includes("thinking");
}
function extractThinkingTierFromModel(model) {
  if (!supportsThinkingTiers(model)) {
    return void 0;
  }
  const tierMatch = model.match(TIER_REGEX);
  return tierMatch?.[1];
}
function getBudgetFamily(model) {
  if (model.includes("claude")) {
    return "claude";
  }
  if (model.includes("gemini-2.5-pro")) {
    return "gemini-2.5-pro";
  }
  if (model.includes("gemini-2.5-flash")) {
    return "gemini-2.5-flash";
  }
  return "default";
}
function isThinkingCapableModel2(model) {
  const lower = model.toLowerCase();
  return lower.includes("thinking") || lower.includes("gemini-3") || lower.includes("gemini-2.5");
}
function isGemini3ProModel(model) {
  return GEMINI_3_PRO_REGEX.test(model);
}
function isGemini3FlashModel(model) {
  return GEMINI_3_FLASH_REGEX.test(model);
}
function resolveAntigravityGemini35FlashBackendModel(model, thinkingLevel) {
  const modelWithoutQuota = model.replace(QUOTA_PREFIX_REGEX, "");
  const match = modelWithoutQuota.match(GEMINI_35_FLASH_REGEX);
  if (!match) {
    return void 0;
  }
  const level = (thinkingLevel ?? match[1] ?? "low").toLowerCase();
  return level === "high" ? GEMINI_35_FLASH_HIGH_MODEL : GEMINI_35_FLASH_LOW_MODEL;
}
function resolveAntigravityGemini36FlashBackendModel(model, thinkingLevel) {
  const modelWithoutQuota = model.replace(QUOTA_PREFIX_REGEX, "");
  const match = modelWithoutQuota.match(GEMINI_36_FLASH_REGEX);
  if (!match) {
    return void 0;
  }
  const rawLevel = (thinkingLevel ?? match[1] ?? "medium").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return void 0;
  }
  return GEMINI_36_FLASH_MODELS[level];
}
function resolveAntigravityGemini37FlashBackendModel(model, thinkingLevel) {
  const modelWithoutQuota = model.replace(QUOTA_PREFIX_REGEX, "");
  const match = modelWithoutQuota.match(GEMINI_37_FLASH_REGEX);
  if (!match) {
    return void 0;
  }
  const rawLevel = (thinkingLevel ?? match[1] ?? "medium").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return void 0;
  }
  return GEMINI_37_FLASH_MODELS[level];
}
function resolveAntigravityGemini38FlashBackendModel(model, thinkingLevel) {
  const modelWithoutQuota = model.replace(QUOTA_PREFIX_REGEX, "");
  const match = modelWithoutQuota.match(GEMINI_38_FLASH_REGEX);
  if (!match) {
    return void 0;
  }
  const rawLevel = (thinkingLevel ?? match[1] ?? "medium").toLowerCase();
  const level = rawLevel === "minimal" ? "low" : rawLevel;
  if (level !== "low" && level !== "medium" && level !== "high") {
    return void 0;
  }
  return GEMINI_38_FLASH_MODELS[level];
}
function getDefaultGemini3ThinkingLevel(model) {
  const normalized = model.toLowerCase().replace(QUOTA_PREFIX_REGEX, "");
  if (/^gemini-3\.[678]-flash(?:-|$)/.test(normalized)) {
    return "medium";
  }
  if (/^gemini-3\.5-flash-lite(?:-|$)/.test(normalized)) {
    return "minimal";
  }
  return "low";
}
function isGeminiPublicOnlyModel(model) {
  return GEMINI_PUBLIC_ONLY_REGEX.test(model.replace(QUOTA_PREFIX_REGEX, ""));
}
function resolveModelWithTier(requestedModel, options = {}) {
  const isAntigravity = QUOTA_PREFIX_REGEX.test(requestedModel);
  const modelWithoutQuota = requestedModel.replace(QUOTA_PREFIX_REGEX, "");
  const tier = extractThinkingTierFromModel(modelWithoutQuota);
  const baseName = tier ? modelWithoutQuota.replace(TIER_REGEX, "") : modelWithoutQuota;
  const isImageModel = IMAGE_GENERATION_MODELS.test(modelWithoutQuota);
  const isClaudeModel2 = modelWithoutQuota.toLowerCase().includes("claude");
  const preferGeminiCli = !isAntigravity && (isGeminiPublicOnlyModel(modelWithoutQuota) || options.cli_first === true && !isImageModel && !isClaudeModel2);
  const quotaPreference = preferGeminiCli ? "gemini-cli" : "antigravity";
  const explicitQuota = isAntigravity || isImageModel;
  const isGemini3 = modelWithoutQuota.toLowerCase().startsWith("gemini-3");
  const skipAlias = isAntigravity && isGemini3;
  const isGemini3Pro = isGemini3ProModel(modelWithoutQuota);
  const isGemini3Flash = isGemini3FlashModel(modelWithoutQuota);
  let effectiveTier = tier;
  let antigravityModel = modelWithoutQuota;
  if (skipAlias) {
    const gemini38FlashBackendModel = resolveAntigravityGemini38FlashBackendModel(modelWithoutQuota, tier);
    const gemini37FlashBackendModel = resolveAntigravityGemini37FlashBackendModel(modelWithoutQuota, effectiveTier);
    const gemini36FlashBackendModel = resolveAntigravityGemini36FlashBackendModel(modelWithoutQuota, effectiveTier);
    const gemini35FlashBackendModel = resolveAntigravityGemini35FlashBackendModel(modelWithoutQuota, tier);
    if (gemini38FlashBackendModel) {
      antigravityModel = gemini38FlashBackendModel;
    } else if (gemini37FlashBackendModel) {
      antigravityModel = gemini37FlashBackendModel;
      if (String(effectiveTier) === "minimal") {
        effectiveTier = "low";
      }
    } else if (gemini36FlashBackendModel) {
      antigravityModel = gemini36FlashBackendModel;
    } else if (gemini35FlashBackendModel) {
      antigravityModel = gemini35FlashBackendModel;
    } else if (isGemini3Pro && !effectiveTier && !isImageModel) {
      antigravityModel = `${modelWithoutQuota}-low`;
    } else if (isGemini3Flash && effectiveTier) {
      antigravityModel = baseName;
    }
  }
  const actualModel = skipAlias ? antigravityModel : MODEL_ALIASES[modelWithoutQuota] || MODEL_ALIASES[baseName] || baseName;
  const resolvedModel = actualModel;
  const isThinking = isThinkingCapableModel2(resolvedModel);
  if (isImageModel) {
    return {
      actualModel: resolvedModel,
      isThinkingModel: false,
      isImageModel: true,
      quotaPreference,
      explicitQuota
    };
  }
  const isEffectiveGemini3 = resolvedModel.toLowerCase().includes("gemini-3");
  const isClaudeThinking = resolvedModel.toLowerCase().includes("claude") && resolvedModel.toLowerCase().includes("thinking");
  if (!effectiveTier) {
    if (isEffectiveGemini3) {
      return {
        actualModel: resolvedModel,
        thinkingLevel: getDefaultGemini3ThinkingLevel(resolvedModel),
        isThinkingModel: true,
        quotaPreference,
        explicitQuota
      };
    }
    if (isClaudeThinking) {
      return {
        actualModel: resolvedModel,
        thinkingBudget: THINKING_TIER_BUDGETS.claude.high,
        isThinkingModel: true,
        quotaPreference,
        explicitQuota
      };
    }
    return {
      actualModel: resolvedModel,
      isThinkingModel: isThinking,
      quotaPreference,
      explicitQuota
    };
  }
  if (isEffectiveGemini3) {
    return {
      actualModel: resolvedModel,
      thinkingLevel: effectiveTier,
      tier: effectiveTier,
      isThinkingModel: true,
      quotaPreference,
      explicitQuota
    };
  }
  const budgetFamily = getBudgetFamily(resolvedModel);
  const budgets = THINKING_TIER_BUDGETS[budgetFamily];
  const thinkingBudget = budgets[effectiveTier];
  return {
    actualModel: resolvedModel,
    thinkingBudget,
    tier: effectiveTier,
    isThinkingModel: isThinking,
    quotaPreference,
    explicitQuota
  };
}
function getModelFamily2(model) {
  const lower = model.toLowerCase();
  if (lower.includes("claude")) {
    return "claude";
  }
  if (lower.includes("flash")) {
    return "gemini-flash";
  }
  return "gemini-pro";
}
var ANTIGRAVITY_TO_PUBLIC_API_MODEL_MAP = /* @__PURE__ */ new Map([
  ["gemini-3-pro", "gemini-3-pro-preview"],
  ["gemini-3-flash", "gemini-3-flash-preview"],
  ["gemini-3.1-pro", "gemini-3.1-pro-preview"],
  ["gemini-3.1-flash", "gemini-3.1-flash-lite"]
]);
function mapAntigravityModelToPublicApi(model) {
  const stripped = model.toLowerCase().replace(/^antigravity-/, "");
  const base = stripped.replace(/-(minimal|low|medium|high)$/, "");
  return ANTIGRAVITY_TO_PUBLIC_API_MODEL_MAP.get(base);
}
function resolveModelForHeaderStyle(requestedModel, headerStyle) {
  const aliasResolvedModel = MODEL_ALIASES[requestedModel];
  if (aliasResolvedModel) {
    return resolveModelForHeaderStyle(aliasResolvedModel, headerStyle);
  }
  const lower = requestedModel.toLowerCase();
  const isGemini3 = lower.includes("gemini-3");
  if (headerStyle === "agy-sdk") {
    const modelWithTier = requestedModel.replace(/^antigravity-/i, "");
    const stripped = modelWithTier.replace(/-(minimal|low|medium|high)$/i, "");
    const transformedModel = mapAntigravityModelToPublicApi(stripped) ?? stripped;
    return {
      ...resolveModelWithTier(modelWithTier),
      actualModel: transformedModel,
      quotaPreference: "agy-sdk",
      explicitQuota: false
    };
  }
  if (!isGemini3) {
    return resolveModelWithTier(requestedModel);
  }
  if (headerStyle === "antigravity") {
    let transformedModel = requestedModel.replace(/-preview-customtools$/i, "").replace(/-preview$/i, "").replace(/^antigravity-/i, "");
    const isGemini3Pro = isGemini3ProModel(transformedModel);
    const hasTierSuffix = /-(low|medium|high)$/i.test(transformedModel);
    const isImageModel = IMAGE_GENERATION_MODELS.test(transformedModel);
    if (isGemini3Pro && !hasTierSuffix && !isImageModel) {
      transformedModel = `${transformedModel}-low`;
    }
    const prefixedModel = `antigravity-${transformedModel}`;
    return resolveModelWithTier(prefixedModel);
  }
  if (headerStyle === "gemini-cli") {
    let transformedModel = requestedModel.replace(/^antigravity-/i, "").replace(/-(minimal|low|medium|high)$/i, "");
    const hasPreviewSuffix = /-preview($|-)/i.test(transformedModel);
    const usesBareName = GEMINI_DOTTED_MINOR_REGEX.test(transformedModel);
    if (usesBareName && /-preview$/i.test(transformedModel)) {
      transformedModel = transformedModel.replace(/-preview$/i, "");
    } else if (!hasPreviewSuffix && !usesBareName) {
      transformedModel = `${transformedModel}-preview`;
    }
    return {
      ...resolveModelWithTier(transformedModel),
      quotaPreference: "gemini-cli"
    };
  }
  return resolveModelWithTier(requestedModel);
}

// src/plugin/recovery/storage.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync6, readdirSync as readdirSync2, readFileSync as readFileSync5, unlinkSync as unlinkSync4, writeFileSync as writeFileSync5 } from "node:fs";
import { join as join8 } from "node:path";

// src/plugin/recovery/constants.ts
import { join as join7 } from "node:path";
import { homedir as homedir7 } from "node:os";
function getXdgData() {
  const platform = process.platform;
  if (platform === "win32") {
    return process.env.APPDATA || join7(homedir7(), "AppData", "Roaming");
  }
  return process.env.XDG_DATA_HOME || join7(homedir7(), ".local", "share");
}
var OPENCODE_STORAGE = join7(getXdgData(), "opencode", "storage");
var MESSAGE_STORAGE = join7(OPENCODE_STORAGE, "message");
var PART_STORAGE = join7(OPENCODE_STORAGE, "part");
var THINKING_TYPES = /* @__PURE__ */ new Set(["thinking", "redacted_thinking", "reasoning"]);

// src/plugin/recovery/storage.ts
function getMessageDir(sessionID) {
  if (!existsSync5(MESSAGE_STORAGE)) return "";
  const directPath = join8(MESSAGE_STORAGE, sessionID);
  if (existsSync5(directPath)) {
    return directPath;
  }
  try {
    for (const dir of readdirSync2(MESSAGE_STORAGE)) {
      const sessionPath = join8(MESSAGE_STORAGE, dir, sessionID);
      if (existsSync5(sessionPath)) {
        return sessionPath;
      }
    }
  } catch {
  }
  return "";
}
function readMessages(sessionID) {
  const messageDir = getMessageDir(sessionID);
  if (!messageDir || !existsSync5(messageDir)) return [];
  const messages = [];
  try {
    for (const file of readdirSync2(messageDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync5(join8(messageDir, file), "utf-8");
        messages.push(JSON.parse(content));
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }
  return messages.sort((a, b) => {
    const aTime = a.time?.created ?? 0;
    const bTime = b.time?.created ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });
}
function readParts(messageID) {
  const partDir = join8(PART_STORAGE, messageID);
  if (!existsSync5(partDir)) return [];
  const parts = [];
  try {
    for (const file of readdirSync2(partDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = readFileSync5(join8(partDir, file), "utf-8");
        parts.push(JSON.parse(content));
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }
  return parts;
}
function findMessagesWithThinkingBlocks(sessionID) {
  const messages = readMessages(sessionID);
  const result = [];
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const parts = readParts(msg.id);
    const hasThinking = parts.some((p) => THINKING_TYPES.has(p.type));
    if (hasThinking) {
      result.push(msg.id);
    }
  }
  return result;
}
function findMessagesWithOrphanThinking(sessionID) {
  const messages = readMessages(sessionID);
  const result = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role !== "assistant") continue;
    const parts = readParts(msg.id);
    if (parts.length === 0) continue;
    const sortedParts = [...parts].sort((a, b) => a.id.localeCompare(b.id));
    const firstPart = sortedParts[0];
    if (!firstPart) continue;
    const firstIsThinking = THINKING_TYPES.has(firstPart.type);
    if (!firstIsThinking) {
      result.push(msg.id);
    }
  }
  return result;
}
function prependThinkingPart(sessionID, messageID) {
  const partDir = join8(PART_STORAGE, messageID);
  try {
    if (!existsSync5(partDir)) {
      mkdirSync6(partDir, { recursive: true });
    }
    const partId = "prt_0000000000_thinking";
    const part = {
      id: partId,
      sessionID,
      messageID,
      type: "thinking",
      thinking: "",
      synthetic: true
    };
    writeFileSync5(join8(partDir, `${partId}.json`), JSON.stringify(part, null, 2));
    return true;
  } catch {
    return false;
  }
}
function stripThinkingParts(messageID) {
  const partDir = join8(PART_STORAGE, messageID);
  if (!existsSync5(partDir)) return false;
  let anyRemoved = false;
  try {
    for (const file of readdirSync2(partDir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const filePath = join8(partDir, file);
        const content = readFileSync5(filePath, "utf-8");
        const part = JSON.parse(content);
        if (THINKING_TYPES.has(part.type)) {
          unlinkSync4(filePath);
          anyRemoved = true;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }
  return anyRemoved;
}
function findMessageByIndexNeedingThinking(sessionID, targetIndex) {
  const messages = readMessages(sessionID);
  if (targetIndex < 0 || targetIndex >= messages.length) return null;
  const targetMsg = messages[targetIndex];
  if (!targetMsg || targetMsg.role !== "assistant") return null;
  const parts = readParts(targetMsg.id);
  if (parts.length === 0) return null;
  const sortedParts = [...parts].sort((a, b) => a.id.localeCompare(b.id));
  const firstPart = sortedParts[0];
  if (!firstPart) return null;
  const firstIsThinking = THINKING_TYPES.has(firstPart.type);
  if (!firstIsThinking) {
    return targetMsg.id;
  }
  return null;
}

// src/plugin/recovery.ts
var RECOVERY_RESUME_TEXT = "[session recovered - continuing previous task]";
function getErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error.toLowerCase();
  const errorObj = error;
  const paths = [
    errorObj.data,
    errorObj.error,
    errorObj,
    errorObj.data?.error
  ];
  for (const obj of paths) {
    if (obj && typeof obj === "object") {
      const msg = obj.message;
      if (typeof msg === "string" && msg.length > 0) {
        return msg.toLowerCase();
      }
    }
  }
  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return "";
  }
}
function extractMessageIndex(error) {
  const message = getErrorMessage(error);
  const match = message.match(/messages\.(\d+)/);
  if (!match || !match[1]) return null;
  return parseInt(match[1], 10);
}
function detectErrorType(error) {
  const message = getErrorMessage(error);
  const hasExpectedFoundThinkingOrder = (message.includes("expected thinking") || message.includes("expected a thinking")) && message.includes("found");
  if (message.includes("tool_use") && message.includes("tool_result")) {
    return "tool_result_missing";
  }
  if (message.includes("thinking") && (message.includes("first block") || message.includes("must start with") || message.includes("preceeding") || message.includes("preceding") || hasExpectedFoundThinkingOrder)) {
    return "thinking_block_order";
  }
  if (message.includes("thinking is disabled") && message.includes("cannot contain")) {
    return "thinking_disabled_violation";
  }
  return null;
}
function isRecoverableError(error) {
  return detectErrorType(error) !== null;
}
function extractToolUseIds(parts) {
  return parts.filter((p) => p.type === "tool_use" && !!p.id).map((p) => p.id);
}
async function recoverToolResultMissing(client2, sessionID, failedMsg) {
  let parts = failedMsg.parts || [];
  if (parts.length === 0 && failedMsg.info?.id) {
    const storedParts = readParts(failedMsg.info.id);
    parts = storedParts.map((p) => ({
      type: p.type === "tool" ? "tool_use" : p.type,
      id: "callID" in p ? p.callID : p.id,
      name: "tool" in p ? p.tool : void 0,
      input: "state" in p ? p.state?.input : void 0
    }));
  }
  const toolUseIds = extractToolUseIds(parts);
  if (toolUseIds.length === 0) {
    return false;
  }
  const toolResultParts = toolUseIds.map((id) => ({
    type: "tool_result",
    tool_use_id: id,
    content: "Operation cancelled by user (ESC pressed)"
  }));
  try {
    await client2.session.prompt({
      path: { id: sessionID },
      // @ts-expect-error - SDK types may not include tool_result parts
      body: { parts: toolResultParts }
    });
    return true;
  } catch {
    return false;
  }
}
async function recoverThinkingBlockOrder(sessionID, _failedMsg, error) {
  const targetIndex = extractMessageIndex(error);
  if (targetIndex !== null) {
    const targetMessageID = findMessageByIndexNeedingThinking(sessionID, targetIndex);
    if (targetMessageID) {
      return prependThinkingPart(sessionID, targetMessageID);
    }
  }
  const orphanMessages = findMessagesWithOrphanThinking(sessionID);
  if (orphanMessages.length === 0) {
    return false;
  }
  let anySuccess = false;
  for (const messageID of orphanMessages) {
    if (prependThinkingPart(sessionID, messageID)) {
      anySuccess = true;
    }
  }
  return anySuccess;
}
async function recoverThinkingDisabledViolation(sessionID, _failedMsg) {
  const messagesWithThinking = findMessagesWithThinkingBlocks(sessionID);
  if (messagesWithThinking.length === 0) {
    return false;
  }
  let anySuccess = false;
  for (const messageID of messagesWithThinking) {
    if (stripThinkingParts(messageID)) {
      anySuccess = true;
    }
  }
  return anySuccess;
}
function findLastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.info?.role === "user") {
      return messages[i];
    }
  }
  return void 0;
}
function extractResumeConfig(userMessage, sessionID) {
  return {
    sessionID,
    agent: userMessage?.info?.agent,
    model: userMessage?.info?.model
  };
}
async function resumeSession(client2, config, directory) {
  try {
    await client2.session.prompt({
      path: { id: config.sessionID },
      body: {
        parts: [{ type: "text", text: RECOVERY_RESUME_TEXT }],
        agent: config.agent,
        model: config.model
      },
      query: { directory }
    });
    return true;
  } catch {
    return false;
  }
}
var TOAST_TITLES = {
  tool_result_missing: "Tool Crash Recovery",
  thinking_block_order: "Thinking Block Recovery",
  thinking_disabled_violation: "Thinking Strip Recovery"
};
var TOAST_MESSAGES = {
  tool_result_missing: "Injecting cancelled tool results...",
  thinking_block_order: "Fixing message structure...",
  thinking_disabled_violation: "Stripping thinking blocks..."
};
function getRecoveryToastContent(errorType) {
  if (!errorType) {
    return {
      title: "Session Recovery",
      message: "Attempting to recover session..."
    };
  }
  return {
    title: TOAST_TITLES[errorType] || "Session Recovery",
    message: TOAST_MESSAGES[errorType] || "Attempting to recover session..."
  };
}
function getRecoverySuccessToast() {
  return {
    title: "Session Recovered",
    message: "Continuing where you left off..."
  };
}
function createSessionRecoveryHook(ctx, config) {
  if (!config.session_recovery) {
    return null;
  }
  const { client: client2, directory } = ctx;
  const processingErrors = /* @__PURE__ */ new Set();
  const handleSessionRecovery = async (info) => {
    if (!info || info.role !== "assistant" || !info.error) return false;
    const errorType = detectErrorType(info.error);
    if (!errorType) return false;
    const sessionID = info.sessionID;
    if (!sessionID) return false;
    let assistantMsgID = info.id;
    let msgs;
    const log13 = createLogger("session-recovery");
    log13.debug("Recovery attempt started", {
      errorType,
      sessionID,
      providedMsgID: assistantMsgID ?? "none"
    });
    await client2.session.abort({ path: { id: sessionID } }).catch(() => {
    });
    try {
      const messagesResp = await client2.session.messages({
        path: { id: sessionID },
        query: { directory }
      });
      msgs = messagesResp.data;
    } catch (err) {
      log13.error("Failed to fetch session messages during recovery", {
        sessionID,
        error: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
    if (!assistantMsgID && msgs && msgs.length > 0) {
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m && m.info?.role === "assistant" && m.info?.id) {
          assistantMsgID = m.info.id;
          log13.debug("Found assistant message ID from session messages", {
            msgID: assistantMsgID,
            msgIndex: i
          });
          break;
        }
      }
    }
    if (!assistantMsgID) {
      log13.debug("No assistant message ID found, cannot recover");
      return false;
    }
    if (processingErrors.has(assistantMsgID)) return false;
    processingErrors.add(assistantMsgID);
    try {
      const failedMsg = msgs?.find((m) => m.info?.id === assistantMsgID);
      if (!failedMsg) {
        return false;
      }
      const toastContent = getRecoveryToastContent(errorType);
      logToast(`${toastContent.title}: ${toastContent.message}`, "warning");
      await client2.tui.showToast({
        body: {
          title: toastContent.title,
          message: toastContent.message,
          variant: "warning"
        }
      }).catch(() => {
      });
      let success = false;
      if (errorType === "tool_result_missing") {
        success = await recoverToolResultMissing(client2, sessionID, failedMsg);
      } else if (errorType === "thinking_block_order") {
        success = await recoverThinkingBlockOrder(sessionID, failedMsg, info.error);
        if (success && config.auto_resume) {
          const lastUser = findLastUserMessage(msgs ?? []);
          const resumeConfig = extractResumeConfig(lastUser, sessionID);
          await resumeSession(client2, resumeConfig, directory);
        }
      } else if (errorType === "thinking_disabled_violation") {
        success = await recoverThinkingDisabledViolation(sessionID, failedMsg);
        if (success && config.auto_resume) {
          const lastUser = findLastUserMessage(msgs ?? []);
          const resumeConfig = extractResumeConfig(lastUser, sessionID);
          await resumeSession(client2, resumeConfig, directory);
        }
      }
      return success;
    } catch (err) {
      log13.error("Recovery failed", { error: String(err) });
      return false;
    } finally {
      processingErrors.delete(assistantMsgID);
    }
  };
  return {
    handleSessionRecovery,
    isRecoverableError
  };
}

// src/plugin/fingerprint.ts
import * as crypto from "node:crypto";
var OS_VERSIONS = {
  darwin: ["10.15.7", "11.6.8", "12.6.3", "13.5.2", "14.2.1", "14.5"],
  win32: ["10.0.19041", "10.0.19042", "10.0.19043", "10.0.22000", "10.0.22621", "10.0.22631"],
  linux: ["5.15.0", "5.19.0", "6.1.0", "6.2.0", "6.5.0", "6.6.0"]
};
var ARCHITECTURES = ["x64", "arm64"];
var IDE_TYPES = [
  "ANTIGRAVITY"
];
var SDK_CLIENTS = [
  "google-cloud-sdk vscode_cloudshelleditor/0.1",
  "google-cloud-sdk vscode/1.86.0",
  "google-cloud-sdk vscode/1.87.0",
  "google-cloud-sdk vscode/1.96.0"
];
var MAX_FINGERPRINT_HISTORY = 5;
var PLATFORM_CHOICES = ["darwin", "win32"];
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function platformToDisplayName(platform) {
  return platform === "win32" ? "WINDOWS" : "MACOS";
}
function generateDeviceId() {
  return crypto.randomUUID();
}
function generateSessionToken() {
  return crypto.randomBytes(16).toString("hex");
}
function generateFingerprint() {
  const platform = randomFrom(PLATFORM_CHOICES);
  const arch = randomFrom(ARCHITECTURES);
  const osVersion = randomFrom(OS_VERSIONS[platform] ?? OS_VERSIONS.darwin);
  return {
    deviceId: generateDeviceId(),
    sessionToken: generateSessionToken(),
    userAgent: `antigravity/${getAntigravityVersion()} ${platform}/${arch}`,
    apiClient: randomFrom(SDK_CLIENTS),
    clientMetadata: {
      ideType: randomFrom(IDE_TYPES),
      platform: platformToDisplayName(platform),
      pluginType: "GEMINI"
    },
    createdAt: Date.now()
  };
}
function updateFingerprintVersion(fingerprint) {
  const currentVersion = getAntigravityVersion();
  const versionPattern = /^(antigravity\/)([\d.]+)/;
  const match = fingerprint.userAgent.match(versionPattern);
  if (!match || match[2] === currentVersion) {
    return false;
  }
  fingerprint.userAgent = fingerprint.userAgent.replace(versionPattern, `$1${currentVersion}`);
  return true;
}

// src/plugin/request.ts
var log7 = createLogger("request");
var PLUGIN_SESSION_ID = `-${crypto2.randomUUID()}`;
var MAX_DEDUP_SESSIONS = 50;
var sessionDisplayedThinkingHashes = /* @__PURE__ */ new Map();
function getDisplayedThinkingHashes(sessionId) {
  if (!sessionId) {
    return void 0;
  }
  let hashes = sessionDisplayedThinkingHashes.get(sessionId);
  if (!hashes) {
    hashes = /* @__PURE__ */ new Set();
    sessionDisplayedThinkingHashes.set(sessionId, hashes);
    if (sessionDisplayedThinkingHashes.size > MAX_DEDUP_SESSIONS) {
      const oldestKey = sessionDisplayedThinkingHashes.keys().next().value;
      if (oldestKey !== void 0) {
        sessionDisplayedThinkingHashes.delete(oldestKey);
      }
    }
  }
  return hashes;
}
function buildSignatureSessionKey(sessionId, model, conversationKey, projectKey) {
  const modelKey = typeof model === "string" && model.trim() ? model.toLowerCase() : "unknown";
  const projectPart = typeof projectKey === "string" && projectKey.trim() ? projectKey.trim() : "default";
  const conversationPart = typeof conversationKey === "string" && conversationKey.trim() ? conversationKey.trim() : "default";
  return `${sessionId}:${modelKey}:${projectPart}:${conversationPart}`;
}
function shouldCacheThinkingSignatures(model) {
  if (typeof model !== "string") return false;
  const lower = model.toLowerCase();
  return lower.includes("claude") || lower.includes("gemini-3");
}
function signatureCacheProjectKey(model, projectKey) {
  if (typeof model === "string" && model.toLowerCase().includes("gemini-3")) {
    return void 0;
  }
  return projectKey;
}
function hashConversationSeed(seed) {
  return crypto2.createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 16);
}
function extractTextFromContent(content) {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const anyBlock = block;
    if (typeof anyBlock.text === "string") {
      return anyBlock.text;
    }
    if (anyBlock.text && typeof anyBlock.text === "object" && typeof anyBlock.text.text === "string") {
      return anyBlock.text.text;
    }
  }
  return "";
}
function extractConversationSeedFromMessages(messages) {
  const system = messages.find((message) => message?.role === "system");
  const users = messages.filter((message) => message?.role === "user");
  const firstUser = users[0];
  const lastUser = users.length > 0 ? users[users.length - 1] : void 0;
  const systemText = system ? extractTextFromContent(system.content) : "";
  const userText = firstUser ? extractTextFromContent(firstUser.content) : "";
  const fallbackUserText = !userText && lastUser ? extractTextFromContent(lastUser.content) : "";
  return [systemText, userText || fallbackUserText].filter(Boolean).join("|");
}
function extractConversationSeedFromContents(contents) {
  const users = contents.filter((content) => content?.role === "user");
  const firstUser = users[0];
  const lastUser = users.length > 0 ? users[users.length - 1] : void 0;
  const primaryUser = firstUser && Array.isArray(firstUser.parts) ? extractTextFromContent(firstUser.parts) : "";
  if (primaryUser) {
    return primaryUser;
  }
  if (lastUser && Array.isArray(lastUser.parts)) {
    return extractTextFromContent(lastUser.parts);
  }
  return "";
}
function resolveConversationKey(requestPayload) {
  const anyPayload = requestPayload;
  const candidates = [
    anyPayload.conversationId,
    anyPayload.conversation_id,
    anyPayload.thread_id,
    anyPayload.threadId,
    anyPayload.chat_id,
    anyPayload.chatId,
    anyPayload.sessionId,
    anyPayload.session_id,
    anyPayload.metadata?.conversation_id,
    anyPayload.metadata?.conversationId,
    anyPayload.metadata?.thread_id,
    anyPayload.metadata?.threadId
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  const systemSeed = extractTextFromContent(
    anyPayload.systemInstruction?.parts ?? anyPayload.systemInstruction ?? anyPayload.system ?? anyPayload.system_instruction
  );
  const messageSeed = Array.isArray(anyPayload.messages) ? extractConversationSeedFromMessages(anyPayload.messages) : Array.isArray(anyPayload.contents) ? extractConversationSeedFromContents(anyPayload.contents) : "";
  const seed = [systemSeed, messageSeed].filter(Boolean).join("|");
  if (!seed) {
    return void 0;
  }
  return `seed-${hashConversationSeed(seed)}`;
}
function resolveConversationKeyFromRequests(requestObjects) {
  for (const req of requestObjects) {
    const key = resolveConversationKey(req);
    if (key) {
      return key;
    }
  }
  return void 0;
}
function resolveProjectKey(candidate, fallback) {
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }
  if (typeof fallback === "string" && fallback.trim()) {
    return fallback.trim();
  }
  return void 0;
}
function formatDebugLinesForThinking(lines) {
  const cleaned = lines.map((line) => line.trim()).filter((line) => line.length > 0).slice(-50);
  const prelude = `[ThinkingResolution] source=debug_tui lines=${cleaned.length}`;
  return `${DEBUG_MESSAGE_PREFIX}
- ${prelude}
${cleaned.map((line) => `- ${line}`).join("\n")}`;
}
function injectDebugThinking(response, debugText) {
  if (!response || typeof response !== "object") {
    return response;
  }
  const resp = response;
  if (Array.isArray(resp.candidates) && resp.candidates.length > 0) {
    const candidates = resp.candidates.slice();
    const first = candidates[0];
    if (first && typeof first === "object" && first.content && typeof first.content === "object" && Array.isArray(first.content.parts)) {
      const parts = [
        { thought: true, text: debugText },
        ...first.content.parts
      ];
      candidates[0] = { ...first, content: { ...first.content, parts } };
      return { ...resp, candidates };
    }
    return resp;
  }
  if (Array.isArray(resp.content)) {
    const content = [
      { type: "thinking", thinking: debugText },
      ...resp.content
    ];
    return { ...resp, content };
  }
  if (!resp.reasoning_content) {
    return { ...resp, reasoning_content: debugText };
  }
  return resp;
}
var SYNTHETIC_THINKING_PLACEHOLDER = "[Thinking preserved]\n";
function stripInjectedDebugFromParts(parts) {
  if (!Array.isArray(parts)) {
    return parts;
  }
  return parts.filter((part) => {
    if (!part || typeof part !== "object") {
      return true;
    }
    const record = part;
    const text = typeof record.text === "string" ? record.text : typeof record.thinking === "string" ? record.thinking : void 0;
    if (text && (text.startsWith(DEBUG_MESSAGE_PREFIX) || text.startsWith(SYNTHETIC_THINKING_PLACEHOLDER.trim()))) {
      return false;
    }
    return true;
  });
}
function stripInjectedDebugFromRequestPayload(payload) {
  const anyPayload = payload;
  if (Array.isArray(anyPayload.contents)) {
    anyPayload.contents = anyPayload.contents.map((content) => {
      if (!content || typeof content !== "object") {
        return content;
      }
      if (Array.isArray(content.parts)) {
        return {
          ...content,
          parts: stripInjectedDebugFromParts(content.parts)
        };
      }
      if (Array.isArray(content.content)) {
        return {
          ...content,
          content: stripInjectedDebugFromParts(content.content)
        };
      }
      return content;
    });
  }
  if (Array.isArray(anyPayload.messages)) {
    anyPayload.messages = anyPayload.messages.map((message) => {
      if (!message || typeof message !== "object") {
        return message;
      }
      if (Array.isArray(message.content)) {
        return {
          ...message,
          content: stripInjectedDebugFromParts(message.content)
        };
      }
      return message;
    });
  }
}
function isValidRequestPart(part) {
  if (!part || typeof part !== "object") {
    return false;
  }
  const record = part;
  return Object.prototype.hasOwnProperty.call(record, "text") || Object.prototype.hasOwnProperty.call(record, "functionCall") || Object.prototype.hasOwnProperty.call(record, "functionResponse") || Object.prototype.hasOwnProperty.call(record, "inlineData") || Object.prototype.hasOwnProperty.call(record, "fileData") || Object.prototype.hasOwnProperty.call(record, "executableCode") || Object.prototype.hasOwnProperty.call(record, "codeExecutionResult") || Object.prototype.hasOwnProperty.call(record, "thought");
}
function sanitizeRequestPayloadForAntigravity(payload, restore) {
  const anyPayload = payload;
  if (Array.isArray(anyPayload.contents)) {
    anyPayload.contents = anyPayload.contents.map((content) => {
      if (!content || typeof content !== "object") {
        return null;
      }
      const contentRecord = content;
      const rawParts = Array.isArray(contentRecord.parts) ? contentRecord.parts : [];
      let foundFirstFunctionCall = false;
      let restoredThoughtSignature;
      if (restore?.sessionKey) {
        for (const candidatePart of rawParts) {
          if (!candidatePart || typeof candidatePart !== "object" || candidatePart.thought !== true) {
            continue;
          }
          const thoughtText = getThinkingText(candidatePart);
          if (!thoughtText) {
            continue;
          }
          const cached = restore.getSignature(
            restore.sessionKey,
            thoughtText
          );
          if (cached && cached.length >= MIN_SIGNATURE_LENGTH && cached !== SKIP_THOUGHT_SIGNATURE) {
            restoredThoughtSignature = cached;
            break;
          }
        }
      }
      const sanitizedParts = rawParts.filter(isValidRequestPart).map((part) => {
        if (part && typeof part === "object" && part.functionCall) {
          let sig = part.thoughtSignature || part.thought_signature;
          if (!foundFirstFunctionCall) {
            foundFirstFunctionCall = true;
            if (!sig || sig.length < MIN_SIGNATURE_LENGTH) {
              sig = restoredThoughtSignature ?? SKIP_THOUGHT_SIGNATURE;
            }
          } else {
            sig = void 0;
          }
          if (sig) {
            return {
              ...part,
              thought_signature: sig,
              thoughtSignature: sig
            };
          }
          const newPart = { ...part };
          delete newPart.thoughtSignature;
          delete newPart.thought_signature;
          return newPart;
        }
        return part;
      });
      if (sanitizedParts.length === 0) {
        return null;
      }
      return {
        ...contentRecord,
        parts: sanitizedParts
      };
    }).filter(
      (content) => content !== null
    );
  }
  const systemInstruction = anyPayload.systemInstruction;
  if (systemInstruction && typeof systemInstruction === "object" && !Array.isArray(systemInstruction)) {
    const sys = systemInstruction;
    if (Array.isArray(sys.parts)) {
      const sanitizedSystemParts = sys.parts.filter(isValidRequestPart);
      if (sanitizedSystemParts.length > 0) {
        sys.parts = sanitizedSystemParts;
      } else {
        delete anyPayload.systemInstruction;
      }
    }
  }
}
function isGeminiToolUsePart(part) {
  return !!(part && typeof part === "object" && (part.functionCall || part.tool_use || part.toolUse));
}
function isGeminiThinkingPart(part) {
  return !!(part && typeof part === "object" && (part.thought === true || part.type === "thinking" || part.type === "reasoning"));
}
function hasCachedMatchingSignature(part, sessionId) {
  if (!part || typeof part !== "object") {
    return false;
  }
  const text = getThinkingText(part);
  if (!text) {
    return false;
  }
  const expectedSignature = getCachedSignature(sessionId, text);
  if (!expectedSignature) {
    return false;
  }
  if (part.thought === true) {
    return part.thoughtSignature === expectedSignature;
  }
  return part.signature === expectedSignature;
}
function ensureThoughtSignature(part, sessionId) {
  if (!part || typeof part !== "object") {
    return part;
  }
  if (!sessionId) {
    return part;
  }
  const text = getThinkingText(part);
  if (!text) {
    return part;
  }
  if (part.thought === true) {
    return { ...part, thoughtSignature: SKIP_THOUGHT_SIGNATURE };
  }
  if (part.type === "thinking" || part.type === "reasoning" || part.type === "redacted_thinking") {
    return { ...part, signature: SKIP_THOUGHT_SIGNATURE };
  }
  return part;
}
function hasSignedThinkingPart(part, sessionId) {
  if (!part || typeof part !== "object") {
    return false;
  }
  if (part.thought === true) {
    if (part.thoughtSignature === SKIP_THOUGHT_SIGNATURE) {
      return true;
    }
    if (typeof part.thoughtSignature !== "string" || part.thoughtSignature.length < MIN_SIGNATURE_LENGTH) {
      return false;
    }
    if (!sessionId) {
      return true;
    }
    return hasCachedMatchingSignature(part, sessionId);
  }
  if (part.type === "thinking" || part.type === "reasoning" || part.type === "redacted_thinking") {
    if (part.signature === SKIP_THOUGHT_SIGNATURE) {
      return true;
    }
    if (typeof part.signature !== "string" || part.signature.length < MIN_SIGNATURE_LENGTH) {
      return false;
    }
    if (!sessionId) {
      return true;
    }
    return hasCachedMatchingSignature(part, sessionId);
  }
  return false;
}
function ensureThinkingBeforeToolUseInContents(contents, signatureSessionKey) {
  return contents.map((content) => {
    if (!content || typeof content !== "object" || !Array.isArray(content.parts)) {
      return content;
    }
    const role = content.role;
    if (role !== "model" && role !== "assistant") {
      return content;
    }
    const parts = content.parts;
    const hasToolUse = parts.some(isGeminiToolUsePart);
    if (!hasToolUse) {
      return content;
    }
    const thinkingParts = parts.filter(isGeminiThinkingPart).map((p) => ensureThoughtSignature(p, signatureSessionKey));
    const otherParts = parts.filter((p) => !isGeminiThinkingPart(p));
    const hasSignedThinking = thinkingParts.some(
      (part) => hasSignedThinkingPart(part, signatureSessionKey)
    );
    if (hasSignedThinking) {
      return { ...content, parts: [...thinkingParts, ...otherParts] };
    }
    const lastThinking = defaultSignatureStore.get(signatureSessionKey);
    if (!lastThinking) {
      log7.debug(
        "Stripping thinking from tool_use content (no valid cached signature)",
        { signatureSessionKey }
      );
      return { ...content, parts: otherParts };
    }
    const injected = {
      thought: true,
      text: lastThinking.text,
      thoughtSignature: SKIP_THOUGHT_SIGNATURE
    };
    return { ...content, parts: [injected, ...otherParts] };
  });
}
function ensureMessageThinkingSignature(block, sessionId) {
  if (!block || typeof block !== "object") {
    return block;
  }
  if (block.type !== "thinking" && block.type !== "redacted_thinking") {
    return block;
  }
  const text = getThinkingText(block);
  if (!text) {
    return block;
  }
  if (!sessionId) {
    return block;
  }
  return { ...block, signature: SKIP_THOUGHT_SIGNATURE };
}
function hasToolUseInContents(contents) {
  return contents.some((content) => {
    if (!content || typeof content !== "object" || !Array.isArray(content.parts)) {
      return false;
    }
    return content.parts.some(isGeminiToolUsePart);
  });
}
function hasSignedThinkingInContents(contents, sessionId) {
  return contents.some((content) => {
    if (!content || typeof content !== "object" || !Array.isArray(content.parts)) {
      return false;
    }
    return content.parts.some(
      (part) => hasSignedThinkingPart(part, sessionId)
    );
  });
}
function hasToolUseInMessages(messages) {
  return messages.some((message) => {
    if (!message || typeof message !== "object" || !Array.isArray(message.content)) {
      return false;
    }
    return message.content.some(
      (block) => block && typeof block === "object" && (block.type === "tool_use" || block.type === "tool_result")
    );
  });
}
function hasSignedThinkingInMessages(messages, sessionId) {
  return messages.some((message) => {
    if (!message || typeof message !== "object" || !Array.isArray(message.content)) {
      return false;
    }
    return message.content.some(
      (block) => hasSignedThinkingPart(block, sessionId)
    );
  });
}
function ensureThinkingBeforeToolUseInMessages(messages, signatureSessionKey) {
  return messages.map((message) => {
    if (!message || typeof message !== "object" || !Array.isArray(message.content)) {
      return message;
    }
    if (message.role !== "assistant") {
      return message;
    }
    const blocks = message.content;
    const hasToolUse = blocks.some(
      (b) => b && typeof b === "object" && (b.type === "tool_use" || b.type === "tool_result")
    );
    if (!hasToolUse) {
      return message;
    }
    const thinkingBlocks = blocks.filter(
      (b) => b && typeof b === "object" && (b.type === "thinking" || b.type === "redacted_thinking")
    ).map((b) => ensureMessageThinkingSignature(b, signatureSessionKey));
    const otherBlocks = blocks.filter(
      (b) => !(b && typeof b === "object" && (b.type === "thinking" || b.type === "redacted_thinking"))
    );
    const hasSignedThinking = thinkingBlocks.some(
      (block) => hasSignedThinkingPart(block, signatureSessionKey)
    );
    if (hasSignedThinking) {
      return { ...message, content: [...thinkingBlocks, ...otherBlocks] };
    }
    const lastThinking = defaultSignatureStore.get(signatureSessionKey);
    if (!lastThinking) {
      const existingThinking = thinkingBlocks[0];
      const thinkingText = existingThinking?.thinking || existingThinking?.text || "";
      log7.debug("Injecting sentinel signature (cache miss)", {
        signatureSessionKey
      });
      const sentinelBlock = {
        type: "thinking",
        thinking: thinkingText,
        signature: SKIP_THOUGHT_SIGNATURE
      };
      return { ...message, content: [sentinelBlock, ...otherBlocks] };
    }
    const injected = {
      type: "thinking",
      thinking: lastThinking.text,
      signature: SKIP_THOUGHT_SIGNATURE
    };
    return { ...message, content: [injected, ...otherBlocks] };
  });
}
function applyClaudeThinkingSanitization(target, opts) {
  const {
    effectiveModel,
    signatureSessionKey,
    isClaudeThinking,
    keepThinkingEnabled,
    enableClaudePromptAutoCaching
  } = opts;
  sanitizeCrossModelPayloadInPlace(target, { targetModel: effectiveModel });
  deepFilterThinkingBlocks(
    target,
    signatureSessionKey,
    getCachedSignature,
    true
  );
  if (enableClaudePromptAutoCaching && target.cache_control === void 0) {
    target.cache_control = { type: "ephemeral" };
  }
  if (isClaudeThinking && keepThinkingEnabled && Array.isArray(target.contents)) {
    target.contents = ensureThinkingBeforeToolUseInContents(
      target.contents,
      signatureSessionKey
    );
  }
  if (isClaudeThinking && keepThinkingEnabled && Array.isArray(target.messages)) {
    target.messages = ensureThinkingBeforeToolUseInMessages(
      target.messages,
      signatureSessionKey
    );
  }
}
function generateSyntheticProjectId() {
  const adjectives = ["useful", "bright", "swift", "calm", "bold"];
  const nouns = ["fuze", "wave", "spark", "flow", "core"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomPart = crypto2.randomUUID().slice(0, 5).toLowerCase();
  return `${adj}-${noun}-${randomPart}`;
}
function ensureDefaultGemini3ThinkingLevel(requestPayload, effectiveModel, thinkingLevel) {
  if (!effectiveModel.toLowerCase().includes("gemini-3") || isImageGenerationModel(effectiveModel)) {
    return;
  }
  const generationConfig = requestPayload.generationConfig && typeof requestPayload.generationConfig === "object" ? requestPayload.generationConfig : {};
  const thinkingConfig = generationConfig.thinkingConfig && typeof generationConfig.thinkingConfig === "object" ? generationConfig.thinkingConfig : {};
  if (typeof thinkingConfig.thinkingLevel !== "string") {
    thinkingConfig.thinkingLevel = thinkingLevel ?? getDefaultGemini3ThinkingLevel(effectiveModel);
  }
  if (typeof thinkingConfig.includeThoughts !== "boolean") {
    thinkingConfig.includeThoughts = true;
  }
  generationConfig.thinkingConfig = thinkingConfig;
  requestPayload.generationConfig = generationConfig;
}
var STREAM_ACTION = "streamGenerateContent";
function mergeRequestHeaders(requestHeaders, initHeaders) {
  if (!requestHeaders && !initHeaders) return void 0;
  const headers = new Headers(requestHeaders);
  if (initHeaders) {
    new Headers(initHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}
function initFromRequest(request, init, body) {
  if (!request) return { ...init };
  const merged = {
    method: request.method,
    body: body ?? request.body,
    signal: request.signal,
    redirect: request.redirect,
    credentials: request.credentials,
    cache: request.cache,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    mode: request.mode,
    integrity: request.integrity,
    keepalive: request.keepalive,
    ...init,
    headers: mergeRequestHeaders(request.headers, init?.headers)
  };
  if (merged.body instanceof ReadableStream && merged.duplex === void 0) {
    merged.duplex = "half";
  }
  return merged;
}
function isGenerativeLanguageRequest(input3) {
  try {
    return new URL(requestInfoUrl(input3)).hostname === "generativelanguage.googleapis.com";
  } catch {
    return false;
  }
}
function requestInfoUrl(input3) {
  if (typeof input3 === "string") return input3;
  return input3.url || input3.toString();
}
function prepareAntigravityRequest(input3, init, accessToken, projectId, endpointOverride, headerStyle = "antigravity", forceThinkingRecovery = false, options) {
  if (typeof input3 !== "string" && init?.body === void 0 && input3.body) {
    const requestInput2 = input3;
    return requestInput2.clone().text().then(
      (body2) => prepareAntigravityRequest(
        requestInput2.url,
        initFromRequest(requestInput2, init, body2),
        accessToken,
        projectId,
        endpointOverride,
        headerStyle,
        forceThinkingRecovery,
        options
      )
    ).catch(
      () => prepareAntigravityRequest(
        requestInput2.url,
        initFromRequest(requestInput2, init),
        accessToken,
        projectId,
        endpointOverride,
        headerStyle,
        forceThinkingRecovery,
        options
      )
    );
  }
  const requestUrl = requestInfoUrl(input3);
  const requestInput = typeof input3 === "string" ? void 0 : input3;
  const baseInit = initFromRequest(requestInput, init);
  const headers = new Headers(baseInit.headers);
  let resolvedProjectId = projectId?.trim() || "";
  let toolDebugMissing = 0;
  const toolDebugSummaries = [];
  let toolDebugTools;
  let toolDebugPayloadCache;
  let toolDebugPayloadComputed = false;
  let sessionId;
  let needsSignedThinkingWarmup = false;
  let thinkingRecoveryMessage;
  if (!isGenerativeLanguageRequest(input3)) {
    return {
      request: input3,
      init: { ...baseInit, headers },
      streaming: false,
      headerStyle
    };
  }
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.delete("x-api-key");
  headers.delete("x-goog-api-key");
  headers.delete("x-goog-user-project");
  const match = requestUrl.match(/\/models\/([^:]+):(\w+)/);
  if (!match) {
    return {
      request: input3,
      init: { ...baseInit, headers },
      streaming: false,
      headerStyle
    };
  }
  const [, rawModel = "", rawAction = ""] = match;
  const requestedModel = rawModel;
  const resolved = resolveModelForHeaderStyle(rawModel, headerStyle);
  let effectiveModel = resolved.actualModel;
  const streaming = rawAction === STREAM_ACTION;
  const defaultEndpoint = headerStyle === "gemini-cli" ? GEMINI_CLI_ENDPOINT : ANTIGRAVITY_ENDPOINT;
  const baseEndpoint = endpointOverride ?? defaultEndpoint;
  const transformedUrl = `${baseEndpoint}/v1internal:${rawAction}${streaming ? "?alt=sse" : ""}`;
  const isClaude = isClaudeModel(resolved.actualModel);
  const isClaudeThinking = isClaudeThinkingModel(resolved.actualModel);
  const keepThinkingEnabled = getKeepThinking();
  const enableClaudePromptAutoCaching = options?.claudePromptAutoCaching ?? false;
  let tierThinkingBudget = resolved.thinkingBudget;
  let tierThinkingLevel = resolved.thinkingLevel;
  let signatureSessionKey = buildSignatureSessionKey(
    PLUGIN_SESSION_ID,
    effectiveModel,
    void 0,
    signatureCacheProjectKey(effectiveModel, resolveProjectKey(projectId))
  );
  let body = baseInit.body;
  if (typeof baseInit.body === "string" && baseInit.body) {
    try {
      const parsedBody = JSON.parse(baseInit.body);
      const isWrapped = typeof parsedBody.project === "string" && "request" in parsedBody;
      if (isWrapped) {
        const wrappedBody = {
          ...parsedBody,
          model: effectiveModel
        };
        const requestRoot = wrappedBody.request;
        const requestObjects = [];
        if (requestRoot && typeof requestRoot === "object") {
          requestObjects.push(requestRoot);
          const nested = requestRoot.request;
          if (nested && typeof nested === "object") {
            requestObjects.push(nested);
          }
        }
        if (effectiveModel.toLowerCase().includes("gemini-3")) {
          for (const req of requestObjects) {
            const variantConfig = extractVariantThinkingConfig(
              req.providerOptions,
              req.generationConfig
            );
            if (variantConfig?.thinkingLevel) {
              tierThinkingLevel = variantConfig.thinkingLevel;
              tierThinkingBudget = void 0;
              break;
            }
            if (typeof variantConfig?.thinkingBudget === "number") {
              tierThinkingLevel = variantConfig.thinkingBudget <= 8192 ? "low" : variantConfig.thinkingBudget <= 16384 ? "medium" : "high";
              tierThinkingBudget = void 0;
              break;
            }
          }
        }
        if (headerStyle === "antigravity") {
          const gemini38FlashBackendModel = resolveAntigravityGemini38FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          const gemini37FlashBackendModel = resolveAntigravityGemini37FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          const gemini36FlashBackendModel = resolveAntigravityGemini36FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          const gemini35FlashBackendModel = resolveAntigravityGemini35FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          if (gemini38FlashBackendModel) {
            effectiveModel = gemini38FlashBackendModel;
            wrappedBody.model = gemini38FlashBackendModel;
          } else if (gemini37FlashBackendModel) {
            effectiveModel = gemini37FlashBackendModel;
            wrappedBody.model = gemini37FlashBackendModel;
          } else if (gemini36FlashBackendModel) {
            effectiveModel = gemini36FlashBackendModel;
            wrappedBody.model = gemini36FlashBackendModel;
          } else if (gemini35FlashBackendModel) {
            effectiveModel = gemini35FlashBackendModel;
            wrappedBody.model = gemini35FlashBackendModel;
          } else if (isGemini3ProModel(effectiveModel) && tierThinkingLevel) {
            const basePro = effectiveModel.replace(/-(low|high)$/i, "");
            const proModel = `${basePro}-${tierThinkingLevel === "high" ? "high" : "low"}`;
            effectiveModel = proModel;
            wrappedBody.model = proModel;
          }
        }
        const conversationKey = resolveConversationKeyFromRequests(requestObjects);
        const modelForCacheKey = effectiveModel.replace(
          /-(minimal|low|medium|high)$/i,
          ""
        );
        signatureSessionKey = buildSignatureSessionKey(
          PLUGIN_SESSION_ID,
          modelForCacheKey,
          conversationKey,
          signatureCacheProjectKey(
            modelForCacheKey,
            resolveProjectKey(parsedBody.project)
          )
        );
        if (requestObjects.length > 0) {
          sessionId = signatureSessionKey;
        }
        for (const req of requestObjects) {
          req.sessionId = signatureSessionKey;
          stripInjectedDebugFromRequestPayload(req);
          sanitizeGeminiGenerationConfigForModel(
            req,
            effectiveModel
          );
          ensureDefaultGemini3ThinkingLevel(
            req,
            effectiveModel,
            tierThinkingLevel
          );
          if (isClaude) {
            applyClaudeThinkingSanitization(req, {
              effectiveModel,
              signatureSessionKey,
              isClaudeThinking,
              keepThinkingEnabled,
              enableClaudePromptAutoCaching
            });
            applyToolPairingFixes(req, true);
          }
        }
        if (isClaudeThinking && keepThinkingEnabled && sessionId) {
          const hasToolUse = requestObjects.some(
            (req) => Array.isArray(req.contents) && hasToolUseInContents(req.contents) || Array.isArray(req.messages) && hasToolUseInMessages(req.messages)
          );
          const hasSignedThinking = requestObjects.some(
            (req) => Array.isArray(req.contents) && hasSignedThinkingInContents(
              req.contents,
              signatureSessionKey
            ) || Array.isArray(req.messages) && hasSignedThinkingInMessages(
              req.messages,
              signatureSessionKey
            )
          );
          const hasCachedThinking = defaultSignatureStore.has(signatureSessionKey);
          needsSignedThinkingWarmup = hasToolUse && !hasSignedThinking && !hasCachedThinking;
        }
        body = JSON.stringify(wrappedBody);
      } else {
        const requestPayload = { ...parsedBody };
        const rawGenerationConfig = requestPayload.generationConfig;
        const extraBody = requestPayload.extra_body;
        const variantConfig = extractVariantThinkingConfig(
          requestPayload.providerOptions,
          rawGenerationConfig
        );
        const isGemini3 = effectiveModel.toLowerCase().includes("gemini-3");
        log7.debug(
          `[ThinkingResolution] rawModel=${rawModel} resolvedModel=${effectiveModel} resolvedTier=${tierThinkingLevel ?? "none"} variantLevel=${variantConfig?.thinkingLevel ?? "none"} variantBudget=${variantConfig?.thinkingBudget ?? "none"} providerOptions.google=${JSON.stringify(requestPayload.providerOptions?.google ?? null)} generationConfig.thinkingConfig=${JSON.stringify(rawGenerationConfig?.thinkingConfig ?? null)}`
        );
        if (variantConfig?.thinkingLevel && isGemini3) {
          tierThinkingLevel = variantConfig.thinkingLevel;
          tierThinkingBudget = void 0;
        } else if (variantConfig?.thinkingBudget) {
          if (isGemini3) {
            log7.warn(
              "[Deprecated] Using thinkingBudget for Gemini 3 model. Use thinkingLevel instead."
            );
            tierThinkingLevel = variantConfig.thinkingBudget <= 8192 ? "low" : variantConfig.thinkingBudget <= 16384 ? "medium" : "high";
            tierThinkingBudget = void 0;
          } else {
            tierThinkingBudget = variantConfig.thinkingBudget;
            tierThinkingLevel = void 0;
          }
        }
        if (headerStyle === "antigravity") {
          const gemini38FlashBackendModel = resolveAntigravityGemini38FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          const gemini37FlashBackendModel = resolveAntigravityGemini37FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          const gemini36FlashBackendModel = resolveAntigravityGemini36FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          const gemini35FlashBackendModel = resolveAntigravityGemini35FlashBackendModel(
            effectiveModel,
            tierThinkingLevel
          );
          if (gemini38FlashBackendModel) {
            effectiveModel = gemini38FlashBackendModel;
          } else if (gemini37FlashBackendModel) {
            effectiveModel = gemini37FlashBackendModel;
          } else if (gemini36FlashBackendModel) {
            effectiveModel = gemini36FlashBackendModel;
          } else if (gemini35FlashBackendModel) {
            effectiveModel = gemini35FlashBackendModel;
          } else if (isGemini3ProModel(effectiveModel) && tierThinkingLevel) {
            const basePro = effectiveModel.replace(/-(low|high)$/i, "");
            effectiveModel = `${basePro}-${tierThinkingLevel === "high" ? "high" : "low"}`;
          }
        }
        if (isClaude) {
          if (!requestPayload.toolConfig) {
            requestPayload.toolConfig = {};
          }
          if (typeof requestPayload.toolConfig === "object" && requestPayload.toolConfig !== null) {
            const toolConfig = requestPayload.toolConfig;
            if (!toolConfig.functionCallingConfig) {
              toolConfig.functionCallingConfig = {};
            }
            if (typeof toolConfig.functionCallingConfig === "object" && toolConfig.functionCallingConfig !== null) {
              toolConfig.functionCallingConfig.mode = "VALIDATED";
            }
          }
        }
        const isImageModel = isImageGenerationModel(effectiveModel);
        const userThinkingConfig = isImageModel ? void 0 : extractThinkingConfig(
          requestPayload,
          rawGenerationConfig,
          extraBody
        );
        const lowerEffective = effectiveModel.toLowerCase();
        const isClaudeSonnetNonThinking = lowerEffective === "claude-sonnet-4-6";
        const effectiveUserThinkingConfig = isClaudeSonnetNonThinking || isImageModel ? void 0 : userThinkingConfig;
        if (isImageModel) {
          const imageConfig = buildImageGenerationConfig();
          const generationConfig = rawGenerationConfig ?? {};
          generationConfig.imageConfig = imageConfig;
          delete generationConfig.thinkingConfig;
          if (!generationConfig.candidateCount) {
            generationConfig.candidateCount = 1;
          }
          requestPayload.generationConfig = generationConfig;
          if (!requestPayload.safetySettings) {
            requestPayload.safetySettings = [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_ONLY_HIGH"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_ONLY_HIGH"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_ONLY_HIGH"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_ONLY_HIGH"
              },
              {
                category: "HARM_CATEGORY_CIVIC_INTEGRITY",
                threshold: "BLOCK_ONLY_HIGH"
              }
            ];
          }
          delete requestPayload.tools;
          delete requestPayload.toolConfig;
          requestPayload.systemInstruction = {
            parts: [
              {
                text: "You are an AI image generator. Generate images based on user descriptions. Focus on creating high-quality, visually appealing images that match the user's request."
              }
            ]
          };
        } else {
          const finalThinkingConfig = resolveThinkingConfig(
            effectiveUserThinkingConfig,
            isClaudeSonnetNonThinking ? false : resolved.isThinkingModel ?? isThinkingCapableModel(effectiveModel)
          );
          const normalizedThinking = normalizeThinkingConfig(finalThinkingConfig);
          if (normalizedThinking) {
            const thinkingBudget = tierThinkingBudget ?? normalizedThinking.thinkingBudget;
            let thinkingConfig;
            if (isClaudeThinking) {
              thinkingConfig = {
                include_thoughts: normalizedThinking.includeThoughts ?? true,
                ...typeof thinkingBudget === "number" && thinkingBudget > 0 ? { thinking_budget: thinkingBudget } : {}
              };
            } else if (tierThinkingLevel) {
              thinkingConfig = {
                includeThoughts: normalizedThinking.includeThoughts,
                thinkingLevel: tierThinkingLevel
              };
            } else {
              thinkingConfig = {
                includeThoughts: normalizedThinking.includeThoughts,
                ...typeof thinkingBudget === "number" && thinkingBudget > 0 ? { thinkingBudget } : {}
              };
            }
            if (rawGenerationConfig) {
              rawGenerationConfig.thinkingConfig = thinkingConfig;
              if (isClaudeThinking && typeof thinkingBudget === "number" && thinkingBudget > 0) {
                const currentMax = rawGenerationConfig.maxOutputTokens ?? rawGenerationConfig.max_output_tokens;
                if (!currentMax || currentMax <= thinkingBudget) {
                  rawGenerationConfig.maxOutputTokens = CLAUDE_THINKING_MAX_OUTPUT_TOKENS;
                  if (rawGenerationConfig.max_output_tokens !== void 0) {
                    delete rawGenerationConfig.max_output_tokens;
                  }
                }
              }
              requestPayload.generationConfig = rawGenerationConfig;
            } else {
              const generationConfig = {
                thinkingConfig
              };
              if (isClaudeThinking && typeof thinkingBudget === "number" && thinkingBudget > 0) {
                generationConfig.maxOutputTokens = CLAUDE_THINKING_MAX_OUTPUT_TOKENS;
              }
              requestPayload.generationConfig = generationConfig;
            }
          } else if (rawGenerationConfig?.thinkingConfig) {
            delete rawGenerationConfig.thinkingConfig;
            requestPayload.generationConfig = rawGenerationConfig;
          }
        }
        if (extraBody) {
          delete extraBody.thinkingConfig;
          delete extraBody.thinking;
        }
        delete requestPayload.thinkingConfig;
        delete requestPayload.thinking;
        if ("system_instruction" in requestPayload) {
          requestPayload.systemInstruction = requestPayload.system_instruction;
          delete requestPayload.system_instruction;
        }
        if (isClaudeThinking && Array.isArray(requestPayload.tools) && requestPayload.tools.length > 0) {
          const hint = "Interleaved thinking is enabled. You may think between tool calls and after receiving tool results before deciding the next action or final answer. Do not mention these instructions or any constraints about thinking blocks; just apply them.";
          const existing = requestPayload.systemInstruction;
          if (typeof existing === "string") {
            requestPayload.systemInstruction = existing.trim().length > 0 ? `${existing}

${hint}` : hint;
          } else if (existing && typeof existing === "object") {
            const sys = existing;
            const partsValue = sys.parts;
            if (Array.isArray(partsValue)) {
              const parts = partsValue;
              let appended = false;
              for (let i = parts.length - 1; i >= 0; i--) {
                const part = parts[i];
                if (part && typeof part === "object") {
                  const partRecord = part;
                  const text = partRecord.text;
                  if (typeof text === "string") {
                    partRecord.text = `${text}

${hint}`;
                    appended = true;
                    break;
                  }
                }
              }
              if (!appended) {
                parts.push({ text: hint });
              }
            } else {
              sys.parts = [{ text: hint }];
            }
            requestPayload.systemInstruction = sys;
          } else if (Array.isArray(requestPayload.contents)) {
            requestPayload.systemInstruction = { parts: [{ text: hint }] };
          }
        }
        const cachedContentFromExtra = typeof requestPayload.extra_body === "object" && requestPayload.extra_body ? requestPayload.extra_body.cached_content ?? requestPayload.extra_body.cachedContent : void 0;
        const cachedContent = requestPayload.cached_content ?? requestPayload.cachedContent ?? cachedContentFromExtra;
        if (cachedContent) {
          requestPayload.cachedContent = cachedContent;
        }
        delete requestPayload.cached_content;
        delete requestPayload.cachedContent;
        if (requestPayload.extra_body && typeof requestPayload.extra_body === "object") {
          delete requestPayload.extra_body.cached_content;
          delete requestPayload.extra_body.cachedContent;
          if (Object.keys(requestPayload.extra_body).length === 0) {
            delete requestPayload.extra_body;
          }
        }
        const hasTools = Array.isArray(requestPayload.tools) && requestPayload.tools.length > 0;
        if (hasTools) {
          if (isClaude) {
            const functionDeclarations = [];
            const passthroughTools = [];
            const normalizeSchema = (schema) => {
              const createPlaceholderSchema = (base = {}) => ({
                ...base,
                type: "object",
                properties: {
                  [EMPTY_SCHEMA_PLACEHOLDER_NAME]: {
                    type: "boolean",
                    description: EMPTY_SCHEMA_PLACEHOLDER_DESCRIPTION
                  }
                },
                required: [EMPTY_SCHEMA_PLACEHOLDER_NAME]
              });
              if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
                toolDebugMissing += 1;
                return createPlaceholderSchema();
              }
              const cleaned = cleanJSONSchemaForAntigravity(schema);
              if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned)) {
                toolDebugMissing += 1;
                return createPlaceholderSchema();
              }
              const hasProperties = cleaned.properties && typeof cleaned.properties === "object" && Object.keys(cleaned.properties).length > 0;
              cleaned.type = "object";
              if (!hasProperties) {
                cleaned.properties = {
                  [EMPTY_SCHEMA_PLACEHOLDER_NAME]: {
                    type: "boolean",
                    description: EMPTY_SCHEMA_PLACEHOLDER_DESCRIPTION
                  }
                };
                cleaned.required = Array.isArray(cleaned.required) ? Array.from(
                  /* @__PURE__ */ new Set([
                    ...cleaned.required,
                    EMPTY_SCHEMA_PLACEHOLDER_NAME
                  ])
                ) : [EMPTY_SCHEMA_PLACEHOLDER_NAME];
              }
              return cleaned;
            };
            requestPayload.tools.forEach((tool2) => {
              const pushDeclaration = (decl, source) => {
                const schema = decl?.parameters || decl?.parametersJsonSchema || decl?.input_schema || decl?.inputSchema || tool2.parameters || tool2.parametersJsonSchema || tool2.input_schema || tool2.inputSchema || tool2.function?.parameters || tool2.function?.parametersJsonSchema || tool2.function?.input_schema || tool2.function?.inputSchema || tool2.custom?.parameters || tool2.custom?.parametersJsonSchema || tool2.custom?.input_schema;
                let name = decl?.name || tool2.name || tool2.function?.name || tool2.custom?.name || `tool-${functionDeclarations.length}`;
                name = String(name).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
                const description = decl?.description || tool2.description || tool2.function?.description || tool2.custom?.description || "";
                functionDeclarations.push({
                  name,
                  description: String(description || ""),
                  parameters: normalizeSchema(schema)
                });
                toolDebugSummaries.push(
                  `decl=${name},src=${source},hasSchema=${schema ? "y" : "n"}`
                );
              };
              if (Array.isArray(tool2.functionDeclarations) && tool2.functionDeclarations.length > 0) {
                tool2.functionDeclarations.forEach((decl) => {
                  pushDeclaration(decl, "functionDeclarations");
                });
                return;
              }
              if (tool2.function || tool2.custom || tool2.parameters || tool2.input_schema || tool2.inputSchema) {
                pushDeclaration(
                  tool2.function ?? tool2.custom ?? tool2,
                  "function/custom"
                );
                return;
              }
              passthroughTools.push(tool2);
            });
            const finalTools = [];
            if (functionDeclarations.length > 0) {
              finalTools.push({ functionDeclarations });
            }
            requestPayload.tools = finalTools.concat(passthroughTools);
          } else {
            const geminiResult = applyGeminiTransforms(requestPayload, {
              model: effectiveModel,
              normalizedThinking: void 0,
              // Thinking config already applied above (lines 816-880)
              tierThinkingBudget,
              tierThinkingLevel
            });
            toolDebugMissing = geminiResult.toolDebugMissing;
            toolDebugSummaries.push(...geminiResult.toolDebugSummaries);
          }
          toolDebugTools = Array.isArray(requestPayload.tools) ? requestPayload.tools : void 0;
          const enableToolHardening = options?.claudeToolHardening ?? true;
          if (enableToolHardening && isClaude && Array.isArray(requestPayload.tools) && requestPayload.tools.length > 0) {
            requestPayload.tools = injectParameterSignatures(
              requestPayload.tools,
              CLAUDE_DESCRIPTION_PROMPT
            );
            injectToolHardeningInstruction(
              requestPayload,
              CLAUDE_TOOL_SYSTEM_INSTRUCTION
            );
          }
        }
        const conversationKey = resolveConversationKey(requestPayload);
        signatureSessionKey = buildSignatureSessionKey(
          PLUGIN_SESSION_ID,
          effectiveModel,
          conversationKey,
          signatureCacheProjectKey(
            effectiveModel,
            resolveProjectKey(projectId)
          )
        );
        if (isClaude) {
          applyClaudeThinkingSanitization(requestPayload, {
            effectiveModel,
            signatureSessionKey,
            isClaudeThinking,
            keepThinkingEnabled,
            enableClaudePromptAutoCaching
          });
          if (isClaudeThinking && keepThinkingEnabled) {
            const hasToolUse = Array.isArray(requestPayload.contents) && hasToolUseInContents(requestPayload.contents) || Array.isArray(requestPayload.messages) && hasToolUseInMessages(requestPayload.messages);
            const hasSignedThinking = Array.isArray(requestPayload.contents) && hasSignedThinkingInContents(
              requestPayload.contents,
              signatureSessionKey
            ) || Array.isArray(requestPayload.messages) && hasSignedThinkingInMessages(
              requestPayload.messages,
              signatureSessionKey
            );
            const hasCachedThinking = defaultSignatureStore.has(signatureSessionKey);
            needsSignedThinkingWarmup = hasToolUse && !hasSignedThinking && !hasCachedThinking;
          }
        }
        if (isClaude && Array.isArray(requestPayload.contents)) {
          let toolCallCounter = 0;
          const pendingCallIdsByName = /* @__PURE__ */ new Map();
          requestPayload.contents = requestPayload.contents.map(
            (content) => {
              if (!content || !Array.isArray(content.parts)) {
                return content;
              }
              const newParts = content.parts.map((part) => {
                if (part && typeof part === "object" && part.functionCall) {
                  const call = { ...part.functionCall };
                  if (!call.id) {
                    call.id = `tool-call-${++toolCallCounter}`;
                  }
                  const nameKey = typeof call.name === "string" ? call.name : `tool-${toolCallCounter}`;
                  const queue = pendingCallIdsByName.get(nameKey) || [];
                  queue.push(call.id);
                  pendingCallIdsByName.set(nameKey, queue);
                  return { ...part, functionCall: call };
                }
                return part;
              });
              return { ...content, parts: newParts };
            }
          );
          requestPayload.contents = requestPayload.contents.map(
            (content) => {
              if (!content || !Array.isArray(content.parts)) {
                return content;
              }
              const newParts = content.parts.map((part) => {
                if (part && typeof part === "object" && part.functionResponse) {
                  const resp = { ...part.functionResponse };
                  if (!resp.id && typeof resp.name === "string") {
                    const queue = pendingCallIdsByName.get(resp.name);
                    if (queue && queue.length > 0) {
                      resp.id = queue.shift();
                      pendingCallIdsByName.set(resp.name, queue);
                    }
                  }
                  return { ...part, functionResponse: resp };
                }
                return part;
              });
              return { ...content, parts: newParts };
            }
          );
          requestPayload.contents = fixToolResponseGrouping(
            requestPayload.contents
          );
        }
        if (Array.isArray(requestPayload.messages)) {
          requestPayload.messages = validateAndFixClaudeToolPairing(
            requestPayload.messages
          );
        }
        if (isClaudeThinking && Array.isArray(requestPayload.contents)) {
          const conversationState = analyzeConversationState(
            requestPayload.contents
          );
          if (forceThinkingRecovery || needsThinkingRecovery(conversationState)) {
            thinkingRecoveryMessage = forceThinkingRecovery ? "Thinking recovery: retrying with fresh turn (API error)" : "Thinking recovery: restarting turn (corrupted context)";
            requestPayload.contents = closeToolLoopForThinking(
              requestPayload.contents
            );
            defaultSignatureStore.delete(signatureSessionKey);
          }
        }
        if ("model" in requestPayload) {
          delete requestPayload.model;
        }
        stripInjectedDebugFromRequestPayload(requestPayload);
        const restoreGeminiThoughtSignatures = !isClaude && shouldCacheThinkingSignatures(effectiveModel);
        sanitizeGeminiGenerationConfigForModel(
          requestPayload,
          effectiveModel
        );
        sanitizeRequestPayloadForAntigravity(
          requestPayload,
          restoreGeminiThoughtSignatures ? {
            sessionKey: signatureSessionKey,
            getSignature: getCachedSignature
          } : void 0
        );
        const effectiveProjectId = projectId?.trim() || (headerStyle === "antigravity" ? generateSyntheticProjectId() : "");
        resolvedProjectId = effectiveProjectId;
        if (headerStyle === "antigravity") {
          const existingSystemInstruction = requestPayload.systemInstruction;
          if (existingSystemInstruction && typeof existingSystemInstruction === "object") {
            const sys = existingSystemInstruction;
            sys.role = "user";
            if (Array.isArray(sys.parts) && sys.parts.length > 0) {
              const firstPart = sys.parts[0];
              if (firstPart && typeof firstPart.text === "string") {
                firstPart.text = ANTIGRAVITY_SYSTEM_INSTRUCTION + "\n\n" + firstPart.text;
              } else {
                sys.parts = [
                  { text: ANTIGRAVITY_SYSTEM_INSTRUCTION },
                  ...sys.parts
                ];
              }
            } else {
              sys.parts = [{ text: ANTIGRAVITY_SYSTEM_INSTRUCTION }];
            }
          } else if (typeof existingSystemInstruction === "string") {
            requestPayload.systemInstruction = {
              role: "user",
              parts: [
                {
                  text: ANTIGRAVITY_SYSTEM_INSTRUCTION + "\n\n" + existingSystemInstruction
                }
              ]
            };
          } else {
            requestPayload.systemInstruction = {
              role: "user",
              parts: [{ text: ANTIGRAVITY_SYSTEM_INSTRUCTION }]
            };
          }
        }
        const wrappedBody = {
          project: effectiveProjectId,
          model: effectiveModel,
          request: requestPayload
        };
        if (headerStyle === "antigravity") {
          wrappedBody.requestType = "agent";
          wrappedBody.userAgent = "antigravity";
          wrappedBody.requestId = "agent-" + crypto2.randomUUID();
        }
        if (wrappedBody.request && typeof wrappedBody.request === "object") {
          sessionId = signatureSessionKey;
          wrappedBody.request.sessionId = signatureSessionKey;
        }
        body = JSON.stringify(wrappedBody);
      }
    } catch (error) {
      throw error;
    }
  }
  if (streaming) {
    headers.set("Accept", "text/event-stream");
  }
  if (isClaudeThinking) {
    const existing = headers.get("anthropic-beta");
    const interleavedHeader = "interleaved-thinking-2025-05-14";
    if (existing) {
      if (!existing.includes(interleavedHeader)) {
        headers.set("anthropic-beta", `${existing},${interleavedHeader}`);
      }
    } else {
      headers.set("anthropic-beta", interleavedHeader);
    }
  }
  if (headerStyle === "antigravity") {
    headers.set("User-Agent", ANTIGRAVITY_CLI_USER_AGENT);
    headers.delete("X-Goog-Api-Client");
    headers.delete("Client-Metadata");
  } else {
    headers.set("User-Agent", GEMINI_CLI_HEADERS["User-Agent"]);
    headers.set("X-Goog-Api-Client", GEMINI_CLI_HEADERS["X-Goog-Api-Client"]);
    headers.set("Client-Metadata", GEMINI_CLI_HEADERS["Client-Metadata"]);
  }
  return {
    request: transformedUrl,
    init: {
      ...baseInit,
      headers,
      body
    },
    streaming,
    requestedModel,
    effectiveModel,
    projectId: resolvedProjectId,
    endpoint: transformedUrl,
    sessionId,
    toolDebugMissing,
    toolDebugSummary: toolDebugSummaries.slice(0, 20).join(" | "),
    // Lazy: serialize the tools array only on first read (memoized), so the
    // happy path never pays the JSON.stringify cost.
    get toolDebugPayload() {
      if (toolDebugTools === void 0) {
        return void 0;
      }
      if (!toolDebugPayloadComputed) {
        toolDebugPayloadComputed = true;
        try {
          toolDebugPayloadCache = JSON.stringify(toolDebugTools);
        } catch {
          toolDebugPayloadCache = void 0;
        }
      }
      return toolDebugPayloadCache;
    },
    needsSignedThinkingWarmup,
    headerStyle,
    thinkingRecoveryMessage
  };
}
function buildThinkingWarmupBody(bodyText, isClaudeThinking) {
  if (!bodyText || !isClaudeThinking) {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  const warmupPrompt = "Warmup request for thinking signature.";
  const updateRequest = (req) => {
    req.contents = [{ role: "user", parts: [{ text: warmupPrompt }] }];
    delete req.tools;
    delete req.toolConfig;
    const generationConfig = req.generationConfig ?? {};
    generationConfig.thinkingConfig = {
      include_thoughts: true,
      thinking_budget: DEFAULT_THINKING_BUDGET
    };
    generationConfig.maxOutputTokens = CLAUDE_THINKING_MAX_OUTPUT_TOKENS;
    req.generationConfig = generationConfig;
  };
  if (parsed.request && typeof parsed.request === "object") {
    updateRequest(parsed.request);
    const nested = parsed.request.request;
    if (nested && typeof nested === "object") {
      updateRequest(nested);
    }
  } else {
    updateRequest(parsed);
  }
  return JSON.stringify(parsed);
}
var QUOTA_EXHAUSTED_PATTERNS = [
  /cloudaicompanion\.instances\.completeTask/i,
  /lacks the required IAM permission/i,
  /please contact your administrator/i
];
function rewriteQuotaExhaustedError(message) {
  if (!message) return null;
  const isQuotaError = QUOTA_EXHAUSTED_PATTERNS.some((pattern) => pattern.test(message));
  if (!isQuotaError) return null;
  return "You've run out of Gemini/Antigravity quota. Your subscription's usage limit is exhausted \u2014 wait for it to reset, add another account, or switch to a different model/provider.";
}
async function transformAntigravityResponse(response, streaming, debugContext, requestedModel, projectId, endpoint, effectiveModel, sessionId, toolDebugMissing, toolDebugSummary, toolDebugPayload, debugLines) {
  const contentType = response.headers.get("content-type") ?? "";
  const isJsonResponse = contentType.includes("application/json");
  const isEventStreamResponse = contentType.includes("text/event-stream");
  const debugText = isDebugTuiEnabled() && Array.isArray(debugLines) && debugLines.length > 0 ? formatDebugLinesForThinking(debugLines) : getKeepThinking() ? SYNTHETIC_THINKING_PLACEHOLDER : void 0;
  const cacheSignatures = shouldCacheThinkingSignatures(effectiveModel);
  if (!isJsonResponse && !isEventStreamResponse) {
    logAntigravityDebugResponse(debugContext, response, {
      note: "Non-JSON response (body omitted)"
    });
    return response;
  }
  if (streaming && response.ok && isEventStreamResponse && response.body) {
    const headers = new Headers(response.headers);
    logAntigravityDebugResponse(debugContext, response, {
      note: "Streaming SSE response (real-time transform)"
    });
    const streamingTransformer = createStreamingTransformer(
      defaultSignatureStore,
      {
        onCacheSignature: cacheSignature,
        onInjectDebug: injectDebugThinking,
        // onInjectSyntheticThinking removed - keep_thinking now uses debugText path
        transformThinkingParts
      },
      {
        signatureSessionKey: sessionId,
        debugText,
        cacheSignatures,
        displayedThinkingHashes: effectiveModel && isGemini3Model(effectiveModel) ? getDisplayedThinkingHashes(sessionId) : void 0
        // injectSyntheticThinking removed - keep_thinking now unified with debug via debugText
      }
    );
    return new Response(response.body.pipeThrough(streamingTransformer), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  const responseFallback = response.clone();
  try {
    const headers = new Headers(response.headers);
    const text = await response.text();
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = { error: { message: text } };
      }
      if (errorBody?.error) {
        const rawErrorMessage = typeof errorBody.error.message === "string" && errorBody.error.message.length > 0 ? errorBody.error.message : "Unknown error";
        const quotaMessage = rewriteQuotaExhaustedError(rawErrorMessage);
        const rewrittenErrorMessage = quotaMessage ?? rawErrorMessage;
        const errorType = detectErrorType(rewrittenErrorMessage);
        const debugInfo = `

[Debug Info]
Requested Model: ${requestedModel || "Unknown"}
Effective Model: ${effectiveModel || "Unknown"}
Project: ${projectId || "Unknown"}
Endpoint: ${endpoint || "Unknown"}
Status: ${response.status}
Request ID: ${headers.get("x-request-id") || "N/A"}${toolDebugMissing !== void 0 ? `
Tool Debug Missing: ${toolDebugMissing}` : ""}${toolDebugSummary ? `
Tool Debug Summary: ${toolDebugSummary}` : ""}${toolDebugPayload ? `
Tool Debug Payload: ${toolDebugPayload}` : ""}`;
        const injectedDebug = debugText ? `

${debugText}` : "";
        errorBody.error.message = rewrittenErrorMessage + debugInfo + injectedDebug;
        if (errorType === "thinking_block_order") {
          const recoveryError = new Error("THINKING_RECOVERY_NEEDED");
          recoveryError.recoveryType = errorType;
          recoveryError.originalError = errorBody;
          recoveryError.debugInfo = debugInfo;
          throw recoveryError;
        }
        const errorMessage = errorBody.error.message?.toLowerCase() || "";
        if (errorMessage.includes("prompt is too long") || errorMessage.includes("context length exceeded") || errorMessage.includes("context_length_exceeded") || errorMessage.includes("maximum context length")) {
          headers.set("x-antigravity-context-error", "prompt_too_long");
        }
        if (errorMessage.includes("tool_use") && errorMessage.includes("tool_result") && (errorMessage.includes("without") || errorMessage.includes("immediately after"))) {
          headers.set("x-antigravity-context-error", "tool_pairing");
        }
        return new Response(JSON.stringify(errorBody), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
      if (errorBody?.error?.details && Array.isArray(errorBody.error.details)) {
        const retryInfo = errorBody.error.details.find(
          (detail) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
        );
        if (typeof retryInfo?.retryDelay === "string") {
          const match = retryInfo.retryDelay.match(/^([\d.]+)s$/);
          if (match && match[1]) {
            const retrySeconds = parseFloat(match[1]);
            if (!isNaN(retrySeconds) && retrySeconds > 0) {
              const retryAfterSec = Math.ceil(retrySeconds).toString();
              const retryAfterMs = Math.ceil(retrySeconds * 1e3).toString();
              headers.set("Retry-After", retryAfterSec);
              headers.set("retry-after-ms", retryAfterMs);
            }
          }
        }
      }
    }
    const init = {
      status: response.status,
      statusText: response.statusText,
      headers
    };
    const usageFromSse = streaming && isEventStreamResponse ? extractUsageFromSsePayload(text) : null;
    const parsed = !streaming || !isEventStreamResponse ? parseAntigravityApiBody(text) : null;
    const patched = parsed ? rewriteAntigravityPreviewAccessError(
      parsed,
      response.status,
      requestedModel
    ) : null;
    const effectiveBody = patched ?? parsed ?? void 0;
    const usage = usageFromSse ?? (effectiveBody ? extractUsageMetadata(effectiveBody) : null);
    if (usage && effectiveModel) {
      logCacheStats(
        effectiveModel,
        usage.cachedContentTokenCount ?? 0,
        0,
        // API doesn't provide cache write tokens separately
        usage.promptTokenCount ?? usage.totalTokenCount ?? 0
      );
    }
    if (usage?.cachedContentTokenCount !== void 0) {
      headers.set(
        "x-antigravity-cached-content-token-count",
        String(usage.cachedContentTokenCount)
      );
      if (usage.totalTokenCount !== void 0) {
        headers.set(
          "x-antigravity-total-token-count",
          String(usage.totalTokenCount)
        );
      }
      if (usage.promptTokenCount !== void 0) {
        headers.set(
          "x-antigravity-prompt-token-count",
          String(usage.promptTokenCount)
        );
      }
      if (usage.candidatesTokenCount !== void 0) {
        headers.set(
          "x-antigravity-candidates-token-count",
          String(usage.candidatesTokenCount)
        );
      }
    }
    logAntigravityDebugResponse(debugContext, response, {
      body: text,
      note: streaming ? "Streaming SSE payload (buffered fallback)" : void 0,
      headersOverride: headers
    });
    if (!parsed) {
      return new Response(text, init);
    }
    if (effectiveBody?.response !== void 0) {
      let responseBody = effectiveBody.response;
      if (debugText) {
        responseBody = injectDebugThinking(responseBody, debugText);
      }
      const transformed = transformThinkingParts(responseBody);
      return new Response(JSON.stringify(transformed), init);
    }
    if (patched) {
      return new Response(JSON.stringify(patched), init);
    }
    return new Response(text, init);
  } catch (error) {
    if (error instanceof Error && error.message === "THINKING_RECOVERY_NEEDED") {
      throw error;
    }
    logAntigravityDebugResponse(debugContext, response, {
      error,
      note: "Failed to transform Antigravity response"
    });
    return responseFallback;
  }
}

// src/plugin/errors.ts
var EmptyResponseError = class extends Error {
  provider;
  model;
  attempts;
  constructor(provider, model, attempts, message) {
    super(
      message ?? `The model returned an empty response after ${attempts} attempts. This may indicate a temporary service issue. Please try again.`
    );
    this.name = "EmptyResponseError";
    this.provider = provider;
    this.model = model;
    this.attempts = attempts;
  }
};

// src/plugin/token.ts
var log8 = createLogger("token");
function parseOAuthErrorPayload(text) {
  if (!text) {
    return {};
  }
  try {
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object") {
      return { description: text };
    }
    let code;
    if (typeof payload.error === "string") {
      code = payload.error;
    } else if (payload.error && typeof payload.error === "object") {
      code = payload.error.status ?? payload.error.code;
      if (!payload.error_description && payload.error.message) {
        return { code, description: payload.error.message };
      }
    }
    const description = payload.error_description;
    if (description) {
      return { code, description };
    }
    if (payload.error && typeof payload.error === "object" && payload.error.message) {
      return { code, description: payload.error.message };
    }
    return { code };
  } catch {
    return { description: text };
  }
}
var AntigravityTokenRefreshError = class extends Error {
  code;
  description;
  status;
  statusText;
  constructor(options) {
    super(options.message);
    this.name = "AntigravityTokenRefreshError";
    this.code = options.code;
    this.description = options.description;
    this.status = options.status;
    this.statusText = options.statusText;
  }
};
var inFlightRefreshes = /* @__PURE__ */ new Map();
var invalidGrantStrikes = /* @__PURE__ */ new Map();
var INVALID_GRANT_STRIKES_BEFORE_REMOVAL = 2;
function getInvalidGrantStrikes(refreshToken) {
  return invalidGrantStrikes.get(refreshToken) ?? 0;
}
function isRevokedRefreshToken(refreshToken) {
  return getInvalidGrantStrikes(refreshToken) >= INVALID_GRANT_STRIKES_BEFORE_REMOVAL;
}
async function refreshAccessToken(auth, client2, providerId) {
  const parts = parseRefreshParts(auth.refresh);
  if (!parts.refreshToken) {
    return void 0;
  }
  let shared = inFlightRefreshes.get(parts.refreshToken);
  if (!shared) {
    shared = performRefresh(auth, parts.refreshToken).finally(() => {
      inFlightRefreshes.delete(parts.refreshToken);
    });
    inFlightRefreshes.set(parts.refreshToken, shared);
  }
  return adoptRefreshResult(auth, parts, await shared);
}
function adoptRefreshResult(auth, parts, result) {
  if (!result) {
    return void 0;
  }
  const resultParts = parseRefreshParts(result.refresh);
  const refresh = formatRefreshParts({
    refreshToken: resultParts.refreshToken || parts.refreshToken,
    projectId: parts.projectId ?? resultParts.projectId,
    managedProjectId: parts.managedProjectId ?? resultParts.managedProjectId
  });
  if (refresh === result.refresh) {
    return result;
  }
  const adopted = {
    ...auth,
    access: result.access,
    expires: result.expires,
    refresh
  };
  storeCachedAuth(adopted);
  return adopted;
}
async function performRefresh(auth, refreshTokenValue) {
  const parts = parseRefreshParts(auth.refresh);
  try {
    const startTime = Date.now();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: parts.refreshToken,
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET
      })
    });
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch {
        errorText = void 0;
      }
      const { code, description } = parseOAuthErrorPayload(errorText);
      const details = [code, description ?? errorText].filter(Boolean).join(": ");
      const baseMessage = `Antigravity token refresh failed (${response.status} ${response.statusText})`;
      const message = details ? `${baseMessage} - ${details}` : baseMessage;
      log8.warn("Token refresh failed", { status: response.status, code, details });
      if (code === "invalid_grant") {
        const strikes = (invalidGrantStrikes.get(refreshTokenValue) ?? 0) + 1;
        invalidGrantStrikes.set(refreshTokenValue, strikes);
        log8.warn("Google rejected the stored refresh token with invalid_grant", {
          strikes,
          revoked: strikes >= INVALID_GRANT_STRIKES_BEFORE_REMOVAL
        });
        invalidateProjectContextCache(auth.refresh);
        clearCachedAuth(auth.refresh);
      }
      throw new AntigravityTokenRefreshError({
        message,
        code,
        description: description ?? errorText,
        status: response.status,
        statusText: response.statusText
      });
    }
    const payload = await response.json();
    const refreshedParts = {
      refreshToken: payload.refresh_token ?? parts.refreshToken,
      projectId: parts.projectId,
      managedProjectId: parts.managedProjectId
    };
    const updatedAuth = {
      ...auth,
      access: payload.access_token,
      expires: calculateTokenExpiry(startTime, payload.expires_in),
      refresh: formatRefreshParts(refreshedParts)
    };
    storeCachedAuth(updatedAuth);
    invalidateProjectContextCache(auth.refresh);
    invalidGrantStrikes.delete(refreshTokenValue);
    return updatedAuth;
  } catch (error) {
    if (error instanceof AntigravityTokenRefreshError) {
      throw error;
    }
    log8.error("Unexpected token refresh error", { error: String(error) });
    return void 0;
  }
}

// src/plugin/server.ts
import { createServer } from "node:http";
import { readFileSync as readFileSync6, existsSync as existsSync6 } from "node:fs";
var redirectUri = new URL(ANTIGRAVITY_REDIRECT_URI);
var callbackPath = redirectUri.pathname || "/";
function isOrbStackDockerHost() {
  if (!existsSync6("/.dockerenv")) {
    return false;
  }
  try {
    if (existsSync6("/proc/version")) {
      const version = readFileSync6("/proc/version", "utf8").toLowerCase();
      if (version.includes("orbstack")) {
        return true;
      }
    }
    const hostname = process.env.HOSTNAME || "";
    if (hostname.startsWith("orbstack-") || hostname.endsWith(".orb") || hostname === "orbstack") {
      return true;
    }
    if (existsSync6("/etc/resolv.conf")) {
      const resolv = readFileSync6("/etc/resolv.conf", "utf8");
      if (resolv.includes("orb.local") || resolv.includes("orbstack")) {
        return true;
      }
    }
    if (process.platform === "linux" && existsSync6("/.dockerenv")) {
      if (existsSync6("/run/host-services")) {
        return true;
      }
    }
  } catch {
  }
  return false;
}
function isWSL() {
  if (process.platform !== "linux") return false;
  try {
    const release = readFileSync6("/proc/version", "utf8").toLowerCase();
    return release.includes("microsoft") || release.includes("wsl");
  } catch {
    return false;
  }
}
function isRemoteEnvironment() {
  if (process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION) {
    return true;
  }
  if (process.env.REMOTE_CONTAINERS || process.env.CODESPACES) {
    return true;
  }
  return false;
}
function getBindAddress() {
  const envBind = process.env.OPENCODE_ANTIGRAVITY_OAUTH_BIND;
  if (envBind) {
    return envBind;
  }
  if (isOrbStackDockerHost()) {
    return "127.0.0.1";
  }
  if (isWSL() || isRemoteEnvironment()) {
    return "0.0.0.0";
  }
  return "127.0.0.1";
}
async function startOAuthListener({ timeoutMs = 5 * 60 * 1e3 } = {}) {
  const port = redirectUri.port ? Number.parseInt(redirectUri.port, 10) : redirectUri.protocol === "https:" ? 443 : 80;
  const origin = `${redirectUri.protocol}//${redirectUri.host}`;
  let settled = false;
  let resolveCallback;
  let rejectCallback;
  let timeoutHandle;
  const callbackPromise = new Promise((resolve, reject) => {
    resolveCallback = (url) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      resolve(url);
    };
    rejectCallback = (error) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      reject(error);
    };
  });
  const successResponse = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authentication Successful</title>
    <style>
      :root {
        --bg: #FAFAFA;
        --card-bg: #FFFFFF;
        --text-primary: #1F2937;
        --text-secondary: #6B7280;
        --accent: #2563EB;
        --success: #10B981;
        --border: #E5E7EB;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #111827;
          --card-bg: #1F2937;
          --text-primary: #F9FAFB;
          --text-secondary: #9CA3AF;
          --accent: #3B82F6;
          --success: #34D399;
          --border: #374151;
        }
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: var(--bg);
        color: var(--text-primary);
        padding: 1rem;
      }
      .card {
        background: var(--card-bg);
        border-radius: 16px;
        padding: 3rem 2rem;
        width: 100%;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid var(--border);
      }
      .icon-wrapper {
        width: 64px;
        height: 64px;
        background: rgba(16, 185, 129, 0.1);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
      }
      .icon {
        width: 32px;
        height: 32px;
        color: var(--success);
      }
      h1 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
        letter-spacing: -0.025em;
      }
      p {
        color: var(--text-secondary);
        font-size: 0.95rem;
        line-height: 1.5;
        margin: 0 0 2rem;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--text-primary);
        color: var(--card-bg);
        font-weight: 500;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        text-decoration: none;
        transition: opacity 0.2s;
        font-size: 0.95rem;
        border: none;
        cursor: pointer;
        width: 100%;
        box-sizing: border-box;
      }
      .btn:hover {
        opacity: 0.9;
      }
      .sub-text {
        margin-top: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon-wrapper">
        <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1>All set!</h1>
      <p>You've successfully authenticated with Antigravity. You can now return to Opencode.</p>
      <button class="btn" onclick="closeWindow()">Close this tab</button>
      <div class="sub-text">Usage Tip: Most browsers block auto-closing. If the button doesn't work, please close the tab manually.</div>
    </div>
    <script>
      function closeWindow() {
        window.close();
        // Fallback if window.close() is blocked
        document.querySelector('.btn').textContent = "Tab cannot be closed automatically";
        document.querySelector('.btn').style.opacity = "0.5";
        document.querySelector('.btn').style.cursor = "default";
      }
    </script>
  </body>
</html>`;
  timeoutHandle = setTimeout(() => {
    rejectCallback(new Error("Timed out waiting for OAuth callback"));
  }, timeoutMs);
  timeoutHandle.unref?.();
  const server = createServer((request, response) => {
    if (!request.url) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end("Invalid request");
      return;
    }
    const url = new URL(request.url, origin);
    if (url.pathname !== callbackPath) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(successResponse);
    resolveCallback(url);
    setImmediate(() => {
      server.close();
    });
  });
  const bindAddress = getBindAddress();
  await new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off("error", handleError);
      if (error.code === "EADDRINUSE") {
        reject(new Error(
          `Port ${port} is already in use. Another process is occupying this port. Please terminate the process or try again later.`
        ));
        return;
      }
      reject(error);
    };
    server.once("error", handleError);
    server.listen(port, bindAddress, () => {
      server.off("error", handleError);
      resolve();
    });
  });
  server.on("error", (error) => {
    rejectCallback(error instanceof Error ? error : new Error(String(error)));
  });
  return {
    waitForCallback: () => callbackPromise,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => {
        if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
          reject(error);
          return;
        }
        if (!settled) {
          rejectCallback(new Error("OAuth listener closed before callback"));
        }
        resolve();
      });
    })
  };
}

// src/plugin/rotation.ts
var DEFAULT_HEALTH_SCORE_CONFIG = {
  initial: 70,
  successReward: 1,
  rateLimitPenalty: -10,
  failurePenalty: -20,
  recoveryRatePerHour: 2,
  minUsable: 50,
  maxScore: 100
};
function remapAccountIndexAfterRemoval(index, removedIndex) {
  if (index === removedIndex) return null;
  return index > removedIndex ? index - 1 : index;
}
function remapNumberKeyedMap(map, removedIndex) {
  const entries = [...map.entries()];
  map.clear();
  for (const [index, value] of entries) {
    const next = remapAccountIndexAfterRemoval(index, removedIndex);
    if (next !== null) {
      map.set(next, value);
    }
  }
}
var HealthScoreTracker = class {
  scores = /* @__PURE__ */ new Map();
  config;
  constructor(config = {}) {
    this.config = { ...DEFAULT_HEALTH_SCORE_CONFIG, ...config };
  }
  /**
   * Get current health score for an account, applying time-based recovery.
   */
  getScore(accountIndex) {
    const state = this.scores.get(accountIndex);
    if (!state) {
      return this.config.initial;
    }
    const now = Date.now();
    const hoursSinceUpdate = (now - state.lastUpdated) / (1e3 * 60 * 60);
    const recoveredPoints = Math.floor(hoursSinceUpdate * this.config.recoveryRatePerHour);
    return Math.min(
      this.config.maxScore,
      state.score + recoveredPoints
    );
  }
  /**
   * Record a successful request - improves health score.
   */
  recordSuccess(accountIndex) {
    const now = Date.now();
    const current = this.getScore(accountIndex);
    this.scores.set(accountIndex, {
      score: Math.min(this.config.maxScore, current + this.config.successReward),
      lastUpdated: now,
      lastSuccess: now,
      consecutiveFailures: 0
    });
  }
  /**
   * Record a rate limit hit - moderate penalty.
   */
  recordRateLimit(accountIndex) {
    const now = Date.now();
    const state = this.scores.get(accountIndex);
    const current = this.getScore(accountIndex);
    this.scores.set(accountIndex, {
      score: Math.max(0, current + this.config.rateLimitPenalty),
      lastUpdated: now,
      lastSuccess: state?.lastSuccess ?? 0,
      consecutiveFailures: (state?.consecutiveFailures ?? 0) + 1
    });
  }
  /**
   * Record a failure (auth, network, etc.) - larger penalty.
   */
  recordFailure(accountIndex) {
    const now = Date.now();
    const state = this.scores.get(accountIndex);
    const current = this.getScore(accountIndex);
    this.scores.set(accountIndex, {
      score: Math.max(0, current + this.config.failurePenalty),
      lastUpdated: now,
      lastSuccess: state?.lastSuccess ?? 0,
      consecutiveFailures: (state?.consecutiveFailures ?? 0) + 1
    });
  }
  /**
   * Check if account is healthy enough to use.
   */
  isUsable(accountIndex) {
    return this.getScore(accountIndex) >= this.config.minUsable;
  }
  /**
   * Get consecutive failure count for an account.
   */
  getConsecutiveFailures(accountIndex) {
    return this.scores.get(accountIndex)?.consecutiveFailures ?? 0;
  }
  /**
   * Reset health state for an account (e.g., after removal).
   */
  reset(accountIndex) {
    this.scores.delete(accountIndex);
  }
  /**
   * Remap health-score state after the account at `removedIndex` is removed from
   * the pool. AccountManager.removeAccount() splices the account out and
   * renumbers every subsequent account's index down by one; without this remap
   * the index-keyed scores silently attach to the wrong accounts.
   */
  remapAfterRemoval(removedIndex) {
    remapNumberKeyedMap(this.scores, removedIndex);
  }
  /**
   * Get all scores for debugging/logging.
   */
  getSnapshot() {
    const result = /* @__PURE__ */ new Map();
    for (const [index] of this.scores) {
      result.set(index, {
        score: this.getScore(index),
        consecutiveFailures: this.getConsecutiveFailures(index)
      });
    }
    return result;
  }
};
var STICKINESS_BONUS = 150;
var SWITCH_THRESHOLD = 100;
function selectHybridAccount(accounts, tokenTracker, currentAccountIndex = null, minHealthScore = 50) {
  const candidates = accounts.filter(
    (acc) => !acc.isRateLimited && !acc.isCoolingDown && acc.healthScore >= minHealthScore && tokenTracker.hasTokens(acc.index)
  ).map((acc) => ({
    ...acc,
    tokens: tokenTracker.getTokens(acc.index)
  }));
  if (candidates.length === 0) {
    return null;
  }
  const maxTokens = tokenTracker.getMaxTokens();
  const scored = candidates.map((acc) => {
    const baseScore = calculateHybridScore(acc, maxTokens);
    const stickinessBonus = acc.index === currentAccountIndex ? STICKINESS_BONUS : 0;
    return {
      index: acc.index,
      baseScore,
      score: baseScore + stickinessBonus,
      isCurrent: acc.index === currentAccountIndex
    };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) {
    return null;
  }
  const currentCandidate = scored.find((s) => s.isCurrent);
  if (currentCandidate && !best.isCurrent) {
    const advantage = best.baseScore - currentCandidate.baseScore;
    if (advantage < SWITCH_THRESHOLD) {
      return currentCandidate.index;
    }
  }
  return best.index;
}
function calculateHybridScore(account, maxTokens) {
  const healthComponent = account.healthScore * 2;
  const tokenComponent = account.tokens / maxTokens * 100 * 5;
  const secondsSinceUsed = (Date.now() - account.lastUsed) / 1e3;
  const freshnessComponent = Math.min(secondsSinceUsed, 3600) * 0.1;
  return Math.max(0, healthComponent + tokenComponent + freshnessComponent);
}
var DEFAULT_TOKEN_BUCKET_CONFIG = {
  maxTokens: 50,
  regenerationRatePerMinute: 6,
  initialTokens: 50
};
var TokenBucketTracker = class {
  buckets = /* @__PURE__ */ new Map();
  config;
  constructor(config = {}) {
    this.config = { ...DEFAULT_TOKEN_BUCKET_CONFIG, ...config };
  }
  /**
   * Get current token balance for an account, applying regeneration.
   */
  getTokens(accountIndex) {
    const state = this.buckets.get(accountIndex);
    if (!state) {
      return this.config.initialTokens;
    }
    const now = Date.now();
    const minutesSinceUpdate = (now - state.lastUpdated) / (1e3 * 60);
    const recoveredTokens = minutesSinceUpdate * this.config.regenerationRatePerMinute;
    return Math.min(
      this.config.maxTokens,
      state.tokens + recoveredTokens
    );
  }
  /**
   * Check if account has enough tokens for a request.
   * @param cost Cost of the request (default: 1)
   */
  hasTokens(accountIndex, cost = 1) {
    return this.getTokens(accountIndex) >= cost;
  }
  /**
   * Consume tokens for a request.
   * @returns true if tokens were consumed, false if insufficient
   */
  consume(accountIndex, cost = 1) {
    const current = this.getTokens(accountIndex);
    if (current < cost) {
      return false;
    }
    this.buckets.set(accountIndex, {
      tokens: current - cost,
      lastUpdated: Date.now()
    });
    return true;
  }
  /**
   * Refund tokens (e.g., if request wasn't actually sent).
   */
  refund(accountIndex, amount = 1) {
    const current = this.getTokens(accountIndex);
    this.buckets.set(accountIndex, {
      tokens: Math.min(this.config.maxTokens, current + amount),
      lastUpdated: Date.now()
    });
  }
  getMaxTokens() {
    return this.config.maxTokens;
  }
  /**
   * Remap token-bucket state after the account at `removedIndex` is removed from
   * the pool. Mirrors the renumbering AccountManager.removeAccount() applies, so
   * the index-keyed buckets stay attached to the correct accounts.
   */
  remapAfterRemoval(removedIndex) {
    remapNumberKeyedMap(this.buckets, removedIndex);
  }
};
var globalTokenTracker = null;
function getTokenTracker() {
  if (!globalTokenTracker) {
    globalTokenTracker = new TokenBucketTracker();
  }
  return globalTokenTracker;
}
function initTokenTracker(config) {
  globalTokenTracker = new TokenBucketTracker(config);
  return globalTokenTracker;
}
var globalHealthTracker = null;
function getHealthTracker() {
  if (!globalHealthTracker) {
    globalHealthTracker = new HealthScoreTracker();
  }
  return globalHealthTracker;
}
function initHealthTracker(config) {
  globalHealthTracker = new HealthScoreTracker(config);
  return globalHealthTracker;
}

// src/plugin/accounts.ts
var QUOTA_EXHAUSTED_BACKOFFS = [6e4, 3e5, 18e5, 72e5];
var RATE_LIMIT_EXCEEDED_BACKOFF = 3e4;
var MODEL_CAPACITY_EXHAUSTED_BASE_BACKOFF = 45e3;
var MODEL_CAPACITY_EXHAUSTED_JITTER_MAX = 3e4;
var SERVER_ERROR_BACKOFF = 2e4;
var UNKNOWN_BACKOFF = 6e4;
var MIN_BACKOFF_MS = 2e3;
var RATE_LIMIT_CLEAR_TTL_MS2 = 24 * 60 * 60 * 1e3;
function generateJitter(maxJitterMs) {
  return Math.random() * maxJitterMs - maxJitterMs / 2;
}
function parseRateLimitReason(reason, message, status) {
  if (status === 529 || status === 503) return "MODEL_CAPACITY_EXHAUSTED";
  if (status === 500) return "SERVER_ERROR";
  if (reason) {
    switch (reason.toUpperCase()) {
      case "QUOTA_EXHAUSTED":
        return "QUOTA_EXHAUSTED";
      case "RATE_LIMIT_EXCEEDED":
        return "RATE_LIMIT_EXCEEDED";
      case "MODEL_CAPACITY_EXHAUSTED":
        return "MODEL_CAPACITY_EXHAUSTED";
    }
  }
  if (message) {
    const lower = message.toLowerCase();
    if (lower.includes("capacity") || lower.includes("overloaded") || lower.includes("resource exhausted")) {
      return "MODEL_CAPACITY_EXHAUSTED";
    }
    if (lower.includes("per minute") || lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("presque")) {
      return "RATE_LIMIT_EXCEEDED";
    }
    if (lower.includes("exhausted") || lower.includes("quota")) {
      return "QUOTA_EXHAUSTED";
    }
  }
  if (status === 429) {
    return "UNKNOWN";
  }
  return "UNKNOWN";
}
function calculateBackoffMs(reason, consecutiveFailures, retryAfterMs) {
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.max(retryAfterMs, MIN_BACKOFF_MS);
  }
  switch (reason) {
    case "QUOTA_EXHAUSTED": {
      const index = Math.min(consecutiveFailures, QUOTA_EXHAUSTED_BACKOFFS.length - 1);
      return QUOTA_EXHAUSTED_BACKOFFS[index] ?? UNKNOWN_BACKOFF;
    }
    case "RATE_LIMIT_EXCEEDED":
      return RATE_LIMIT_EXCEEDED_BACKOFF;
    // 30s
    case "MODEL_CAPACITY_EXHAUSTED":
      return MODEL_CAPACITY_EXHAUSTED_BASE_BACKOFF + generateJitter(MODEL_CAPACITY_EXHAUSTED_JITTER_MAX);
    case "SERVER_ERROR":
      return SERVER_ERROR_BACKOFF;
    // 20s
    case "UNKNOWN":
    default:
      return UNKNOWN_BACKOFF;
  }
}
function nowMs() {
  return Date.now();
}
function clampNonNegativeInt(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value < 0 ? 0 : Math.floor(value);
}
function getQuotaKey(family, headerStyle, model) {
  if (family === "claude") {
    return "claude";
  }
  const base = headerStyle === "gemini-cli" ? "gemini-cli" : "gemini-antigravity";
  if (model) {
    return `${base}:${model}`;
  }
  return base;
}
function isRateLimitedForQuotaKey(account, key) {
  const resetTime = account.rateLimitResetTimes[key];
  return resetTime !== void 0 && nowMs() < resetTime;
}
function isRateLimitedForFamily(account, family, model) {
  if (family === "claude") {
    return isRateLimitedForQuotaKey(account, "claude");
  }
  const antigravityIsLimited = isRateLimitedForHeaderStyle(account, family, "antigravity", model);
  const cliIsLimited = isRateLimitedForHeaderStyle(account, family, "gemini-cli", model);
  return antigravityIsLimited && cliIsLimited;
}
function isRateLimitedForHeaderStyle(account, family, headerStyle, model) {
  clearExpiredRateLimits(account);
  if (family === "claude") {
    return isRateLimitedForQuotaKey(account, "claude");
  }
  if (model) {
    const modelKey = getQuotaKey(family, headerStyle, model);
    if (isRateLimitedForQuotaKey(account, modelKey)) {
      return true;
    }
  }
  const baseKey = getQuotaKey(family, headerStyle);
  return isRateLimitedForQuotaKey(account, baseKey);
}
function clearExpiredRateLimits(account) {
  const now = nowMs();
  const keys = Object.keys(account.rateLimitResetTimes);
  for (const key of keys) {
    const resetTime = account.rateLimitResetTimes[key];
    if (resetTime !== void 0 && now >= resetTime) {
      delete account.rateLimitResetTimes[key];
      recordClearedQuotaKey(account, key, now);
    }
  }
}
function recordClearedQuotaKey(account, key, at = nowMs()) {
  const clearedGeneration = account.rateLimitSetTimes[key];
  account.clearedQuotaKeys[key] = at;
  if (typeof clearedGeneration === "number" && Number.isFinite(clearedGeneration)) {
    account.clearedSetTimes[key] = clearedGeneration;
  } else {
    delete account.clearedSetTimes[key];
  }
  delete account.rateLimitSetTimes[key];
}
function sanitizeClearedQuotaKeys(raw) {
  const out = {};
  if (!raw) {
    return out;
  }
  const now = nowMs();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    if (now - value > RATE_LIMIT_CLEAR_TTL_MS2) {
      continue;
    }
    out[key] = value;
  }
  return out;
}
function sanitizeRateLimitSetTimes(raw, limits) {
  const out = {};
  if (!raw) {
    return out;
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    if (!limits || limits[key] === void 0) {
      continue;
    }
    out[key] = value;
  }
  return out;
}
function sanitizeClearedSetTimes(raw, cleared) {
  const out = {};
  if (!raw) {
    return out;
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    if (cleared[key] === void 0) {
      continue;
    }
    out[key] = value;
  }
  return out;
}
function resolveQuotaGroup(family, model) {
  if (model) {
    return getModelFamily2(model);
  }
  return family === "claude" ? "claude" : "gemini-pro";
}
function isOverSoftQuotaThreshold(account, family, headerStyle, thresholdPercent, cacheTtlMs, model) {
  if (headerStyle === "gemini-cli") return false;
  if (thresholdPercent >= 100) return false;
  if (!account.cachedQuota) return false;
  if (account.cachedQuotaUpdatedAt == null) return false;
  const age = nowMs() - account.cachedQuotaUpdatedAt;
  if (age > cacheTtlMs) return false;
  const quotaGroup = resolveQuotaGroup(family, model);
  const groupData = account.cachedQuota[quotaGroup];
  if (groupData?.remainingFraction == null) return false;
  const resetTimestamp = groupData.resetTime ? Date.parse(groupData.resetTime) : Number.NaN;
  if (Number.isFinite(resetTimestamp) && resetTimestamp <= nowMs()) return false;
  const remainingFraction = Math.max(0, Math.min(1, groupData.remainingFraction));
  const usedPercent = (1 - remainingFraction) * 100;
  const isOverThreshold = usedPercent >= thresholdPercent;
  if (isOverThreshold) {
    const accountLabel2 = formatAccountLabel(account.email, account.index);
    const resetSuffix = groupData.resetTime ? ` (resets: ${groupData.resetTime})` : "";
    const message = `[SoftQuota] Skipping ${accountLabel2}: ${quotaGroup} usage ${usedPercent.toFixed(1)}% >= threshold ${thresholdPercent}%${resetSuffix}`;
    debugLogToFile(message);
  }
  return isOverThreshold;
}
function computeSoftQuotaCacheTtlMs(ttlConfig, refreshIntervalMinutes) {
  if (ttlConfig === "auto") {
    return Math.max(2 * refreshIntervalMinutes, 10) * 60 * 1e3;
  }
  return ttlConfig * 60 * 1e3;
}
var AccountManager = class _AccountManager {
  accounts = [];
  cursor = 0;
  currentAccountIndexByFamily = {
    claude: -1,
    gemini: -1
  };
  sessionOffsetApplied = {
    claude: false,
    gemini: false
  };
  lastToastAccountIndex = -1;
  lastToastTime = 0;
  savePending = false;
  saveTimeout = null;
  savePromiseResolvers = [];
  saveQueue = Promise.resolve();
  /** Tracks an in-flight disk write so flushSaveToDisk can await a write that has
   * already started (savePending is cleared before the write settles). */
  activeSave = null;
  static async loadFromDisk(authFallback) {
    const stored = await loadAccounts();
    return new _AccountManager(authFallback, stored);
  }
  constructor(authFallback, stored) {
    const authParts = authFallback ? parseRefreshParts(authFallback.refresh) : null;
    if (stored && stored.accounts.length === 0) {
      this.accounts = [];
      this.cursor = 0;
      return;
    }
    if (stored && stored.accounts.length > 0) {
      const baseNow = nowMs();
      this.accounts = stored.accounts.map((acc, index) => {
        if (!acc.refreshToken || typeof acc.refreshToken !== "string") {
          return null;
        }
        const matchesFallback = !!(authFallback && authParts && authParts.refreshToken && acc.refreshToken === authParts.refreshToken);
        const clearedQuotaKeys = sanitizeClearedQuotaKeys(acc.clearedQuotaKeys);
        return {
          index,
          email: acc.email,
          addedAt: clampNonNegativeInt(acc.addedAt, baseNow),
          lastUsed: clampNonNegativeInt(acc.lastUsed, 0),
          parts: {
            refreshToken: acc.refreshToken,
            projectId: acc.projectId,
            managedProjectId: acc.managedProjectId
          },
          access: matchesFallback ? authFallback?.access : void 0,
          expires: matchesFallback ? authFallback?.expires : void 0,
          enabled: acc.enabled !== false,
          rateLimitResetTimes: acc.rateLimitResetTimes ?? {},
          rateLimitSetTimes: sanitizeRateLimitSetTimes(acc.rateLimitSetTimes, acc.rateLimitResetTimes),
          clearedQuotaKeys,
          clearedSetTimes: sanitizeClearedSetTimes(acc.clearedSetTimes, clearedQuotaKeys),
          lastSwitchReason: acc.lastSwitchReason,
          coolingDownUntil: acc.coolingDownUntil,
          cooldownReason: acc.cooldownReason,
          touchedForQuota: {},
          fingerprint: acc.fingerprint ?? generateFingerprint(),
          fingerprintHistory: acc.fingerprintHistory ?? [],
          cachedQuota: acc.cachedQuota,
          cachedQuotaUpdatedAt: acc.cachedQuotaUpdatedAt,
          verificationRequired: acc.verificationRequired,
          verificationRequiredAt: acc.verificationRequiredAt,
          verificationRequiredReason: acc.verificationRequiredReason,
          verificationUrl: acc.verificationUrl
        };
      }).filter((a) => a !== null);
      let fingerprintVersionChanged = false;
      for (const acc of this.accounts) {
        if (acc.fingerprint && updateFingerprintVersion(acc.fingerprint)) {
          fingerprintVersionChanged = true;
        }
      }
      this.cursor = clampNonNegativeInt(stored.activeIndex, 0);
      if (this.accounts.length > 0) {
        this.cursor = this.cursor % this.accounts.length;
        const defaultIndex = this.cursor;
        this.currentAccountIndexByFamily.claude = clampNonNegativeInt(
          stored.activeIndexByFamily?.claude,
          defaultIndex
        ) % this.accounts.length;
        this.currentAccountIndexByFamily.gemini = clampNonNegativeInt(
          stored.activeIndexByFamily?.gemini,
          defaultIndex
        ) % this.accounts.length;
      }
      if (fingerprintVersionChanged) {
        this.requestSaveToDisk();
      }
      return;
    }
    if (authFallback) {
      const parts = parseRefreshParts(authFallback.refresh);
      if (parts.refreshToken) {
        const now = nowMs();
        this.accounts = [
          {
            index: 0,
            email: void 0,
            addedAt: now,
            lastUsed: 0,
            parts,
            access: authFallback.access,
            expires: authFallback.expires,
            enabled: true,
            rateLimitResetTimes: {},
            rateLimitSetTimes: {},
            clearedQuotaKeys: {},
            clearedSetTimes: {},
            touchedForQuota: {}
          }
        ];
        this.cursor = 0;
        this.currentAccountIndexByFamily.claude = 0;
        this.currentAccountIndexByFamily.gemini = 0;
      }
    }
  }
  getAccountCount() {
    return this.getEnabledAccounts().length;
  }
  getTotalAccountCount() {
    return this.accounts.length;
  }
  getEnabledAccounts() {
    return this.accounts.filter((account) => account.enabled !== false);
  }
  getAccountsSnapshot() {
    return this.accounts.map((a) => ({
      ...a,
      parts: { ...a.parts },
      rateLimitResetTimes: { ...a.rateLimitResetTimes },
      rateLimitSetTimes: { ...a.rateLimitSetTimes },
      clearedQuotaKeys: { ...a.clearedQuotaKeys },
      clearedSetTimes: { ...a.clearedSetTimes }
    }));
  }
  getCurrentAccountForFamily(family) {
    const currentIndex = this.currentAccountIndexByFamily[family];
    if (currentIndex >= 0 && currentIndex < this.accounts.length) {
      const account = this.accounts[currentIndex] ?? null;
      if (account && account.enabled !== false) {
        return account;
      }
    }
    return null;
  }
  /**
   * Check if we should show an account switch toast.
   * Debounces repeated toasts for the same account.
   */
  shouldShowAccountToast(accountIndex, debounceMs = 3e4) {
    const now = nowMs();
    if (accountIndex !== this.lastToastAccountIndex) {
      return true;
    }
    return now - this.lastToastTime >= debounceMs;
  }
  markToastShown(accountIndex) {
    this.lastToastAccountIndex = accountIndex;
    this.lastToastTime = nowMs();
  }
  getCurrentOrNextForFamily(family, model, strategy = "sticky", headerStyle = "antigravity", pidOffsetEnabled = false, softQuotaThresholdPercent = 100, softQuotaCacheTtlMs = 10 * 60 * 1e3, excludeIndices) {
    const quotaKey = getQuotaKey(family, headerStyle, model);
    if (strategy === "round-robin") {
      const next2 = this.getNextForFamily(family, model, headerStyle, softQuotaThresholdPercent, softQuotaCacheTtlMs, excludeIndices);
      if (next2) {
        this.markTouchedForQuota(next2, quotaKey);
        this.currentAccountIndexByFamily[family] = next2.index;
      }
      return next2;
    }
    if (strategy === "hybrid") {
      const healthTracker = getHealthTracker();
      const tokenTracker = getTokenTracker();
      const accountsWithMetrics = this.accounts.filter((acc) => acc.enabled !== false && !excludeIndices?.has(acc.index)).map((acc) => {
        clearExpiredRateLimits(acc);
        return {
          index: acc.index,
          lastUsed: acc.lastUsed,
          healthScore: healthTracker.getScore(acc.index),
          // Use the style-aware check (consistent with round-robin and the sticky
          // fallback). isRateLimitedForFamily is true only when BOTH header-style
          // pools are exhausted, so hybrid could otherwise pick an account whose
          // requested-style pool is exhausted while the other style still has room.
          isRateLimited: isRateLimitedForHeaderStyle(acc, family, headerStyle, model) || isOverSoftQuotaThreshold(acc, family, headerStyle, softQuotaThresholdPercent, softQuotaCacheTtlMs, model),
          isCoolingDown: this.isAccountCoolingDown(acc)
        };
      });
      const currentIndex = this.currentAccountIndexByFamily[family] ?? null;
      const selectedIndex = selectHybridAccount(accountsWithMetrics, tokenTracker, currentIndex);
      if (selectedIndex !== null) {
        const selected = this.accounts[selectedIndex];
        if (selected) {
          selected.lastUsed = nowMs();
          this.markTouchedForQuota(selected, quotaKey);
          this.currentAccountIndexByFamily[family] = selected.index;
          return selected;
        }
      }
    }
    if (pidOffsetEnabled && !this.sessionOffsetApplied[family] && this.accounts.length > 1) {
      const pidOffset = process.pid % this.accounts.length;
      const baseIndex = this.currentAccountIndexByFamily[family] ?? 0;
      const newIndex = (baseIndex + pidOffset) % this.accounts.length;
      debugLogToFile(`[Account] Applying PID offset: pid=${process.pid} offset=${pidOffset} family=${family} index=${baseIndex}->${newIndex}`);
      this.currentAccountIndexByFamily[family] = newIndex;
      this.sessionOffsetApplied[family] = true;
    }
    const current = this.getCurrentAccountForFamily(family);
    if (current && !excludeIndices?.has(current.index)) {
      clearExpiredRateLimits(current);
      const isLimitedForRequestedStyle = isRateLimitedForHeaderStyle(current, family, headerStyle, model);
      const isOverThreshold = isOverSoftQuotaThreshold(current, family, headerStyle, softQuotaThresholdPercent, softQuotaCacheTtlMs, model);
      if (!isLimitedForRequestedStyle && !isOverThreshold && !this.isAccountCoolingDown(current)) {
        this.markTouchedForQuota(current, quotaKey);
        return current;
      }
    }
    const next = this.getNextForFamily(family, model, headerStyle, softQuotaThresholdPercent, softQuotaCacheTtlMs, excludeIndices);
    if (next) {
      this.markTouchedForQuota(next, quotaKey);
      this.currentAccountIndexByFamily[family] = next.index;
    }
    return next;
  }
  getNextForFamily(family, model, headerStyle = "antigravity", softQuotaThresholdPercent = 100, softQuotaCacheTtlMs = 10 * 60 * 1e3, excludeIndices) {
    const available = this.accounts.filter((a) => {
      clearExpiredRateLimits(a);
      return a.enabled !== false && !excludeIndices?.has(a.index) && !isRateLimitedForHeaderStyle(a, family, headerStyle, model) && !isOverSoftQuotaThreshold(a, family, headerStyle, softQuotaThresholdPercent, softQuotaCacheTtlMs, model) && !this.isAccountCoolingDown(a);
    });
    if (available.length === 0) {
      return null;
    }
    const account = available[this.cursor % available.length];
    if (!account) {
      return null;
    }
    this.cursor++;
    return account;
  }
  markRateLimited(account, retryAfterMs, family, headerStyle = "antigravity", model) {
    const now = nowMs();
    const key = getQuotaKey(family, headerStyle, model);
    account.rateLimitResetTimes[key] = now + retryAfterMs;
    account.rateLimitSetTimes[key] = now;
    delete account.clearedQuotaKeys[key];
  }
  /**
   * Mark an account as used after a successful API request.
   * This updates the lastUsed timestamp for freshness calculations.
   * Should be called AFTER request completion, not during account selection.
   */
  markAccountUsed(accountIndex) {
    const account = this.accounts.find((a) => a.index === accountIndex);
    if (account) {
      account.lastUsed = nowMs();
    }
  }
  markRateLimitedWithReason(account, family, headerStyle, model, reason, retryAfterMs, failureTtlMs = 36e5) {
    const now = nowMs();
    if (account.lastFailureTime !== void 0 && now - account.lastFailureTime > failureTtlMs) {
      account.consecutiveFailures = 0;
    }
    const failures = (account.consecutiveFailures ?? 0) + 1;
    account.consecutiveFailures = failures;
    account.lastFailureTime = now;
    const backoffMs = calculateBackoffMs(reason, failures - 1, retryAfterMs);
    const key = getQuotaKey(family, headerStyle, model);
    account.rateLimitResetTimes[key] = now + backoffMs;
    account.rateLimitSetTimes[key] = now;
    delete account.clearedQuotaKeys[key];
    return backoffMs;
  }
  markRequestSuccess(account) {
    if (account.consecutiveFailures) {
      account.consecutiveFailures = 0;
    }
  }
  clearAllRateLimitsForFamily(family, model) {
    const now = nowMs();
    for (const account of this.accounts) {
      if (family === "claude") {
        if (account.rateLimitResetTimes.claude !== void 0) {
          delete account.rateLimitResetTimes.claude;
          recordClearedQuotaKey(account, "claude", now);
        }
      } else {
        const antigravityKey = getQuotaKey(family, "antigravity", model);
        const cliKey = getQuotaKey(family, "gemini-cli", model);
        if (account.rateLimitResetTimes[antigravityKey] !== void 0) {
          delete account.rateLimitResetTimes[antigravityKey];
          recordClearedQuotaKey(account, antigravityKey, now);
        }
        if (account.rateLimitResetTimes[cliKey] !== void 0) {
          delete account.rateLimitResetTimes[cliKey];
          recordClearedQuotaKey(account, cliKey, now);
        }
      }
      account.consecutiveFailures = 0;
    }
  }
  shouldTryOptimisticReset(family, model) {
    const minWaitMs = this.getMinWaitTimeForFamily(family, model);
    return minWaitMs > 0 && minWaitMs <= 2e3;
  }
  markAccountCoolingDown(account, cooldownMs, reason) {
    account.coolingDownUntil = nowMs() + cooldownMs;
    account.cooldownReason = reason;
  }
  isAccountCoolingDown(account) {
    if (account.coolingDownUntil === void 0) {
      return false;
    }
    if (nowMs() >= account.coolingDownUntil) {
      this.clearAccountCooldown(account);
      return false;
    }
    return true;
  }
  clearAccountCooldown(account) {
    delete account.coolingDownUntil;
    delete account.cooldownReason;
  }
  getAccountCooldownReason(account) {
    return this.isAccountCoolingDown(account) ? account.cooldownReason : void 0;
  }
  markTouchedForQuota(account, quotaKey) {
    account.touchedForQuota[quotaKey] = nowMs();
  }
  isFreshForQuota(account, quotaKey) {
    const touchedAt = account.touchedForQuota[quotaKey];
    if (!touchedAt) return true;
    const resetTime = account.rateLimitResetTimes[quotaKey];
    if (resetTime && touchedAt < resetTime) return true;
    return false;
  }
  getFreshAccountsForQuota(quotaKey, family, model) {
    return this.accounts.filter((acc) => {
      clearExpiredRateLimits(acc);
      return acc.enabled !== false && this.isFreshForQuota(acc, quotaKey) && !isRateLimitedForFamily(acc, family, model) && !this.isAccountCoolingDown(acc);
    });
  }
  isRateLimitedForHeaderStyle(account, family, headerStyle, model) {
    return isRateLimitedForHeaderStyle(account, family, headerStyle, model);
  }
  getAvailableHeaderStyle(account, family, model) {
    clearExpiredRateLimits(account);
    if (family === "claude") {
      return isRateLimitedForHeaderStyle(account, family, "antigravity") ? null : "antigravity";
    }
    if (!isRateLimitedForHeaderStyle(account, family, "antigravity", model)) {
      return "antigravity";
    }
    if (!isRateLimitedForHeaderStyle(account, family, "gemini-cli", model)) {
      return "gemini-cli";
    }
    return null;
  }
  /**
   * Check if any OTHER account has antigravity quota available for the given family/model.
   * 
   * Used to determine whether to switch accounts vs fall back to gemini-cli:
   * - If true: Switch to another account (preserve antigravity priority)
   * - If false: All accounts exhausted antigravity, safe to fall back to gemini-cli
   * 
   * @param currentAccountIndex - Index of the current account (will be excluded from check)
   * @param family - Model family ("gemini" or "claude")
   * @param model - Optional model name for model-specific rate limits
   * @returns true if any other enabled, non-cooling-down account has antigravity available
   */
  hasOtherAccountWithAntigravityAvailable(currentAccountIndex, family, model) {
    if (family === "claude") {
      return false;
    }
    return this.accounts.some((acc) => {
      if (acc.index === currentAccountIndex) {
        return false;
      }
      if (acc.enabled === false) {
        return false;
      }
      if (this.isAccountCoolingDown(acc)) {
        return false;
      }
      clearExpiredRateLimits(acc);
      return !isRateLimitedForHeaderStyle(acc, family, "antigravity", model);
    });
  }
  setAccountEnabled(accountIndex, enabled) {
    const account = this.accounts[accountIndex];
    if (!account) {
      return false;
    }
    account.enabled = enabled;
    if (!enabled) {
      for (const family of Object.keys(this.currentAccountIndexByFamily)) {
        if (this.currentAccountIndexByFamily[family] === accountIndex) {
          const next = this.accounts.find((a, i) => i !== accountIndex && a.enabled !== false);
          this.currentAccountIndexByFamily[family] = next?.index ?? -1;
        }
      }
    }
    this.requestSaveToDisk();
    return true;
  }
  markAccountVerificationRequired(accountIndex, reason, verifyUrl) {
    const account = this.accounts[accountIndex];
    if (!account) {
      return false;
    }
    account.verificationRequired = true;
    account.verificationRequiredAt = nowMs();
    account.verificationRequiredReason = reason?.trim() || void 0;
    const normalizedVerifyUrl = verifyUrl?.trim();
    if (normalizedVerifyUrl) {
      account.verificationUrl = normalizedVerifyUrl;
    }
    if (account.enabled !== false) {
      this.setAccountEnabled(accountIndex, false);
    } else {
      this.requestSaveToDisk();
    }
    return true;
  }
  clearAccountVerificationRequired(accountIndex, enableAccount = false) {
    const account = this.accounts[accountIndex];
    if (!account) {
      return false;
    }
    const wasVerificationRequired = account.verificationRequired === true;
    const hadMetadata = account.verificationRequiredAt !== void 0 || account.verificationRequiredReason !== void 0 || account.verificationUrl !== void 0;
    account.verificationRequired = false;
    account.verificationRequiredAt = void 0;
    account.verificationRequiredReason = void 0;
    account.verificationUrl = void 0;
    if (enableAccount && wasVerificationRequired && account.enabled === false) {
      this.setAccountEnabled(accountIndex, true);
    } else if (wasVerificationRequired || hadMetadata) {
      this.requestSaveToDisk();
    }
    return true;
  }
  removeAccountByIndex(accountIndex) {
    if (accountIndex < 0 || accountIndex >= this.accounts.length) {
      return false;
    }
    const account = this.accounts[accountIndex];
    if (!account) {
      return false;
    }
    return this.removeAccount(account);
  }
  removeAccount(account) {
    const idx = this.accounts.indexOf(account);
    if (idx < 0) {
      return false;
    }
    this.accounts.splice(idx, 1);
    this.accounts.forEach((acc, index) => {
      acc.index = index;
    });
    if (this.accounts.length === 0) {
      this.cursor = 0;
      this.currentAccountIndexByFamily.claude = -1;
      this.currentAccountIndexByFamily.gemini = -1;
      return true;
    }
    if (this.cursor > idx) {
      this.cursor -= 1;
    }
    this.cursor = this.cursor % this.accounts.length;
    for (const family of ["claude", "gemini"]) {
      if (this.currentAccountIndexByFamily[family] > idx) {
        this.currentAccountIndexByFamily[family] -= 1;
      }
      if (this.currentAccountIndexByFamily[family] >= this.accounts.length) {
        this.currentAccountIndexByFamily[family] = -1;
      }
    }
    return true;
  }
  updateFromAuth(account, auth) {
    const parts = parseRefreshParts(auth.refresh);
    account.parts = {
      ...parts,
      projectId: parts.projectId ?? account.parts.projectId,
      managedProjectId: parts.managedProjectId ?? account.parts.managedProjectId
    };
    account.access = auth.access;
    account.expires = auth.expires;
  }
  toAuthDetails(account) {
    return {
      type: "oauth",
      refresh: formatRefreshParts(account.parts),
      access: account.access,
      expires: account.expires
    };
  }
  getMinWaitTimeForFamily(family, model, headerStyle, strict) {
    const available = this.accounts.filter((a) => {
      clearExpiredRateLimits(a);
      return a.enabled !== false && (strict && headerStyle ? !isRateLimitedForHeaderStyle(a, family, headerStyle, model) : !isRateLimitedForFamily(a, family, model));
    });
    if (available.length > 0) {
      return 0;
    }
    const waitTimes = [];
    for (const a of this.accounts) {
      if (family === "claude") {
        const t = a.rateLimitResetTimes.claude;
        if (t !== void 0) waitTimes.push(Math.max(0, t - nowMs()));
      } else if (strict && headerStyle) {
        const key = getQuotaKey(family, headerStyle, model);
        const t = a.rateLimitResetTimes[key];
        if (t !== void 0) waitTimes.push(Math.max(0, t - nowMs()));
      } else {
        const antigravityKey = getQuotaKey(family, "antigravity", model);
        const cliKey = getQuotaKey(family, "gemini-cli", model);
        const t1 = a.rateLimitResetTimes[antigravityKey];
        const t2 = a.rateLimitResetTimes[cliKey];
        const accountWait = Math.min(
          t1 !== void 0 ? Math.max(0, t1 - nowMs()) : Infinity,
          t2 !== void 0 ? Math.max(0, t2 - nowMs()) : Infinity
        );
        if (accountWait !== Infinity) waitTimes.push(accountWait);
      }
    }
    return waitTimes.length > 0 ? Math.min(...waitTimes) : 0;
  }
  getAccounts() {
    return [...this.accounts];
  }
  async saveToDisk(replace = false) {
    const storage = this.createStorageSnapshot();
    return this.enqueueStorageOperation(() => replace ? saveAccountsReplace(storage) : saveAccounts(storage));
  }
  /**
   * Build the persisted clearedQuotaKeys map for an account. Prunes IN PLACE (so a
   * long-running process cannot accumulate markers forever): drops markers past the
   * TTL and any key that currently holds a live limit (the limit is the newer signal
   * and supersedes the clear). Returns undefined when empty so we do not bloat the
   * file with empty objects.
   */
  serializeClearedQuotaKeys(account) {
    const now = nowMs();
    const out = {};
    for (const key of Object.keys(account.clearedQuotaKeys)) {
      const clearedAt = account.clearedQuotaKeys[key];
      const invalid = typeof clearedAt !== "number" || !Number.isFinite(clearedAt);
      const expired = !invalid && now - clearedAt > RATE_LIMIT_CLEAR_TTL_MS2;
      const superseded = account.rateLimitResetTimes[key] !== void 0;
      if (invalid || expired || superseded) {
        delete account.clearedQuotaKeys[key];
        delete account.clearedSetTimes[key];
        continue;
      }
      out[key] = clearedAt;
    }
    return Object.keys(out).length > 0 ? out : void 0;
  }
  /**
   * Build the persisted clearedSetTimes map (tombstone generations). Prunes IN PLACE:
   * keeps a generation only while its key is a live tombstone. Returns undefined empty.
   */
  serializeClearedSetTimes(account) {
    const out = {};
    for (const key of Object.keys(account.clearedSetTimes)) {
      const setGen = account.clearedSetTimes[key];
      const invalid = typeof setGen !== "number" || !Number.isFinite(setGen);
      const orphaned = account.clearedQuotaKeys[key] === void 0;
      if (invalid || orphaned) {
        delete account.clearedSetTimes[key];
        continue;
      }
      out[key] = setGen;
    }
    return Object.keys(out).length > 0 ? out : void 0;
  }
  /**
   * Build the persisted rateLimitSetTimes map for an account. Prunes IN PLACE: keeps
   * a set timestamp only while its key still holds a live limit (once cleared the
   * timestamp is dead). Returns undefined when empty.
   */
  serializeRateLimitSetTimes(account) {
    const out = {};
    for (const key of Object.keys(account.rateLimitSetTimes)) {
      const setAt = account.rateLimitSetTimes[key];
      const invalid = typeof setAt !== "number" || !Number.isFinite(setAt);
      const hasLiveLimit = account.rateLimitResetTimes[key] !== void 0;
      if (invalid || !hasLiveLimit) {
        delete account.rateLimitSetTimes[key];
        continue;
      }
      out[key] = setAt;
    }
    return Object.keys(out).length > 0 ? out : void 0;
  }
  createStorageSnapshot() {
    const claudeIndex = Math.max(0, this.currentAccountIndexByFamily.claude);
    const geminiIndex = Math.max(0, this.currentAccountIndexByFamily.gemini);
    return {
      version: 4,
      accounts: this.accounts.map((a) => ({
        email: a.email,
        refreshToken: a.parts.refreshToken,
        projectId: a.parts.projectId,
        managedProjectId: a.parts.managedProjectId,
        addedAt: a.addedAt,
        lastUsed: a.lastUsed,
        enabled: a.enabled,
        rateLimitResetTimes: { ...a.rateLimitResetTimes },
        // Emit per-key SET timestamps and clear markers so mergeAccountStorage can
        // resolve conflicts by mutation order (latest setAt vs clearedAt wins),
        // preventing a stale writer from resurrecting a cleared limit or erasing a
        // newer re-limit, while still preserving concurrent updates to OTHER pools.
        rateLimitSetTimes: this.serializeRateLimitSetTimes(a),
        // serializeClearedQuotaKeys prunes tombstones (and their generation markers)
        // first, so serializeClearedSetTimes only emits generations for live tombstones.
        clearedQuotaKeys: this.serializeClearedQuotaKeys(a),
        clearedSetTimes: this.serializeClearedSetTimes(a),
        coolingDownUntil: a.coolingDownUntil,
        cooldownReason: a.cooldownReason,
        fingerprint: a.fingerprint,
        fingerprintHistory: a.fingerprintHistory?.length ? a.fingerprintHistory : void 0,
        cachedQuota: a.cachedQuota && Object.keys(a.cachedQuota).length > 0 ? a.cachedQuota : void 0,
        cachedQuotaUpdatedAt: a.cachedQuotaUpdatedAt,
        verificationRequired: a.verificationRequired,
        verificationRequiredAt: a.verificationRequiredAt,
        verificationRequiredReason: a.verificationRequiredReason,
        verificationUrl: a.verificationUrl
      })),
      activeIndex: claudeIndex,
      activeIndexByFamily: {
        claude: claudeIndex,
        gemini: geminiIndex
      }
    };
  }
  async persistAccountRemoval(refreshToken) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.savePending = false;
    const storage = this.createStorageSnapshot();
    try {
      await this.enqueueStorageOperation(async () => {
        await saveAccounts(storage);
        await removeAccountFromStorage(refreshToken);
      });
    } finally {
      this.resolveSavePromises();
    }
  }
  enqueueStorageOperation(operation) {
    const result = this.saveQueue.then(operation);
    this.saveQueue = result.then(
      () => void 0,
      () => void 0
    );
    return result;
  }
  resolveSavePromises() {
    const resolvers = this.savePromiseResolvers;
    this.savePromiseResolvers = [];
    for (const resolve of resolvers) {
      resolve();
    }
  }
  requestSaveToDisk() {
    if (this.savePending) {
      return;
    }
    this.savePending = true;
    this.saveTimeout = setTimeout(() => {
      void this.executeSave();
    }, 1e3);
  }
  async flushSaveToDisk() {
    while (this.savePending || this.activeSave) {
      if (this.savePending) {
        await new Promise((resolve) => {
          this.savePromiseResolvers.push(resolve);
        });
      } else if (this.activeSave) {
        await this.activeSave;
      }
    }
  }
  async executeSave() {
    this.savePending = false;
    this.saveTimeout = null;
    const savePromise = (async () => {
      try {
        await this.saveToDisk();
      } catch {
      }
    })();
    this.activeSave = savePromise;
    try {
      await savePromise;
    } finally {
      if (this.activeSave === savePromise) {
        this.activeSave = null;
      }
      this.resolveSavePromises();
    }
  }
  // ========== Fingerprint Management ==========
  /**
   * Regenerate fingerprint for an account, saving the old one to history.
   * @param accountIndex - Index of the account to regenerate fingerprint for
   * @returns The new fingerprint, or null if account not found
   */
  regenerateAccountFingerprint(accountIndex) {
    const account = this.accounts[accountIndex];
    if (!account) return null;
    if (account.fingerprint) {
      const historyEntry = {
        fingerprint: account.fingerprint,
        timestamp: nowMs(),
        reason: "regenerated"
      };
      if (!account.fingerprintHistory) {
        account.fingerprintHistory = [];
      }
      account.fingerprintHistory.unshift(historyEntry);
      if (account.fingerprintHistory.length > MAX_FINGERPRINT_HISTORY) {
        account.fingerprintHistory = account.fingerprintHistory.slice(0, MAX_FINGERPRINT_HISTORY);
      }
    }
    account.fingerprint = generateFingerprint();
    this.requestSaveToDisk();
    return account.fingerprint;
  }
  /**
   * Restore a fingerprint from history for an account.
   * @param accountIndex - Index of the account
   * @param historyIndex - Index in the fingerprint history to restore from (0 = most recent)
   * @returns The restored fingerprint, or null if account/history not found
   */
  restoreAccountFingerprint(accountIndex, historyIndex) {
    const account = this.accounts[accountIndex];
    if (!account) return null;
    const history = account.fingerprintHistory;
    if (!history || historyIndex < 0 || historyIndex >= history.length) {
      return null;
    }
    const fingerprintToRestore = history[historyIndex].fingerprint;
    if (account.fingerprint) {
      const historyEntry = {
        fingerprint: account.fingerprint,
        timestamp: nowMs(),
        reason: "restored"
      };
      account.fingerprintHistory.unshift(historyEntry);
      if (account.fingerprintHistory.length > MAX_FINGERPRINT_HISTORY) {
        account.fingerprintHistory = account.fingerprintHistory.slice(0, MAX_FINGERPRINT_HISTORY);
      }
    }
    account.fingerprint = { ...fingerprintToRestore, createdAt: nowMs() };
    this.requestSaveToDisk();
    return account.fingerprint;
  }
  /**
   * Get fingerprint history for an account.
   * @param accountIndex - Index of the account
   * @returns Array of fingerprint versions, or empty array if not found
   */
  getAccountFingerprintHistory(accountIndex) {
    const account = this.accounts[accountIndex];
    if (!account || !account.fingerprintHistory) {
      return [];
    }
    return [...account.fingerprintHistory];
  }
  updateQuotaCache(accountIndex, quotaGroups) {
    const account = this.accounts[accountIndex];
    if (account) {
      account.cachedQuota = quotaGroups;
      account.cachedQuotaUpdatedAt = nowMs();
    }
  }
  isAccountOverSoftQuota(account, family, thresholdPercent, cacheTtlMs, model, headerStyle = "antigravity") {
    return isOverSoftQuotaThreshold(account, family, headerStyle, thresholdPercent, cacheTtlMs, model);
  }
  getAccountsForQuotaCheck() {
    return this.accounts.map((a) => ({
      email: a.email,
      refreshToken: a.parts.refreshToken,
      projectId: a.parts.projectId,
      managedProjectId: a.parts.managedProjectId,
      addedAt: a.addedAt,
      lastUsed: a.lastUsed,
      enabled: a.enabled
    }));
  }
  getOldestQuotaCacheAge() {
    let oldest = null;
    for (const acc of this.accounts) {
      if (acc.enabled === false) continue;
      if (acc.cachedQuotaUpdatedAt == null) return null;
      const age = nowMs() - acc.cachedQuotaUpdatedAt;
      if (oldest === null || age > oldest) oldest = age;
    }
    return oldest;
  }
  areAllAccountsOverSoftQuota(family, thresholdPercent, cacheTtlMs, model, headerStyle = "antigravity") {
    if (thresholdPercent >= 100) return false;
    const enabled = this.accounts.filter((a) => a.enabled !== false);
    if (enabled.length === 0) return false;
    return enabled.every((a) => isOverSoftQuotaThreshold(a, family, headerStyle, thresholdPercent, cacheTtlMs, model));
  }
  /**
   * Get minimum wait time until any account's soft quota resets.
   * Returns 0 if any account is available (not over threshold).
   * Returns the minimum resetTime across all over-threshold accounts.
   * Returns null if no resetTime data is available.
   */
  getMinWaitTimeForSoftQuota(family, thresholdPercent, cacheTtlMs, model, headerStyle = "antigravity") {
    if (thresholdPercent >= 100) return 0;
    const enabled = this.accounts.filter((a) => a.enabled !== false);
    if (enabled.length === 0) return null;
    const available = enabled.filter((a) => !isOverSoftQuotaThreshold(a, family, headerStyle, thresholdPercent, cacheTtlMs, model));
    if (available.length > 0) return 0;
    if (!model && family !== "claude") return null;
    const quotaGroup = resolveQuotaGroup(family, model);
    const now = nowMs();
    const waitTimes = [];
    for (const acc of enabled) {
      const groupData = acc.cachedQuota?.[quotaGroup];
      if (groupData?.resetTime) {
        const resetTimestamp = Date.parse(groupData.resetTime);
        if (Number.isFinite(resetTimestamp)) {
          waitTimes.push(Math.max(0, resetTimestamp - now));
        }
      }
    }
    if (waitTimes.length === 0) return null;
    const minWait = Math.min(...waitTimes);
    return minWait === 0 ? null : minWait;
  }
};

// src/hooks/auto-update-checker/checker.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";
import { fileURLToPath } from "node:url";

// src/hooks/auto-update-checker/constants.ts
import * as path from "node:path";
import * as os from "node:os";
var PACKAGE_NAME = "opencode-antigravity-auth";
var NPM_REGISTRY_URL = `https://registry.npmjs.org/-/package/${PACKAGE_NAME}/dist-tags`;
var NPM_FETCH_TIMEOUT = 5e3;
function getCacheDir() {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA ?? os.homedir(), "opencode");
  }
  return path.join(os.homedir(), ".cache", "opencode");
}
var CACHE_DIR = getCacheDir();
var INSTALLED_PACKAGE_JSON = path.join(
  CACHE_DIR,
  "node_modules",
  PACKAGE_NAME,
  "package.json"
);
function getUserConfigDir() {
  if (process.platform === "win32") {
    return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  }
  return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
}
var USER_CONFIG_DIR = getUserConfigDir();
var USER_OPENCODE_CONFIG = path.join(USER_CONFIG_DIR, "opencode", "opencode.json");
var USER_OPENCODE_CONFIG_JSONC = path.join(USER_CONFIG_DIR, "opencode", "opencode.jsonc");

// src/hooks/auto-update-checker/logging.ts
var AUTO_UPDATE_LOG_PREFIX = "[auto-update-checker]";
function formatAutoUpdateLogMessage(message) {
  return `${AUTO_UPDATE_LOG_PREFIX} ${message}`;
}
function logAutoUpdate(message) {
  debugLogToFile(formatAutoUpdateLogMessage(message));
}

// src/hooks/auto-update-checker/checker.ts
function stripJsonComments(json) {
  return json.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m).replace(/,(\s*[}\]])/g, "$1");
}
function getConfigPaths(directory) {
  return [
    path2.join(directory, ".opencode", "opencode.json"),
    path2.join(directory, ".opencode", "opencode.jsonc"),
    path2.join(directory, ".opencode.json"),
    USER_OPENCODE_CONFIG,
    USER_OPENCODE_CONFIG_JSONC
  ];
}
function getLocalDevPath(directory) {
  for (const configPath of getConfigPaths(directory)) {
    try {
      if (!fs2.existsSync(configPath)) continue;
      const content = fs2.readFileSync(configPath, "utf-8");
      const config = JSON.parse(stripJsonComments(content));
      const plugins = config.plugin ?? [];
      for (const entry of plugins) {
        if (entry.startsWith("file://") && entry.includes(PACKAGE_NAME)) {
          try {
            return fileURLToPath(entry);
          } catch {
            return entry.replace("file://", "");
          }
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}
function findPackageJsonUp(startPath) {
  try {
    const stat = fs2.statSync(startPath);
    let dir = stat.isDirectory() ? startPath : path2.dirname(startPath);
    for (let i = 0; i < 10; i++) {
      const pkgPath = path2.join(dir, "package.json");
      if (fs2.existsSync(pkgPath)) {
        try {
          const content = fs2.readFileSync(pkgPath, "utf-8");
          const pkg = JSON.parse(content);
          if (pkg.name === PACKAGE_NAME) return pkgPath;
        } catch {
          continue;
        }
      }
      const parent = path2.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    return null;
  }
  return null;
}
function getLocalDevVersion(directory) {
  const localPath = getLocalDevPath(directory);
  if (!localPath) return null;
  try {
    const pkgPath = findPackageJsonUp(localPath);
    if (!pkgPath) return null;
    const content = fs2.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(content);
    return pkg.version ?? null;
  } catch {
    return null;
  }
}
function findPluginEntry(directory) {
  for (const configPath of getConfigPaths(directory)) {
    try {
      if (!fs2.existsSync(configPath)) continue;
      const content = fs2.readFileSync(configPath, "utf-8");
      const config = JSON.parse(stripJsonComments(content));
      const plugins = config.plugin ?? [];
      for (const entry of plugins) {
        if (entry === PACKAGE_NAME) {
          return { entry, isPinned: false, pinnedVersion: null, configPath };
        }
        if (entry.startsWith(`${PACKAGE_NAME}@`)) {
          const pinnedVersion = entry.slice(PACKAGE_NAME.length + 1);
          const isPinned = pinnedVersion !== "latest";
          return { entry, isPinned, pinnedVersion: isPinned ? pinnedVersion : null, configPath };
        }
        if (entry.startsWith("file://") && entry.includes(PACKAGE_NAME)) {
          return { entry, isPinned: false, pinnedVersion: null, configPath };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}
function getCachedVersion() {
  try {
    if (fs2.existsSync(INSTALLED_PACKAGE_JSON)) {
      const content = fs2.readFileSync(INSTALLED_PACKAGE_JSON, "utf-8");
      const pkg = JSON.parse(content);
      if (pkg.version) return pkg.version;
    }
  } catch {
    return null;
  }
  try {
    const currentDir = path2.dirname(fileURLToPath(import.meta.url));
    const pkgPath = findPackageJsonUp(currentDir);
    if (pkgPath) {
      const content = fs2.readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(content);
      if (pkg.version) return pkg.version;
    }
  } catch (err) {
    logAutoUpdate(`Failed to resolve version from current directory: ${err}`);
  }
  return null;
}
function updatePinnedVersion(configPath, oldEntry, newVersion) {
  try {
    const content = fs2.readFileSync(configPath, "utf-8");
    const newEntry = `${PACKAGE_NAME}@${newVersion}`;
    const pluginMatch = content.match(/"plugin"\s*:\s*\[/);
    if (!pluginMatch || pluginMatch.index === void 0) {
      logAutoUpdate(`No "plugin" array found in ${configPath}`);
      return false;
    }
    const startIdx = pluginMatch.index + pluginMatch[0].length;
    let bracketCount = 1;
    let endIdx = startIdx;
    for (let i = startIdx; i < content.length && bracketCount > 0; i++) {
      if (content[i] === "[") bracketCount++;
      else if (content[i] === "]") bracketCount--;
      endIdx = i;
    }
    const before = content.slice(0, startIdx);
    const pluginArrayContent = content.slice(startIdx, endIdx);
    const after = content.slice(endIdx);
    const escapedOldEntry = oldEntry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`["']${escapedOldEntry}["']`);
    if (!regex.test(pluginArrayContent)) {
      logAutoUpdate(`Entry "${oldEntry}" not found in plugin array of ${configPath}`);
      return false;
    }
    const updatedPluginArray = pluginArrayContent.replace(regex, `"${newEntry}"`);
    const updatedContent = before + updatedPluginArray + after;
    if (updatedContent === content) {
      logAutoUpdate(`No changes made to ${configPath}`);
      return false;
    }
    fs2.writeFileSync(configPath, updatedContent, "utf-8");
    logAutoUpdate(`Updated ${configPath}: ${oldEntry} \u2192 ${newEntry}`);
    return true;
  } catch (err) {
    console.error(`[auto-update-checker] Failed to update config file ${configPath}:`, err);
    return false;
  }
}
async function getLatestVersion() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NPM_FETCH_TIMEOUT);
  try {
    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.latest ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// src/hooks/auto-update-checker/cache.ts
import * as fs3 from "node:fs";
import * as path3 from "node:path";
function stripTrailingCommas(json) {
  return json.replace(/,(\s*[}\]])/g, "$1");
}
function removeFromBunLock(packageName) {
  const lockPath = path3.join(CACHE_DIR, "bun.lock");
  if (!fs3.existsSync(lockPath)) return false;
  try {
    const content = fs3.readFileSync(lockPath, "utf-8");
    const lock = JSON.parse(stripTrailingCommas(content));
    let modified = false;
    if (lock.workspaces?.[""]?.dependencies?.[packageName]) {
      delete lock.workspaces[""].dependencies[packageName];
      modified = true;
    }
    if (lock.packages?.[packageName]) {
      delete lock.packages[packageName];
      modified = true;
    }
    if (modified) {
      fs3.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
      console.log(`[auto-update-checker] Removed from bun.lock: ${packageName}`);
    }
    return modified;
  } catch {
    return false;
  }
}
function invalidatePackage(packageName = PACKAGE_NAME) {
  try {
    const pkgDir = path3.join(CACHE_DIR, "node_modules", packageName);
    const pkgJsonPath = path3.join(CACHE_DIR, "package.json");
    let packageRemoved = false;
    let dependencyRemoved = false;
    let lockRemoved = false;
    if (fs3.existsSync(pkgDir)) {
      fs3.rmSync(pkgDir, { recursive: true, force: true });
      console.log(`[auto-update-checker] Package removed: ${pkgDir}`);
      packageRemoved = true;
    }
    if (fs3.existsSync(pkgJsonPath)) {
      const content = fs3.readFileSync(pkgJsonPath, "utf-8");
      const pkgJson = JSON.parse(content);
      if (pkgJson.dependencies?.[packageName]) {
        delete pkgJson.dependencies[packageName];
        fs3.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
        console.log(`[auto-update-checker] Dependency removed from package.json: ${packageName}`);
        dependencyRemoved = true;
      }
    }
    lockRemoved = removeFromBunLock(packageName);
    if (!packageRemoved && !dependencyRemoved && !lockRemoved) {
      console.log(`[auto-update-checker] Package not found, nothing to invalidate: ${packageName}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[auto-update-checker] Failed to invalidate package:", err);
    return false;
  }
}

// src/hooks/auto-update-checker/index.ts
function createAutoUpdateCheckerHook(client2, directory, options = {}) {
  const { showStartupToast = true, autoUpdate = true } = options;
  let hasChecked = false;
  return {
    event: ({ event }) => {
      if (event.type !== "session.created") return;
      if (hasChecked) return;
      const props = event.properties;
      if (props?.info?.parentID) return;
      hasChecked = true;
      setTimeout(() => {
        const localDevVersion = getLocalDevVersion(directory);
        if (localDevVersion) {
          if (showStartupToast) {
            showLocalDevToast(client2, localDevVersion).catch(() => {
            });
          }
          logAutoUpdate("Local development mode");
          return;
        }
        runBackgroundUpdateCheck(client2, directory, autoUpdate).catch((err) => {
          logAutoUpdate(`Background update check failed: ${err}`);
        });
      }, 0);
    }
  };
}
async function runBackgroundUpdateCheck(client2, directory, autoUpdate) {
  const pluginInfo = findPluginEntry(directory);
  if (!pluginInfo) {
    logAutoUpdate("Plugin not found in config");
    return;
  }
  const cachedVersion = getCachedVersion();
  const currentVersion = cachedVersion ?? pluginInfo.pinnedVersion;
  if (!currentVersion) {
    logAutoUpdate("No version found (cached or pinned)");
    return;
  }
  if (currentVersion.includes("-")) {
    logAutoUpdate(`Prerelease version (${currentVersion}), skipping auto-update`);
    return;
  }
  const latestVersion = await getLatestVersion();
  if (!latestVersion) {
    logAutoUpdate("Failed to fetch latest version");
    return;
  }
  if (currentVersion === latestVersion) {
    logAutoUpdate("Already on latest version");
    return;
  }
  logAutoUpdate(`Update available: ${currentVersion} \u2192 ${latestVersion}`);
  if (!autoUpdate) {
    await showUpdateAvailableToast(client2, latestVersion);
    logAutoUpdate("Auto-update disabled, notification only");
    return;
  }
  if (pluginInfo.isPinned) {
    const updated = updatePinnedVersion(pluginInfo.configPath, pluginInfo.entry, latestVersion);
    if (updated) {
      invalidatePackage(PACKAGE_NAME);
      await showAutoUpdatedToast(client2, currentVersion, latestVersion);
      logAutoUpdate(`Config updated: ${pluginInfo.entry} \u2192 ${PACKAGE_NAME}@${latestVersion}`);
    } else {
      await showUpdateAvailableToast(client2, latestVersion);
    }
  } else {
    invalidatePackage(PACKAGE_NAME);
    await showUpdateAvailableToast(client2, latestVersion);
  }
}
async function showUpdateAvailableToast(client2, latestVersion) {
  await client2.tui.showToast({
    body: {
      title: `Antigravity Auth Update`,
      message: `v${latestVersion} available. Restart OpenCode to apply.`,
      variant: "info",
      duration: 8e3
    }
  }).catch(() => {
  });
  logAutoUpdate(`Update available toast shown: v${latestVersion}`);
}
async function showAutoUpdatedToast(client2, oldVersion, newVersion) {
  await client2.tui.showToast({
    body: {
      title: `Antigravity Auth Updated!`,
      message: `v${oldVersion} \u2192 v${newVersion}
Restart OpenCode to apply.`,
      variant: "success",
      duration: 8e3
    }
  }).catch(() => {
  });
  logAutoUpdate(`Auto-updated toast shown: v${oldVersion} \u2192 v${newVersion}`);
}
async function showLocalDevToast(client2, version) {
  await client2.tui.showToast({
    body: {
      title: `Antigravity Auth ${version} (dev)`,
      message: "Running in local development mode.",
      variant: "warning",
      duration: 5e3
    }
  }).catch(() => {
  });
  logAutoUpdate(`Local dev toast shown: v${version}`);
}

// src/plugin/model-catalog.ts
var CATALOG_TTL_MS = 60 * 60 * 1e3;
var catalog;
var antigravityCatalog;
function modelIdFromName(model) {
  const raw = (model.name ? model.name.replace(/^models\//, "") : model.baseModelId)?.trim();
  return raw || null;
}
function recordPublicGeminiApiModels(models) {
  const ids = /* @__PURE__ */ new Set();
  for (const model of models) {
    const id = modelIdFromName(model);
    if (id) ids.add(id.toLowerCase());
  }
  if (ids.size === 0) return;
  catalog = { ids, fetchedAt: Date.now() };
}
function getPublicGeminiApiModelIds() {
  if (!catalog) return void 0;
  if (Date.now() - catalog.fetchedAt > CATALOG_TTL_MS) return void 0;
  return catalog.ids;
}
function recordAntigravityAvailableModels(models) {
  if (!models || Object.keys(models).length === 0) return;
  antigravityCatalog = {
    models: { ...models },
    fetchedAt: Date.now()
  };
}
function getCachedAntigravityAvailableModels() {
  if (!antigravityCatalog) return void 0;
  if (Date.now() - antigravityCatalog.fetchedAt > CATALOG_TTL_MS) return void 0;
  return antigravityCatalog.models;
}

// src/plugin/quota.ts
var FETCH_TIMEOUT_MS2 = 1e4;
function buildAuthFromAccount(account) {
  return {
    type: "oauth",
    refresh: formatRefreshParts({
      refreshToken: account.refreshToken,
      projectId: account.projectId,
      managedProjectId: account.managedProjectId
    }),
    access: void 0,
    expires: void 0
  };
}
function normalizeRemainingFraction(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
function parseResetTime(resetTime) {
  if (!resetTime) return null;
  const timestamp = Date.parse(resetTime);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return timestamp;
}
function classifyQuotaGroup(modelName, displayName) {
  const combined = `${modelName} ${displayName ?? ""}`.toLowerCase();
  if (combined.includes("claude")) {
    return "claude";
  }
  const isGemini3 = combined.includes("gemini-3") || combined.includes("gemini 3");
  if (!isGemini3) {
    return null;
  }
  const family = getModelFamily2(modelName);
  return family === "gemini-flash" ? "gemini-flash" : "gemini-pro";
}
function aggregateQuota(models) {
  const groups = {};
  if (!models) {
    return { groups, modelCount: 0 };
  }
  let totalCount = 0;
  for (const [modelName, entry] of Object.entries(models)) {
    const group = classifyQuotaGroup(modelName, entry.displayName ?? entry.modelName);
    if (!group) {
      continue;
    }
    const quotaInfo = entry.quotaInfo;
    const remainingFraction = quotaInfo ? normalizeRemainingFraction(quotaInfo.remainingFraction) : void 0;
    const resetTime = quotaInfo?.resetTime;
    const resetTimestamp = parseResetTime(resetTime);
    const validResetTime = resetTimestamp !== null ? resetTime : void 0;
    totalCount += 1;
    const existing = groups[group];
    const nextCount = (existing?.modelCount ?? 0) + 1;
    let nextRemaining = existing?.remainingFraction;
    let nextResetTime = existing?.resetTime;
    if (existing === void 0) {
      nextRemaining = remainingFraction;
      nextResetTime = validResetTime;
    } else if (remainingFraction !== void 0 && (existing.remainingFraction === void 0 || remainingFraction > existing.remainingFraction)) {
      nextRemaining = remainingFraction;
      nextResetTime = validResetTime;
    } else if (remainingFraction !== void 0 && existing.remainingFraction !== void 0 && remainingFraction === existing.remainingFraction) {
      const existingResetTimestamp = parseResetTime(existing.resetTime);
      if (resetTimestamp !== null && (existingResetTimestamp === null || resetTimestamp < existingResetTimestamp)) {
        nextResetTime = validResetTime;
      }
    }
    groups[group] = {
      remainingFraction: nextRemaining,
      resetTime: nextResetTime,
      modelCount: nextCount
    };
  }
  return { groups, modelCount: totalCount };
}
async function fetchWithTimeout2(url, options, timeoutMs = FETCH_TIMEOUT_MS2) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchAvailableModels(accessToken, projectId) {
  const endpoint = ANTIGRAVITY_ENDPOINT_PROD;
  const quotaUserAgent = getAntigravityHeaders()["User-Agent"] || "antigravity/windows/amd64";
  const errors = [];
  const body = projectId ? { project: projectId } : {};
  const response = await fetchWithTimeout2(`${endpoint}/v1internal:fetchAvailableModels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": quotaUserAgent
    },
    body: JSON.stringify(body)
  });
  if (response.ok) {
    return await response.json();
  }
  const message = await response.text().catch(() => "");
  const snippet = message.trim().slice(0, 200);
  errors.push(
    `fetchAvailableModels ${response.status} at ${endpoint}${snippet ? `: ${snippet}` : ""}`
  );
  throw new Error(errors.join("; ") || "fetchAvailableModels failed");
}
async function fetchGeminiCliQuota(accessToken, projectId) {
  const endpoint = ANTIGRAVITY_ENDPOINT_PROD;
  const platform = process.platform || "darwin";
  const arch = process.arch || "arm64";
  const geminiCliUserAgent = `GeminiCLI/1.0.0/gemini-2.5-pro (${platform}; ${arch})`;
  const body = projectId ? { project: projectId } : {};
  try {
    const response = await fetchWithTimeout2(`${endpoint}/v1internal:retrieveUserQuota`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": geminiCliUserAgent
      },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return { buckets: [] };
  } catch {
    return { buckets: [] };
  }
}
function aggregateGeminiCliQuota(response) {
  const models = [];
  if (!response.buckets || response.buckets.length === 0) {
    return { models };
  }
  for (const bucket of response.buckets) {
    if (!bucket.modelId) {
      continue;
    }
    const modelId = bucket.modelId;
    const isRelevantModel = modelId.startsWith("gemini-3") || modelId === "gemini-2.5-pro";
    if (!isRelevantModel) {
      continue;
    }
    models.push({
      modelId: bucket.modelId,
      remainingFraction: normalizeRemainingFraction(bucket.remainingFraction),
      resetTime: bucket.resetTime
    });
  }
  models.sort((a, b) => a.modelId.localeCompare(b.modelId));
  return { models };
}
function applyAccountUpdates(account, auth) {
  const parts = parseRefreshParts(auth.refresh);
  if (!parts.refreshToken) {
    return void 0;
  }
  const updated = {
    ...account,
    refreshToken: parts.refreshToken,
    projectId: parts.projectId ?? account.projectId,
    managedProjectId: parts.managedProjectId ?? account.managedProjectId
  };
  const changed = updated.refreshToken !== account.refreshToken || updated.projectId !== account.projectId || updated.managedProjectId !== account.managedProjectId;
  return changed ? updated : void 0;
}
var QUOTA_CHECK_CONCURRENCY = 3;
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  if (items.length === 0) {
    return results;
  }
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  let cursor2 = 0;
  const worker = async () => {
    while (true) {
      const index = cursor2;
      cursor2 += 1;
      if (index >= items.length) {
        break;
      }
      const item = items[index];
      if (item === void 0) {
        continue;
      }
      results[index] = await fn(item, index);
    }
  };
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
async function checkSingleAccountQuota(account, index, client2, providerId) {
  const disabled = account.enabled === false;
  let auth = buildAuthFromAccount(account);
  try {
    if (accessTokenExpired(auth)) {
      const refreshed = await refreshAccessToken(auth, client2, providerId);
      if (!refreshed) {
        throw new Error("Token refresh failed");
      }
      auth = refreshed;
    }
    const projectContext = await ensureProjectContext(auth);
    auth = projectContext.auth;
    const updatedAccount = applyAccountUpdates(account, auth);
    let quotaResult;
    let geminiCliQuotaResult;
    const [antigravityResponse, geminiCliResponse] = await Promise.all([
      fetchAvailableModels(auth.access ?? "", projectContext.effectiveProjectId).catch(() => ({ models: void 0 })),
      fetchGeminiCliQuota(auth.access ?? "", projectContext.effectiveProjectId)
    ]);
    if (antigravityResponse.models === void 0) {
      quotaResult = {
        groups: {},
        modelCount: 0,
        error: "Failed to fetch Antigravity quota"
      };
    } else {
      recordAntigravityAvailableModels(antigravityResponse.models);
      quotaResult = aggregateQuota(antigravityResponse.models);
    }
    geminiCliQuotaResult = aggregateGeminiCliQuota(geminiCliResponse);
    if (geminiCliResponse.buckets === void 0 || geminiCliResponse.buckets.length === 0) {
      geminiCliQuotaResult.error = geminiCliQuotaResult.models.length === 0 ? "No Gemini CLI quota available" : void 0;
    }
    for (const [family, groupQuota] of Object.entries(quotaResult.groups)) {
      const remainingPercent = (groupQuota.remainingFraction ?? 0) * 100;
      logQuotaStatus(account.email, index, remainingPercent, family);
    }
    return {
      index,
      email: account.email,
      status: "ok",
      disabled,
      quota: quotaResult,
      geminiCliQuota: geminiCliQuotaResult,
      updatedAccount
    };
  } catch (error) {
    logQuotaFetch(
      "error",
      void 0,
      `account=${account.email ?? index} error=${error instanceof Error ? error.message : String(error)}`
    );
    return {
      index,
      email: account.email,
      status: "error",
      disabled,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkAccountsQuota(accounts, client2, providerId = ANTIGRAVITY_PROVIDER_ID) {
  logQuotaFetch("start", accounts.length);
  const results = await mapWithConcurrency(
    accounts,
    QUOTA_CHECK_CONCURRENCY,
    (account, index) => checkSingleAccountQuota(account, index, client2, providerId)
  );
  logQuotaFetch(
    "complete",
    accounts.length,
    `ok=${results.filter((r) => r.status === "ok").length} errors=${results.filter((r) => r.status === "error").length}`
  );
  return results;
}

// src/plugin/refresh-queue.ts
var log9 = createLogger("refresh-queue");
var DEFAULT_PROACTIVE_REFRESH_CONFIG = {
  enabled: true,
  bufferSeconds: 1800,
  // 30 minutes
  checkIntervalSeconds: 300
  // 5 minutes
};
var MAX_CONSECUTIVE_REFRESH_FAILURES = 3;
var REFRESH_BACKOFF_BASE_MS = 15 * 60 * 1e3;
var REFRESH_BACKOFF_MAX_MS = 6 * 60 * 60 * 1e3;
var ProactiveRefreshQueue = class {
  config;
  client;
  providerId;
  accountManager = null;
  /**
   * Per-account failure tracking, keyed by a stable identifier (email or refresh
   * token) rather than array index, so it survives account list reordering.
   */
  failureTracking = /* @__PURE__ */ new Map();
  state = {
    isRunning: false,
    intervalHandle: null,
    isRefreshing: false,
    lastCheckTime: 0,
    lastRefreshTime: 0,
    refreshCount: 0,
    errorCount: 0
  };
  constructor(client2, providerId, config) {
    this.client = client2;
    this.providerId = providerId;
    this.config = {
      ...DEFAULT_PROACTIVE_REFRESH_CONFIG,
      ...config
    };
  }
  /**
   * Set the account manager to use for refresh operations.
   * Must be called before start().
   */
  setAccountManager(manager) {
    this.accountManager = manager;
  }
  /**
   * Check if a token needs proactive refresh.
   * Returns true if the token expires within the buffer period.
   */
  needsRefresh(account) {
    if (!account.expires) {
      return false;
    }
    const now = Date.now();
    const bufferMs = this.config.bufferSeconds * 1e3;
    const refreshThreshold = now + bufferMs;
    return account.expires <= refreshThreshold;
  }
  /**
   * Check if a token is already expired.
   */
  isExpired(account) {
    if (!account.expires) {
      return false;
    }
    return account.expires <= Date.now();
  }
  /**
   * Get all accounts that need proactive refresh.
   */
  getAccountsNeedingRefresh() {
    if (!this.accountManager) {
      return [];
    }
    return this.accountManager.getAccounts().filter((account) => {
      if (account.enabled === false) {
        return false;
      }
      if (this.isExpired(account)) {
        return false;
      }
      return this.needsRefresh(account);
    });
  }
  /**
   * Derive a stable identifier for an account for failure tracking.
   * Prefers email, falls back to refresh token, then to index.
   */
  getAccountKey(account) {
    return account.email ?? account.parts?.refreshToken ?? `index:${account.index}`;
  }
  /**
   * Drop failure-tracking entries that no longer correspond to any current
   * account identity. Accounts can be removed (or churned via manager
   * replacement) after failing; without pruning, their email/token keys would
   * linger in this long-lived map forever. Cheap O(accounts + entries) set-diff.
   */
  pruneFailureTracking() {
    if (this.failureTracking.size === 0 || !this.accountManager) {
      return;
    }
    const liveKeys = new Set(
      this.accountManager.getAccounts().map((account) => this.getAccountKey(account))
    );
    for (const key of this.failureTracking.keys()) {
      if (!liveKeys.has(key)) {
        this.failureTracking.delete(key);
      }
    }
  }
  /**
   * Whether the account is currently in a proactive-refresh backoff window.
   */
  isInRefreshBackoff(account, now) {
    const state = this.failureTracking.get(this.getAccountKey(account));
    return state !== void 0 && state.skipUntil > now;
  }
  /**
   * Clear failure tracking for an account after a successful refresh.
   *
   * A successful refresh may rotate the account's refresh token. For email-less
   * accounts the tracking key IS the refresh token, so the key derived after the
   * update differs from the one the failure was recorded under. Pass the
   * pre-update key so both the old and new keys are cleared and no stale entry
   * is orphaned.
   */
  recordRefreshSuccess(account, previousKey) {
    this.failureTracking.delete(this.getAccountKey(account));
    if (previousKey !== void 0) {
      this.failureTracking.delete(previousKey);
    }
  }
  /**
   * Record a failed proactive refresh. After the threshold is crossed, the
   * account is skipped for an escalating backoff window.
   */
  recordRefreshFailure(account, now) {
    const key = this.getAccountKey(account);
    const state = this.failureTracking.get(key) ?? { consecutiveFailures: 0, skipUntil: 0 };
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= MAX_CONSECUTIVE_REFRESH_FAILURES) {
      const exponent = state.consecutiveFailures - MAX_CONSECUTIVE_REFRESH_FAILURES;
      const backoffMs = Math.min(REFRESH_BACKOFF_MAX_MS, REFRESH_BACKOFF_BASE_MS * 2 ** exponent);
      state.skipUntil = now + backoffMs;
      log9.warn("Account entering proactive-refresh backoff", {
        accountIndex: account.index,
        email: account.email ?? "unknown",
        consecutiveFailures: state.consecutiveFailures,
        backoffMinutes: Math.round(backoffMs / 6e4)
      });
    }
    this.failureTracking.set(key, state);
  }
  /**
   * Perform a single refresh check iteration.
   * This is called periodically by the background interval.
   */
  async runRefreshCheck() {
    if (this.state.isRefreshing) {
      return;
    }
    if (!this.accountManager) {
      return;
    }
    this.state.isRefreshing = true;
    this.state.lastCheckTime = Date.now();
    try {
      this.pruneFailureTracking();
      const accountsToRefresh = this.getAccountsNeedingRefresh();
      if (accountsToRefresh.length === 0) {
        return;
      }
      log9.debug("Found accounts needing refresh", { count: accountsToRefresh.length });
      for (const account of accountsToRefresh) {
        if (!this.state.isRunning) {
          break;
        }
        if (this.isInRefreshBackoff(account, Date.now())) {
          log9.debug("Skipping account in proactive-refresh backoff", {
            accountIndex: account.index,
            email: account.email ?? "unknown"
          });
          continue;
        }
        try {
          const auth = this.accountManager.toAuthDetails(account);
          const keyBeforeUpdate = this.getAccountKey(account);
          const refreshed = await this.refreshToken(auth, account);
          if (refreshed) {
            this.accountManager.updateFromAuth(account, refreshed);
            this.recordRefreshSuccess(account, keyBeforeUpdate);
            this.state.refreshCount++;
            this.state.lastRefreshTime = Date.now();
            try {
              await this.accountManager.saveToDisk();
            } catch {
            }
          } else {
            this.state.errorCount++;
            this.recordRefreshFailure(account, Date.now());
            log9.warn("Proactive refresh returned no token", {
              accountIndex: account.index,
              email: account.email ?? "unknown"
            });
          }
        } catch (error) {
          this.state.errorCount++;
          this.recordRefreshFailure(account, Date.now());
          log9.warn("Failed to refresh account", {
            accountIndex: account.index,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } finally {
      this.state.isRefreshing = false;
    }
  }
  /**
   * Refresh a single token.
   */
  async refreshToken(auth, account) {
    const minutesUntilExpiry = account.expires ? Math.round((account.expires - Date.now()) / 6e4) : "unknown";
    log9.debug("Proactively refreshing token", {
      accountIndex: account.index,
      email: account.email ?? "unknown",
      minutesUntilExpiry
    });
    return refreshAccessToken(auth, this.client, this.providerId);
  }
  /**
   * Start the background refresh queue.
   */
  start() {
    if (this.state.isRunning) {
      return;
    }
    if (!this.config.enabled) {
      log9.debug("Proactive refresh disabled by config");
      return;
    }
    this.state.isRunning = true;
    const intervalMs = this.config.checkIntervalSeconds * 1e3;
    log9.debug("Started proactive refresh queue", {
      checkIntervalSeconds: this.config.checkIntervalSeconds,
      bufferSeconds: this.config.bufferSeconds
    });
    setTimeout(() => {
      if (this.state.isRunning) {
        this.runRefreshCheck().catch((error) => {
          log9.error("Initial check failed", {
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }
    }, 5e3);
    this.state.intervalHandle = setInterval(() => {
      this.runRefreshCheck().catch((error) => {
        log9.error("Check failed", {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, intervalMs);
  }
  /**
   * Stop the background refresh queue.
   */
  stop() {
    if (!this.state.isRunning) {
      return;
    }
    this.state.isRunning = false;
    if (this.state.intervalHandle) {
      clearInterval(this.state.intervalHandle);
      this.state.intervalHandle = null;
    }
    log9.debug("Stopped proactive refresh queue", {
      refreshCount: this.state.refreshCount,
      errorCount: this.state.errorCount
    });
  }
  /**
   * Get current queue statistics.
   */
  getStats() {
    return { ...this.state };
  }
  /**
   * Check if the queue is currently running.
   */
  isRunning() {
    return this.state.isRunning;
  }
};
function createProactiveRefreshQueue(client2, providerId, config) {
  return new ProactiveRefreshQueue(client2, providerId, config);
}

// src/plugin/version.ts
var VERSION_URL = "https://antigravity-auto-updater-974169037036.us-central1.run.app";
var CHANGELOG_URL = "https://antigravity.google/changelog";
var FETCH_TIMEOUT_MS3 = 5e3;
var CHANGELOG_SCAN_CHARS = 5e3;
var VERSION_REGEX = /\d+\.\d+\.\d+/;
function parseVersion(text) {
  const match = text.match(VERSION_REGEX);
  return match ? match[0] : null;
}
async function tryFetchVersion(url, maxChars) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS3);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    let text = await response.text();
    if (maxChars) text = text.slice(0, maxChars);
    return parseVersion(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function initAntigravityVersion() {
  const log13 = createLogger("version");
  const fallback = getAntigravityVersion();
  let version;
  let source;
  version = await tryFetchVersion(VERSION_URL);
  if (version) {
    source = "api";
  } else {
    version = await tryFetchVersion(CHANGELOG_URL, CHANGELOG_SCAN_CHARS);
    if (version) {
      source = "changelog";
    } else {
      source = "fallback";
      setAntigravityVersion(fallback);
      log13.info("version-fetch-failed", { fallback });
      return;
    }
  }
  if (version !== fallback) {
    log13.info("version-updated", { version, source, previous: fallback });
  } else {
    log13.debug("version-unchanged", { version, source });
  }
  setAntigravityVersion(version);
}

// src/plugin/search.ts
var log10 = createLogger("search");
var sessionCounter = 0;
var sessionPrefix = `search-${Date.now().toString(36)}`;
function generateRequestId() {
  return `search-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function getSessionId() {
  sessionCounter++;
  return `${sessionPrefix}-${sessionCounter}`;
}
function formatSearchResult(result) {
  const lines = [];
  lines.push("## Search Results\n");
  lines.push(result.text);
  lines.push("");
  if (result.sources.length > 0) {
    lines.push("### Sources");
    for (const source of result.sources) {
      lines.push(`- [${source.title}](${source.url})`);
    }
    lines.push("");
  }
  if (result.urlsRetrieved.length > 0) {
    lines.push("### URLs Retrieved");
    for (const url of result.urlsRetrieved) {
      const status = url.status === "URL_RETRIEVAL_STATUS_SUCCESS" ? "\u2713" : "\u2717";
      lines.push(`- ${status} ${url.url}`);
    }
    lines.push("");
  }
  if (result.searchQueries.length > 0) {
    lines.push("### Search Queries Used");
    for (const q of result.searchQueries) {
      lines.push(`- "${q}"`);
    }
  }
  return lines.join("\n");
}
function parseSearchResponse(data) {
  const result = {
    text: "",
    sources: [],
    searchQueries: [],
    urlsRetrieved: []
  };
  const response = data.response;
  if (!response || !response.candidates || response.candidates.length === 0) {
    if (data.error) {
      result.text = `Error: ${data.error.message ?? "Unknown error"}`;
    } else if (response?.error) {
      result.text = `Error: ${response.error.message ?? "Unknown error"}`;
    }
    return result;
  }
  const candidate = response.candidates[0];
  if (!candidate) {
    return result;
  }
  if (candidate.content?.parts) {
    result.text = candidate.content.parts.map((p) => p.text ?? "").filter(Boolean).join("\n");
  }
  if (candidate.groundingMetadata) {
    const groundingMeta = candidate.groundingMetadata;
    if (groundingMeta.webSearchQueries) {
      result.searchQueries = groundingMeta.webSearchQueries;
    }
    if (groundingMeta.groundingChunks) {
      for (const chunk of groundingMeta.groundingChunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          result.sources.push({
            title: chunk.web.title,
            url: chunk.web.uri
          });
        }
      }
    }
  }
  if (candidate.urlContextMetadata?.url_metadata) {
    for (const meta of candidate.urlContextMetadata.url_metadata) {
      if (meta.retrieved_url) {
        result.urlsRetrieved.push({
          url: meta.retrieved_url,
          status: meta.url_retrieval_status ?? "UNKNOWN"
        });
      }
    }
  }
  return result;
}
async function executeSearch(args, accessToken, projectId, abortSignal) {
  const { query, urls, thinking = true } = args;
  let prompt = query;
  if (urls && urls.length > 0) {
    const urlList = urls.join("\n");
    prompt = `${query}

URLs to analyze:
${urlList}`;
  }
  const tools = [];
  tools.push({ googleSearch: {} });
  if (urls && urls.length > 0) {
    tools.push({ urlContext: {} });
  }
  const requestPayload = {
    systemInstruction: {
      parts: [{ text: SEARCH_SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    tools,
    generationConfig: {
      temperature: 0,
      topP: 1
    }
  };
  const wrappedBody = {
    project: projectId,
    model: SEARCH_MODEL,
    userAgent: "antigravity",
    requestId: generateRequestId(),
    request: {
      ...requestPayload,
      sessionId: getSessionId()
    }
  };
  const url = `${ANTIGRAVITY_ENDPOINT}/v1internal:generateContent`;
  log10.debug("Executing search", {
    query,
    urlCount: urls?.length ?? 0,
    thinking
  });
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...getAntigravityHeaders(),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(wrappedBody),
      signal: abortSignal ?? AbortSignal.timeout(SEARCH_TIMEOUT_MS)
    });
    if (!response.ok) {
      const errorText = await response.text();
      log10.debug("Search API error", { status: response.status, error: errorText });
      return `## Search Error

Failed to execute search: ${response.status} ${response.statusText}

${errorText}

Please try again with a different query.`;
    }
    const data = await response.json();
    log10.debug("Search response received", { hasResponse: !!data.response });
    const result = parseSearchResponse(data);
    const formatted = formatSearchResult(result);
    log10.debug("Search response formatted", { resultLength: formatted.length });
    return formatted;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log10.debug("Search execution error", { error: message });
    return `## Search Error

Failed to execute search: ${message}. Please try again with a different query.`;
  }
}

// src/plugin/api-key.ts
var rateLimitedUntilByKey = /* @__PURE__ */ new Map();
var cursor = 0;
var GEMINI_MODELS_LIST_TIMEOUT_MS = 1e4;
var GEMINI_MODELS_LIST_MAX_PAGES = 20;
function isRetryableAgySdkCredentialStatus(status) {
  return status === 401 || status === 403 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 529;
}
async function requestBodyText(request) {
  if (!request.body) return void 0;
  try {
    return await request.clone().text();
  } catch {
    return void 0;
  }
}
function splitEnvList(value) {
  if (!value) return [];
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}
function dedupeCredentials(credentials) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const credential of credentials) {
    if (seen.has(credential.apiKey)) continue;
    seen.add(credential.apiKey);
    result.push(credential);
  }
  return result;
}
function getAgySdkCredentials(config, auth) {
  if (!config.agy_sdk.enabled) return [];
  const credentials = [];
  if (auth?.key?.trim()) {
    credentials.push({ label: "opencode api key", apiKey: auth.key.trim() });
  }
  for (const project of config.agy_sdk.cloud_projects) {
    if (project.enabled === false) continue;
    credentials.push({
      label: project.label?.trim() || project.project_id?.trim() || "cloud project",
      apiKey: project.api_key.trim(),
      projectId: project.project_id?.trim() || void 0
    });
  }
  const envKeys = splitEnvList(process.env.OPENCODE_ANTIGRAVITY_API_KEYS);
  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    ...envKeys
  ].map((apiKey) => apiKey?.trim()).filter((apiKey) => Boolean(apiKey));
  for (const apiKey of envCandidates) {
    credentials.push({ label: "environment", apiKey });
  }
  return dedupeCredentials(credentials);
}
function selectAgySdkCredential(credentials) {
  if (credentials.length === 0) return null;
  const now = Date.now();
  for (let attempts = 0; attempts < credentials.length; attempts += 1) {
    const index = cursor % credentials.length;
    cursor += 1;
    const credential = credentials[index];
    if (!credential) continue;
    const limitedUntil = rateLimitedUntilByKey.get(credential.apiKey) ?? 0;
    if (limitedUntil <= now) {
      return credential;
    }
  }
  return null;
}
function markAgySdkCredentialRateLimited(credential, retryAfterMs) {
  rateLimitedUntilByKey.set(credential.apiKey, Date.now() + Math.max(1e3, retryAfterMs));
}
function retryAfterMsFromResponse(response, fallbackMs) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return fallbackMs;
  const parsed = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed * 1e3;
  }
  return fallbackMs;
}
function isApiKeyAuth(auth) {
  if (!auth || typeof auth !== "object") return false;
  const candidate = auth;
  return (candidate.type === "api" || candidate.type === "api_key") && typeof candidate.key === "string";
}
function canRouteAsPublicGeminiApiModel(model) {
  const m = model.toLowerCase();
  if (m.includes("claude")) return false;
  const isAntigravityPrefixed = m.startsWith("antigravity-");
  const stripped = m.replace(/^antigravity-/, "").replace(/-(minimal|low|medium|high)$/, "");
  if (mapAntigravityModelToPublicApi(stripped)) return true;
  if (getPublicGeminiApiModelIds()?.has(stripped)) return true;
  if (isAntigravityPrefixed) {
    return /^gemini-/.test(stripped) && !ANTIGRAVITY_ONLY_BARE_GEMINI_IDS.has(stripped);
  }
  return !ANTIGRAVITY_ONLY_BARE_GEMINI_IDS.has(stripped);
}
function isAgySdkSupportedRequest(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.hostname !== "generativelanguage.googleapis.com") return false;
  const model = extractGeminiModelFromUrl(url.toString());
  if (!model || !model.toLowerCase().includes("gemini") || isImageGenerationModel(model)) return false;
  return canRouteAsPublicGeminiApiModel(model);
}
function isAntigravityOnlyGenerativeLanguageRequest(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.hostname !== "generativelanguage.googleapis.com") return false;
  const model = extractGeminiModelFromUrl(url.toString());
  if (!model) return false;
  return isLikelyAntigravityOnlyModel(model) && !canRouteAsPublicGeminiApiModel(model);
}
function extractRequestedGeminiModel(urlString) {
  return extractGeminiModelFromUrl(urlString);
}
var PUBLIC_GEMINI_API_MODEL_SUGGESTIONS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash"
];
var ANTIGRAVITY_ONLY_BARE_GEMINI_IDS = /* @__PURE__ */ new Set([
  "gemini-3-pro",
  "gemini-3-flash",
  "gemini-3.1-pro",
  "gemini-3.1-flash"
]);
function isLikelyAntigravityOnlyModel(model) {
  const m = model.toLowerCase();
  if (m.startsWith("antigravity-")) return true;
  if (m.includes("claude")) return true;
  return ANTIGRAVITY_ONLY_BARE_GEMINI_IDS.has(m);
}
function buildAntigravityModelGuidanceMessage(requestedModel, originalMessage) {
  const suggestions = PUBLIC_GEMINI_API_MODEL_SUGGESTIONS.join(", ");
  const antigravityOnly = isLikelyAntigravityOnlyModel(requestedModel);
  const lines = [
    `Model '${requestedModel}' was sent to the public Gemini API (v1beta) and rejected as NOT_FOUND.`
  ];
  if (antigravityOnly) {
    lines.push(
      "",
      "This model id is served by the Antigravity Code Assist backend, not the public Gemini API.",
      "The plugin's API-key path forwarded the request unchanged because either:",
      "  \u2022 opencode's 'google' provider is in API-key mode (no OAuth session), or",
      "  \u2022 all OAuth Antigravity accounts were rate-limited and `agy_sdk.api_key_fallback` kicked in.",
      "",
      "To reach this model, re-authenticate with OAuth:",
      "  opencode auth logout google",
      "  opencode auth login   # choose Google \u2192 OAuth with Google (Antigravity)"
    );
  } else {
    lines.push(
      "",
      "The model id was forwarded to the public Gemini API verbatim. Double-check the spelling,",
      "or pick a model that's actually published on v1beta."
    );
  }
  lines.push("", `Public-API models known to work: ${suggestions}.`);
  if (originalMessage) {
    lines.push("", `(Underlying Gemini API error: ${originalMessage})`);
  }
  return lines.join("\n");
}
async function enhanceAgySdkErrorResponse(response, requestedModel) {
  if (response.status !== 404 || !requestedModel) return response;
  let body;
  try {
    body = JSON.parse(await response.clone().text());
  } catch {
    return response;
  }
  const originalMessage = body.error?.message ?? "";
  const looksLikeModelNotFound = /not (?:found|supported)/i.test(originalMessage) && originalMessage.toLowerCase().includes("model");
  if (!looksLikeModelNotFound) return response;
  const enhanced = {
    error: {
      code: body.error?.code ?? 404,
      message: buildAntigravityModelGuidanceMessage(requestedModel, originalMessage),
      status: body.error?.status ?? "NOT_FOUND"
    }
  };
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(enhanced), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
function createAntigravityOnlyModelErrorResponse(requestedModel) {
  const body = {
    error: {
      code: 404,
      message: buildAntigravityModelGuidanceMessage(requestedModel),
      status: "NOT_FOUND"
    }
  };
  return new Response(JSON.stringify(body), {
    status: 404,
    statusText: "Not Found",
    headers: { "content-type": "application/json" }
  });
}
function extractGeminiModelFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname.match(/\/models\/([^:]+):(\w+)/)?.[1];
  } catch {
    return void 0;
  }
}
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function toThinkingTier(value) {
  if (value === "low" || value === "medium" || value === "high") return value;
  return void 0;
}
function thinkingLevelFromBudget(budget) {
  if (budget <= 8192) return "low";
  if (budget <= 16384) return "medium";
  return "high";
}
function mergeExtraBody(payload) {
  const extraBody = isRecord(payload.extra_body) ? payload.extra_body : isRecord(payload.extraBody) ? payload.extraBody : void 0;
  if (!extraBody) return void 0;
  if (isRecord(extraBody.generationConfig)) {
    const generationConfig = isRecord(payload.generationConfig) ? payload.generationConfig : {};
    for (const [key, value] of Object.entries(extraBody.generationConfig)) {
      if (!(key in generationConfig)) {
        generationConfig[key] = value;
      }
    }
    payload.generationConfig = generationConfig;
  }
  for (const [key, value] of Object.entries(extraBody)) {
    if (!(key in payload)) {
      payload[key] = value;
    }
  }
  return extraBody;
}
function applyAgySdkGeminiBodyTransforms(payload, model, thinkingLevel) {
  const generationConfig = isRecord(payload.generationConfig) ? payload.generationConfig : {};
  const extraBody = mergeExtraBody(payload);
  sanitizeGeminiGenerationConfigForModel(payload, model);
  const variantConfig = extractVariantThinkingConfig(
    isRecord(payload.providerOptions) ? payload.providerOptions : void 0,
    generationConfig
  );
  const extraThinkingConfig = isRecord(extraBody?.thinkingConfig) ? extraBody.thinkingConfig : void 0;
  const existingThinkingConfig = isRecord(generationConfig.thinkingConfig) ? generationConfig.thinkingConfig : extraThinkingConfig ? { ...extraThinkingConfig } : {};
  if (isGemini3Model(model)) {
    const resolvedLevel = variantConfig?.thinkingLevel ?? (typeof existingThinkingConfig.thinkingLevel === "string" ? existingThinkingConfig.thinkingLevel : void 0) ?? (variantConfig?.thinkingBudget !== void 0 ? thinkingLevelFromBudget(variantConfig.thinkingBudget) : void 0) ?? thinkingLevel ?? "low";
    existingThinkingConfig.thinkingLevel = resolvedLevel;
    if (variantConfig?.includeThoughts !== void 0) {
      existingThinkingConfig.includeThoughts = variantConfig.includeThoughts;
    } else if (typeof existingThinkingConfig.includeThoughts !== "boolean") {
      existingThinkingConfig.includeThoughts = true;
    }
  } else if (variantConfig?.thinkingBudget !== void 0 || typeof existingThinkingConfig.thinkingBudget === "number") {
    existingThinkingConfig.thinkingBudget = variantConfig?.thinkingBudget ?? existingThinkingConfig.thinkingBudget;
    if (variantConfig?.includeThoughts !== void 0) {
      existingThinkingConfig.includeThoughts = variantConfig.includeThoughts;
    } else if (typeof existingThinkingConfig.includeThoughts !== "boolean") {
      existingThinkingConfig.includeThoughts = true;
    }
  }
  if (Object.keys(existingThinkingConfig).length > 0) {
    generationConfig.thinkingConfig = existingThinkingConfig;
    payload.generationConfig = generationConfig;
  }
  if (Array.isArray(payload.tools) || variantConfig?.googleSearch) {
    applyGeminiTransforms(payload, {
      model,
      tierThinkingLevel: toThinkingTier(typeof generationConfig.thinkingConfig === "object" && generationConfig.thinkingConfig && "thinkingLevel" in generationConfig.thinkingConfig ? String(generationConfig.thinkingConfig.thinkingLevel) : void 0),
      googleSearch: variantConfig?.googleSearch
    });
  }
  delete payload.model;
  delete payload.providerOptions;
  delete payload.extra_body;
  delete payload.extraBody;
  delete payload.thinkingConfig;
  delete payload.thinking;
}
async function prepareAgySdkGeminiRequest(input3, init, credential) {
  const requestInput = typeof input3 === "string" ? void 0 : input3;
  const urlString = requestInput?.url ?? input3.toString();
  const url = new URL(urlString);
  const match = url.pathname.match(/\/models\/([^:]+):(\w+)/);
  const rawModel = match?.[1] ?? void 0;
  const action = match?.[2] ?? void 0;
  const resolved = rawModel ? resolveModelForHeaderStyle(rawModel, "agy-sdk") : void 0;
  if (resolved && action) {
    url.pathname = url.pathname.replace(`/models/${rawModel}:${action}`, `/models/${resolved.actualModel}:${action}`);
  }
  url.searchParams.delete("key");
  const headers = new Headers(init?.headers ?? requestInput?.headers ?? {});
  headers.delete("Authorization");
  headers.delete("x-api-key");
  headers.set("x-goog-api-key", credential.apiKey);
  headers.delete("x-goog-user-project");
  const requestTextBody = init?.body === void 0 && requestInput ? await requestBodyText(requestInput) : void 0;
  const originalBody = init?.body ?? requestTextBody ?? requestInput?.body ?? void 0;
  let body = originalBody;
  if (typeof body === "string" && body.trim()) {
    try {
      const payload = JSON.parse(body);
      applyAgySdkGeminiBodyTransforms(payload, resolved?.actualModel ?? rawModel ?? "", resolved?.thinkingLevel);
      body = JSON.stringify(payload);
    } catch {
      body = originalBody;
    }
  }
  return {
    request: url.toString(),
    init: {
      method: requestInput?.method,
      ...init,
      headers,
      body
    },
    model: resolved?.actualModel ?? rawModel
  };
}
async function fetchGeminiModelsPage(url, credential) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_MODELS_LIST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "x-goog-api-key": credential.apiKey
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchWithAgySdkCredential(input3, init, credential, fallbackRetryAfterMs) {
  const prepared = await prepareAgySdkGeminiRequest(input3, init, credential);
  const response = await fetch(prepared.request, prepared.init);
  if (response.status === 429 || response.status === 503 || response.status === 529) {
    markAgySdkCredentialRateLimited(credential, retryAfterMsFromResponse(response, fallbackRetryAfterMs));
  }
  return enhanceAgySdkErrorResponse(response, prepared.model);
}
async function fetchGeminiApiModels(credential) {
  const models = [];
  let pageToken;
  const seenPageTokens = /* @__PURE__ */ new Set();
  for (let page = 0; page < GEMINI_MODELS_LIST_MAX_PAGES; page += 1) {
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        throw new Error(`Gemini models.list returned repeated page token for ${credential.label}`);
      }
      seenPageTokens.add(pageToken);
      url.searchParams.set("pageToken", pageToken);
    }
    const response = await fetchGeminiModelsPage(url.toString(), credential);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const snippet = body.trim().slice(0, 200);
      throw new Error(`Gemini models.list failed for ${credential.label}: ${response.status}${snippet ? ` ${snippet}` : ""}`);
    }
    const payload = await response.json();
    models.push(...payload.models ?? []);
    pageToken = payload.nextPageToken;
    if (!pageToken) return models;
  }
  throw new Error(`Gemini models.list exceeded ${GEMINI_MODELS_LIST_MAX_PAGES} pages for ${credential.label}`);
}

// src/plugin.ts
var MAX_OAUTH_ACCOUNTS = 10;
var MAX_WARMUP_SESSIONS = 1e3;
var MAX_WARMUP_RETRIES = 2;
var warmupAttemptCounts = /* @__PURE__ */ new Map();
var warmupSucceededSessionIds = /* @__PURE__ */ new Set();
var isChildSession = false;
var childSessionParentID = void 0;
var log11 = createLogger("plugin");
var rateLimitToastCooldowns = /* @__PURE__ */ new Map();
var RATE_LIMIT_TOAST_COOLDOWN_MS = 5e3;
var MAX_TOAST_COOLDOWN_ENTRIES = 100;
var softQuotaToastShown = false;
var rateLimitToastShown = false;
var activeAccountManager = null;
function cleanupToastCooldowns() {
  if (rateLimitToastCooldowns.size > MAX_TOAST_COOLDOWN_ENTRIES) {
    const now = Date.now();
    for (const [key, time] of rateLimitToastCooldowns) {
      if (now - time > RATE_LIMIT_TOAST_COOLDOWN_MS * 2) {
        rateLimitToastCooldowns.delete(key);
      }
    }
  }
}
function shouldShowRateLimitToast(message) {
  cleanupToastCooldowns();
  const toastKey = message.replace(/\d+/g, "X");
  const lastShown = rateLimitToastCooldowns.get(toastKey) ?? 0;
  const now = Date.now();
  if (now - lastShown < RATE_LIMIT_TOAST_COOLDOWN_MS) {
    return false;
  }
  rateLimitToastCooldowns.set(toastKey, now);
  return true;
}
function resetAllAccountsBlockedToasts() {
  softQuotaToastShown = false;
  rateLimitToastShown = false;
}
var quotaRefreshInProgressByEmail = /* @__PURE__ */ new Set();
function defaultRetryMsForConfig(config) {
  return (config.default_retry_after_seconds ?? 60) * 1e3;
}
async function tryFetchWithAgySdkCredentials(input3, init, credentials, fallbackRetryAfterMs) {
  if (credentials.length === 0) return null;
  const attempted = /* @__PURE__ */ new Set();
  let lastResponse = null;
  while (attempted.size < credentials.length) {
    const credential = selectAgySdkCredential(
      credentials.filter((candidate) => !attempted.has(candidate.apiKey))
    );
    if (!credential) {
      break;
    }
    attempted.add(credential.apiKey);
    const response = await fetchWithAgySdkCredential(input3, init, credential, fallbackRetryAfterMs);
    if (!isRetryableAgySdkCredentialStatus(response.status)) {
      return response;
    }
    lastResponse = response;
  }
  return lastResponse ?? new Response(
    JSON.stringify({ error: { message: "All Gemini API keys are temporarily rate-limited" } }),
    {
      status: 429,
      headers: { "content-type": "application/json" }
    }
  );
}
async function modelsFromAgySdkCredentials(config, auth) {
  if (!config.model_discovery.enabled || !config.model_discovery.gemini_api) return {};
  const credentials = getAgySdkCredentials(config, isApiKeyAuth(auth) ? auth : null);
  if (credentials.length === 0) return {};
  const errors = [];
  for (const credential of credentials) {
    try {
      const models = await fetchGeminiApiModels(credential);
      recordPublicGeminiApiModels(models);
      return modelsFromGeminiApi(models);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    log11.debug("gemini-model-discovery-failed", { errors: errors.map((error) => String(error)) });
  }
  return {};
}
async function modelsFromOAuthAuth(config, auth, client2, providerId) {
  if (!config.model_discovery.enabled || !config.model_discovery.antigravity) return {};
  let effectiveAuth = auth && isOAuthAuth(auth) ? auth : void 0;
  if (!effectiveAuth && activeAccountManager) {
    const accounts = activeAccountManager.getAccounts();
    const activeAccount = accounts.find((a) => a.enabled !== false && a.parts?.refreshToken);
    if (activeAccount) {
      effectiveAuth = {
        type: "oauth",
        refresh: formatRefreshParts(activeAccount.parts),
        access: activeAccount.access,
        expires: activeAccount.expires
      };
    }
  }
  if (!effectiveAuth) {
    const cached = getCachedAntigravityAvailableModels();
    if (cached) {
      return modelsFromAntigravityAvailableModels(cached);
    }
    return {};
  }
  let accessToken = effectiveAuth.access;
  if (!accessToken || accessTokenExpired(effectiveAuth)) {
    const refreshed = await refreshAccessToken(effectiveAuth, client2, providerId);
    accessToken = refreshed?.access;
  }
  if (!accessToken) {
    const cached = getCachedAntigravityAvailableModels();
    if (cached) {
      return modelsFromAntigravityAvailableModels(cached);
    }
    return {};
  }
  const parts = parseRefreshParts(effectiveAuth.refresh);
  const projectId = parts.managedProjectId || parts.projectId || ANTIGRAVITY_DEFAULT_PROJECT_ID;
  try {
    const response = await fetchAvailableModels(accessToken, projectId);
    if (response.models) {
      recordAntigravityAvailableModels(response.models);
    }
    return modelsFromAntigravityAvailableModels(response.models ?? {});
  } catch (error) {
    log11.debug("fetchAvailableModels-failed", { error: String(error) });
    const cached = getCachedAntigravityAvailableModels();
    if (cached) {
      return modelsFromAntigravityAvailableModels(cached);
    }
    return {};
  }
}
function hasProviderModelRuntimeShape(model) {
  return !!model && typeof model.api === "object" && model.api !== null && typeof model.capabilities === "object" && model.capabilities !== null;
}
function modalitiesToCapabilities(model, existing) {
  const modalities = model.modalities;
  const existingCapabilities = existing?.capabilities;
  const existingInput = existingCapabilities?.input;
  const existingOutput = existingCapabilities?.output;
  const input3 = modalities?.input ?? [];
  const output3 = modalities?.output ?? [];
  return {
    temperature: model.temperature ?? existingCapabilities?.temperature ?? true,
    reasoning: existingCapabilities?.reasoning ?? !!model.variants,
    attachment: existingCapabilities?.attachment ?? (input3.includes("image") || input3.includes("pdf")),
    toolcall: existingCapabilities?.toolcall ?? true,
    input: {
      text: existingInput?.text ?? input3.includes("text"),
      audio: existingInput?.audio ?? input3.includes("audio"),
      image: existingInput?.image ?? input3.includes("image"),
      video: existingInput?.video ?? input3.includes("video"),
      pdf: existingInput?.pdf ?? input3.includes("pdf")
    },
    output: {
      text: existingOutput?.text ?? output3.includes("text"),
      audio: existingOutput?.audio ?? output3.includes("audio"),
      image: existingOutput?.image ?? output3.includes("image"),
      video: existingOutput?.video ?? output3.includes("video"),
      pdf: existingOutput?.pdf ?? output3.includes("pdf")
    },
    interleaved: existingCapabilities?.interleaved ?? false
  };
}
function costForProviderModel(model, existing) {
  const existingCost = existing?.cost;
  const modelCost = model.cost;
  return {
    input: modelCost?.input ?? existingCost?.input ?? 0,
    output: modelCost?.output ?? existingCost?.output ?? 0,
    cache: existingCost?.cache ?? { read: 0, write: 0 }
  };
}
function normalizeProviderHookModels(providerId, provider, definitions, existingModels = provider.models ?? {}) {
  const normalized = {};
  const providerApi = typeof provider.api === "string" ? provider.api : "";
  const providerNpm = typeof provider.npm === "string" ? provider.npm : "@ai-sdk/google";
  for (const [id, model] of Object.entries(definitions)) {
    const existing = existingModels[id];
    if (hasProviderModelRuntimeShape(model)) {
      normalized[id] = model;
      continue;
    }
    const limit = model.limit;
    const existingLimit = existing?.limit;
    const existingApi = existing?.api;
    normalized[id] = {
      ...existing,
      ...model,
      id,
      providerID: existing?.providerID ?? provider.id ?? providerId,
      api: {
        id: existingApi?.id ?? id,
        url: existingApi?.url ?? providerApi,
        npm: existingApi?.npm ?? providerNpm
      },
      status: existing?.status ?? model.status ?? "active",
      headers: existing?.headers ?? model.headers ?? {},
      options: existing?.options ?? model.options ?? {},
      cost: costForProviderModel(model, existing),
      limit: {
        context: limit?.context ?? existingLimit?.context ?? 0,
        input: limit?.input ?? existingLimit?.input,
        output: limit?.output ?? existingLimit?.output ?? 0
      },
      capabilities: modalitiesToCapabilities(model, existing),
      release_date: existing?.release_date ?? model.release_date ?? ""
    };
  }
  return normalized;
}
async function tryAgySdkFallbackForRequest(input3, init, config, credentials, urlString) {
  if (!config.agy_sdk.api_key_fallback || credentials.length === 0 || !isAgySdkSupportedRequest(urlString)) {
    return null;
  }
  if (typeof input3 !== "string" && "bodyUsed" in input3 && input3.bodyUsed) {
    log11.warn("agy-sdk fallback skipped: original request body already consumed", {
      url: sanitizeUrlForLog(urlString)
    });
    return null;
  }
  return tryFetchWithAgySdkCredentials(
    input3,
    init,
    credentials,
    defaultRetryMsForConfig(config)
  );
}
async function triggerAsyncQuotaRefreshForAccount(accountManager, accountIndex, client2, providerId, intervalMinutes) {
  if (intervalMinutes <= 0) return;
  const accounts = accountManager.getAccounts();
  const account = accounts[accountIndex];
  if (!account || account.enabled === false) return;
  const accountKey = account.email ?? `idx-${accountIndex}`;
  if (quotaRefreshInProgressByEmail.has(accountKey)) return;
  const intervalMs = intervalMinutes * 60 * 1e3;
  const age = account.cachedQuotaUpdatedAt != null ? Date.now() - account.cachedQuotaUpdatedAt : Infinity;
  if (age < intervalMs) return;
  quotaRefreshInProgressByEmail.add(accountKey);
  try {
    const accountsForCheck = accountManager.getAccountsForQuotaCheck();
    const singleAccount = accountsForCheck[accountIndex];
    if (!singleAccount) {
      quotaRefreshInProgressByEmail.delete(accountKey);
      return;
    }
    const results = await checkAccountsQuota([singleAccount], client2, providerId);
    if (results[0]?.status === "ok" && results[0]?.quota?.groups) {
      accountManager.updateQuotaCache(accountIndex, results[0].quota.groups);
      accountManager.requestSaveToDisk();
    }
  } catch (err) {
    log11.debug(`quota-refresh-failed email=${accountKey}`, { error: String(err) });
  } finally {
    quotaRefreshInProgressByEmail.delete(accountKey);
  }
}
function trackWarmupAttempt(sessionId) {
  if (warmupSucceededSessionIds.has(sessionId)) {
    return false;
  }
  const attempts = getWarmupAttemptCount(sessionId);
  if (attempts >= MAX_WARMUP_RETRIES) {
    return false;
  }
  if (!warmupAttemptCounts.has(sessionId) && warmupAttemptCounts.size >= MAX_WARMUP_SESSIONS) {
    const first = warmupAttemptCounts.keys().next().value;
    if (first !== void 0) {
      warmupAttemptCounts.delete(first);
      warmupSucceededSessionIds.delete(first);
    }
  }
  warmupAttemptCounts.set(sessionId, attempts + 1);
  return true;
}
function getWarmupAttemptCount(sessionId) {
  return warmupAttemptCounts.get(sessionId) ?? 0;
}
function markWarmupSuccess(sessionId) {
  warmupSucceededSessionIds.add(sessionId);
  warmupAttemptCounts.delete(sessionId);
  if (warmupSucceededSessionIds.size >= MAX_WARMUP_SESSIONS) {
    const first = warmupSucceededSessionIds.values().next().value;
    if (first) warmupSucceededSessionIds.delete(first);
  }
}
function isWSL2() {
  if (process.platform !== "linux") return false;
  try {
    const { readFileSync: readFileSync9 } = __require("node:fs");
    const release = readFileSync9("/proc/version", "utf8").toLowerCase();
    return release.includes("microsoft") || release.includes("wsl");
  } catch {
    return false;
  }
}
function isWSL22() {
  if (!isWSL2()) return false;
  try {
    const { readFileSync: readFileSync9 } = __require("node:fs");
    const version = readFileSync9("/proc/version", "utf8").toLowerCase();
    return version.includes("wsl2") || version.includes("microsoft-standard");
  } catch {
    return false;
  }
}
function isRemoteEnvironment2() {
  if (process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION) {
    return true;
  }
  if (process.env.REMOTE_CONTAINERS || process.env.CODESPACES) {
    return true;
  }
  if (process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY && !isWSL2()) {
    return true;
  }
  return false;
}
function shouldSkipLocalServer() {
  return isWSL22() || isRemoteEnvironment2();
}
async function openBrowser(url) {
  try {
    if (process.platform === "darwin") {
      exec(`open "${url}"`);
      return true;
    }
    if (process.platform === "win32") {
      exec(`start "" "${url}"`);
      return true;
    }
    if (isWSL2()) {
      try {
        exec(`wslview "${url}"`);
        return true;
      } catch {
      }
    }
    if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
      return false;
    }
    exec(`xdg-open "${url}"`);
    return true;
  } catch {
    return false;
  }
}
function decodeEscapedText(input3) {
  return input3.replace(/&amp;/g, "&").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}
function normalizeGoogleVerificationUrl(rawUrl) {
  const normalized = decodeEscapedText(rawUrl).trim();
  if (!normalized) {
    return void 0;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname !== "accounts.google.com") {
      return void 0;
    }
    return parsed.toString();
  } catch {
    return void 0;
  }
}
function selectBestVerificationUrl(urls) {
  const unique = Array.from(new Set(urls.map((url) => normalizeGoogleVerificationUrl(url)).filter(Boolean)));
  if (unique.length === 0) {
    return void 0;
  }
  unique.sort((a, b) => {
    const score = (value) => {
      let total = 0;
      if (value.includes("plt=")) total += 4;
      if (value.includes("/signin/continue")) total += 3;
      if (value.includes("continue=")) total += 2;
      if (value.includes("service=cloudcode")) total += 1;
      return total;
    };
    return score(b) - score(a);
  });
  return unique[0];
}
function extractVerificationErrorDetails(bodyText) {
  const decodedBody = decodeEscapedText(bodyText);
  const lowerBody = decodedBody.toLowerCase();
  let validationRequired = lowerBody.includes("validation_required");
  let message;
  const verificationUrls = /* @__PURE__ */ new Set();
  const collectUrlsFromText = (text) => {
    for (const match of text.matchAll(/https:\/\/accounts\.google\.com\/[^\s"'<>]+/gi)) {
      if (match[0]) {
        verificationUrls.add(match[0]);
      }
    }
  };
  collectUrlsFromText(decodedBody);
  const payloads = [];
  const trimmed = decodedBody.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      payloads.push(JSON.parse(trimmed));
    } catch {
    }
  }
  for (const rawLine of decodedBody.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) {
      continue;
    }
    const payloadText = line.slice(5).trim();
    if (!payloadText || payloadText === "[DONE]") {
      continue;
    }
    try {
      payloads.push(JSON.parse(payloadText));
    } catch {
      collectUrlsFromText(payloadText);
    }
  }
  const visited = /* @__PURE__ */ new Set();
  const walk = (value, key) => {
    if (typeof value === "string") {
      const normalizedValue = decodeEscapedText(value);
      const lowerValue = normalizedValue.toLowerCase();
      const lowerKey = key?.toLowerCase() ?? "";
      if (lowerValue.includes("validation_required")) {
        validationRequired = true;
      }
      if (!message && (lowerKey.includes("message") || lowerKey.includes("detail") || lowerKey.includes("description"))) {
        message = normalizedValue;
      }
      if (lowerKey.includes("validation_url") || lowerKey.includes("verify_url") || lowerKey.includes("verification_url") || lowerKey === "url") {
        verificationUrls.add(normalizedValue);
      }
      collectUrlsFromText(normalizedValue);
      return;
    }
    if (!value || typeof value !== "object" || visited.has(value)) {
      return;
    }
    visited.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    for (const [childKey, childValue] of Object.entries(value)) {
      walk(childValue, childKey);
    }
  };
  for (const payload of payloads) {
    walk(payload);
  }
  if (!validationRequired) {
    validationRequired = lowerBody.includes("verification required") || lowerBody.includes("verify your account") || lowerBody.includes("account verification");
  }
  if (!message) {
    const fallback = decodedBody.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("data:") && /(verify|validation|required)/i.test(line));
    if (fallback) {
      message = fallback;
    }
  }
  return {
    validationRequired,
    message,
    verifyUrl: selectBestVerificationUrl([...verificationUrls])
  };
}
function isModelPermissionDeniedOnProjectError(bodyText) {
  const decoded = decodeEscapedText(bodyText).toLowerCase();
  return decoded.includes("permission denied on resource project");
}
async function verifyAccountAccess(account, client2, providerId) {
  const parsed = parseRefreshParts(account.refreshToken);
  if (!parsed.refreshToken) {
    return { status: "error", message: "Missing refresh token for selected account." };
  }
  const auth = {
    type: "oauth",
    refresh: formatRefreshParts({
      refreshToken: parsed.refreshToken,
      projectId: parsed.projectId ?? account.projectId,
      managedProjectId: parsed.managedProjectId ?? account.managedProjectId
    }),
    access: "",
    expires: 0
  };
  let refreshedAuth;
  try {
    refreshedAuth = await refreshAccessToken(auth, client2, providerId);
  } catch (error) {
    if (error instanceof AntigravityTokenRefreshError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: `Token refresh failed: ${String(error)}` };
  }
  if (!refreshedAuth?.access) {
    return { status: "error", message: "Could not refresh access token for this account." };
  }
  const projectId = parsed.managedProjectId ?? parsed.projectId ?? account.managedProjectId ?? account.projectId ?? ANTIGRAVITY_DEFAULT_PROJECT_ID;
  const headers = {
    ...getAntigravityHeaders(),
    Authorization: `Bearer ${refreshedAuth.access}`,
    "Content-Type": "application/json"
  };
  const requestBody = {
    project: projectId,
    model: "gemini-3-flash",
    request: {
      model: "gemini-3-flash",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: { maxOutputTokens: 1, temperature: 0 }
    }
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2e4);
  let response;
  try {
    response = await fetch(`${ANTIGRAVITY_ENDPOINT}/v1internal:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { status: "error", message: "Verification check timed out." };
    }
    return { status: "error", message: `Verification check failed: ${String(error)}` };
  } finally {
    clearTimeout(timeoutId);
  }
  let responseBody = "";
  try {
    responseBody = await response.text();
  } catch {
    responseBody = "";
  }
  if (response.ok) {
    return { status: "ok", message: "Account verification check passed." };
  }
  const extracted = extractVerificationErrorDetails(responseBody);
  if (response.status === 403 && extracted.validationRequired) {
    return {
      status: "blocked",
      message: extracted.message ?? "Google requires additional account verification.",
      verifyUrl: extracted.verifyUrl
    };
  }
  const fallbackMessage = extracted.message ?? `Request failed (${response.status} ${response.statusText}).`;
  return {
    status: "error",
    message: fallbackMessage
  };
}
async function promptAccountIndexForVerification(accounts) {
  if (!process.stdin.isTTY) {
    return accounts[0]?.index;
  }
  const { createInterface: createInterface3 } = await import("node:readline/promises");
  const { stdin, stdout } = await import("node:process");
  const rl = createInterface3({ input: stdin, output: stdout });
  try {
    console.log("\nSelect an account to verify:");
    for (const account of accounts) {
      const label = account.email || `Account ${account.index + 1}`;
      console.log(`  ${account.index + 1}. ${label}`);
    }
    console.log("");
    while (true) {
      const answer = (await rl.question("Account number (leave blank to cancel): ")).trim();
      if (!answer) {
        return void 0;
      }
      const parsedIndex = Number(answer);
      if (!Number.isInteger(parsedIndex)) {
        console.log("Please enter a valid account number.");
        continue;
      }
      const normalizedIndex = parsedIndex - 1;
      const selected = accounts.find((account) => account.index === normalizedIndex);
      if (!selected) {
        console.log("Please enter a number from the list above.");
        continue;
      }
      return selected.index;
    }
  } finally {
    rl.close();
  }
}
async function promptOpenVerificationUrl() {
  const answer = (await promptOAuthCallbackValue("Open verification URL in your browser now? [Y/n]: ")).trim().toLowerCase();
  return answer === "" || answer === "y" || answer === "yes";
}
function markStoredAccountVerificationRequired(account, reason, verifyUrl) {
  let changed = false;
  const wasVerificationRequired = account.verificationRequired === true;
  if (!wasVerificationRequired) {
    account.verificationRequired = true;
    changed = true;
  }
  if (!wasVerificationRequired || account.verificationRequiredAt === void 0) {
    account.verificationRequiredAt = Date.now();
    changed = true;
  }
  const normalizedReason = reason.trim();
  if (account.verificationRequiredReason !== normalizedReason) {
    account.verificationRequiredReason = normalizedReason;
    changed = true;
  }
  const normalizedUrl = verifyUrl?.trim();
  if (normalizedUrl && account.verificationUrl !== normalizedUrl) {
    account.verificationUrl = normalizedUrl;
    changed = true;
  }
  if (account.enabled !== false) {
    account.enabled = false;
    changed = true;
  }
  return changed;
}
function clearStoredAccountVerificationRequired(account, enableIfRequired = false) {
  const wasVerificationRequired = account.verificationRequired === true;
  let changed = false;
  if (account.verificationRequired !== false) {
    account.verificationRequired = false;
    changed = true;
  }
  if (account.verificationRequiredAt !== void 0) {
    account.verificationRequiredAt = void 0;
    changed = true;
  }
  if (account.verificationRequiredReason !== void 0) {
    account.verificationRequiredReason = void 0;
    changed = true;
  }
  if (account.verificationUrl !== void 0) {
    account.verificationUrl = void 0;
    changed = true;
  }
  if (enableIfRequired && wasVerificationRequired && account.enabled === false) {
    account.enabled = true;
    changed = true;
  }
  return { changed, wasVerificationRequired };
}
async function promptOAuthCallbackValue(message) {
  if (!process.stdin.isTTY) {
    throw new Error("Interactive prompt not available in this environment. Please ensure the OAuth callback opens in the browser automatically.");
  }
  const { createInterface: createInterface3 } = await import("node:readline/promises");
  const { stdin, stdout } = await import("node:process");
  const rl = createInterface3({ input: stdin, output: stdout });
  try {
    return (await rl.question(message)).trim();
  } finally {
    rl.close();
  }
}
function getStateFromAuthorizationUrl(authorizationUrl) {
  try {
    return new URL(authorizationUrl).searchParams.get("state") ?? "";
  } catch {
    return "";
  }
}
function extractOAuthCallbackParams(url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return null;
  }
  return { code, state };
}
function parseOAuthCallbackInput(value, fallbackState) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: "Missing authorization code" };
  }
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") ?? fallbackState;
    if (!code) {
      return { error: "Missing code in callback URL" };
    }
    if (!state) {
      return { error: "Missing state in callback URL" };
    }
    return { code, state };
  } catch {
    if (!fallbackState) {
      return { error: "Missing state. Paste the full redirect URL instead of only the code." };
    }
    return { code: trimmed, state: fallbackState };
  }
}
async function promptManualOAuthInput(fallbackState) {
  console.log("1. Open the URL above in your browser and complete Google sign-in.");
  console.log("2. After approving, copy the full redirected localhost URL from the address bar.");
  console.log("3. Paste it back here.\n");
  const callbackInput = await promptOAuthCallbackValue(
    "Paste the redirect URL (or just the code) here: "
  );
  const params = parseOAuthCallbackInput(callbackInput, fallbackState);
  if ("error" in params) {
    return { type: "failed", error: params.error };
  }
  return exchangeAntigravity(params.code, params.state);
}
function clampInt(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}
async function persistAccountPool(results, replaceAll = false) {
  if (results.length === 0) {
    return;
  }
  const now = Date.now();
  const stored = replaceAll ? null : await loadAccounts();
  const accounts = stored?.accounts ? [...stored.accounts] : [];
  const indexByRefreshToken = /* @__PURE__ */ new Map();
  const indexByEmail = /* @__PURE__ */ new Map();
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (acc?.refreshToken) {
      indexByRefreshToken.set(acc.refreshToken, i);
    }
    if (acc?.email) {
      indexByEmail.set(acc.email, i);
    }
  }
  for (const result of results) {
    const parts = parseRefreshParts(result.refresh);
    if (!parts.refreshToken) {
      continue;
    }
    const existingByEmail = result.email ? indexByEmail.get(result.email) : void 0;
    const existingByToken = indexByRefreshToken.get(parts.refreshToken);
    const existingIndex = existingByEmail ?? existingByToken;
    if (existingIndex === void 0) {
      const newIndex = accounts.length;
      indexByRefreshToken.set(parts.refreshToken, newIndex);
      if (result.email) {
        indexByEmail.set(result.email, newIndex);
      }
      accounts.push({
        email: result.email,
        refreshToken: parts.refreshToken,
        projectId: parts.projectId,
        managedProjectId: parts.managedProjectId,
        addedAt: now,
        lastUsed: now,
        enabled: true
      });
      continue;
    }
    const existing = accounts[existingIndex];
    if (!existing) {
      continue;
    }
    const oldToken = existing.refreshToken;
    accounts[existingIndex] = {
      ...existing,
      email: result.email ?? existing.email,
      refreshToken: parts.refreshToken,
      projectId: parts.projectId ?? existing.projectId,
      managedProjectId: parts.managedProjectId ?? existing.managedProjectId,
      lastUsed: now
    };
    if (oldToken !== parts.refreshToken) {
      indexByRefreshToken.delete(oldToken);
      indexByRefreshToken.set(parts.refreshToken, existingIndex);
    }
  }
  if (accounts.length === 0) {
    return;
  }
  const activeIndex = replaceAll ? 0 : typeof stored?.activeIndex === "number" && Number.isFinite(stored.activeIndex) ? stored.activeIndex : 0;
  await saveAccounts({
    version: 4,
    accounts,
    activeIndex: clampInt(activeIndex, 0, accounts.length - 1),
    activeIndexByFamily: {
      claude: clampInt(activeIndex, 0, accounts.length - 1),
      gemini: clampInt(activeIndex, 0, accounts.length - 1)
    }
  });
}
function buildAuthSuccessFromStoredAccount(account) {
  const refresh = formatRefreshParts({
    refreshToken: account.refreshToken,
    projectId: account.projectId,
    managedProjectId: account.managedProjectId
  });
  return {
    type: "success",
    refresh,
    access: "",
    expires: 0,
    email: account.email,
    projectId: account.projectId ?? ""
  };
}
function retryAfterMsFromResponse2(response, defaultRetryMs = 6e4) {
  const retryAfterMsHeader = response.headers.get("retry-after-ms");
  if (retryAfterMsHeader) {
    const parsed = Number.parseInt(retryAfterMsHeader, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    const parsed = Number.parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed * 1e3;
    }
  }
  return defaultRetryMs;
}
function parseDurationToMs(duration) {
  const simpleMatch = duration.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i);
  if (simpleMatch) {
    const value = parseFloat(simpleMatch[1]);
    const unit = (simpleMatch[2] || "s").toLowerCase();
    switch (unit) {
      case "h":
        return value * 3600 * 1e3;
      case "m":
        return value * 60 * 1e3;
      case "s":
        return value * 1e3;
      case "ms":
        return value;
      default:
        return value * 1e3;
    }
  }
  const compoundRegex = /(\d+(?:\.\d+)?)(h|m(?!s)|s|ms)/gi;
  let totalMs = 0;
  let matchFound = false;
  let match = compoundRegex.exec(duration);
  while (match !== null) {
    matchFound = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case "h":
        totalMs += value * 3600 * 1e3;
        break;
      case "m":
        totalMs += value * 60 * 1e3;
        break;
      case "s":
        totalMs += value * 1e3;
        break;
      case "ms":
        totalMs += value;
        break;
    }
    match = compoundRegex.exec(duration);
  }
  return matchFound ? totalMs : null;
}
function extractRateLimitBodyInfo(body) {
  if (!body || typeof body !== "object") {
    return { retryDelayMs: null };
  }
  const error = body.error;
  const message = error && typeof error === "object" ? error.message : void 0;
  const details = error && typeof error === "object" ? error.details : void 0;
  let reason;
  if (Array.isArray(details)) {
    for (const detail of details) {
      if (!detail || typeof detail !== "object") continue;
      const type = detail["@type"];
      if (typeof type === "string" && type.includes("google.rpc.ErrorInfo")) {
        const detailReason = detail.reason;
        if (typeof detailReason === "string") {
          reason = detailReason;
          break;
        }
      }
    }
    for (const detail of details) {
      if (!detail || typeof detail !== "object") continue;
      const type = detail["@type"];
      if (typeof type === "string" && type.includes("google.rpc.RetryInfo")) {
        const retryDelay = detail.retryDelay;
        if (typeof retryDelay === "string") {
          const retryDelayMs = parseDurationToMs(retryDelay);
          if (retryDelayMs !== null) {
            return { retryDelayMs, message, reason };
          }
        }
      }
    }
    for (const detail of details) {
      if (!detail || typeof detail !== "object") continue;
      const metadata = detail.metadata;
      if (metadata && typeof metadata === "object") {
        const quotaResetDelay = metadata.quotaResetDelay;
        const quotaResetTime = metadata.quotaResetTimeStamp;
        if (typeof quotaResetDelay === "string") {
          const quotaResetDelayMs = parseDurationToMs(quotaResetDelay);
          if (quotaResetDelayMs !== null) {
            return { retryDelayMs: quotaResetDelayMs, message, quotaResetTime, reason };
          }
        }
      }
    }
  }
  if (message) {
    const afterMatch = message.match(/reset after\s+([0-9hms.]+)/i);
    const rawDuration = afterMatch?.[1];
    if (rawDuration) {
      const parsed = parseDurationToMs(rawDuration);
      if (parsed !== null) {
        return { retryDelayMs: parsed, message, reason };
      }
    }
  }
  return { retryDelayMs: null, message, reason };
}
async function extractRetryInfoFromBody(response) {
  try {
    const text = await response.clone().text();
    try {
      const parsed = JSON.parse(text);
      return extractRateLimitBodyInfo(parsed);
    } catch {
      return { retryDelayMs: null };
    }
  } catch {
    return { retryDelayMs: null };
  }
}
function formatWaitTime(ms) {
  if (ms < 1e3) return `${ms}ms`;
  const seconds = Math.ceil(ms / 1e3);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
function isModelGenerationRequest(urlString) {
  return urlString.includes(":generateContent") || urlString.includes(":streamGenerateContent");
}
function createNoUsableCredentialsResponse(urlString, detail) {
  const requestedModel = extractRequestedGeminiModel(urlString) ?? extractModelFromUrl(urlString) ?? void 0;
  const family = requestedModel?.toLowerCase().includes("claude") ? "claude" : "gemini";
  const errorMessage = [
    "[Antigravity Error] No usable Google credential for this request.",
    detail,
    "",
    "Run `opencode auth login` to sign in again or add another account, then retry.",
    "The login menu lists and manages the stored accounts; outside OpenCode,",
    "the `antigravity-accounts` CLI does the same."
  ].join("\n");
  return createSyntheticErrorResponse(errorMessage, requestedModel, family);
}
function createSoftQuotaBlockedResponse(input3) {
  const waitTimeFormatted = input3.waitMs ? formatWaitTime(input3.waitMs) : "unknown";
  const errorMessage = [
    `[Antigravity Error] Quota protection: All ${input3.accountCount} account(s) are over ${input3.threshold}% usage for ${input3.family}.`,
    `Quota resets in ${waitTimeFormatted}.`,
    "",
    "API-key fallback is disabled or unavailable, so the request was not routed to the public Gemini API.",
    "To continue, add more accounts, wait for quota reset, set soft_quota_threshold_percent: 100 to disable soft quota protection, or enable agy_sdk.api_key_fallback with a usable Gemini API key."
  ].join("\n");
  return createSyntheticErrorResponse(errorMessage, input3.requestedModel, input3.family);
}
var FIRST_RETRY_DELAY_MS = 1e3;
var INVALID_GRANT_RECHECK_COOLDOWN_MS = 15e3;
var SWITCH_ACCOUNT_DELAY_MS = 5e3;
var RATE_LIMIT_DEDUP_WINDOW_MS = 2e3;
var RATE_LIMIT_STATE_RESET_MS = 12e4;
var rateLimitStateByAccountQuota = /* @__PURE__ */ new Map();
var emptyResponseAttempts = /* @__PURE__ */ new Map();
function getRateLimitBackoff(accountIndex, quotaKey, serverRetryAfterMs, maxBackoffMs = 6e4) {
  const now = Date.now();
  const stateKey = `${accountIndex}:${quotaKey}`;
  const previous = rateLimitStateByAccountQuota.get(stateKey);
  if (previous && now - previous.lastAt < RATE_LIMIT_DEDUP_WINDOW_MS) {
    const baseDelay2 = serverRetryAfterMs ?? 1e3;
    const backoffDelay2 = Math.min(baseDelay2 * Math.pow(2, previous.consecutive429 - 1), maxBackoffMs);
    return {
      attempt: previous.consecutive429,
      delayMs: Math.max(baseDelay2, backoffDelay2),
      isDuplicate: true
    };
  }
  const attempt = previous && now - previous.lastAt < RATE_LIMIT_STATE_RESET_MS ? previous.consecutive429 + 1 : 1;
  rateLimitStateByAccountQuota.set(stateKey, {
    consecutive429: attempt,
    lastAt: now,
    quotaKey
  });
  const baseDelay = serverRetryAfterMs ?? 1e3;
  const backoffDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxBackoffMs);
  return { attempt, delayMs: Math.max(baseDelay, backoffDelay), isDuplicate: false };
}
function resetRateLimitState(accountIndex, quotaKey) {
  const stateKey = `${accountIndex}:${quotaKey}`;
  rateLimitStateByAccountQuota.delete(stateKey);
}
function headerStyleToQuotaKey(headerStyle, family) {
  if (family === "claude") return "claude";
  return headerStyle === "antigravity" ? "gemini-antigravity" : "gemini-cli";
}
function isEndpointUsableForHeaderStyle(endpoint, headerStyle) {
  if (headerStyle === "gemini-cli" && endpoint !== ANTIGRAVITY_ENDPOINT_PROD) {
    return false;
  }
  return true;
}
function hasUsableEndpointAfterIndex(index, headerStyle) {
  for (let j = index + 1; j < ANTIGRAVITY_ENDPOINT_FALLBACKS.length; j++) {
    const endpoint = ANTIGRAVITY_ENDPOINT_FALLBACKS[j];
    if (endpoint && isEndpointUsableForHeaderStyle(endpoint, headerStyle)) {
      return true;
    }
  }
  return false;
}
var accountFailureState = /* @__PURE__ */ new Map();
var MAX_CONSECUTIVE_FAILURES = 5;
var FAILURE_COOLDOWN_MS = 3e4;
var FAILURE_STATE_RESET_MS = 12e4;
function trackAccountFailure(accountIndex) {
  const now = Date.now();
  const previous = accountFailureState.get(accountIndex);
  const failures = previous && now - previous.lastFailureAt < FAILURE_STATE_RESET_MS ? previous.consecutiveFailures + 1 : 1;
  accountFailureState.set(accountIndex, { consecutiveFailures: failures, lastFailureAt: now });
  const shouldCooldown = failures >= MAX_CONSECUTIVE_FAILURES;
  const cooldownMs = shouldCooldown ? FAILURE_COOLDOWN_MS : 0;
  return { failures, shouldCooldown, cooldownMs };
}
function resetAccountFailureState(accountIndex) {
  accountFailureState.delete(accountIndex);
}
function remapIndexAfterRemoval(index, removedIndex) {
  if (index === removedIndex) return null;
  return index > removedIndex ? index - 1 : index;
}
function remapIndexSetAfterRemoval(set, removedIndex) {
  const values = [...set];
  set.clear();
  for (const index of values) {
    const next = remapIndexAfterRemoval(index, removedIndex);
    if (next !== null) set.add(next);
  }
}
function remapAccountStateAfterRemoval(removedIndex) {
  const failureEntries = [...accountFailureState.entries()];
  accountFailureState.clear();
  for (const [index, state] of failureEntries) {
    const next = remapIndexAfterRemoval(index, removedIndex);
    if (next !== null) accountFailureState.set(next, state);
  }
  const rateEntries = [...rateLimitStateByAccountQuota.entries()];
  rateLimitStateByAccountQuota.clear();
  for (const [key, state] of rateEntries) {
    const sep = key.indexOf(":");
    const index = Number(key.slice(0, sep));
    const quotaKey = key.slice(sep + 1);
    if (sep < 0 || Number.isNaN(index)) {
      rateLimitStateByAccountQuota.set(key, state);
      continue;
    }
    const next = remapIndexAfterRemoval(index, removedIndex);
    if (next !== null) rateLimitStateByAccountQuota.set(`${next}:${quotaKey}`, state);
  }
  getHealthTracker().remapAfterRemoval(removedIndex);
  getTokenTracker().remapAfterRemoval(removedIndex);
}
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error("Aborted"));
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(signal?.reason instanceof Error ? signal.reason : new Error("Aborted"));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
var createAntigravityRuntime = (providerId) => async ({ client: client2, directory }) => {
  let activeRefreshQueue = null;
  let activeLoaderAccountManager = null;
  const config = loadConfig(directory);
  initRuntimeConfig(config);
  let cachedGetAuth = null;
  initializeDebug(config);
  initLogger(client2);
  await initAntigravityVersion();
  if (config.health_score) {
    initHealthTracker({
      initial: config.health_score.initial,
      successReward: config.health_score.success_reward,
      rateLimitPenalty: config.health_score.rate_limit_penalty,
      failurePenalty: config.health_score.failure_penalty,
      recoveryRatePerHour: config.health_score.recovery_rate_per_hour,
      minUsable: config.health_score.min_usable,
      maxScore: config.health_score.max_score
    });
  }
  if (config.token_bucket) {
    initTokenTracker({
      maxTokens: config.token_bucket.max_tokens,
      regenerationRatePerMinute: config.token_bucket.regeneration_rate_per_minute,
      initialTokens: config.token_bucket.initial_tokens
    });
  }
  if (config.keep_thinking) {
    initDiskSignatureCache(config.signature_cache);
  }
  const sessionRecovery = createSessionRecoveryHook({ client: client2, directory }, config);
  const updateChecker = createAutoUpdateCheckerHook(client2, directory, {
    showStartupToast: true,
    autoUpdate: config.auto_update
  });
  const eventHandler = async (input3) => {
    await updateChecker.event(input3);
    if (input3.event.type === "session.created") {
      const props = input3.event.properties;
      const sessionID = props?.info?.id;
      const parentID = props?.info?.parentID;
      if (parentID) {
        isChildSession = true;
        childSessionParentID = parentID;
        log11.debug("child-session-detected", { sessionID, parentID });
      } else {
        isChildSession = false;
        childSessionParentID = void 0;
        log11.debug("root-session-detected", { sessionID });
      }
    }
    if (sessionRecovery && input3.event.type === "session.error") {
      const props = input3.event.properties;
      const sessionID = props?.sessionID;
      const messageID = props?.messageID;
      const error = props?.error;
      if (sessionRecovery.isRecoverableError(error)) {
        const messageInfo = {
          id: messageID,
          role: "assistant",
          sessionID,
          error
        };
        const recovered = await sessionRecovery.handleSessionRecovery(messageInfo);
        if (recovered && sessionID && config.auto_resume) {
          await client2.session.prompt({
            path: { id: sessionID },
            body: { parts: [{ type: "text", text: config.resume_text }] },
            query: { directory }
          }).catch(() => {
          });
          const successToast = getRecoverySuccessToast();
          log11.debug("recovery-toast", { ...successToast, isChildSession, toastScope: config.toast_scope });
          if (!(config.toast_scope === "root_only" && isChildSession)) {
            await client2.tui.showToast({
              body: {
                title: successToast.title,
                message: successToast.message,
                variant: "success"
              }
            }).catch(() => {
            });
          }
        }
      }
    }
  };
  const googleSearchTool = tool({
    description: "Search the web using Google Search and analyze URLs. Returns real-time information from the internet with source citations. Use this when you need up-to-date information about current events, recent developments, or any topic that may have changed. You can also provide specific URLs to analyze. IMPORTANT: If the user mentions or provides any URLs in their query, you MUST extract those URLs and pass them in the 'urls' parameter for direct analysis.",
    args: {
      query: tool.schema.string().describe("The search query or question to answer using web search"),
      urls: tool.schema.array(tool.schema.string()).optional().describe("List of specific URLs to fetch and analyze. IMPORTANT: Always extract and include any URLs mentioned by the user in their query here."),
      thinking: tool.schema.boolean().optional().default(true).describe("Enable deep thinking for more thorough analysis (default: true)")
    },
    async execute(args, ctx) {
      log11.debug("Google Search tool called", { query: args.query, urlCount: args.urls?.length ?? 0 });
      const auth = cachedGetAuth ? await cachedGetAuth() : null;
      if (!auth || !isOAuthAuth(auth)) {
        return "Error: Not authenticated with Antigravity. Please run `opencode auth login` to authenticate.";
      }
      const parts = parseRefreshParts(auth.refresh);
      const projectId = parts.managedProjectId || parts.projectId || "unknown";
      let accessToken = auth.access;
      if (!accessToken || accessTokenExpired(auth)) {
        try {
          const refreshed = await refreshAccessToken(auth, client2, providerId);
          accessToken = refreshed?.access;
        } catch (error) {
          return `Error: Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
      if (!accessToken) {
        return "Error: No valid access token available. Please run `opencode auth login` to re-authenticate.";
      }
      return executeSearch(
        {
          query: args.query,
          urls: args.urls,
          thinking: args.thinking
        },
        accessToken,
        projectId,
        ctx.abort
      );
    }
  });
  const hooks = {
    event: eventHandler,
    // `google_search_tool: false` leaves the tool unregistered, so the agent
    // uses whatever other search or fetch tools the setup provides. The 2.x
    // adapter reads this same map, so it follows automatically.
    tool: config.google_search_tool ? { google_search: googleSearchTool } : {},
    provider: {
      id: providerId,
      async models(provider, context) {
        const fallbackModels = normalizeProviderHookModels(
          providerId,
          provider,
          mergeModelDefinitions(OPENCODE_MODEL_DEFINITIONS, provider.models ?? {})
        );
        if (!config.model_discovery.enabled) {
          return fallbackModels;
        }
        let auth;
        try {
          auth = cachedGetAuth ? await cachedGetAuth() : context.auth;
        } catch (error) {
          log11.debug("model-discovery-fallback", { error: error instanceof Error ? error.message : String(error) });
          return fallbackModels;
        }
        const [geminiResult, antigravityResult] = await Promise.allSettled([
          modelsFromAgySdkCredentials(config, auth),
          modelsFromOAuthAuth(config, auth, client2, providerId)
        ]);
        const geminiModels = geminiResult.status === "fulfilled" ? geminiResult.value : {};
        const antigravityModels = antigravityResult.status === "fulfilled" ? antigravityResult.value : {};
        if (geminiResult.status === "rejected" || antigravityResult.status === "rejected") {
          log11.debug("model-discovery-partial-fallback", {
            geminiError: geminiResult.status === "rejected" ? String(geminiResult.reason) : void 0,
            antigravityError: antigravityResult.status === "rejected" ? String(antigravityResult.reason) : void 0
          });
        }
        return normalizeProviderHookModels(
          providerId,
          provider,
          mergeModelDefinitions(fallbackModels, geminiModels, antigravityModels),
          fallbackModels
        );
      }
    },
    auth: {
      provider: providerId,
      loader: async (getAuth, provider) => {
        cachedGetAuth = getAuth;
        const initialAuth = await getAuth();
        const initialAuthWasOAuth = isOAuthAuth(initialAuth);
        const apiKeyAuth = isApiKeyAuth(initialAuth) ? initialAuth : null;
        const initialAgySdkCredentials = getAgySdkCredentials(config, apiKeyAuth);
        let auth = initialAuth;
        if (!isOAuthAuth(initialAuth)) {
          const diskAccounts = await loadAccounts();
          const accountsOnDisk = diskAccounts?.accounts ?? [];
          const candidateIndex = typeof diskAccounts?.activeIndex === "number" && diskAccounts.activeIndex >= 0 && diskAccounts.activeIndex < accountsOnDisk.length ? diskAccounts.activeIndex : 0;
          const activeAccount = accountsOnDisk[candidateIndex] ?? accountsOnDisk.find((acc) => !!acc?.refreshToken);
          if (activeAccount?.refreshToken) {
            auth = {
              type: "oauth",
              refresh: formatRefreshParts({
                refreshToken: activeAccount.refreshToken,
                projectId: activeAccount.projectId,
                managedProjectId: activeAccount.managedProjectId
              }),
              access: "",
              expires: 0
            };
          }
        }
        if (!isOAuthAuth(auth)) {
          if (initialAgySdkCredentials.length === 0) {
            log11.warn("No usable Antigravity credential for this login; leaving the stored account pool untouched");
            return {};
          }
          return {
            apiKey: "",
            async fetch(input3, init) {
              const urlString = toUrlString(input3);
              if (isAntigravityOnlyGenerativeLanguageRequest(urlString)) {
                const requestedModel = extractRequestedGeminiModel(urlString);
                if (requestedModel) {
                  return createAntigravityOnlyModelErrorResponse(requestedModel);
                }
              }
              if (!isAgySdkSupportedRequest(urlString)) {
                return fetch(input3, init);
              }
              const latest = await getAuth();
              const latestCredentials = getAgySdkCredentials(config, isApiKeyAuth(latest) ? latest : apiKeyAuth);
              const response = await tryFetchWithAgySdkCredentials(
                input3,
                init,
                latestCredentials,
                (config.default_retry_after_seconds ?? 60) * 1e3
              );
              if (response) return response;
              if (isModelGenerationRequest(urlString)) {
                return createNoUsableCredentialsResponse(
                  urlString,
                  "No Google account is signed in, and the configured Gemini API key(s) could not serve this model."
                );
              }
              return fetch(input3, init);
            }
          };
        }
        const authParts = parseRefreshParts(auth.refresh);
        const storedAccounts = await loadAccounts();
        activeRefreshQueue?.stop();
        activeRefreshQueue = null;
        const previousAccountManager = activeLoaderAccountManager;
        activeLoaderAccountManager = null;
        if (previousAccountManager) {
          await previousAccountManager.flushSaveToDisk().catch(() => {
          });
        }
        const accountManager = await AccountManager.loadFromDisk(auth);
        activeAccountManager = accountManager;
        activeLoaderAccountManager = accountManager;
        if (accountManager.getAccountCount() > 0) {
          accountManager.requestSaveToDisk();
        }
        if (config.proactive_token_refresh && accountManager.getAccountCount() > 0) {
          const refreshQueue = createProactiveRefreshQueue(client2, providerId, {
            enabled: config.proactive_token_refresh,
            bufferSeconds: config.proactive_refresh_buffer_seconds,
            checkIntervalSeconds: config.proactive_refresh_check_interval_seconds
          });
          refreshQueue.setAccountManager(accountManager);
          refreshQueue.start();
          activeRefreshQueue = refreshQueue;
        }
        if (isDebugEnabled()) {
          const logPath = getLogFilePath();
          if (logPath) {
            try {
              await client2.tui.showToast({
                body: { message: `Debug log: ${logPath}`, variant: "info" }
              });
            } catch {
            }
          }
        }
        if (provider.models) {
          for (const model of Object.values(provider.models)) {
            if (model) {
              model.cost = { input: 0, output: 0 };
            }
          }
        }
        return {
          apiKey: "",
          async fetch(input3, init) {
            if (!isGenerativeLanguageRequest(input3)) {
              return fetch(input3, init);
            }
            if (accountManager.getAccountCount() === 0) {
              const latestAuth = await getAuth();
              const latestCredentials = getAgySdkCredentials(config, isApiKeyAuth(latestAuth) ? latestAuth : null);
              const urlString2 = toUrlString(input3);
              if (isAntigravityOnlyGenerativeLanguageRequest(urlString2)) {
                const requestedModel = extractRequestedGeminiModel(urlString2);
                if (requestedModel) {
                  return createAntigravityOnlyModelErrorResponse(requestedModel);
                }
              }
              if (isAgySdkSupportedRequest(urlString2)) {
                const response = await tryFetchWithAgySdkCredentials(
                  input3,
                  init,
                  latestCredentials,
                  (config.default_retry_after_seconds ?? 60) * 1e3
                );
                if (response) return response;
              }
              if (isModelGenerationRequest(urlString2)) {
                return createNoUsableCredentialsResponse(
                  urlString2,
                  "The Antigravity account pool is empty: every signed-in account was removed or revoked."
                );
              }
              return fetch(input3, init);
            }
            const urlString = toUrlString(input3);
            const family = getModelFamilyFromUrl(urlString);
            const model = extractModelFromUrl(urlString);
            const agySdkCredentials = getAgySdkCredentials(config, apiKeyAuth);
            const debugLines = [];
            const pushDebug = (line) => {
              if (!isDebugEnabled()) return;
              debugLines.push(line);
            };
            pushDebug(`request=${sanitizeUrlForLog(urlString)}`);
            let lastFailure = null;
            let lastError = null;
            const abortSignal = init?.signal ?? void 0;
            const triedSwitchIndices = /* @__PURE__ */ new Set();
            let loopGuard = 0;
            const checkAborted = () => {
              if (abortSignal?.aborted) {
                throw abortSignal.reason instanceof Error ? abortSignal.reason : new Error("Aborted");
              }
            };
            const quietMode = config.quiet_mode;
            const toastScope = config.toast_scope;
            const showToast = async (message, variant) => {
              log11.debug("toast", { message, variant, isChildSession, toastScope });
              if (quietMode) return;
              if (abortSignal?.aborted) return;
              if (toastScope === "root_only" && isChildSession) {
                log11.debug("toast-suppressed-child-session", { message, variant, parentID: childSessionParentID });
                return;
              }
              if (variant === "warning" && message.toLowerCase().includes("rate")) {
                if (!shouldShowRateLimitToast(message)) {
                  return;
                }
              }
              try {
                await client2.tui.showToast({
                  body: { message, variant }
                });
              } catch {
              }
            };
            const hasOtherAccountWithAntigravity = (currentAccount) => {
              if (family !== "gemini") return false;
              return accountManager.hasOtherAccountWithAntigravityAvailable(currentAccount.index, family, model);
            };
            while (true) {
              checkAborted();
              const accountCount2 = accountManager.getAccountCount();
              if (++loopGuard > Math.max(50, accountCount2 * 8)) {
                const guardFallback = await tryAgySdkFallbackForRequest(input3, init, config, agySdkCredentials, urlString);
                if (guardFallback) return guardFallback;
                throw lastError || new Error(
                  `Antigravity request routing did not converge for ${model ?? family}. All ${accountCount2} account(s) appear rate-limited or exhausted for this model. Run \`opencode auth login\` to add accounts or wait for quota reset.`
                );
              }
              const routingDecision = resolveHeaderRoutingDecision(urlString, family, config);
              const {
                cliFirst,
                preferredHeaderStyle,
                explicitQuota,
                allowQuotaFallback
              } = routingDecision;
              if (family === "gemini" && config.agy_sdk.prefer_for_gemini && !explicitQuota && agySdkCredentials.length > 0 && isAgySdkSupportedRequest(urlString)) {
                const response = await tryFetchWithAgySdkCredentials(
                  input3,
                  init,
                  agySdkCredentials,
                  (config.default_retry_after_seconds ?? 60) * 1e3
                );
                if (response && !isRetryableAgySdkCredentialStatus(response.status)) {
                  return response;
                }
              }
              if (accountCount2 === 0) {
                const response = await tryAgySdkFallbackForRequest(input3, init, config, agySdkCredentials, urlString);
                if (response) return response;
                throw new Error("No Antigravity accounts available. Run `opencode auth login`.");
              }
              const softQuotaCacheTtlMs = computeSoftQuotaCacheTtlMs(
                config.soft_quota_cache_ttl_minutes,
                config.quota_refresh_interval_minutes
              );
              let selectedHeaderStyle = preferredHeaderStyle;
              let account = accountManager.getCurrentOrNextForFamily(
                family,
                model,
                config.account_selection_strategy,
                preferredHeaderStyle,
                config.pid_offset_enabled,
                config.soft_quota_threshold_percent,
                softQuotaCacheTtlMs,
                triedSwitchIndices
              );
              if (!account && allowQuotaFallback) {
                const alternateHeaderStyle = preferredHeaderStyle === "antigravity" ? "gemini-cli" : "antigravity";
                account = accountManager.getCurrentOrNextForFamily(
                  family,
                  model,
                  config.account_selection_strategy,
                  alternateHeaderStyle,
                  config.pid_offset_enabled,
                  config.soft_quota_threshold_percent,
                  softQuotaCacheTtlMs,
                  triedSwitchIndices
                );
                if (account) {
                  selectedHeaderStyle = alternateHeaderStyle;
                  pushDebug(
                    `selected-by-fallback idx=${account.index} preferred=${preferredHeaderStyle} alternate=${alternateHeaderStyle}`
                  );
                }
              }
              if (!account) {
                if (accountCount2 > 0 && triedSwitchIndices.size >= accountCount2) {
                  const exhaustedFallback = await tryAgySdkFallbackForRequest(input3, init, config, agySdkCredentials, urlString);
                  if (exhaustedFallback) return exhaustedFallback;
                  if (lastFailure) {
                    return transformAntigravityResponse(
                      lastFailure.response,
                      lastFailure.streaming,
                      lastFailure.debugContext,
                      lastFailure.requestedModel,
                      lastFailure.projectId,
                      lastFailure.endpoint,
                      lastFailure.effectiveModel,
                      lastFailure.sessionId,
                      lastFailure.toolDebugMissing,
                      lastFailure.toolDebugSummary,
                      lastFailure.toolDebugPayload,
                      debugLines
                    );
                  }
                  throw lastError || new Error(
                    `All ${accountCount2} Antigravity account(s) are rate-limited for ${model ?? family}. Run \`opencode auth login\` to add accounts or wait for quota reset.`
                  );
                }
                if (accountManager.areAllAccountsOverSoftQuota(
                  family,
                  config.soft_quota_threshold_percent,
                  softQuotaCacheTtlMs,
                  model,
                  preferredHeaderStyle
                )) {
                  const threshold = config.soft_quota_threshold_percent;
                  const softQuotaWaitMs = accountManager.getMinWaitTimeForSoftQuota(
                    family,
                    threshold,
                    softQuotaCacheTtlMs,
                    model,
                    preferredHeaderStyle
                  );
                  const maxWaitMs2 = (config.max_rate_limit_wait_seconds ?? 300) * 1e3;
                  const response2 = await tryAgySdkFallbackForRequest(input3, init, config, agySdkCredentials, urlString);
                  if (response2) return response2;
                  if (softQuotaWaitMs === null || maxWaitMs2 > 0 && softQuotaWaitMs > maxWaitMs2) {
                    const waitTimeFormatted = softQuotaWaitMs ? formatWaitTime(softQuotaWaitMs) : "unknown";
                    await showToast(
                      `All accounts over ${threshold}% quota threshold. Resets in ${waitTimeFormatted}.`,
                      "error"
                    );
                    return createSoftQuotaBlockedResponse({
                      accountCount: accountCount2,
                      family,
                      threshold,
                      waitMs: softQuotaWaitMs,
                      requestedModel: model ?? void 0
                    });
                  }
                  const waitSecValue2 = Math.max(1, Math.ceil(softQuotaWaitMs / 1e3));
                  pushDebug(`all-over-soft-quota family=${family} accounts=${accountCount2} waitMs=${softQuotaWaitMs}`);
                  if (!softQuotaToastShown) {
                    await showToast(`All ${accountCount2} account(s) over ${threshold}% quota. Waiting ${formatWaitTime(softQuotaWaitMs)}...`, "warning");
                    softQuotaToastShown = true;
                  }
                  triedSwitchIndices.clear();
                  await sleep(softQuotaWaitMs, abortSignal);
                  continue;
                }
                const strictWait = !allowQuotaFallback;
                const waitMs = accountManager.getMinWaitTimeForFamily(
                  family,
                  model,
                  preferredHeaderStyle,
                  strictWait
                ) || 6e4;
                const waitSecValue = Math.max(1, Math.ceil(waitMs / 1e3));
                pushDebug(`all-rate-limited family=${family} accounts=${accountCount2} waitMs=${waitMs}`);
                if (isDebugEnabled()) {
                  logAccountContext("All accounts rate-limited", {
                    index: -1,
                    family,
                    totalAccounts: accountCount2
                  });
                  logRateLimitSnapshot(family, accountManager.getAccountsSnapshot());
                }
                const maxWaitMs = (config.max_rate_limit_wait_seconds ?? 300) * 1e3;
                const response = await tryAgySdkFallbackForRequest(input3, init, config, agySdkCredentials, urlString);
                if (response) return response;
                if (maxWaitMs > 0 && waitMs > maxWaitMs) {
                  const waitTimeFormatted = formatWaitTime(waitMs);
                  await showToast(
                    `Rate limited for ${waitTimeFormatted}. Try again later or add another account.`,
                    "error"
                  );
                  throw new Error(
                    `All ${accountCount2} account(s) rate-limited for ${family}. Quota resets in ${waitTimeFormatted}. Add more accounts with \`opencode auth login\` or wait and retry.`
                  );
                }
                if (!rateLimitToastShown) {
                  await showToast(`All ${accountCount2} account(s) rate-limited for ${family}. Waiting ${waitSecValue}s...`, "warning");
                  rateLimitToastShown = true;
                }
                triedSwitchIndices.clear();
                await sleep(waitMs, abortSignal);
                continue;
              }
              resetAllAccountsBlockedToasts();
              pushDebug(
                `selected idx=${account.index} email=${account.email ?? ""} family=${family} accounts=${accountCount2} strategy=${config.account_selection_strategy}`
              );
              if (isDebugEnabled()) {
                logAccountContext("Selected", {
                  index: account.index,
                  email: account.email,
                  family,
                  totalAccounts: accountCount2,
                  rateLimitState: account.rateLimitResetTimes
                });
              }
              if (accountCount2 > 1 && accountManager.shouldShowAccountToast(account.index)) {
                const accountLabel2 = account.email || `Account ${account.index + 1}`;
                const enabledAccounts = accountManager.getEnabledAccounts();
                const enabledPosition = enabledAccounts.findIndex((a) => a.index === account.index) + 1;
                await showToast(
                  `Using ${accountLabel2} (${enabledPosition}/${accountCount2})`,
                  "info"
                );
                accountManager.markToastShown(account.index);
              }
              accountManager.requestSaveToDisk();
              let authRecord = accountManager.toAuthDetails(account);
              if (accessTokenExpired(authRecord)) {
                try {
                  const refreshed = await refreshAccessToken(authRecord, client2, providerId);
                  if (!refreshed) {
                    const { failures, shouldCooldown, cooldownMs } = trackAccountFailure(account.index);
                    getHealthTracker().recordFailure(account.index);
                    lastError = new Error("Antigravity token refresh failed");
                    if (shouldCooldown) {
                      accountManager.markAccountCoolingDown(account, cooldownMs, "auth-failure");
                      accountManager.markRateLimited(account, cooldownMs, family, "antigravity", model);
                      pushDebug(`token-refresh-failed: cooldown ${cooldownMs}ms after ${failures} failures`);
                    }
                    continue;
                  }
                  resetAccountFailureState(account.index);
                  accountManager.updateFromAuth(account, refreshed);
                  authRecord = refreshed;
                  try {
                    await accountManager.saveToDisk();
                  } catch (error) {
                    log11.error("Failed to persist refreshed auth", { error: String(error) });
                  }
                } catch (error) {
                  if (error instanceof AntigravityTokenRefreshError && error.code === "invalid_grant") {
                    if (!isRevokedRefreshToken(account.parts.refreshToken)) {
                      accountManager.markAccountCoolingDown(
                        account,
                        INVALID_GRANT_RECHECK_COOLDOWN_MS,
                        "auth-failure"
                      );
                      accountManager.markRateLimited(
                        account,
                        INVALID_GRANT_RECHECK_COOLDOWN_MS,
                        family,
                        "antigravity",
                        model
                      );
                      pushDebug(
                        `invalid_grant (unconfirmed) idx=${account.index}: cooldown ${INVALID_GRANT_RECHECK_COOLDOWN_MS}ms before re-checking`
                      );
                      log11.warn("Token refresh returned invalid_grant; re-checking before dropping the account", {
                        account: account.email ?? `index ${account.index}`
                      });
                      lastError = error;
                      continue;
                    }
                    const removedIndex = account.index;
                    const removed = accountManager.removeAccount(account);
                    if (removed) {
                      remapAccountStateAfterRemoval(removedIndex);
                      remapIndexSetAfterRemoval(triedSwitchIndices, removedIndex);
                      log11.warn("Removed revoked account from pool - reauthenticate via `opencode auth login`");
                      try {
                        await accountManager.persistAccountRemoval(account.parts.refreshToken);
                      } catch (persistError) {
                        log11.error("Failed to persist revoked account removal", { error: String(persistError) });
                      }
                    }
                    if (accountManager.getAccountCount() === 0) {
                      if (initialAuthWasOAuth) {
                        try {
                          await client2.auth.set({
                            path: { id: providerId },
                            body: { type: "oauth", refresh: "", access: "", expires: 0 }
                          });
                        } catch (storeError) {
                          log11.error("Failed to clear stored Antigravity OAuth credentials", { error: String(storeError) });
                        }
                      }
                      const fallback = await tryAgySdkFallbackForRequest(
                        input3,
                        init,
                        config,
                        agySdkCredentials,
                        urlString
                      );
                      if (fallback) return fallback;
                      throw new Error(
                        "All Antigravity accounts have invalid refresh tokens. Run `opencode auth login` and reauthenticate."
                      );
                    }
                    lastError = error;
                    continue;
                  }
                  const { failures, shouldCooldown, cooldownMs } = trackAccountFailure(account.index);
                  getHealthTracker().recordFailure(account.index);
                  lastError = error instanceof Error ? error : new Error(String(error));
                  if (shouldCooldown) {
                    accountManager.markAccountCoolingDown(account, cooldownMs, "auth-failure");
                    accountManager.markRateLimited(account, cooldownMs, family, "antigravity", model);
                    pushDebug(`token-refresh-error: cooldown ${cooldownMs}ms after ${failures} failures`);
                  }
                  continue;
                }
              }
              const accessToken = authRecord.access;
              if (!accessToken) {
                lastError = new Error("Missing access token");
                if (accountCount2 <= 1) {
                  throw lastError;
                }
                continue;
              }
              let projectContext;
              try {
                projectContext = await ensureProjectContext(authRecord);
                resetAccountFailureState(account.index);
              } catch (error) {
                const { failures, shouldCooldown, cooldownMs } = trackAccountFailure(account.index);
                getHealthTracker().recordFailure(account.index);
                lastError = error instanceof Error ? error : new Error(String(error));
                if (shouldCooldown) {
                  accountManager.markAccountCoolingDown(account, cooldownMs, "project-error");
                  accountManager.markRateLimited(account, cooldownMs, family, "antigravity", model);
                  pushDebug(`project-context-error: cooldown ${cooldownMs}ms after ${failures} failures`);
                }
                continue;
              }
              if (projectContext.auth.refresh !== authRecord.refresh || projectContext.auth.access !== authRecord.access) {
                accountManager.updateFromAuth(account, projectContext.auth);
                authRecord = projectContext.auth;
                try {
                  await accountManager.saveToDisk();
                } catch (error) {
                  log11.error("Failed to persist project context", { error: String(error) });
                }
              }
              const runThinkingWarmup = async (prepared, projectId) => {
                if (!config.enable_thinking_warmup) {
                  return;
                }
                if (!prepared.needsSignedThinkingWarmup || !prepared.sessionId) {
                  return;
                }
                if (!trackWarmupAttempt(prepared.sessionId)) {
                  return;
                }
                const warmupBody = buildThinkingWarmupBody(
                  typeof prepared.init.body === "string" ? prepared.init.body : void 0,
                  Boolean(prepared.effectiveModel?.toLowerCase().includes("claude") && prepared.effectiveModel?.toLowerCase().includes("thinking"))
                );
                if (!warmupBody) {
                  return;
                }
                const warmupUrl = toWarmupStreamUrl(prepared.request);
                const warmupHeaders = new Headers(prepared.init.headers ?? {});
                warmupHeaders.set("accept", "text/event-stream");
                const warmupInit = {
                  ...prepared.init,
                  method: prepared.init.method ?? "POST",
                  headers: warmupHeaders,
                  body: warmupBody
                };
                const warmupDebugContext = startAntigravityDebugRequest({
                  originalUrl: warmupUrl,
                  resolvedUrl: warmupUrl,
                  method: warmupInit.method,
                  headers: warmupHeaders,
                  body: warmupBody,
                  streaming: true,
                  projectId
                });
                try {
                  pushDebug("thinking-warmup: start");
                  const warmupResponse = await fetch(warmupUrl, warmupInit);
                  const transformed = await transformAntigravityResponse(
                    warmupResponse,
                    true,
                    warmupDebugContext,
                    prepared.requestedModel,
                    projectId,
                    warmupUrl,
                    prepared.effectiveModel,
                    prepared.sessionId
                  );
                  await transformed.text();
                  markWarmupSuccess(prepared.sessionId);
                  pushDebug("thinking-warmup: done");
                } catch (error) {
                  pushDebug(
                    `thinking-warmup: failed ${error instanceof Error ? error.message : String(error)}`
                  );
                }
              };
              let shouldSwitchAccount = false;
              let headerStyle = selectedHeaderStyle;
              pushDebug(`headerStyle=${headerStyle} explicit=${explicitQuota}`);
              if (account.fingerprint) {
                pushDebug(`fingerprint: quotaUser=${account.fingerprint.quotaUser} deviceId=${account.fingerprint.deviceId.slice(0, 8)}...`);
              }
              if (accountManager.isRateLimitedForHeaderStyle(account, family, headerStyle, model)) {
                if (allowQuotaFallback && family === "gemini" && headerStyle === "antigravity") {
                  if (accountManager.hasOtherAccountWithAntigravityAvailable(account.index, family, model)) {
                    pushDebug(`antigravity rate-limited on account ${account.index}, but available on other accounts. Switching.`);
                    shouldSwitchAccount = true;
                  } else {
                    const alternateStyle = accountManager.getAvailableHeaderStyle(account, family, model);
                    const fallbackStyle = resolveQuotaFallbackHeaderStyle({
                      family,
                      headerStyle,
                      alternateStyle
                    });
                    if (fallbackStyle) {
                      await showToast(
                        `Antigravity quota exhausted on all accounts. Using Gemini CLI quota.`,
                        "warning"
                      );
                      headerStyle = fallbackStyle;
                      pushDebug(`all-accounts antigravity exhausted, quota fallback: ${headerStyle}`);
                    } else {
                      shouldSwitchAccount = true;
                    }
                  }
                } else if (allowQuotaFallback && family === "gemini") {
                  const alternateStyle = accountManager.getAvailableHeaderStyle(account, family, model);
                  const fallbackStyle = resolveQuotaFallbackHeaderStyle({
                    family,
                    headerStyle,
                    alternateStyle
                  });
                  if (fallbackStyle) {
                    const quotaName = headerStyle === "gemini-cli" ? "Gemini CLI" : "Antigravity";
                    const altQuotaName = fallbackStyle === "gemini-cli" ? "Gemini CLI" : "Antigravity";
                    await showToast(
                      `${quotaName} quota exhausted, using ${altQuotaName} quota`,
                      "warning"
                    );
                    headerStyle = fallbackStyle;
                    pushDebug(`quota fallback: ${headerStyle}`);
                  } else {
                    shouldSwitchAccount = true;
                  }
                } else {
                  shouldSwitchAccount = true;
                }
              }
              while (!shouldSwitchAccount) {
                let forceThinkingRecovery = false;
                let tokenConsumed = false;
                let capacityRetryCount = 0;
                let lastEndpointIndex = -1;
                for (let i = 0; i < ANTIGRAVITY_ENDPOINT_FALLBACKS.length; i++) {
                  if (i !== lastEndpointIndex) {
                    capacityRetryCount = 0;
                    lastEndpointIndex = i;
                  }
                  const currentEndpoint = ANTIGRAVITY_ENDPOINT_FALLBACKS[i];
                  if (headerStyle === "gemini-cli" && currentEndpoint !== ANTIGRAVITY_ENDPOINT_PROD) {
                    pushDebug(`Skipping sandbox endpoint ${currentEndpoint} for gemini-cli headerStyle`);
                    continue;
                  }
                  try {
                    const prepared = await prepareAntigravityRequest(
                      input3,
                      init,
                      accessToken,
                      projectContext.effectiveProjectId,
                      currentEndpoint,
                      headerStyle,
                      forceThinkingRecovery,
                      {
                        claudeToolHardening: config.claude_tool_hardening,
                        claudePromptAutoCaching: config.claude_prompt_auto_caching,
                        fingerprint: account.fingerprint
                      }
                    );
                    const originalUrl = toUrlString(input3);
                    const resolvedUrl = toUrlString(prepared.request);
                    pushDebug(`endpoint=${currentEndpoint}`);
                    pushDebug(`resolved=${sanitizeUrlForLog(resolvedUrl)}`);
                    const debugContext = startAntigravityDebugRequest({
                      originalUrl,
                      resolvedUrl,
                      method: prepared.init.method,
                      headers: prepared.init.headers,
                      body: prepared.init.body,
                      streaming: prepared.streaming,
                      projectId: projectContext.effectiveProjectId
                    });
                    const createFailureContext = (failureResponse) => ({
                      response: failureResponse,
                      streaming: prepared.streaming,
                      debugContext,
                      requestedModel: prepared.requestedModel,
                      projectId: prepared.projectId,
                      endpoint: prepared.endpoint,
                      effectiveModel: prepared.effectiveModel,
                      sessionId: prepared.sessionId,
                      toolDebugMissing: prepared.toolDebugMissing,
                      toolDebugSummary: prepared.toolDebugSummary,
                      toolDebugPayload: prepared.toolDebugPayload
                    });
                    await runThinkingWarmup(prepared, projectContext.effectiveProjectId);
                    if (config.request_jitter_max_ms > 0) {
                      const jitterMs = Math.floor(Math.random() * config.request_jitter_max_ms);
                      if (jitterMs > 0) {
                        await sleep(jitterMs, abortSignal);
                      }
                    }
                    if (config.account_selection_strategy === "hybrid") {
                      tokenConsumed = getTokenTracker().consume(account.index);
                    }
                    const response = await fetch(prepared.request, prepared.init);
                    pushDebug(`status=${response.status} ${response.statusText}`);
                    if (response.status === 429 || response.status === 503 || response.status === 529) {
                      if (tokenConsumed) {
                        getTokenTracker().refund(account.index);
                        tokenConsumed = false;
                      }
                      const defaultRetryMs = (config.default_retry_after_seconds ?? 60) * 1e3;
                      const maxBackoffMs = (config.max_backoff_seconds ?? 60) * 1e3;
                      const headerRetryMs = retryAfterMsFromResponse2(response, defaultRetryMs);
                      const bodyInfo = await extractRetryInfoFromBody(response);
                      const serverRetryMs = bodyInfo.retryDelayMs ?? headerRetryMs;
                      const rateLimitReason = parseRateLimitReason(bodyInfo.reason, bodyInfo.message, response.status);
                      if (rateLimitReason === "MODEL_CAPACITY_EXHAUSTED" || rateLimitReason === "SERVER_ERROR") {
                        if (capacityRetryCount < 3) {
                          const baseDelayMs = 1e3;
                          const maxDelayMs = 8e3;
                          const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, capacityRetryCount), maxDelayMs);
                          const jitter = exponentialDelay * (0.9 + Math.random() * 0.2);
                          const waitMs = Math.round(jitter);
                          const waitSec = Math.round(waitMs / 1e3);
                          pushDebug(`Server busy (${rateLimitReason}) on account ${account.index}, exponential backoff ${waitMs}ms (attempt ${capacityRetryCount + 1})`);
                          await showToast(
                            `\u23F3 Server busy (${response.status}). Retrying in ${waitSec}s...`,
                            "warning"
                          );
                          await sleep(waitMs, abortSignal);
                          capacityRetryCount++;
                          i -= 1;
                          continue;
                        }
                        pushDebug(`Max capacity retries (3) exhausted for endpoint ${currentEndpoint}, regenerating fingerprint...`);
                        const newFingerprint = accountManager.regenerateAccountFingerprint(account.index);
                        if (newFingerprint) {
                          pushDebug(`Fingerprint regenerated for account ${account.index}`);
                        }
                        if (hasUsableEndpointAfterIndex(i, headerStyle)) {
                          continue;
                        }
                        accountManager.markRateLimitedWithReason(account, family, headerStyle, model, rateLimitReason, serverRetryMs);
                        if (family === "gemini" && allowQuotaFallback) {
                          const alternateStyle = accountManager.getAvailableHeaderStyle(account, family, model);
                          const fallbackStyle = resolveQuotaFallbackHeaderStyle({ family, headerStyle, alternateStyle });
                          if (fallbackStyle) {
                            const safeModelName = model || "this model";
                            const currentQuotaName = headerStyle === "antigravity" ? "Antigravity" : "Gemini CLI";
                            await showToast(
                              `Server busy on ${currentQuotaName} quota for ${safeModelName}. Trying alternate quota...`,
                              "warning"
                            );
                            headerStyle = fallbackStyle;
                            pushDebug(`capacity fallback: ${headerStyle}`);
                            continue;
                          }
                        }
                        const capacityAgySdkFallback = await tryAgySdkFallbackForRequest(
                          input3,
                          init,
                          config,
                          agySdkCredentials,
                          urlString
                        );
                        if (capacityAgySdkFallback && !isRetryableAgySdkCredentialStatus(capacityAgySdkFallback.status)) {
                          return capacityAgySdkFallback;
                        }
                        pushDebug(
                          `No further usable endpoint or quota for headerStyle=${headerStyle} after capacity exhaustion; switching account`
                        );
                        lastError = new Error(
                          `Model capacity exhausted (${rateLimitReason}) on account ${account.index} after ${capacityRetryCount} retries`
                        );
                        lastFailure = createFailureContext(response);
                        shouldSwitchAccount = true;
                        break;
                      }
                      const quotaKey2 = headerStyleToQuotaKey(headerStyle, family);
                      const { attempt, delayMs, isDuplicate } = getRateLimitBackoff(account.index, quotaKey2, serverRetryMs);
                      const smartBackoffMs = calculateBackoffMs(rateLimitReason, account.consecutiveFailures ?? 0, serverRetryMs);
                      const effectiveDelayMs = Math.max(delayMs, smartBackoffMs);
                      pushDebug(
                        `429 idx=${account.index} email=${account.email ?? ""} family=${family} delayMs=${effectiveDelayMs} attempt=${attempt} reason=${rateLimitReason}`
                      );
                      if (bodyInfo.message) {
                        pushDebug(`429 message=${bodyInfo.message}`);
                      }
                      if (bodyInfo.quotaResetTime) {
                        pushDebug(`429 quotaResetTime=${bodyInfo.quotaResetTime}`);
                      }
                      if (bodyInfo.reason) {
                        pushDebug(`429 reason=${bodyInfo.reason}`);
                      }
                      logRateLimitEvent(
                        account.index,
                        account.email,
                        family,
                        response.status,
                        effectiveDelayMs,
                        bodyInfo
                      );
                      await logResponseBody(debugContext, response, 429);
                      getHealthTracker().recordRateLimit(account.index);
                      const accountLabel2 = account.email || `Account ${account.index + 1}`;
                      if (attempt === 1 && rateLimitReason !== "QUOTA_EXHAUSTED") {
                        await showToast(`Rate limited. Quick retry in 1s...`, "warning");
                        await sleep(FIRST_RETRY_DELAY_MS, abortSignal);
                        if (config.scheduling_mode === "cache_first") {
                          const maxCacheFirstWaitMs = config.max_cache_first_wait_seconds * 1e3;
                          if (effectiveDelayMs <= maxCacheFirstWaitMs) {
                            pushDebug(`cache_first: waiting ${effectiveDelayMs}ms for same account to recover`);
                            await showToast(`\u23F3 Waiting ${Math.ceil(effectiveDelayMs / 1e3)}s for same account (prompt cache preserved)...`, "info");
                            accountManager.markRateLimitedWithReason(account, family, headerStyle, model, rateLimitReason, serverRetryMs);
                            await sleep(effectiveDelayMs, abortSignal);
                            i -= 1;
                            continue;
                          }
                          pushDebug(`cache_first: wait ${effectiveDelayMs}ms exceeds max ${maxCacheFirstWaitMs}ms, switching account`);
                        }
                        if (config.switch_on_first_rate_limit && accountCount2 > 1) {
                          accountManager.markRateLimitedWithReason(account, family, headerStyle, model, rateLimitReason, serverRetryMs, config.failure_ttl_seconds * 1e3);
                          shouldSwitchAccount = true;
                          break;
                        }
                        i -= 1;
                        continue;
                      }
                      accountManager.markRateLimitedWithReason(account, family, headerStyle, model, rateLimitReason, serverRetryMs, config.failure_ttl_seconds * 1e3);
                      accountManager.requestSaveToDisk();
                      if (family === "gemini") {
                        if (headerStyle === "antigravity") {
                          if (hasOtherAccountWithAntigravity(account)) {
                            pushDebug(`antigravity exhausted on account ${account.index}, but available on others. Switching account.`);
                            await showToast(`Rate limited again. Switching account in 5s...`, "warning");
                            await sleep(SWITCH_ACCOUNT_DELAY_MS, abortSignal);
                            shouldSwitchAccount = true;
                            break;
                          }
                          if (allowQuotaFallback) {
                            const alternateStyle = accountManager.getAvailableHeaderStyle(account, family, model);
                            const fallbackStyle = resolveQuotaFallbackHeaderStyle({
                              family,
                              headerStyle,
                              alternateStyle
                            });
                            if (fallbackStyle) {
                              const safeModelName = model || "this model";
                              await showToast(
                                `Antigravity quota exhausted for ${safeModelName}. Switching to Gemini CLI quota...`,
                                "warning"
                              );
                              headerStyle = fallbackStyle;
                              pushDebug(`quota fallback: ${headerStyle}`);
                              continue;
                            }
                          }
                        } else if (headerStyle === "gemini-cli") {
                          if (allowQuotaFallback) {
                            const alternateStyle = accountManager.getAvailableHeaderStyle(account, family, model);
                            const fallbackStyle = resolveQuotaFallbackHeaderStyle({
                              family,
                              headerStyle,
                              alternateStyle
                            });
                            if (fallbackStyle) {
                              const safeModelName = model || "this model";
                              await showToast(
                                `Gemini CLI quota exhausted for ${safeModelName}. Switching to Antigravity quota...`,
                                "warning"
                              );
                              headerStyle = fallbackStyle;
                              pushDebug(`quota fallback: ${headerStyle}`);
                              continue;
                            }
                          }
                        }
                      }
                      const agySdkFallbackResponse = await tryAgySdkFallbackForRequest(
                        input3,
                        init,
                        config,
                        agySdkCredentials,
                        urlString
                      );
                      if (agySdkFallbackResponse && !isRetryableAgySdkCredentialStatus(agySdkFallbackResponse.status)) {
                        return agySdkFallbackResponse;
                      }
                      const quotaName = headerStyle === "antigravity" ? "Antigravity" : "Gemini CLI";
                      if (accountCount2 > 1) {
                        const quotaMsg = bodyInfo.quotaResetTime ? ` (quota resets ${bodyInfo.quotaResetTime})` : ``;
                        await showToast(`Rate limited again. Switching account in 5s...${quotaMsg}`, "warning");
                        await sleep(SWITCH_ACCOUNT_DELAY_MS, abortSignal);
                      } else {
                        const expBackoffMs = Math.min(FIRST_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 6e4);
                        const expBackoffFormatted = expBackoffMs >= 1e3 ? `${Math.round(expBackoffMs / 1e3)}s` : `${expBackoffMs}ms`;
                        await showToast(`Rate limited. Retrying in ${expBackoffFormatted} (attempt ${attempt})...`, "warning");
                        await sleep(expBackoffMs, abortSignal);
                      }
                      lastFailure = createFailureContext(response);
                      shouldSwitchAccount = true;
                      break;
                    }
                    const quotaKey = headerStyleToQuotaKey(headerStyle, family);
                    resetRateLimitState(account.index, quotaKey);
                    resetAccountFailureState(account.index);
                    let permissionDeniedOnProject = false;
                    if (response.status === 403) {
                      const errorBodyText = await response.clone().text().catch(() => "");
                      const extracted = extractVerificationErrorDetails(errorBodyText);
                      if (extracted.validationRequired) {
                        const verificationReason = extracted.message ?? "Google requires account verification.";
                        const cooldownMs = 10 * 60 * 1e3;
                        accountManager.markAccountVerificationRequired(account.index, verificationReason, extracted.verifyUrl);
                        accountManager.markAccountCoolingDown(account, cooldownMs, "validation-required");
                        accountManager.markRateLimited(account, cooldownMs, family, headerStyle, model);
                        const label = account.email || `Account ${account.index + 1}`;
                        if (accountManager.shouldShowAccountToast(account.index, 6e4)) {
                          await showToast(
                            `\u26A0 ${label} needs verification. Run 'opencode auth login' and use Verify accounts.`,
                            "warning"
                          );
                          accountManager.markToastShown(account.index);
                        }
                        pushDebug(`verification-required: disabled account ${account.index}`);
                        getHealthTracker().recordFailure(account.index);
                        lastFailure = createFailureContext(response);
                        shouldSwitchAccount = true;
                        break;
                      }
                      permissionDeniedOnProject = isModelPermissionDeniedOnProjectError(errorBodyText);
                    }
                    const shouldRetryEndpoint = response.status === 403 && !permissionDeniedOnProject || response.status === 404 || response.status >= 500;
                    if (shouldRetryEndpoint && i < ANTIGRAVITY_ENDPOINT_FALLBACKS.length - 1) {
                      await logResponseBody(debugContext, response, response.status);
                      lastFailure = createFailureContext(response);
                      continue;
                    }
                    if ((response.status === 404 || permissionDeniedOnProject) && isAgySdkSupportedRequest(urlString)) {
                      const fallbackModelLabel = extractRequestedGeminiModel(urlString) ?? model ?? family;
                      const modelUnavailableFallback = await tryAgySdkFallbackForRequest(
                        input3,
                        init,
                        config,
                        agySdkCredentials,
                        urlString
                      );
                      if (modelUnavailableFallback) {
                        if (modelUnavailableFallback.ok) {
                          pushDebug(`agy-sdk fallback OK after Antigravity ${response.status} for ${fallbackModelLabel}`);
                          log11.info("agy-sdk fallback served model unavailable on Antigravity", {
                            antigravityStatus: response.status,
                            model: fallbackModelLabel,
                            account: account.email ?? account.index
                          });
                          return modelUnavailableFallback;
                        }
                        pushDebug(
                          `agy-sdk fallback failed (${modelUnavailableFallback.status}) after Antigravity ${response.status} for ${fallbackModelLabel}`
                        );
                        log11.warn("agy-sdk fallback also failed for model unavailable on Antigravity", {
                          antigravityStatus: response.status,
                          fallbackStatus: modelUnavailableFallback.status,
                          model: fallbackModelLabel
                        });
                        return modelUnavailableFallback;
                      }
                      pushDebug(
                        `no agy-sdk fallback available for ${fallbackModelLabel} after Antigravity ${response.status}`
                      );
                    }
                    if (response.ok) {
                      account.consecutiveFailures = 0;
                      getHealthTracker().recordSuccess(account.index);
                      accountManager.markAccountUsed(account.index);
                      void triggerAsyncQuotaRefreshForAccount(
                        accountManager,
                        account.index,
                        client2,
                        providerId,
                        config.quota_refresh_interval_minutes
                      );
                    }
                    logAntigravityDebugResponse(debugContext, response, {
                      note: response.ok ? "Success" : `Error ${response.status}`
                    });
                    if (response.ok && !prepared.streaming) {
                      await logResponseBody(debugContext, response, response.status);
                    }
                    if (!response.ok) {
                      await logResponseBody(debugContext, response, response.status);
                      if (response.status === 400) {
                        const cloned = response.clone();
                        const bodyText = await cloned.text();
                        if (bodyText.includes("Prompt is too long") || bodyText.includes("prompt_too_long")) {
                          await showToast(
                            "Context too long - use /compact to reduce size",
                            "warning"
                          );
                          const errorMessage = `[Antigravity Error] Context is too long for this model.

Please use /compact to reduce context size, then retry your request.

Alternatively, you can:
- Use /clear to start fresh
- Use /undo to remove recent messages
- Switch to a model with larger context window`;
                          return createSyntheticErrorResponse(errorMessage, prepared.requestedModel, family);
                        }
                      }
                    }
                    if (response.ok && !prepared.streaming) {
                      const maxAttempts = config.empty_response_max_attempts ?? 4;
                      const retryDelayMs = config.empty_response_retry_delay_ms ?? 2e3;
                      const clonedForCheck = response.clone();
                      const bodyText = await clonedForCheck.text();
                      if (isEmptyResponseBody(bodyText)) {
                        const emptyAttemptKey = `${prepared.sessionId ?? "none"}:${prepared.effectiveModel ?? "unknown"}`;
                        const currentAttempts = (emptyResponseAttempts.get(emptyAttemptKey) ?? 0) + 1;
                        emptyResponseAttempts.set(emptyAttemptKey, currentAttempts);
                        pushDebug(`empty-response: attempt ${currentAttempts}/${maxAttempts}`);
                        if (currentAttempts < maxAttempts) {
                          await showToast(
                            `Empty response received. Retrying (${currentAttempts}/${maxAttempts})...`,
                            "warning"
                          );
                          await sleep(retryDelayMs, abortSignal);
                          continue;
                        }
                        emptyResponseAttempts.delete(emptyAttemptKey);
                        throw new EmptyResponseError(
                          "antigravity",
                          prepared.effectiveModel ?? "unknown",
                          currentAttempts
                        );
                      }
                      const emptyAttemptKeyClean = `${prepared.sessionId ?? "none"}:${prepared.effectiveModel ?? "unknown"}`;
                      emptyResponseAttempts.delete(emptyAttemptKeyClean);
                    }
                    const transformedResponse = await transformAntigravityResponse(
                      response,
                      prepared.streaming,
                      debugContext,
                      prepared.requestedModel,
                      prepared.projectId,
                      prepared.endpoint,
                      prepared.effectiveModel,
                      prepared.sessionId,
                      prepared.toolDebugMissing,
                      prepared.toolDebugSummary,
                      prepared.toolDebugPayload,
                      debugLines
                    );
                    const contextError = transformedResponse.headers.get("x-antigravity-context-error");
                    if (contextError) {
                      if (contextError === "prompt_too_long") {
                        await showToast(
                          "Context too long - use /compact to reduce size, or trim your request",
                          "warning"
                        );
                      } else if (contextError === "tool_pairing") {
                        await showToast(
                          "Tool call/result mismatch - use /compact to fix, or /undo last message",
                          "warning"
                        );
                      }
                    }
                    return transformedResponse;
                  } catch (error) {
                    if (tokenConsumed) {
                      getTokenTracker().refund(account.index);
                      tokenConsumed = false;
                    }
                    if (error instanceof Error && error.message === "THINKING_RECOVERY_NEEDED") {
                      if (!forceThinkingRecovery) {
                        pushDebug("thinking-recovery: API error detected, retrying with forced recovery");
                        forceThinkingRecovery = true;
                        i = -1;
                        continue;
                      }
                      const recoveryError = error;
                      const originalError = recoveryError.originalError || { error: { message: "Thinking recovery triggered" } };
                      const recoveryMessage = `${originalError.error?.message || "Session recovery failed"}

[RECOVERY] Thinking block corruption could not be resolved. Try starting a new session.`;
                      return new Response(JSON.stringify({
                        type: "error",
                        error: {
                          type: "unrecoverable_error",
                          message: recoveryMessage
                        }
                      }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                      });
                    }
                    if (i < ANTIGRAVITY_ENDPOINT_FALLBACKS.length - 1) {
                      lastError = error instanceof Error ? error : new Error(String(error));
                      continue;
                    }
                    const { failures, shouldCooldown, cooldownMs } = trackAccountFailure(account.index);
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (shouldCooldown) {
                      accountManager.markAccountCoolingDown(account, cooldownMs, "network-error");
                      accountManager.markRateLimited(account, cooldownMs, family, headerStyle, model);
                      pushDebug(`endpoint-error: cooldown ${cooldownMs}ms after ${failures} failures`);
                    }
                    shouldSwitchAccount = true;
                    break;
                  }
                }
              }
              if (shouldSwitchAccount) {
                triedSwitchIndices.add(account.index);
                if (accountCount2 <= 1) {
                  if (lastFailure) {
                    return transformAntigravityResponse(
                      lastFailure.response,
                      lastFailure.streaming,
                      lastFailure.debugContext,
                      lastFailure.requestedModel,
                      lastFailure.projectId,
                      lastFailure.endpoint,
                      lastFailure.effectiveModel,
                      lastFailure.sessionId,
                      lastFailure.toolDebugMissing,
                      lastFailure.toolDebugSummary,
                      lastFailure.toolDebugPayload,
                      debugLines
                    );
                  }
                  throw lastError || new Error("All Antigravity endpoints failed");
                }
                continue;
              }
              if (lastFailure) {
                return transformAntigravityResponse(
                  lastFailure.response,
                  lastFailure.streaming,
                  lastFailure.debugContext,
                  lastFailure.requestedModel,
                  lastFailure.projectId,
                  lastFailure.endpoint,
                  lastFailure.effectiveModel,
                  lastFailure.sessionId,
                  lastFailure.toolDebugMissing,
                  lastFailure.toolDebugSummary,
                  lastFailure.toolDebugPayload,
                  debugLines
                );
              }
              throw lastError || new Error("All Antigravity accounts failed");
            }
          }
        };
      },
      methods: [
        {
          label: "OAuth with Google (Antigravity)",
          type: "oauth",
          authorize: async (inputs) => {
            const isHeadless = !!(process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.OPENCODE_HEADLESS);
            if (inputs) {
              const accounts = [];
              const noBrowser = inputs.noBrowser === "true" || inputs["no-browser"] === "true";
              const useManualMode = noBrowser || shouldSkipLocalServer();
              let startFresh = true;
              let refreshAccountIndex;
              const existingStorage2 = await loadAccounts();
              if (existingStorage2 && existingStorage2.accounts.length > 0) {
                let menuResult;
                while (true) {
                  const now = Date.now();
                  const existingAccounts = existingStorage2.accounts.map((acc, idx) => {
                    let status = "unknown";
                    if (acc.verificationRequired) {
                      status = "verification-required";
                    } else {
                      const rateLimits = acc.rateLimitResetTimes;
                      if (rateLimits) {
                        const isRateLimited = Object.values(rateLimits).some(
                          (resetTime) => typeof resetTime === "number" && resetTime > now
                        );
                        if (isRateLimited) {
                          status = "rate-limited";
                        } else {
                          status = "active";
                        }
                      } else {
                        status = "active";
                      }
                      if (acc.coolingDownUntil && acc.coolingDownUntil > now) {
                        status = "rate-limited";
                      }
                    }
                    return {
                      email: acc.email,
                      index: idx,
                      addedAt: acc.addedAt,
                      lastUsed: acc.lastUsed,
                      status,
                      isCurrentAccount: idx === (existingStorage2.activeIndex ?? 0),
                      enabled: acc.enabled !== false
                    };
                  });
                  menuResult = await promptLoginMode(existingAccounts);
                  if (menuResult.mode === "check") {
                    console.log("\n\u{1F4CA} Checking quotas for all accounts...\n");
                    const results = await checkAccountsQuota(existingStorage2.accounts, client2, providerId);
                    let storageUpdated = false;
                    for (const res of results) {
                      const label = res.email || `Account ${res.index + 1}`;
                      const disabledStr = res.disabled ? " (disabled)" : "";
                      console.log(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
                      console.log(`  ${label}${disabledStr}`);
                      console.log(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
                      if (res.status === "error") {
                        console.log(`  \u274C Error: ${res.error}
`);
                        continue;
                      }
                      const colors = {
                        red: "\x1B[31m",
                        orange: "\x1B[33m",
                        // Yellow/orange
                        green: "\x1B[32m",
                        reset: "\x1B[0m"
                      };
                      const getColor = (remaining) => {
                        if (typeof remaining !== "number") return colors.reset;
                        if (remaining < 0.2) return colors.red;
                        if (remaining < 0.6) return colors.orange;
                        return colors.green;
                      };
                      const createProgressBar = (remaining, width = 20) => {
                        if (typeof remaining !== "number") return "\u2591".repeat(width) + " ???";
                        const filled = Math.round(remaining * width);
                        const empty = width - filled;
                        const color = getColor(remaining);
                        const bar = `${color}${"\u2588".repeat(filled)}${colors.reset}${"\u2591".repeat(empty)}`;
                        const pct = `${color}${Math.round(remaining * 100)}%${colors.reset}`.padStart(4 + color.length + colors.reset.length);
                        return `${bar} ${pct}`;
                      };
                      const formatReset = (resetTime) => {
                        if (!resetTime) return "";
                        const ms = Date.parse(resetTime) - Date.now();
                        if (ms <= 0) return " (resetting...)";
                        const hours = ms / (1e3 * 60 * 60);
                        if (hours >= 24) {
                          const days = Math.floor(hours / 24);
                          const remainingHours = Math.floor(hours % 24);
                          if (remainingHours > 0) {
                            return ` (resets in ${days}d ${remainingHours}h)`;
                          }
                          return ` (resets in ${days}d)`;
                        }
                        return ` (resets in ${formatWaitTime(ms)})`;
                      };
                      const hasGeminiCli = res.geminiCliQuota && res.geminiCliQuota.models.length > 0;
                      console.log(`
  \u250C\u2500 Gemini CLI Quota`);
                      if (!hasGeminiCli) {
                        const errorMsg = res.geminiCliQuota?.error || "No Gemini CLI quota available";
                        console.log(`  \u2502  \u2514\u2500 ${errorMsg}`);
                      } else {
                        const models = res.geminiCliQuota.models;
                        models.forEach((model, idx) => {
                          const isLast = idx === models.length - 1;
                          const connector = isLast ? "\u2514\u2500" : "\u251C\u2500";
                          const bar = createProgressBar(model.remainingFraction);
                          const reset = formatReset(model.resetTime);
                          const modelName = model.modelId.padEnd(29);
                          console.log(`  \u2502  ${connector} ${modelName} ${bar}${reset}`);
                        });
                      }
                      const hasAntigravity = res.quota && Object.keys(res.quota.groups).length > 0;
                      console.log(`  \u2502`);
                      console.log(`  \u2514\u2500 Antigravity Quota`);
                      if (!hasAntigravity) {
                        const errorMsg = res.quota?.error || "No quota information available";
                        console.log(`     \u2514\u2500 ${errorMsg}`);
                      } else {
                        const groups = res.quota.groups;
                        const groupEntries = [
                          { name: "Claude", data: groups.claude },
                          { name: "Gemini 3 Pro", data: groups["gemini-pro"] },
                          { name: "Gemini 3 Flash", data: groups["gemini-flash"] }
                        ].filter((g) => g.data);
                        groupEntries.forEach((g, idx) => {
                          const isLast = idx === groupEntries.length - 1;
                          const connector = isLast ? "\u2514\u2500" : "\u251C\u2500";
                          const bar = createProgressBar(g.data.remainingFraction);
                          const reset = formatReset(g.data.resetTime);
                          const modelName = g.name.padEnd(29);
                          console.log(`     ${connector} ${modelName} ${bar}${reset}`);
                        });
                      }
                      console.log("");
                      if (res.quota?.groups) {
                        const acc = existingStorage2.accounts[res.index];
                        if (acc) {
                          acc.cachedQuota = res.quota.groups;
                          acc.cachedQuotaUpdatedAt = Date.now();
                          storageUpdated = true;
                        }
                      }
                      if (res.updatedAccount) {
                        existingStorage2.accounts[res.index] = {
                          ...res.updatedAccount,
                          cachedQuota: res.quota?.groups,
                          cachedQuotaUpdatedAt: Date.now()
                        };
                        storageUpdated = true;
                      }
                    }
                    if (storageUpdated) {
                      await saveAccounts(existingStorage2);
                    }
                    console.log("");
                    await pressEnterToContinue();
                    continue;
                  }
                  if (menuResult.mode === "manage") {
                    if (menuResult.toggleAccountIndex !== void 0) {
                      const acc = existingStorage2.accounts[menuResult.toggleAccountIndex];
                      if (acc) {
                        acc.enabled = acc.enabled === false;
                        await saveAccounts(existingStorage2);
                        activeAccountManager?.setAccountEnabled(menuResult.toggleAccountIndex, acc.enabled);
                        console.log(`
Account ${acc.email || menuResult.toggleAccountIndex + 1} ${acc.enabled ? "enabled" : "disabled"}.
`);
                        await pressEnterToContinue();
                      }
                    }
                    continue;
                  }
                  if (menuResult.mode === "verify" || menuResult.mode === "verify-all") {
                    const verifyAll = menuResult.mode === "verify-all" || menuResult.verifyAll === true;
                    if (verifyAll) {
                      if (existingStorage2.accounts.length === 0) {
                        console.log("\nNo accounts available to verify.\n");
                        await pressEnterToContinue();
                        continue;
                      }
                      console.log(`
Checking verification status for ${existingStorage2.accounts.length} account(s)...
`);
                      let okCount = 0;
                      let blockedCount = 0;
                      let errorCount = 0;
                      let storageUpdated = false;
                      const blockedResults = [];
                      for (let i = 0; i < existingStorage2.accounts.length; i++) {
                        const account2 = existingStorage2.accounts[i];
                        if (!account2) continue;
                        const label2 = account2.email || `Account ${i + 1}`;
                        process.stdout.write(`- [${i + 1}/${existingStorage2.accounts.length}] ${label2} ... `);
                        const verification2 = await verifyAccountAccess(account2, client2, providerId);
                        if (verification2.status === "ok") {
                          const { changed, wasVerificationRequired } = clearStoredAccountVerificationRequired(account2, true);
                          if (changed) {
                            storageUpdated = true;
                          }
                          activeAccountManager?.clearAccountVerificationRequired(i, wasVerificationRequired);
                          okCount += 1;
                          console.log("ok");
                          continue;
                        }
                        if (verification2.status === "blocked") {
                          const changed = markStoredAccountVerificationRequired(
                            account2,
                            verification2.message,
                            verification2.verifyUrl
                          );
                          if (changed) {
                            storageUpdated = true;
                          }
                          activeAccountManager?.markAccountVerificationRequired(i, verification2.message, verification2.verifyUrl);
                          blockedCount += 1;
                          console.log("needs verification");
                          const verifyUrl = verification2.verifyUrl ?? account2.verificationUrl;
                          blockedResults.push({
                            label: label2,
                            message: verification2.message,
                            verifyUrl
                          });
                          continue;
                        }
                        errorCount += 1;
                        console.log(`error (${verification2.message})`);
                      }
                      if (storageUpdated) {
                        await saveAccounts(existingStorage2);
                      }
                      console.log(`
Verification summary: ${okCount} ready, ${blockedCount} need verification, ${errorCount} errors.`);
                      if (blockedResults.length > 0) {
                        console.log("\nAccounts needing verification:");
                        for (const result of blockedResults) {
                          console.log(`
- ${result.label}`);
                          console.log(`  ${result.message}`);
                          if (result.verifyUrl) {
                            console.log(`  URL: ${result.verifyUrl}`);
                          } else {
                            console.log("  URL: not provided by API response");
                          }
                        }
                        console.log("");
                      } else {
                        console.log("");
                      }
                      await pressEnterToContinue();
                      continue;
                    }
                    let verifyAccountIndex = menuResult.verifyAccountIndex;
                    if (verifyAccountIndex === void 0) {
                      verifyAccountIndex = await promptAccountIndexForVerification(existingAccounts);
                    }
                    if (verifyAccountIndex === void 0) {
                      console.log("\nVerification cancelled.\n");
                      await pressEnterToContinue();
                      continue;
                    }
                    const account = existingStorage2.accounts[verifyAccountIndex];
                    if (!account) {
                      console.log(`
Account ${verifyAccountIndex + 1} not found.
`);
                      await pressEnterToContinue();
                      continue;
                    }
                    const label = account.email || `Account ${verifyAccountIndex + 1}`;
                    console.log(`
Checking verification status for ${label}...
`);
                    const verification = await verifyAccountAccess(account, client2, providerId);
                    if (verification.status === "ok") {
                      const { changed, wasVerificationRequired } = clearStoredAccountVerificationRequired(account, true);
                      if (changed) {
                        await saveAccounts(existingStorage2);
                      }
                      activeAccountManager?.clearAccountVerificationRequired(verifyAccountIndex, wasVerificationRequired);
                      if (wasVerificationRequired) {
                        console.log(`\u2713 ${label} is ready for requests and has been re-enabled.
`);
                      } else {
                        console.log(`\u2713 ${label} is ready for requests.
`);
                      }
                      await pressEnterToContinue();
                      continue;
                    }
                    if (verification.status === "blocked") {
                      const changed = markStoredAccountVerificationRequired(
                        account,
                        verification.message,
                        verification.verifyUrl
                      );
                      if (changed) {
                        await saveAccounts(existingStorage2);
                      }
                      activeAccountManager?.markAccountVerificationRequired(
                        verifyAccountIndex,
                        verification.message,
                        verification.verifyUrl
                      );
                      const verifyUrl = verification.verifyUrl ?? account.verificationUrl;
                      console.log(`\u26A0 ${label} needs Google verification before it can be used.`);
                      if (verification.message) {
                        console.log(verification.message);
                      }
                      console.log(`${label} has been disabled until verification is completed.`);
                      if (verifyUrl) {
                        console.log(`
Verification URL:
${verifyUrl}
`);
                        if (await promptOpenVerificationUrl()) {
                          const opened = await openBrowser(verifyUrl);
                          if (opened) {
                            console.log("Opened verification URL in your browser.\n");
                          } else {
                            console.log("Could not open browser automatically. Please open the URL manually.\n");
                          }
                        }
                      } else {
                        console.log("No verification URL was returned. Try re-authenticating this account.\n");
                      }
                      await pressEnterToContinue();
                      continue;
                    }
                    console.log(`\u2717 ${label}: ${verification.message}
`);
                    await pressEnterToContinue();
                    continue;
                  }
                  break;
                }
                if (menuResult.mode === "cancel") {
                  return {
                    url: "",
                    instructions: "Authentication cancelled",
                    method: "auto",
                    callback: async () => ({ type: "failed", error: "Authentication cancelled" })
                  };
                }
                if (menuResult.deleteAccountIndex !== void 0) {
                  const deletedAccount = existingStorage2.accounts[menuResult.deleteAccountIndex];
                  const updatedAccounts = existingStorage2.accounts.filter(
                    (_, idx) => idx !== menuResult.deleteAccountIndex
                  );
                  if (deletedAccount) {
                    await removeAccountFromStorage(deletedAccount.refreshToken);
                  }
                  const removedFromPool = activeAccountManager?.removeAccountByIndex(menuResult.deleteAccountIndex);
                  if (removedFromPool) {
                    remapAccountStateAfterRemoval(menuResult.deleteAccountIndex);
                  }
                  console.log("\nAccount deleted.\n");
                  if (updatedAccounts.length > 0) {
                    const fallbackAccount = updatedAccounts[0];
                    if (fallbackAccount?.refreshToken) {
                      const fallbackResult = buildAuthSuccessFromStoredAccount(fallbackAccount);
                      try {
                        await client2.auth.set({
                          path: { id: providerId },
                          body: { type: "oauth", refresh: fallbackResult.refresh, access: "", expires: 0 }
                        });
                      } catch (storeError) {
                        log11.error("Failed to update stored Antigravity OAuth credentials", { error: String(storeError) });
                      }
                      const label = fallbackAccount.email || `Account ${1}`;
                      return {
                        url: "",
                        instructions: `Account deleted. Using ${label} for future requests.`,
                        method: "auto",
                        callback: async () => fallbackResult
                      };
                    }
                  }
                  try {
                    await client2.auth.set({
                      path: { id: providerId },
                      body: { type: "oauth", refresh: "", access: "", expires: 0 }
                    });
                  } catch (storeError) {
                    log11.error("Failed to clear stored Antigravity OAuth credentials", { error: String(storeError) });
                  }
                  return {
                    url: "",
                    instructions: "All accounts deleted. Run `opencode auth login` to reauthenticate.",
                    method: "auto",
                    callback: async () => ({
                      type: "failed",
                      error: "All accounts deleted. Reauthentication required."
                    })
                  };
                }
                if (menuResult.refreshAccountIndex !== void 0) {
                  refreshAccountIndex = menuResult.refreshAccountIndex;
                  const refreshEmail = existingStorage2.accounts[refreshAccountIndex]?.email;
                  console.log(`
Re-authenticating ${refreshEmail || "account"}...
`);
                  startFresh = false;
                }
                if (menuResult.deleteAll) {
                  await clearAccounts();
                  console.log("\nAll accounts deleted.\n");
                  startFresh = true;
                  try {
                    await client2.auth.set({
                      path: { id: providerId },
                      body: { type: "oauth", refresh: "", access: "", expires: 0 }
                    });
                  } catch (storeError) {
                    log11.error("Failed to clear stored Antigravity OAuth credentials", { error: String(storeError) });
                  }
                } else {
                  startFresh = menuResult.mode === "fresh";
                }
                if (startFresh && !menuResult.deleteAll) {
                  console.log("\nStarting fresh - existing accounts will be replaced.\n");
                } else if (!startFresh) {
                  console.log("\nAdding to existing accounts.\n");
                }
              }
              while (accounts.length < MAX_OAUTH_ACCOUNTS) {
                console.log(`
=== Antigravity OAuth (Account ${accounts.length + 1}) ===`);
                const projectId2 = await promptProjectId();
                const result = await (async () => {
                  const authorization2 = await authorizeAntigravity(projectId2);
                  const fallbackState2 = getStateFromAuthorizationUrl(authorization2.url);
                  console.log("\nOAuth URL:\n" + authorization2.url + "\n");
                  if (useManualMode) {
                    const browserOpened = await openBrowser(authorization2.url);
                    if (!browserOpened) {
                      console.log("Could not open browser automatically.");
                      console.log("Please open the URL above manually in your local browser.\n");
                    }
                    return promptManualOAuthInput(fallbackState2);
                  }
                  let listener2 = null;
                  if (!isHeadless) {
                    try {
                      listener2 = await startOAuthListener();
                    } catch {
                      listener2 = null;
                    }
                  }
                  if (!isHeadless) {
                    await openBrowser(authorization2.url);
                  }
                  if (listener2) {
                    try {
                      const SOFT_TIMEOUT_MS = 3e4;
                      const callbackPromise = listener2.waitForCallback();
                      const timeoutPromise = new Promise(
                        (_, reject) => setTimeout(() => reject(new Error("SOFT_TIMEOUT")), SOFT_TIMEOUT_MS)
                      );
                      let callbackUrl;
                      try {
                        callbackUrl = await Promise.race([callbackPromise, timeoutPromise]);
                      } catch (err) {
                        if (err instanceof Error && err.message === "SOFT_TIMEOUT") {
                          console.log("\n\u23F3 Automatic callback not received after 30 seconds.");
                          console.log("You can paste the redirect URL manually.\n");
                          console.log("OAuth URL (in case you need it again):");
                          console.log(authorization2.url + "\n");
                          try {
                            await listener2.close();
                          } catch {
                          }
                          return promptManualOAuthInput(fallbackState2);
                        }
                        throw err;
                      }
                      const params = extractOAuthCallbackParams(callbackUrl);
                      if (!params) {
                        return { type: "failed", error: "Missing code or state in callback URL" };
                      }
                      return exchangeAntigravity(params.code, params.state);
                    } catch (error) {
                      if (error instanceof Error && error.message !== "SOFT_TIMEOUT") {
                        return {
                          type: "failed",
                          error: error.message
                        };
                      }
                      return {
                        type: "failed",
                        error: error instanceof Error ? error.message : "Unknown error"
                      };
                    } finally {
                      try {
                        await listener2.close();
                      } catch {
                      }
                    }
                  }
                  return promptManualOAuthInput(fallbackState2);
                })();
                if (result.type === "failed") {
                  if (accounts.length === 0) {
                    return {
                      url: "",
                      instructions: `Authentication failed: ${result.error}`,
                      method: "auto",
                      callback: async () => result
                    };
                  }
                  console.warn(
                    `[opencode-antigravity-auth] Skipping failed account ${accounts.length + 1}: ${result.error}`
                  );
                  break;
                }
                accounts.push(result);
                try {
                  await client2.tui.showToast({
                    body: {
                      message: `Account ${accounts.length} authenticated${result.email ? ` (${result.email})` : ""}`,
                      variant: "success"
                    }
                  });
                } catch {
                }
                try {
                  if (refreshAccountIndex !== void 0) {
                    const currentStorage = await loadAccounts();
                    if (currentStorage) {
                      const updatedAccounts = [...currentStorage.accounts];
                      const parts = parseRefreshParts(result.refresh);
                      if (parts.refreshToken) {
                        updatedAccounts[refreshAccountIndex] = {
                          email: result.email ?? updatedAccounts[refreshAccountIndex]?.email,
                          refreshToken: parts.refreshToken,
                          projectId: parts.projectId ?? updatedAccounts[refreshAccountIndex]?.projectId,
                          managedProjectId: parts.managedProjectId ?? updatedAccounts[refreshAccountIndex]?.managedProjectId,
                          addedAt: updatedAccounts[refreshAccountIndex]?.addedAt ?? Date.now(),
                          lastUsed: Date.now()
                        };
                        await saveAccounts({
                          version: 4,
                          accounts: updatedAccounts,
                          activeIndex: currentStorage.activeIndex,
                          activeIndexByFamily: currentStorage.activeIndexByFamily
                        });
                      }
                    }
                  } else {
                    const isFirstAccount = accounts.length === 1;
                    await persistAccountPool([result], isFirstAccount && startFresh);
                  }
                } catch {
                }
                if (refreshAccountIndex !== void 0) {
                  break;
                }
                if (accounts.length >= MAX_OAUTH_ACCOUNTS) {
                  break;
                }
                let currentAccountCount = accounts.length;
                try {
                  const currentStorage = await loadAccounts();
                  if (currentStorage) {
                    currentAccountCount = currentStorage.accounts.length;
                  }
                } catch {
                }
                const addAnother = await promptAddAnotherAccount(currentAccountCount);
                if (!addAnother) {
                  break;
                }
              }
              const primary = accounts[0];
              if (!primary) {
                return {
                  url: "",
                  instructions: "Authentication cancelled",
                  method: "auto",
                  callback: async () => ({ type: "failed", error: "Authentication cancelled" })
                };
              }
              let actualAccountCount = accounts.length;
              try {
                const finalStorage = await loadAccounts();
                if (finalStorage) {
                  actualAccountCount = finalStorage.accounts.length;
                }
              } catch {
              }
              const successMessage = refreshAccountIndex !== void 0 ? `Token refreshed successfully.` : `Multi-account setup complete (${actualAccountCount} account(s)).`;
              return {
                url: "",
                instructions: successMessage,
                method: "auto",
                callback: async () => primary
              };
            }
            const projectId = "";
            const existingStorage = await loadAccounts();
            const existingCount = existingStorage?.accounts.length ?? 0;
            const useManualFlow = isHeadless || shouldSkipLocalServer();
            let listener = null;
            if (!useManualFlow) {
              try {
                listener = await startOAuthListener();
              } catch {
                listener = null;
              }
            }
            const authorization = await authorizeAntigravity(projectId);
            const fallbackState = getStateFromAuthorizationUrl(authorization.url);
            if (!useManualFlow) {
              const browserOpened = await openBrowser(authorization.url);
              if (!browserOpened) {
                listener?.close().catch(() => {
                });
                listener = null;
              }
            }
            if (listener) {
              return {
                url: authorization.url,
                instructions: "Complete sign-in in your browser. We'll automatically detect the redirect back to localhost.",
                method: "auto",
                callback: async () => {
                  const CALLBACK_TIMEOUT_MS = 3e4;
                  try {
                    const callbackPromise = listener.waitForCallback();
                    const timeoutPromise = new Promise(
                      (_, reject) => setTimeout(() => reject(new Error("CALLBACK_TIMEOUT")), CALLBACK_TIMEOUT_MS)
                    );
                    let callbackUrl;
                    try {
                      callbackUrl = await Promise.race([callbackPromise, timeoutPromise]);
                    } catch (err) {
                      if (err instanceof Error && err.message === "CALLBACK_TIMEOUT") {
                        return {
                          type: "failed",
                          error: "Callback timeout - please use CLI with --no-browser flag for manual input"
                        };
                      }
                      throw err;
                    }
                    const params = extractOAuthCallbackParams(callbackUrl);
                    if (!params) {
                      return { type: "failed", error: "Missing code or state in callback URL" };
                    }
                    const result = await exchangeAntigravity(params.code, params.state);
                    if (result.type === "success") {
                      try {
                        await persistAccountPool([result], false);
                      } catch {
                      }
                      const newTotal = existingCount + 1;
                      const toastMessage = existingCount > 0 ? `Added account${result.email ? ` (${result.email})` : ""} - ${newTotal} total` : `Authenticated${result.email ? ` (${result.email})` : ""}`;
                      try {
                        await client2.tui.showToast({
                          body: {
                            message: toastMessage,
                            variant: "success"
                          }
                        });
                      } catch {
                      }
                    }
                    return result;
                  } catch (error) {
                    return {
                      type: "failed",
                      error: error instanceof Error ? error.message : "Unknown error"
                    };
                  } finally {
                    try {
                      await listener.close();
                    } catch {
                    }
                  }
                }
              };
            }
            return {
              url: authorization.url,
              instructions: "Visit the URL above, complete OAuth, then paste either the full redirect URL or the authorization code.",
              method: "code",
              callback: async (codeInput) => {
                const params = parseOAuthCallbackInput(codeInput, fallbackState);
                if ("error" in params) {
                  return { type: "failed", error: params.error };
                }
                const result = await exchangeAntigravity(params.code, params.state);
                if (result.type === "success") {
                  try {
                    await persistAccountPool([result], false);
                  } catch {
                  }
                  const newTotal = existingCount + 1;
                  const toastMessage = existingCount > 0 ? `Added account${result.email ? ` (${result.email})` : ""} - ${newTotal} total` : `Authenticated${result.email ? ` (${result.email})` : ""}`;
                  try {
                    await client2.tui.showToast({
                      body: {
                        message: toastMessage,
                        variant: "success"
                      }
                    });
                  } catch {
                  }
                }
                return result;
              }
            };
          }
        },
        {
          label: "Gemini API key (Antigravity SDK / Google AI)",
          type: "api",
          prompts: [
            {
              type: "text",
              key: "key",
              message: "Gemini API key",
              placeholder: "GEMINI_API_KEY or Google AI API key",
              validate: (value) => value.trim() ? void 0 : "API key is required"
            }
          ]
        }
      ]
    }
  };
  const dispose = async () => {
    activeRefreshQueue?.stop();
    activeRefreshQueue = null;
    const manager = activeLoaderAccountManager;
    activeLoaderAccountManager = null;
    if (manager) {
      if (activeAccountManager === manager) {
        activeAccountManager = null;
      }
      await manager.flushSaveToDisk().catch(() => {
      });
    }
  };
  return { hooks, dispose };
};
var createAntigravityPlugin = (providerId) => async (context) => {
  const runtime = await createAntigravityRuntime(providerId)(context);
  return runtime.hooks;
};
var AntigravityCLIOAuthPlugin = createAntigravityPlugin(ANTIGRAVITY_PROVIDER_ID);
var oauthFlowHelpers = {
  openBrowser,
  shouldSkipLocalServer,
  getStateFromAuthorizationUrl,
  extractOAuthCallbackParams,
  parseOAuthCallbackInput,
  persistAccountPool
};
function toUrlString(value) {
  if (typeof value === "string") {
    return value;
  }
  const candidate = value.url;
  if (candidate) {
    return candidate;
  }
  return value.toString();
}
function toWarmupStreamUrl(value) {
  const urlString = toUrlString(value);
  try {
    const url = new URL(urlString);
    if (!url.pathname.includes(":streamGenerateContent")) {
      url.pathname = url.pathname.replace(":generateContent", ":streamGenerateContent");
    }
    url.searchParams.set("alt", "sse");
    return url.toString();
  } catch {
    return urlString;
  }
}
function extractModelFromUrl(urlString) {
  const match = urlString.match(/\/models\/([^:\/?]+)(?::\w+)?/);
  return match?.[1] ?? null;
}
function extractModelFromUrlWithSuffix(urlString) {
  const match = urlString.match(/\/models\/([^:\/\?]+)/);
  return match?.[1] ?? null;
}
function getModelFamilyFromUrl(urlString) {
  const model = extractModelFromUrl(urlString);
  let family = "gemini";
  if (model && model.includes("claude")) {
    family = "claude";
  }
  if (isDebugEnabled()) {
    logModelFamily(urlString, model, family);
  }
  return family;
}
function resolveQuotaFallbackHeaderStyle(input3) {
  if (input3.family !== "gemini") {
    return null;
  }
  if (!input3.alternateStyle || input3.alternateStyle === input3.headerStyle) {
    return null;
  }
  return input3.alternateStyle;
}
function resolveHeaderRoutingDecision(urlString, family, config) {
  const cliFirst = getCliFirst(config);
  const preferredHeaderStyle = getHeaderStyleFromUrl(urlString, family, cliFirst);
  const modelWithSuffix = extractModelFromUrlWithSuffix(urlString);
  const resolvedModel = modelWithSuffix ? resolveModelWithTier(modelWithSuffix, { cli_first: cliFirst }) : null;
  const explicitQuota = resolvedModel?.explicitQuota ?? false;
  return {
    cliFirst,
    preferredHeaderStyle,
    explicitQuota,
    allowQuotaFallback: family === "gemini" && resolvedModel?.isImageModel !== true && !isGeminiPublicOnlyModel(modelWithSuffix ?? "")
  };
}
function getCliFirst(config) {
  return config.cli_first ?? false;
}
function getHeaderStyleFromUrl(urlString, family, cliFirst = false) {
  if (family === "claude") {
    return "antigravity";
  }
  const modelWithSuffix = extractModelFromUrlWithSuffix(urlString);
  if (!modelWithSuffix) {
    return cliFirst ? "gemini-cli" : "antigravity";
  }
  const { quotaPreference } = resolveModelWithTier(modelWithSuffix, { cli_first: cliFirst });
  return quotaPreference ?? "antigravity";
}

// src/plugin/account-admin.ts
function accountLabel(account, index) {
  return account?.email || `Account ${index + 1}`;
}
function accountState(account, now = Date.now()) {
  if (account.verificationRequired) {
    return "verification-required";
  }
  if (account.coolingDownUntil && account.coolingDownUntil > now) {
    return "rate-limited";
  }
  const limits = account.rateLimitResetTimes;
  if (limits && Object.values(limits).some((reset) => typeof reset === "number" && reset > now)) {
    return "rate-limited";
  }
  return "active";
}
async function loadAccountPool() {
  const storage = await loadAccounts();
  return storage && storage.accounts.length > 0 ? storage : null;
}
var NO_ACCOUNTS_MESSAGE = "No Google accounts are stored. Run `opencode auth login` to sign in.";
function renderAccountList(storage) {
  if (!storage || storage.accounts.length === 0) {
    return NO_ACCOUNTS_MESSAGE;
  }
  const now = Date.now();
  const lines = storage.accounts.map((account, index) => {
    const flags = [
      index === (storage.activeIndex ?? 0) ? "current" : "",
      account.enabled === false ? "disabled" : "",
      accountState(account, now) === "active" ? "" : accountState(account, now)
    ].filter(Boolean);
    const suffix = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
    return `  ${index + 1}. ${accountLabel(account, index)}${suffix}`;
  });
  return [`${storage.accounts.length} account(s):`, ...lines].join("\n");
}
async function renderAccounts() {
  return renderAccountList(await loadAccountPool());
}
async function setAccountEnabled(index, enabled) {
  const storage = await loadAccountPool();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    return { ok: false, message: `No account ${index + 1}. ${await renderAccounts()}` };
  }
  account.enabled = enabled;
  await saveAccounts(storage);
  return {
    ok: true,
    index,
    message: `${accountLabel(account, index)} ${enabled ? "enabled" : "disabled"}.`
  };
}
async function deleteAccount(index) {
  const storage = await loadAccountPool();
  const account = storage?.accounts[index];
  if (!storage || !account) {
    return { ok: false, message: `No account ${index + 1}. ${await renderAccounts()}` };
  }
  await removeAccountFromStorage(account.refreshToken);
  return { ok: true, index, message: `Deleted ${accountLabel(account, index)}.` };
}
function formatResetTime(resetTime) {
  if (!resetTime) return "";
  const ms = Date.parse(resetTime) - Date.now();
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return " (resetting)";
  const minutes = Math.round(ms / 6e4);
  if (minutes < 60) return ` (resets in ${minutes}m)`;
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? ` (resets in ${days}d ${hours % 24}h)` : ` (resets in ${hours}h)`;
}
function formatRemaining(remaining) {
  return typeof remaining === "number" ? `${Math.round(remaining * 100)}%` : "unknown";
}
async function renderQuota(client2, providerId) {
  const storage = await loadAccountPool();
  if (!storage) {
    return NO_ACCOUNTS_MESSAGE;
  }
  const results = await checkAccountsQuota(storage.accounts, client2, providerId);
  const blocks = [];
  for (const result of results) {
    const label = result.email || `Account ${result.index + 1}`;
    const lines = [`${label}${result.disabled ? " [disabled]" : ""}`];
    if (result.status === "error") {
      lines.push(`  error: ${result.error}`);
      blocks.push(lines.join("\n"));
      continue;
    }
    const groups = result.quota?.groups ?? {};
    const rows = [
      ["Claude", groups.claude],
      ["Gemini 3 Pro", groups["gemini-pro"]],
      ["Gemini 3 Flash", groups["gemini-flash"]]
    ];
    const known = rows.filter(([, data]) => data);
    if (known.length === 0) {
      lines.push(`  Antigravity: ${result.quota?.error ?? "no quota information"}`);
    } else {
      for (const [name, data] of known) {
        lines.push(`  ${name.padEnd(16)} ${formatRemaining(data?.remainingFraction)}${formatResetTime(data?.resetTime)}`);
      }
    }
    for (const model of result.geminiCliQuota?.models ?? []) {
      lines.push(
        `  ${`CLI ${model.modelId}`.padEnd(16)} ${formatRemaining(model.remainingFraction)}${formatResetTime(model.resetTime)}`
      );
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}
async function renderVerification(indices, verify, client2, providerId) {
  const storage = await loadAccountPool();
  if (!storage) {
    return NO_ACCOUNTS_MESSAGE;
  }
  const lines = [];
  for (const index of indices) {
    const account = storage.accounts[index];
    if (!account) {
      lines.push(`No account ${index + 1}.`);
      continue;
    }
    const label = accountLabel(account, index);
    const verification = await verify(account, client2, providerId);
    if (verification.status === "ok") {
      lines.push(`${label}: ok`);
      continue;
    }
    if (verification.status === "blocked") {
      lines.push(`${label}: needs Google verification`);
      lines.push(`  ${verification.message}`);
      if (verification.verifyUrl) {
        lines.push(`  ${verification.verifyUrl}`);
      }
      continue;
    }
    lines.push(`${label}: error - ${verification.message}`);
  }
  return lines.join("\n");
}
async function allAccountIndices() {
  const storage = await loadAccountPool();
  return storage ? storage.accounts.map((_, index) => index) : [];
}
function parseAccountNumber(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed - 1 : null;
}

// src/plugin/account-login.ts
var log12 = createLogger("account-login");
async function accountCount() {
  return (await loadAccountPool())?.accounts.length ?? 0;
}
async function persist(helpers, result, before) {
  await helpers.persistAccountPool([result], false);
  const total = await accountCount();
  const who = result.email ? ` (${result.email})` : "";
  const added = total > before;
  return {
    ok: true,
    email: result.email,
    added,
    total,
    message: added ? `Added account${who}. ${total} account(s) stored.` : `Signed in${who}, but the pool still holds ${total} account(s) \u2014 Google returned an account that was already stored. Pick a different account in the Google chooser to add another one.`
  };
}
async function createAuthorization(helpers, projectId = "") {
  const authorization = await authorizeAntigravity(projectId);
  return { url: authorization.url, state: helpers.getStateFromAuthorizationUrl(authorization.url) };
}
async function completePastedLogin(helpers, pasted, fallbackState) {
  const before = await accountCount();
  const params = helpers.parseOAuthCallbackInput(pasted, fallbackState);
  if ("error" in params) {
    return { ok: false, message: params.error };
  }
  const result = await exchangeAntigravity(params.code, params.state);
  if (result.type === "failed") {
    return { ok: false, message: result.error };
  }
  return persist(helpers, result, before);
}
async function addAccountViaBrowser(helpers, options = {}) {
  if (helpers.shouldSkipLocalServer()) {
    return {
      ok: false,
      message: "This environment cannot receive the OAuth redirect (no local callback listener). Run `opencode auth login` in a terminal, or the account CLI with `--no-browser`, and paste the redirect URL."
    };
  }
  const before = await accountCount();
  let listener;
  try {
    listener = await startOAuthListener();
  } catch (error) {
    log12.debug("Could not start the OAuth callback listener", { error: String(error) });
    return {
      ok: false,
      message: "Could not start the local OAuth callback listener \u2014 another sign-in may be in progress. Finish or cancel it and try again."
    };
  }
  try {
    const { url } = await createAuthorization(helpers, options.projectId ?? "");
    await options.onAuthorizationUrl?.(url);
    await helpers.openBrowser(url);
    const callbackUrl = await listener.waitForCallback();
    const params = helpers.extractOAuthCallbackParams(callbackUrl);
    if (!params) {
      return { ok: false, message: "The redirect back from Google carried no code or state." };
    }
    const result = await exchangeAntigravity(params.code, params.state);
    if (result.type === "failed") {
      return { ok: false, message: `Sign-in failed: ${result.error}` };
    }
    return persist(helpers, result, before);
  } catch (error) {
    return { ok: false, message: `Sign-in failed: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    await listener.close().catch(() => {
    });
  }
}

// src/v2/legacy-client.ts
var ok = async () => ({ data: true });
function unsupported(name) {
  return async () => {
    throw new Error(`client.${name} is not available when running on OpenCode 2.x`);
  };
}
function createLegacyClient() {
  const client2 = {
    app: { log: ok },
    tui: { showToast: ok },
    auth: { set: ok },
    session: {
      prompt: unsupported("session.prompt"),
      messages: unsupported("session.messages"),
      abort: unsupported("session.abort")
    }
  };
  return client2;
}

// src/cli/accounts.ts
var USAGE = `Antigravity account manager

Usage:
  antigravity-accounts [command]

Commands:
  (none)                 Interactive menu (falls back to \`list\` without a TTY)
  list                   Show stored accounts
  add [--no-browser]     Sign in and add another Google account
  enable <n>             Re-enable account n (1-based)
  disable <n>            Exclude account n from rotation
  remove <n> | --all     Delete account n, or every account
  quota                  Show remaining quota per account
  verify [<n>|--all]     Check whether accounts can reach Antigravity
  help                   Show this help

Inside OpenCode, \`opencode auth login\` shows the same menu without stopping
the app.
`;
var client = createLegacyClient();
async function readLine(question) {
  const rl = createInterface2({ input: input2, output: output2 });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
function toAccountInfos(storage) {
  const now = Date.now();
  return storage.accounts.map((account, index) => ({
    email: account.email,
    index,
    addedAt: account.addedAt,
    lastUsed: account.lastUsed,
    status: accountState(account, now),
    isCurrentAccount: index === (storage.activeIndex ?? 0),
    enabled: account.enabled !== false
  }));
}
async function addAccountManually() {
  const { url, state } = await createAuthorization(oauthFlowHelpers);
  console.log("\nOpen this URL and pick the Google account you want to add:\n");
  console.log(`${url}
`);
  await oauthFlowHelpers.openBrowser(url);
  if (!input2.isTTY) {
    return {
      ok: false,
      message: "Pasting the redirect URL needs an interactive terminal. Run this command from one."
    };
  }
  const pasted = await readLine("Paste the full redirect URL (or just the code): ");
  return completePastedLogin(oauthFlowHelpers, pasted, state);
}
async function addAccount(options) {
  const result = options.noBrowser ? await addAccountManually() : await addAccountViaBrowser(oauthFlowHelpers, {
    onAuthorizationUrl: (url) => {
      console.log("\nOpen this URL and pick the Google account you want to add:\n");
      console.log(`${url}
`);
      console.log("Waiting for the browser redirect...");
    }
  });
  console.log(`
${result.message}
`);
  return result.ok;
}
async function runMenu() {
  for (; ; ) {
    const storage = await loadAccountPool();
    if (!storage) {
      console.log(renderAccountList(storage));
      const answer = await readLine("Add an account now? [y/N]: ");
      if (answer.toLowerCase().startsWith("y")) {
        await addAccount({ noBrowser: false });
        continue;
      }
      return;
    }
    const action = await showAuthMenu(toAccountInfos(storage));
    switch (action.type) {
      case "cancel":
        return;
      case "add":
        await addAccount({ noBrowser: false });
        await pressEnterToContinue();
        break;
      case "check":
        console.log(`
${await renderQuota(client, ANTIGRAVITY_PROVIDER_ID)}
`);
        await pressEnterToContinue();
        break;
      case "verify": {
        const answer = await readLine("Account number to verify: ");
        const index = parseAccountNumber(answer);
        if (index !== null) {
          console.log(
            `
${await renderVerification([index], verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID)}
`
          );
        }
        await pressEnterToContinue();
        break;
      }
      case "verify-all":
        console.log(
          `
${await renderVerification(
            await allAccountIndices(),
            verifyAccountAccess,
            client,
            ANTIGRAVITY_PROVIDER_ID
          )}
`
        );
        await pressEnterToContinue();
        break;
      case "configure-models": {
        const result = await updateOpencodeConfig();
        console.log(
          result.success ? `
Models configured in ${result.configPath}
` : `
Could not configure models: ${result.error}
`
        );
        await pressEnterToContinue();
        break;
      }
      case "delete-all":
        await clearAccounts();
        console.log("\nAll accounts deleted.\n");
        await pressEnterToContinue();
        break;
      case "select-account": {
        const choice = await showAccountDetails(action.account);
        const index = action.account.index;
        if (choice === "toggle") {
          const result = await setAccountEnabled(index, action.account.enabled === false);
          console.log(`
${result.message}
`);
          await pressEnterToContinue();
        } else if (choice === "delete") {
          const result = await deleteAccount(index);
          console.log(`
${result.message}
`);
          await pressEnterToContinue();
        } else if (choice === "refresh") {
          const label = accountLabel(storage.accounts[index], index);
          console.log(`
Sign in again as ${label} to replace its token.
`);
          await addAccount({ noBrowser: false });
          await pressEnterToContinue();
        } else if (choice === "verify") {
          console.log(
            `
${await renderVerification([index], verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID)}
`
          );
          await pressEnterToContinue();
        }
        break;
      }
    }
  }
}
async function runAccountsCli(argv) {
  const [command = "", ...rest] = argv;
  const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
  const positional = rest.filter((arg) => !arg.startsWith("--"));
  switch (command) {
    case "":
      if (isTTY() && input2.isTTY) {
        await runMenu();
      } else {
        console.log(await renderAccounts());
      }
      return 0;
    case "list":
      console.log(await renderAccounts());
      return 0;
    case "add":
      return await addAccount({ noBrowser: flags.has("--no-browser") }) ? 0 : 1;
    case "enable":
    case "disable": {
      const index = parseAccountNumber(positional[0]);
      if (index === null) {
        console.log(`Usage: antigravity-accounts ${command} <account number>`);
        return 2;
      }
      const result = await setAccountEnabled(index, command === "enable");
      console.log(result.message);
      return result.ok ? 0 : 1;
    }
    case "remove": {
      if (flags.has("--all")) {
        await clearAccounts();
        console.log("All accounts deleted.");
        return 0;
      }
      const index = parseAccountNumber(positional[0]);
      if (index === null) {
        console.log("Usage: antigravity-accounts remove <account number> | --all");
        return 2;
      }
      const result = await deleteAccount(index);
      console.log(result.message);
      return result.ok ? 0 : 1;
    }
    case "quota":
      console.log(await renderQuota(client, ANTIGRAVITY_PROVIDER_ID));
      return 0;
    case "verify": {
      const indices = await allAccountIndices();
      if (indices.length === 0) {
        console.log(await renderAccounts());
        return 1;
      }
      if (flags.has("--all") || positional.length === 0) {
        console.log(await renderVerification(indices, verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID));
        return 0;
      }
      const index = parseAccountNumber(positional[0]);
      if (index === null) {
        console.log("Usage: antigravity-accounts verify [<account number>|--all]");
        return 2;
      }
      console.log(await renderVerification([index], verifyAccountAccess, client, ANTIGRAVITY_PROVIDER_ID));
      return 0;
    }
    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      return 0;
    default:
      console.log(`Unknown command: ${command}
`);
      console.log(USAGE);
      return 2;
  }
}
async function main(argv = process.argv.slice(2)) {
  try {
    process.exitCode = await runAccountsCli(argv);
  } catch (error) {
    console.error(`antigravity-accounts: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

// cli.ts
void main();
//# sourceMappingURL=accounts.js.map
