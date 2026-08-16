package ai.maximo.ideaslab.data

data class FleetSite(val slug: String, val name: String, val domain: String, val status: String, val stack: String)
data class FleetIdea(val slug: String, val title: String, val category: String, val impact: String, val prompt: String, val kind: String = "new", val gapScore: Int = 0, val evidence: String = "", val targetSlug: String = "")
data class GapCell(val site: String, val gap: String, val level: Int)

object FleetData {
    val sites = listOf(
        FleetSite("fleet-hub", "Fleet Hub", "automation", "live", "reporting + automation"),
        FleetSite("fleet-ideas-lab", "Fleet Ideas Lab", "automation", "live", "reporting + automation"),
        FleetSite("schema-studio", "Schema Studio", "technical", "live", "visualization + reporting"),
        FleetSite("content-automation", "Content Automation", "content", "live", "automation"),
        FleetSite("report-engine", "Report Engine", "analytics", "live", "reporting"),
        FleetSite("sitewatch", "SiteWatch", "technical", "live", "reporting + alerts"),
        FleetSite("sitewatch2", "SiteWatch 2", "technical", "live", "reporting + alerts"),
        FleetSite("site-intel-dashboard", "Site Intel Dashboard", "seo", "live", "analytics + reporting"),
        FleetSite("fleet-command-center", "Fleet Command Center", "automation", "live", "automation"),
        FleetSite("seo-analytics-hub", "SEO Analytics Hub", "analytics", "live", "analytics + reporting"),
        FleetSite("seo-audit-dashboard", "SEO Audit Dashboard", "seo", "live", "analytics + alerts"),
        FleetSite("seo-dashboard", "SEO Dashboard", "seo", "live", "analytics + reporting"),
        FleetSite("prompt-forge-code", "Prompt Forge Code", "automation", "live", "automation + alerts"),
        FleetSite("loop-engineering-dashboard", "Loop Engineering", "automation", "live", "reporting + automation"),
        FleetSite("prompt-forge", "Prompt Forge", "content", "live", "automation"),
        FleetSite("github-repos-radar", "GitHub Repos Radar", "technical", "live", "reporting + alerts"),
        FleetSite("dashboards-panel", "Dashboards Panel", "analytics", "live", "reporting + visualization"),
        FleetSite("design-lab", "Design Lab", "design", "live", "visualization"),
        FleetSite("local-seo-dashboard", "Local SEO Dashboard", "local", "live", "analytics"),
        FleetSite("competitor-intelligence", "Competitor Intelligence", "outreach", "live", "analytics"),
        FleetSite("competitor-intelligence-dashboard", "Competitor Intelligence Dashboard", "outreach", "live", "analytics"),
        FleetSite("ai-visibility-dashboard", "AI Visibility Dashboard", "local", "live", "reporting"),
        FleetSite("central-brain-dashboard", "Central Brain Dashboard", "analytics", "live", "reporting + automation"),
        FleetSite("brain-dashboard-maximo-seo", "Brain Dashboard", "analytics", "live", "reporting + automation"),
        FleetSite("agent-fleet", "Agent Fleet", "automation", "live", "automation"),
        FleetSite("seo-dashboard-work", "SEO Dashboard Work", "seo", "live", "analytics + reporting"),
        FleetSite("subscription-quota-hq", "Subscription Quota HQ", "automation", "live", "reporting"),
        FleetSite("traffic-sim-dashboard", "Traffic Sim", "analytics", "live", "reporting + alerts"),
        FleetSite("indexer-dashboard", "Indexer Dashboard", "technical", "live", "analytics + alerts"),
        FleetSite("agentic-os-dashboard", "Agentic OS Dashboard", "automation", "live", "reporting + automation"),
        FleetSite("rep-center", "Rep Center", "outreach", "live", "analytics"),
        FleetSite("content-decay-dashboard", "Content Decay Dashboard", "content", "live", "reporting"),
        FleetSite("service-vault", "Service Vault", "automation", "live", "analytics"),
        FleetSite("status-page", "Status Page", "technical", "live", "reporting + alerts"),
        FleetSite("clients-automation-dashboard", "Clients Automation", "automation", "beta", "automation"),
        FleetSite("wp-command-center", "WP Command Center", "technical", "beta", "automation"),
        FleetSite("site-vault", "Site Vault", "technical", "beta", "alerts"),
        FleetSite("n8n-dashboard-v3", "n8n Dashboard", "automation", "beta", "automation + alerts"),
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
    )
    val allIdeas: List<FleetIdea> get() = ideas + generatedPool
}
