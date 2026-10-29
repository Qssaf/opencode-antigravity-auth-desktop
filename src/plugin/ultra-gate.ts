/**
 * Gemini 4 Argon is served on Antigravity only to Google AI Ultra and paid
 * (non-trial) Google AI Pro subscribers. The plugin cannot read an account's
 * subscription, so it learns it from the backend: an account the backend
 * refuses for Argon is remembered here, skipped for later Argon requests, and
 * once no account is left the request is answered with a message saying which
 * plans include it.
 *
 * Refusals expire, so an account that upgrades is tried again without
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

const ENTITLEMENT_WORDS = /\b(?:ultra|subscription|entitle\w*)\b/i;

/**
 * Whether an Antigravity error for an Ultra-only model means "this account may
 * not use it" rather than a credential, transient or request problem.
 * - 404: the model is not served for the account.
 * - 403: only the project-scoped "permission denied" on the model
 *   (`permissionDeniedOnProject`), or one that names the subscription. Any other
 *   403 is a credential or access problem and must surface as itself.
 * - 400: only when the message names the subscription, so a malformed request
 *   still surfaces as itself.
 */
export function isUltraEntitlementRefusal(
  status: number,
  bodyText: string,
  permissionDeniedOnProject = false,
): boolean {
  if (status === 404) return true;
  if (status === 403) return permissionDeniedOnProject || ENTITLEMENT_WORDS.test(bodyText);
  return status === 400 && ENTITLEMENT_WORDS.test(bodyText);
}

/** The text shown when no signed-in account may use an Ultra-only model. */
export function ultraRequiredMessage(modelLabel: string, accountCount: number): string {
  const accounts = accountCount === 1 ? "your signed-in account" : `all ${accountCount} signed-in accounts`;
  return [
    `[Antigravity Error] ${modelLabel} needs a paid Google AI Pro or Google AI Ultra subscription.`,
    `Google refused it for ${accounts}. Free plans, Google AI Plus and Pro free trials`,
    "do not include it.",
    "",
    "Pick Gemini 3.8 Flash instead, or sign in a paid Pro or Ultra account with",
    "`opencode auth login`. Accounts are tried again after an hour,",
    "so an account that upgrades starts working without a restart.",
  ].join("\n");
}
