import { describe, it, expect } from "vitest"
import {
  ANTIGRAVITY_DEFAULT_PROJECT_ID,
  GEMINI_CLI_HEADERS,
  getRandomizedHeaders,
  type HeaderSet,
} from "./constants.ts"

it("uses AGY's consumer fallback project", () => {
  expect(ANTIGRAVITY_DEFAULT_PROJECT_ID).toBe("default-cli-project")
})

describe("GEMINI_CLI_HEADERS", () => {
  it("matches Code Assist headers from opencode-gemini-auth", () => {
    expect(GEMINI_CLI_HEADERS).toEqual({
      "User-Agent": "google-api-nodejs-client/9.15.1",
      "X-Goog-Api-Client": "gl-node/22.17.0",
      "Client-Metadata": "ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI",
    })
  })
})

describe("getRandomizedHeaders", () => {
  describe("antigravity style", () => {
    it("returns all three headers", () => {
      const headers = getRandomizedHeaders("antigravity")
      expect(headers["User-Agent"]).toBeDefined()
      expect(headers["X-Goog-Api-Client"]).toBeDefined()
      expect(headers["Client-Metadata"]).toBeDefined()
    })

    it("returns User-Agent in antigravity format", () => {
      const headers = getRandomizedHeaders("antigravity")
      expect(headers["User-Agent"]).toMatch(/^antigravity\//)
    })

    it("aligns Client-Metadata platform with User-Agent platform", () => {
      for (let i = 0; i < 50; i++) {
        const headers = getRandomizedHeaders("antigravity")
        const ua = headers["User-Agent"]!
        const metadata = JSON.parse(headers["Client-Metadata"]!)
        if (ua.includes("windows/")) {
          expect(metadata.platform).toBe("WINDOWS")
        } else {
          expect(metadata.platform).toBe("MACOS")
        }
      }
    })

    it("never produces a linux User-Agent", () => {
      for (let i = 0; i < 50; i++) {
        const headers = getRandomizedHeaders("antigravity")
        expect(headers["User-Agent"]).not.toMatch(/linux\//)
      }
    })
  })
})

describe("HeaderSet type", () => {
  it("allows omitting X-Goog-Api-Client and Client-Metadata", () => {
    const headers: HeaderSet = {
      "User-Agent": "test",
    }
    expect(headers["User-Agent"]).toBe("test")
    expect(headers["X-Goog-Api-Client"]).toBeUndefined()
    expect(headers["Client-Metadata"]).toBeUndefined()
  })

  it("allows including all three headers", () => {
    const headers: HeaderSet = {
      "User-Agent": "test",
      "X-Goog-Api-Client": "test-client",
      "Client-Metadata": "test-metadata",
    }
    expect(headers["User-Agent"]).toBe("test")
    expect(headers["X-Goog-Api-Client"]).toBe("test-client")
    expect(headers["Client-Metadata"]).toBe("test-metadata")
  })
})
