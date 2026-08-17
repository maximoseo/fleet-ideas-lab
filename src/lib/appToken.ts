import { timingSafeEqual } from "crypto";

/**
 * The APK carries its token in BuildConfig, so rotating APP_TOKEN instantly
 * breaks every installed build until the operator reinstalls. That made
 * rotation something nobody wanted to do, which is how the vault copy drifted
 * out of sync with production in the first place.
 *
 * Two accepted values fix that: set APP_TOKEN to the new value, move the old
 * one to APP_TOKEN_PREVIOUS, ship the new APK, then delete APP_TOKEN_PREVIOUS.
 * No window where a phone in the field is locked out.
 *
 * APP_TOKEN_PREVIOUS is meant to be temporary. `appTokenRotationPending()`
 * reports when it is still set so the operator gets reminded to clear it.
 */
export function appTokens(): string[] {
  const out: string[] = [];
  const cur = (process.env.APP_TOKEN || "").trim();
  const prev = (process.env.APP_TOKEN_PREVIOUS || "").trim();
  if (cur) out.push(cur);
  if (prev && prev !== cur) out.push(prev);
  return out;
}

/** True while a rotation is half-done (both tokens live). */
export function appTokenRotationPending(): boolean {
  return appTokens().length > 1;
}

/** Constant-time compare against every accepted token. */
export function appTokenMatches(presented: string | null | undefined): boolean {
  const value = (presented || "").trim();
  if (!value) return false;
  const a = Buffer.from(value);
  let ok = false;
  for (const token of appTokens()) {
    const b = Buffer.from(token);
    // Compare every candidate — no early return, so timing does not leak
    // which of the two tokens matched.
    if (a.length === b.length && timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}
