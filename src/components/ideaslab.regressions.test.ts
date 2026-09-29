import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * These two regressions are invisible to a behavioural test: a control that no
 * longer meets the 44px touch minimum, and a public feed that has picked
 * internal detail back up. Both were measured live in a browser before being
 * fixed, so the assertion is on the source that produced them.
 */

const loginPage = readFileSync(
  join(process.cwd(), "src/app/login/page.tsx"),
  "utf8",
);

const appVersion = readFileSync(
  join(process.cwd(), "src/lib/appVersion.ts"),
  "utf8",
);

/** Tailwind spacing unit: h-11 === 44px. */
const TAILWIND_UNIT_PX = 4;

function tailwindSize(className: string, axis: "h" | "w"): number {
  // Match the axis class regardless of the order it appears in, so `w-11 h-11`
  // is accepted as readily as `h-11 w-11`.
  const match = className.match(new RegExp(`\\b${axis}-(\\d+)\\b`));
  expect(match, `no ${axis}-<n> class in "${className}"`).not.toBeNull();
  return Number(match![1]) * TAILWIND_UNIT_PX;
}

describe("password visibility toggle", () => {
  it("meets the 44px minimum touch target", () => {
    // Start at the attribute, then read the className that follows — matching
    // the whole button block also matches the explanatory comment above it,
    // which is exactly how the first version of this test passed while the
    // button was still 32px.
    const attrIndex = loginPage.indexOf('aria-label={showPassword');
    const classIndex = loginPage.indexOf('className="', attrIndex);
    const className = loginPage
      .slice(classIndex + 'className="'.length, loginPage.indexOf('"', classIndex + 11));

    // The icon may be any size; the hit area is what the guideline governs.
    const height = tailwindSize(className, "h");
    const width = tailwindSize(className, "w");
    expect(Math.min(height, width)).toBeGreaterThanOrEqual(44);
  });
});

describe("public release notes", () => {
  /**
   * /api/app/version is unauthenticated by design — the APK feed needs it — so
   * this string is world-readable on an indexed host.
   */
  function changelog(): string {
    const match = appVersion.match(/changelog:\s*\n?\s*"([^"]*)"/);
    expect(match, "no changelog literal found").not.toBeNull();
    return match![1];
  }

  it("stays short enough for a public feed", () => {
    // The 1.5.0 note was ~640 characters of internal postmortem.
    expect(changelog().length).toBeLessThanOrEqual(400);
  });

  it("does not name internal dashboards, counts, or latent defects", () => {
    const notes = changelog();
    for (const leak of ["untruthful", "silently dropped", "did not mirror"]) {
      expect(notes).not.toContain(leak);
    }
  });

  it("assumes a single-line literal, and that assumption is load-bearing", () => {
    // Kilo: the regex above only reads one line. If the changelog ever becomes a
    // multi-line template string these assertions go quiet, so say so.
    const multiLine = appVersion.includes('changelog: `');
    expect(multiLine).toBe(false);
  });
});
