import { describe, expect, it } from "vitest"
import { TRIMMED_TOOL_OUTPUT, trimOldToolOutput } from "./tool-output-trim"

// A chat of `n` tool steps, each returning `chars` characters of output.
function chat(n: number, chars: number, name = "read") {
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
    { role: "user", parts: [{ text: "fix the bug" }] },
  ]
  for (let i = 0; i < n; i++) {
    contents.push({ role: "model", parts: [{ functionCall: { name, args: { path: `f${i}` } }, thoughtSignature: `sig${i}` }] })
    contents.push({ role: "user", parts: [{ functionResponse: { name, response: { name, content: `${i}:`.padEnd(chars, "x") } } }] })
  }
  return contents
}

const outputs = (contents: ReturnType<typeof chat>) =>
  contents.flatMap((c) => c.parts).flatMap((p) => {
    const response = (p.functionResponse as { response?: { content?: unknown } } | undefined)?.response
    return response ? [response.content] : []
  })

describe("trimOldToolOutput", () => {
  it("leaves a chat alone until old output passes the keep window by a whole step", () => {
    // 30 outputs of ~1k tokens: 30k total, under the 40k kept.
    const contents = chat(30, 3000)
    const before = JSON.stringify(contents)
    expect(trimOldToolOutput(contents)).toBe(0)
    expect(JSON.stringify(contents)).toBe(before)
  })

  it("replaces the oldest outputs and keeps the newest 40k tokens as they were", () => {
    const contents = chat(100, 3000) // ~100k tokens of output
    const trimmed = trimOldToolOutput(contents)
    const after = outputs(contents)
    // 100k - 40k = 60k over the window, trimmed in whole 20k steps.
    expect(trimmed).toBe(60)
    expect(after.slice(0, 60).every((o) => o === TRIMMED_TOOL_OUTPUT)).toBe(true)
    expect(after.slice(60).every((o) => typeof o === "string" && o !== TRIMMED_TOOL_OUTPUT)).toBe(true)
    expect(after[99]).toBe("99:".padEnd(3000, "x"))
  })

  it("never touches tool calls, their signatures or the turn layout", () => {
    const contents = chat(100, 3000)
    const calls = JSON.stringify(contents.map((c) => c.parts.filter((p) => !p.functionResponse)))
    const roles = contents.map((c) => c.role)
    trimOldToolOutput(contents)
    expect(JSON.stringify(contents.map((c) => c.parts.filter((p) => !p.functionResponse)))).toBe(calls)
    expect(contents.map((c) => c.role)).toEqual(roles)
  })

  it("moves the trimmed boundary only in whole steps, so Google's cache of the chat's start stays valid", () => {
    const trimmedCount = (n: number) => trimOldToolOutput(chat(n, 3000))
    // 61k..79k tokens of output: still one 20k step over the window.
    expect(new Set([61, 65, 70, 75, 79].map(trimmedCount))).toEqual(new Set([20]))
    expect(trimmedCount(80)).toBe(40)
  })

  it("keeps skill output, which carries instructions, and outputs too small to shrink", () => {
    const contents = [...chat(100, 3000), ...chat(1, 3000, "skill"), ...chat(1, 20)]
    trimOldToolOutput(contents)
    const all = outputs(contents)
    expect(all.at(-2)).toBe("0:".padEnd(3000, "x"))
    expect(all.at(-1)).toBe("0:".padEnd(20, "x"))

    const tiny = chat(3000, 60) // 3000 outputs of 20 tokens: each smaller than the note
    expect(trimOldToolOutput(tiny)).toBe(0)
  })

  it("is the same for the same chat, so each step sends identical history", () => {
    const a = chat(120, 3000)
    const b = chat(120, 3000)
    trimOldToolOutput(a)
    trimOldToolOutput(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it("ignores contents it does not understand", () => {
    expect(trimOldToolOutput(undefined)).toBe(0)
    expect(trimOldToolOutput([null, { parts: "x" }, { parts: [null, { functionResponse: {} }] }])).toBe(0)
  })
})
