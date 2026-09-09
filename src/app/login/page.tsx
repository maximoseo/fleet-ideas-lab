"use client";

import { useCallback, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

/**
 * Show/hide-password icon. Inline SVG on purpose: this repo carries no icon
 * dependency and the login page is not the place to add one.
 */
function EyeIcon({ shown }: { shown: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shown ? (
        <>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.15 18.15 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [waitingForCheck, setWaitingForCheck] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  /**
   * Set when the operator pressed Sign in before the challenge finished. The
   * old behaviour was to refuse with "wait a moment and try again", which put
   * the burden of retrying on the person; now the click is remembered and the
   * form submits itself the instant the token lands.
   */
  const pendingSubmit = useRef(false);
  const credentials = useRef({ username: "", password: "" });

  const onToken = useCallback((token: string) => {
    setTurnstileToken(token);
    if (token && pendingSubmit.current) {
      pendingSubmit.current = false;
      setWaitingForCheck(false);
      void send(token);
    }
  // send is stable for the life of the component; it reads credentials from a ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(token: string) {
    setBusy(true);
    setError("");
    const { username: u, password: p } = credentials.current;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p, turnstileToken: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The token is spent whether or not the server liked it. Re-arm the widget
        // on every failure, otherwise the next attempt replays a used token and can
        // never succeed no matter what the user types.
        setError(data.error || "Login failed");
        turnstileRef.current?.reset();
        setBusy(false);
        return;
      }
      // Honour the ?next= the middleware attached, but only for internal paths.
      const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.replace(target);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      turnstileRef.current?.reset();
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    credentials.current = { username, password };

    // No site key means no widget can render (local dev). The server still
    // decides — this only relaxes the client-side pre-check.
    if (SITE_KEY && !turnstileToken) {
      pendingSubmit.current = true;
      setWaitingForCheck(true);
      turnstileRef.current?.reset();
      // A widget that never answers must not leave the button disabled with a
      // reassuring message and no way forward.
      window.setTimeout(() => {
        if (!pendingSubmit.current) return;
        pendingSubmit.current = false;
        setWaitingForCheck(false);
        setError("Security check did not complete. Reload the page and try again.");
      }, 15_000);
      return;
    }
    void send(turnstileToken);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#0c0a14]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 mb-4">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect width="32" height="32" rx="7" fill="#7C3AED"/>
              <path d="M16 8.5c-3 0-5.2 2.24-5.2 5.04 0 1.76.8 3.2 2 4.08v2.24h6.4v-2.24c1.2-.88 2-2.32 2-4.08C21.2 10.74 19 8.5 16 8.5Z" stroke="white" strokeWidth="1.15" strokeLinecap="round" fill="none"/>
              <rect x="10.2" y="20.4" width="11.6" height="1.9" rx="0.9" fill="white"/>
              <rect x="11.2" y="22.9" width="9.6" height="1.4" rx="0.7" fill="white"/>
              <path d="M16 5.5v1.6M10.2 8.2l1.1 1.1M21.8 8.2l-1.1 1.1" stroke="white" strokeWidth="0.9" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-violet-50">Fleet Ideas Lab</h1>
          <p className="text-sm text-violet-200/75 mt-1">MaximoSEO · Ideas Lab</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-violet-500/20 bg-white/[0.03] backdrop-blur p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-xs font-medium text-violet-200/70">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-black/30 border border-violet-500/20 px-3 py-2 text-sm text-violet-50 placeholder:text-violet-200/25 focus:border-violet-400/60 focus:outline-none"
              placeholder="operator"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-violet-200/70">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-black/30 border border-violet-500/20 pl-3 pr-10 py-2 text-sm text-violet-50 placeholder:text-violet-200/25 focus:border-violet-400/60 focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-controls="password"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-violet-200/50 hover:text-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
              >
                <EyeIcon shown={showPassword} />
              </button>
            </div>
          </div>

          {SITE_KEY && (
            <div className="flex justify-center pt-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                onToken={onToken}
                theme="dark"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-400 text-center">
              {error}
            </p>
          )}

          {waitingForCheck && !error && (
            <p role="status" aria-live="polite" className="text-sm text-violet-200/70 text-center">
              Finishing the security check — signing you in automatically.
            </p>
          )}

          {/* Never gate this button on the Turnstile token. When the widget misbehaves the
              form becomes permanently unclickable with nothing on screen to explain why;
              submitting without a token instead surfaces a real message. */}
          <button
            type="submit"
            disabled={busy || waitingForCheck}
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition"
          >
            {busy ? "Signing in…" : waitingForCheck ? "Checking…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-violet-200/65 mt-6">
          This tool can publish to connected WordPress sites. Authorised operators only.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0c0a14]" />}>
      <LoginForm />
    </Suspense>
  );
}
