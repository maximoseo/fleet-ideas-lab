import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * `script-src` keeps 'unsafe-inline' on purpose, and that is a compromise worth
 * writing down rather than hiding:
 *
 *  - The App Router emits per-page inline RSC payload scripts, and the layout
 *    runs two before-paint bootstraps (theme, language). Only a nonce covers
 *    those, and a nonce forces every page to render dynamically.
 *  - More decisive: /redesign, /mockup, /generate and /prototypes render
 *    GENERATED HTML into `srcdoc` iframes. A srcdoc document inherits the
 *    parent CSP, so a nonce-based policy silently breaks the feature the app
 *    exists for — the prototype renders blank and nothing in the console says
 *    why.
 *
 * What the policy still buys, which is most of the practical value for a
 * single-operator authenticated console: no third-party script origins, no
 * framing, no form posts off-origin, no <base> injection, no plugins.
 *
 * Upgrading to nonce + strict-dynamic means first moving prototype rendering
 * to a separate origin (or a blob: URL iframe). Tracked, not forgotten.
 */
const CSP = [
  "default-src 'self'",
  // cdn.tailwindcss.com is required by the static prototype documents under
  // /prototypes. Without it those pages render as unstyled HTML — which is
  // exactly what happened when this policy first shipped, and it was not
  // visible from the pages I had been testing.
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.tailwindcss.com",
  "style-src 'self' 'unsafe-inline'",
  // Screenshots come from client sites, Microlink and Lovart — arbitrary https hosts.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src 'self' blob: https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Local QA runs against http://127.0.0.1:3000 — allow dev resources from it.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        // Belt and braces with robots.ts: an operator console that can publish
        // to client WordPress sites stays out of every index. /share is the
        // deliberate exception and is matched first by Next's ordering rules.
        source: "/((?!share).*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
