/**
 * Ideas Engine — deterministic audit / gap / generation.
 *
 * Everything here is a HEURISTIC over the curated inventory snapshot (declared
 * capabilities, snapshot age, static health label). Nothing is measured usage or
 * quality, and nothing is randomised: the same inventory and the same clock give
 * the same output, and two projects that differ only in name score the same.
 * (Until 2026-10-04 each score also added a hash of the project slug, which looked
 * like variance but carried no information, and the age maths were anchored to a
 * fixed date so freshness never decayed. Both are gone.)
 */
import type { FleetProject, DomainTag } from "./fleet";
import { FLEET_INVENTORY, ALL_DOMAINS, ALL_CAPABILITIES } from "./fleet";

/** Shown next to every score so nobody reads these as measurements. */
export const AUDIT_BASIS =
  "Heuristic: declared capabilities, inventory snapshot age and a static health label. Not measured usage or quality.";

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
/** Whole days between `iso` (YYYY-MM-DD or full ISO) and `now`. Unparseable dates count as 999. */
function daysSince(iso: string, now: number): number {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00Z").getTime();
  if (isNaN(d)) return 999;
  return Math.max(0, Math.round((now - d) / 86400000));
}

/**
 * How old the inventory snapshot is: the newest `updated` date in it, and its age
 * at `now`. The inventory is curated by hand, so this is the honest ceiling on how
 * fresh any freshness score can be.
 */
export function inventorySnapshot(inventory: FleetProject[], now: number = Date.now()): { latestUpdated: string | null; ageDays: number | null } {
  const dates = inventory.map((p) => p.updated).filter((u) => !isNaN(new Date(u.includes("T") ? u : u + "T00:00:00Z").getTime())).sort();
  const latest = dates.length ? dates[dates.length - 1] : null;
  return { latestUpdated: latest, ageDays: latest ? daysSince(latest, now) : null };
}

/** Heuristic scores, 0..100. See AUDIT_BASIS. */
export interface AuditScore {
  slug: string;
  name: string;
  coverage: number;
  freshness: number;
  usability: number;
  businessValue: number;
  overall: number;
  improvements: string[];
}

const IMPROVEMENT_POOL: Record<string, string> = {
  seo: "Add keyword-to-page mapping & SERP delta tracking",
  local: "Add NAP consistency checks (vault TBD — no invented data)",
  analytics: "Wire unified analytics events (GA4/GSC) with vault DSN TBD",
  automation: "Add n8n/webhook triggers for stale metrics",
  content: "Add content freshness decay & orphan scan",
  technical: "Add crawl budget & Core Web Vitals guard",
  outreach: "Add prospect scoring & reply prediction",
  design: "Adopt fleet design-tokens for chart parity",
  geo: "Add AI-overview citation tracking per geo prompt set",
  whm: "Add WHM/cPanel health & SSL expiry alerts (vault TBD)",
  competitor: "Add competitor gap table (share-of-voice vs top 3)",
  reporting: "Add scheduled PDF export with vault branding",
  "client-ops": "Add client portal SSO + task handoff log",
  stale: "Refresh stale data-source bindings (vault TBD)",
  degraded: "Investigate degraded health: uptime & error logs",
  alerts: "Add threshold alerts (Slack/email) via vault",
};

function scoreCoverage(pr: FleetProject): number {
  // Declared capabilities out of the tracked set: a count, not a measurement.
  const base = clamp((pr.capabilities.length / ALL_CAPABILITIES.length) * 60 + 30, 25, 96);
  const rare = pr.domains.some((d) => ["local","geo","whm"].includes(d)) ? 8 : 0;
  return clamp(Math.round(base + rare), 0, 100);
}
function scoreFreshness(pr: FleetProject, now: number): number {
  // Age of the last recorded update in the inventory snapshot, at `now`.
  const d = daysSince(pr.updated, now);
  if (d <= 2) return 95;
  if (d <= 7) return 80;
  if (d <= 14) return 60;
  if (d <= 30) return 40;
  return 20;
}
function scoreUsability(pr: FleetProject): number {
  const capScore = clamp((pr.capabilities.length / ALL_CAPABILITIES.length) * 60 + 20, 20, 90);
  const hasViz = (pr.capabilities as string[]).includes("visualization") ? 10 : 0;
  const hasAlerts = (pr.capabilities as string[]).includes("alerts") ? 5 : 0;
  return clamp(Math.round(capScore + hasViz + hasAlerts), 0, 100);
}
function scoreBusinessValue(pr: FleetProject): number {
  let base = 50;
  if (pr.domains.includes("reporting" as DomainTag)) base += 12;
  if ((pr.domains as string[]).includes("seo")) base += 10;
  if ((pr.domains as string[]).includes("analytics")) base += 8;
  if (pr.health === "healthy") base += 8;
  if (pr.health === "stale") base -= 12;
  if (pr.health === "degraded") base -= 6;
  return clamp(Math.round(base), 0, 100);
}
/**
 * Up to three suggestions, in priority order: the first domain's own item, a
 * health fix when the label says so, then generic items ONLY for capabilities
 * this project does not declare. (It used to pad every project with the same
 * three generic lines, in hash order, whether or not it already had them.)
 */
function pickImprovements(pr: FleetProject): string[] {
  const cand: string[] = [];
  const push = (v: string | undefined) => { if (v && !cand.includes(v)) cand.push(v); };
  for (const d of pr.domains.slice(0, 1)) push(IMPROVEMENT_POOL[d as string]);
  if (pr.health === "stale") push(IMPROVEMENT_POOL["stale"]);
  if (pr.health === "degraded") push(IMPROVEMENT_POOL["degraded"]);
  for (const k of ["alerts", "reporting", "automation"] as const) {
    if (!(pr.capabilities as string[]).includes(k)) push(IMPROVEMENT_POOL[k]);
  }
  return cand.slice(0, 3);
}

export function auditFleet(inventory: FleetProject[], now: number = Date.now()): AuditScore[] {
  return inventory.map((pr)=>{
    const coverage = scoreCoverage(pr);
    const freshness = scoreFreshness(pr, now);
    const usability = scoreUsability(pr);
    const businessValue = scoreBusinessValue(pr);
    const overall = Math.round((coverage+freshness+usability+businessValue)/4);
    return { slug: pr.slug, name: pr.name, coverage, freshness, usability, businessValue, overall, improvements: pickImprovements(pr) };
  });
}

export interface GapCell { domain: string; capability: string; count: number; coveragePct: number; }
export interface GapMatrix { domains: string[]; capabilities: string[]; cells: GapCell[]; weakest: GapCell[]; }

export function gapRadar(_audits: AuditScore[], inventory?: FleetProject[]): GapMatrix {
  const fleet = inventory ?? FLEET_INVENTORY;
  const total = fleet.length || 1;
  const caps = [...ALL_CAPABILITIES] as string[];
  const domains = [...ALL_DOMAINS] as string[];
  const cells: GapCell[] = [];
  for (const d of domains) {
    for (const c of caps) {
      const count = fleet.filter((pr)=> (pr.domains as string[]).includes(d) && (pr.capabilities as string[]).includes(c)).length;
      cells.push({ domain: d, capability: c, count, coveragePct: Math.round((count/total)*1000)/10 });
    }
  }
  const sorted = [...cells].sort((a,b)=> a.coveragePct - b.coveragePct || a.count - b.count);
  return { domains, capabilities: caps, cells, weakest: sorted.slice(0,5) };
}
export function gapRadarFromAudits(audits: AuditScore[]): GapMatrix { return gapRadar(audits, FLEET_INVENTORY); }

export type Effort = "S"|"M"|"L"|"XL";
export type Priority = "P0"|"P1"|"P2"|"P3";
export interface DashboardIdea {
  slug: string; title: string; whyNow: string; domains: DomainTag[]; dataSources: string[]; widgets: string[]; iaSketch: string[]; effort: Effort; priority: Priority;
}
const IDEA_POOL: Omit<DashboardIdea,"priority"|"effort">[] = [
  { slug:"local-geo-presence-radar", title:"Local Geo Presence Radar", whyNow:"Map-pack citations now surface differently in AI overviews", domains:["local","geo","seo"] as DomainTag[], dataSources:["TBD (vault: GBP API, geo prompt runner) — no invented NAP"], widgets:["Map pack share","Citation drift","Geo prompt visibility","NAP consistency"], iaSketch:["Overview","Map Grid","Citations","Geo Prompts","Alerts"] },
  { slug:"whm-fleet-health", title:"WHM Fleet Health", whyNow:"SSL/disk gaps are widest in fleet", domains:["whm","automation","reporting"] as DomainTag[], dataSources:["TBD (vault: WHM/cPanel UAPI) — no invented values"], widgets:["SSL expiry timeline","Disk/inode gauges","Account health","Auto-ticket log"], iaSketch:["Fleet Overview","Servers","Accounts","SSL & DNS","Automation"] },
  { slug:"competitor-share-of-voice", title:"Competitor Share-of-Voice Lab", whyNow:"SOV gaps drive content prioritization", domains:["competitor","seo","automation"] as DomainTag[], dataSources:["TBD (vault: SERP/backlink API) — verified only"], widgets:["SOV trend","Content gap matrix","Backlink delta","SERP features"], iaSketch:["Overview","SOV","Content Gaps","Backlinks","Actions"] },
  { slug:"geo-ai-visibility-ops", title:"GEO AI Visibility Ops", whyNow:"Generative results need dedicated tracking", domains:["geo","content","reporting"] as DomainTag[], dataSources:["TBD (vault: AI overview scraper) — no invented citations"], widgets:["AI hit-rate","Citation pie","Prompt coverage","Fix queue"], iaSketch:["Overview","Prompts","Citations","Queue","Reports"] },
  { slug:"client-ops-command", title:"Client Ops Command", whyNow:"Retention needs SLA visibility", domains:["client-ops","reporting","automation"] as DomainTag[], dataSources:["TBD (vault: CRM/ticketing) — no invented $"], widgets:["SLA burn-down","Task handoff","Client health","Escalation inbox"], iaSketch:["Portfolio","Client Detail","Tasks","SLA & Alerts","Reports"] },
  { slug:"content-decay-revival", title:"Content Decay & Revival Studio", whyNow:"Decay detection drives revival ROI", domains:["content","seo","automation"] as DomainTag[], dataSources:["TBD (vault: GSC/analytics) — verified only"], widgets:["Decay curve","Orphan pages","Link graph","Revival queue"], iaSketch:["Overview","Decay","Orphans","Queue","Publish Log"] },
  { slug:"automation-orchestrator", title:"Automation Orchestrator", whyNow:"Recipes need a visual canvas", domains:["automation","reporting","client-ops"] as DomainTag[], dataSources:["TBD (vault: n8n/webhooks)"], widgets:["Flow canvas","Run history","Error triage","Recipe gallery"], iaSketch:["Canvas","Runs","Errors","Recipes","Settings"] },
  { slug:"local-listings-ops", title:"Local Listings Ops", whyNow:"Listing drift hurts local packs", domains:["local","whm","reporting"] as DomainTag[], dataSources:["TBD (vault: GBP/listing aggregators) — no invented listings"], widgets:["Completeness","Duplicate detector","Photo queue","Review inbox"], iaSketch:["Overview","Listings","Duplicates","Media Queue","Inbox"] },
  { slug:"seo-forecast-lab", title:"SEO Forecast Lab", whyNow:"Scenario planning justifies content bets", domains:["seo","reporting","automation"] as DomainTag[], dataSources:["TBD (vault: GSC/rank) — historical only"], widgets:["Traffic forecast","Scenario slider","Keyword portfolio","Bet ledger"], iaSketch:["Forecast","Scenarios","Portfolio","Bets","Reports"] },
  { slug:"whm-security-posture", title:"WHM Security Posture", whyNow:"Posture drift is silent until breach", domains:["whm","automation","client-ops"] as DomainTag[], dataSources:["TBD (vault: WHM/Imunify/firewall)"], widgets:["Posture score","Patch queue","Malware log","Access anomalies"], iaSketch:["Score","Patches","Scans","Access","Runbook"] },
  { slug:"competitor-content-velocity", title:"Competitor Content Velocity", whyNow:"Velocity -> actionable cadence", domains:["competitor","content","reporting"] as DomainTag[], dataSources:["TBD (vault: crawl/sitemap watch)"], widgets:["Velocity chart","Topic bursts","Calendar overlay","Gap alerts"], iaSketch:["Velocity","Topics","Calendar","Gaps","Alerts"] },
  { slug:"reporting-white-label-studio", title:"Reporting White-Label Studio", whyNow:"White-label cadence without manual decks", domains:["reporting","client-ops","seo"] as DomainTag[], dataSources:["TBD (vault: templates/brand kit)"], widgets:["Template gallery","Schedule board","Brand kit","Delivery log"], iaSketch:["Templates","Schedules","Brand","Deliveries","Settings"] },
  { slug:"geo-local-bridge", title:"Geo-Local Bridge (backup)", whyNow:"Triple gap geo x local x automation", domains:["geo","local","automation"] as DomainTag[], dataSources:["TBD (vault: geo prompts + GBP)"], widgets:["Geo vs local delta","Prompt-to-pack correlation","Action queue"], iaSketch:["Overview","Delta","Prompts","Actions"] },
  { slug:"whm-automation-runbook", title:"WHM Automation Runbook (backup)", whyNow:"Covers whm x automation x alerts", domains:["whm","automation","reporting"] as DomainTag[], dataSources:["TBD (vault: WHM + n8n)"], widgets:["Runbook list","Execution log","Alert routing"], iaSketch:["Runbooks","Executions","Alerts"] },
];
/**
 * Rough size from the idea's own shape: more domains to join, a data source that
 * still needs wiring (anything marked TBD) and a wide widget set all add work.
 * An estimate, not a plan. (It used to be a hash of the slug, i.e. random.)
 */
function effortFor(idea: Omit<DashboardIdea, "priority" | "effort">): Effort {
  const points = idea.domains.length + (idea.dataSources.some((d) => /TBD/i.test(d)) ? 1 : 0) + (idea.widgets.length > 4 ? 1 : 0);
  return points <= 2 ? "S" : points === 3 ? "M" : points === 4 ? "L" : "XL";
}
const bySlug = (a: { slug: string }, b: { slug: string }) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
function priorityFor(idx:number): Priority { if(idx<3) return "P0"; if(idx<6) return "P1"; if(idx<10) return "P2"; return "P3"; }
export function generateIdeas(gaps: GapMatrix|null, inventory: FleetProject[]): DashboardIdea[] {
  const existing = new Set(inventory.map((pr)=>pr.slug));
  const available = IDEA_POOL.filter((i)=> !existing.has(i.slug));
  const ranked = [...available];
  if (gaps && gaps.weakest.length) {
    const weak = new Set(gaps.weakest.map((c)=> c.domain));
    ranked.sort((a,b)=>{
      const ah = a.domains.filter((d)=> weak.has(d as string)).length;
      const bh = b.domains.filter((d)=> weak.has(d as string)).length;
      if(bh!==ah) return bh-ah;
      return bySlug(a, b);
    });
  } else ranked.sort(bySlug);
  return ranked.slice(0,12).map((idea,idx)=> ({...idea, effort: effortFor(idea), priority: priorityFor(idx)}));
}
export function runFullPipeline(inventory: FleetProject[]) {
  const audits = auditFleet(inventory);
  const gaps = gapRadar(audits, inventory);
  const ideas = generateIdeas(gaps, inventory);
  return { audits, gaps, ideas };
}
