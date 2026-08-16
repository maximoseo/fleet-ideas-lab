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
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun IdeasScreen(api: ApiClient, favoritesStore: FleetFavoritesStore? = null, seenStore: FleetSeenStore? = null, onNotifications: () -> Unit = {}) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    var busySlug by remember { mutableStateOf<String?>(null) }
    var shuffleSeed by remember { mutableStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf<String?>(null) }
    var showOnlyFavorites by remember { mutableStateOf(false) }
    var briefMode by remember { mutableStateOf("auto") } // auto | build | improve
    fun resolveMode(idea: ai.maximo.ideaslab.data.FleetIdea): String = when (briefMode) { "build" -> "build"; "improve" -> "improve"; else -> if (idea.kind == "enhancement") "improve" else "build" }

    val favSet by favoritesStore?.favoritesFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    val store = favoritesStore
    var seenIds by remember { mutableStateOf(FleetData.ideas.map { it.slug }.toSet()) }
    val seenFromStore by seenStore?.seenFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    LaunchedEffect(seenFromStore) {
        if (seenFromStore.isNotEmpty()) seenIds = seenIds + seenFromStore
        else seenStore?.seedFromIdeas(FleetData.ideas.map { it.slug }.toSet())
    }
    var searchQ by remember { mutableStateOf("") }
    val visiblePool = remember(seenIds, searchQ) {
        val searching = searchQ.trim().isNotEmpty()
        val allPool = FleetData.ideas + FleetData.generatedPool
        if (searching) allPool else allPool.filter { it.slug in seenIds }
    }
    val baseIdeas = remember(visiblePool, shuffleSeed, searchQ) {
        if (shuffleSeed == 0) visiblePool else {
            val arr = visiblePool.toMutableList()
            var seed = shuffleSeed * 9301 + 49297
            fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
            for (i in arr.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = arr[i]; arr[i] = arr[j]; arr[j] = t }
            arr
        }
    }
    val ideas = remember(baseIdeas, showOnlyFavorites, favSet, searchQ) {
        val withFav = if (!showOnlyFavorites) baseIdeas else baseIdeas.filter { it.slug in favSet }
        val qq = searchQ.trim().lowercase()
        if (qq.isEmpty()) withFav else withFav.filter { (it.title + " " + it.slug + " " + it.prompt + " " + it.evidence).lowercase().contains(qq) }
    }
    LaunchedEffect(ideas, searchQ) {
        if (searchQ.trim().isEmpty()) return@LaunchedEffect
        val unseenHits = ideas.filter { it.slug !in seenIds }
        if (unseenHits.isEmpty()) return@LaunchedEffect
        seenIds = seenIds + unseenHits.map { it.slug }.toSet()
        seenStore?.addSeen(unseenHits.map { it.slug }.toSet())
    }

    fun doReload() {
        scope.launch {
            refreshing = true
            delay(400)
            val allPool = FleetData.ideas + FleetData.generatedPool
            val candidates = allPool.filter { it.slug !in seenIds }
            if (candidates.isEmpty()) {
                shuffleSeed++
                Toast.makeText(ctx, "No more new ideas — reshuffled ${ideas.size} shown", Toast.LENGTH_SHORT).show()
            } else {
                val take = minOf(3, candidates.size)
                var seed = (shuffleSeed + 1) * 9301 + 49297
                fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
                val shuffled = candidates.toMutableList().also { l -> for (i in l.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = l[i]; l[i] = l[j]; l[j] = t } }
                val picked = shuffled.take(take)
                seenIds = seenIds + picked.map { it.slug }.toSet()
                seenStore?.addSeen(picked.map { it.slug }.toSet())
                shuffleSeed++
                Toast.makeText(ctx, "New ideas: " + picked.joinToString(", ") { it.slug } + " · now ${(ideas.size + take)} shown (reshuffled)", Toast.LENGTH_SHORT).show()
            }
            refreshing = false
        }
    }

    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val listState = rememberLazyListState()
    var loadingMore by remember { mutableStateOf(false) }
    var endOfFeed by remember { mutableStateOf(false) }
    fun loadMore() {
        if (loadingMore || endOfFeed || refreshing) return
        val allPool = FleetData.ideas + FleetData.generatedPool
        val candidates = allPool.filter { it.slug !in seenIds }
        if (candidates.isEmpty()) { endOfFeed = true; return }
        scope.launch {
            loadingMore = true
            delay(500)
            val take = minOf(3, candidates.size)
            var seed = (shuffleSeed + 1) * 9301 + 49297
            fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
            val shuffled = candidates.toMutableList().also { l -> for (i in l.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = l[i]; l[i] = l[j]; l[j] = t } }
            val picked = shuffled.take(take)
            seenIds = seenIds + picked.map { it.slug }.toSet()
            seenStore?.addSeen(picked.map { it.slug }.toSet())
            shuffleSeed++
            loadingMore = false
            if (candidates.size <= take) endOfFeed = true
            Toast.makeText(ctx, "Loaded " + picked.joinToString(", ") { it.slug } + " · " + (ideas.size + take) + " shown", Toast.LENGTH_SHORT).show()
        }
    }
    val shouldLoadMore by remember { derivedStateOf { val last = listState.layoutInfo.visibleItemsInfo.lastOrNull(); last != null && last.index >= visiblePool.size - 3 } }
    LaunchedEffect(shouldLoadMore) { if (shouldLoadMore) loadMore() }
    LaunchedEffect(seenIds) { endOfFeed = false }

    val briefs = remember {
        mapOf(
            "serp-volatility-war-room" to Triple("Site Intel exists but lacks war-room view.", "Enhance site-intel with War-Room tab — not a new dashboard", "Validated: seo×analytics 96% strong — enhancement, not white-space"),
            "gbp-health-monitor" to Triple("Local SEO exists — lacks GBP health tab.", "Enhance local-seo with Health tab — not new dashboard", "Validated: local×analytics 67% ok — feature gap"),
            "anomaly-explain-engine" to Triple("Alerts without explanation are noise — ignored.", "Timeline + LLM Root Cause + Impact Estimate + Suggested Action", "Alerts become decisions, MTTR drops"),
            "outreach-inbox-commander" to Triple("~20% replies lost in Gmail noise.", "Thread List + Reply Score + Follow-up Timer + Template Inject", "Recover replies, halve busywork"),
            "schema-studio" to Triple("Schema errors silently kill rich results — invisible CTR loss.", "JSON-LD Editor + Validator + Rich Result Preview + Fix Diff", "Recover eligibility + CTR with safety net"),
            "design-token-pipeline" to Triple("Tokens are manual — no WP pipeline.", "Token Editor + WP Sync + Preview Frame + Version History", "Ship design-system to WP in one click"),
            "content-brief-autopilot" to Triple("Content Automation exists — lacks brief autopilot.", "Enhance content-automation with Brief tab — not new", "Validated: content×automation 67% ok"),
            "local-citation-pulse" to Triple("Local SEO lacks citation diffing — NAP across 40+ dirs.", "Enhance local-seo with Citation Pulse tab", "Validated: local×reporting 33% gap — feature-level"),
            "fleet-cron-observatory" to Triple("50+ crons — silent failures cost hours weekly.", "Timeline + Failure Heatmap + Run Logs + Retry", "Zero silent failures"),
            "link-velocity-tracker" to Triple("Competitor Intel exists — lacks velocity view.", "Enhance competitor-intel with Link Velocity tab", "Validated: outreach×analytics 96% strong — enhancement"),
            "cwv-budget-guard" to Triple("SiteWatch monitors uptime — lacks CWV budget gate.", "Enhance sitewatch with CWV Guard tab", "Validated: technical×alerts 86% strong — feature"),
        )
    }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().padding(horizontal = FilDimens.screen)) {
            OutlinedTextField(
                value = searchQ,
                onValueChange = { searchQ = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search ideas, problem, solution…", style = FilType.label) },
                singleLine = true,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(999.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = FilTheme.palette.accent, unfocusedBorderColor = FilTheme.palette.line),
            )
            Spacer(Modifier.height(8.dp))
            FilScreenHeader(
                title = "Ideas",
                subtitle = "${ideas.size} shown · 5 new + 6 enhance · pull to reload" + if (showOnlyFavorites) " · ★ favorites" else "",
                actions = {
                    FilterChip(
                        selected = showOnlyFavorites,
                        onClick = { showOnlyFavorites = !showOnlyFavorites },
                        label = { Text("★ ${favSet.size}", style = FilType.chip) },
                        modifier = Modifier.heightIn(min = 36.dp),
                    )
                    IconButton(onClick = onNotifications, modifier = Modifier.size(FilDimens.touch)) {
                        Text("🔔", style = MaterialTheme.typography.titleMedium)
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
                ) { Text(if (refreshing) "↻ Reloading…" else "↻ Reload", style = FilType.chip) }
            }
            if (ideas.isEmpty() && showOnlyFavorites) {
                EmptyState(
                    title = "No favorites yet",
                    body = "Tap ♡ on any idea to save it — persists after restart.",
                    glyph = "☆",
                ) {
                    OutlinedButton(onClick = { showOnlyFavorites = false }) { Text("Show all · ${visiblePool.size}") }
                }
            }
            LazyColumn(
                state = listState,
                verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 88.dp + 16.dp, top = 4.dp),
            ) {
                items(ideas) { idea ->
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
                                        store.toggleFavorite(idea.slug)
                                        val nowFav = store.isFavorite(idea.slug)
                                        Toast.makeText(ctx, if (nowFav) "Saved ★ ${idea.slug}" else "Removed ${idea.slug}", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = if (isFav) p.accent.copy(alpha = 0.25f) else p.panel3,
                                ),
                                modifier = Modifier.heightIn(min = 32.dp),
                            ) {
                                Text(if (isFav) "★" else "☆", style = FilType.chip, color = if (isFav) p.accent else p.muted)
                            }
                        }
                        Spacer(Modifier.height(6.dp))
                        // Identity chips: priority (impact), kind, gap score in mono.
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
                                FilTag(text = "fresh · 2026-08-16", color = p.accent)
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("${idea.category} · ${idea.slug}", style = FilType.label, color = p.muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(6.dp))
                        Text(idea.prompt, style = FilType.bodySmall, color = p.muted, maxLines = if (isOpen) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(onClick = { expanded = if (isOpen) null else idea.slug }, modifier = Modifier.fillMaxWidth().heightIn(min = 40.dp)) {
                            Text(if (isOpen) "Hide brief ▲" else "Professional brief ▼", style = FilType.chip)
                        }
                        if (isOpen && brief != null) {
                            Spacer(Modifier.height(8.dp))
                            FilInset(padding = PaddingValues(10.dp)) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("Problem: ${brief.first}", style = FilType.bodySmall, color = p.bad)
                                    Text("Solution: ${brief.second}", style = FilType.bodySmall, color = p.accent)
                                    Text("Benefit: ${brief.third}", style = FilType.bodySmall, color = p.healthy)
                                    Text("Next: Scaffold → wire data (vault TBD) → ship", style = FilType.label, color = p.muted)
                                    Text("Gap ${idea.gapScore}% · ${idea.evidence.take(120)}", style = FilType.dataSmall, color = p.muted2)
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
                                        Text(if (idea.kind == "new") "This will scaffold a new Next.js project at /root/projects/" + idea.slug + " (or /tmp/" + idea.slug + " on Vercel — ephemeral). No inventory entry until Vercel alias is live." else "This will scaffold at /root/projects/" + idea.slug + " as a feature branch for " + idea.targetSlug + " — merge as tab inside " + idea.targetSlug + ", not a standalone project.", style = MaterialTheme.typography.bodySmall)
                                        Text("Widgets: " + idea.prompt.take(120) + "…", style = FilType.label, color = p.muted)
                                        Text("Gap " + idea.gapScore + "% · " + idea.evidence.take(100), style = FilType.dataSmall, color = p.muted2)
                                    }
                                },
                                confirmButton = {
                                    Button(onClick = {
                                        showConfirm = false
                                        busySlug = idea.slug
                                        scope.launch {
                                            val res = api.scaffold(idea.slug, idea.slug, idea.kind, idea.targetSlug.ifEmpty { null })
                                            busySlug = null
                                            Toast.makeText(ctx, if(res.ok) res.message else (res.error ?: "Failed"), Toast.LENGTH_LONG).show()
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
                                Toast.makeText(ctx, (if (m=="improve") "IMPROVE" else "BUILD") + " brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                            }, modifier = Modifier.weight(1f).heightIn(min = 44.dp)) {
                                Text(if (resolveMode(idea)=="improve") "Copy IMPROVE" else "Copy BUILD", style = FilType.chip)
                            }
                            Button(
                                onClick = { showConfirm = true },
                                modifier = Modifier.weight(1f).heightIn(min = 44.dp),
                                enabled = busySlug != idea.slug,
                                colors = ButtonDefaults.buttonColors(containerColor = p.accentDeep, contentColor = p.onAccent),
                            ) {
                                Text(if (busySlug==idea.slug) "…" else if (idea.kind == "new") "Create dashboard" else "Scaffold tab", style = FilType.chip)
                            }
                        }
                    }
                }
                item {
                    Box(Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                        when {
                            loadingMore -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp); Text("Loading more ideas…", style = FilType.label, color = p.accent) }
                            endOfFeed && ideas.isNotEmpty() -> Text("You've seen all ideas — pull to reshuffle", style = FilType.label, color = p.muted2)
                            else -> Spacer(Modifier.height(4.dp))
                        }
                    }
                }
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = p.panel, contentColor = p.accent)
    }
}
