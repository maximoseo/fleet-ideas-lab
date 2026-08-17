package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
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
import ai.maximo.ideaslab.ui.components.FilListSkeleton
import ai.maximo.ideaslab.ui.components.FilTag
import ai.maximo.ideaslab.ui.components.SkeletonKind
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
    var notifyPicker by remember { mutableStateOf<ai.maximo.ideaslab.data.FleetIdea?>(null) }
    var notifyBot by remember { mutableStateOf("coding") }
    var notifyModePick by remember { mutableStateOf("build") }
    var notifyingSlug by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf<String?>(null) }
    var showOnlyFavorites by remember { mutableStateOf(false) }
    var briefMode by remember { mutableStateOf("auto") }
    fun resolveMode(idea: ai.maximo.ideaslab.data.FleetIdea): String = when (briefMode) { "build" -> "build"; "improve" -> "improve"; else -> if (idea.kind == "enhancement") "improve" else "build" }

    val favSet by favoritesStore?.favoritesFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    val store = favoritesStore

    var seenIds by remember { mutableStateOf(FleetData.ideas.map { it.slug }.toSet()) }
    val seenFromStore by seenStore?.seenFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    var seenHydrated by remember { mutableStateOf(false) }
    LaunchedEffect(seenFromStore) {
        if (seenHydrated) return@LaunchedEffect
        if (seenFromStore.isNotEmpty()) {
            seenIds = seenIds + seenFromStore
            seenHydrated = true
        } else if (seenStore != null) {
            try { seenStore.seedFromIdeas(FleetData.ideas.map { it.slug }.toSet()) } catch (_: Exception) {}
            seenHydrated = true
        }
    }

    var searchQ by remember { mutableStateOf("") }
    val allPool = remember { FleetData.ideas + FleetData.generatedPool }
    val visiblePool = remember(seenIds, searchQ) {
        val q = searchQ.trim()
        if (q.isNotEmpty()) allPool else allPool.filter { it.slug in seenIds }
    }
    val ideas = remember(visiblePool, searchQ, showOnlyFavorites, favSet) {
        val withFav = if (!showOnlyFavorites) visiblePool else visiblePool.filter { it.slug in favSet }
        val qq = searchQ.trim().lowercase()
        if (qq.isEmpty()) withFav else withFav.filter { (it.title + " " + it.slug + " " + it.prompt + " " + it.evidence).lowercase().contains(qq) }
    }

    fun doReload() {
        if (refreshing) return
        scope.launch {
            try {
                refreshing = true
                delay(350)
                val candidates = allPool.filter { it.slug !in seenIds }
                if (candidates.isEmpty()) {
                    try { Toast.makeText(ctx, "No more new ideas — ${ideas.size} shown", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
                } else {
                    val take = minOf(3, candidates.size)
                    val shuffled = candidates.toMutableList()
                    var seed = (System.currentTimeMillis() % 233280).toInt() + 9301
                    fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
                    for (i in shuffled.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t }
                    val picked = shuffled.take(take)
                    seenIds = seenIds + picked.map { it.slug }.toSet()
                    try { seenStore?.addSeen(picked.map { it.slug }.toSet()) } catch (_: Exception) {}
                    try { Toast.makeText(ctx, "New: " + picked.joinToString(", ") { it.slug } + " · ${ideas.size + take} shown", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
                }
            } catch (_: Exception) {
                try { Toast.makeText(ctx, "Reload failed — try again", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
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
                try { Toast.makeText(ctx, "Load failed — try again", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
            } finally { loadingMore = false }
        }
    }

    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }
            .distinctUntilChanged()
            .filter { lastIndex ->
                lastIndex != null && lastIndex >= ideas.size + 3 && ideas.isNotEmpty() && !loadingMore && !endOfFeed && !refreshing && searchQ.trim().isEmpty() && !showOnlyFavorites
            }
            .collect { loadMore() }
    }
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

    // Single scroll container — header scrolls away so 2-3 cards are visible
    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = FilDimens.screen,
                end = FilDimens.screen,
                top = 8.dp,
                bottom = 80.dp + 24.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
        ) {
            item(key = "search") {
                OutlinedTextField(
                    value = searchQ,
                    onValueChange = { searchQ = it },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    placeholder = { Text("Search ideas, problem, solution…", style = FilType.bodySmall, color = p.muted2) },
                    singleLine = true,
                    textStyle = FilType.bodySmall,
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(999.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = p.accent, unfocusedBorderColor = p.line,
                        focusedContainerColor = p.panel, unfocusedContainerColor = p.panel,
                        cursorColor = p.accent, focusedTextColor = p.text, unfocusedTextColor = p.text,
                    ),
                )
            }
            item(key = "header") {
                FilScreenHeader(
                    title = "Ideas",
                    subtitle = "${ideas.size} shown · pull to reload" + if (showOnlyFavorites) " · ★ favorites" else "",
                    actions = {
                        FilterChip(
                            selected = showOnlyFavorites,
                            onClick = { showOnlyFavorites = !showOnlyFavorites },
                            label = { Text("★ ${favSet.size}", style = FilType.chip) },
                            modifier = Modifier.heightIn(min = 40.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = p.accentDeep, selectedLabelColor = p.onAccent,
                                containerColor = p.panel2, labelColor = p.muted,
                            ),
                        )
                        IconButton(onClick = onNotifications, modifier = Modifier.size(44.dp)) {
                            Text("🔔", style = MaterialTheme.typography.titleMedium)
                        }
                    },
                )
            }
            item(key = "brief-mode") {
                FilInset(padding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("BRIEF MODE", style = FilType.sectionLabel, color = p.muted2)
                        Spacer(Modifier.weight(1f))
                        for (m in listOf("auto", "build", "improve")) {
                            val label = when (m) { "auto" -> "Auto"; "build" -> "BUILD"; else -> "IMPROVE" }
                            FilterChip(
                                selected = briefMode == m,
                                onClick = { briefMode = m },
                                label = { Text(label, style = FilType.label) },
                                modifier = Modifier.heightIn(min = 32.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = if (briefMode == m) p.accentDeep else p.panel3,
                                    selectedLabelColor = if (briefMode == m) p.onAccent else p.muted,
                                    containerColor = p.panel3, labelColor = p.muted,
                                ),
                            )
                        }
                    }
                }
            }
            item(key = "reload") {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    FilledTonalButton(
                        onClick = { doReload() },
                        enabled = !refreshing,
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = p.panel3, contentColor = p.text),
                        modifier = Modifier.heightIn(min = 40.dp),
                    ) { Text(if (refreshing) "↻ Reloading…" else "↻ Reload", style = FilType.chip) }
                }
            }
            if (ideas.isEmpty()) {
                item(key = "empty") {
                    EmptyState(
                        title = if (showOnlyFavorites) "No favorites yet" else "No ideas match",
                        body = if (showOnlyFavorites) "Tap ☆ on any idea to save it — persists after restart." else "Try a different search or clear filters.",
                        glyph = "☆",
                    ) {
                        OutlinedButton(onClick = { showOnlyFavorites = false; searchQ = "" }) { Text("Clear filters") }
                    }
                }
            } else {
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
                                            Toast.makeText(ctx, if (nowFav) "Saved ★ ${idea.slug}" else "Removed ${idea.slug}", Toast.LENGTH_SHORT).show()
                                        } catch (_: Exception) {}
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
                                            try {
                                                val res = api.scaffold(idea.slug, idea.slug, idea.kind, idea.targetSlug.ifEmpty { null })
                                                busySlug = null
                                                Toast.makeText(ctx, if(res.ok) res.message else (res.error ?: "Failed"), Toast.LENGTH_LONG).show()
                                            } catch (_: Exception) {
                                                busySlug = null
                                                try { Toast.makeText(ctx, "Scaffold failed — try again", Toast.LENGTH_SHORT).show() } catch (_: Exception) {}
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
                                Text(if (busySlug==idea.slug) "…" else if (idea.kind == "new") "Create dashboard" else "Scaffold tab", style = FilType.chip)
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = {
                                notifyModePick = resolveMode(idea)
                                notifyBot = "coding"
                                notifyPicker = idea
                            },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 40.dp),
                            enabled = notifyingSlug != idea.slug,
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = p.accent),
                            border = BorderStroke(1.dp, p.accent.copy(alpha = 0.35f)),
                        ) {
                            Text(if (notifyingSlug == idea.slug) "… Sending" else "\uD83D\uDCE8 Send to Bot", style = FilType.chip)
                        }
                    }
                }
                item(key = "ideas-sentinel") {
                    Box(Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                        when {
                            // A skeleton says "two more idea cards land here";
                            // a spinner only says "something is happening".
                            loadingMore -> FilListSkeleton(SkeletonKind.IDEA, count = 2)
                            endOfFeed && ideas.isNotEmpty() -> Text("You've seen all ideas — pull to reshuffle", style = FilType.label, color = p.muted2)
                            else -> Spacer(Modifier.height(4.dp))
                        }
                    }
                }
            }
        }
        if (notifyPicker != null) {
            val np = notifyPicker!!
            AlertDialog(
                onDismissRequest = { notifyPicker = null },
                title = { Text("Send \"" + np.title + "\" to Telegram?") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Sends the full " + notifyModePick.uppercase() + " brief (4096 cap) via POST /api/fleet/notify to " + (if (notifyBot=="coding") "@CodingAgent64Bot" else "@HermesAgent64SparkBot") + " — you'll see it instantly at 6090160018.", style = MaterialTheme.typography.bodySmall, color = p.muted)
                        FilInset(padding = PaddingValues(10.dp)) {
                            Text(np.slug + " · gap " + np.gapScore + "% · " + np.evidence.take(100) + "…", style = FilType.dataSmall, color = p.muted2)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Bot:", style = FilType.label, color = p.muted)
                            for (b in listOf("coding","spark")) {
                                FilterChip(
                                    selected = notifyBot==b,
                                    onClick = { notifyBot=b },
                                    label = { Text(if(b=="coding") "@CodingAgent64Bot" else "@HermesAgent64SparkBot", style = FilType.label) },
                                    modifier = Modifier.heightIn(min = 32.dp),
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = p.accentDeep, selectedLabelColor = p.onAccent),
                                )
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Mode:", style = FilType.label, color = p.muted)
                            for (m in listOf("build","improve")) {
                                FilterChip(
                                    selected = notifyModePick==m,
                                    onClick = { notifyModePick=m },
                                    label = { Text(m.uppercase(), style = FilType.label) },
                                    modifier = Modifier.heightIn(min = 32.dp),
                                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = if(notifyModePick==m) p.accentDeep else p.panel3, selectedLabelColor = if(notifyModePick==m) p.onAccent else p.muted),
                                )
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(onClick = {
                        val picked = np
                        notifyPicker = null
                        notifyingSlug = picked.slug
                        scope.launch {
                            try {
                                val res = api.notifyIdea(picked.slug, picked.slug, notifyModePick, notifyBot)
                                notifyingSlug = null
                                if (res.ok) {
                                    val bun = res.botUsername ?: if(notifyBot=="coding") "CodingAgent64Bot" else "HermesAgent64SparkBot"
                                    Toast.makeText(ctx, "📨 Sent to @" + bun + (if(res.messageId!=null) " · msg " + res.messageId else ""), Toast.LENGTH_LONG).show()
                                } else {
                                    Toast.makeText(ctx, "✕ " + (res.error ?: "Failed"), Toast.LENGTH_LONG).show()
                                }
                            } catch (e: Exception) {
                                notifyingSlug = null
                                try { Toast.makeText(ctx, "✕ " + (e.message ?: "Failed"), Toast.LENGTH_LONG).show() } catch(_: Exception){}
                            }
                        }
                    }) { Text("Send to @" + (if(notifyBot=="coding") "CodingAgent64Bot" else "HermesAgent64SparkBot")) }
                },
                dismissButton = { TextButton(onClick = { notifyPicker = null }) { Text("Cancel") } },
            )
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = p.panel, contentColor = p.accent)
    }
}
