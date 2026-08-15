package ai.maximo.ideaslab.data

data class FleetSite(val slug: String, val name: String, val domain: String, val status: String, val stack: String)
data class FleetIdea(val slug: String, val title: String, val category: String, val impact: String, val prompt: String)
data class GapCell(val site: String, val gap: String, val level: Int)

object FleetData {
    val sites = listOf(
        FleetSite("fleet-hub", "Fleet Hub", "automation", "live", "reporting + automation"),
        FleetSite("fleet-ideas-lab", "Fleet Ideas Lab", "automation", "live", "reporting + automation"),
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
    val ideas = listOf(
        FleetIdea("serp-volatility-war-room", "SERP Volatility War Room", "seo", "high", "Build SERP Volatility War Room: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("content-decay-radar", "Content Decay Radar", "content", "high", "Build Content Decay Radar: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("gbp-health-monitor", "GBP Health Monitor", "local", "high", "Build GBP Health Monitor: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("anomaly-explain-engine", "Anomaly Explain Engine", "analytics", "high", "Build Anomaly Explain Engine: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("outreach-inbox-commander", "Outreach Inbox Commander", "outreach", "medium", "Build Outreach Inbox Commander: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("schema-studio", "Schema Studio", "technical", "medium", "Build Schema Studio: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("design-token-pipeline", "Design Token Pipeline", "design", "medium", "Build Design Token Pipeline: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("content-brief-autopilot", "Content Brief Autopilot", "content", "high", "Build Content Brief Autopilot: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("local-citation-pulse", "Local Citation Pulse", "local", "medium", "Build Local Citation Pulse: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("fleet-cron-observatory", "Fleet Cron Observatory", "automation", "high", "Build Fleet Cron Observatory: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("link-velocity-tracker", "Link Velocity Tracker", "outreach", "low", "Build Link Velocity Tracker: see fleet-ideas-lab /ideas for full prompt"),
        FleetIdea("cwv-budget-guard", "CWV Budget Guard", "technical", "high", "Build CWV Budget Guard: see fleet-ideas-lab /ideas for full prompt"),
    )
}