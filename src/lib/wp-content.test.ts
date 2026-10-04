import { describe, expect, it } from "vitest";
import {
  MAX_CSS_CHARS,
  buildStyleBlock,
  sanitizeCss,
  stripActiveContent,
  stripMarkers,
  stripPreviousInjections,
  wrapPrototype,
} from "./wp-content";

describe("stripPreviousInjections", () => {
  it("round-trips a style block", () => {
    const page = "<p>hello</p>";
    expect(stripPreviousInjections(page + buildStyleBlock("a{b:c}", "abc12"))).toBe(page + "\n");
  });

  it("removes a prototype wrapper and legacy page-suffixed ids", () => {
    const proto = wrapPrototype("<html><body><h1>x</h1></body></html>", "m1x-42");
    expect(stripPreviousInjections(`before${proto}after`)).toBe("beforeafter");
  });

  it("does not swallow content between an orphan start marker and an unrelated end marker", () => {
    const orphan = "<!-- design-lab-style:aaa:start -->";
    const content = `${orphan}<p>customer content</p>${buildStyleBlock("x{}", "bbb")}<p>tail</p>`;
    const out = stripPreviousInjections(content);
    expect(out).toContain("<p>customer content</p>");
    expect(out).toContain("<p>tail</p>");
    expect(out).not.toContain("bbb");
  });

  it("does not let the id span markup", () => {
    const content = "<!-- design-lab-style:a --> keep <!-- x:start --> keep <!-- design-lab-style:a:end -->";
    expect(stripPreviousInjections(content)).toBe(content);
  });
});

describe("sanitizeCss", () => {
  it("passes ordinary CSS through and strips fake markers", () => {
    const r = sanitizeCss("h1{color:red}<!-- design-lab-style:x:end -->.a{b:c}");
    expect(r).toEqual({ ok: true, css: "h1{color:red}.a{b:c}" });
  });
  it.each(["a{}</style><script>alert(1)</script>", "a{}</STYLE >", "<script src=x>", "a{} --> b{}", "<!-- x"])("rejects %j", (css) => {
    expect(sanitizeCss(css).ok).toBe(false);
  });
  it("enforces the size cap", () => {
    expect(sanitizeCss("a".repeat(MAX_CSS_CHARS + 1)).ok).toBe(false);
  });
});

describe("stripActiveContent", () => {
  it("removes scripts, including unterminated and nested forms", () => {
    expect(stripActiveContent("<p>a</p><script>alert(1)</script><p>b</p>")).toBe("<p>a</p><p>b</p>");
    expect(stripActiveContent("<p>a</p><script>alert(1)")).toBe("<p>a</p>");
    expect(stripActiveContent("<scr<script></script>ipt>alert(1)</script>")).not.toMatch(/<script/i);
  });
  it("removes frames, inline handlers and javascript: URLs", () => {
    const out = stripActiveContent(
      `<iframe src="https://x"></iframe><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a><div onclick='f()'>y</div><img/onload=z()>`,
    );
    expect(out).not.toMatch(/iframe|onerror|onclick|onload|javascript:/i);
    expect(out).toContain("<a href=\"#\">x</a>");
  });
  it("leaves normal markup alone", () => {
    const html = `<section class="hero"><h1>Contact us on Monday</h1><a href="/about" data-x="1">About</a></section>`;
    expect(stripActiveContent(html)).toBe(html);
  });
});

describe("wrapPrototype", () => {
  const doc = `<!doctype html><html lang="he" dir="rtl"><head>
<style>:root{--a:1}body{margin:0}.x{color:red}</style>
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" onload="evil()">
</head><body class="b"><h1 onclick="x()">Hi</h1><script>steal()</script>
<!-- design-lab-style:zzz:end --></body></html>`;

  it("scopes CSS, drops scripts/handlers and forged markers, and stays strippable", () => {
    const out = wrapPrototype(doc, "id1", { bodyAttrs: true });
    expect(out).toContain(".design-lab-style-proto-id1");
    expect(out).toMatch(/dir="rtl"/);
    expect(out).not.toMatch(/steal|onclick|onload|zzz/);
    expect(out.match(/design-lab-style:[^ ]+:(start|end)/g)).toEqual(["design-lab-style:id1:start", "design-lab-style:id1:end"]);
    expect(stripPreviousInjections(`x${out}y`)).toBe("xy");
  });

  it("escapes body attributes", () => {
    const out = wrapPrototype(`<html><body data-a="1" class='"><img src=x>'>t</body></html>`, "id2", { bodyAttrs: true });
    expect(out).not.toMatch(/data-body-attrs="[^"]*<img/);
  });

  it("only adds data-body-attrs when asked", () => {
    expect(wrapPrototype(doc, "id3")).not.toContain("data-body-attrs");
  });
});

describe("stripMarkers", () => {
  it("removes marker comments only", () => {
    expect(stripMarkers("a<!-- design-lab-style:q:start -->b<!-- other -->c")).toBe("ab<!-- other -->c");
  });
});
