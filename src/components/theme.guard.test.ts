import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
}

/**
 * Light-theme overrides in globals.css key on inline style="..." values, so a
 * Tailwind class like bg-[#0c0a14] is invisible to them and stays near-black on a
 * light page (2.19:1 contrast, measured 2026-10-04). Use bg-[var(--bg)] or
 * bg-[var(--panel)] instead.
 */
describe("theme guard", () => {
  it("has no class-based dark background hex that light mode cannot override", () => {
    const bad = /bg-\[#(0c0a14|0f0b1a|1a1428|151120|161322)\]/;
    for (const f of walk(join(process.cwd(), "src"))) {
      expect(readFileSync(f, "utf8").match(bad)?.[0] ?? null, f).toBeNull();
    }
  });
});
