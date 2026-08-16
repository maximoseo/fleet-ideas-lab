package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.data.FleetFavoritesStore
import ai.maximo.ideaslab.data.FleetSeenStore
import ai.maximo.ideaslab.data.buildAgentPrompt
import ai.maximo.ideaslab.data.buildImprovePrompt
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun IdeasScreen(api: ApiClient, favoritesStore: FleetFavoritesStore? = null, seenStore: FleetSeenStore? = null, onNotifications: () -> Unit = {}) {
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
    val visiblePool = remember(seenIds) { (FleetData.ideas + FleetData.generatedPool).filter { it.slug in seenIds } }
    val baseIdeas = remember(visiblePool, shuffleSeed) {
        if (shuffleSeed == 0) visiblePool else {
            val arr = visiblePool.toMutableList()
            var seed = shuffleSeed * 9301 + 49297
            fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
            for (i in arr.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = arr[i]; arr[i] = arr[j]; arr[j] = t }
            arr
        }
    }
    val ideas = remember(baseIdeas, showOnlyFavorites, favSet) {
        if (!showOnlyFavorites) baseIdeas else baseIdeas.filter { it.slug in favSet }
    }

    fun doReload() {
        scope.launch {
            refreshing = true
            delay(400)
            val allPool = FleetData.ideas + FleetData.generatedPool
            val candidates = allPool.filter { it.slug !in seenIds }
            if (candidates.isEmpty()) {
                shuffleSeed++
                Toast.makeText(ctx, "No more new ideas \u2014 reshuffled ${ideas.size} shown", Toast.LENGTH_SHORT).show()
            } else {
                val take = minOf(3, candidates.size)
                var seed = (shuffleSeed + 1) * 9301 + 49297
                fun rnd(): Double { seed = (seed * 9301 + 49297) % 233280; return seed / 233280.0 }
                val shuffled = candidates.toMutableList().also { l -> for (i in l.size - 1 downTo 1) { val j = (rnd() * (i + 1)).toInt(); val t = l[i]; l[i] = l[j]; l[j] = t } }
                val picked = shuffled.take(take)
                seenIds = seenIds + picked.map { it.slug }.toSet()
                seenStore?.addSeen(picked.map { it.slug }.toSet())
                shuffleSeed++
                Toast.makeText(ctx, "New ideas: " + picked.joinToString(", ") { it.slug } + " \u00b7 now ${(ideas.size + take)} shown (reshuffled)", Toast.LENGTH_SHORT).show()
            }
            refreshing = false
        }
    }

    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })

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
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp).padding(top = 8.dp, bottom = 0.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Fleet Ideas Lab", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${ideas.size} shown \u00b7 5 new + 6 enhance \u00b7 Pull to reload" + if (showOnlyFavorites) " \u00b7 \u2605 favorites" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.6f), maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    FilterChip(selected = showOnlyFavorites, onClick = { showOnlyFavorites = !showOnlyFavorites }, label = { Text("\u2605 ${favSet.size}") }, leadingIcon = { Text(if (showOnlyFavorites) "\u2605" else "\u2606") })
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(999.dp)).background(Color(0xFF231C33)).border(1.dp, Color(0xFF7C3AED).copy(0.3f), RoundedCornerShape(999.dp)).padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Brief mode:", style = MaterialTheme.typography.labelSmall, color = Color(0xFFA78BFA))
                for (m in listOf("auto","build","improve")) {
                    val sel = briefMode == m
                    val label = when(m){"auto"->"Auto"; "build"->"BUILD"; else->"IMPROVE"}
                    FilterChip(selected = sel, onClick = { briefMode = m }, label = { Text(label, style = MaterialTheme.typography.labelSmall) })
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    FilledTonalButton(onClick = { doReload() }, enabled = !refreshing, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)) {
                        Text(if (refreshing) "\u21bb Reloading\u2026" else "\u21bb Reload")
                    }
                    IconButton(onClick = onNotifications, modifier = Modifier.size(36.dp)) { Text("\uD83D\uDD14") }
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), horizontalArrangement = Arrangement.Center) {
                Box(Modifier.size(6.dp).clip(RoundedCornerShape(999.dp)).background(Color(0xFFF38020)))
                Spacer(Modifier.width(6.dp))
                Text("Protected by Cloudflare Turnstile \u00b7 Encrypted dl_session", style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF))
            }
            if (ideas.isEmpty() && showOnlyFavorites) {
                Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(24.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("\u2606 No favorites yet", style = MaterialTheme.typography.titleSmall, color = Color(0xFFF0ECF7))
                        Spacer(Modifier.height(4.dp))
                        Text("Tap \u2661 on any idea to save it \u2014 persists after restart", style = MaterialTheme.typography.bodySmall, color = Color(0xFF9CA3AF))
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(onClick = { showOnlyFavorites = false }) { Text("Show all \u00b7 ${visiblePool.size}") }
                    }
                }
            }
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 88.dp + 16.dp, top = 4.dp)
            ) {
                items(ideas) { idea ->
                    val brief = briefs[idea.slug]
                    val isOpen = expanded == idea.slug
                    val isFav = idea.slug in favSet
                    Column(Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(12.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(idea.title, style = MaterialTheme.typography.titleSmall, color = Color(0xFFF0ECF7), modifier = Modifier.weight(1f).padding(end = 8.dp), maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Column(horizontalAlignment = Alignment.End) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    FilledTonalButton(onClick = {
                                        if (store != null) scope.launch {
                                            store.toggleFavorite(idea.slug)
                                            val nowFav = store.isFavorite(idea.slug)
                                            Toast.makeText(ctx, if (nowFav) "Saved \u2605 ${idea.slug}" else "Removed ${idea.slug}", Toast.LENGTH_SHORT).show()
                                        }
                                    }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp), colors = ButtonDefaults.filledTonalButtonColors(containerColor = if (isFav) Color(0xFFF59E0B).copy(alpha=0.25f) else Color.White.copy(alpha=0.06f)), modifier = Modifier.height(28.dp)) {
                                        Text(if (isFav) "\u2665" else "\u2661", style = MaterialTheme.typography.labelSmall, color = if (isFav) Color(0xFFF59E0B) else Color(0xFF9CA3AF))
                                    }
                                    Box(Modifier.clip(RoundedCornerShape(999.dp)).background(when(idea.impact){ "high"->Color(0xFF7C3AED); "med"->Color(0xFF2563EB); else->Color(0xFF6B7280) }.copy(alpha=0.2f)).padding(horizontal=8.dp, vertical=2.dp)) {
                                        Text(idea.impact, style = MaterialTheme.typography.labelSmall, color = Color(0xFFA78BFA))
                                    }
                                }
                                Spacer(Modifier.height(2.dp))
                                val kindBg = if (idea.kind == "new") Color(0xFF10B981) else Color(0xFFF59E0B)
                                Box(Modifier.clip(RoundedCornerShape(999.dp)).background(kindBg.copy(alpha=0.2f)).padding(horizontal=6.dp, vertical=1.dp)) {
                                    Text(if (idea.kind == "new") "NEW" else "ENHANCE", style = MaterialTheme.typography.labelSmall, color = kindBg, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("${idea.category} \u00b7 ${idea.slug}", style = MaterialTheme.typography.labelSmall, color = Color(0xFFA89BC2), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(6.dp))
                        Text(idea.prompt, style = MaterialTheme.typography.bodySmall, color = Color(0xFFA89BC2), maxLines = if (isOpen) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(onClick = { expanded = if (isOpen) null else idea.slug }, modifier = Modifier.fillMaxWidth()) {
                            Text(if (isOpen) "Hide brief \u25b2" else "Professional brief \u25bc")
                        }
                        if (isOpen && brief != null) {
                            Spacer(Modifier.height(8.dp))
                            Column(Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF231C33)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(12.dp)).padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Problem: ${brief.first}", style = MaterialTheme.typography.bodySmall, color = Color(0xFFF87171))
                                Text("Solution: ${brief.second}", style = MaterialTheme.typography.bodySmall, color = Color(0xFFA78BFA))
                                Text("Benefit: ${brief.third}", style = MaterialTheme.typography.bodySmall, color = Color(0xFF86EFAC))
                                Text("Next: Scaffold \u2192 wire data (vault TBD) \u2192 ship", style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF))
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
                                        Text("Widgets: " + idea.prompt.take(120) + "\u2026", style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF))
                                        Text("Gap " + idea.gapScore + "% \u00b7 " + idea.evidence.take(100), style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF))
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
                                    }, colors = ButtonDefaults.buttonColors(containerColor = if (idea.kind == "new") Color(0xFF10B981) else Color(0xFFF59E0B))) {
                                        Text(if (idea.kind == "new") "Create dashboard" else "Scaffold tab")
                                    }
                                },
                                dismissButton = { TextButton(onClick = { showConfirm = false }) { Text("Cancel") } }
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(onClick = {
                                val m = resolveMode(idea)
                                val full = if (m == "improve") buildImprovePrompt(idea) else buildAgentPrompt(idea)
                                clipboard.setText(AnnotatedString(full))
                                Toast.makeText(ctx, (if (m=="improve") "IMPROVE" else "BUILD") + " brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                            }, modifier = Modifier.weight(1f)) { Text(if (resolveMode(idea)=="improve") "Copy IMPROVE" else "Copy BUILD") }
                            Button(onClick = { showConfirm = true }, modifier = Modifier.weight(1f), enabled = busySlug != idea.slug,
                                colors = ButtonDefaults.buttonColors(containerColor = if (idea.kind == "new") Color(0xFF7C3AED) else Color(0xFFF59E0B))
                            ) { Text(if(busySlug==idea.slug) "\u2026" else if (idea.kind == "new") "Create dashboard" else "Scaffold tab") }
                        }
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(onClick = {
                                val full = buildAgentPrompt(idea)
                                clipboard.setText(AnnotatedString(full))
                                Toast.makeText(ctx, "BUILD brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                            }, modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)) { Text("Copy BUILD", style = MaterialTheme.typography.labelSmall) }
                            OutlinedButton(onClick = {
                                val full = buildImprovePrompt(idea)
                                clipboard.setText(AnnotatedString(full))
                                Toast.makeText(ctx, "IMPROVE brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                            }, modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)) { Text("Copy IMPROVE", style = MaterialTheme.typography.labelSmall) }
                        }
                    }
                }
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = Color.White, contentColor = Color(0xFF7C3AED))
    }
}
