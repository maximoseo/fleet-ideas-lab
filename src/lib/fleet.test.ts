import { describe, expect, it } from "vitest";
import {
  ALL_DOMAINS,
  FLEET_COUNT,
  FLEET_INVENTORY,
  FLEET_PROJECTS,
  getSlugs,
  healthLevel,
} from "./fleet";

/**
 * The inventory is a hand-maintained file that the UI, the APK feed, the gap
 * radar and the marketing copy all count from. A duplicate slug or a bad URL
 * here shows up as a wrong number on a page that claims to be verified.
 */
describe("fleet inventory integrity", () => {
  it("has a project list and a count derived from it", () => {
    expect(FLEET_INVENTORY.length).toBeGreaterThan(0);
    expect(FLEET_COUNT).toBe(FLEET_INVENTORY.length);
  });

  it("has no duplicate slugs", () => {
    const slugs = FLEET_INVENTORY.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("exposes every slug through getSlugs", () => {
    expect(getSlugs().size).toBe(FLEET_INVENTORY.length);
  });

  it("gives every project a name and an https url", () => {
    for (const p of FLEET_INVENTORY) {
      expect(p.name, `${p.slug} has no name`).toBeTruthy();
      if (p.url) expect(p.url, `${p.slug} url`).toMatch(/^https:\/\//);
    }
  });

  it("only tags domains the app knows how to render", () => {
    for (const p of FLEET_INVENTORY) {
      for (const d of p.domains || []) {
        expect(ALL_DOMAINS, `${p.slug} has unknown domain ${d}`).toContain(d);
      }
    }
  });

  it("builds one UI row per inventory entry", () => {
    expect(FLEET_PROJECTS).toHaveLength(FLEET_INVENTORY.length);
  });
});

describe("healthLevel", () => {
  it("maps the score bands in order", () => {
    const bands = [0, 25, 50, 60, 70, 80, 90, 100].map(healthLevel);
    // Whatever the exact thresholds, the mapping must never improve as the
    // score falls — that is the bug this test exists to catch.
    const rank = { critical: 0, "needs-attention": 1, good: 2, excellent: 3 } as const;
    for (let i = 1; i < bands.length; i++) {
      expect(rank[bands[i]]).toBeGreaterThanOrEqual(rank[bands[i - 1]]);
    }
  });

  it("puts 100 at the top and 0 at the bottom", () => {
    expect(healthLevel(100)).toBe("excellent");
    expect(healthLevel(0)).toBe("critical");
  });
});
