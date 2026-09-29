/**
 * Is this path reachable without a session?
 *
 * `publicRoutes.json` is the single source of truth for the unauthenticated
 * surface — `src/middleware.ts` gates pages and `/api/*` against it, and
 * `scripts/smoke-auth-matrix.mjs` fails CI if anything else stops returning
 * 401. App chrome needs the same answer: a nav bar rendered on a public page
 * points at routes the visitor cannot load, and Next prefetches every one of
 * them on load.
 *
 * This module exists so the answer is computed once and shared, rather than
 * each caller growing its own list that can drift.
 */
import publicRoutes from "./publicRoutes.json";

export type PublicRoutes = {
  exact?: string[];
  prefix?: string[];
  comment?: string;
};

const routes = publicRoutes as PublicRoutes;

/**
 * `/api/v1` is in `prefix` for the middleware's benefit, but it is an API
 * namespace, not a page. Passing it through here would make every gated page
 * look public by prefix, so it is excluded explicitly.
 */
const NON_PAGE_PREFIXES = new Set(["/api/v1"]);

export function isPublicRoute(path: string): boolean {
  const { exact = [], prefix = [] } = routes;
  return (
    exact.includes(path) ||
    // Segment boundaries, not raw prefixes: `/share` must not make
    // `/share-ish` public, and `/prototypes` must cover everything under it.
    prefix.some(
      (p) =>
        !NON_PAGE_PREFIXES.has(p) &&
        (path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`)),
    )
  );
}
