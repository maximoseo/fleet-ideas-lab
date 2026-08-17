"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A Set of strings backed by localStorage, shared across every component that
 * reads the same key.
 *
 * This replaces the `useState(new Set()) + useEffect(read localStorage)` pattern
 * that appeared in four places. That pattern renders once with the wrong value
 * and then sets state from an effect, which React 19's
 * `react-hooks/set-state-in-effect` rule flags for good reason: two components
 * reading the same key could disagree, and the favourites list visibly flashed
 * empty on every navigation.
 *
 * `useSyncExternalStore` is the supported way to read browser-only state: one
 * subscription, one snapshot, an explicit server snapshot, and no effect.
 */

const EVENT = "fil-persisted-set";
const EMPTY: ReadonlySet<string> = new Set();

// Cached per key so getSnapshot returns a stable reference between renders —
// returning a new Set each time would loop forever.
const cache = new Map<string, { raw: string | null; value: ReadonlySet<string> }>();

function read(key: string): ReadonlySet<string> {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return EMPTY;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value: ReadonlySet<string> = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) value = new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    value = EMPTY;
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, next: ReadonlySet<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...next]));
  } catch {
    // Private mode or a full quota — the in-memory value still updates.
  }
  cache.set(key, { raw: JSON.stringify([...next]), value: next });
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  // Another tab writing the same key must not leave this one stale.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function usePersistedSet(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY,
  );

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(read(key));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      write(key, next);
    },
    [key],
  );

  const remove = useCallback(
    (id: string) => {
      const next = new Set(read(key));
      next.delete(id);
      write(key, next);
    },
    [key],
  );

  const addAll = useCallback(
    (ids: Iterable<string>) => {
      const next = new Set(read(key));
      let changed = false;
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (changed) write(key, next);
    },
    [key],
  );

  const clear = useCallback(() => write(key, new Set()), [key]);

  return { value, toggle, remove, addAll, clear };
}
