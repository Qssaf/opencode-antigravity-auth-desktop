/**
 * Gemini 4 Argon is served on Antigravity only to Google AI Ultra subscribers.
 * The plugin cannot read an account's subscription, so it learns it from the
 * backend: an account the backend refuses for Argon is remembered here, skipped
 * for later Argon requests, and once no account is left the request is
 * answered with a message saying Ultra is required.
 *
 * Refusals expire, so an account that upgrades to Ultra is tried again without
 * restarting OpenCode.
 */

/** How long a refusal is remembered before the account is tried again. */
export const ULTRA_REFUSAL_TTL_MS = 60 * 60 * 1000;

const refusedUntil = new Map<string, number>();

/** Records that the backend refused an Ultra-only model for this account. */
export function markUltraModelRefused(refreshToken: string, now = Date.now()): void {
  if (!refreshToken) return;
  refusedUntil.set(refreshToken, now + ULTRA_REFUSAL_TTL_MS);
}

/** True while a refusal recorded for this account is still in effect. */
export function isUltraModelRefused(refreshToken: string, now = Date.now()): boolean {
  const until = refusedUntil.get(refreshToken);
  if (until === undefined) return false;
  if (until <= now) {
    refusedUntil.delete(refreshToken);
    return false;
  }
  return true;
}

/** Forgets every recorded refusal. For tests. */
export function resetUltraModelRefusals(): void {
  refusedUntil.clear();
}

const ENTITLEMENT_WORDS = /\b(?:ultra|subscription|tier|entitle\w*|not available|not enabled)\b/i;

/**
 * Whether a backend error for an Ultra-only model means "this account may not
 * use it" rather than a transient or request problem. 404 (model not served
 * for the account) and 403 (permission denied; the verification-required 403
 * is handled before this is asked) always count. A 400 counts only when its
 * message talks about the subscription, so a malformed request still surfaces
 * as itself.
 */
export function isUltraEntitlementRefusal(status: number, bodyText: string): boolean {
  if (status === 404 || status === 403) return true;
  return status === 400 && ENTITLEMENT_WORDS.test(bodyText);
}

/** The text shown when no signed-in account may use an Ultra-only model. */
export function ultraRequiredMessage(modelLabel: string, accountCount: number): string {
  const accounts = accountCount === 1 ? "your signed-in account" : `all ${accountCount} signed-in accounts`;
  return [
    `[Antigravity Error] ${modelLabel} needs a Google AI Ultra subscription.`,
    `Google refused it for ${accounts}, so none of them has Ultra.`,
    "",
    "Pick another model (Gemini 3.8 Flash or Gemini 3.1 Pro), or sign in an Ultra",
    "account with `opencode auth login`. Accounts are tried again after an hour,",
    "so an account that upgrades to Ultra starts working without a restart.",
  ].join("\n");
}
