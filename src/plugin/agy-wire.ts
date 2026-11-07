/**
 * Request identifiers formatted as the Antigravity CLI sends them (agy 1.5.3,
 * captured from its own requests on 2026-11-07):
 *
 * - `request.sessionId`: one signed 64-bit number per installation, the same
 *   in every conversation. Here: one per account, derived from its device id,
 *   so two accounts never share it.
 * - `requestId`: `agent/<cascade>/<unix ms>/<trajectory>/<last step + 1>`.
 * - `request.labels`: the conversation's cascade and trajectory ids, the
 *   model call's number in the conversation, the index of the last step, the
 *   model's enum and which model families the conversation used. Go encodes
 *   the map with its keys in alphabetical order.
 *
 * Steps are the conversation's messages, plus one for every failed attempt:
 * agy retries a call with the same `request_id` and the next step index.
 *
 * A conversation is an OpenCode chat (the `x-opencode-session` header) on one
 * account: a chat that moves to another account starts a new conversation
 * there, so no ids are shared between accounts. Title requests are
 * conversations of their own.
 */

import { createHash, randomUUID } from "node:crypto";

/** `model` of each id in Antigravity's fetchAvailableModels answer (2026-11-07). */
const MODEL_ENUMS: Record<string, string> = {
  "gemini-3.8-flash-high": "MODEL_PLACEHOLDER_M318",
  "gemini-3.8-flash-medium": "MODEL_PLACEHOLDER_M319",
  "gemini-3.8-flash-low": "MODEL_PLACEHOLDER_M320",
};

const MAX_CONVERSATIONS = 1000;

interface Conversation {
  cascadeId: string;
  trajectoryId: string;
  /** Model calls made so far. */
  calls: number;
  /** Failed attempts so far: each adds a step. */
  failedAttempts: number;
  /** The plugin request the last call belonged to; a repeat of it is a retry. */
  lastRequest?: string;
}

/**
 * On globalThis: OpenCode 2.x imports this module once per location. The key
 * names the entry shape, because the map outlives a reload of changed plugin
 * code in a running OpenCode; bump it whenever `Conversation` changes.
 */
const conversations = ((globalThis as Record<symbol, unknown>)[
  Symbol.for("opencode-antigravity-auth/agy-conversations/v2")
] ??= new Map<string, Conversation>()) as Map<string, Conversation>;

/** A signed 64-bit decimal, stable for `seed` (an account's device id). */
export function agySessionId(seed: string): string {
  return createHash("sha256").update(seed).digest().readBigInt64BE(0).toString();
}

function conversationFor(chatKey: string | undefined): Conversation {
  const fresh = (): Conversation => ({ cascadeId: randomUUID(), trajectoryId: randomUUID(), calls: 0, failedAttempts: 0 });
  if (!chatKey) return fresh();
  let conversation = conversations.get(chatKey);
  if (!conversation) {
    conversation = fresh();
    conversations.set(chatKey, conversation);
    if (conversations.size > MAX_CONVERSATIONS) {
      const oldest = conversations.keys().next().value;
      if (oldest !== undefined) conversations.delete(oldest);
    }
  }
  return conversation;
}

/**
 * The ids of a model call. `request` names the plugin request (one OpenCode
 * call) it serves: a second call for the same one is a retry.
 */
export function agyRequestIds(
  chatKey: string | undefined,
  accountSeed: string,
  request: string | undefined,
  wireModel: string,
  messageCount: number,
): { requestId: string; labels: Record<string, string> } {
  const conversation = conversationFor(chatKey ? `${chatKey}\n${accountSeed}` : undefined);
  if (request !== undefined && conversation.lastRequest === request) {
    conversation.failedAttempts += 1;
  } else {
    conversation.calls += 1;
    conversation.lastRequest = request;
  }
  const number = conversation.calls - 1;
  const lastStep = Math.max(0, messageCount - 1) + conversation.failedAttempts;
  const isClaude = wireModel.toLowerCase().includes("claude");
  const isGemini = wireModel.toLowerCase().includes("gemini");
  const labels: Record<string, string> = {
    cascade_id: conversation.cascadeId,
    last_step_index: String(lastStep),
    ...(MODEL_ENUMS[wireModel] ? { model_enum: MODEL_ENUMS[wireModel] } : {}),
    request_id: `${conversation.trajectoryId}-${number}`,
    root_cascade_id: conversation.cascadeId,
    trajectory_id: conversation.trajectoryId,
    used_claude: String(isClaude),
    used_claude_conservative: "false",
    used_non_gemini_model: String(!isGemini),
  };
  return {
    requestId: `agent/${conversation.cascadeId}/${Date.now()}/${conversation.trajectoryId}/${lastStep + 1}`,
    labels,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Google returns tool calls without ids, so the client names them: agy with a
 * UUID, OpenCode with `tool_<hex>`. OpenCode's ids go out as UUIDs derived
 * from them, so the same history always carries the same ids and every call
 * still pairs with its result.
 */
export function agyToolCallIds(contents: unknown): void {
  if (!Array.isArray(contents)) return;
  for (const content of contents) {
    const parts = (content as { parts?: unknown } | null)?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const call = (part as { functionCall?: { id?: unknown }; functionResponse?: { id?: unknown } } | null);
      for (const named of [call?.functionCall, call?.functionResponse]) {
        if (named && typeof named.id === "string" && !UUID.test(named.id)) named.id = uuidFor(named.id);
      }
    }
  }
}

/** A version-4-shaped UUID, stable for `seed`. */
function uuidFor(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  const variant = (8 + (parseInt(h[16]!, 16) & 3)).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * How long agy waits before retrying a call Google answered 503 or 429 (seen
 * 2026-11-07): 4 s, then a random 50-100% of 8 s, 16 s and 30 s, staying at 30 s.
 */
export function agyRetryDelayMs(retry: number): number {
  if (retry <= 0) return 4_000;
  return Math.round(Math.min(30_000, 4_000 * 2 ** retry) * (0.5 + 0.5 * Math.random()));
}
