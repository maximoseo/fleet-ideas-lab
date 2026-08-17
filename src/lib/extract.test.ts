import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  extractColorsFromHtml,
  extractCopy,
  extractFontsFromHtml,
  sanitizeHtml,
} from "./extract";

/**
 * extract.ts is the most logic-dense file in the app and had no coverage at
 * all. sanitizeHtml in particular decides what crawled third-party markup gets
 * carried into a generated prototype.
 *
 * Note the honest limit asserted below: this is a regex stripper for COPY
 * extraction, not an XSS sanitiser. It removes whole script/style/iframe
 * blocks; it does not neutralise an inline event handler on a surviving tag.
 * Rendering its output as HTML would be unsafe, and the tests say so out loud
 * rather than implying a guarantee the function does not make.
 */
describe("sanitizeHtml", () => {
  it("removes script blocks and their contents", () => {
    const out = sanitizeHtml('<p>keep</p><script>alert("x")</script>');
    expect(out).not.toContain("alert");
    expect(out).toContain("keep");
  });

  it("removes style, noscript, template, svg and iframe blocks", () => {
    const out = sanitizeHtml(
      "<style>.a{}</style><noscript>n</noscript><template>t</template><svg><path/></svg><iframe src='x'>i</iframe><p>keep</p>",
    );
    for (const gone of [".a{}", ">n<", ">t<", "<path", "iframe"]) {
      expect(out).not.toContain(gone);
    }
    expect(out).toContain("keep");
  });

  it("removes a self-closing iframe with no closing tag", () => {
    expect(sanitizeHtml('<iframe src="https://evil.test">')).not.toContain("iframe");
  });

  it("handles uppercase tags", () => {
    expect(sanitizeHtml("<SCRIPT>alert(1)</SCRIPT>")).not.toContain("alert");
  });

  it("drops content hidden from users", () => {
    const out = sanitizeHtml('<div aria-hidden="true"><span>hidden words</span></div><p>shown</p>');
    expect(out).not.toContain("hidden words");
    expect(out).toContain("shown");
  });

  it("is a copy stripper, not an XSS sanitiser — documented, not a guarantee", () => {
    // Inline handlers survive by design. Anything rendering this must escape it.
    expect(sanitizeHtml('<img src=x onerror="alert(1)">')).toContain("onerror");
  });

  it("leaves ordinary markup alone", () => {
    const html = "<h1>Title</h1><p>Body text</p>";
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe("extractCopy", () => {
  it("pulls the real headings out of a page", () => {
    const html = `
      <html><head><title>Acme Plumbing</title></head><body>
        <h1>Emergency plumbing in Haifa</h1>
        <h2>Same-day callouts</h2>
        <p>We fix burst pipes fast.</p>
      </body></html>`;
    const copy = extractCopy(html, "https://acme.test");
    const blob = JSON.stringify(copy);
    expect(blob).toContain("Emergency plumbing in Haifa");
  });

  it("does not invent copy for an empty document", () => {
    const copy = extractCopy("<html><body></body></html>", "https://empty.test");
    const values = JSON.stringify(copy).toLowerCase();
    expect(values).not.toContain("lorem ipsum");
  });

  it("decodes entities instead of leaving raw markers", () => {
    const copy = extractCopy("<h1>Tom &amp; Jerry&hellip;</h1>", "https://e.test");
    const blob = JSON.stringify(copy);
    expect(blob).not.toContain("&amp;");
    expect(blob).not.toContain("&hellip;");
  });

  it("skips third-party widget noise", () => {
    const copy = extractCopy(
      "<h2>reCAPTCHA</h2><h2>Skip to main content</h2><h1>Real heading</h1>",
      "https://n.test",
    );
    const blob = JSON.stringify(copy);
    expect(blob).toContain("Real heading");
    expect(blob.toLowerCase()).not.toContain("skip to main content");
  });
});

describe("colour and font extraction", () => {
  it("finds hex colours and returns them without duplicates", () => {
    const colors = extractColorsFromHtml(
      "<style>a{color:#7C3AED}b{color:#7c3aed}c{background:#FFFFFF}</style>",
    );
    expect(colors.length).toBeGreaterThan(0);
    expect(new Set(colors.map((c) => c.toLowerCase())).size).toBe(colors.length);
  });

  it("returns an empty list rather than throwing on empty input", () => {
    expect(extractColorsFromHtml("")).toEqual([]);
    expect(extractFontsFromHtml("")).toEqual([]);
  });

  it("finds an unquoted font family declaration", () => {
    const fonts = extractFontsFromHtml("<style>body{font-family:Heebo,sans-serif}</style>");
    expect(fonts.join(" ").toLowerCase()).toContain("heebo");
  });

  it("finds a QUOTED font family — the regression this test was written for", () => {
    // Any family name with a space is quoted in real CSS. The old pattern
    // excluded the quote character from the capture, so the match failed and
    // the font disappeared with no error anywhere.
    const fonts = extractFontsFromHtml('<style>body{font-family:"Heebo",sans-serif}</style>');
    expect(fonts.join(" ").toLowerCase()).toContain("heebo");

    const spaced = extractFontsFromHtml(
      "<style>h1{font-family:'Helvetica Neue', Arial, sans-serif}</style>",
    );
    expect(spaced.join(" ")).toContain("Helvetica Neue");
  });

  it("finds a Google Fonts link", () => {
    const fonts = extractFontsFromHtml(
      '<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;700">',
    );
    expect(fonts.join(" ")).toContain("Rubik");
  });
});

describe("detectPlatform", () => {
  it("recognises WordPress from its markup", () => {
    const out = detectPlatform('<link href="/wp-content/themes/x/style.css">');
    expect(out.platform.toLowerCase()).toContain("wordpress");
  });

  it("does not guess on a plain page", () => {
    const out = detectPlatform("<html><body><p>hello</p></body></html>");
    expect(out.platform).toBeTruthy();
    expect(out.platform.toLowerCase()).not.toContain("wordpress");
  });
});
