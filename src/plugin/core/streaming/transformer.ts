import type {
  SignatureStore,
  StreamingCallbacks,
  StreamingOptions,
  ThoughtBuffer,
} from './types';
import { processImageData } from '../../image-saver';

/**
 * Upper bound on the number of thinking-text hashes retained per session.
 *
 * The per-session dedup Set is created (and its lifetime bounded) by
 * request.ts, but WITHIN a long-lived session the Set would otherwise grow for
 * every unique thinking chunk streamed. Cap it and FIFO-evict the oldest hash
 * (a Set iterates in insertion order, so the first entry is the oldest). 2000
 * hashes is far more than any single streamed turn produces, so dedup accuracy
 * for the active turn is unaffected.
 */
const MAX_SESSION_THINKING_HASHES = 2000;

/**
 * Adds a hash to a bounded per-session dedup Set, evicting the oldest entry
 * (insertion order) once the cap is exceeded.
 */
function addBoundedThinkingHash(hashes: Set<string>, hash: string): void {
  hashes.add(hash);
  if (hashes.size > MAX_SESSION_THINKING_HASHES) {
    const oldest = hashes.values().next().value;
    if (oldest !== undefined) {
      hashes.delete(oldest);
    }
  }
}

/**
 * Thinking text shorter than this is never suppressed as a replay. A replay is
 * a whole thought re-sent (hundreds of characters); short pieces such as a
 * blank line or a heading legitimately repeat within and across turns.
 */
const MIN_REPLAY_DEDUP_CHARS = 64;

/**
 * Simple string hash for thinking deduplication (DJB2 over every character).
 * Sampling only some characters let two different long thoughts of the same
 * length collide, which hid the second one.
 */
function hashString(str: string): string {
  let hash = (5381 ^ str.length) >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

/**
 * Decides what to show for one streamed thinking piece.
 *
 * Gemini streams thinking as deltas (each event carries only new text), while
 * some upstreams send the thought accumulated so far, or replay a finished
 * thought. `shownBuffer` holds everything already shown for this slot, so:
 * - text that extends what was shown is cumulative, and only the new tail is shown;
 * - text equal to what was shown is a replay, and is dropped;
 * - anything else is a delta and is shown as is.
 * Comparing against everything shown, not just the previous piece, keeps a
 * delta that happens to start like the previous delta from being cut.
 *
 * Returns the text to show, `undefined` to show the part unchanged, or `null`
 * to drop it.
 */
function resolveThinkingText(
  slot: number,
  fullText: string,
  shownBuffer: ThoughtBuffer,
  displayedThinkingHashes?: Set<string>,
): string | null | undefined {
  if (displayedThinkingHashes && fullText.length >= MIN_REPLAY_DEDUP_CHARS) {
    const hash = hashString(fullText);
    if (displayedThinkingHashes.has(hash)) {
      return null;
    }
    addBoundedThinkingHash(displayedThinkingHashes, hash);
  }

  const shown = shownBuffer.get(slot) ?? '';
  if (shown.trim() && fullText.startsWith(shown)) {
    shownBuffer.set(slot, fullText);
    const delta = fullText.slice(shown.length);
    return delta ? delta : null;
  }

  shownBuffer.set(slot, shown + fullText);
  return undefined;
}

export function createThoughtBuffer(): ThoughtBuffer {
  const buffer = new Map<number, string>();
  return {
    get: (index: number) => buffer.get(index),
    set: (index: number, text: string) => buffer.set(index, text),
    clear: () => buffer.clear(),
  };
}

export function transformStreamingPayload(
  payload: string,
  transformThinkingParts?: (response: unknown) => unknown,
): string {
  return payload
    .split('\n')
    .map((line) => {
      if (!line.startsWith('data:')) {
        return line;
      }
      const json = line.slice(5).trim();
      if (!json) {
        return line;
      }
      try {
        const parsed = JSON.parse(json) as { response?: unknown };
        if (parsed.response !== undefined) {
          const transformed = transformThinkingParts
            ? transformThinkingParts(parsed.response)
            : parsed.response;
          return `data: ${JSON.stringify(transformed)}`;
        }
      } catch (_) {}
      return line;
    })
    .join('\n');
}

export function deduplicateThinkingText(
  response: unknown,
  sentBuffer: ThoughtBuffer,
  displayedThinkingHashes?: Set<string>,
): unknown {
  if (!response || typeof response !== 'object') return response;

  const resp = response as Record<string, unknown>;

  if (Array.isArray(resp.candidates)) {
    const newCandidates = resp.candidates.map((candidate: unknown, index: number) => {
      const cand = candidate as Record<string, unknown> | null;
      if (!cand?.content) return candidate;

      const content = cand.content as Record<string, unknown>;
      if (!Array.isArray(content.parts)) return candidate;

      const newParts = content.parts.map((part: unknown) => {
        const p = part as Record<string, unknown>;

        // Handle image data - save to disk (durable, synchronous) and return file path
        if (p.inlineData) {
          const inlineData = p.inlineData as Record<string, unknown>;
          const result = processImageData({
            mimeType: inlineData.mimeType as string | undefined,
            data: inlineData.data as string | undefined,
          });
          if (result) {
            return { text: result };
          }
        }

        if (p.thought === true || p.type === 'thinking') {
          const fullText = (p.text || p.thinking || '') as string;
          const text = resolveThinkingText(index, fullText, sentBuffer, displayedThinkingHashes);
          if (text === null) return null;
          if (text === undefined) return part;
          return { ...p, text, thinking: text };
        }
        return part;
      });

      const filteredParts = newParts.filter((p) => p !== null);

      return {
        ...cand,
        content: { ...content, parts: filteredParts },
      };
    });

    return { ...resp, candidates: newCandidates };
  }

  if (Array.isArray(resp.content)) {
    let thinkingIndex = 0;
    const newContent = resp.content.map((block: unknown) => {
      const b = block as Record<string, unknown> | null;
      if (b?.type === 'thinking') {
        const fullText = (b.thinking || b.text || '') as string;
        const text = resolveThinkingText(thinkingIndex, fullText, sentBuffer, displayedThinkingHashes);
        thinkingIndex++;
        if (text === null) return null;
        if (text === undefined) return block;
        return { ...b, thinking: text, text };
      }
      return block;
    });

    const filteredContent = newContent.filter((b) => b !== null);
    return { ...resp, content: filteredContent };
  }

  return response;
}

export function transformSseLine(
  line: string,
  signatureStore: SignatureStore,
  thoughtBuffer: ThoughtBuffer,
  sentThinkingBuffer: ThoughtBuffer,
  callbacks: StreamingCallbacks,
  options: StreamingOptions,
  debugState: { injected: boolean },
): string {
  if (!line.startsWith('data:')) {
    return line;
  }
  const json = line.slice(5).trim();
  if (!json) {
    return line;
  }

  try {
    const parsed = JSON.parse(json) as { response?: unknown };
    if (parsed.response !== undefined) {
      const hasInterestingData =
        line.includes('"thought"') ||
        line.includes('"thinking"') ||
        line.includes('"signature"') ||
        line.includes('"inlineData"') ||
        line.includes('"functionCall"');

      if (!hasInterestingData && (!options.debugText || debugState.injected)) {
        return `data: ${JSON.stringify(parsed.response)}`;
      }

      if (options.cacheSignatures && options.signatureSessionKey) {
        cacheThinkingSignaturesFromResponse(
          parsed.response,
          options.signatureSessionKey,
          signatureStore,
          thoughtBuffer,
          callbacks.onCacheSignature,
        );
      }

      let response: unknown = deduplicateThinkingText(
        parsed.response,
        sentThinkingBuffer,
        options.displayedThinkingHashes
      );

      if (options.debugText && callbacks.onInjectDebug && !debugState.injected) {
        response = callbacks.onInjectDebug(response, options.debugText);
        debugState.injected = true;
      }
      // Note: onInjectSyntheticThinking removed - keep_thinking now uses debugText path

      const transformed = callbacks.transformThinkingParts
        ? callbacks.transformThinkingParts(response)
        : response;
      return `data: ${JSON.stringify(transformed)}`;
    }
  } catch (_) {}
  return line;
}

export function cacheThinkingSignaturesFromResponse(
  response: unknown,
  signatureSessionKey: string,
  signatureStore: SignatureStore,
  thoughtBuffer: ThoughtBuffer,
  onCacheSignature?: (sessionKey: string, text: string, signature: string) => void,
): void {
  if (!response || typeof response !== 'object') return;

  const resp = response as Record<string, unknown>;

  if (Array.isArray(resp.candidates)) {
    resp.candidates.forEach((candidate: unknown, index: number) => {
      const cand = candidate as Record<string, unknown> | null;
      if (!cand?.content) return;
      const content = cand.content as Record<string, unknown>;
      if (!Array.isArray(content.parts)) return;

      content.parts.forEach((part: unknown) => {
        const p = part as Record<string, unknown>;
        if (p.thought === true || p.type === 'thinking') {
          const text = (p.text || p.thinking || '') as string;
          if (text) {
            const current = thoughtBuffer.get(index) ?? '';
            thoughtBuffer.set(index, current + text);
          }
        }

        if (p.thoughtSignature) {
          const fullText = thoughtBuffer.get(index) ?? '';
          if (fullText) {
            const signature = p.thoughtSignature as string;
            onCacheSignature?.(signatureSessionKey, fullText, signature);
            signatureStore.set(signatureSessionKey, { text: fullText, signature });
          }
        }
      });
    });
  }

  if (Array.isArray(resp.content)) {
    // Use thoughtBuffer to accumulate thinking text across SSE events
    // Claude streams thinking content and signature in separate events
    const CLAUDE_BUFFER_KEY = 0; // Use index 0 for Claude's single-stream content
    resp.content.forEach((block: unknown) => {
      const b = block as Record<string, unknown> | null;
      if (b?.type === 'thinking') {
        const text = (b.thinking || b.text || '') as string;
        if (text) {
          const current = thoughtBuffer.get(CLAUDE_BUFFER_KEY) ?? '';
          thoughtBuffer.set(CLAUDE_BUFFER_KEY, current + text);
        }
      }
      if (b?.signature) {
        const fullText = thoughtBuffer.get(CLAUDE_BUFFER_KEY) ?? '';
        if (fullText) {
          const signature = b.signature as string;
          onCacheSignature?.(signatureSessionKey, fullText, signature);
          signatureStore.set(signatureSessionKey, { text: fullText, signature });
        }
      }
    });
  }
}

export function createStreamingTransformer(
  signatureStore: SignatureStore,
  callbacks: StreamingCallbacks,
  options: StreamingOptions = {},
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  const thoughtBuffer = createThoughtBuffer();
  const sentThinkingBuffer = createThoughtBuffer();
  const debugState = { injected: false };
  let hasSeenUsageMetadata = false;

  return new TransformStream({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });

      // Only the new text can hold the end of a line. Scanning it alone keeps a
      // long line (an inline image arrives as one multi-megabyte event) linear
      // rather than re-splitting the whole buffer on every network chunk.
      const lastNewline = text.lastIndexOf('\n');
      if (lastNewline === -1) {
        buffer += text;
        return;
      }
      const complete = buffer + text.slice(0, lastNewline);
      buffer = text.slice(lastNewline + 1);

      // One enqueue per chunk: each enqueued piece becomes a separate write
      // downstream, so per-line enqueues doubled the work for every event.
      let output = '';
      for (const line of complete.split('\n')) {
        // Quick check for usage metadata presence in the raw line
        if (line.includes('usageMetadata')) {
          hasSeenUsageMetadata = true;
        }

        output += transformSseLine(
          line,
          signatureStore,
          thoughtBuffer,
          sentThinkingBuffer,
          callbacks,
          options,
          debugState,
        ) + '\n';
      }
      controller.enqueue(encoder.encode(output));
    },
    flush(controller) {
      buffer += decoder.decode();

      if (buffer) {
        if (buffer.includes('usageMetadata')) {
          hasSeenUsageMetadata = true;
        }
        const transformedLine = transformSseLine(
          buffer,
          signatureStore,
          thoughtBuffer,
          sentThinkingBuffer,
          callbacks,
          options,
          debugState,
        );
        controller.enqueue(encoder.encode(transformedLine));
      }

      // Inject synthetic usage metadata if missing (fixes "Context % used: 0%" issue)
      if (!hasSeenUsageMetadata) {
        const syntheticUsage = {
          response: {
            usageMetadata: {
              promptTokenCount: 0,
              candidatesTokenCount: 0,
              totalTokenCount: 0,
            }
          }
        };
        controller.enqueue(encoder.encode(`\ndata: ${JSON.stringify(syntheticUsage)}\n\n`));
      }
    },
  });
}
