import type { ProfileSection } from "../types";
import { decode, isNoise, sanitizeHtml, stripTags, textOf } from "./html";

function extractImages(block: string, limit = 8): { src: string; alt: string }[] {
  const out: { src: string; alt: string }[] = [];
  for (const m of block.matchAll(/<img[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1] || "";
    if (!src || src.startsWith("data:") || out.some((x) => x.src === src)) continue;
    const alt = decode(tag.match(/alt=["']([^"']*)["']/i)?.[1] || "").trim();
    if (src.length > 4) out.push({ src, alt });
    if (out.length >= limit) break;
  }
  return out;
}

function extractButtons(block: string, limit = 10): { label: string; href?: string }[] {
  const out: { label: string; href?: string }[] = [];
  const pushBtn = (label: string, href?: string) => {
    const t = decode(stripTags(label)).trim();
    if (t && t.length >= 2 && t.length <= 50 && !isNoise(t) && !out.some((x) => x.label === t)) {
      out.push({ label: t, href });
    }
  };
  for (const m of block.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]{1,80}?)<\/a>/gi)) {
    const cls = m[0].match(/class=["'][^"']*["']/i)?.[0] || "";
    if (/btn|button|cta|primary/i.test(cls)) pushBtn(m[2], m[1]);
    if (out.length >= limit) break;
  }
  for (const m of block.matchAll(/<button[^>]*>([\s\S]{1,80}?)<\/button>/gi)) {
    pushBtn(m[1]);
    if (out.length >= limit) break;
  }
  if (out.length === 0) {
    for (const m of block.matchAll(/<a[^>]*>([\s\S]{1,40}?)<\/a>/gi)) {
      const t = decode(stripTags(m[1])).trim();
      if (t.length >= 2 && t.length <= 30 && !isNoise(t) && !out.some((x) => x.label === t)) out.push({ label: t });
      if (out.length >= 3) break;
    }
  }
  return out.slice(0, limit);
}

function extractFormFields(block: string): string[] {
  const fields: string[] = [];
  for (const m of block.matchAll(/<(input|select|textarea)[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/(?:name|id|placeholder|aria-label)=["']([^"']+)["']/i)?.[1] || m[1];
    const decoded = decode(name).trim();
    if (decoded && !fields.includes(decoded)) fields.push(decoded);
    if (fields.length >= 10) break;
  }
  for (const m of block.matchAll(/<label[^>]*>([\s\S]{1,60}?)<\/label>/gi)) {
    const t = decode(stripTags(m[1])).trim();
    if (t && t.length >= 2 && t.length <= 40 && !fields.includes(t)) fields.push(t);
    if (fields.length >= 10) break;
  }
  return fields;
}

function sectionHeadingCandidates(block: string): string[] {
  return [...textOf(block, "h1", 2), ...textOf(block, "h2", 4), ...textOf(block, "h3", 4)].slice(0, 6);
}

type SectionKind = ProfileSection["type"];

function classifyBlock(tag: string, classAttr: string, inner: string): SectionKind | null {
  const cls = classAttr.toLowerCase();
  const innerLower = inner.slice(0, 2000).toLowerCase();
  if (tag === "nav") return "nav";
  if (tag === "footer") return "footer";
  if (tag === "header" || /hero|banner|masthead|jumbotron/.test(cls)) return "hero";
  if (/testimonial|review|quote|feedback/.test(cls) || /testimonial|review/.test(innerLower)) return "testimonials";
  if (/pricing|price|plan|package|tier/.test(cls)) return "pricing";
  if (/gallery|portfolio|showcase/.test(cls) && /<img/i.test(inner)) return "gallery";
  if (/feature|service|benefit|offering/.test(cls)) return "features";
  if (/<form/i.test(inner) || /cta|call-to-action|newsletter|subscribe|contact/.test(cls)) return "cta";
  return null;
}

/**
 * Real section extraction (P0.2).
 * Detects hero/nav/features/testimonials/pricing/cta/footer/gallery/content by
 * semantic tags + class heuristics + heading content, in document order.
 * Returns DetectedSection with real headings/images/buttons/forms + raw HTML snippet.
 */
export function detectSections(rawHtml: string): ProfileSection[] {
  const html = rawHtml;
  const sanitized = sanitizeHtml(rawHtml);

  type Candidate = { index: number; tag: string; cls: string; inner: string; full: string };
  const candidates: Candidate[] = [];

  const blockRe = /<(nav|header|footer|section|aside|form)([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const m of html.matchAll(blockRe)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || "";
    const cls = attrs.match(/class=["']([^"']*)["']/i)?.[1] || "";
    const inner = m[3] || "";
    if (inner.length < 30) continue;
    candidates.push({ index: m.index ?? 0, tag, cls, inner, full: m[0] });
  }
  for (const m of html.matchAll(/<div[^>]*class=["']([^"']*)["'][^>]*>([\s\S]{0,6000}?)<\/div>/gi)) {
    const cls = m[1];
    if (!/(hero|banner|masthead|feature|service|benefit|testimonial|review|pricing|price|plan|gallery|portfolio|cta|call-to-action|content|about|team)/i.test(cls)) continue;
    const inner = m[2];
    if (inner.length < 40) continue;
    candidates.push({ index: m.index ?? 0, tag: "div", cls, inner, full: m[0] });
  }

  candidates.sort((a, b) => a.index - b.index);

  const deduped: Candidate[] = [];
  for (const c of candidates) {
    if (deduped.length && Math.abs(c.index - deduped[deduped.length - 1].index) < 200) continue;
    deduped.push(c);
  }

  const sections: ProfileSection[] = [];
  const seenTypes = new Set<string>();

  for (const c of deduped) {
    let kind = classifyBlock(c.tag, c.cls, c.inner);
    if (!kind && c.tag === "section") {
      const h = sectionHeadingCandidates(c.inner);
      if (h.length) kind = "content";
      else if (/<form/i.test(c.inner)) kind = "cta";
      else kind = "content";
    }
    if (!kind) continue;
    if ((kind === "nav" || kind === "footer" || kind === "hero") && seenTypes.has(kind)) continue;
    seenTypes.add(kind);

    const headings = sectionHeadingCandidates(c.inner);
    const paragraphs = textOf(c.inner, "p", 4).filter((p) => p.length > 20);
    const images = extractImages(c.inner, 6);
    const buttons = extractButtons(c.inner, 6);
    const formFields = /<form/i.test(c.inner) ? extractFormFields(c.inner) : [];
    const hasForm = formFields.length > 0 || /<form/i.test(c.inner);
    const rawSnippet = c.full.slice(0, 3000);

    const labelMap: Record<string, string> = {
      nav: "Navigation", hero: "Hero", features: "Features / Services", testimonials: "Testimonials",
      pricing: "Pricing", cta: "Call to Action", gallery: "Gallery", content: "Content", footer: "Footer",
    };

    sections.push({
      type: kind,
      label: labelMap[kind] || kind,
      order: sections.length,
      headings,
      paragraphs,
      images,
      buttons,
      formFields,
      hasImage: images.length > 0,
      hasButton: buttons.length > 0,
      hasForm,
      rawHtml: rawSnippet,
    });
  }

  if (sections.length < 2) {
    const h1 = decode(stripTags(html.match(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i)?.[1] || ""));
    const sanitizedHeadings = textOf(sanitized, "h2", 4);
    const imgs = extractImages(sanitized, 4);
    const btns = extractButtons(sanitized, 4);
    const paras = textOf(sanitized, "p", 4).filter((p) => p.length > 20);
    if (!seenTypes.has("hero") && /<h1/i.test(html)) {
      sections.unshift({
        type: "hero", label: "Hero", order: 0,
        headings: h1 ? [h1] : sanitizedHeadings.slice(0, 1),
        paragraphs: paras.slice(0, 1),
        images: imgs.slice(0, 1),
        buttons: btns.slice(0, 2),
        formFields: [],
        hasImage: imgs.length > 0, hasButton: btns.length > 0, hasForm: false,
        rawHtml: html.slice(0, 3000),
      });
    }
    if (sections.length < 2) {
      sections.push({
        type: "content", label: "Main content", order: sections.length,
        headings: sanitizedHeadings, paragraphs: paras,
        images: imgs, buttons: [], formFields: [],
        hasImage: imgs.length > 0, hasButton: false, hasForm: false,
        rawHtml: sanitized.slice(0, 3000),
      });
    }
    sections.forEach((s, i) => (s.order = i));
  } else {
    sections.forEach((s, i) => (s.order = i));
  }

  if (!seenTypes.has("footer") && /<footer/i.test(html)) {
    const footInner = html.match(/<footer[^>]*>([\s\S]{0,4000}?)<\/footer>/i)?.[1] || "";
    sections.push({
      type: "footer", label: "Footer", order: sections.length,
      headings: sectionHeadingCandidates(footInner),
      paragraphs: [],
      images: extractImages(footInner, 2),
      buttons: extractButtons(footInner, 3),
      formFields: [],
      hasImage: false, hasButton: false, hasForm: false,
      rawHtml: footInner.slice(0, 2000),
    });
  }

  return sections;
}
