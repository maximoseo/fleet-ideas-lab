import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPublicRoute } from "@/lib/publicRoute";

/**
 * The tab bar hides itself on the unauthenticated surface. The predicate is
 * imported from the same module the component imports, so a change to the rule
 * moves this test with it rather than leaving a stale copy behind.
 *
 * Regression: /share and /prototypes went public while the guard still only
 * knew about /login, so the public share page rendered five tabs to gated
 * routes and Next prefetched all of them — five 307s to login per visit.
 */
describe("isPublicRoute", () => {
  it("treats the login page as public", () => {
    expect(isPublicRoute("/login")).toBe(true);
  });

  it("treats the share page as public", () => {
    expect(isPublicRoute("/share")).toBe(true);
  });

  it("treats the prototype routes as public, including nested ones", () => {
    expect(isPublicRoute("/prototypes")).toBe(true);
    expect(isPublicRoute("/prototypes/some-generated-page")).toBe(true);
  });

  it("keeps every in-app route gated", () => {
    for (const path of ["/", "/ideas", "/favorites", "/gaps", "/create", "/audit", "/history"]) {
      expect(isPublicRoute(path)).toBe(false);
    }
  });

  it("does not treat an API namespace as a page-level public route", () => {
    // /api/v1 is public to the *middleware* but must never be handed to the
    // component guard: it would make every gated page look public by prefix.
    expect(isPublicRoute("/api/v1/health")).toBe(false);
  });

  it("matches on segment boundaries, not raw string prefixes", () => {
    // /ideas is gated. A prefix match against a public root would wrongly
    // expose a route whose name merely starts with the same characters.
    expect(isPublicRoute("/share-ish")).toBe(false);
  });
});

describe("MobileTabBar wiring", () => {
  /**
   * The behaviour test above cannot catch a component that stops calling the
   * predicate at all. This one can: it asserts the guard is still wired up.
   */
  const source = readFileSync(
    join(process.cwd(), "src/components/MobileTabBar.tsx"),
    "utf8",
  );

  it("imports the shared predicate", () => {
    expect(source).toContain('from "@/lib/publicRoute"');
  });

  it("calls it against the current pathname and returns null when public", () => {
    expect(source).toMatch(/if\s*\(\s*isPublicRoute\(pathname\)\s*\)\s*return null/);
  });

  it("does not carry its own private copy of the public route list", () => {
    expect(source).not.toContain('pathname === "/login"');
    expect(source).not.toContain("publicRoutes.json");
  });
});
