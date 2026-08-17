import { describe, expect, it } from "vitest";
import { translate, type Lang } from "./i18n";

/**
 * The language toggle covers CHROME only — navigation, buttons, section
 * headers. Dashboard names, slugs and probe data stay English on purpose.
 *
 * That scope is a deliberate decision, so it needs a test that holds it: every
 * key present in both languages, nothing blank, and no entry that silently
 * falls back to the key name because someone added an English string and
 * forgot the Hebrew one. A half-translated interface reads as broken rather
 * than bilingual.
 */

// Keys are checked through the public translate() rather than by exporting the
// dictionary, so the test exercises the same path the components use.
const KEYS = [
  "nav.inventory", "nav.ideas", "nav.favorites", "nav.gaps", "nav.create",
  "nav.changelog", "nav.audit", "nav.generate", "nav.redesign", "nav.mockup",
  "nav.history", "nav.prototypes", "nav.experiments", "nav.more",
  "action.newScaffold", "action.jump", "action.commandPalette", "action.search",
  "action.close", "action.retry", "action.openSite", "action.rerunProbe",
  "action.copyImprove",
  "section.fleetStrip", "section.live", "section.probeHistory", "section.askAi",
  "sort.worst", "sort.name", "sort.domain",
] as const;

const LANGS: Lang[] = ["en", "he"];

describe("chrome dictionary", () => {
  it.each(LANGS)("has a non-empty %s string for every key", (lang) => {
    for (const key of KEYS) {
      const value = translate(lang, key);
      expect(value, `${key} missing in ${lang}`).toBeTruthy();
      expect(value.trim(), `${key} is blank in ${lang}`).not.toBe("");
      // translate() returns the key itself when an entry is absent.
      expect(value, `${key} has no ${lang} translation`).not.toBe(key);
    }
  });

  it("actually differs between languages", () => {
    const identical = KEYS.filter((k) => translate("en", k) === translate("he", k));
    expect(identical, `untranslated keys: ${identical.join(", ")}`).toHaveLength(0);
  });

  it("uses Hebrew characters in the Hebrew strings", () => {
    for (const key of KEYS) {
      expect(translate("he", key), `${key} looks like English`).toMatch(/[֐-׿]/);
    }
  });

  it("returns the key rather than throwing on an unknown lookup", () => {
    // @ts-expect-error deliberately outside the key union
    expect(translate("en", "does.not.exist")).toBe("does.not.exist");
  });
});
