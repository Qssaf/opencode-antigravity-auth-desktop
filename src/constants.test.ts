import { it, expect } from "vitest"
import { ANTIGRAVITY_DEFAULT_PROJECT_ID } from "./constants.ts"

it("uses AGY's consumer fallback project", () => {
  expect(ANTIGRAVITY_DEFAULT_PROJECT_ID).toBe("default-cli-project")
})
