/**
 * Lighter requests for OpenCode 2.x session titles.
 *
 * OpenCode 2.x generates a session's title with the session's own model and
 * variant, so a Gemini model on high thinking spends a full high-thinking call
 * (latency and shared quota) on a few words. The `model.request` hook knows
 * the request's kind but cannot touch its body, so it tags the request with a
 * header; the runtime reads the tag before the pipeline and turns thinking
 * down for titles.
 */

/** Header carrying `ModelRequestHook.kind` from the hook to the runtime. */
export const REQUEST_KIND_HEADER = "x-antigravity-request-kind";

/** Thinking a title request gets. Low is the lowest level every Gemini 3 backend accepts. */
const TITLE_THINKING = { thinkingLevel: "low", includeThoughts: false } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Removes the kind tag from `init` and, for a Gemini title request, caps its
 * thinking. Other requests pass through unchanged apart from losing the tag.
 */
export function applyRequestKind(url: string, init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  const kind = headers.get(REQUEST_KIND_HEADER);
  if (kind === null) return init;
  headers.delete(REQUEST_KIND_HEADER);
  const untagged: RequestInit = { ...init, headers };

  // Claude takes a thinking budget, not a level; its titles are left alone.
  if (kind !== "title" || !/\/models\/[^/:]*gemini-3/i.test(url) || typeof init.body !== "string") {
    return untagged;
  }

  let body: unknown;
  try {
    body = JSON.parse(init.body);
  } catch {
    return untagged;
  }
  if (!isRecord(body)) return untagged;

  const generationConfig = isRecord(body.generationConfig) ? body.generationConfig : {};
  const thinkingConfig = isRecord(generationConfig.thinkingConfig) ? generationConfig.thinkingConfig : {};
  // A budget would be turned back into a level by the pipeline; the level wins.
  const { thinkingBudget: _budget, thinking_budget: _snakeBudget, ...rest } = thinkingConfig;
  body.generationConfig = { ...generationConfig, thinkingConfig: { ...rest, ...TITLE_THINKING } };
  return { ...untagged, body: JSON.stringify(body) };
}
