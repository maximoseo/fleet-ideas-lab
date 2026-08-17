package ai.maximo.ideaslab.data

/**
 * A dashboard in the fleet.
 *
 * `url` defaults to empty because the BUNDLED snapshot in this file has never
 * carried one — but the live feed does send it, and until now parseFeed threw
 * it away, which is precisely why tapping a dashboard could not open it.
 */
data class FleetSite(
    val slug: String,
    val name: String,
    val domain: String,
    val status: String,
    val stack: String,
    val plainExplainer: String = "",
    val url: String = "",
)
data class FleetIdea(val slug: String, val title: String, val category: String, val impact: String, val prompt: String, val kind: String = "new", val gapScore: Int = 0, val evidence: String = "", val targetSlug: String = "")
data class GapCell(val site: String, val gap: String, val level: Int)

object FleetData {
    val sites = listOf(
        FleetSite("fleet-hub", "Fleet Hub", "automation", "live", "reporting + automation", "Your fleet's front door — see every dashboard in one place and jump anywhere in one click."),
        FleetSite("fleet-ideas-lab", "Fleet Ideas Lab", "automation", "live", "reporting + automation", "Your idea & gap radar for the whole fleet — finds what's missing and turns it into a build brief."),
        FleetSite("schema-studio", "Schema Studio", "technical", "live", "visualization + reporting", "Fix your structured data before Google does — edit, validate, and preview rich results."),
        FleetSite("content-automation", "Content Automation", "content", "live", "automation", "Turns keywords into drafts automatically — brief, outline, and publish without manual steps."),
        FleetSite("report-engine", "Report Engine", "analytics", "live", "reporting", "Builds SEO & ops reports for clients on a schedule — no spreadsheet wrangling."),
        FleetSite("sitewatch", "SiteWatch", "technical", "live", "reporting + alerts", "Watches your sites for uptime and changes — alerts you before clients notice."),
        FleetSite("sitewatch2", "SiteWatch 2", "technical", "live", "reporting + alerts", "Newer SiteWatch — same uptime & change watch with fresher checks."),
        FleetSite("site-intel-dashboard", "Site Intel Dashboard", "seo", "live", "analytics + reporting", "Shows how your site is crawled, indexed, and ranked — crawl + index + SERP in one place."),
        FleetSite("fleet-command-center", "Fleet Command Center", "automation", "live", "automation", "Ops command board — route tasks and see fleet status at a glance."),
        FleetSite("seo-analytics-hub", "SEO Analytics Hub", "analytics", "live", "analytics + reporting", "Combines GA4 + GSC in one view — traffic, queries, and pages side by side."),
        FleetSite("seo-audit-dashboard", "SEO Audit Dashboard", "seo", "live", "analytics + alerts", "Runs technical & on-page SEO checks — score, issues, and what to fix next."),
        FleetSite("seo-dashboard", "SEO Dashboard", "seo", "live", "analytics + reporting", "Light SEO overview — quick health snapshot."),
        FleetSite("prompt-forge-code", "Prompt Forge Code", "automation", "live", "automation + alerts", "Builds and tests AI prompts & code snippets — version, run, and compare."),
        FleetSite("loop-engineering-dashboard", "Loop Engineering", "automation", "live", "reporting + automation", "Designs and monitors automation loops — see feedback and retries live."),
        FleetSite("prompt-forge", "Prompt Forge", "content", "live", "automation", "Your prompt library — store, version, and reuse prompts."),
        FleetSite("github-repos-radar", "GitHub Repos Radar", "technical", "live", "reporting + alerts", "Tracks your GitHub repos — activity, health, and what went stale."),
        FleetSite("dashboards-panel", "Dashboards Panel", "analytics", "live", "reporting + visualization", "Gallery of all Maximo dashboards — portfolio view with health."),
        FleetSite("design-lab", "Design Lab", "design", "live", "visualization", "Design playground — tokens, mockups, and Slop Detector."),
        FleetSite("local-seo-dashboard", "Local SEO Dashboard", "local", "live", "analytics", "Local pack, GBP, and citations in one place."),
        FleetSite("competitor-intelligence", "Competitor Intelligence", "outreach", "live", "analytics", "Watches competitors' links and keywords — see who is surging."),
        FleetSite("competitor-intelligence-dashboard", "Competitor Intelligence Dashboard", "outreach", "live", "analytics", "Same intel, canonical view — separate project with its own alias."),
        FleetSite("ai-visibility-dashboard", "AI Visibility Dashboard", "local", "live", "reporting", "Tracks how AI answers see you — GEO/AEO visibility."),
        FleetSite("central-brain-dashboard", "Central Brain Dashboard", "analytics", "live", "reporting + automation", "The central analytics brain — aggregates fleet signals."),
        FleetSite("brain-dashboard-maximo-seo", "Brain Dashboard", "analytics", "live", "reporting + automation", "Same brain, different alias — brain.maximo-seo.ai."),
        FleetSite("agent-fleet", "Agent Fleet", "automation", "live", "automation", "Manages your AI agents — who runs where."),
        FleetSite("seo-dashboard-work", "SEO Dashboard Work", "seo", "live", "analytics + reporting", "Working SEO dashboard — iterative builds before canonical."),
        FleetSite("subscription-quota-hq", "Subscription Quota HQ", "automation", "live", "reporting", "Controls subscriptions & quotas — see limits before you hit them."),
        FleetSite("traffic-sim-dashboard", "Traffic Sim", "analytics", "live", "reporting + alerts", "Simulates traffic — test changes before they go live."),
        FleetSite("indexer-dashboard", "Indexer Dashboard", "technical", "live", "analytics + alerts", "Manages indexation & crawl budget — what is indexed and stuck."),
        FleetSite("agentic-os-dashboard", "Agentic OS Dashboard", "automation", "live", "reporting + automation", "The OS for your agents — runs and observes workflows."),
        FleetSite("rep-center", "Rep Center", "outreach", "live", "analytics", "Reputation center — reviews and NAP across directories."),
        FleetSite("content-decay-dashboard", "Content Decay Dashboard", "content", "live", "reporting", "Finds decaying content — what lost traffic and what to refresh."),
        FleetSite("service-vault", "Service Vault", "automation", "live", "analytics", "Secure vault for service credentials — keys by name, never in code."),
        FleetSite("status-page", "Status Page", "technical", "live", "reporting + alerts", "Public fleet status — uptime at a glance."),
        FleetSite("clients-automation-dashboard", "Clients Automation", "automation", "beta", "automation", "Automates client ops — recurring tasks without manual runs."),
        FleetSite("wp-command-center", "WP Command Center", "technical", "beta", "automation", "Commands your WordPress fleet — bulk actions from one board."),
        FleetSite("site-vault", "Site Vault", "technical", "beta", "alerts", "Your site inventory vault — every site and health in one list."),
        FleetSite("n8n-dashboard-v3", "n8n Dashboard", "automation", "beta", "automation + alerts", "Your n8n workflows — runs, failures, and triggers."),
    )
    val gaps = listOf("SEO", "Design", "Content", "Tech")
    val matrix: List<GapCell> = sites.flatMap { s -> gaps.map { g -> GapCell(s.slug, g, kotlin.math.abs((s.slug.hashCode() + g.hashCode()) % 3)) } }
    // Deduplicated 2026-08-15: 5 NEW (white-space) + 6 ENHANCEMENT (add as tab) — 1 duplicate removed (content-decay already live)
    val ideas = listOf(
        FleetIdea("anomaly-explain-engine", "Anomaly Explain Engine", "analytics", "high", "Build Anomaly Explain Engine: timeline + LLM root-cause + impact. Use GA4+GSC anomalies.", "new", 17, "analytics\u00d7alerts 1/6 (17%) — 5 of 6 analytics dashboards lack alerts", ""),
        FleetIdea("outreach-inbox-commander", "Outreach Inbox Commander", "outreach", "high", "Build Outreach Inbox Commander: thread list + reply score + follow-up timer. Gmail API.", "new", 8, "outreach\u00d7automation 0/2 (8%) — both outreach dashboards analytics-only, no automation", ""),
        FleetIdea("schema-studio", "Schema Studio", "technical", "medium", "Schema Studio is live at https://schema-studio.maximo-seo.ai — improve it rather than rebuilding it.", "shipped", 0, "Shipped 2026-08-16. It was the technical\u00d7visualization white-space; that cell is no longer empty.", ""),
        FleetIdea("design-token-pipeline", "Design Token Pipeline", "design", "medium", "Build Design Token Pipeline: token editor + WP sync + preview frame.", "new", 8, "design\u00d7automation 0/1 (8%) — design-lab is visualization-only", "design-lab"),
        FleetIdea("fleet-cron-observatory", "Fleet Cron Observatory", "automation", "high", "Build Fleet Cron Observatory: cron timeline + failure heatmap + retry. n8n+Vercel logs.", "new", 18, "automation\u00d7alerts 2/11 (18%) — 9 of 11 automation dashboards lack alerting", ""),
        FleetIdea("serp-volatility-war-room", "Enhance Site Intel: SERP Volatility War Room", "seo", "medium", "Enhance site-intel-dashboard with War-Room tab: volatility index + winners/losers + SERP features.", "enhancement", 96, "seo\u00d7analytics 4/4 (96% strong) — site-intel already owns this; gap is feature not missing dashboard", "site-intel-dashboard"),
        FleetIdea("gbp-health-monitor", "Enhance Local SEO: GBP Health Monitor", "local", "medium", "Enhance local-seo-dashboard with Health tab: suspension risk + completeness + photo freshness.", "enhancement", 67, "local\u00d7analytics 2/3 (67% ok) — local domain has local-seo + ai-visibility + rep-center; health is feature", "local-seo-dashboard"),
        FleetIdea("content-brief-autopilot", "Enhance Content Automation: Brief Autopilot", "content", "medium", "Enhance content-automation with Brief Autopilot tab: SERP brief + outline + entity map.", "enhancement", 67, "content\u00d7automation 2/3 (67%) — content-automation + prompt-forge already cover automation", "content-automation"),
        FleetIdea("local-citation-pulse", "Enhance Local SEO: Citation Pulse", "local", "medium", "Enhance local-seo-dashboard with Citation Pulse tab: citation map + NAP diff + fix queue.", "enhancement", 33, "local\u00d7reporting 1/3 (33% gap) — only ai-visibility covers reporting in local; feature-level gap", "local-seo-dashboard"),
        FleetIdea("link-velocity-tracker", "Enhance Competitor Intel: Link Velocity", "outreach", "low", "Enhance competitor-intelligence with Link Velocity tab: velocity chart + anchor mix + risk flag. Ahrefs/Majestic.", "enhancement", 96, "outreach\u00d7analytics 2/2 (96% strong) — outreach saturated; velocity is feature inside intel hub", "competitor-intelligence"),
        FleetIdea("cwv-budget-guard", "Enhance SiteWatch: CWV Budget Guard", "technical", "medium", "Enhance sitewatch with CWV Guard tab: LCP/CLS/INP gauges + budget bar + deploy gate. Lighthouse CI.", "enhancement", 86, "technical\u00d7alerts 6/7 (86% strong) — technical alerts saturated; CWV guard is feature", "sitewatch"),
    )
    val generatedPool = listOf(
        FleetIdea("seo-crawl-budget-sentinel", "SEO Crawl Budget Sentinel", "seo", "medium", "Build SEO Crawl Budget Sentinel: budget gauge + waste list + priority queue.", "new", 22, "Derived: seo reporting 22% gap — sentinel white-space", ""),
        FleetIdea("content-freshness-radar", "Content Freshness Radar", "content", "medium", "Build Content Freshness Radar: heatmap + decay alerts + refresh queue.", "new", 18, "Derived: content alerts 18% white-space", ""),
        FleetIdea("local-rank-pulse", "Local Rank Pulse", "local", "high", "Build Local Rank Pulse: grid pack tracker + volatility + competitor overlay.", "new", 28, "Derived: local alerts 28% gap", ""),
        FleetIdea("analytics-cohort-explorer", "Analytics Cohort Explorer", "analytics", "medium", "Build Analytics Cohort Explorer: cohort table + retention curve + segment builder.", "new", 22, "Derived: analytics vis 22% gap", ""),
        FleetIdea("automation-webhook-health", "Automation Webhook Health", "automation", "high", "Build Automation Webhook Health: timeline + failure rate + retry queue.", "new", 18, "Derived: automation alerts 18%", ""),
        FleetIdea("design-system-diff", "Design System Diff", "design", "medium", "Build Design System Diff: token diff + visual diff + approval queue.", "new", 32, "Derived: design reporting 32% gap", ""),
        FleetIdea("outreach-reply-predictor", "Outreach Reply Predictor", "outreach", "high", "Build Outreach Reply Predictor: reply score + follow-up timer + template suggest.", "new", 8, "Derived: outreach automation 8%", ""),
        FleetIdea("technical-dependency-map", "Technical Dependency Map", "technical", "medium", "Build Technical Dependency Map: graph + risk hotspots + change impact.", "new", 8, "Derived: technical vis 8%", ""),
        FleetIdea("geo-answer-share-tracker", "GEO Answer Share Tracker", "local", "high", "Build GEO Answer Share Tracker: share by engine + coverage + citation map.", "new", 28, "Derived: local analytics 28% gap", ""),
        FleetIdea("client-ops-health-board", "Client Ops Health Board", "analytics", "high", "Build Client Ops Health Board: health score + risk list + usage meter.", "new", 18, "Derived: analytics automation 18%", ""),
        FleetIdea("ai-search-health-gate", "AI Search Health Gate", "seo", "high", "Build AI Search Health Gate: bot allow matrix + llms.txt validity + AI readiness score.", "new", 17, "Research 2026-08-16: semrush.com — 140+ checks + AI Search health for ChatGPT-User/Perplexity-User/Claude-SearchBot", ""),
        FleetIdea("health-score-timeline", "Health Score Timeline", "technical", "medium", "Build Health Score Timeline: 0-100 score + sparkline + Top 5 + compare audits.", "enhancement", 42, "Research 2026-08-16: seranking.com/website-audit.html — Health score + Compare audits", "seo-audit-dashboard"),
        FleetIdea("gbp-health-benchmark", "GBP Health & Competitor Benchmark", "local", "high", "Build GBP Health & Competitor Benchmark: 30+ signals, benchmark, fix queue.", "enhancement", 33, "Research 2026-08-16: brightlocal + searchops — 30+ signals 0-100, 5 rivals", "local-seo-dashboard"),
        FleetIdea("aeo-answer-share-tracker", "AEO Answer Share Tracker", "local", "high", "Build AEO Answer Share Tracker: visibility, share of voice, prompt tracker, citation map.", "new", 28, "Research 2026-08-16: hubspot.com + aeotable.com — visibility + share + prompt + citation", ""),
        FleetIdea("geo-monitor-audit", "GEO Monitor & 10-Point Audit", "analytics", "high", "Build GEO Monitor & 10-Point Audit: 6-engine scan, mention analytics, audit.", "enhancement", 22, "Research 2026-08-16: geomonitor.app + viaudit.com — 6-7 engines, 25-factor audit", "ai-visibility-dashboard"),
        FleetIdea("content-decay-recovery-queue", "Content Decay Recovery Queue", "content", "high", "Build Content Decay Recovery Queue: GSC 90d delta, >20% flag, urgency, queue.", "new", 42, "Research 2026-08-16: refreshagent.com + seobolt.io + prorank.io — 20% drop/90d", ""),
        FleetIdea("white-label-client-reports", "White-Label Client Reports", "automation", "medium", "Build White-Label Client Reports: guest link, brand kit, scheduled send.", "enhancement", 18, "Research 2026-08-16: seranking.com — guest links + white-label", "report-engine"),
        FleetIdea("cwv-budget-gate-lhci", "CWV Budget Gate (Lighthouse CI)", "technical", "high", "Build CWV Budget Gate (LHCI): lighthouserc.js + budget.json, median-of-3.", "enhancement", 18, "Research 2026-08-16: web.dev + qaskills.sh — collect->assert->upload + median-of-3", "sitewatch2"),
    )
    val allIdeas: List<FleetIdea> get() = ideas + generatedPool
}
