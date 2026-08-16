import type { FleetIdea, FleetProjectUI } from "./fleet";
import { FLEET_PROJECTS } from "./fleet";

function gapLabel(n: number): string {
  if (n < 30) return "white-space";
  if (n < 50) return "gap";
  if (n < 70) return "ok";
  return "strong";
}

function lookupProject(slug: string): FleetProjectUI | undefined {
  return FLEET_PROJECTS.find((pr) => pr.slug === slug);
}

// ── Shared helpers ──
function header(idea: FleetIdea): string[] {
  const target = idea.targetSlug ? "`" + idea.targetSlug + "`" : "\u2014";
  const gapLine = "Gap " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Evidence: " + idea.evidence;
  return [
    "> **Slug:** `" + idea.slug + "` \u00b7 **Domain:** " + idea.domain + " \u00b7 **Kind:** " + idea.kind + (idea.targetSlug ? " \u2192 " + target : "") + " \u00b7 **Effort:** " + idea.effort + " \u00b7 **Priority:** " + idea.priority + " \u00b7 **Impact:** " + idea.impact + " \u00b7 **Status:** " + idea.status,
    "> **Why now:** " + idea.whyNow,
    "> **Gap:** " + gapLine,
    "> **Source idea:** `" + idea.id + "` \u00b7 Fleet Ideas Lab (37 verified dashboards, Vercel team maximo-seo, 2026-08-15 audit)",
  ];
}

// ══════════════════════════════════════════════════════════════════
// BUILD — brand-new dashboard / APK
// ══════════════════════════════════════════════════════════════════
export function buildAgentPrompt(idea: FleetIdea): string {
  const isNew = idea.kind === "new";
  const target = idea.targetSlug ? "`" + idea.targetSlug + "`" : "\u2014";
  const dir = isNew
    ? "`/root/projects/" + idea.slug + "` (or `/tmp/" + idea.slug + "` on Vercel preview \u2014 ephemeral)"
    : "`/root/projects/" + idea.slug + "` as feature branch for " + target + " (merge as tab inside " + target + ")";
  const gapLine = "Gap " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Evidence: " + idea.evidence;
  const widgets = idea.widgets.map((w) => "- **" + w + "**").join("\n");
  const screenName = idea.slug.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
  const targetSlug = idea.targetSlug || "";

  const lines: string[] = [];
  lines.push("BUILD:");
  lines.push("# " + idea.title + " \u2014 Agent Build Brief (NEW)");
  lines.push("");
  lines.push(...header(idea));
  lines.push("");

  // 1
  lines.push("## 1. Objective");
  lines.push("- **Goal / JTBD:** " + idea.problem);
  lines.push("- **Outcome:** " + idea.benefit);
  lines.push("- **In one sentence:** Build \u201C" + idea.title + "\u201D so that " + idea.solution.replace(/^\w/, (c: string) => c.toLowerCase()));
  lines.push("- **Success looks like:** Ops uses this dashboard daily; gap " + idea.gapScore + "% moves toward strong; no invented data reaches prod.");
  lines.push("");

  // 2
  lines.push("## 2. Scope & Deliverables");
  lines.push("- **Kind:** " + (isNew ? "**New standalone dashboard** — new Vercel project, new alias" : "**Add as tab inside " + target + " — not a new project**") + ". Scaffold at " + dir + ".");
  if (isNew) lines.push("- **Deploy target:** `https://" + idea.slug + ".maximo-seo.ai` (or `https://" + idea.slug + ".vercel.app` preview). Add to `src/lib/fleet.ts` only after alias HEAD 200.");
  else lines.push("- **Deliver inside:** `" + targetSlug + "/app/<feature>` or `src/app/<feature>` — no new Vercel project, merge as tab.");
  lines.push("- **Web:** Next.js 16.2 + Tailwind 4 + App Router (`app/page.tsx`, `app/api/**`). Reuse `src/lib/styles.ts` violet tokens, `SiteHeader` + `TrustLine` + `CommandPalette` (\u2318K).");
  lines.push("- **Android:** Kotlin 2.0 + Compose BOM 2024.12 + Navigation + DataStore + `ai.maximo.ideaslab` package (min 24 target 36) — new `.../ui/screens/" + screenName + "Screen.kt` + nav route. `PullRefresh` + `88dp + navigationBars` + `EncryptedSharedPreferences` retained.");
  lines.push("- **Ops:** Vercel deploy (`vercel --prod`), signed APK (`assembleRelease` v2), `fleet-history.json` trace (`kind: scaffold`), `/api/app/version` bump.");
  lines.push("- **Out of scope:** No migration of the 37, no Vercel quota changes, no Play Store publish.");
  lines.push("");

  // 3
  lines.push("## 3. Functional Requirements (user stories)");
  lines.push("- As an **operator**, I can open `" + idea.slug + "` and see **" + idea.widgets.slice(0, 3).join(", ") + "** without auth beyond `dl_session`.");
  lines.push("- As an **analyst**, I can drill from Gap Radar (`GAP_SCORES` derived) into this dashboard\u2019s coverage and understand \u201Cwhy this exists\u201D via inline Evidence.");
  lines.push("- As a **fleet lead**, I can **`Copy brief` \u2192 paste to agent** and scaffold from Fleet Ideas Lab; copy is logged to `/api/fleet/history` (`kind: copy`).");
  lines.push("- As a **mobile user**, I can pull-to-refresh the new screen and toggle \u2661/\u2665 favorites; list stays scrolled and 88dp clear above BottomBar on 320/360/600dp.");
  lines.push("- Must-have widgets (authoritative):");
  lines.push(widgets);
  lines.push("- Detail: **Problem:** " + idea.problem);
  lines.push("- Detail: **Solution:** " + idea.solution);
  lines.push("- Detail: **Description:** " + idea.description);
  lines.push("");

  // 4
  lines.push("## 4. Technical Constraints");
  lines.push("- **Vercel FS:** Read-only except `/tmp`. `POST /api/fleet/scaffold` checks `process.env.VERCEL===\"1\" ? \"/tmp\" : \"/root/projects\"`. On prod the scaffold is **ephemeral** — must be cloned to `/root/projects/" + idea.slug + "` on `srv1813877` (Hostinger) for persistence; response `{mode: \"vercel-tmp\"}` explains it.");
  lines.push("- **Runtime:** Node 22, `NEXT_PUBLIC_*` vs server secrets separated, no secret echo. Turnstile `0x4AAAAAEQ` siteverify fail-CLOSED (`403` when token empty). `dl_session` cookie (`Encrypted dl_session`).");
  lines.push("- **Rate & quota:** Third-party APIs behind `api-vault-full-2026-08-06.txt` (600); missing keys render `TBD (vault)` — never fake data. Vercel sandbox duration/quota respected.");
  lines.push("- **Repo:** `maximoseo/fleet-ideas-lab` master\u2192main, `src/lib/fleet.ts` remains single source of truth for 37/11/GAP_SCORES. Do not invent metrics.");
  lines.push("");

  // 5
  lines.push("## 5. Design Guidelines");
  lines.push("- **Theme:** Violet `#7C3AED` on `#0f0b1a` / `#1A1428`, 48dp min touch targets, `pb-[calc(88px+env(safe-area-inset-bottom))]` on Web, `contentPadding bottom 88dp + navigationBars` on Android. TrustLine `#F38020` on every page.");
  lines.push("- **Responsive:** `dp` only, `GridCells.Adaptive(minSize=160dp)` for cards, `statusBarsPadding()` for headers, chips wrap, not overflow. RTL-ready, no hardcoded truncation (use `Ellipsis`).");
  lines.push("- **States:** Empty (`\u2606 No favorites yet`), loading (spinner), error (toast + inline `\u2717`), pull indicator (`Pull to reload \u2193 / Release to reload \u21bb`).");
  lines.push("- **A11y:** Contrast, keyboard `\u2318K` palette (37+11+40 indexed), screen-reader labels, `EncryptedSharedPreferences` for session, not raw prefs.");
  lines.push("");

  // 6
  lines.push("## 6. Data Sources & Integration");
  lines.push("- **This dashboard\u2019s data:** " + idea.dataNeeded);
  lines.push("- **Fleet truth:** 37 live Vercel aliases + `GAP_SCORES` (`computeGapScores()` derived, domain\u00d7capability coverage). Never invent NAP/$/reviews/links; unknown \u2192 `TBD (vault)`.");
  lines.push("- **Vault keys by name only:** e.g. `FIRECRAWL_API_KEY`, `V0_API_KEY`, `TURNSTILE_SECRET_KEY`, plus the new dashboard\u2019s APIs — do not print values.");
  lines.push("- **Supabase (optional):** `fleet_history` table when `SUPABASE_*` set, else `fleet-history.json` fallback (`/tmp` on Vercel, `/root/projects` on host, capped 200).");
  lines.push("");

  // 7 — CBC long, agent-proof, cannot be missed (covers New Dashboards & New Apps explicitly)
  lines.push("## 7. CBC \u2014 Component-Based Construction (agent-proof, long-form, NO step may be skipped)");
  lines.push("> **NOTE:** This is a **new project** \u2014 the building agent should **start from scratch** (**New Dashboards and New Apps** \u2014 not an extension of an existing dashboard/app). Treat `" + idea.slug + "` as a **green-field** surface: new repo scaffold, new Vercel project, new Android screen. Do NOT patch an existing dashboard for this idea.");
  lines.push("");
  lines.push("### 7.1 Recommended tools by phase (use the most worthwhile; do not substitute inventively)");
  lines.push("- **Figma** \u2014 wireframe \u2192 tokens (`colors, spacing, radius, typography`) \u2192 handoff to `src/lib/styles.ts` / Compose `Theme`. Export violet `#7C3AED` + dark `#1A1428`.");
  lines.push("- **Storybook + Chromatic** \u2014 one story per widget (`" + idea.widgets.slice(0, 3).join("`, `") + "` etc.), visual diff blocks regressions.");
  lines.push("- **ESLint + Prettier + `npx tsc --noEmit`** \u2014 0 errors is a hard gate (see \u00a711).");
  lines.push("- **Playwright / TestSprite** \u2014 smoke: `Copy brief` writes clipboard, `Scaffold` returns 200/401/409, gap chip visible, favorites toggle persists.");
  lines.push("- **Docker** \u2014 local parity for Node 22 + Java 17; run `npm run build` and `gradlew assembleRelease` in container before push.");
  lines.push("- **GitHub PR + Vercel Preview** \u2014 every push creates preview deploy; promote only after `HEAD 200` on alias.");
  lines.push("- **Android Studio + `assembleRelease` + `apksigner verify --verbose` + `aapt2 dump badging`** \u2014 APK must be `v2 true`, \u226414M, `ai.maximo.ideaslab` `1.1.x`.");
  lines.push("- **WorkManager / OkHttp / Ktor + DataStore / EncryptedSharedPreferences** \u2014 background sync (12h), session, favorites (`FleetFavoritesStore`), FileProvider for updates.");
  lines.push("- **Sentry / log tail (`vercel logs`, `adb logcat`)** \u2014 proofs before handoff (no silent 500).");
  lines.push("");
  lines.push("### 7.2 Steps \u2014 numbered, agent-proof (inputs \u2192 outputs \u2192 command \u2192 verify) \u2014 do NOT skip");
  lines.push("1. **Discover existing surface (read-only).** Inputs: `FLEET_INVENTORY` (37), `GAP_SCORES` derived, current `src/app/**`. Output: one-paragraph \u201Cwhat `" + idea.slug + "` does NOT reuse\u201D. Command: `grep -r \"" + idea.slug + "\" src/app` should be empty before scaffold. Verify: no file collision.");
  lines.push("2. **Scaffold.** Input: `POST /api/fleet/scaffold { slug: \"" + idea.slug + "\", kind: \"" + idea.kind + "\" }` with `dl_session`. Output: `package.json + README.md` at `/root/projects/" + idea.slug + "` (host) or `/tmp/" + idea.slug + "` (Vercel preview \u2014 ephemeral). Command: `curl -b dl_session=... -X POST .../api/fleet/scaffold`. Verify: response `{ ok: true, dir, mode }` + `ls $dir/README.md` + history entry `curl .../api/fleet/history | jq`. **Rollback point:** deleting `$dir` reverts all.");
  lines.push("3. **Design tokens \u2192 Storybook.** Input: Figma tokens. Output: `.../styles.ts` or Compose `Theme` updated; one Storybook story per widget: `" + idea.widgets.join("`, `") + "`. Command: `npm run storybook -- --ci` or `./gradlew :app:assembleDebug`. Verify: stories render, no lint error.");
  lines.push("4. **Data layer.** Input: `ApiClient` / `GET /api/fleet/*` or new `app/api/" + idea.slug + "/**`. Output: endpoint returns 200 with `TBD (vault)` when key missing. Command: `curl .../api/" + idea.slug + "/health`. Verify: `401` without `dl_session`, `200` with, never invented numbers.");
  lines.push("5. **Lists & chrome.** Input: `LazyColumn/LazyVerticalGrid` (Android) + `app/page.tsx` grid (Web). Output: `88dp + navigationBars` (Android) / `pb-[calc(88px+env(safe-area-inset-bottom))]` (Web), `GridCells.Adaptive(minSize=160dp)`, `statusBarsPadding()`, `PullRefreshIndicator` on every list, TrustLine `#F38020` footer. Command: visual diff on 320/360/600dp screenshots. Verify: no overlap, pull spinner visible, favorite \u2661/\u2665 toggles.");
  lines.push("6. **State: favorites + gaps + brief.** Input: `FleetFavoritesStore` (DataStore `fleet_favorites`, `Set<String>`, `Flow`) + `localStorage(\"fleet_favorites\")` (Web). Output: heart toggles persist after kill, gap chip `Gap " + idea.gapScore + "%` links back to `/gaps`, `Professional brief \u25bc` expands inline Evidence. Command: kill app \u2192 reopen \u2192 heart still filled. Verify: `adb shell` + `localStorage.getItem` both show slug.");
  lines.push("7. **Traceability.** Input: `POST /api/fleet/history { kind: \"scaffold\"|\"copy\" }`. Output: `fleet-history.json` (`/tmp` on Vercel, `/root/projects` on host, capped 200) or `fleet_history` Supabase when `SUPABASE_*` set. Command: `curl .../api/fleet/history`. Verify: entry with `slug: \"" + idea.slug + "\", mode: \"vercel-tmp\"|\"hostinger-json\"`.");
  lines.push("8. **Build gates.** Input: `tsc`, `next build`, `gradle`. Output: `npx tsc --noEmit 0`, `npm run build 38+ routes`, `assembleRelease` `verified using v2 scheme: true`. Commands: `npx tsc --noEmit && npm run build && $ANDROID_HOME/build-tools/36.0.0/apksigner verify --verbose app-release.apk`. Verify: all green before any deploy.");
  lines.push("9. **Deploy + bump.** Input: `vercel --prod` + `apksigner`. Output: alias `https://" + idea.slug + ".maximo-seo.ai` HEAD 200, signed APK `app-release.apk` (\u226414M) + `/api/app/version` bump (`versionCode +1`, `apkUrl` points to `v1.1.x`). Commands: `npx vercel --prod --yes && curl -I https://" + idea.slug + ".maximo-seo.ai && $ANDROID_HOME/build-tools/36.0.0/aapt2 dump badging app-release.apk`. Verify: prod alias 200, version endpoint reflects new APK, History tab shows `kind: scaffold`. **Do not publish to Play Store** (sideload via GitHub release is the channel).");
  lines.push("");
  lines.push("## 8. Performance & Security Metrics");

  lines.push("- **Web:** `npm run build` 38 routes, TTFB \u2264200ms on Vercel edge, bundle delta \u226410% vs 1.1.1, no new blocking fetch in render.");
  lines.push("- **Android:** APK \u226414M, `apksigner verify v2 true`, cold start \u22641.2s on mid device, WorkManager/OkHttp reuse, `FleetFavoritesStore` read cached via `Flow`, FileProvider preserved.");
  lines.push("- **Security:** No secret in brief/repo, Turnstile siteverify enforced, `dl_session` HTTP-only, `REQUEST_INSTALL_PACKAGES` gated, encrypted prefs for favorites turned off (not sensitive).");
  lines.push("");

  // 8
  lines.push("## 8. Deliverables");
  lines.push("- [ ] Web: `src/app/" + idea.slug + "/page.tsx` + `src/app/api/" + idea.slug + "/**` wired, gap chip + Evidence inline, TrustLine.");
  lines.push("- [ ] Android: `android/.../ui/screens/" + screenName + "Screen.kt` + nav route + `FleetFavoritesStore` integration + `PullRefreshIndicator`.");
  lines.push("- [ ] Scaffold proof: `README.md` in `/" + idea.slug + "` (or `/tmp/" + idea.slug + "` on prod) + `fleet-history.json` entry.");
  lines.push("- [ ] Deploy: `vercel --prod` alias live (HEAD 200) + signed APK `app-release.apk` (1.1.x) + `/api/app/version` bump + `download/1.1.x` fallback.");
  lines.push("- [ ] Docs: Updated `AGENTS.md` / `AUDIT.md` line if needed + brief itself archived.");
  lines.push("");

  // 9
  lines.push("## 9. Timeline & Milestones");
  lines.push("- **M0 Scaffold** \u2014 `POST /api/fleet/scaffold` \u2192 `README.md` exists; `curl .../api/fleet/history` shows `kind: scaffold`. Done in minutes.");
  lines.push("- **M1 Wiring** \u2014 Web page renders with mock data or `TBD`, Android screen navigates, `tsc 0`, `gradlew assembleDebug` passes.");
  lines.push("- **M2 Polish** \u2014 Real data wiring (or honest `TBD`), responsive fix (320/360/600dp), evidence inline, favorite + pull verified.");
  lines.push("- **M3 Proofs** \u2014 `tsc 0 / build 38 / APK v2 / alias HEAD 200 / 401 without auth` all green before handoff (see \u00a710).");
  lines.push("");

  // 10
  lines.push("## 10. Acceptance Criteria (measurable)");
  lines.push("- [ ] `npx tsc --noEmit` 0 \u2014 no TS errors");
  lines.push("- [ ] `npm run build` 38+ routes OK \u2014 no regressions");
  if (isNew) lines.push("- [ ] New alias `https://" + idea.slug + ".maximo-seo.ai` or preview `/tmp` verified (HEAD 200) or explicitly `TBD (vault)`");
  else lines.push("- [ ] Feature visible as tab inside `" + target + "` (no new Vercel project created)");
  lines.push("- [ ] `POST /api/fleet/scaffold` with valid `dl_session` on Vercel \u2192 200 (`dir /tmp/" + idea.slug + "`), without auth \u2192 401, duplicate \u2192 409");
  lines.push("- [ ] Android `assembleRelease` `verified using v2 scheme: true`, screen reachable via nav, pull-to-refresh shows spinner + toast, badge NEW/ENHANCE correct, favorites persist after kill");
  lines.push("- [ ] No invented NAP/$/reviews/links \u2014 every numeric claim is traceable to 37/GAP_SCORES or marked `TBD (vault)`");
  lines.push("- [ ] Brief copied verbatim produces this spec in an agent (Devin/Warp) without follow-up questions");
  lines.push("");

  lines.push("## 11. Next Step");
  lines.push(idea.nextStep);
  lines.push("- **Prompt source:** Fleet Ideas Lab `" + idea.id + "` (" + idea.slug + ") \u2014 paste this entire `BUILD:` Markdown into Agent/Devin/Warp; it will scaffold then implement per \u00a72\u20138.");
  return lines.join("\n");
}

// ── IMPROVE — optimize / extend an EXISTING dashboard or APK ──
export function buildImprovePrompt(idea: FleetIdea): string {
  const targetSlug = idea.targetSlug && idea.targetSlug.length > 0 ? idea.targetSlug : idea.slug;
  const existing = lookupProject(targetSlug);
  const existingName = existing ? existing.name : targetSlug;
  const existingUrl = existing ? (existing.url || "https://" + targetSlug + ".maximo-seo.ai") : "https://" + targetSlug + ".maximo-seo.ai";
  const existingStack = existing ? existing.capabilities.join(", ") + " / " + existing.domain : "TBD (vault)";
  const gapLine = "Gap " + idea.gapScore + "% (" + gapLabel(idea.gapScore) + ") \u00b7 Evidence: " + idea.evidence;

  const lines: string[] = [];
  lines.push("IMPROVE:");
  lines.push("# Improve " + existingName + " \u2014 via " + idea.title + " (existing dashboard/APK)");
  lines.push("");
  lines.push("> **Target:** `" + targetSlug + "` (" + existingName + ") \u00b7 `" + existingUrl + "`");
  lines.push("> **Idea:** `" + idea.slug + "` \u00b7 **Kind:** enhancement \u00b7 **Effort:** " + idea.effort + " \u00b7 **Priority:** " + idea.priority + " \u00b7 **Impact:** " + idea.impact);
  lines.push("> **Gap:** " + gapLine);
  lines.push("> **Why improve now:** " + idea.whyNow);
  lines.push("> **Source idea:** `" + idea.id + "` \u00b7 Fleet Ideas Lab (37 verified, Vercel team maximo-seo)");
  lines.push("");

  lines.push("## 1. Objective");
  lines.push("- **Goal:** Make `" + targetSlug + "` measurably better \u2014 " + idea.problem);
  lines.push("- **Why now:** " + idea.whyNow + " (" + idea.benefit + ").");
  lines.push("- **Success in one line:** `" + targetSlug + "` gains \u201C" + idea.title.replace("Enhance ", "").replace("Enhance", "").trim() + "\u201D without breaking any existing screen/alias — ops adopts it within a week.");
  lines.push("");

  lines.push("## 2. Scope \u2014 Existing Surface");
  lines.push("- **Target surface:** `" + targetSlug + "` \u2014 alias `" + existingUrl + "`, stack `" + existingStack + "` (from `FLEET_INVENTORY`), healthy/degraded per 2026-08-15 audit.");
  lines.push("- **Current screens/tabs:** As deployed on prod — do not delete or rename any existing route/tab. Discover via `src/app` + Vercel alias (or installed APK for Android) before editing.");
  lines.push("- **What changes:** Add **one new tab/feature** \u201C" + idea.title.replace("Enhance ", "").trim() + "\u201D inside `" + targetSlug + "` (e.g. `app/<feature>/page.tsx` or `.../ui/screens/" + targetSlug + "/NewTab.kt`). Scaffold lands at `/root/projects/" + idea.slug + "` as a **feature branch** for `" + targetSlug + "` — merge as tab, do NOT create a new Vercel project or new `apk` flavor.");
  lines.push("- **Stays untouched:** Auth (`dl_session`/`EncryptedSharedPreferences`), Turnstile `0x4AAAAAEQ`, bottom nav `88dp`, TrustLine, existing tabs\u2019 data.");
  lines.push("");

  lines.push("## 3. Functional Requirements \u2014 Delta");
  lines.push("- **Before:** `" + targetSlug + "` lacks: " + idea.problem);
  lines.push("- **After:** Tab \u201C" + idea.title.replace("Enhance ", "").trim() + "\u201D shows: **" + idea.widgets.join(", ") + "** (" + idea.widgets.length + " widgets) — each widget is required.");
  lines.push("- **Detail:** **Solution:** " + idea.solution);
  lines.push("- **Detail:** **Benefit:** " + idea.benefit);
  lines.push("- **Acceptance per story:** (a) Tab is reachable from `" + targetSlug + "`\u2019s nav/More without auth bypass, (b) pull-to-refresh works on the new tab, (c) evidence chip shows Gap " + idea.gapScore + "% + link back to Fleet Ideas Lab idea.");
  lines.push("");

  lines.push("## 4. Technical Constraints \u2014 Existing Repo (additive only)");
  lines.push("- **Additive only, not breaking.** No alias deleted, no domain moved, no existing tab/route renamed. If risky, gate behind `featureFlag \"" + idea.slug + "\"` default OFF — remove flag only after adoption.");
  lines.push("- **Vercel FS:** Same rule as build — `POST /api/fleet/scaffold { slug: \"" + idea.slug + "\", targetSlug: \"" + targetSlug + "\" }` writes `/tmp/" + idea.slug + "` on prod (ephemeral, 512MB) \u2192 must be cloned to `/root/projects/" + idea.slug + "` on `srv1813877` (Hostinger) for persistence. Response `{ kind: \"enhancement\", targetSlug: \"" + targetSlug + "\", mode: \"vercel-tmp\" }` tells CI it is a **tab**, not a new project. Do NOT create a new Vercel project for this idea.");
  lines.push("- **Existing stack:** Next.js 16.2 + Tailwind 4 violet for Web; Kotlin 2.0 + Compose BOM 2024.12 + Navigation + DataStore for APK (`ai.maximo.ideaslab`, min24 target36). Reuse existing `ApiClient`, `SessionStore`, `FleetFavoritesStore`, `NotificationHelper`, `TrustLine` — do not fork them. New tab lives at `app/<feature>/page.tsx` (Web) or `.../ui/screens/" + targetSlug + "/NewTab.kt` (Android).");
  lines.push("- **No invented data** — same guard as build: unknown \u2192 `TBD (vault)` + vault key name only. Never fabricate NAP/$/reviews. Fleet truth (37 + GAP_SCORES) stays authoritative.");
  lines.push("- **Secrets:** `TURNSTILE_SECRET_KEY`, new tab API keys — names only in brief, values stay in `api-vault-full-2026-08-06.txt` (600). Turnstile `0x4AAAAAEQ` fail-closed still holds on target if it already enforces it.");
  lines.push("");

  lines.push("## 5. Design Guidelines \u2014 Consistency with `" + targetSlug + "`");
  lines.push("- **Visual parity:** New tab must match `" + targetSlug + "`\u2019s existing design system. If Fleet-family (violet `#7C3AED` on `#0f0b1a` / `#1A1428`), keep 48dp, `pb-[calc(88px+env(safe-area-inset-bottom))]` (Web) / `contentPadding bottom 88dp + navigationBars` (Android), TrustLine `#F38020`. Otherwise inherit target\u2019s tokens — do not restyle existing tabs.");
  lines.push("- **Pattern reuse:** Reuse existing card/header/empty/filter patterns from the target. If target is a dashboard, its `SiteHeader` + filter chips are authoritative; if APK tab, reuse `Material3 + Navigation` + `TopAppBar` + `PullRefreshIndicator`. New content still gets `statusBarsPadding()` + pull indicator on every list.");
  lines.push("- **Responsive:** `dp` only, `GridCells.Adaptive(minSize=160dp)`, chips wrap, no hard truncation (`Ellipsis`), 320/360/600dp tested. No overlap with BottomBar.");
  lines.push("- **A11y:** Contrast preserved, keyboard \u2318K palette still indexes the new tab, `EncryptedSharedPreferences` for session stays.");
  lines.push("");

  lines.push("## 6. Data Sources \u2014 Reuse + Add");
  lines.push("- **Reuse from `" + targetSlug + "`:** Keep its current sources untouched; do not remove any endpoint the target already reads.");
  lines.push("- **Add for this improvement:** " + idea.dataNeeded + " — add exactly those vault keys (by name) and surface `TBD (vault)` until wired. Add one new endpoint `GET /api/" + targetSlug + "/<feature>` or extend existing with new field, never replace.");
  lines.push("- **Fleet truth still:** 37 live Vercel aliases + `GAP_SCORES` derived (`computeGapScores()`). Keep gap chip `Gap " + idea.gapScore + "%` consistent and link it back to `/gaps` or Fleet Ideas Lab idea.");
  lines.push("- **Supabase fallback:** `fleet_history` when `SUPABASE_*` set else `fleet-history.json` (`/tmp` on Vercel, `/root/projects` on host, capped 200).");
  lines.push("");

  lines.push("## 7. CBC \u2014 Component-Based Construction for EXISTING dashboard/APK (agent-proof, NO step may be skipped)");
  lines.push("> **NOTE:** This is an **existing** surface \u2014 the building agent should **improve/extend `" + targetSlug + "`** (Existing Dashboard / Existing App), NOT create a new project. Patch `" + targetSlug + "` in place: add one tab/feature inside it. Do NOT scaffold a standalone `https://" + idea.slug + ".maximo-seo.ai`.");
  lines.push("");
  lines.push("### 7.1 Recommended tools by phase (same worthwhile set as BUILD, but applied as patch)");
  lines.push("- **Figma** \u2014 delta wireframe: new tab vs existing tabs side-by-side; export only new-tab tokens (reuses target\u2019s palette).");
  lines.push("- **Storybook + Chromatic** \u2014 one story for the **new tab** (`" + idea.widgets.slice(0, 3).join("`, `") + "`), plus regression story that existing tabs still render at 320/360/600dp.");
  lines.push("- **ESLint + Prettier + `npx tsc --noEmit`** \u2014 0 errors hard gate; new tab must not break existing `tsc`.");
  lines.push("- **Playwright / TestSprite** \u2014 patch smoke: new tab reachable from `" + targetSlug + "` nav, `Copy IMPROVE` logs to history, existing tabs still 200, pull + favorites still work.");
  lines.push("- **Docker** \u2014 build `npm run build` + `gradlew assembleRelease` in container to catch host-only passes.");
  lines.push("- **GitHub PR (feature branch) + Vercel Preview (target\u2019s project, not new)** \u2014 preview deploy is for `" + targetSlug + "`, not for `" + idea.slug + "`. Promote only after new tab HEAD 200.");
  lines.push("- **Android Studio** \u2014 `assembleRelease` still `v2 true`, \u226414M, new `Tab.kt` added under existing package `ai.maximo.ideaslab` (if APK surface).");
  lines.push("- **WorkManager / OkHttp / DataStore** \u2014 new tab reuses existing session/favorites infra; do not duplicate `FleetFavoritesStore`.");
  lines.push("");
  lines.push("### 7.2 Steps \u2014 numbered, agent-proof for existing surface (inputs \u2192 outputs \u2192 command \u2192 verify) \u2014 do NOT skip");
  lines.push("1. **Discover existing surface (read-only, before any edit).** Inputs: live alias `" + existingUrl + "` + `src/app/**` (or `android/.../ui/screens/*` for APK). Output: list of current tabs/routes for `" + targetSlug + "`. Command: `curl -I " + existingUrl + " && ls src/app/" + targetSlug + " 2>/dev/tty; grep -R \"" + targetSlug + "\" src/lib/fleet.ts`. Verify: you can name every existing tab before proposing the new one; no file overwritten.");
  lines.push("2. **Scaffold as feature branch.** Input: `POST /api/fleet/scaffold { slug: \"" + idea.slug + "\", targetSlug: \"" + targetSlug + "\", kind: \"enhancement\" }` with `dl_session`. Output: `README.md` at `/root/projects/" + idea.slug + "` (host) or `/tmp/" + idea.slug + "` (Vercel preview \u2014 ephemeral) marked as **branch for " + targetSlug + "** (read the returned `targetSlug`). Command: `curl -b dl_session=... -X POST .../api/fleet/scaffold -d '{\"slug\":\"" + idea.slug + "\",\"targetSlug\":\"" + targetSlug + "\"}'`. Verify: response `{ ok: true, dir, mode: \"vercel-tmp\" | \"hostinger-persisted\", kind: \"enhancement\" }` + history entry `curl .../api/fleet/history | jq`. **Rollback point:** deleting `/root/projects/" + idea.slug + "` (or `/tmp`) reverts the branch without touching `" + targetSlug + "`.");
  lines.push("3. **Design delta \u2192 Storybook for new tab.** Input: Figma delta wireframe for \u201C" + idea.title.replace("Enhance ", "").trim() + "\u201D. Output: one Storybook story for the new tab reusing target\u2019s card/header patterns; existing tab stories still pass Chromatic. Command: `npm run storybook -- --ci`. Verify: new tab renders at 320/360/600dp, existing tabs visually identical.");
  lines.push("4. **Data layer: extend, do not replace.** Input: new endpoint `GET /api/" + targetSlug + "/<feature>` or new fields on existing endpoint. Output: new tab reads `" + idea.dataNeeded + "` (or `TBD (vault)`). Command: `curl -b dl_session=... .../api/" + targetSlug + "/<feature>`. Verify: `401` without `dl_session`, `200` with, existing endpoints still `200` (no regression). Never invent numbers.");
  lines.push("5. **Nav + lists & chrome.** Input: `" + targetSlug + "`\u2019s existing nav (bottom nav or header). Output: new tab appears in nav of `" + targetSlug + "` (e.g. `More` or bottom bar) + its list has `PullRefreshIndicator` + `88dp + navigationBars` + TrustLine if Fleet-family. Command: `grep -R \"<feature>\" src/app/" + targetSlug + "` and screenshot 320/360/600dp. Verify: tab reachable without auth bypass, pull spinner visible, no BottomBar overlap.");
  lines.push("6. **State: reuse favorites + gaps + brief.** Input: existing `FleetFavoritesStore` / `localStorage`. Output: new tab\u2019s items can be \u2661/\u2665 toggled and persist after kill (same store), gap chip `Gap " + idea.gapScore + "%` links to Fleet Ideas Lab, `Professional brief \u25bc` pattern reused if needed. Command: kill app \u2192 reopen \u2192 heart still filled; `localStorage.getItem(\"fleet_favorites\")` still shows slug. Verify: no duplicate store created.");
  lines.push("7. **Traceability.** Input: `POST /api/fleet/history { kind: \"scaffold\" | \"copy\", slug: \"" + idea.slug + "\", targetSlug: \"" + targetSlug + "\" }`. Output: `fleet-history.json` or Supabase row with `targetSlug: \"" + targetSlug + "\"`. Command: `curl .../api/fleet/history`. Verify: entry exists with `targetSlug` and `kind`, and `Copy IMPROVE brief` created a `kind: copy` row.");
  lines.push("8. **Build gates (patch).** Input: `tsc`, `next build`, `gradle` on **target\u2019s** repo. Output: `npx tsc --noEmit 0`, `npm run build 38+ routes` (target still builds), `assembleRelease` still `verified using v2 scheme: true` if APK touched. Commands: `npx tsc --noEmit && npm run build && $ANDROID_HOME/build-tools/36.0.0/apksigner verify --verbose app-release.apk`. Verify: all green + existing tabs still `200` (no regression) before any preview deploy.");
  lines.push("9. **Preview + bump (target\u2019s pipeline).** Input: Vercel **preview** for `" + targetSlug + "` (not new project) + APK patch bump (`versionCode +1`). Output: preview URL for `" + targetSlug + "` shows new tab at `/<feature>` with `HEAD 200`; `/api/app/version` bump only if APK touched. Commands: `npx vercel --prod` is **NOT** for `" + idea.slug + "` — use target\u2019s `vercel --prod` equivalent after review; `aapt2 dump badging app-release.apk`. Verify: `curl -I " + existingUrl + "/<feature>` goes from `404` (before) to `200` (after) for the preview, and History shows `kind: scaffold` with `targetSlug: \"" + targetSlug + "\"`. **Do not publish a new Vercel project or new APK package for this idea.**");
  lines.push("");

  lines.push("## 8. Performance & Security \u2014 Regression Guard (existing surface)");
  lines.push("- **Bundle delta:** Web bundle for `" + targetSlug + "` +% \u22645%, Android APK for `" + targetSlug + "` (if APK) +% \u22641M vs 1.1.x (14M baseline). No p95 regression on existing tabs; measure with Lighthouse (Web) / Perfetto (Android) if available on target.");
  lines.push("- **Security:** No secret in diff, Turnstile `0x4AAAAAEQ` still `403` without token on target if target enforces it, `dl_session` still required for target API. New tab\u2019s endpoint still `401` without auth. Sponsor knows it is a patch, not a new secret surface.");
  lines.push("- **APK still `v2 true`:** `assembleRelease` must stay `verified using v2 scheme: true` for the target APK, versionCode+1 only, label unchanged (e.g. `Ideas Lab` for this Fleet Ideas Lab, or target\u2019s own label).");
  lines.push("");

  lines.push("## 9. Deliverables \u2014 Patch (not new project)");
  lines.push("- [ ] Diff/PR against `" + targetSlug + "` (web `app/<feature>/page.tsx` or `android/.../ui/screens/" + targetSlug + "/NewTab.kt` + updated nav for `" + targetSlug + "`) — additive file(s) only, no file deletions except the temporary scaffold copy at `/root/projects/" + idea.slug + "`.");
  lines.push("- [ ] Vercel **preview** deploy of `" + targetSlug + "` (do not promote until `HEAD 200` on `/" + existingUrl + "/<feature>`) — this idea\u2019s scaffold itself is NOT a deployable alias.");
  lines.push("- [ ] If APK surface: patched APK (versionCode +1) built from target\u2019s `android/` with new `Tab.kt`, still `apksigner v2 true`.");
  lines.push("- [ ] Updated `README.md` / `AGENTS.md` line in `" + targetSlug + "` describing the new tab & how to open it (`/" + targetSlug + "/<feature>` or nav label).");
  lines.push("- [ ] History trace: `POST /api/fleet/history { kind: \"scaffold\", slug: \"" + idea.slug + "\", targetSlug: \"" + targetSlug + "\" }` appears in Fleet History with that `targetSlug`; `Copy IMPROVE brief` was logged as `kind: copy` with `targetSlug`.");
  lines.push("");

  lines.push("## 10. Timeline & Milestones \u2014 Patch");
  lines.push("- **M0 Scaffold** \u2014 feature branch created (`/root/projects/" + idea.slug + "` or `/tmp/" + idea.slug + "` marked for `" + targetSlug + "`). **Rollback point:** deleting the branch reverts everything; `" + targetSlug + "` itself untouched.");
  lines.push("- **M1 Wire tab** \u2014 tab renders with mock/`TBD (vault)` data inside `" + targetSlug + "`, `tsc 0`, `gradlew assembleDebug` OK, nav shows new entry.");
  lines.push("- **M2 Polish** \u2014 real data or honest `TBD (vault)` banner, responsive (320/360/600dp) + empty states, evidence chip `Gap " + idea.gapScore + "%` wired, pull-to-refresh + favorites reused.");
  lines.push("- **M3 Proofs** \u2014 before/after curl (`" + existingUrl + "/<feature>` 404 \u2192 200 on preview) + visual diff (existing tabs unchanged) + history trace with `targetSlug` before merge (see \u00a710).");
  lines.push("");

  lines.push("## 11. Acceptance \u2014 Before/After Proof (for existing `" + targetSlug + "`)");
  lines.push("- [ ] **Before/after alias (target preview):** `curl -I " + existingUrl + "` before (tab `/<feature>` 404) vs after (preview `curl -I " + existingUrl + "/<feature>` 200). Existing `curl -I " + existingUrl + "` + other tabs still 200 (no regression).");
  lines.push("- [ ] `npx tsc --noEmit` 0, `npm run build` 38+ routes for `" + targetSlug + "` (or this Fleet Ideas Lab if patch lands here), existing tabs still 200, new tab pull-to-refresh + favorites (reused store) work.");
  lines.push("- [ ] `POST /api/fleet/scaffold` payload for this idea included `targetSlug: \"" + targetSlug + "\"` and `GET /api/fleet/history` shows `kind: scaffold` with that `targetSlug`; `Copy IMPROVE brief` for this idea was logged as `kind: copy` with same `targetSlug`.");
  lines.push("- [ ] No invented NAP/$/reviews (all numbers traceable to 37/GAP_SCORES `Gap " + idea.gapScore + "%` or marked `TBD (vault)`), bundle/APK deltas within guard (Web +5%, APK +1M), `assembleRelease v2 true` if APK touched.");
  lines.push("- [ ] New tab follows CBC steps 1\u20139 in \u00a77 above in order; commands in \u00a77.2 produced the verified outputs listed; brief was pasted verbatim and required no follow-up questions.");
  lines.push("");

  lines.push("## 12. Next Step");
  lines.push(idea.nextStep + " (enhancement path).");
  lines.push("- **Prompt source:** Fleet Ideas Lab `" + idea.id + "` \u2192 `" + idea.slug + "` \u2192 target `" + targetSlug + "` \u2014 paste this entire `IMPROVE:` Markdown into Agent/Devin/Warp; it patches `" + targetSlug + "` in place (per \u00a77 CBC above), not a new project.");
  return lines.join("\n");
}

// ── IMPROVE for any existing dashboard by slug (used from Inventory) ──
export function buildImprovePromptForProject(project: FleetProjectUI): string {
  const slug = project.slug;
  const name = project.name;
  const url = project.url;
  const evidence = "Inventory: " + name + " (" + project.domain + ", " + project.status + ", health " + project.health + ", updated " + project.lastDeploy.slice(0, 10) + ") \u00b7 Gap derived vs 37 — suggest audit-first improve (derive Gaps, then propose tab).";

  const lines: string[] = [];
  lines.push("IMPROVE:");
  lines.push("# Improve " + name + " \u2014 General Optimization Brief");
  lines.push("");
  lines.push("> **Target:** `" + slug + "` (" + name + ") \u00b7 `" + url + "`");
  lines.push("> **Domain:** " + project.domain + " \u00b7 **Status:** " + project.status + " \u00b7 **Health:** " + project.health + " \u00b7 **Updated:** " + project.lastDeploy.slice(0, 10));
  lines.push("> **Evidence:** " + evidence);
  lines.push("> **Source:** Fleet Ideas Lab Inventory (37 verified, Vercel team maximo-seo) \u2014 open-ended improve, not tied to a single gap idea");
  lines.push("");

  lines.push("## 1. Objective");
  lines.push("- **Goal:** Make `" + slug + "` measurably better without adding a new dashboard — optimize, extend, and harden the existing surface.");
  lines.push("- **Success:** Existing users notice faster / clearer / more complete `" + slug + "` within one deploy cycle; no regressions on current routes.");
  lines.push("");

  lines.push("## 2. Scope \u2014 Existing Surface");
  lines.push("- **Target:** `" + slug + "` at `" + url + "` — current alias is live (or was at 2026-08-15 audit). Stack: `" + project.capabilities.join(", ") + "` / `" + project.domain + "`.");
  lines.push("- **Discover first:** `vercel alias ls` / `HEAD " + url + "` + `src/app` (or `android/.../ui/screens/*` for APK) — list current tabs/routes before proposing any new tab.");
  lines.push("- **What changes:** Propose 1\u20133 additive improvements (new tab, new widget, perf fix, a11y fix) — all inside `" + slug + "`, no new Vercel project, no new apk package.");
  lines.push("- **Stays untouched:** Auth, domain mapping, existing tabs, design tokens.");
  lines.push("");

  lines.push("## 3. Functional Requirements \u2014 Delta");
  lines.push("- **Audit first:** Derive gaps for `" + slug + "`\u2019s domain\u00d7capability (use `computeGapScores()` / `gapProjects()`) — the top gap becomes the first tab candidate.");
  lines.push("- **Then:** For each top gap (e.g. low `reporting`, missing `alerts`), propose a concrete tab: title + 3\u20134 widgets + Why now.");
  lines.push("- **Example deltas (pick 1\u20132, tailor to domain):** [SEO] SERP watch / CWV gate, [Content] Brief autopilot, [Local] GBP health, [Analytics] Anomaly explain, [Automation] Cron observability, [Design] Token pipeline, [Outreach] Inbox, [Tech] Schema studio.");
  lines.push("- **Acceptance per improvement:** Reachable from existing nav, pull-to-refresh works, evidence chip or inline note explains the gap it closes.");
  lines.push("");

  lines.push("## 4. Technical Constraints \u2014 Existing Repo");
  lines.push("- **Additive only;** feature-flag if risky (`featureFlag \"" + slug + "-improve\"`) default OFF, remove after adoption.");
  lines.push("- **Vercel FS:** Same ephemeral rule — `POST /api/fleet/scaffold { slug: \"" + slug + "-improve\", targetSlug: \"" + slug + "\" }` writes `/tmp` on prod, clone to host for persistence.");
  lines.push("- **No new project/APK package.** The scaffold slug is a working branch; deliver as `app/<feature>` or `ui/screens/<Feature>Tab.kt` inside the target.");
  lines.push("");

  lines.push("## 5. Design Guidelines \u2014 Consistency");
  lines.push("- Match `" + slug + "`\u2019s existing system: violet `#7C3AED` if Fleet-family, otherwise inherit target\u2019s tokens. Preserve `statusBarsPadding()` + `88dp + navigationBars` + TrustLine if Fleet-family.");
  lines.push("- No visual regression on existing tabs at 320/360/600dp; new tab reuses target\u2019s card/header/empty patterns.");
  lines.push("");

  lines.push("## 6. Data Sources \u2014 Reuse + Add");
  lines.push("- **Reuse** whatever `" + slug + "` already reads; **Add** only the vault keys needed for the new tab (by name, never value) — surface `TBD (vault)` until wired. Never invent metrics.");
  lines.push("");

  lines.push("## 7. Performance & Security \u2014 Regression Guard");
  lines.push("- No p95 or bundle regression on existing routes; APK stays \u226414M and `v2 true`. Turnstile `0x4AAAAAEQ` still 403 without token when target requires it.");
  lines.push("");

  lines.push("## 8. Deliverables \u2014 Patch");
  lines.push("- [ ] Diff/PR against `" + slug + "` \u2014 new `app/<feature>` or `Tab.kt` + nav wiring + history trace (`kind: scaffold`, `targetSlug: \"" + slug + "\"`).");
  lines.push("- [ ] Preview deploy for `" + slug + "` (do not promote until new tab HEAD 200); APK patch version `+1` if APK touched.");
  lines.push("- [ ] Updated docs line explaining how to open the new tab.");
  lines.push("");

  lines.push("## 9. Timeline & Milestones \u2014 Patch");
  lines.push("- **M0 Scaffold** feature branch, **M1 Wire mock tab**, **M2 Polish with real/TBD data**, **M3 Before/after proofs** before merge (rollback = delete branch).");
  lines.push("");

  lines.push("## 10. Acceptance \u2014 Before/After Proof");
  lines.push("- [ ] `curl -I " + url + "` + `curl -I " + url + "/<feature>` before vs after (tab appears); `npx tsc --noEmit` 0 / `build` 38+ / existing tabs still 200; `fleet-history` shows `kind: scaffold` + `targetSlug`; no invented data; APK still `v2 true` if touched.");
  lines.push("");

  lines.push("## 11. Next Step");
  lines.push("- Scaffold via Fleet Ideas Lab (`POST /api/fleet/scaffold { slug: \"" + slug + "-improve\", targetSlug: \"" + slug + "\" }`), then implement per this brief. Paste this entire `IMPROVE:` Markdown into Agent/Devin/Warp.");
  return lines.join("\n");
}
