import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "./config"

const { ensureGitignoreSyncMock } = vi.hoisted(() => ({
  ensureGitignoreSyncMock: vi.fn(),
}))

vi.mock("./storage", () => ({
  ensureGitignoreSync: ensureGitignoreSyncMock,
  getConfigDir: () => "/tmp/opencode-antigravity-debug-tests-config",
}))

describe("debug sink policy", () => {
  let originalDebugEnv: string | undefined
  let originalDebugTuiEnv: string | undefined

  beforeEach(() => {
    vi.resetModules()
    originalDebugEnv = process.env.OPENCODE_ANTIGRAVITY_DEBUG
    originalDebugTuiEnv = process.env.OPENCODE_ANTIGRAVITY_DEBUG_TUI
    delete process.env.OPENCODE_ANTIGRAVITY_DEBUG
    delete process.env.OPENCODE_ANTIGRAVITY_DEBUG_TUI
    ensureGitignoreSyncMock.mockReset()
  })

  afterEach(() => {
    if (originalDebugEnv === undefined) {
      delete process.env.OPENCODE_ANTIGRAVITY_DEBUG
    } else {
      process.env.OPENCODE_ANTIGRAVITY_DEBUG = originalDebugEnv
    }

    if (originalDebugTuiEnv === undefined) {
      delete process.env.OPENCODE_ANTIGRAVITY_DEBUG_TUI
    } else {
      process.env.OPENCODE_ANTIGRAVITY_DEBUG_TUI = originalDebugTuiEnv
    }
  })

  it("keeps debug_tui independent from debug in config", async () => {
    const { initializeDebug, isDebugEnabled, isDebugTuiEnabled, getLogFilePath } = await import("./debug")

    initializeDebug({
      ...DEFAULT_CONFIG,
      debug: false,
      debug_tui: true,
    })

    expect(isDebugEnabled()).toBe(false)
    expect(isDebugTuiEnabled()).toBe(true)
    expect(getLogFilePath()).toBeUndefined()
  })

  it("keeps debug_tui independent from debug in env fallback", async () => {
    process.env.OPENCODE_ANTIGRAVITY_DEBUG = "0"
    process.env.OPENCODE_ANTIGRAVITY_DEBUG_TUI = "1"

    const { isDebugEnabled, isDebugTuiEnabled, getLogFilePath } = await import("./debug")

    expect(isDebugEnabled()).toBe(false)
    expect(isDebugTuiEnabled()).toBe(true)
    expect(getLogFilePath()).toBeUndefined()
  })

  it("keeps file debug enabled without TUI when only debug is true", async () => {
    const { initializeDebug, isDebugEnabled, isDebugTuiEnabled, getLogFilePath } = await import("./debug")

    initializeDebug({
      ...DEFAULT_CONFIG,
      debug: true,
      debug_tui: false,
      log_dir: "/tmp/opencode-antigravity-debug-tests",
    })

    expect(isDebugEnabled()).toBe(true)
    expect(isDebugTuiEnabled()).toBe(false)
    expect(getLogFilePath()).toContain("antigravity-debug-")
  })

  describe("log files", () => {
    let logDir: string

    beforeEach(() => {
      logDir = mkdtempSync(join(tmpdir(), "antigravity-debug-logs-"))
    })

    afterEach(() => {
      rmSync(logDir, { recursive: true, force: true })
    })

    const logFiles = () => readdirSync(logDir).filter((file) => file.endsWith(".log")).sort()

    it("creates no log file and deletes no old one until something is logged", async () => {
      const old = Array.from({ length: 30 }, (_, i) => `antigravity-debug-old-${String(i).padStart(2, "0")}.log`)
      for (const file of old) writeFileSync(join(logDir, file), "kept\n")
      const { initializeDebug, debugLogToFile, getLogFilePath } = await import("./debug")

      initializeDebug({ ...DEFAULT_CONFIG, debug: true, log_dir: logDir })
      expect(logFiles()).toEqual(old)

      debugLogToFile("first line")
      const logFile = getLogFilePath()
      if (!logFile) throw new Error("no log file path")
      await vi.waitFor(() => expect(readFileSync(logFile, "utf8")).toContain("first line"))
      // The 25 newest old files and the new one.
      expect(logFiles()).toHaveLength(26)
    })

    it("keeps writing to one file when it is initialised again", async () => {
      const { initializeDebug, debugLogToFile, getLogFilePath } = await import("./debug")
      const config = { ...DEFAULT_CONFIG, debug: true, log_dir: logDir }

      initializeDebug(config)
      debugLogToFile("before")
      const logFile = getLogFilePath()
      if (!logFile) throw new Error("no log file path")
      await new Promise((resolve) => setTimeout(resolve, 5))
      initializeDebug(config)
      debugLogToFile("after")

      expect(getLogFilePath()).toBe(logFile)
      await vi.waitFor(() => expect(readFileSync(logFile, "utf8")).toMatch(/before[\s\S]*after/))
      expect(logFiles()).toHaveLength(1)
    })
  })

  it("redacts API keys in debug headers and URLs", async () => {
    const { maskHeadersForLog, sanitizeUrlForLog } = await import("./debug")

    expect(maskHeadersForLog({
      Authorization: "Bearer secret",
      "x-api-key": "api-secret",
      "x-goog-api-key": "goog-secret",
      "Proxy-Authorization": "Basic proxy-secret",
      "content-type": "application/json",
    })).toEqual({
      authorization: "[redacted]",
      "x-api-key": "[redacted]",
      "x-goog-api-key": "[redacted]",
      "proxy-authorization": "[redacted]",
      "content-type": "application/json",
    })
    expect(sanitizeUrlForLog("https://generativelanguage.googleapis.com/v1beta/models?key=secret&alt=sse")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models?key=%5Bredacted%5D&alt=sse",
    )
  })

  it("shows an account rate-limited for any model of the family in the rate-limit snapshot", async () => {
    const { formatRateLimitSnapshot } = await import("./debug")
    const now = 1_000_000

    expect(formatRateLimitSnapshot("gemini", [
      { index: 0, email: "a@example.com", rateLimitResetTimes: { "gemini-antigravity:antigravity-gemini-3.8-flash": now + 60_000, claude: now + 999_000 } },
      { index: 1, email: "b@example.com", rateLimitResetTimes: { "gemini-antigravity:antigravity-gemini-3.8-flash": now - 1 } },
      { index: 2, email: "c@example.com", rateLimitResetTimes: {} },
    ], now)).toBe("a@example.com=wait 60s | b@example.com=ready | c@example.com=ready")
  })
})
