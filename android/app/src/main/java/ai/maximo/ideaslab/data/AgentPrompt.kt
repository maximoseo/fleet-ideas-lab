package ai.maximo.ideaslab.data

fun gapLabel(n: Int): String = when {
  n < 30 -> "white-space"
  n < 50 -> "gap"
  n < 70 -> "ok"
  else -> "strong"
}

fun buildAgentPrompt(idea: FleetIdea): String {
  val isNew = idea.kind == "new"
  val target = if (idea.targetSlug.isNotEmpty()) "`" + idea.targetSlug + "`" else "\u2014"
  val dir = if (isNew) "`/root/projects/" + idea.slug + "` (or `/tmp/" + idea.slug + "` on Vercel preview \u2014 ephemeral)" else "`/root/projects/" + idea.slug + "` as feature branch for " + target + " (merge as tab inside " + target + ")"
  val gapLine = "Gap " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Evidence: " + idea.evidence
  val screenName = idea.slug.split("-").joinToString("") { it.replaceFirstChar { c -> c.uppercase() } }
  val lines = mutableListOf<String>()
  lines.add("# " + idea.title + " \u2014 Agent Build Brief")
  lines.add("> Slug: `" + idea.slug + "` \u00b7 Category: " + idea.category + " \u00b7 Kind: " + idea.kind + (if (idea.targetSlug.isNotEmpty()) " \u2192 " + target else "") + " \u00b7 Impact " + idea.impact)
  lines.add("> Gap: " + gapLine)
  lines.add("")
  lines.add("## 1) Idea Summary")
  // Use prompt as description — FleetData prompt already contains problem/solution gist
  lines.add(idea.prompt)
  lines.add("")
  lines.add("## 2) Where to Build")
  if (isNew) {
    lines.add("- **New standalone dashboard.** Scaffold at " + dir + ". Deploy to `https://" + idea.slug + ".maximo-seo.ai` (or `https://" + idea.slug + ".vercel.app` preview). Add to `src/lib/fleet.ts` only after Vercel alias is live.")
  } else {
    lines.add("- **Enhancement \u2014 add as tab/feature inside " + target + ".** Scaffold at " + dir + " as a working branch, then merge into `" + idea.targetSlug + "/app/<feature>` . Do NOT create a new Vercel project.")
  }
  lines.add("- Inventory: 37 verified dashboards (2026-08-15 audit, Vercel team maximo-seo). Deduplicated \u2014 see evidence line.")
  lines.add("")
  lines.add("## 3) Build Plan \u2014 Web (Next.js 16 + Tailwind 4 + violet)")
  lines.add("- Scaffolding: `/api/fleet/scaffold` creates `package.json + README.md` at `" + idea.slug + "` (Vercel \u2192 `/tmp`, Hostinger \u2192 `/root/projects`). Then `npm install && npm run dev`.")
  lines.add("- Pages: " + (if (isNew) "`app/page.tsx` (dashboard)" else "`app/<feature>/page.tsx` inside target") + " + `app/api/` for data. Keep violet tokens, safe-area `pb-[calc(88px+env(safe-area-inset-bottom))]`, TrustLine footer.")
  lines.add("- Data: TBD (vault) \u2014 see web brief for specifics")
  lines.add("")
  lines.add("## 4) Build Plan \u2014 Android Native (Kotlin + Compose, package ai.maximo.ideaslab)")
  if (isNew) {
    lines.add("- Location: `android/app/src/main/java/ai/maximo/ideaslab/ui/screens/" + screenName + "Screen.kt` \u2014 new screen + nav route")
  } else {
    lines.add("- Location: `.../ui/screens/" + idea.targetSlug + "/" + screenName + "Tab.kt` inside existing target screens")
  }
  lines.add("- Navigation: add route `" + idea.slug + "` to `AppNav.kt`. Keep Material3 + EncryptedSharedPreferences.")
  lines.add("- UI: Compose PullRefresh, LazyColumn with contentPadding bottom 88dp, violet #7C3AED badges.")
  lines.add("- Deep links: `fleetideaslab://" + idea.slug + "` + `https://fleet-ideas-lab.vercel.app/" + idea.slug + "` if standalone.")
  lines.add("")
  lines.add("## 5) Data Sources")
  lines.add("- TBD (vault) \u2014 mark unknown keys as `TBD (vault)`")
  lines.add("- Inventory truth: 37 live Vercel aliases + GAP_SCORES derived coverage. No invented metrics.")
  lines.add("")
  lines.add("## 6) Evidence & Gap")
  lines.add("- " + idea.evidence)
  lines.add("- GapScore: " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Kind: " + idea.kind + (if (idea.targetSlug.isNotEmpty()) " \u2192 " + target else ""))
  lines.add("")
  lines.add("## 7) Acceptance Criteria")
  lines.add("- [ ] npx tsc --noEmit 0")
  lines.add("- [ ] npm run build 38 routes OK")
  if (isNew) lines.add("- [ ] New alias live (HEAD 200) or preview /tmp verified") else lines.add("- [ ] Feature visible as tab inside " + target)
  lines.add("- [ ] POST /api/fleet/scaffold with dl_session \u2192 200 (dir `/tmp/" + idea.slug + "` on Vercel), without auth \u2192 401, duplicate \u2192 409")
  lines.add("- [ ] Android assembleRelease signed v2 true")
  lines.add("- [ ] No invented NAP/$/reviews")
  lines.add("")
  lines.add("## 8) Next Step")
  lines.add("- Scaffold via Fleet Ideas Lab, then implement per brief. Prompt source: Fleet Ideas Lab `" + idea.slug + "`")
  return lines.joinToString("\n")
}
