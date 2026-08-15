/** Unified fleet lib — supports engine (audit/gaps) + Web UI (inventory/ideas) */
export type FleetDomain =
  | "seo"
  | "content"
  | "local"
  | "analytics"
  | "automation"
  | "design"
  | "outreach"
  | "technical";

// Engine domains (superset)
export type DomainTag =
  | FleetDomain
  | "geo"
  | "whm"
  | "competitor"
  | "reporting"
  | "client-ops";

export type Capability = "analytics" | "alerts" | "automation" | "reporting" | "visualization" | "seo" | "local" | "geo" | "whm" | "competitor" | "content" | "automation_cap" | "reporting_cap";

export const ALL_DOMAINS: DomainTag[] = ["seo", "content", "local", "analytics", "automation", "design", "outreach", "technical", "geo", "whm", "competitor", "reporting", "client-ops"];
export const ALL_CAPABILITIES: Capability[] = ["analytics", "alerts", "automation", "reporting", "visualization"];

export const DOMAIN_LABEL: Record<string, string> = {
  seo: "SEO", content: "Content", local: "Local", analytics: "Analytics", automation: "Automation", design: "Design", outreach: "Outreach", technical: "Technical",
  geo: "GEO", whm: "WHM", competitor: "Competitor", reporting: "Reporting", "client-ops": "Client Ops",
};
export const DOMAIN_COLOR: Record<string, string> = {
  seo: "#a78bfa", content: "#34d399", local: "#fbbf24", analytics: "#60a5fa", automation: "#f472b6", design: "#c084fc", outreach: "#fb923c", technical: "#94a3b8",
  geo: "#22d3ee", whm: "#a3a3a3", competitor: "#f87171", reporting: "#818cf8", "client-ops": "#facc15",
};

// Engine FleetProject shape
export interface FleetProject {
  slug: string;
  name: string;
  domains: DomainTag[];
  capabilities: Capability[];
  health: "healthy" | "stale" | "degraded" | "unknown";
  updated: string; // YYYY-MM-DD
  url?: string;
  description?: string;
}

// Engine inventory — deterministic, used by audit/gaps/ideas
export const FLEET_INVENTORY: FleetProject[] = [
  { slug: "site-intel-dashboard", name: "Site Intel Dashboard", domains: ["seo", "reporting"], capabilities: ["analytics", "reporting", "visualization"], health: "healthy", updated: "2026-08-08", url: "https://site-intel.maximo-seo.ai", description: "Core SEO intelligence — crawl, index, and SERP tracking." },
  { slug: "content-forge", name: "Content Forge", domains: ["content", "seo"], capabilities: ["analytics", "automation", "visualization"], health: "healthy", updated: "2026-08-07", url: "https://content-forge.maximo-seo.ai", description: "AI content engine — briefs, drafts, and optimization." },
  { slug: "local-rank-lab", name: "Local Rank Lab", domains: ["local", "seo"], capabilities: ["analytics", "reporting", "visualization"], health: "healthy", updated: "2026-08-09", url: "https://local-rank.maximo-seo.ai", description: "GBP & local pack tracking with competitor gap analysis." },
  { slug: "analytics-hub", name: "Analytics Hub", domains: ["analytics", "reporting"], capabilities: ["analytics", "visualization", "alerts"], health: "healthy", updated: "2026-08-05", url: "https://analytics.maximo-seo.ai", description: "Unified GA4 + GSC + rank data with anomaly detection." },
  { slug: "auto-ops", name: "Auto Ops", domains: ["automation", "reporting"], capabilities: ["automation", "alerts", "analytics"], health: "healthy", updated: "2026-08-09", url: "https://ops.maximo-seo.ai", description: "n8n orchestration — cron, webhooks, and fleet sync." },
  { slug: "design-lab", name: "Design Lab", domains: ["design", "reporting"], capabilities: ["visualization", "reporting", "analytics"], health: "healthy", updated: "2026-08-09", url: "https://design-lab.maximo-seo.ai", description: "Premium redesign lab — Style Arena, Slop Detector, mockups." },
  { slug: "outreach-pulse", name: "Outreach Pulse", domains: ["competitor", "seo"], capabilities: ["analytics", "alerts"], health: "degraded", updated: "2026-07-28", url: "https://outreach.maximo-seo.ai", description: "Link prospecting and outreach pipeline with inbox sync." },
  { slug: "tech-audit-pro", name: "Tech Audit Pro", domains: ["seo", "technical"], capabilities: ["analytics", "reporting", "visualization"], health: "healthy", updated: "2026-08-04", url: "https://tech-audit.maximo-seo.ai", description: "Lighthouse + crawl + schema validation suite." },
  { slug: "keyword-atlas", name: "Keyword Atlas", domains: ["seo", "content"], capabilities: ["analytics", "visualization"], health: "stale", updated: "2026-07-20", url: "https://keyword-atlas.maximo-seo.ai", description: "Keyword clustering and intent mapping at scale." },
  { slug: "fleet-ideas-lab", name: "Fleet Ideas Lab", domains: ["automation", "reporting", "client-ops"], capabilities: ["analytics", "visualization", "reporting"], health: "healthy", updated: "2026-08-09", url: "https://fleet-ideas-lab.maximo-seo.ai", description: "This app — fleet inventory, gap radar & idea engine." },
  { slug: "rank-tracker-lite", name: "Rank Tracker Lite", domains: ["seo"], capabilities: ["analytics", "alerts"], health: "stale", updated: "2026-07-15", url: "https://rank-lite.maximo-seo.ai", description: "Lightweight daily rank tracker for SMB quick wins." },
  { slug: "review-engine", name: "Review Engine", domains: ["local", "client-ops"], capabilities: ["automation", "alerts"], health: "degraded", updated: "2026-07-30", url: "https://reviews.maximo-seo.ai", description: "Review request automation + sentiment + response drafts." },
];

export function getSlugs(): Set<string> {
  return new Set(FLEET_INVENTORY.map((p) => p.slug));
}

// ── Web UI extensions (numeric health, status, FleetDomain single) ──
export type FleetStatus = "live" | "beta" | "build" | "concept";
export type HealthLevel = "excellent" | "good" | "needs-attention" | "critical";
export function healthLevel(h: number): HealthLevel {
  if (h >= 85) return "excellent";
  if (h >= 65) return "good";
  if (h >= 45) return "needs-attention";
  return "critical";
}
export const HEALTH_COLOR: Record<HealthLevel, string> = {
  excellent: "#34d399", good: "#60a5fa", "needs-attention": "#fbbf24", critical: "#f87171",
};

export interface FleetProjectUI {
  id: string; slug: string; name: string; domain: FleetDomain; status: FleetStatus; health: number; lastDeploy: string; url: string; description: string; capabilities: string[];
}

function toHealthNum(h: FleetProject["health"], updated: string): number {
  const base = h === "healthy" ? 86 : h === "degraded" ? 60 : h === "stale" ? 42 : 50;
  const hash = [...updated].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
  return Math.min(98, Math.max(28, base + (hash % 12) - 6));
}
function toStatus(h: FleetProject["health"], idx: number): FleetStatus {
  if (h === "healthy" && idx < 6) return "live";
  if (h === "healthy") return "beta";
  if (h === "degraded") return idx % 2 === 0 ? "beta" : "build";
  return idx % 2 === 0 ? "build" : "concept";
}
function primaryDomain(d: DomainTag[]): FleetDomain {
  const map: Record<string, FleetDomain> = { seo: "seo", content: "content", local: "local", analytics: "analytics", automation: "automation", design: "design", competitor: "outreach", technical: "technical", geo: "local", whm: "technical", reporting: "analytics", "client-ops": "automation" };
  for (const x of d) if (map[x]) return map[x];
  return "seo";
}

export const FLEET_PROJECTS: FleetProjectUI[] = FLEET_INVENTORY.map((p, i) => ({
  id: String(i + 1), slug: p.slug, name: p.name, domain: primaryDomain(p.domains),
  status: toStatus(p.health, i), health: toHealthNum(p.health, p.updated),
  lastDeploy: p.updated + "T10:00:00Z", url: p.url || `https://${p.slug}.maximo-seo.ai`, description: p.description || "", capabilities: p.capabilities,
}));

// Alias for capabilities matrix
export const CAPABILITIES = ALL_CAPABILITIES;
export type CapabilityUI = Capability;

// ── Ideas (UI shape, 12 ideas) ──
export type Effort = "S" | "M" | "L" | "XL";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Impact = "high" | "medium" | "low";
export type IdeaStatus = "new" | "scoped" | "backlog" | "shipped";
export interface FleetIdea {
  id: string; title: string; slug: string; domain: FleetDomain; whyNow: string; widgets: string[]; effort: Effort; priority: Priority; impact: Impact; status: IdeaStatus; dashboardUrl?: string; prompt: string; description: string;
}
export const FLEET_IDEAS: FleetIdea[] = [
  { id: "idea-1", title: "SERP Volatility War Room", slug: "serp-volatility-war-room", domain: "seo", whyNow: "August core update spiked volatility — clients need real-time triage.", widgets: ["Volatility Index", "Winners/Losers", "SERP Features", "Alert Feed"], effort: "M", priority: "P0", impact: "high", status: "new", dashboardUrl: "https://site-intel.maximo-seo.ai/serp", description: "Live SERP volatility dashboard with anomaly alerts and affected URL drill-down.", prompt: "Build SERP Volatility War Room: real-time volatility index, winners/losers table, SERP feature share, alert feed. Data: GSC + third-party SERP API. Violet theme, 48dp targets." },
  { id: "idea-2", title: "Content Decay Radar", slug: "content-decay-radar", domain: "content", whyNow: "30% of blog traffic decays after 6mo — proactive refresh gap.", widgets: ["Decay Score", "Traffic Trend", "Refresh Queue", "Brief Generator"], effort: "M", priority: "P0", impact: "high", status: "scoped", dashboardUrl: "https://content-forge.maximo-seo.ai/decay", description: "Detects decaying content, scores decay risk, queues refresh briefs.", prompt: "Build Content Decay Radar: decay score (traffic vs age), 90-day trend chart, refresh queue with one-click brief generation. Integrate GSC + CMS." },
  { id: "idea-3", title: "GBP Health Monitor", slug: "gbp-health-monitor", domain: "local", whyNow: "GBP suspensions up 40% YoY — early warning prevents revenue loss.", widgets: ["Suspension Risk", "Listing Completeness", "Photo Freshness", "Review Velocity"], effort: "S", priority: "P0", impact: "high", status: "new", dashboardUrl: "https://local-rank.maximo-seo.ai/health", description: "GBP listing health scoring with suspension risk and completeness checks.", prompt: "Build GBP Health Monitor: completeness checklist, suspension risk score, photo freshness, review velocity chart. Pull GBP API daily." },
  { id: "idea-4", title: "Anomaly Explain Engine", slug: "anomaly-explain-engine", domain: "analytics", whyNow: "Clients ignore alerts they don't understand — explainability gap.", widgets: ["Anomaly Timeline", "Root Cause", "Impact Estimate", "Suggested Action"], effort: "L", priority: "P1", impact: "high", status: "new", description: "Turns GA4/GSC anomalies into plain-English explanations with impact and fix.", prompt: "Build Anomaly Explain Engine: timeline of anomalies, LLM root-cause, estimated traffic/revenue impact, one-click action. Use GA4 + GSC anomalies." },
  { id: "idea-5", title: "Outreach Inbox Commander", slug: "outreach-inbox-commander", domain: "outreach", whyNow: "Link builders lose 20% replies in Gmail noise — dedicated inbox needed.", widgets: ["Thread List", "Reply Score", "Follow-up Timer", "Template Inject"], effort: "M", priority: "P1", impact: "medium", status: "backlog", dashboardUrl: "https://outreach.maximo-seo.ai/inbox", description: "Gmail-synced outreach inbox with reply prediction and auto follow-ups.", prompt: "Build Outreach Inbox Commander: thread list with reply-likelihood score, follow-up timer, template insertion. Sync Gmail API." },
  { id: "idea-6", title: "Schema Studio", slug: "schema-studio", domain: "technical", whyNow: "Rich result eligibility drives CTR — schema errors are invisible revenue leaks.", widgets: ["Schema Validator", "Rich Result Preview", "Coverage Map", "Fix Diff"], effort: "S", priority: "P1", impact: "medium", status: "new", description: "Visual schema editor with validation, preview, and deploy diff.", prompt: "Build Schema Studio: JSON-LD editor, validator, Google rich result preview, deploy diff. Validate against schema.org." },
  { id: "idea-7", title: "Design Token Pipeline", slug: "design-token-pipeline", domain: "design", whyNow: "Design Lab tokens are manual — automated WP injection unlocks scale.", widgets: ["Token Editor", "WP Sync Status", "Preview Frame", "Version History"], effort: "M", priority: "P1", impact: "medium", status: "scoped", dashboardUrl: "https://design-lab.maximo-seo.ai/tokens", description: "Design token editor with one-click WordPress injection pipeline.", prompt: "Build Design Token Pipeline: token editor, WP connection status, live preview frame, version history. Reuse /api/wp/inject." },
  { id: "idea-8", title: "Content Brief Autopilot", slug: "content-brief-autopilot", domain: "content", whyNow: "Brief creation is #1 bottleneck — SERP-informed auto-briefs 10x throughput.", widgets: ["SERP Brief", "Outline Builder", "Entity Map", "Competitor Gap"], effort: "L", priority: "P0", impact: "high", status: "new", description: "Auto-generates SEO briefs from SERP analysis with entity and gap data.", prompt: "Build Content Brief Autopilot: inputs keyword, outputs SERP-informed brief with outline, entities, competitor gap table. LLM + SERP API." },
  { id: "idea-9", title: "Local Citation Pulse", slug: "local-citation-pulse", domain: "local", whyNow: "NAP inconsistencies still derail 1 in 5 local packs.", widgets: ["Citation Map", "NAP Diff", "Fix Queue", "Authority Score"], effort: "M", priority: "P2", impact: "medium", status: "backlog", description: "Citation consistency tracker across 40+ directories with fix queue.", prompt: "Build Local Citation Pulse: map of citations, NAP diff highlighter, fix queue, authority score. Pull Whitespark/BrightLocal." },
  { id: "idea-10", title: "Fleet Cron Observatory", slug: "fleet-cron-observatory", domain: "automation", whyNow: "Fleet has 50+ crons — silent failures cost hours weekly.", widgets: ["Cron Timeline", "Failure Heatmap", "Run Logs", "Retry Control"], effort: "S", priority: "P0", impact: "high", status: "new", description: "All fleet crons in one timeline with failure heatmap and retry controls.", prompt: "Build Fleet Cron Observatory: timeline of all cron runs, failure heatmap by hour, log viewer, retry button. Aggregate n8n + Vercel cron logs." },
  { id: "idea-11", title: "Link Velocity Tracker", slug: "link-velocity-tracker", domain: "outreach", whyNow: "Link velocity is leading indicator — competitors accelerating unseen.", widgets: ["Velocity Chart", "New/Lost Links", "Anchor Mix", "Risk Flag"], effort: "M", priority: "P2", impact: "low", status: "new", description: "Link acquisition velocity with new/lost, anchor mix, and risk flags.", prompt: "Build Link Velocity Tracker: 90-day velocity chart, new/lost table, anchor distribution, toxic risk flag. Use Ahrefs/Majestic." },
  { id: "idea-12", title: "CWV Budget Guard", slug: "cwv-budget-guard", domain: "technical", whyNow: "CWV regressions ship silently — budget guard blocks deploys on breach.", widgets: ["CWV Gauges", "Budget Bar", "Regression Diff", "Deploy Gate"], effort: "S", priority: "P1", impact: "high", status: "new", description: "Core Web Vitals budget enforcement with deploy gate and regression diffs.", prompt: "Build CWV Budget Guard: LCP/CLS/INP gauges, budget bar, regression diff vs last deploy, gate that blocks ship on breach. Lighthouse CI." },
];

// Gap matrix for UI (domains x capabilities) — uses same engine scoring but exposes via fleet
export const GAP_SCORES: Record<string, Record<string, number>> = {
  seo: { analytics: 88, alerts: 62, automation: 62, reporting: 75, visualization: 82 },
  content: { analytics: 68, alerts: 48, automation: 48, reporting: 55, visualization: 72 },
  local: { analytics: 62, alerts: 55, automation: 55, reporting: 68, visualization: 58 },
  analytics: { analytics: 88, alerts: 40, automation: 40, reporting: 90, visualization: 85 },
  automation: { analytics: 55, alerts: 62, automation: 92, reporting: 38, visualization: 50 },
  design: { analytics: 45, alerts: 42, automation: 42, reporting: 45, visualization: 88 },
  outreach: { analytics: 52, alerts: 62, automation: 62, reporting: 50, visualization: 35 },
  technical: { analytics: 75, alerts: 58, automation: 58, reporting: 62, visualization: 68 },
};
export function gapLevel(score: number): "strong" | "ok" | "gap" | "white-space" {
  if (score >= 70) return "strong";
  if (score >= 50) return "ok";
  if (score >= 30) return "gap";
  return "white-space";
}
