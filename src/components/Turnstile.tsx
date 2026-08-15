"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Resolve once `window.turnstile` actually exists.
 *
 * Polling rather than relying on the script's `load` event is deliberate: the
 * event fires once, so a second mount (or any other component that injected the
 * same script first) never sees it and the widget silently never renders. That
 * failure mode locked several dashboards out of their own login page.
 */
let readyPromise: Promise<void> | null = null;
function turnstileReady(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`script[src^="${SCRIPT_SRC.split("?")[0]}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    const startedAt = Date.now();
    const tick = () => {
      if (window.turnstile) return resolve();
      if (Date.now() - startedAt > 20_000) {
        readyPromise = null; // let a later mount try again
        return reject(new Error("turnstile script did not load"));
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });

  return readyPromise;
}

export type TurnstileHandle = {
  /**
   * Re-arm the widget. Turnstile tokens are single-use: after a rejected
   * submit the old token is spent, so without this the next attempt always
   * fails no matter what the user types.
   */
  reset: () => void;
};

/**
 * Cloudflare Turnstile challenge widget. Calls onToken with the challenge
 * token on success (and "" when it expires / needs re-solving). The parent
 * must send this token to the server, which verifies it against Cloudflare,
 * and must call `reset()` on this component after every rejected attempt.
 */
export const Turnstile = forwardRef<
  TurnstileHandle,
  {
    siteKey: string;
    onToken: (token: string) => void;
    theme?: "dark" | "light";
  }
>(function Turnstile({ siteKey, onToken, theme = "dark" }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        onTokenRef.current("");
        if (widgetId.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetId.current);
          } catch {
            /* widget already gone */
          }
        }
      },
    }),
    []
  );

  const render = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;
    if (widgetId.current) return; // never render twice into the same container
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: (token: string) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(""),
      "timeout-callback": () => onTokenRef.current(""),
      "error-callback": () => {
        onTokenRef.current("");
        setFailed(true);
      },
    });
  }, [siteKey, theme]);

  useEffect(() => {
    let mounted = true;
    turnstileReady()
      .then(() => {
        if (mounted) render();
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
      widgetId.current = null;
    };
  }, [render]);

  return (
    <div>
      <div ref={containerRef} style={{ minHeight: 65 }} />
      {failed && (
        <div style={{ fontSize: 12, color: "#f59e0b", padding: "8px 0" }}>
          Security check unavailable. Reload the page to try again — if it keeps
          failing, the site owner needs to look at the Turnstile configuration.
        </div>
      )}
    </div>
  );
});
