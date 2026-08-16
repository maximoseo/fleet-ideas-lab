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

  // 7
  lines.push("## 7. Performance & Security Metrics");
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

  lines.push("## 4. Technical Constraints \u2014 Existing Repo");
  lines.push("- **Additive only, not breaking.** No alias deleted, no domain moved. If risky, gate behind `featureFlag \"" + idea.slug + "\"` default OFF.");
  lines.push("- **Vercel FS:** Same rule as build — `POST /api/fleet/scaffold` writes `/tmp/" + idea.slug + "` on prod (ephemeral) \u2192 clone to `/root/projects/" + idea.slug + "` on host for persistence. Response `{kind:\"enhancement\", targetSlug:\"" + targetSlug + "\"}` tells CI it is a tab.");
  lines.push("- **Existing stack:** Next.js 16.2 + Tailwind violet for Web, Kotlin Compose for APK (`ai.maximo.ideaslab`). Reuse `ApiClient`, `SessionStore`, `FleetFavoritesStore`, `NotificationHelper` — do not fork them.");
  lines.push("- **No invented data** — same guard as build: unknown \u2192 `TBD (vault)`.");
  lines.push("");

  lines.push("## 5. Design Guidelines \u2014 Consistency");
  lines.push("- **Visual parity:** New tab must match `" + targetSlug + "`\u2019s existing design system (violet `#7C3AED`, dark `#1A1428`, 48dp, `pb-[calc(88px+env(safe-area-inset-bottom))]`). No visual regression on any existing tab at 320/360/600dp.");
  lines.push("- **Pattern:** Reuse existing card/header/empty patterns from the target. If target is a dashboard, its `SiteHeader` + filter chips are authoritative; if APK tab, reuse `Material3 + Navigation` + `TopAppBar`. New content still gets `statusBarsPadding()` + pull indicator.");
  lines.push("");

  lines.push("## 6. Data Sources \u2014 Reuse + Add");
  lines.push("- **Reuse from `" + targetSlug + "`:** Keep its current sources; do not remove any.");
  lines.push("- **Add for this improvement:** " + idea.dataNeeded + " — add exactly those vault keys (by name) and surface `TBD (vault)` until wired.");
  lines.push("- **Fleet truth still:** 37 aliases + `GAP_SCORES` derived — keep gap chip consistent.");
  lines.push("");

  lines.push("## 7. Performance & Security \u2014 Regression Guard");
  lines.push("- **Bundle delta:** Web bundle +% \u22645%, Android APK +% \u22641M vs 1.1.1 (14M). No p95 regression on existing tabs; measure with Lighthouse/Perfetto if available.");
  lines.push("- **Security:** No secret in diff, Turnstile still 403 without token, `dl_session` still required for target API. Sponsor knows it is a patch, not a new secret surface.");
  lines.push("- **APK still `v2 true`:** `assembleRelease` must stay `verified using v2 scheme: true`, versionCode+1 only, label still `Ideas Lab`.");
  lines.push("");

  lines.push("## 8. Deliverables \u2014 Patch");
  lines.push("- [ ] Diff/PR against `" + targetSlug + "` (web or `android/...`) — additive file(s) + updated nav, no file deletions except scaffold copy.");
  lines.push("- [ ] Updated APK patch version (if APK surface) + Vercel **preview** deploy of `" + targetSlug + "` (do not promote until `HEAD 200` on new tab).");
  lines.push("- [ ] Updated `README.md` / `AGENTS.md` line describing the new tab & how to open it.");
  lines.push("- [ ] History trace: `POST /api/fleet/history {kind:\"scaffold\", slug:\"" + idea.slug + "\", targetSlug:\"" + targetSlug + "\"}` appears in Fleet History.");
  lines.push("");

  lines.push("## 9. Timeline & Milestones \u2014 Patch");
  lines.push("- **M0 Scaffold** \u2014 feature branch created (`/root/projects/" + idea.slug + "` or `/tmp`). **Rollback point:** deleting the branch reverts everything.");
  lines.push("- **M1 Wire tab** \u2014 tab renders with mock/`TBD` data, `tsc 0`, `assembleDebug` OK.");
  lines.push("- **M2 Polish** \u2014 real data or honest `TBD (vault)` banner, responsive + empty states, evidence chip wired.");
  lines.push("- **M3 Proofs** \u2014 before/after curl + visual diff + history trace (see \u00a710) before merge.");
  lines.push("");

  lines.push("## 10. Acceptance \u2014 Before/After Proof");
  lines.push("- [ ] **Before/after alias:** `curl -I " + existingUrl + "` before (tab 404) vs after (200) OR `curl -I " + existingUrl + "/<feature>` 200.");
  lines.push("- [ ] `npx tsc --noEmit` 0, `npm run build` 38+ routes, existing tabs still 200 (no regression), new tab pull-to-refresh + favorites work.");
  lines.push("- [ ] `POST /api/fleet/scaffold` payload includes `targetSlug:\"" + targetSlug + "\"` and `fleet-history` shows `kind: scaffold` with that target; `Copy IMPROVE brief` was logged as `kind: copy`.");
  lines.push("- [ ] No invented NAP/$ (traceable to 37/GAP_SCORES or `TBD`), `assembleRelease v2 true` if APK touched.");
  lines.push("");

  lines.push("## 11. Next Step");
  lines.push(idea.nextStep + " (enhancement path).");
  lines.push("- **Prompt source:** Fleet Ideas Lab `" + idea.id + "` \u2192 `" + idea.slug + "` \u2192 target `" + targetSlug + "` \u2014 paste this entire `IMPROVE:` Markdown into Agent/Devin/Warp; it patches `" + targetSlug + "`, not a new project.");
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
