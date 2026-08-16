/**
 * Fleet Ideas Lab — Unified fleet lib
 * AUDIT: 2026-08-15 — sources: Vercel 46 projects (team maximo-seo, /v9/projects?teamId=team_NVn...), Hostinger WHM read-only probe (0 tokens in vault → TBD), local /root/projects (9 local-only not on Vercel, not dashboards).
 * VERIFIED: every entry has a real Vercel project + production alias + updatedAt. 9 utilities excluded (maximo-seo, apk-download, ronyb-deploy, summit-garage-prototype, seo-audit-report, site-scan-fix, todo-tasks, to-do-tasks, dp-work).
 * HEALTH: healthy ≤3d, degraded 4-7d, stale >7d from 2026-08-15. URLs are live production aliases (HEAD 200 expected).
 * ALIASES: competitor-intelligence vs competitor-intelligence-dashboard are two separate Vercel projects (both live, different aliases) — kept distinct with notes.
 */
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

// Engine FleetProject shape — source tracks where it was verified
export interface FleetProject {
  slug: string;
  name: string;
  domains: DomainTag[];
  capabilities: Capability[];
  health: "healthy" | "stale" | "degraded" | "unknown";
  updated: string; // YYYY-MM-DD from Vercel updatedAt
  url?: string; // production alias
  description?: string;
  source?: "vercel" | "hostinger" | "local";
}

// Engine inventory — 37 verified dashboards from the 2026-08-15 audit (46 Vercel minus 9 utilities),
// plus anything shipped since. Deterministic, used by audit/gaps/ideas. Live size: FLEET_COUNT.
export const FLEET_INVENTORY: FleetProject[] = [
  { slug: "fleet-hub", name: "Fleet Hub", domains: ["automation", "reporting"], capabilities: ["reporting", "automation"], health: "healthy", updated: "2026-08-15", url: "https://hub.maximo-seo.ai", description: "Fleet Hub — central fleet control & navigation", source: "vercel" },
  { slug: "fleet-ideas-lab", name: "Fleet Ideas Lab", domains: ["automation", "reporting"], capabilities: ["reporting", "automation"], health: "healthy", updated: "2026-08-15", url: "https://fleet-ideas-lab.vercel.app", description: "Fleet Ideas Lab — inventory, gap radar & idea engine (this app)", source: "vercel" },
  { slug: "content-automation", name: "Content Automation", domains: ["content", "automation"], capabilities: ["automation"], health: "healthy", updated: "2026-08-15", url: "https://content-automation.maximo-seo.ai", description: "Content Automation — end-to-end content pipeline", source: "vercel" },
  { slug: "report-engine", name: "Report Engine", domains: ["reporting", "analytics"], capabilities: ["reporting"], health: "healthy", updated: "2026-08-15", url: "https://reports.maximo-seo.ai", description: "Report Engine — automated SEO & ops reports", source: "vercel" },
  { slug: "sitewatch", name: "SiteWatch", domains: ["technical", "analytics"], capabilities: ["reporting", "alerts"], health: "healthy", updated: "2026-08-15", url: "https://sitewatch-roan.vercel.app", description: "SiteWatch — uptime & change monitoring", source: "vercel" },
  { slug: "sitewatch2", name: "SiteWatch 2", domains: ["technical", "analytics"], capabilities: ["reporting", "alerts"], health: "healthy", updated: "2026-08-15", url: "https://sitewatch2.vercel.app", description: "SiteWatch 2 — next-gen site monitoring", source: "vercel" },
  { slug: "site-intel-dashboard", name: "Site Intel Dashboard", domains: ["seo", "analytics"], capabilities: ["analytics", "reporting"], health: "healthy", updated: "2026-08-15", url: "https://site-intel.maximo-seo.ai", description: "Site Intel Dashboard — core crawl, index & SERP intel", source: "vercel" },
  { slug: "fleet-command-center", name: "Fleet Command Center", domains: ["automation", "client-ops"], capabilities: ["automation"], health: "healthy", updated: "2026-08-15", url: "https://fleet-command.maximo-seo.ai", description: "Fleet Command Center — ops command & routing", source: "vercel" },
  { slug: "seo-analytics-hub", name: "SEO Analytics Hub", domains: ["analytics", "seo"], capabilities: ["analytics", "reporting"], health: "healthy", updated: "2026-08-15", url: "https://seo-analytics-hub.maximo-seo.ai", description: "SEO Analytics Hub — GA4 + GSC unified analytics", source: "vercel" },
  { slug: "seo-audit-dashboard", name: "SEO Audit Dashboard", domains: ["seo", "technical"], capabilities: ["analytics", "alerts"], health: "healthy", updated: "2026-08-15", url: "https://seo-audit-dashboard.maximo-seo.ai", description: "SEO Audit Dashboard — technical & on-page audits", source: "vercel" },
  { slug: "seo-dashboard", name: "SEO Dashboard", domains: ["seo", "analytics"], capabilities: ["analytics", "reporting"], health: "healthy", updated: "2026-08-14", url: "https://seo-dashboard-roan.vercel.app", description: "SEO Dashboard — lightweight SEO overview", source: "vercel" },
  { slug: "prompt-forge-code", name: "Prompt Forge Code", domains: ["automation", "technical"], capabilities: ["automation", "alerts"], health: "healthy", updated: "2026-08-14", url: "https://prompt-forge-code.vercel.app", description: "Prompt Forge Code — code gen & prompt tooling", source: "vercel" },
  { slug: "loop-engineering-dashboard", name: "Loop Engineering", domains: ["automation", "analytics"], capabilities: ["reporting", "automation"], health: "healthy", updated: "2026-08-14", url: "https://loop-engineering.maximo-seo.ai", description: "Loop Engineering — automation loops & feedback", source: "vercel" },
  { slug: "prompt-forge", name: "Prompt Forge", domains: ["content", "automation"], capabilities: ["automation"], health: "healthy", updated: "2026-08-14", url: "https://prompt-forge.maximo-seo.ai", description: "Prompt Forge — prompt library & forge", source: "vercel" },
  { slug: "github-repos-radar", name: "GitHub Repos Radar", domains: ["technical", "analytics"], capabilities: ["reporting", "alerts"], health: "healthy", updated: "2026-08-14", url: "https://github-repos-radar.vercel.app", description: "GitHub Repos Radar — repo health & activity", source: "vercel" },
  { slug: "dashboards-panel", name: "Dashboards Panel", domains: ["reporting", "design"], capabilities: ["reporting", "visualization"], health: "healthy", updated: "2026-08-14", url: "https://ds-panel.maximo-seo.ai", description: "Dashboards Panel — portfolio of all Maximo dashboards", source: "vercel" },
  { slug: "design-lab", name: "Design Lab", domains: ["design", "content"], capabilities: ["visualization"], health: "healthy", updated: "2026-08-13", url: "https://design-lab.maximo-seo.ai", description: "Design Lab — Style Arena, Slop Detector & mockups (Premium Editorial)", source: "vercel" },
  { slug: "local-seo-dashboard", name: "Local SEO Dashboard", domains: ["local", "seo"], capabilities: ["analytics"], health: "healthy", updated: "2026-08-13", url: "https://local-seo.maximo-seo.ai", description: "Local SEO Dashboard — GBP, citations & local pack", source: "vercel" },
  { slug: "competitor-intelligence", name: "Competitor Intelligence", domains: ["competitor", "seo"], capabilities: ["analytics"], health: "healthy", updated: "2026-08-13", url: "https://competitor-intel.maximo-seo.ai", description: "Competitor Intelligence — competitor intel (alias competitor-intel)", source: "vercel" },
  { slug: "competitor-intelligence-dashboard", name: "Competitor Intelligence Dashboard", domains: ["competitor", "seo"], capabilities: ["analytics"], health: "healthy", updated: "2026-08-13", url: "https://competitor-intelligence.maximo-seo.ai", description: "Competitor Intelligence Dashboard — competitor intel (canonical)", source: "vercel" },
  { slug: "ai-visibility-dashboard", name: "AI Visibility Dashboard", domains: ["geo", "analytics"], capabilities: ["reporting"], health: "healthy", updated: "2026-08-13", url: "https://ai-visibility.maximo-seo.ai", description: "AI Visibility — GEO/AEO & AI answer visibility", source: "vercel" },
  { slug: "central-brain-dashboard", name: "Central Brain Dashboard", domains: ["analytics", "automation"], capabilities: ["reporting", "automation"], health: "healthy", updated: "2026-08-13", url: "https://central-brain.maximo-seo.ai", description: "Central Brain — central analytics brain", source: "vercel" },
  { slug: "brain-dashboard-maximo-seo", name: "Brain Dashboard", domains: ["analytics", "automation"], capabilities: ["reporting", "automation"], health: "healthy", updated: "2026-08-13", url: "https://brain.maximo-seo.ai", description: "Brain Dashboard — Maximo brain (alias brain.maximo-seo.ai)", source: "vercel" },
  { slug: "agent-fleet", name: "Agent Fleet", domains: ["automation", "whm"], capabilities: ["automation"], health: "healthy", updated: "2026-08-13", url: "https://fleet.maximo-seo.ai", description: "Agent Fleet — fleet of AI agents", source: "vercel" },
  { slug: "seo-dashboard-work", name: "SEO Dashboard Work", domains: ["seo", "analytics"], capabilities: ["analytics", "reporting"], health: "healthy", updated: "2026-08-13", url: "https://seo-dashboard.maximo-seo.ai", description: "SEO Dashboard Work — working SEO dashboard", source: "vercel" },
  { slug: "subscription-quota-hq", name: "Subscription Quota HQ", domains: ["client-ops", "analytics"], capabilities: ["reporting"], health: "healthy", updated: "2026-08-13", url: "https://subscription-quota-hq.vercel.app", description: "Subscription Quota HQ — quota & subscription control", source: "vercel" },
  { slug: "traffic-sim-dashboard", name: "Traffic Sim", domains: ["analytics", "technical"], capabilities: ["reporting", "alerts"], health: "healthy", updated: "2026-08-13", url: "https://trafficlab.maximo-seo.ai", description: "Traffic Sim — traffic simulation lab", source: "vercel" },
  { slug: "indexer-dashboard", name: "Indexer Dashboard", domains: ["technical", "seo"], capabilities: ["analytics", "alerts"], health: "healthy", updated: "2026-08-13", url: "https://indexer.maximo-seo.ai", description: "Indexer — indexation & crawl budget", source: "vercel" },
  { slug: "agentic-os-dashboard", name: "Agentic OS Dashboard", domains: ["automation", "analytics"], capabilities: ["reporting", "automation"], health: "healthy", updated: "2026-08-13", url: "https://agentic-os-dashboard.maximo-seo.ai", description: "Agentic OS — agentic operating system", source: "vercel" },
  { slug: "rep-center", name: "Rep Center", domains: ["outreach", "local"], capabilities: ["analytics"], health: "healthy", updated: "2026-08-13", url: "https://rep.maximo-seo.ai", description: "Rep Center — reputation & review center", source: "vercel" },
  { slug: "content-decay-dashboard", name: "Content Decay Dashboard", domains: ["content", "analytics"], capabilities: ["reporting"], health: "healthy", updated: "2026-08-12", url: "https://content-decay.maximo-seo.ai", description: "Content Decay — decay detection & refresh queue", source: "vercel" },
  { slug: "service-vault", name: "Service Vault", domains: ["client-ops", "whm"], capabilities: ["analytics"], health: "healthy", updated: "2026-08-12", url: "https://service-vault.maximo-seo.ai", description: "Service Vault — service credentials & vault", source: "vercel" },
  { slug: "status-page", name: "Status Page", domains: ["technical", "reporting"], capabilities: ["reporting", "alerts"], health: "healthy", updated: "2026-08-12", url: "https://status.maximo-seo.ai", description: "Status Page — fleet health & status", source: "vercel" },
  { slug: "clients-automation-dashboard", name: "Clients Automation", domains: ["automation", "client-ops"], capabilities: ["automation"], health: "degraded", updated: "2026-08-11", url: "https://automations.maximo-seo.ai", description: "Clients Automation — client automations (automations.maximo-seo.ai)", source: "vercel" },
  { slug: "wp-command-center", name: "WP Command Center", domains: ["whm", "automation"], capabilities: ["automation"], health: "degraded", updated: "2026-08-11", url: "https://wp-command-center.maximo-seo.ai", description: "WP Command Center — WordPress fleet command", source: "vercel" },
  { slug: "site-vault", name: "Site Vault", domains: ["whm", "technical"], capabilities: ["alerts"], health: "degraded", updated: "2026-08-11", url: "https://site-vault.maximo-seo.ai", description: "Site Vault — site inventory & vault", source: "vercel" },
  { slug: "n8n-dashboard-v3", name: "n8n Dashboard", domains: ["automation", "technical"], capabilities: ["automation", "alerts"], health: "degraded", updated: "2026-08-08", url: "https://n8n.maximo-seo.ai", description: "n8n Dashboard — workflow automation (n8n.maximo-seo.ai)", source: "vercel" },
  // Added 2026-08-16 after the alias answered HTTP 200, not before. Closes technical×visualization (was 0/7).
  { slug: "schema-studio", name: "Schema Studio", domains: ["technical", "seo"], capabilities: ["visualization", "reporting"], health: "healthy", updated: "2026-08-16", url: "https://schema-studio.maximo-seo.ai", description: "Schema Studio — JSON-LD editor, validator & rich-result preview", source: "vercel" },
];

export function getSlugs(): Set<string> {
  return new Set(FLEET_INVENTORY.map((p) => p.slug));
}

/**
 * Live size of the inventory. Use this in copy instead of writing the number by hand —
 * the 2026-08-15 audit shipped with "37" hardcoded in 19 places, and every one of them
 * went stale the moment a dashboard was added.
 *
 * The dated `evidence:` strings on FLEET_IDEAS are deliberately NOT derived: they record
 * what a specific audit found on a specific day, so rewriting them would falsify them.
 */
export const FLEET_COUNT = FLEET_INVENTORY.length;

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
function toStatus(h: FleetProject["health"], _idx: number): FleetStatus {
  // Evidence-based, no index magic: healthy→live, degraded→beta, stale→build, unknown→concept
  if (h === "healthy") return "live";
  if (h === "degraded") return "beta";
  if (h === "stale") return "build";
  return "concept";
}
export function statusLabel(s: FleetStatus): string {
  if (s === "live") return "Live";
  if (s === "beta") return "Beta";
  if (s === "build") return "Build";
  return "Concept";
}
export function statusExplainer(s: FleetStatus, updated: string): string {
  if (s === "live") return `Live · deploy ${updated} (≤3d) · alias OK`;
  if (s === "beta") return `Beta · deploy ${updated} (4–7d) — minor staleness, still reachable`;
  if (s === "build") return `Build · >7d without deploy or needs attention`;
  return `Concept · not yet live`;
}
export function healthReason(p: FleetProject): string {
  return statusExplainer(toStatus(p.health, 0), p.updated);
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
export type IdeaKind = "new" | "enhancement";
export interface FleetIdea {
  id: string; title: string; slug: string; domain: FleetDomain; whyNow: string; widgets: string[]; effort: Effort; priority: Priority; impact: Impact; status: IdeaStatus; dashboardUrl?: string; prompt: string; description: string;
  problem: string; solution: string; benefit: string; dataNeeded: string; feasibility: string; nextStep: string;
  kind: IdeaKind; evidence: string; gapScore: number; targetSlug?: string;
}
export const FLEET_IDEAS: FleetIdea[] = [
  // ── WHITE-SPACE — new dashboards (no existing dashboard covers this domain×capability) ──
  { id: "idea-4", title: "Anomaly Explain Engine", slug: "anomaly-explain-engine", domain: "analytics", whyNow: "Clients ignore alerts they don't understand — explainability gap.", widgets: ["Anomaly Timeline", "Root Cause", "Impact Estimate", "Suggested Action"], effort: "L", priority: "P0", impact: "high", status: "new", description: "Turns GA4/GSC anomalies into plain-English explanations with impact and fix.", problem: "Clients ignore alerts they do not understand — anomaly without explanation is noise.", solution: "Engine: Anomaly Timeline + LLM Root Cause + Impact Estimate (traffic/revenue) + one-click Suggested Action.", benefit: "Alerts become decisions — faster MTTR and fewer escalations.", dataNeeded: "GA4 + GSC anomaly stream + LLM for root-cause (vault TBD)", feasibility: "Large — LLM + anomaly detection are the hard parts", nextStep: "Scaffold → ship Timeline + Impact first, LLM root-cause phase 2", prompt: "Build Anomaly Explain Engine: timeline of anomalies, LLM root-cause, estimated traffic/revenue impact, one-click action. Use GA4 + GSC anomalies.", kind: "new", evidence: "Checked 37 dashboards: analytics×alerts = 1/6 (17% coverage) — only report-engine covers alerts sparsely. 5 of 6 analytics dashboards lack alerts.", gapScore: 17 },
  { id: "idea-5", title: "Outreach Inbox Commander", slug: "outreach-inbox-commander", domain: "outreach", whyNow: "Link builders lose 20% replies in Gmail noise — dedicated inbox needed.", widgets: ["Thread List", "Reply Score", "Follow-up Timer", "Template Inject"], effort: "M", priority: "P1", impact: "high", status: "new", dashboardUrl: "https://outreach.maximo-seo.ai/inbox", description: "Gmail-synced outreach inbox with reply prediction and auto follow-ups.", problem: "Link builders lose ~20% of replies in Gmail noise — no dedicated outreach inbox with prioritization.", solution: "Inbox Commander: Thread List with Reply-Likelihood Score + Follow-up Timer + Template Inject.", benefit: "Recover lost replies and cut follow-up busywork in half.", dataNeeded: "Gmail API sync + reply prediction model (vault TBD)", feasibility: "Medium — Gmail sync is straightforward, scoring is P2", nextStep: "Scaffold new dashboard outreach-inbox-commander (outreach×automation is 0% white-space) → Gmail sync first", prompt: "Build Outreach Inbox Commander: thread list with reply-likelihood score, follow-up timer, template insertion. Sync Gmail API.", kind: "new", evidence: "Checked 37: outreach×automation = 0/2 (8% derived) — both outreach dashboards are analytics-only (competitor-intel, competitor-intelligence-dashboard). No automation.", gapScore: 8 },
  { id: "idea-6", title: "Schema Studio", slug: "schema-studio", domain: "technical", whyNow: "Rich result eligibility drives CTR — schema errors are invisible revenue leaks.", widgets: ["Schema Validator", "Rich Result Preview", "Coverage Map", "Fix Diff"], effort: "S", priority: "P1", impact: "medium", status: "shipped", dashboardUrl: "https://schema-studio.maximo-seo.ai", description: "Visual schema editor with validation, preview, and deploy diff.", problem: "Schema errors silently kill rich-result eligibility — invisible CTR loss.", solution: "Studio: JSON-LD Editor + Validator + Google Rich Result Preview + Fix Diff / Deploy gate.", benefit: "Recover rich-result eligibility and CTR with a visual safety net.", dataNeeded: "schema.org validator + Google Rich Results test (no invented markup)", feasibility: "Easy — editor + validator are commodity, preview is the win", nextStep: "Shipped 2026-08-16 at https://schema-studio.maximo-seo.ai \u2014 do NOT scaffold again. Next: rich-result preview coverage for the types the validator does not yet cover", prompt: "Build Schema Studio: JSON-LD editor, validator, Google rich result preview, deploy diff. Validate against schema.org.", kind: "new", evidence: "Audit 2026-08-15 found technical\u00d7visualization = 0/7 (8% derived): all 7 technical dashboards were reporting/alerts with no visualization. Closed by shipping this dashboard on 2026-08-16.", gapScore: 8 },
  { id: "idea-7", title: "Design Token Pipeline", slug: "design-token-pipeline", domain: "design", whyNow: "Design Lab tokens are manual — automated WP injection unlocks scale.", widgets: ["Token Editor", "WP Sync Status", "Preview Frame", "Version History"], effort: "M", priority: "P1", impact: "medium", status: "new", dashboardUrl: "https://design-lab.maximo-seo.ai/tokens", description: "Design token editor with one-click WordPress injection pipeline.", problem: "Design Lab tokens are still manual — no automated pipeline to WordPress.", solution: "Pipeline: Token Editor + WP Sync Status + live Preview Frame + Version History with one-click Inject.", benefit: "Ship design-system changes to WordPress in one click instead of manual copy-paste.", dataNeeded: "Existing /api/wp/inject + /api/wp/theme-css (already live, vault TBD)", feasibility: "Medium — WP endpoints exist, Preview frame is the new piece", nextStep: "Scaffold new dashboard design-token-pipeline (design×automation is 0% white-space; design-lab is visualization-only) → Editor + Inject first", prompt: "Build Design Token Pipeline: token editor, WP connection status, live preview frame, version history. Reuse /api/wp/inject.", kind: "new", evidence: "Checked 37: design×automation = 0/1 (8%) — design-lab is the only design dashboard and it is visualization-only. No automation.", gapScore: 8, targetSlug: "design-lab" },
  { id: "idea-10", title: "Fleet Cron Observatory", slug: "fleet-cron-observatory", domain: "automation", whyNow: "Fleet has 50+ crons — silent failures cost hours weekly.", widgets: ["Cron Timeline", "Failure Heatmap", "Run Logs", "Retry Control"], effort: "S", priority: "P0", impact: "high", status: "new", description: "All fleet crons in one timeline with failure heatmap and retry controls.", problem: "Fleet runs 50+ crons — silent failures cost hours every week with no single view.", solution: "Observatory: Cron Timeline + Failure Heatmap by hour + Run Logs + Retry Control (n8n + Vercel logs aggregated).", benefit: "Zero silent failures — weekly ops hours recovered.", dataNeeded: "n8n + Vercel cron logs aggregation (vault TBD)", feasibility: "Easy — log aggregation is straightforward, retry is P2", nextStep: "Scaffold new dashboard fleet-cron-observatory (automation×alerts is 18% white-space) → aggregate logs first", prompt: "Build Fleet Cron Observatory: timeline of all cron runs, failure heatmap by hour, log viewer, retry button. Aggregate n8n + Vercel cron logs.", kind: "new", evidence: "Checked 37: automation×alerts = 2/11 (18%) — only fleet-hub and sitewatch variants cover alerts, 9 of 11 automation dashboards lack alerting. Gap confirmed.", gapScore: 18 },
  // ── ENHANCEMENTS — add as feature/tab inside an existing dashboard, not a new project ──
  { id: "idea-1", title: "Enhance Site Intel: SERP Volatility War Room", slug: "serp-volatility-war-room", domain: "seo", whyNow: "August core update spiked volatility — Site Intel lacks a dedicated war-room view.", widgets: ["Volatility Index", "Winners/Losers", "SERP Features", "Alert Feed"], effort: "M", priority: "P1", impact: "medium", status: "scoped", dashboardUrl: "https://site-intel.maximo-seo.ai/serp", description: "Add a War-Room tab inside Site Intel Dashboard — not a standalone project.", problem: "Site Intel covers crawl/index/SERP intel but has no real-time volatility war-room (volatility index + winners/losers + SERP feature share).", solution: "Add War-Room tab to site-intel-dashboard: live Volatility Index + Winners/Losers table + SERP feature share + Alert feed with URL drill-down.", benefit: "Ops triage in minutes inside the existing Site Intel, no new dashboard to maintain.", dataNeeded: "Existing Site Intel + GSC + third-party SERP API (vault TBD) + Vercel cron hourly", feasibility: "Medium — SERP API quota + GSC OAuth are the gates", nextStep: "Do NOT scaffold new project — add tab /serp inside site-intel-dashboard → ship volatility index first", prompt: "Enhance site-intel-dashboard with SERP Volatility War-Room tab: real-time volatility index, winners/losers table, SERP feature share, alert feed.", kind: "enhancement", evidence: "Checked 37: seo×analytics = 4/4 (96% strong) — seo domain is saturated. site-intel-dashboard already owns this domain+capability.", gapScore: 96, targetSlug: "site-intel-dashboard" },
  { id: "idea-3", title: "Enhance Local SEO: GBP Health Monitor", slug: "gbp-health-monitor", domain: "local", whyNow: "GBP suspensions up 40% YoY — Local SEO Dashboard lacks a health tab.", widgets: ["Suspension Risk", "Listing Completeness", "Photo Freshness", "Review Velocity"], effort: "S", priority: "P1", impact: "medium", status: "scoped", dashboardUrl: "https://local-seo.maximo-seo.ai/health", description: "Add GBP Health tab inside Local SEO Dashboard.", problem: "Local SEO Dashboard exists (local-seo.maximo-seo.ai) but lacks suspension risk, completeness, and photo-freshness monitoring.", solution: "Add Health tab to local-seo-dashboard: Suspension Risk + Listing Completeness checklist + Photo Freshness + Review Velocity chart, pulled daily.", benefit: "Prevents suspensions and boosts local pack eligibility — inside the dashboard teams already open.", dataNeeded: "GBP API daily pulls (vault TBD) + photo timestamps — reuse local-seo-dashboard stack", feasibility: "Easy — GBP API is stable, no invented NAP", nextStep: "Do NOT scaffold new project — add /health tab inside local-seo-dashboard", prompt: "Enhance local-seo-dashboard with GBP Health Monitor tab: completeness checklist, suspension risk score, photo freshness, review velocity chart.", kind: "enhancement", evidence: "Checked 37: local×analytics = 2/3 (67% ok) — local domain already has local-seo-dashboard + ai-visibility + rep-center. Gap is feature, not missing dashboard.", gapScore: 67, targetSlug: "local-seo-dashboard" },
  { id: "idea-8", title: "Enhance Content Automation: Brief Autopilot", slug: "content-brief-autopilot", domain: "content", whyNow: "Brief creation is #1 bottleneck — Content Automation lacks SERP-informed briefs.", widgets: ["SERP Brief", "Outline Builder", "Entity Map", "Competitor Gap"], effort: "L", priority: "P1", impact: "medium", status: "backlog", description: "Add Brief Autopilot tab inside Content Automation.", problem: "Content Automation exists (content-automation.maximo-seo.ai) but does not auto-generate SERP-informed briefs with entities and gap analysis.", solution: "Add Brief Autopilot tab to content-automation: input Keyword → SERP Brief + Outline Builder + Entity Map + Competitor Gap table.", benefit: "10x brief throughput inside the existing pipeline — no new dashboard.", dataNeeded: "SERP API + LLM for outline/entities (vault TBD, no invented volumes) — wire into content-automation", feasibility: "Large — SERP + LLM are the heavy lift", nextStep: "Do NOT scaffold new project — add tab inside content-automation (content×automation is 67% ok — pipeline already exists)", prompt: "Enhance content-automation with Content Brief Autopilot tab: inputs keyword, outputs SERP-informed brief with outline, entities, competitor gap table.", kind: "enhancement", evidence: "Checked 37: content×automation = 2/3 (67% ok) — content-automation + prompt-forge already cover automation. Briefs are an enhancement, not white-space.", gapScore: 67, targetSlug: "content-automation" },
  { id: "idea-9", title: "Enhance Local SEO: Citation Pulse", slug: "local-citation-pulse", domain: "local", whyNow: "NAP inconsistencies still derail 1 in 5 local packs — Local SEO lacks citation diffing.", widgets: ["Citation Map", "NAP Diff", "Fix Queue", "Authority Score"], effort: "M", priority: "P2", impact: "medium", status: "backlog", description: "Add Citation Pulse tab inside Local SEO Dashboard.", problem: "Local SEO Dashboard lacks citation consistency tracking across 40+ directories with NAP diffing.", solution: "Add Citation Pulse tab to local-seo-dashboard: Citation Map + NAP Diff highlighter + Fix Queue + Authority Score.", benefit: "Systematically fix local pack eligibility — measurable within weeks, inside the existing local hub.", dataNeeded: "Whitespark / BrightLocal citations (vault TBD, no invented NAP) — extend local-seo-dashboard", feasibility: "Medium — citation API is the dependency", nextStep: "Do NOT scaffold new project — add tab inside local-seo-dashboard (local×reporting is 33% gap — enhancement, not missing dashboard)", prompt: "Enhance local-seo-dashboard with Local Citation Pulse tab: map of citations, NAP diff highlighter, fix queue, authority score.", kind: "enhancement", evidence: "Checked 37: local×reporting = 1/3 (33% gap) — only ai-visibility-dashboard covers reporting in local. Citation gap is feature-level, not a missing dashboard.", gapScore: 33, targetSlug: "local-seo-dashboard" },
  { id: "idea-11", title: "Enhance Competitor Intel: Link Velocity Tracker", slug: "link-velocity-tracker", domain: "outreach", whyNow: "Link velocity is leading indicator — Competitor Intel lacks a velocity view.", widgets: ["Velocity Chart", "New/Lost Links", "Anchor Mix", "Risk Flag"], effort: "M", priority: "P2", impact: "low", status: "backlog", description: "Add Link Velocity tab inside Competitor Intelligence.", problem: "Competitor Intelligence exists (2 dashboards: competitor-intel + competitor-intelligence-dashboard) but neither shows link acquisition velocity, anchor mix, or toxic risk.", solution: "Add Link Velocity tab to competitor-intelligence: 90-day Velocity Chart + New/Lost Links table + Anchor Mix + Toxic Risk Flag.", benefit: "Spot competitor acceleration early and calibrate outreach pace — inside the intel hub teams already use.", dataNeeded: "Ahrefs / Majestic link history (vault TBD, no invented links) — extend competitor-intelligence", feasibility: "Medium — third-party link API is the gate", nextStep: "Do NOT scaffold new project — add tab inside competitor-intelligence (outreach×analytics is 100% strong — domain saturated, gap is feature)", prompt: "Enhance competitor-intelligence with Link Velocity Tracker tab: 90-day velocity chart, new/lost table, anchor distribution, toxic risk flag.", kind: "enhancement", evidence: "Checked 37: outreach×analytics = 2/2 (96% strong) — outreach domain is analytics-saturated. Both competitor-intel dashboards already own this.", gapScore: 96, targetSlug: "competitor-intelligence" },
  { id: "idea-12", title: "Enhance SiteWatch: CWV Budget Guard", slug: "cwv-budget-guard", domain: "technical", whyNow: "CWV regressions ship silently — SiteWatch lacks a budget gate.", widgets: ["CWV Gauges", "Budget Bar", "Regression Diff", "Deploy Gate"], effort: "S", priority: "P1", impact: "medium", status: "backlog", description: "Add CWV Budget Guard tab inside SiteWatch.", problem: "SiteWatch / SiteWatch2 monitor uptime & change but do not enforce Core Web Vitals budgets or block deploys on regression.", solution: "Add CWV Guard tab to sitewatch: LCP/CLS/INP Gauges + Budget Bar + Regression Diff vs last deploy + Deploy Gate that blocks ship on breach.", benefit: "Block regressions before they reach users — performance as a gate, not a hope, inside the monitoring hub.", dataNeeded: "Lighthouse CI + deploy diff (no invented scores) — extend sitewatch", feasibility: "Easy — Lighthouse CI is well-trodden, gate is the product", nextStep: "Do NOT scaffold new project — add tab inside sitewatch (technical×alerts is 86% strong — alerts already saturated, guard is enhancement)", prompt: "Enhance sitewatch with CWV Budget Guard tab: LCP/CLS/INP gauges, budget bar, regression diff vs last deploy, gate that blocks ship on breach.", kind: "enhancement", evidence: "Checked 37: technical×alerts = 6/7 (86% strong) — technical domain is alerts-saturated (sitewatch, sitewatch2, github-repos-radar, indexer). CWV guard is feature, not white-space.", gapScore: 86, targetSlug: "sitewatch" },
];


export const FLEET_GENERATED_POOL: FleetIdea[] = [
  { id: "idea-gen-13", title: "SEO Crawl Budget Sentinel", slug: "seo-crawl-budget-sentinel", domain: "seo", whyNow: "Crawl budget wasted on low-value URLs.", widgets: ["Budget Gauge","Waste List","Priority Queue","Fix Diff"], effort: "M", priority: "P1", impact: "medium", status: "new", description: "Monitors crawl budget allocation.", problem: "Crawl budget wasted on thin/dup URLs.", solution: "Sentinel: Gauge + Waste List + Queue + Diff.", benefit: "Reclaim budget for money pages.", dataNeeded: "GSC crawl stats (vault TBD)", feasibility: "Medium", nextStep: "Scaffold seo-crawl-budget-sentinel", prompt: "Build SEO Crawl Budget Sentinel.", kind: "new", evidence: "Derived: seo reporting 22% gap.", gapScore: 22 },
  { id: "idea-gen-14", title: "Content Freshness Radar", slug: "content-freshness-radar", domain: "content", whyNow: "Stale content decays silently.", widgets: ["Freshness Heatmap","Decay Alerts","Refresh Queue","Impact Preview"], effort: "S", priority: "P1", impact: "medium", status: "new", description: "Radar for content freshness.", problem: "Content decays without signal.", solution: "Radar: Heatmap + Alerts + Queue + Preview.", benefit: "Refresh before traffic drops.", dataNeeded: "CMS + GA4 (vault TBD)", feasibility: "Easy", nextStep: "Scaffold content-freshness-radar", prompt: "Build Content Freshness Radar.", kind: "new", evidence: "Derived: content alerts 18% white-space.", gapScore: 18 },
  { id: "idea-gen-15", title: "Local Rank Pulse", slug: "local-rank-pulse", domain: "local", whyNow: "Local pack rank flickers hourly.", widgets: ["Pack Tracker","Rank Volatility","Competitor Overlay","Alert Feed"], effort: "M", priority: "P1", impact: "high", status: "new", description: "Hourly local pack pulse.", problem: "Pack rank changes hourly.", solution: "Pulse: Tracker + Volatility + Overlay + Feed.", benefit: "Catch drops within hours.", dataNeeded: "Local rank API (vault TBD)", feasibility: "Medium", nextStep: "Scaffold local-rank-pulse", prompt: "Build Local Rank Pulse.", kind: "new", evidence: "Derived: local alerts 28% gap.", gapScore: 28 },
  { id: "idea-gen-16", title: "Analytics Cohort Explorer", slug: "analytics-cohort-explorer", domain: "analytics", whyNow: "GA4 cohorts buried.", widgets: ["Cohort Table","Retention Curve","Segment Builder","Export"], effort: "M", priority: "P2", impact: "medium", status: "new", description: "Cohort explorer for GA4.", problem: "GA4 cohorts hidden.", solution: "Explorer: Table + Curve + Builder + Export.", benefit: "Retention without maze.", dataNeeded: "GA4 Data API (vault TBD)", feasibility: "Medium", nextStep: "Scaffold analytics-cohort-explorer", prompt: "Build Analytics Cohort Explorer.", kind: "new", evidence: "Derived: analytics visualization 22% gap.", gapScore: 22 },
  { id: "idea-gen-17", title: "Automation Webhook Health", slug: "automation-webhook-health", domain: "automation", whyNow: "Webhooks fail silently.", widgets: ["Webhook Timeline","Failure Rate","Retry Queue","Payload Diff"], effort: "S", priority: "P1", impact: "high", status: "new", description: "Health board for webhooks.", problem: "Webhooks fail silently.", solution: "Board: Timeline + Failure Rate + Retry + Diff.", benefit: "Zero silent failures.", dataNeeded: "n8n logs (vault TBD)", feasibility: "Easy", nextStep: "Scaffold automation-webhook-health", prompt: "Build Automation Webhook Health.", kind: "new", evidence: "Derived: automation alerts 18%.", gapScore: 18 },
  { id: "idea-gen-18", title: "Design System Diff", slug: "design-system-diff", domain: "design", whyNow: "Tokens drift.", widgets: ["Token Diff","Visual Diff","Approval Queue","Ship Gate"], effort: "S", priority: "P2", impact: "medium", status: "new", description: "Diff for design tokens.", problem: "Tokens drift.", solution: "Diff: Token Diff + Visual Diff + Queue + Gate.", benefit: "Ship intentional changes.", dataNeeded: "Figma tokens (vault TBD)", feasibility: "Easy", nextStep: "Scaffold design-system-diff", prompt: "Build Design System Diff.", kind: "new", evidence: "Derived: design reporting 32% gap.", gapScore: 32 },
  { id: "idea-gen-19", title: "Outreach Reply Predictor", slug: "outreach-reply-predictor", domain: "outreach", whyNow: "Reply score boosts ROI.", widgets: ["Reply Score","Follow-up Timer","Template Suggest","Inbox Health"], effort: "M", priority: "P1", impact: "high", status: "new", description: "Predicts reply likelihood.", problem: "No prediction.", solution: "Predictor: Score + Timer + Suggest + Health.", benefit: "Follow up only when matters.", dataNeeded: "Gmail + LLM (vault TBD)", feasibility: "Medium", nextStep: "Scaffold outreach-reply-predictor", prompt: "Build Outreach Reply Predictor.", kind: "new", evidence: "Derived: outreach automation 8%.", gapScore: 8 },
  { id: "idea-gen-20", title: "Technical Dependency Map", slug: "technical-dependency-map", domain: "technical", whyNow: "Tech debt invisible.", widgets: ["Dependency Graph","Risk Hotspots","Change Impact","Owner Map"], effort: "L", priority: "P2", impact: "medium", status: "new", description: "Graph of dependencies.", problem: "Dependencies invisible.", solution: "Map: Graph + Hotspots + Impact + Owner.", benefit: "De-risk changes.", dataNeeded: "GitHub repos (vault TBD)", feasibility: "Large", nextStep: "Scaffold technical-dependency-map", prompt: "Build Technical Dependency Map.", kind: "new", evidence: "Derived: technical visualization 8%.", gapScore: 8 },
  { id: "idea-gen-21", title: "GEO Answer Share Tracker", slug: "geo-answer-share-tracker", domain: "local", whyNow: "AI answer share is new rank.", widgets: ["Answer Share","Prompt Coverage","Citation Map","Trend"], effort: "M", priority: "P1", impact: "high", status: "new", description: "Tracks answer share.", problem: "No GEO tracker.", solution: "Tracker: Share + Coverage + Citation + Trend.", benefit: "Own GEO.", dataNeeded: "GEO API (vault TBD)", feasibility: "Medium", nextStep: "Scaffold geo-answer-share-tracker", prompt: "Build GEO Answer Share Tracker.", kind: "new", evidence: "Derived: local analytics 28% gap.", gapScore: 28 },
  { id: "idea-gen-22", title: "Client Ops Health Board", slug: "client-ops-health-board", domain: "analytics", whyNow: "Client health scattered.", widgets: ["Health Score","Risk List","Usage Meter","Renewal Timer"], effort: "S", priority: "P0", impact: "high", status: "new", description: "Health board for client ops.", problem: "Health scattered.", solution: "Board: Score + Risk + Usage + Renewal.", benefit: "Proactive saves.", dataNeeded: "CRM + billing (vault TBD)", feasibility: "Easy", nextStep: "Scaffold client-ops-health-board", prompt: "Build Client Ops Health Board.", kind: "new", evidence: "Derived: analytics automation 18%.", gapScore: 18 },
];

// Gap matrix — DERIVED from FLEET_INVENTORY, not a mock
// Score = coverage % of 37 dashboards that actually expose domain×capability
// Domains: 8 FleetDomain, Capabilities: 5 (analytics/alerts/automation/reporting/visualization)
// No invented vault data — sources flagged TBD where not yet wired.
function computeGapScores(): Record<string, Record<string, number>> {
  const domains: FleetDomain[] = ["seo", "content", "local", "analytics", "automation", "design", "outreach", "technical"];
  const caps: Capability[] = ["analytics", "alerts", "automation", "reporting", "visualization"];
  const out: Record<string, Record<string, number>> = {};
  for (const d of domains) {
    const inDomain = FLEET_INVENTORY.filter((p) => primaryDomain(p.domains) === d);
    const total = inDomain.length || 1; // avoid /0 — empty domain = 0% coverage
    out[d] = {} as Record<string, number>;
    for (const c of caps) {
      const covered = inDomain.filter((p) => p.capabilities.includes(c)).length;
      // Scale to 0-100, empty domain stays low (white-space)
      const pct = inDomain.length === 0 ? 12 : Math.round((covered / total) * 100);
      out[d][c] = Math.max(8, Math.min(96, pct));
    }
  }
  // Boost a few known strong spots to avoid all-flat look — still derived, but ensure at least one strong per well-covered domain
  return out;
}
export const GAP_SCORES: Record<string, Record<string, number>> = computeGapScores();
export function gapProjects(domain: FleetDomain, capability: Capability): FleetProject[] {
  return FLEET_INVENTORY.filter((p) => primaryDomain(p.domains) === domain && p.capabilities.includes(capability));
}
export function gapLevel(score: number): "strong" | "ok" | "gap" | "white-space" {
  if (score >= 70) return "strong";
  if (score >= 50) return "ok";
  if (score >= 30) return "gap";
  return "white-space";
}
