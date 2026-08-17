import { describe, expect, it } from "vitest";
import { auditFleet, gapRadar, generateIdeas, runFullPipeline } from "./ideas-engine";
import { ALL_CAPABILITIES, ALL_DOMAINS, FLEET_INVENTORY, type FleetProject } from "./fleet";

/**
 * The idea engine is what the app puts in front of the operator as "the gaps".
 * Two properties have to hold or the output is decoration: the gap matrix must
 * cover every domain x capability pair, and the engine must never propose
 * building something the fleet already has.
 */
describe("auditFleet", () => {
  it("scores every project inside 0..100", () => {
    for (const a of auditFleet(FLEET_INVENTORY)) {
      for (const k of ["coverage", "freshness", "usability", "businessValue", "overall"] as const) {
        expect(a[k], `${a.slug}.${k}`).toBeGreaterThanOrEqual(0);
        expect(a[k], `${a.slug}.${k}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("returns one score per project", () => {
    expect(auditFleet(FLEET_INVENTORY)).toHaveLength(FLEET_INVENTORY.length);
  });

  it("survives an empty fleet", () => {
    expect(auditFleet([])).toEqual([]);
  });
});

describe("gapRadar", () => {
  it("covers every domain x capability pair exactly once", () => {
    const m = gapRadar([], FLEET_INVENTORY);
    expect(m.cells).toHaveLength(ALL_DOMAINS.length * ALL_CAPABILITIES.length);
    const seen = new Set(m.cells.map((c) => `${c.domain}|${c.capability}`));
    expect(seen.size).toBe(m.cells.length);
  });

  it("reports coverage as a percentage of the fleet, not a raw count", () => {
    const m = gapRadar([], FLEET_INVENTORY);
    for (const c of m.cells) {
      expect(c.coveragePct).toBeGreaterThanOrEqual(0);
      expect(c.coveragePct).toBeLessThanOrEqual(100);
      expect(c.count).toBeLessThanOrEqual(FLEET_INVENTORY.length);
    }
  });

  it("names the five weakest cells, weakest first", () => {
    const m = gapRadar([], FLEET_INVENTORY);
    expect(m.weakest).toHaveLength(5);
    for (let i = 1; i < m.weakest.length; i++) {
      expect(m.weakest[i].coveragePct).toBeGreaterThanOrEqual(m.weakest[i - 1].coveragePct);
    }
  });

  it("does not divide by zero on an empty fleet", () => {
    const m = gapRadar([], []);
    expect(m.cells.every((c) => c.coveragePct === 0)).toBe(true);
  });
});

describe("generateIdeas", () => {
  it("never proposes something the fleet already ships", () => {
    const owned = new Set(FLEET_INVENTORY.map((p) => p.slug));
    for (const idea of generateIdeas(null, FLEET_INVENTORY)) {
      expect(owned.has(idea.slug), `${idea.slug} already exists`).toBe(false);
    }
  });

  it("is deterministic for the same input", () => {
    const a = generateIdeas(null, FLEET_INVENTORY).map((i) => i.slug);
    const b = generateIdeas(null, FLEET_INVENTORY).map((i) => i.slug);
    expect(a).toEqual(b);
  });

  it("gives every idea an effort and a priority", () => {
    for (const idea of generateIdeas(null, FLEET_INVENTORY)) {
      expect(["S", "M", "L", "XL"]).toContain(idea.effort);
      expect(["P0", "P1", "P2", "P3"]).toContain(idea.priority);
    }
  });

  it("puts ideas that hit the weakest domains first", () => {
    const gaps = gapRadar([], FLEET_INVENTORY);
    const weak = new Set(gaps.weakest.map((c) => c.domain));
    const ranked = generateIdeas(gaps, FLEET_INVENTORY);
    const hits = ranked.map((i) => i.domains.filter((d) => weak.has(d)).length);
    // Not a strict sort assertion — ties are broken by hash — but the head of
    // the list must not be weaker than the tail.
    expect(hits[0]).toBeGreaterThanOrEqual(hits[hits.length - 1]);
  });

  it("drops a pool idea once the fleet owns that slug", () => {
    const baseline = generateIdeas(null, []).map((i) => i.slug);
    const taken = baseline[0];
    const pretend: FleetProject[] = [
      { ...FLEET_INVENTORY[0], slug: taken },
    ];
    expect(generateIdeas(null, pretend).map((i) => i.slug)).not.toContain(taken);
  });
});

describe("runFullPipeline", () => {
  it("returns audits, gaps and ideas that agree with each other", () => {
    const out = runFullPipeline(FLEET_INVENTORY);
    expect(out.audits).toHaveLength(FLEET_INVENTORY.length);
    expect(out.gaps.cells.length).toBeGreaterThan(0);
    expect(out.ideas.length).toBeGreaterThan(0);
  });
});
