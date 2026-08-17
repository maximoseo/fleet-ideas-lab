/**
 * Structured error reporting.
 *
 * There was none: an API route that threw produced a line in the Vercel log
 * and nothing else, so "it broke yesterday" was unanswerable. This is
 * deliberately dependency-free — the app has no Sentry SDK and adding one to a
 * single-operator console is not worth the bundle — but it gives every failure
 * a consistent shape that log search can actually query.
 *
 * Three rules, all load-bearing:
 *
 *  1. Reporting must never fail a user request. Everything is wrapped and
 *     swallowed. A broken reporter that takes down the route it is reporting on
 *     is worse than no reporter.
 *  2. No secrets and no client data in a report. A log line is a durable copy.
 *     Only the error type, a redacted message, and the route.
 *  3. Fire and forget. No awaiting a network call on the request path.
 */

/**
 * Every pattern here is linear-time on purpose. A redactor that can be made to
 * hang on a hostile error message is a denial of service in the error path,
 * which is exactly where you least want one — so no nested quantifiers, no
 * optional group wrapping a repeated class, and each alternation is anchored
 * by a literal.
 */
const SECRET_PATTERNS: RegExp[] = [
  // Anything key-shaped: 32+ chars of token alphabet. "Bearer " is left in
  // place; it is the value after it that matters.
  /[A-Za-z0-9_-]{32,}/g,
  // Our own app tokens, which are shorter than the rule above.
  /fil_[A-Za-z0-9_-]{8,}/g,
  // JWTs.
  /eyJ[A-Za-z0-9_.-]{8,}/g,
  // Labelled secrets: one separator run, then the value up to a delimiter.
  /(password|token|secret|apikey|api_key)[\s:=]{0,3}["']?[^\s"',}]{1,200}/gi,
];

/** Strip anything key-shaped before a message reaches a log. */
export function redact(message: string): string {
  let out = message.slice(0, 500);
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[redacted]");
  return out;
}

export interface ErrorContext {
  /** Route or job name, e.g. "/api/fleet/probe". */
  route: string;
  /** Anything safe and useful: counts, slugs, status codes. Never user input. */
  meta?: Record<string, string | number | boolean | null>;
}

export function reportError(err: unknown, ctx: ErrorContext): void {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const line = JSON.stringify({
      event: "error",
      route: ctx.route,
      name: e.name,
      message: redact(e.message),
      // First frame only — enough to locate it, short enough to read.
      at: redact((e.stack || "").split("\n")[1]?.trim() || ""),
      source: "fleet-ideas-lab",
      ...ctx.meta,
      ts: new Date().toISOString(),
    });
    console.error(line);
  } catch {
    // A reporter that throws is not allowed to break the caller.
  }
}

/**
 * Wrap an API handler so an unhandled throw becomes a structured report and a
 * clean 500 instead of a stack trace on the wire.
 */
export function withErrorReporting<T extends unknown[]>(
  route: string,
  handler: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (err) {
      reportError(err, { route });
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
