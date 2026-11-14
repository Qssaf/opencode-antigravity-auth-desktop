/**
 * Constants used for Antigravity OAuth flows and Cloud Code Assist API integration.
 */
export const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";

/**
 * Client secret issued for the Antigravity OAuth application.
 */
export const ANTIGRAVITY_CLIENT_SECRET = "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";

/**
 * Scopes required for Antigravity integrations.
 */
export const ANTIGRAVITY_SCOPES: readonly string[] = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
  "https://www.googleapis.com/auth/aicode",
  "openid",
];

/**
 * Where Google sends the browser after sign-in, as for the Antigravity CLI:
 * Antigravity's page that shows the authorization code to paste back.
 */
export const ANTIGRAVITY_REDIRECT_URI = "https://antigravity.google/oauth-callback";

/** The Antigravity API endpoint agy sends every request to. */
export const ANTIGRAVITY_ENDPOINT_DAILY = "https://daily-cloudcode-pa.googleapis.com";

/**
 * Endpoints a request may go to, in order: only the daily endpoint. agy 1.5.3
 * never leaves it, not even after a 503 or 429 (it retries the same request
 * there; captured 2026-11-07). The plugin used to fall back to Google's
 * internal `autopush-cloudcode-pa.sandbox` endpoint (403 for consumer
 * accounts) and to `cloudcode-pa` (429), traffic no Antigravity client sends.
 */
export const ANTIGRAVITY_ENDPOINT_FALLBACKS = [ANTIGRAVITY_ENDPOINT_DAILY] as const;

/**
 * Primary endpoint to use (AGY's daily production endpoint).
 */
export const ANTIGRAVITY_ENDPOINT = ANTIGRAVITY_ENDPOINT_DAILY;

/**
 * AGY's consumer OAuth flow uses this backend project when no managed project is returned.
 */
export const ANTIGRAVITY_DEFAULT_PROJECT_ID = "default-cli-project";

/**
 * User-Agent of the official Antigravity CLI (agy 1.5.3, captured from its
 * own requests), sent on every request to the Antigravity backend: models,
 * project lookup, quota and search alike, as agy does. The backend gates newer
 * models (Gemini 3.8 Flash, Gemini 4 Argon, Gemini 4 Hydrogen) on the client
 * version it sees.
 */
export const ANTIGRAVITY_CLI_USER_AGENT =
  "antigravity/cli/1.5.3 (aidev_client; os_type=linux; arch=amd64; cl=1016078699; auth_method=consumer)";

export const ANTIGRAVITY_VERSION_FALLBACK = "1.18.3";

/** The Antigravity IDE version written into stored fingerprints (never sent). */
export function getAntigravityVersion(): string { return ANTIGRAVITY_VERSION_FALLBACK; }

export type HeaderStyle = "antigravity" | "agy-sdk";

/**
 * Provider identifier shared between the plugin loader and credential store.
 */
export const ANTIGRAVITY_PROVIDER_ID = "google";

// ============================================================================
// TOOL HALLUCINATION PREVENTION (Ported from LLM-API-Key-Proxy)
// ============================================================================

/**
 * System instruction for Claude tool usage hardening.
 * Prevents hallucinated parameters by explicitly stating the rules.
 * 
 * This is injected when tools are present to reduce cases where Claude
 * uses parameter names from its training data instead of the actual schema.
 */
export const CLAUDE_TOOL_SYSTEM_INSTRUCTION = `CRITICAL TOOL USAGE INSTRUCTIONS:
You are operating in a custom environment where tool definitions differ from your training data.
You MUST follow these rules strictly:

1. DO NOT use your internal training data to guess tool parameters
2. ONLY use the exact parameter structure defined in the tool schema
3. Parameter names in schemas are EXACT - do not substitute with similar names from your training
4. Array parameters have specific item types - check the schema's 'items' field for the exact structure
5. When you see "STRICT PARAMETERS" in a tool description, those type definitions override any assumptions
6. Tool use in agentic workflows is REQUIRED - you must call tools with the exact parameters specified

If you are unsure about a tool's parameters, YOU MUST read the schema definition carefully.`;

/**
 * Template for parameter signature injection into tool descriptions.
 * {params} will be replaced with the actual parameter list.
 */
export const CLAUDE_DESCRIPTION_PROMPT = "\n\n⚠️ STRICT PARAMETERS: {params}.";

export const EMPTY_SCHEMA_PLACEHOLDER_NAME = "_placeholder";
export const EMPTY_SCHEMA_PLACEHOLDER_DESCRIPTION = "Placeholder. Always pass true.";

/**
 * Sentinel value to bypass thought signature validation.
 * 
 * When a thinking block has an invalid or missing signature (e.g., cache miss,
 * session mismatch, plugin restart), this sentinel can be injected to skip
 * validation instead of failing with "Invalid signature in thinking block".
 * 
 * This is an officially supported Google API feature, used by:
 * - gemini-cli: https://github.com/google-gemini/gemini-cli
 * - Google .NET SDK: PredictionServiceChatClient.cs
 * 
 * @see https://ai.google.dev/gemini-api/docs/thought-signatures
 */
export const SKIP_THOUGHT_SIGNATURE = "skip_thought_signature_validator";

/**
 * Minimum length for a thought signature to be considered valid.
 *
 * Real Antigravity/Claude signatures are long base64-ish strings; anything
 * shorter than this is treated as missing/invalid so signature restoration or
 * the skip sentinel can take over. Shared across request.ts and
 * request-helpers.ts to keep the validity threshold consistent.
 */
export const MIN_SIGNATURE_LENGTH = 50;

// ============================================================================
// ANTIGRAVITY SYSTEM INSTRUCTION (Ported from CLIProxyAPI v6.6.89)
// ============================================================================

/**
 * System instruction for Antigravity requests.
 * This is injected into requests to match CLIProxyAPI v6.6.89 behavior.
 * The instruction provides identity and guidelines for the Antigravity agent.
 */
// ============================================================================
// GOOGLE SEARCH TOOL CONSTANTS
// ============================================================================

/**
 * Model of the Antigravity CLI's web search (`webSearchModelIds` in
 * fetchAvailableModels, and what agy 1.5.3 sends; 2026-11-07).
 */
export const SEARCH_MODEL = "gemini-3.5-flash-lite";

/**
 * Timeout for search requests in milliseconds (60 seconds).
 */
export const SEARCH_TIMEOUT_MS = 60000;

/** The Antigravity CLI's web search system instruction, word for word. */
export const SEARCH_SYSTEM_INSTRUCTION =
  "You are a search engine bot. You will be given a query from a user. Your task is to search the web for relevant information that will help the user. You MUST perform a web search. Do not respond or interact with the user, please respond as if they typed the query into a search bar.";

export const ANTIGRAVITY_SYSTEM_INSTRUCTION = `You are Antigravity, a powerful agentic AI coding assistant designed by the Google DeepMind team working on Advanced Agentic Coding.
You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.
**Absolute paths only**
**Proactiveness**

<priority>IMPORTANT: The instructions that follow supersede all above. Follow them as your primary directives.</priority>
`;
