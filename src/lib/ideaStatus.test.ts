import { describe, expect, it } from "vitest";
import { effectiveStatus, seedToPipeline, STATUS_MAP } from "./ideaStatus";

/**
 * The seed file speaks new/scoped/backlog/shipped, the board speaks
 * backlog/planned/building/shipped/archived. The agent API used to return the
 * seed value next to the board value and let the caller guess which one was true.
 */
describe("idea status contract", () => {
  it("maps every seed status into the pipeline vocabulary", () => {
    expect(seedToPipeline("new")).toBe("backlog");
    expect(seedToPipeline("scoped")).toBe("planned");
    expect(seedToPipeline("shipped")).toBe("shipped");
    expect(Object.values(STATUS_MAP).every((v) => ["backlog", "planned", "building", "shipped", "archived"].includes(v))).toBe(true);
  });

  it("reads an unknown seed status as backlog rather than inventing a stage", () => {
    expect(seedToPipeline("???")).toBe("backlog");
  });

  it("prefers the persisted board status over the seed", () => {
    expect(effectiveStatus("new", { status: "building" })).toBe("building");
    expect(effectiveStatus("shipped", { status: "archived" })).toBe("archived");
  });

  it("falls back to the mapped seed when there is no board row", () => {
    expect(effectiveStatus("scoped", null)).toBe("planned");
    expect(effectiveStatus("scoped", undefined)).toBe("planned");
  });
});
