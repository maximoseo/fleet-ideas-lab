import { describe, expect, it } from "vitest";
import { FLEET_GENERATED_POOL, FLEET_IDEAS, FLEET_INVENTORY, statusExplainer } from "./fleet";
import type { FleetProject } from "./fleet";
import { AUDIT_BASIS, auditFleet, generateIdeas } from "./ideas-engine";
import {
  HE_AUDIT_BASIS,
  HE_IDEAS,
  HE_IMPROVEMENTS,
  HE_PROJECTS,
  heStatusExplainer,
  localizeAuditBasis,
  localizeIdea,
  localizeImprovement,
  localizeProject,
  localizeStatusExplainer,
} from "./fleet.he";

const HEBREW = /[֐-׿]/;
const nums = (s: string) => (s.match(/\d+/g) ?? []).sort();
const count = (s: string, ch: string) => s.split(ch).length - 1;

/** Same digits (so no invented numbers) and no '%' beyond what the English has. */
function expectFaithful(he: string, en: string) {
  expect(HEBREW.test(he), `no Hebrew letters: ${he}`).toBe(true);
  expect(nums(he), `numbers differ: ${he}`).toEqual(nums(en));
  expect(count(he, "%"), `percent count differs: ${he}`).toBe(count(en, "%"));
}

// IDEA_POOL is not exported. generateIdeas returns the first 12 not-yet-built pool entries, so
// asking again with those slugs marked as existing returns the remaining ones: union = whole pool.
const stub = (slug: string): FleetProject => ({ slug, name: slug, domains: [], capabilities: [], health: "healthy", updated: "2026-01-01" });
const firstBatch = generateIdeas(null, []);
const rest = generateIdeas(null, firstBatch.map((i) => stub(i.slug)));
const POOL = [...firstBatch, ...rest];

const PROSE = ["title", "whyNow", "description", "problem", "solution", "benefit", "dataNeeded", "feasibility", "nextStep", "evidence"] as const;
// Intentionally left in English: the shipped dashboard name is not translated.
const TITLE_KEPT_LATIN = new Set(["schema-studio"]);

describe("HE_PROJECTS", () => {
  it("covers every FLEET_INVENTORY slug and nothing else", () => {
    const slugs = FLEET_INVENTORY.map((p) => p.slug);
    for (const s of slugs) expect(HE_PROJECTS[s], s).toBeDefined();
    expect(Object.keys(HE_PROJECTS).sort()).toEqual([...slugs].sort());
  });

  it("translates both prose fields faithfully", () => {
    for (const p of FLEET_INVENTORY) {
      const he = HE_PROJECTS[p.slug];
      expect(he.description, p.slug).toBeDefined();
      expect(he.plainExplainer, p.slug).toBeDefined();
      expectFaithful(he.description!, p.description!);
      expectFaithful(he.plainExplainer!, p.plainExplainer!);
      // names and urls stay as in the English source
      for (const tok of (p.description!.match(/https?:\/\/\S+|\b[\w-]+\.maximo-seo\.ai\b/g) ?? [])) expect(he.description! + he.plainExplainer!).toContain(tok);
    }
  });
});

describe("HE_IDEAS", () => {
  const sources: Array<[string, Array<Record<string, unknown> & { slug: string }>]> = [
    ["FLEET_IDEAS", FLEET_IDEAS as never],
    ["FLEET_GENERATED_POOL", FLEET_GENERATED_POOL as never],
    ["IDEA_POOL", POOL as never],
  ];

  it("pool sizes are what the overlay was written for", () => {
    expect(POOL.length).toBe(14);
    expect(new Set(POOL.map((i) => i.slug)).size).toBe(14);
  });

  it("slugs are unique across sources and the overlay has no stray keys", () => {
    const all = sources.flatMap(([, list]) => list.map((i) => i.slug));
    expect(new Set(all).size).toBe(all.length);
    expect(Object.keys(HE_IDEAS).sort()).toEqual([...all].sort());
  });

  for (const [name, list] of sources) {
    it(`${name}: every slug translated, field by field`, () => {
      for (const idea of list) {
        const he = HE_IDEAS[idea.slug] as Record<string, unknown> | undefined;
        expect(he, idea.slug).toBeDefined();
        // only fields that exist in the English source
        for (const k of Object.keys(he!)) expect(idea[k], `${idea.slug}.${k} missing in English`).toBeDefined();
        for (const k of [...PROSE, "widgets", "iaSketch", "dataSources"]) {
          if (idea[k] === undefined) continue;
          if (k === "title" && TITLE_KEPT_LATIN.has(idea.slug)) {
            expect(he!.title).toBeUndefined();
            continue;
          }
          const v = he![k];
          expect(v, `${idea.slug}.${k} not translated`).toBeDefined();
          if (Array.isArray(idea[k])) {
            const en = idea[k] as string[];
            const hv = v as string[];
            expect(Array.isArray(hv), `${idea.slug}.${k}`).toBe(true);
            expect(hv.length, `${idea.slug}.${k} length`).toBe(en.length);
            hv.forEach((s, i) => expectFaithful(s, en[i]));
          } else {
            expectFaithful(v as string, idea[k] as string);
          }
        }
      }
    });
  }

  it("keeps URLs and slugs from the English next step", () => {
    for (const idea of [...FLEET_IDEAS, ...FLEET_GENERATED_POOL]) {
      const he = HE_IDEAS[idea.slug];
      for (const tok of idea.nextStep.match(/https?:\/\/\S+/g) ?? []) expect(he.nextStep).toContain(tok);
    }
  });
});

describe("HE_IMPROVEMENTS", () => {
  // IMPROVEMENT_POOL is not exported: harvest every string it can produce through auditFleet.
  const domains = ["seo", "local", "analytics", "automation", "content", "technical", "outreach", "design", "geo", "whm", "competitor", "reporting", "client-ops"] as const;
  const harvested = new Set<string>();
  const add = (inv: FleetProject[]) => auditFleet(inv).forEach((a) => a.improvements.forEach((s) => harvested.add(s)));
  for (const d of domains) add([{ ...stub(d), domains: [d] }]);
  add([{ ...stub("s"), domains: ["seo"], health: "stale" }, { ...stub("d"), domains: ["seo"], health: "degraded" }]);

  it("harvests the whole 16-string pool", () => {
    expect(harvested.size).toBe(16);
  });

  it("has a faithful Hebrew string for every English improvement", () => {
    expect(Object.keys(HE_IMPROVEMENTS).sort()).toEqual([...harvested].sort());
    for (const en of harvested) expectFaithful(HE_IMPROVEMENTS[en], en);
  });
});

describe("generic text", () => {
  it("status explainers keep the date and the 7d threshold", () => {
    for (const s of ["live", "beta", "build", "concept"] as const) {
      const he = heStatusExplainer(s, "2026-08-15");
      expect(HEBREW.test(he)).toBe(true);
      expect(nums(he)).toEqual(nums(statusExplainer(s, "2026-08-15")));
      expect(he.includes("%")).toBe(false);
      expect(localizeStatusExplainer(s, "2026-08-15", "en")).toBe(statusExplainer(s, "2026-08-15"));
      expect(localizeStatusExplainer(s, "2026-08-15", "he")).toBe(he);
    }
  });

  it("audit basis", () => {
    expect(HEBREW.test(HE_AUDIT_BASIS)).toBe(true);
    expect(localizeAuditBasis("en")).toBe(AUDIT_BASIS);
    expect(localizeAuditBasis("he")).toBe(HE_AUDIT_BASIS);
  });
});

describe("localize*", () => {
  it("returns the same object for en", () => {
    const p = FLEET_INVENTORY[0];
    expect(localizeProject(p, "en")).toBe(p);
    const i = FLEET_IDEAS[0];
    expect(localizeIdea(i, "en")).toBe(i);
    expect(localizeImprovement("anything", "en")).toBe("anything");
  });

  it("returns the same object when there is no overlay entry", () => {
    const p = { slug: "nope", description: "x" };
    expect(localizeProject(p, "he")).toBe(p);
    const i = { slug: "nope", title: "x" };
    expect(localizeIdea(i, "he")).toBe(i);
    expect(localizeImprovement("not in pool", "he")).toBe("not in pool");
  });

  it("applies Hebrew as a shallow copy without mutating the source", () => {
    const p = FLEET_INVENTORY[0];
    const before = { ...p };
    const lp = localizeProject(p, "he");
    expect(lp).not.toBe(p);
    expect(lp.description).toBe(HE_PROJECTS[p.slug].description);
    expect(lp.name).toBe(p.name);
    expect(lp.url).toBe(p.url);
    expect(p).toEqual(before);

    const i = FLEET_IDEAS[0];
    const li = localizeIdea(i, "he");
    expect(li).not.toBe(i);
    expect(li.title).toBe(HE_IDEAS[i.slug].title);
    expect(li.widgets).toEqual(HE_IDEAS[i.slug].widgets);
    expect(li.prompt).toBe(i.prompt);
    expect(li.effort).toBe(i.effort);
    expect(i.title).toBe("Anomaly Explain Engine");
  });

  it("does not invent fields the item does not have", () => {
    const li = localizeIdea({ slug: "whm-fleet-health", title: "t" } as { slug: string; title: string; whyNow?: string }, "he");
    expect(li.whyNow).toBeUndefined();
    expect(li.title).toBe(HE_IDEAS["whm-fleet-health"].title);
  });

  it("localizeImprovement maps a real pool string", () => {
    const en = "Add scheduled PDF export with vault branding";
    expect(localizeImprovement(en, "he")).toBe(HE_IMPROVEMENTS[en]);
  });
});
