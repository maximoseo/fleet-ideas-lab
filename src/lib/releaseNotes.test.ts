import { describe, expect, it } from "vitest";
import { RELEASE_NOTES, WEB_VERSION, unseenNotes, type ReleaseNote } from "./releaseNotes";

const mk = (v: string): ReleaseNote => ({ version: v, date: "2026-01-01", title: { en: v, he: v }, changes: [{ en: "x", he: "y" }] });
const NOTES = ["3.0.0", "2.0.0", "1.1.0", "1.0.0", "0.9.0", "0.8.0", "0.7.0"].map(mk);

describe("release notes data", () => {
  it("lists unique semver versions, newest first, and exposes the top one", () => {
    const versions = RELEASE_NOTES.map((n) => n.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const v of versions) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    expect(WEB_VERSION).toBe(versions[0]);
    const nums = versions.map((v) => v.split(".").map(Number));
    for (let i = 1; i < nums.length; i++) {
      const [a, b] = [nums[i - 1], nums[i]];
      expect(a[0] * 1e6 + a[1] * 1e3 + a[2], `${versions[i - 1]} must be newer than ${versions[i]}`).toBeGreaterThan(b[0] * 1e6 + b[1] * 1e3 + b[2]);
    }
  });

  it("has English and Hebrew text for every title and change", () => {
    for (const n of RELEASE_NOTES) {
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(n.changes.length).toBeGreaterThan(0);
      for (const b of [n.title, ...n.changes]) {
        expect(b.en.trim(), n.version).not.toBe("");
        expect(b.he, `${n.version}: Hebrew text`).toMatch(/[֐-׿]/);
      }
    }
  });
});

describe("unseenNotes", () => {
  it("shows only the latest entry to a browser that has seen nothing", () => {
    expect(unseenNotes(null, NOTES).map((n) => n.version)).toEqual(["3.0.0"]);
  });
  it("shows nothing when the latest version was acknowledged", () => {
    expect(unseenNotes("3.0.0", NOTES)).toEqual([]);
  });
  it("shows everything newer than the last acknowledged version", () => {
    expect(unseenNotes("1.1.0", NOTES).map((n) => n.version)).toEqual(["3.0.0", "2.0.0"]);
  });
  it("caps a long gap", () => {
    expect(unseenNotes("0.7.0", NOTES, 3)).toHaveLength(3);
  });
  it("treats an unknown stored version like a first visit", () => {
    expect(unseenNotes("9.9.9", NOTES).map((n) => n.version)).toEqual(["3.0.0"]);
  });
});
