/**
 * Trims old tool output from a chat before it goes to Google.
 *
 * OpenCode sends the whole chat on every step, and Antigravity's quota counts
 * every token of it. In long agent chats nearly all of that is old tool output
 * (files read, command output): 62% of an 839k-token chat measured on
 * 2026-11-25, which replaying with this trim cut by 77%. OpenCode 1.x could
 * prune it (`compaction.prune`); 2.2.5 dropped the option, and Antigravity's
 * own client checkpoints its history instead.
 *
 * Only tool results change. Tool calls, their arguments and thought signatures
 * stay as they were, since Gemini validates its own signed calls.
 */

export const TRIMMED_TOOL_OUTPUT =
  "[Older tool output removed by the plugin to save quota. Run the tool again if you need it.]"

/** The newest tool output kept word for word, in tokens. */
export const TOOL_OUTPUT_KEEP_TOKENS = 40_000

/**
 * The trimmed part grows in whole steps of this many tokens, so the chat's
 * start (which Google caches) changes only once per step, not on every call.
 */
export const TOOL_OUTPUT_TRIM_STEP_TOKENS = 20_000

/** Skill output carries instructions the agent keeps following (OpenCode never pruned it either). */
const KEPT_TOOLS = new Set(["skill"])

/** About three characters per token: fitted on Google's counts for OpenCode chats. */
const estimateTokens = (value: unknown): number => Math.ceil(JSON.stringify(value).length / 3)

type ToolResult = { response: Record<string, unknown>; tokens: number }

/**
 * Replaces the oldest tool results' content with a short note, leaving at
 * least `keepTokens` of the newest output untouched. Mutates `contents` (the
 * Gemini-format turns) and returns how many results it trimmed. The same chat
 * always trims the same results.
 */
export function trimOldToolOutput(
  contents: unknown,
  keepTokens = TOOL_OUTPUT_KEEP_TOKENS,
  stepTokens = TOOL_OUTPUT_TRIM_STEP_TOKENS,
): number {
  if (!Array.isArray(contents)) return 0

  const results: ToolResult[] = []
  for (const turn of contents) {
    const parts = (turn as { parts?: unknown } | null)?.parts
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      const result = (part as { functionResponse?: { name?: unknown; response?: unknown } } | null)?.functionResponse
      const response = result?.response
      if (!response || typeof response !== "object" || !("content" in response)) continue
      if (typeof result.name === "string" && KEPT_TOOLS.has(result.name)) continue
      const record = response as Record<string, unknown>
      const tokens = estimateTokens(record)
      // Skip outputs the note would not shrink.
      if (tokens <= estimateTokens({ ...record, content: TRIMMED_TOOL_OUTPUT })) continue
      results.push({ response: record, tokens })
    }
  }

  const total = results.reduce((sum, result) => sum + result.tokens, 0)
  const budget = Math.floor((total - keepTokens) / stepTokens) * stepTokens
  if (budget <= 0) return 0

  let trimmedTokens = 0
  let trimmed = 0
  for (const result of results) {
    if (trimmedTokens >= budget) break
    result.response.content = TRIMMED_TOOL_OUTPUT
    trimmedTokens += result.tokens
    trimmed++
  }
  return trimmed
}
