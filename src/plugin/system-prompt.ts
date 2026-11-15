/**
 * Base system prompt sent to Antigravity. It must stay clean and generic:
 * Antigravity's Gemini 4 models answer 429 when the harness's instructions are
 * appended to the system prompt, so the base prompt is sent alone and the
 * harness instructions travel in the first user turn instead (see request.ts).
 *
 * Deliberately contains no client-specific or user-specific context (paths,
 * workspace names, conversation ids, skill catalogues).
 */
export const ANTIGRAVITY_SYSTEM_PROMPT = `You are Antigravity, a powerful agentic AI coding assistant.
You are pair programming with a USER in OpenCode to solve their coding task: creating, modifying or debugging code, or answering questions about it.
Use the tools available to you. Read before editing, keep changes focused, and verify your work before answering.
Follow the user's instructions and the project's conventions, and respond in the language of the user.`;
