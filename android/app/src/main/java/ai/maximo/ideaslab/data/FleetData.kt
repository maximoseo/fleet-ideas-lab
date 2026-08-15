package ai.maximo.ideaslab.data

data class FleetSite(val slug: String, val name: String, val domain: String, val status: String, val stack: String)
data class FleetIdea(val id: String, val title: String, val prompt: String, val slug: String, val category: String, val impact: String)
data class GapCell(val site: String, val gap: String, val level: Int) // 0 none, 1 low, 2 high

object FleetData {
    val sites = listOf(
        FleetSite("fleet-ideas-lab", "Fleet Ideas Lab", "fleet-ideas-lab.maximo-seo.ai", "live", "Next 16 • Tailwind 4"),
        FleetSite("design-lab", "Design Lab", "design-lab.maximo-seo.ai", "live", "Next 16 • Compose"),
        FleetSite("seo-audit-pro", "SEO Audit Pro", "seo-audit-pro.maximo-seo.ai", "live", "Next 15 • Python"),
        FleetSite("rank-tracker", "Rank Tracker", "rank-tracker.maximo-seo.ai", "live", "Next 14 • TS"),
        FleetSite("content-forge", "Content Forge", "content-forge.maximo-seo.ai", "beta", "Next 16 • LLM"),
        FleetSite("link-graph", "Link Graph", "link-graph.maximo-seo.ai", "beta", "Next 15 • D3"),
        FleetSite("local-pack", "Local Pack", "local-pack.maximo-seo.ai", "live", "Next 16 • Maps"),
        FleetSite("schema-lab", "Schema Lab", "schema-lab.maximo-seo.ai", "live", "Next 15 • JSON-LD"),
        FleetSite("page-speed-lab", "Page Speed Lab", "page-speed-lab.maximo-seo.ai", "live", "Next 16 • Lighthouse"),
        FleetSite("keyword-atlas", "Keyword Atlas", "keyword-atlas.maximo-seo.ai", "live", "Next 15 • BigQuery"),
        FleetSite("serp-vision", "SERP Vision", "serp-vision.maximo-seo.ai", "wip", "Next 16 • Vision"),
        FleetSite("outreach-hub", "Outreach Hub", "outreach-hub.maximo-seo.ai", "wip", "Next 16 • Mail"),
    )

    val ideas = listOf(
        FleetIdea("i1", "Fleet Health Radar", "Dashboard idea: Fleet Health Radar — real-time fleet grid with status chips (live/beta/wip), stack badges, last deploy, gap signal. Palette violet #7C3AED on #0C0A14. Bento hero.", "fleet-health-radar", "Inventory", "high"),
        FleetIdea("i2", "Gap Matrix Heatmap", "Dashboard idea: Gap Matrix — sites × {SEO, Design, Content, Tech} heatmap (0/1/2). Click cell to see fix list + copy prompt.", "gap-matrix", "Gaps", "high"),
        FleetIdea("i3", "Idea Forge 12", "Dashboard idea: 12 idea cards (this list) with Copy prompt + Scaffold slug action. Filter by category/impact.", "idea-forge", "Ideas", "high"),
        FleetIdea("i4", "Scaffold Studio", "Dashboard idea: Slug input → POST /api/fleet/scaffold with dl_session cookie → zip scaffold dl.", "scaffold-studio", "Create", "high"),
        FleetIdea("i5", "Deploy Pulse", "Dashboard idea: Deploy pulse — timeline of fleet deploys, owner, diff link, vercel status.", "deploy-pulse", "Inventory", "med"),
        FleetIdea("i6", "Content Canopy", "Dashboard idea: Content canopy — coverage map by topic cluster, word count, internal links.", "content-canopy", "Content", "med"),
        FleetIdea("i7", "Tech Debt Ledger", "Dashboard idea: Tech debt ledger — outdated deps, build warnings, bundle size per site.", "tech-debt-ledger", "Tech", "med"),
        FleetIdea("i8", "Design Drift Detector", "Dashboard idea: Drift detector — screenshot diff vs design tokens, slop score per site.", "drift-detector", "Design", "med"),
        FleetIdea("i9", "Keyword Orbit", "Dashboard idea: Keyword orbit — radial map of fleet keywords, overlap, cannibalization risk.", "keyword-orbit", "SEO", "med"),
        FleetIdea("i10", "Revenue Ridge", "Dashboard idea: Revenue ridge — MRR/ARPU per site, churn, expansion, fleet total.", "revenue-ridge", "Business", "high"),
        FleetIdea("i11", "Auto-Fix Queue", "Dashboard idea: Auto-fix queue — gap → suggested fix → one-click apply (PR draft).", "autofix-queue", "Gaps", "high"),
        FleetIdea("i12", "Fleet Changelog", "Dashboard idea: Changelog — curated fleet updates, with share /ideas → markdown export.", "fleet-changelog", "Inventory", "low"),
    )

    val gaps = listOf("SEO", "Design", "Content", "Tech")
    // simple mock gap levels
    val matrix: List<GapCell> = sites.flatMap { s ->
        gaps.map { g ->
            // deterministic hash -> 0/1/2
            val h = (s.slug.hashCode() + g.hashCode()).let { if(it<0) -it else it } % 3
            GapCell(s.slug, g, h)
        }
    }
}
