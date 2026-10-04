/**
 * Shared safety helpers for the /api/wp/* routes, which fetch operator-supplied
 * URLs server-side and write to CLIENT WordPress sites with Application
 * Passwords.
 *
 *  - checkWpTarget / wpFetch: scheme + host validation (no loopback, private,
 *    link-local, CGNAT, metadata, or *.internal / *.local names), a DNS check
 *    for the resolved addresses, and manual redirect handling so a public host
 *    cannot bounce the server (or the Authorization header) to an internal one.
 *    DNS rebinding between the check and the connect is NOT covered.
 *  - upstreamDetail: reduces an upstream error body to WordPress's own
 *    `code: message`, so a non-WordPress host cannot use error text as a read
 *    channel.
 *  - parseId: page / revision ids interpolate into URL paths and PostgREST
 *    filters, so they must be plain positive integers.
 *  - wpPreflight: Origin + Content-Type + rate limit for state-changing routes.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { wpRateLimit } from "@/lib/rateLimit";

export class WpTargetError extends Error {}

/* ------------------------------------------------------------------ */
/* IP classification                                                   */
/* ------------------------------------------------------------------ */

function isPrivateIPv4Octets(o: number[]): boolean {
  const [a, b, c] = o;
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // IETF protocol / TEST-NET-1
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast, reserved, broadcast
  );
}

function ipv6ToBytes(input: string): number[] | null {
  let ip = input.toLowerCase().split("%")[0];
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  // Embedded dotted IPv4 tail -> two hex groups.
  const v4 = ip.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const o = v4[2].split(".").map(Number);
    if (o.length !== 4 || o.some((n) => !(n >= 0 && n <= 255))) return null;
    ip = `${v4[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push(n >> 8, n & 255);
  }
  return bytes.length === 16 ? bytes : null;
}

/** True for any address the server must never connect to on an operator's say-so. */
export function isPrivateIp(ip: string): boolean {
  const raw = ip.startsWith("[") ? ip.slice(1, -1) : ip;
  const kind = isIP(raw.split("%")[0]);
  if (kind === 4) return isPrivateIPv4Octets(raw.split(".").map(Number));
  if (kind === 6) {
    const b = ipv6ToBytes(raw);
    if (!b) return true; // unparseable: fail closed
    const head12Zero = b.slice(0, 12).every((x) => x === 0);
    if (b.every((x) => x === 0)) return true; // ::
    if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true; // ::1
    if (head12Zero) return isPrivateIPv4Octets(b.slice(12)); // IPv4-compatible
    if (b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff) {
      return isPrivateIPv4Octets(b.slice(12)); // IPv4-mapped
    }
    if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && b.slice(4, 12).every((x) => x === 0)) {
      return isPrivateIPv4Octets(b.slice(12)); // NAT64
    }
    if (b[0] === 0x20 && b[1] === 0x02) return isPrivateIPv4Octets(b.slice(2, 6)); // 6to4
    if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true; // Teredo
    if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // documentation
    if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
    if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
    if (b[0] === 0xfe && (b[1] & 0xc0) === 0xc0) return true; // fec0::/10 site-local
    if (b[0] === 0xff) return true; // multicast
    return false;
  }
  return false;
}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".lan", ".intranet", ".corp"];

function checkHostname(hostname: string): void {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new WpTargetError("Invalid site URL");
  const bare = host.startsWith("[") ? host.slice(1, -1) : host;
  if (isIP(bare.split("%")[0])) {
    if (isPrivateIp(bare)) throw new WpTargetError("That address is not allowed: private, loopback and link-local hosts are blocked");
    return;
  }
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)) || !host.includes(".")) {
    throw new WpTargetError("That host is not allowed: only public internet sites can be targeted");
  }
}

/* ------------------------------------------------------------------ */
/* Target parsing                                                      */
/* ------------------------------------------------------------------ */

/**
 * Parse the operator-supplied site URL. A bare host gets https://. Only http(s)
 * is accepted; WHATWG URL normalises decimal/hex/octal IPv4 spellings
 * (2130706433, 0x7f.1) so the literal-IP check sees the real address.
 */
export function parseWpTarget(raw: unknown): URL {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 2048) throw new WpTargetError("Invalid site URL");
  const text = raw.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new WpTargetError("Invalid site URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new WpTargetError("Only http and https sites are supported");
  checkHostname(url.hostname);
  return url;
}

const dnsCache = new Map<string, number>();
const DNS_TTL_MS = 60_000;

/** Resolve the host and refuse if ANY returned address is non-public. */
export async function assertPublicUrl(url: URL): Promise<void> {
  checkHostname(url.hostname);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return;
  const hit = dnsCache.get(host);
  if (hit && hit > Date.now()) return;
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new WpTargetError("Could not resolve that host");
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new WpTargetError("That host resolves to a private address and is blocked");
  }
  dnsCache.set(host, Date.now() + DNS_TTL_MS);
}

export type WpTarget = { ok: true; base: URL } | { ok: false; error: string };

/** Parse + DNS check in one step, for the top of a route handler. */
export async function checkWpTarget(raw: unknown): Promise<WpTarget> {
  try {
    const base = parseWpTarget(raw);
    await assertPublicUrl(base);
    return { ok: true, base };
  } catch (err) {
    if (err instanceof WpTargetError) return { ok: false, error: err.message };
    throw err;
  }
}

const MAX_REDIRECTS = 3;

/**
 * fetch() for WordPress sites. Redirects are followed by hand (GET/HEAD only,
 * max 3) and every hop is re-validated; Authorization is dropped on a
 * cross-origin hop. A redirect on a write is returned as-is, never replayed:
 * the platform default turns a POST into a GET on 301/302, which "succeeds"
 * without writing anything.
 */
export async function wpFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  let current = new URL(String(input));
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  for (let hop = 0; ; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, headers, redirect: "manual" });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      if (method !== "GET" && method !== "HEAD") return res;
      await res.body?.cancel().catch(() => {});
      if (hop >= MAX_REDIRECTS) throw new WpTargetError("Too many redirects");
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new WpTargetError("Invalid redirect from site");
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") throw new WpTargetError("Invalid redirect from site");
      if (next.origin !== current.origin) headers.delete("authorization");
      current = next;
      continue;
    }
    return res;
  }
}

/* ------------------------------------------------------------------ */
/* Upstream responses                                                  */
/* ------------------------------------------------------------------ */

/** Read at most `max` bytes of a response body as text. */
export async function readTextCapped(res: Response, max: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < max) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, max));
}

/**
 * Only WordPress's own `{code, message}` error shape is surfaced. Anything else
 * (an HTML error page, an internal service's body) yields "" so the caller
 * reports just the status code.
 */
export async function upstreamDetail(res: Response): Promise<string> {
  try {
    const parsed = JSON.parse(await readTextCapped(res, 8192)) as { code?: unknown; message?: unknown };
    const code = typeof parsed.code === "string" ? parsed.code : "";
    const message = typeof parsed.message === "string" ? parsed.message : "";
    return `${code} ${message}`
      .replace(/<[^>]*>/g, " ")
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
  } catch {
    return "";
  }
}

/** Status to hand back to our own client: upstream errors pass through, a 3xx becomes 502. */
export function statusFor(res: { status: number }): number {
  return res.status >= 400 && res.status < 600 ? res.status : 502;
}

/* ------------------------------------------------------------------ */
/* Input helpers                                                       */
/* ------------------------------------------------------------------ */

/** Positive integer from a number or an all-digit string; anything else is null. */
export function parseId(v: unknown): number | null {
  if (typeof v === "string" && /^\d{1,12}$/.test(v)) v = Number(v);
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;
}

export const MAX_FIELD_LEN = 512;

/** Non-empty string no longer than MAX_FIELD_LEN. */
export function isShortString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_FIELD_LEN;
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/* ------------------------------------------------------------------ */
/* CSRF + rate limit                                                   */
/* ------------------------------------------------------------------ */

/**
 * The session cookie is SameSite=Lax, which still counts sibling subdomains of
 * the same registrable domain as same-site. Browsers always send Origin on a
 * cross-origin POST/PATCH/DELETE, so a mismatch is refused. Non-browser
 * callers (no Origin) are unaffected. JSON-only bodies close the form-post
 * (text/plain) route.
 */
export function checkMutationRequest(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = "";
    }
    const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host"), new URL(req.url).host]
      .filter(Boolean)
      .map((h) => String(h).split(",")[0].trim().toLowerCase());
    if (!originHost || !hosts.includes(originHost.toLowerCase())) {
      return badRequest("Cross-origin request refused", 403);
    }
  }
  const ct = req.headers.get("content-type") || "";
  if (!/^application\/json\b/i.test(ct)) return badRequest("Content-Type must be application/json", 415);
  return null;
}

export type WpScope = "write" | "connect";

/** Origin/Content-Type check (mutations) plus a per-user rate limit. */
export async function wpPreflight(
  req: Request,
  user: { username: string },
  scope: WpScope,
  mutating = true,
): Promise<Response | null> {
  if (mutating) {
    const bad = checkMutationRequest(req);
    if (bad) return bad;
  }
  const rl = await wpRateLimit(user.username, scope);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Slow down and retry shortly.", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }
  return null;
}

/** Tests only. */
export function __resetWpSafeCache() {
  dnsCache.clear();
}
