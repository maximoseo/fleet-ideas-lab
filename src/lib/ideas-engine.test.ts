import { describe, expect, it } from "vitest";
import { auditFleet, gapRadar, generateIdeas, inventorySnapshot, runFullPipeline } from "./ideas-engine";
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

/**
 * The scores are heuristics, and the one thing they must not be is random.
 * Until 2026-10-04 every score added a hash of the project slug and the age maths
 * were anchored to a fixed date, so two identical projects scored differently and
 * freshness could never decay.
 */
describe("auditFleet is not noise", () => {
  const base: FleetProject = {
    slug: "alpha",
    name: "Alpha",
    domains: ["seo", "analytics"],
    capabilities: ["analytics", "reporting"],
    health: "healthy",
    updated: "2026-08-01",
  };
  const NOW = new Date("2026-08-02T00:00:00Z").getTime();

  it("gives two projects that differ only in name the same scores", () => {
    const [a, b] = auditFleet([base, { ...base, slug: "zzz-other-name", name: "Other" }], NOW);
    for (const k of ["coverage", "freshness", "usability", "businessValue", "overall"] as const) {
      expect(a[k], k).toBe(b[k]);
    }
  });

  it("lets freshness decay as the clock moves", () => {
    const early = auditFleet([base], NOW)[0].freshness;
    const late = auditFleet([base], NOW + 60 * 86400000)[0].freshness;
    expect(early).toBe(95);
    expect(late).toBeLessThan(early);
  });

  it("is repeatable for the same inventory and clock", () => {
    expect(auditFleet([base], NOW)).toEqual(auditFleet([base], NOW));
  });

  it("only suggests generic fixes for capabilities the project does not declare", () => {
    const complete: FleetProject = { ...base, capabilities: ["analytics", "alerts", "automation", "reporting", "visualization"] };
    const text = auditFleet([complete], NOW)[0].improvements.join(" | ");
    expect(text).not.toMatch(/threshold alerts/i);
    expect(text).not.toMatch(/scheduled PDF export/i);
    expect(text).not.toMatch(/n8n\/webhook triggers/i);
  });

  it("does suggest them when the capability is missing", () => {
    const bare: FleetProject = { ...base, domains: ["seo"], capabilities: [] };
    const text = auditFleet([bare], NOW)[0].improvements.join(" | ");
    expect(text).toMatch(/threshold alerts/i);
  });
});

describe("inventorySnapshot", () => {
  it("reports the newest update and its age", () => {
    const now = new Date("2026-10-04T00:00:00Z").getTime();
    const s = inventorySnapshot([{ ...FLEET_INVENTORY[0], updated: "2026-08-01" }, { ...FLEET_INVENTORY[0], updated: "2026-08-16" }], now);
    expect(s.latestUpdated).toBe("2026-08-16");
    expect(s.ageDays).toBe(49);
  });

  it("copes with an empty inventory", () => {
    expect(inventorySnapshot([])).toEqual({ latestUpdated: null, ageDays: null });
  });
});
