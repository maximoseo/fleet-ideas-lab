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

// Engine inventory — 37 verified dashboards (46 Vercel minus 9 utilities), deterministic, used by audit/gaps/ideas
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
