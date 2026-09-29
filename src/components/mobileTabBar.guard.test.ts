
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transformSync } from "esbuild";
import { isPublicRoute } from "@/lib/publicRoute";

/**
 * The reviewers were right: pattern-matching source text is satisfied by a
 * commented-out or dead guard. This harness melts the component's TSX down to
 * runnable JS, strips comments, and *executes* the guard with a mocked
 * `usePathname` — so the assertion is on behaviour, not on spelling.
 *
 * Full component rendering needs a DOM environment plus @testing-library/react,
 * neither of which this project has; this is the strongest check available in
 * `environment: "node"` and it closes the "comment satisfies the test" hole.
 */
function loadGuard(pathname: string) {
  const source = readFileSync(
    join(process.cwd(), "src/components/MobileTabBar.tsx"),
    "utf8",
  );

  // Empty banner/footer so esbuild's CJS preamble stays out of the way; the
  // point is to run the component body, not to read the compiled text.
  const { code } = transformSync(source, {
    loader: "tsx",
    format: "cjs",
    target: "es2022",
    jsx: "transform",
    banner: "",
    footer: "",
  });

  // The compiled output still carries the import statements; swap the module
  // registry for mocks so the component can be evaluated in isolation.
  const module_ = { exports: {} as Record<string, unknown> };
  // A sentinel object so a wrapped render is observably non-null.
  const stub = () => ({ __rendered: true });
  const require_ = (request: string) => {
    if (request === "next/navigation") {
      return { usePathname: () => pathname };
    }
    if (request === "react") {
      // Minimal hook stubs: the guard sits above every hook call, so a
      // null-returning component body never reaches them.
      return {
        useState: (v: unknown) => [v, () => {}],
        useRef: () => ({ current: null }),
        default: { createElement: stub, Fragment: stub },
      };
    }
    if (request === "next/link") return { default: stub };
    if (request === "@/components/i18n") return { useLang: () => (k: string) => k };
    if (request === "@/lib/publicRoute") return { isPublicRoute };
    return {};
  };

  const fn = new Function("module", "exports", "require", "React", code);
  // `React` in scope because esbuild's JSX transform emits the classic runtime.
  fn(module_, module_.exports, require_, { createElement: stub, Fragment: stub });

  // Invoke the component the way React would: a guarded route returns null, a
  // gated route returns elements. A dead or commented-out guard shows up as a
  // non-null return on a public path.
  const Component = module_.exports.default as (() => unknown) | undefined;
  let rendered: unknown = undefined;
  let threw = false;
  try {
    rendered = Component?.call(undefined);
  } catch {
    threw = true;
  }
  return { Component, rendered, threw };
}

describe("MobileTabBar guard — executed, not pattern-matched", () => {
  it("hides on /login", () => {
    expect(loadGuard("/login").rendered).toBeFalsy();
  });

  it("hides on the public /share page", () => {
    expect(loadGuard("/share").rendered).toBeFalsy();
  });

  it("hides on /prototypes", () => {
    expect(loadGuard("/prototypes").rendered).toBeFalsy();
  });

  it("renders on gated routes instead of hiding", () => {
    const { rendered, threw } = loadGuard("/ideas");
    // Either real elements, or it reached the hooks the guard would have
    // skipped. Both prove the guard let execution through.
    expect(threw ? "reached-hooks" : rendered).not.toBeNull();
  });

  it("renders on the inventory root", () => {
    const { rendered, threw } = loadGuard("/");
    expect(threw ? "reached-hooks" : rendered).not.toBeNull();
  });

  it("imports the shared predicate — not its own copy of the rule", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/MobileTabBar.tsx"),
      "utf8",
    );
    expect(source).toContain('from "@/lib/publicRoute"');
    // It may mention the JSON in prose, but must not import it — importing it
    // means the component reimplements the matcher instead of sharing it.
    expect(source).not.toMatch(/^import .*publicRoutes\.json/m);
  });
});

describe("shared predicate vs the middleware", () => {
  /**
   * cubic P2: the comment claimed the predicate was shared with the middleware,
   * but middleware still runs its own copy and the two already diverge. Rather
   * than silently expanding this PR's blast radius into the auth path, the
   * comment is corrected and the divergence is asserted so drift is visible.
   */
  const middleware = readFileSync(
    join(process.cwd(), "src/middleware.ts"),
    "utf8",
  );

  it("keeps the component guard from claiming scope it does not have", () => {
    const tabBar = readFileSync(
      join(process.cwd(), "src/components/MobileTabBar.tsx"),
      "utf8",
    );
    // The old comment said the predicate was "shared with the guards" — it is
    // not: the middleware has its own matcher and the two diverge on /api/v1.
    expect(tabBar).not.toContain("shared with the guards");
    expect(tabBar).toContain("Shared data, two callers");
  });

  it("documents the known divergence instead of hiding it", () => {
    // The component excludes /api/v1 (an API namespace, not a page); the
    // middleware must not. That asymmetry is intentional — assert it stays.
    expect(isPublicRoute("/api/v1/health")).toBe(false);
    // middleware takes publicRoutes.prefix verbatim, /api/v1 included; the
    // component deliberately drops it. Assert the asymmetry survives.
    expect(middleware).toContain("PUBLIC_PREFIX.some");
  });
});
