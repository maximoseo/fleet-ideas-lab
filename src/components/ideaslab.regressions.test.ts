import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Three regressions invisible to a behavioural test: a touch target that shrank
 * back below the minimum, a button that grew while the input's padding stayed
 * put (the two shipped together, and the second was a real overlap bug the
 * reviewers caught), and a public feed that picked internal detail back up.
 * All were confirmed against the rendered page, so the assertions target the
 * source that produced them.
 */

const loginPage = readFileSync(
  join(process.cwd(), "src/app/login/page.tsx"),
  "utf8",
);

const appVersion = readFileSync(
  join(process.cwd(), "src/lib/appVersion.ts"),
  "utf8",
);

/** Tailwind spacing unit: h-11 === 44px, pr-12 === 48px. */
const TAILWIND_UNIT_PX = 4;

/**
 * Anchored on whitespace so a variant-prefixed class cannot pass for the base
 * size: `sm:h-11`, `md:h-11` and `min-h-11` are all rejected. A button carrying
 * `h-8 md:h-11` has an 8px target at every viewport below `md`.
 */
function tailwindSize(className: string, axis: "h" | "w" | "pr"): number {
  const match = className.match(new RegExp(`(?:^|\\s)${axis}-(\\d+)(?=\\s|$)`));
  expect(match, `no base ${axis}-<n> class in "${className}"`).not.toBeNull();
  return Number(match![1]) * TAILWIND_UNIT_PX;
}

/**
 * The className of the password toggle, read from the element rather than from a
 * block of source. Matching the block also matched the explanatory comment
 * above it, which is how the first version of this test passed while the button
 * was still 32px.
 */
function passwordToggleClassName(): string {
  const attrIndex = loginPage.indexOf("aria-label={showPassword");
  expect(attrIndex, "password toggle not found").toBeGreaterThan(-1);
  const classIndex = loginPage.indexOf('className="', attrIndex);
  expect(classIndex, "no className after the toggle").toBeGreaterThan(-1);
  const start = classIndex + 'className="'.length;
  return loginPage.slice(start, loginPage.indexOf('"', start));
}

function passwordInputClassName(): string {
  const inputIndex = loginPage.indexOf('id="password"');
  expect(inputIndex, "password input not found").toBeGreaterThan(-1);
  const classIndex = loginPage.indexOf('className="', inputIndex);
  expect(classIndex, "no className on the password input").toBeGreaterThan(-1);
  const start = classIndex + 'className="'.length;
  return loginPage.slice(start, loginPage.indexOf('"', start));
}

describe("password visibility toggle", () => {
  it("meets the 44px minimum touch target", () => {
    const className = passwordToggleClassName();
    // The icon may be any size; the hit area is what the guideline governs.
    expect(
      Math.min(tailwindSize(className, "h"), tailwindSize(className, "w")),
    ).toBeGreaterThanOrEqual(44);
  });

  it("reserves enough input padding for the width of its own toggle", () => {
    /**
     * A 44px box at right-0 spans the last 44px of the input while the input
     * only reserved 40px, so the toggle covered the caret when the field was
     * full. Coupling the input's padding to the button's width means shrinking
     * the button back to 32px, or growing it without touching the padding,
     * both fail here.
     */
    const buttonWidth = tailwindSize(passwordToggleClassName(), "w");
    const paddingRight = tailwindSize(passwordInputClassName(), "pr");
    expect(paddingRight).toBeGreaterThanOrEqual(buttonWidth);
  });
});

describe("public release notes", () => {
  /**
   * /api/app/version is unauthenticated by design — the APK feed needs it — so
   * this string is world-readable on an indexed host.
   */
  function changelog(): string {
    const match = appVersion.match(/changelog:\s*\n?\s*"([^"]*)"/);
    expect(match, "no single-line changelog literal found").not.toBeNull();
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

  it("does not carry the internal fleet size", () => {
    // The test name promises counts are blocked; the phrase loop above only
    // denied three wording choices. "across the 38 dashboards" is the class of
    // leak most likely to come back, so assert the shape, not the words.
    expect(changelog()).not.toMatch(/\b(?:across|all)\s+\d+\s+dashboards?\b/i);
  });

  it("cannot be split into fragments that hide a leak", () => {
    /**
     * The regex above captures the first quoted literal, so
     * `"first " + "silently dropped"` passes every check on truncated text.
     * Reject concatenation and template literals outright.
     */
    expect(appVersion).not.toMatch(/"\s*\+\s*["`]/);
    expect(appVersion).not.toContain("changelog: `");
  });
});
