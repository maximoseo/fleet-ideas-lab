"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    // When no site key is configured (local dev) the widget cannot render, so the
    // challenge requirement is relaxed client-side. The server still decides.
    // Otherwise: no token means the widget is still loading or stale. Say so and
    // re-arm it rather than silently refusing to submit.
    if (SITE_KEY && !turnstileToken) {
      setError("Security check still loading — wait a moment and try again.");
      turnstileRef.current?.reset();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken }),
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

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#0c0a14]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 mb-4">
            <span className="text-2xl">◈</span>
          </div>
          <h1 className="text-2xl font-semibold text-violet-50">Design Lab</h1>
          <p className="text-sm text-violet-200/50 mt-1">MaximoSEO</p>
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
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-black/30 border border-violet-500/20 px-3 py-2 text-sm text-violet-50 placeholder:text-violet-200/25 focus:border-violet-400/60 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {SITE_KEY && (
            <div className="flex justify-center pt-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                onToken={setTurnstileToken}
                theme="dark"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-400 text-center">
              {error}
            </p>
          )}

          {/* Never gate this button on the Turnstile token. When the widget misbehaves the
              form becomes permanently unclickable with nothing on screen to explain why;
              submitting without a token instead surfaces a real message. */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-violet-200/30 mt-6">
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
