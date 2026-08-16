package ai.maximo.ideaslab.data

fun gapLabel(n: Int): String = when {
  n < 30 -> "white-space"
  n < 50 -> "gap"
  n < 70 -> "ok"
  else -> "strong"
}

fun lookupProject(slug: String): FleetSite? = FleetData.sites.find { it.slug == slug }

// ── SHARED HEADER ──
private fun header(idea: FleetIdea): List<String> {
  val target = if (idea.targetSlug.isNotEmpty()) "`" + idea.targetSlug + "`" else "\u2014"
  val gapLine = "Gap " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Evidence: " + idea.evidence
  return listOf(
    "> **Slug:** `" + idea.slug + "` \u00b7 **Category:** " + idea.category + " \u00b7 **Kind:** " + idea.kind + (if (idea.targetSlug.isNotEmpty()) " \u2192 " + target else "") + " \u00b7 **Impact:** " + idea.impact,
    "> **Why now:** " + when { idea.prompt.contains("Why") -> idea.prompt.take(160) ; else -> idea.prompt.take(160) },
    "> **Gap:** " + gapLine,
    "> **Source idea:** `" + idea.slug + "` \u00b7 Fleet Ideas Lab (37 verified dashboards, Vercel team maximo-seo, 2026-08-15 audit)"
  )
}

// ══════════════════════════════════════════════════════════════════
// BUILD — brand-new dashboard / APK
// ══════════════════════════════════════════════════════════════════
fun buildAgentPrompt(idea: FleetIdea): String {
  val isNew = idea.kind == "new"
  val target = if (idea.targetSlug.isNotEmpty()) "`" + idea.targetSlug + "`" else "\u2014"
  val dir = if (isNew) "`/root/projects/" + idea.slug + "` (or `/tmp/" + idea.slug + "` on Vercel preview \u2014 ephemeral)" else "`/root/projects/" + idea.slug + "` as feature branch for " + target + " (merge as tab inside " + target + ")"
  val widgets = idea.prompt // FleetData prompt already enumerates widgets
  val screenName = idea.slug.split("-").joinToString("") { it.replaceFirstChar { c -> c.uppercase() } }
  val lines = mutableListOf<String>()
  lines.add("BUILD:")
  lines.add("# " + idea.title + " \u2014 Agent Build Brief (NEW)")
  lines.add("")
  lines.addAll(header(idea))
  lines.add("")
  lines.add("## 1. Objective")
  lines.add("- **Goal / JTBD:** Build \u201C" + idea.title + "\u201D so mobile + web ops triage this gap in one screen.")
  lines.add("- **Outcome:** " + idea.evidence)
  lines.add("- **Success:** Ops uses it daily; gap " + idea.gapScore + "% moves toward strong; no invented data.")
  lines.add("")
  lines.add("## 2. Scope & Deliverables")
  if (isNew) lines.add("- **New standalone dashboard.** Scaffold at " + dir + ". Deploy to `https://" + idea.slug + ".maximo-seo.ai` (preview `https://" + idea.slug + ".vercel.app`).")
  else lines.add("- **Add as tab inside " + target + ".** Scaffold at " + dir + " then merge into `" + idea.targetSlug + "/app/<feature>`. No new Vercel project.")
  lines.add("- **Web:** Next.js 16.2 + Tailwind 4 + App Router, violet tokens, SiteHeader + TrustLine + \u2318K palette.")
  lines.add("- **Android:** Kotlin 2.0 + Compose BOM 2024.12 + Navigation + DataStore + `ai.maximo.ideaslab` (min 24 target 36) \u2014 new `.../ui/screens/" + screenName + "Screen.kt` + nav route. PullRefresh + 88dp + EncryptedSharedPreferences.")
  lines.add("- **Ops:** Vercel deploy + signed APK v2 + fleet-history trace.")
  lines.add("")
  lines.add("## 3. Functional Requirements")
  lines.add("- Operator opens `" + idea.slug + "` and sees: " + widgets.take(180))
  lines.add("- Gap Radar drill-in shows why this exists (inline Evidence).")
  lines.add("- Copy brief \u2192 agent scaffold works; logged to /api/fleet/history.")
  lines.add("- Mobile pull-to-refresh + \u2661/\u2665 favorites, 88dp clear on 320/360/600dp.")
  lines.add("")
  lines.add("## 4. Technical Constraints")
  lines.add("- Vercel FS read-only except /tmp (ephemeral on prod \u2192 clone to /root/projects/" + idea.slug + " on srv1813877).")
  lines.add("- Node 22, Turnstile 0x4AAAAAEQ fail-CLOSED (403), dl_session HTTP-only, vault keys by name only (TBD).")
  lines.add("")
  lines.add("## 5. Design Guidelines")
  lines.add("- Violet #7C3AED on #0f0b1a, 48dp, pb-[calc(88px+env(safe-area))] / contentPadding 88dp+navigationBars, TrustLine, RTL-ready.")
  lines.add("- Empty/loading/error + palette (37+11+40).")
  lines.add("")
  lines.add("## 6. Data Sources & Integration")
  lines.add("- This dashboard: " + widgets.take(200))
  lines.add("- Fleet truth: 37 aliases + GAP_SCORES derived. Unknown \u2192 TBD (vault).")
  lines.add("")
  lines.add("## 7. Performance & Security Metrics")
  lines.add("- Web 38 routes, APK \u226414M v2 true, cold start \u22641.2s, no secret in repo.")
  lines.add("")
  lines.add("## 8. Deliverables")
  lines.add("- Web page + API + Android screen + scaffold README + deploy + APK bump.")
  lines.add("")
  lines.add("## 9. Timeline & Milestones")
  lines.add("- M0 Scaffold \u2192 M1 Wiring \u2192 M2 Polish \u2192 M3 Proofs (tsc/build/APK/alias).")
  lines.add("")
  lines.add("## 10. Acceptance Criteria")
  lines.add("- [ ] tsc 0, build 38+ routes, alias HEAD 200, scaffold 200/401/409, APK v2 true, no invented data, paste-to-agent works.")
  lines.add("")
  lines.add("## 11. Next Step")
  lines.add("- Scaffold via Fleet Ideas Lab, then implement per \u00a72\u20138. Source `" + idea.slug + "` \u2014 paste BUILD: Markdown into agent.")
  return lines.joinToString("\n")
}

fun buildImprovePrompt(idea: FleetIdea): String {
  val targetSlug = if (idea.targetSlug.isNotEmpty()) idea.targetSlug else idea.slug
  val existing = lookupProject(targetSlug)
  val existingName = existing?.name ?: targetSlug
  val existingUrl = existing?.let { "https://" + it.slug + ".maximo-seo.ai" } ?: ("https://" + targetSlug + ".maximo-seo.ai")
  val lines = mutableListOf<String>()
  lines.add("IMPROVE:")
  lines.add("# Improve " + existingName + " \u2014 via " + idea.title + " (existing dashboard/APK)")
  lines.add("")
  lines.add("> **Target:** `" + targetSlug + "` (" + existingName + ") \u00b7 `" + existingUrl + "`")
  lines.add("> **Idea:** `" + idea.slug + "` \u00b7 **Kind:** enhancement \u00b7 **Impact:** " + idea.impact)
  lines.add("> **Gap:** Gap " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 " + idea.evidence.take(120))
  lines.add("")
  lines.add("## 1. Objective")
  lines.add("- Improve `" + targetSlug + "` \u2014 add \u201C" + idea.title.replace("Enhance ", "") + "\u201D without breaking existing screens.")
  lines.add("")
  lines.add("## 2. Scope \u2014 Existing Surface")
  lines.add("- Target `" + targetSlug + "` at `" + existingUrl + "` \u2014 discover current tabs/routes before editing; additive only.")
  lines.add("- Add one tab \u201C" + idea.title.replace("Enhance ", "") + "\u201D (app/<feature>/page.tsx or Tab.kt). Scaffold at /root/projects/" + idea.slug + " as branch for " + targetSlug + ".")
  lines.add("")
  lines.add("## 3. Functional Requirements \u2014 Delta")
  lines.add("- Before: " + idea.prompt.take(160))
  lines.add("- After: tab shows " + idea.prompt.take(160) + " (derived gap " + idea.gapScore + "%).")
  lines.add("")
  lines.add("## 4. Technical Constraints \u2014 Existing Repo")
  lines.add("- Additive only, feature-flag if risky, Vercel /tmp ephemeral \u2192 clone to host, reuse ApiClient/SessionStore.")
  lines.add("")
  lines.add("## 5. Design Guidelines \u2014 Consistency")
  lines.add("- Match " + targetSlug + " tokens (violet #7C3AED if Fleet-family), statusBarsPadding + 88dp, TrustLine.")
  lines.add("")
  lines.add("## 6. Data Sources \u2014 Reuse + Add")
  lines.add("- Reuse target sources; add vault keys by name only (TBD until wired).")
  lines.add("")
  lines.add("## 7. Performance & Security \u2014 Regression Guard")
  lines.add("- Bundle +<5%, APK +<1M, no p95 regression, v2 true, Turnstile still 403.")
  lines.add("")
  lines.add("## 8. Deliverables \u2014 Patch")
  lines.add("- Diff/PR vs " + targetSlug + " + preview deploy + history trace kind:scaffold targetSlug:" + targetSlug)
  lines.add("")
  lines.add("## 9. Timeline \u2014 Patch")
  lines.add("- M0 Scaffold branch \u2192 M1 Wire mock \u2192 M2 Polish \u2192 M3 Proofs (rollback = delete branch).")
  lines.add("")
  lines.add("## 10. Acceptance \u2014 Before/After Proof")
  lines.add("- [ ] curl -I " + existingUrl + " before vs after (tab 200), tsc 0, build 38+, pull/fav work, history shows targetSlug.")
  lines.add("")
  lines.add("## 11. Next Step")
  lines.add("- Paste IMPROVE: Markdown into agent; it patches " + targetSlug + ", not a new project.")
  return lines.joinToString("\n")
}

fun buildImprovePromptForProject(site: FleetSite): String {
  val lines = mutableListOf<String>()
  lines.add("IMPROVE:")
  lines.add("# Improve " + site.name + " \u2014 General Optimization Brief")
  lines.add("")
  lines.add("> **Target:** `" + site.slug + "` (" + site.name + ") \u00b7 https://" + site.slug + ".maximo-seo.ai")
  lines.add("> **Domain:** " + site.domain + " \u00b7 **Status:** " + site.status + " \u00b7 **Stack:** " + site.stack)
  lines.add("")
  lines.add("## 1. Objective")
  lines.add("- Make `" + site.slug + "` better without a new dashboard \u2014 audit gaps, propose 1\u20133 additive tabs.")
  lines.add("")
  lines.add("## 2. Scope \u2014 Existing Surface")
  lines.add("- Discover current tabs/routes via src/app or APK, propose deltas inside " + site.slug + ".")
  lines.add("")
  lines.add("## 3. Functional Requirements \u2014 Delta")
  lines.add("- Derive gaps (domain\u00d7capability) \u2192 top gap \u2192 one tab with 3\u20134 widgets (SEO: SERP/CWV, Local: GBP, etc.).")
  lines.add("")
  lines.add("## 4. Technical Constraints")
  lines.add("- Additive only, feature-flag if risky, Vercel /tmp \u2192 host, no new project.")
  lines.add("")
  lines.add("## 5. Design Guidelines")
  lines.add("- Match " + site.slug + " tokens, statusBarsPadding + 88dp, no regression at 320/360/600dp.")
  lines.add("")
  lines.add("## 6. Data Sources")
  lines.add("- Reuse + add vault keys by name (TBD).")
  lines.add("")
  lines.add("## 7. Performance & Security")
  lines.add("- No regression, APK v2 true, Turnstile 403.")
  lines.add("")
  lines.add("## 8. Deliverables \u2014 Patch")
  lines.add("- Diff/PR + preview deploy + history trace.")
  lines.add("")
  lines.add("## 9. Timeline")
  lines.add("- M0 Scaffold \u2192 M1 Wire \u2192 M2 Polish \u2192 M3 Proofs.")
  lines.add("")
  lines.add("## 10. Acceptance")
  lines.add("- [ ] curl before vs after, tsc 0, build 38+, tab works, history shows targetSlug.")
  lines.add("")
  lines.add("## 11. Next Step")
  lines.add("- Scaffold with targetSlug:" + site.slug + " then implement. Paste IMPROVE: Markdown.")
  return lines.joinToString("\n")
}
