package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.data.FleetFavoritesStore
import ai.maximo.ideaslab.data.FleetSeenStore
import ai.maximo.ideaslab.data.buildAgentPrompt
import ai.maximo.ideaslab.data.buildImprovePrompt
import ai.maximo.ideaslab.ui.components.EmptyState
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilInset
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.FilTag
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun IdeasScreen(api: ApiClient, favoritesStore: FleetFavoritesStore? = null, seenStore: FleetSeenStore? = null, onNotifications: () -> Unit = {}) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    var busySlug by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf<String?>(null) }
    var showOnlyFavorites by remember { mutableStateOf(false) }
    var briefMode by remember { mutableStateOf("auto") }
    fun resolveMode(idea: ai.maximo.ideaslab.data.FleetIdea): String = when (briefMode) { "build" -> "build"; "improve" -> "improve"; else -> if (idea.kind == "enhancement") "improve" else "build" }

    val favSet by favoritesStore?.favoritesFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    val store = favoritesStore

    // seenIds: start with the 11 base ideas so first paint is not empty. DataStore merges on top once.
    var seenIds by remember { mutableStateOf(FleetData.ideas.map { it.slug }.toSet()) }
    val seenFromStore by seenStore?.seenFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    var seenHydrated by remember { mutableStateOf(false) }
    LaunchedEffect(seenFromStore) {
        if (seenHydrated) return@LaunchedEffect
        if (seenFromStore.isNotEmpty()) {
            seenIds = seenIds + seenFromStore
            seenHydrated = true
        } else if (seenStore != null) {
            // seed only once, guarded
            try { seenStore.seedFromIdeas(FleetData.ideas.map { it.slug }.toSet()) } catch (_: Exception) {}
            seenHydrated = true
        }
    }

    var searchQ by remember { mutableStateOf("") }
    // When searching we show ALL_POOL matches without mutating seenIds — no LaunchedEffect loop.
    val allPool = remember { FleetData.ideas + FleetData.generatedPool }

    // Stable visible pool: when not searching, only seenIds; preserve allPool order, NO global reshuffle.
    val visiblePool = remember(seenIds, searchQ) {
        val q = searchQ.trim()
        if (q.isNotEmpty()) allPool else allPool.filter { it.slug in seenIds }
    }

    // Filtered list — search + favorites. No shuffleSeed.
    val ideas = remember(visiblePool, searchQ, showOnlyFavorites, favSet) {
        val withFav = if (!showOnlyFavorites) visiblePool else visiblePool.filter { it.slug in favSet }
        val qq = searchQ.trim().lowercase()
        if (qq.isEmpty()) withFav else withFav.filter { (it.title + " " + it.slug + " " + it.prompt + " " + it.evidence).lowercase().contains(qq) }
    }

    // --- Reload: reveal up to 3 unseen, never repeat. Shuffles only the candidates, not the displayed list.
    fun doReload() {
        if (refreshing) return
        scope.launch {
            try {
                refreshing = true
                delay(350)
                val candidates = allPool.filter { it.slug !in seenIds }
                if (candidates.isEmpty()) {
                    try { Toast.makeText(ctx, "No more new ideas \u2014 ${ideas.size} shown", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
                } else {
                    val take = minOf(3, candidates.size)
                    // Fisher-Yates on candidates only — stable, no global shuffle
                    val shuffled = candidates.toMutableList()
                    var seed = (System.currentTimeMillis() % 233280).toInt() + 9301
                    fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
                    for (i in shuffled.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t }
                    val picked = shuffled.take(take)
                    seenIds = seenIds + picked.map { it.slug }.toSet()
                    try { seenStore?.addSeen(picked.map { it.slug }.toSet()) } catch (_: Exception) {}
                    try { Toast.makeText(ctx, "New: " + picked.joinToString(", ") { it.slug } + " \u00b7 ${ideas.size + take} shown", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
                }
            } catch (_: Exception) {
                try { Toast.makeText(ctx, "Reload failed \u2014 try again", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
            } finally { refreshing = false }
        }
    }

    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val listState = rememberLazyListState()
    var loadingMore by remember { mutableStateOf(false) }
    var endOfFeed by remember { mutableStateOf(false) }

    fun loadMore() {
        if (loadingMore || endOfFeed || refreshing) return
        if (searchQ.trim().isNotEmpty()) return
        if (showOnlyFavorites) return
        val candidates = allPool.filter { it.slug !in seenIds }
        if (candidates.isEmpty()) { endOfFeed = true; return }
        scope.launch {
            try {
                loadingMore = true
                delay(500)
                val take = minOf(3, candidates.size)
                val shuffled = candidates.toMutableList()
                var seed = (System.currentTimeMillis() % 233280).toInt() + 49297
                fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
                for (i in shuffled.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t }
                val picked = shuffled.take(take)
                seenIds = seenIds + picked.map { it.slug }.toSet()
                try { seenStore?.addSeen(picked.map { it.slug }.toSet()) } catch (_: Exception) {}
                if (candidates.size <= take) endOfFeed = true
                try { Toast.makeText(ctx, "Loaded " + picked.joinToString(", ") { it.slug }, Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
            } catch (_: Exception) {
                try { Toast.makeText(ctx, "Load failed \u2014 try again", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
            } finally { loadingMore = false }
        }
    }

    // Crash-proof infinite scroll: snapshotFlow on lastVisible index, throttled, disabled while searching/favorites
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }
            .distinctUntilChanged()
            .filter { lastIndex ->
                lastIndex != null && lastIndex >= ideas.size - 4 && ideas.isNotEmpty() && !loadingMore && !endOfFeed && !refreshing && searchQ.trim().isEmpty() && !showOnlyFavorites
            }
            .collect { loadMore() }
    }
    LaunchedEffect(seenIds) { endOfFeed = false }

    val briefs = remember {
        mapOf(
            "serp-volatility-war-room" to Triple("Site Intel exists but lacks war-room view.", "Enhance site-intel with War-Room tab \u2014 not a new dashboard", "Validated: seo\u00d7analytics 96% strong \u2014 enhancement, not white-space"),
            "gbp-health-monitor" to Triple("Local SEO exists \u2014 lacks GBP health tab.", "Enhance local-seo with Health tab \u2014 not new dashboard", "Validated: local\u00d7analytics 67% ok \u2014 feature gap"),
            "anomaly-explain-engine" to Triple("Alerts without explanation are noise \u2014 ignored.", "Timeline + LLM Root Cause + Impact Estimate + Suggested Action", "Alerts become decisions, MTTR drops"),
            "outreach-inbox-commander" to Triple("~20% replies lost in Gmail noise.", "Thread List + Reply Score + Follow-up Timer + Template Inject", "Recover replies, halve busywork"),
            "schema-studio" to Triple("Schema errors silently kill rich results \u2014 invisible CTR loss.", "JSON-LD Editor + Validator + Rich Result Preview + Fix Diff", "Recover eligibility + CTR with safety net"),
            "design-token-pipeline" to Triple("Tokens are manual \u2014 no WP pipeline.", "Token Editor + WP Sync + Preview Frame + Version History", "Ship design-system to WP in one click"),
            "content-brief-autopilot" to Triple("Content Automation exists \u2014 lacks brief autopilot.", "Enhance content-automation with Brief tab \u2014 not new", "Validated: content\u00d7automation 67% ok"),
            "local-citation-pulse" to Triple("Local SEO lacks citation diffing \u2014 NAP across 40+ dirs.", "Enhance local-seo with Citation Pulse tab", "Validated: local\u00d7reporting 33% gap \u2014 feature-level"),
            "fleet-cron-observatory" to Triple("50+ crons \u2014 silent failures cost hours weekly.", "Timeline + Failure Heatmap + Run Logs + Retry", "Zero silent failures"),
            "link-velocity-tracker" to Triple("Competitor Intel exists \u2014 lacks velocity view.", "Enhance competitor-intel with Link Velocity tab", "Validated: outreach\u00d7analytics 96% strong \u2014 enhancement"),
            "cwv-budget-guard" to Triple("SiteWatch monitors uptime \u2014 lacks CWV budget gate.", "Enhance sitewatch with CWV Guard tab", "Validated: technical\u00d7alerts 86% strong \u2014 feature"),
        )
    }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().padding(horizontal = FilDimens.screen)) {
            OutlinedTextField(
                value = searchQ,
                onValueChange = { searchQ = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search ideas, problem, solution\u2026", style = FilType.label) },
                singleLine = true,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(999.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = FilTheme.palette.accent, unfocusedBorderColor = FilTheme.palette.line),
            )
            Spacer(Modifier.height(8.dp))
            FilScreenHeader(
                title = "Ideas",
                subtitle = "${ideas.size} shown \u00b7 11 base + 18 pool \u00b7 pull to reload" + if (showOnlyFavorites) " \u00b7 \u2605 favorites" else "",
                actions = {
                    FilterChip(
                        selected = showOnlyFavorites,
                        onClick = { showOnlyFavorites = !showOnlyFavorites },
                        label = { Text("\u2605 ${favSet.size}", style = FilType.chip) },
                        modifier = Modifier.heightIn(min = 36.dp),
                    )
                    IconButton(onClick = onNotifications, modifier = Modifier.size(FilDimens.touch)) {
                        Text("\uD83D\uDD14", style = MaterialTheme.typography.titleMedium)
                    }
                },
            )
            FilInset(padding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("BRIEF MODE", style = FilType.sectionLabel, color = p.muted2)
                    Spacer(Modifier.weight(1f))
                    for (m in listOf("auto", "build", "improve")) {
                        val label = when (m) { "auto" -> "Auto"; "build" -> "BUILD"; else -> "IMPROVE" }
                        FilterChip(
                            selected = briefMode == m,
                            onClick = { briefMode = m },
                            label = { Text(label, style = FilType.label) },
                            modifier = Modifier.heightIn(min = 32.dp),
                        )
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                FilledTonalButton(
                    onClick = { doReload() },
                    enabled = !refreshing,
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                ) { Text(if (refreshing) "\u21BB Reloading\u2026" else "\u21BB Reload", style = FilType.chip) }
            }
            if (ideas.isEmpty()) {
                EmptyState(
                    title = if (showOnlyFavorites) "No favorites yet" else "No ideas match",
                    body = if (showOnlyFavorites) "Tap \u2661 on any idea to save it \u2014 persists after restart." else "Try a different search or clear filters.",
                    glyph = "\u2606",
                ) {
                    OutlinedButton(onClick = { showOnlyFavorites = false; searchQ = "" }) { Text("Clear filters") }
                }
            }
            LazyColumn(
                state = listState,
                verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 88.dp + 16.dp, top = 4.dp),
            ) {
                items(ideas, key = { it.slug }) { idea ->
                    val brief = briefs[idea.slug]
                    val isOpen = expanded == idea.slug
                    val isFav = idea.slug in favSet
                    FilCard {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                idea.title,
                                style = FilType.cardTitle,
                                color = p.text,
                                modifier = Modifier.weight(1f).padding(end = 8.dp),
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            FilledTonalButton(
                                onClick = {
                                    if (store != null) scope.launch {
                                        try {
                                            store.toggleFavorite(idea.slug)
                                            val nowFav = store.isFavorite(idea.slug)
                                            Toast.makeText(ctx, if (nowFav) "Saved \u2605 ${idea.slug}" else "Removed ${idea.slug}", Toast.LENGTH_SHORT).show()
                                        } catch (_: Exception) {}
                                    }
                                },
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = if (isFav) p.accent.copy(alpha = 0.25f) else p.panel3,
                                ),
                                modifier = Modifier.heightIn(min = 32.dp),
                            ) {
                                Text(if (isFav) "\u2605" else "\u2606", style = FilType.chip, color = if (isFav) p.accent else p.muted)
                            }
                        }
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            FilTag(
                                text = idea.impact.uppercase(),
                                color = when (idea.impact) { "high" -> p.accent; "medium" -> p.healthy; else -> p.muted },
                            )
                            FilTag(
                                text = when (idea.kind) { "new" -> "NEW"; "enhancement" -> "ENHANCE"; "shipped" -> "SHIPPED"; else -> idea.kind.uppercase() },
                                color = when (idea.kind) { "new" -> p.accentDeep; "shipped" -> p.healthy; else -> p.muted },
                            )
                            FilTag(text = "gap ${idea.gapScore}%", mono = true)
                            if ("Research 2026-08-16" in idea.evidence) {
                                FilTag(text = "fresh \u00b7 2026-08-16", color = p.accent)
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("${idea.category} \u00b7 ${idea.slug}", style = FilType.label, color = p.muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(6.dp))
                        Text(idea.prompt, style = FilType.bodySmall, color = p.muted, maxLines = if (isOpen) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(onClick = { expanded = if (isOpen) null else idea.slug }, modifier = Modifier.fillMaxWidth().heightIn(min = 40.dp)) {
                            Text(if (isOpen) "Hide brief \u25B2" else "Professional brief \u25BC", style = FilType.chip)
                        }
                        if (isOpen && brief != null) {
                            Spacer(Modifier.height(8.dp))
                            FilInset(padding = PaddingValues(10.dp)) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("Problem: ${brief.first}", style = FilType.bodySmall, color = p.bad)
                                    Text("Solution: ${brief.second}", style = FilType.bodySmall, color = p.accent)
                                    Text("Benefit: ${brief.third}", style = FilType.bodySmall, color = p.healthy)
                                    Text("Next: Scaffold \u2192 wire data (vault TBD) \u2192 ship", style = FilType.label, color = p.muted)
                                    Text("Gap ${idea.gapScore}% \u00b7 ${idea.evidence.take(120)}", style = FilType.dataSmall, color = p.muted2)
                                }
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        var showConfirm by remember(idea.slug) { mutableStateOf(false) }
                        if (showConfirm) {
                            AlertDialog(
                                onDismissRequest = { showConfirm = false },
                                title = { Text(if (idea.kind == "new") "Create new dashboard: " + idea.slug + "?" else "Add tab to " + idea.targetSlug + "?") },
                                text = {
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(if (idea.kind == "new") "This will scaffold a new Next.js project at /root/projects/" + idea.slug + " (or /tmp/" + idea.slug + " on Vercel \u2014 ephemeral). No inventory entry until Vercel alias is live." else "This will scaffold at /root/projects/" + idea.slug + " as a feature branch for " + idea.targetSlug + " \u2014 merge as tab inside " + idea.targetSlug + ", not a standalone project.", style = MaterialTheme.typography.bodySmall)
                                        Text("Widgets: " + idea.prompt.take(120) + "\u2026", style = FilType.label, color = p.muted)
                                        Text("Gap " + idea.gapScore + "% \u00b7 " + idea.evidence.take(100), style = FilType.dataSmall, color = p.muted2)
                                    }
                                },
                                confirmButton = {
                                    Button(onClick = {
                                        showConfirm = false
                                        busySlug = idea.slug
                                        scope.launch {
                                            try {
                                                val res = api.scaffold(idea.slug, idea.slug, idea.kind, idea.targetSlug.ifEmpty { null })
                                                busySlug = null
                                                Toast.makeText(ctx, if(res.ok) res.message else (res.error ?: "Failed"), Toast.LENGTH_LONG).show()
                                            } catch (_: Exception) {
                                                busySlug = null
                                                try { Toast.makeText(ctx, "Scaffold failed \u2014 try again", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
                                            }
                                        }
                                    }) {
                                        Text(if (idea.kind == "new") "Create dashboard" else "Scaffold tab")
                                    }
                                },
                                dismissButton = { TextButton(onClick = { showConfirm = false }) { Text("Cancel") } },
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(onClick = {
                                val m = resolveMode(idea)
                                val full = if (m == "improve") buildImprovePrompt(idea) else buildAgentPrompt(idea)
                                clipboard.setText(AnnotatedString(full))
                                try { Toast.makeText(ctx, (if (m=="improve") "IMPROVE" else "BUILD") + " brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
                            }, modifier = Modifier.weight(1f).heightIn(min = 44.dp)) {
                                Text(if (resolveMode(idea)=="improve") "Copy IMPROVE" else "Copy BUILD", style = FilType.chip)
                            }
                            Button(
                                onClick = { showConfirm = true },
                                modifier = Modifier.weight(1f).heightIn(min = 44.dp),
                                enabled = busySlug != idea.slug,
                                colors = ButtonDefaults.buttonColors(containerColor = p.accentDeep, contentColor = p.onAccent),
                            ) {
                                Text(if (busySlug==idea.slug) "\u2026" else if (idea.kind == "new") "Create dashboard" else "Scaffold tab", style = FilType.chip)
                            }
                        }
                    }
                }
                item(key = "ideas-sentinel") {
                    Box(Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                        when {
                            loadingMore -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp); Text("Loading more ideas\u2026", style = FilType.label, color = p.accent) }
                            endOfFeed && ideas.isNotEmpty() -> Text("You\u0027ve seen all ideas \u2014 pull to reshuffle", style = FilType.label, color = p.muted2)
                            else -> Spacer(Modifier.height(4.dp))
                        }
                    }
                }
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = p.panel, contentColor = p.accent)
    }
}
