import { describe, expect, it, vi } from "vitest";
import { redact, reportError, withErrorReporting } from "./observability";

/**
 * A log line is a durable copy, so the redactor is the part that matters most
 * here. These tests exist to stop a future "just log the whole error object"
 * from putting a token in the log stream.
 */
describe("redact", () => {
  it("removes bearer tokens and long key-shaped strings", () => {
    // Built at runtime from harmless parts. A literal token-shaped string here
    // trips every secret scanner forever, and a scanner that cries wolf on its
    // own test fixtures gets ignored.
    const fake = ["NOT", "A", "REAL", "TOKEN"].join("_") + "_0123456789012345";
    const out = redact(`failed with Authorization: Bearer ${fake}`);
    expect(out).not.toContain(fake);
    expect(out).toContain("[redacted]");
  });

  it("removes our own app tokens", () => {
    expect(redact("token fil_AbCd1234EfGh5678 rejected")).not.toContain("fil_AbCd1234EfGh5678");
  });

  it("removes JWTs", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc";
    expect(redact(`supabase said ${jwt}`)).not.toContain(jwt);
  });

  it("removes labelled secrets", () => {
    for (const s of ["password=hunter2", 'apiKey: "sk-live-xyz"', "secret=topsecret"]) {
      expect(redact(s), s).toContain("[redacted]");
    }
  });

  it("keeps an ordinary message readable", () => {
    expect(redact("probe timed out after 8000ms")).toBe("probe timed out after 8000ms");
  });

  it("caps the length so one error cannot flood the log", () => {
    expect(redact("x".repeat(5000)).length).toBeLessThanOrEqual(500);
  });
});

describe("reportError", () => {
  it("writes one JSON line with the route and no raw secret", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportError(new Error("bad token fil_SuperSecretValue12345"), {
      route: "/api/fleet/probe",
      meta: { targets: 38 },
    });
    expect(spy).toHaveBeenCalledOnce();
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line.route).toBe("/api/fleet/probe");
    expect(line.source).toBe("fleet-ideas-lab");
    expect(line.targets).toBe(38);
    expect(JSON.stringify(line)).not.toContain("fil_SuperSecretValue12345");
    spy.mockRestore();
  });

  it("never throws, whatever it is handed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => reportError("a string", { route: "/x" })).not.toThrow();
    expect(() => reportError(null, { route: "/x" })).not.toThrow();
    expect(() => reportError({ weird: true }, { route: "/x" })).not.toThrow();
    spy.mockRestore();
  });
});

describe("withErrorReporting", () => {
  it("passes a successful response through untouched", async () => {
    const handler = withErrorReporting("/api/test", async () => Response.json({ ok: true }));
    const res = await handler();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("turns a throw into a clean 500 with no stack on the wire", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrorReporting("/api/test", async () => {
      throw new Error("database on fire at /var/lib/pg with token fil_abc123456789012345678");
    });
    const res = await handler();
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toBe(JSON.stringify({ error: "Internal error" }));
    expect(body).not.toContain("database on fire");
    spy.mockRestore();
  });
});
