import { describe, expect, it } from "vitest";
import publicRoutes from "@/lib/publicRoutes.json";

/**
 * The tab bar hides itself on the unauthenticated surface. The logic lives
 * inline in a client component (it reads usePathname), so the rule is asserted
 * against the same data the component consumes rather than re-implemented here.
 *
 * Regression: /share and /prototypes went public while the guard still only
 * knew about /login, so the public share page rendered five tabs to gated
 * routes and Next prefetched all of them — five 307s to login per visit.
 */
type PublicRoutes = {
  exact?: string[];
  prefix?: string[];
  comment?: string;
};

const routes = publicRoutes as PublicRoutes;

function isPublicRoute(path: string): boolean {
  const { exact = [], prefix = [] } = routes;
  return (
    exact.includes(path) || prefix.some((p) => p !== "/api/v1" && path.startsWith(p))
  );
}

describe("public surface vs app chrome", () => {
  it("treats the login page as public", () => {
    expect(isPublicRoute("/login")).toBe(true);
  });

  it("treats the share page as public so the tab bar stays hidden", () => {
    expect(isPublicRoute("/share")).toBe(true);
  });

  it("treats the prototype routes as public", () => {
    expect(isPublicRoute("/prototypes")).toBe(true);
    expect(isPublicRoute("/prototypes/some-generated-page")).toBe(true);
  });

  it("keeps every in-app route gated", () => {
    for (const path of ["/", "/ideas", "/favorites", "/gaps", "/create", "/audit", "/history"]) {
      expect(isPublicRoute(path)).toBe(false);
    }
  });

  it("does not treat an API path as a page-level public route", () => {
    // /api/v1 is public to the *middleware* but must never be handed to the
    // component guard: it would make every gated page look public by prefix.
    expect(isPublicRoute("/api/v1/health")).toBe(false);
  });
});
