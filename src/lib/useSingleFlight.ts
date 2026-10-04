"use client";

import { useCallback, useRef } from "react";

/**
 * Wraps an async action so a second call while the first is still running is ignored.
 * Used for submit buttons that start expensive work (extraction, analysis, history writes):
 * without it a double click races two requests and the older response can overwrite the newer one.
 */
export function useSingleFlight<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  const busy = useRef(false);
  return useCallback(
    async (...args: A) => {
      if (busy.current) return;
      busy.current = true;
      try {
        await fn(...args);
      } finally {
        busy.current = false;
      }
    },
    [fn],
  );
}
