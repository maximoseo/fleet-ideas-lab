import { afterEach, describe, expect, it } from "vitest";
import { buildVersion } from "./rest";

const KEYS = ["VERCEL_GIT_COMMIT_SHA", "GIT_COMMIT_SHA", "BUILD_SHA", "VERCEL_DEPLOYMENT_ID"] as const;
afterEach(() => { for (const k of KEYS) delete process.env[k]; });

describe("buildVersion", () => {
  it("reports unknown only when nothing identifies the build", () => {
    for (const k of KEYS) delete process.env[k];
    expect(buildVersion()).toBe("unknown");
  });

  it("never reports a deployment id as the version (the panel only accepts SHAs)", () => {
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_123";
    expect(buildVersion()).toBe("unknown");
  });

  it("falls back from the Vercel SHA to the deploy-time SHA", () => {
    process.env.BUILD_SHA = "abc1234";
    expect(buildVersion()).toBe("abc1234");
    process.env.GIT_COMMIT_SHA = "def5678";
    expect(buildVersion()).toBe("def5678");
    process.env.VERCEL_GIT_COMMIT_SHA = "fed9999";
    expect(buildVersion()).toBe("fed9999");
  });
});
