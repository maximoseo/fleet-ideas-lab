import { beforeEach, describe, expect, it } from "vitest";
import { appTokenMatches, appTokenRotationPending, appTokens } from "./appToken";

/**
 * The rotation window is the point of this module: while both tokens are set,
 * a phone on the old build and a phone on the new one must BOTH work. Getting
 * this wrong is silent — the app just falls back to cached data.
 */
beforeEach(() => {
  delete process.env.APP_TOKEN;
  delete process.env.APP_TOKEN_PREVIOUS;
});

describe("appTokens", () => {
  it("is empty when nothing is configured", () => {
    expect(appTokens()).toEqual([]);
    expect(appTokenMatches("anything")).toBe(false);
  });

  it("accepts only the current token when no rotation is in flight", () => {
    process.env.APP_TOKEN = "current-token";
    expect(appTokens()).toEqual(["current-token"]);
    expect(appTokenMatches("current-token")).toBe(true);
    expect(appTokenMatches("old-token")).toBe(false);
    expect(appTokenRotationPending()).toBe(false);
  });

  it("accepts both tokens during a rotation", () => {
    process.env.APP_TOKEN = "current-token";
    process.env.APP_TOKEN_PREVIOUS = "old-token";
    expect(appTokenMatches("current-token")).toBe(true);
    expect(appTokenMatches("old-token")).toBe(true);
    expect(appTokenMatches("some-other-token")).toBe(false);
    expect(appTokenRotationPending()).toBe(true);
  });

  it("does not report a rotation when both variables hold the same value", () => {
    process.env.APP_TOKEN = "same";
    process.env.APP_TOKEN_PREVIOUS = "same";
    expect(appTokens()).toEqual(["same"]);
    expect(appTokenRotationPending()).toBe(false);
  });

  it("rejects empty and whitespace input", () => {
    process.env.APP_TOKEN = "current-token";
    expect(appTokenMatches("")).toBe(false);
    expect(appTokenMatches("   ")).toBe(false);
    expect(appTokenMatches(null)).toBe(false);
    expect(appTokenMatches(undefined)).toBe(false);
  });

  it("rejects a prefix of the real token", () => {
    process.env.APP_TOKEN = "current-token";
    expect(appTokenMatches("current")).toBe(false);
    expect(appTokenMatches("current-token-extra")).toBe(false);
  });

  it("ignores an empty APP_TOKEN_PREVIOUS instead of accepting empty input", () => {
    process.env.APP_TOKEN = "current-token";
    process.env.APP_TOKEN_PREVIOUS = "";
    expect(appTokens()).toEqual(["current-token"]);
    expect(appTokenMatches("")).toBe(false);
  });
});
