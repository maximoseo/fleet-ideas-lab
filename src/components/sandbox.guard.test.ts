import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
}

/**
 * Generated prototypes render in sandboxed iframes. allow-scripts together with
 * allow-same-origin lets the framed document remove its own sandbox, so that pair
 * must never appear on one element. (allow-same-origin alone is what the app uses,
 * to measure content height.)
 */
describe("iframe sandbox guard", () => {
  const files = walk(join(process.cwd(), "src"));

  it("finds sandbox attributes to check", () => {
    const hits = files.flatMap((f) => readFileSync(f, "utf8").match(/sandbox=/g) ?? []);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("never combines allow-scripts with allow-same-origin", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/sandbox=(?:"([^"]*)"|\{\s*["'`]([^"'`]*)["'`]\s*\})/g)) {
        const v = m[1] ?? m[2] ?? "";
        expect(v.includes("allow-scripts") && v.includes("allow-same-origin"), `${f}: ${v}`).toBe(false);
      }
    }
  });
});
