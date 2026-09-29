import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * These guard two regressions that are invisible to a unit test of behaviour:
 * a control that no longer meets the 44px touch minimum, and a public feed that
 * has picked internal detail back up. Both were measured live in a browser
 * before being fixed, so the assertion is on the source that produced them.
 */

const loginPage = readFileSync(
  join(process.cwd(), "src/app/login/page.tsx"),
  "utf8",
);

const appVersion = readFileSync(
  join(process.cwd(), "src/lib/appVersion.ts"),
  "utf8",
);

const WCAG_MIN_TARGET = 44;

describe("password visibility toggle", () => {
  it("meets the 44px minimum touch target", () => {
    // h-11 w-11 === 44px. h-8 w-8 (32px) is what shipped and it failed on every
    // viewport — 320, 390, 768 and 1440 all measured 32x32.
    const button = loginPage.slice(
      loginPage.indexOf("aria-label={showPassword"),
      loginPage.indexOf("</button>", loginPage.indexOf("aria-label={showPassword")),
    );
    const match = button.match(/h-(\d+)\s+w-(\d+)/);
    expect(match).not.toBeNull();
    const height = Number(match![1]) * 4;
    const width = Number(match![2]) * 4;
    expect(Math.min(height, width)).toBeGreaterThanOrEqual(WCAG_MIN_TARGET);
  });
});

describe("public release notes", () => {
  it("stays under a length a public feed should carry", () => {
    const changelog = appVersion.match(/changelog:\s*\n?\s*"([^"]*)"/)?.[1] ?? "";
    expect(changelog.length).toBeGreaterThan(0);
    // The 1.5.0 note was ~640 characters of internal postmortem. Keep the
    // public feed short enough that nobody writes a bug report in it.
    expect(changelog.length).toBeLessThanOrEqual(400);
  });

  it("does not name internal dashboards, counts, or latent defects", () => {
    const changelog = appVersion.match(/changelog:\s*\n?\s*"([^"]*)"/)?.[1] ?? "";
    for (const leak of ["untruthful", "silently dropped", "did not mirror"]) {
      expect(changelog).not.toContain(leak);
    }
  });
});
