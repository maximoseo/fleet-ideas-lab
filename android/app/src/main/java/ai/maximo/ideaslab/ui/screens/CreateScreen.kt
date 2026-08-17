package ai.maximo.ideaslab.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val SLUG_RE = Regex("^[a-z0-9]+(?:-[a-z0-9]+)*$")
private fun isValidSlug(s: String) = SLUG_RE.matches(s) && s.length in 3..48
private fun domainColor(domain: String): androidx.compose.ui.graphics.Color = when (domain) {
    "seo" -> androidx.compose.ui.graphics.Color(0xFFA78BFA)
    "content" -> androidx.compose.ui.graphics.Color(0xFF34D399)
    "local" -> androidx.compose.ui.graphics.Color(0xFFFBBF24)
    "analytics" -> androidx.compose.ui.graphics.Color(0xFF60A5FA)
    "automation" -> androidx.compose.ui.graphics.Color(0xFFF472B6)
    "design" -> androidx.compose.ui.graphics.Color(0xFFC084FC)
    "outreach" -> androidx.compose.ui.graphics.Color(0xFFFB923C)
    "technical" -> androidx.compose.ui.graphics.Color(0xFF94A3B8)
    else -> androidx.compose.ui.graphics.Color(0xFFA78BFA)
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CreateScreen(api: ApiClient) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()

    val allIdeas = remember { FleetData.allIdeas }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("all") } // all | high | fresh
    var selectedSlug by remember { mutableStateOf(allIdeas.firstOrNull()?.slug ?: "") }
    var slug by remember { mutableStateOf(allIdeas.firstOrNull()?.slug ?: "") }
    var busy by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var terminalOpen by remember { mutableStateOf(false) }
    var terminalMsg by remember { mutableStateOf("Ready \u00b7 no terminal output yet.") }

    val filtered = remember(query, filter, allIdeas) {
        val q = query.trim().lowercase()
        allIdeas.filter { it ->
            val matchesQuery = q.isEmpty() || "${it.title} ${it.category} ${it.slug} ${it.prompt} ${it.evidence}".lowercase().contains(q)
            val matchesFilter = when (filter) {
                "high" -> it.impact == "high"
                "fresh" -> it.slug.contains("health") || it.slug.contains("ai-") || it.slug.contains("gbp") || it.slug.contains("aeo") || it.slug.contains("geo") || it.slug.contains("decay") || it.slug.contains("cwv") || it.evidence.contains("Research 2026-08-16")
                else -> true
            }
            matchesQuery && matchesFilter
        }
    }
    val selectedIdea = remember(selectedSlug, allIdeas) { allIdeas.find { it.slug == selectedSlug } ?: allIdeas.firstOrNull() }
    val valid = isValidSlug(slug)
    val counts = remember(allIdeas) {
        val high = allIdeas.count { it.impact == "high" }
        val fresh = allIdeas.count { it.evidence.contains("Research 2026-08-16") || it.slug in listOf("seo-crawl-budget-sentinel","content-freshness-radar","local-rank-pulse","analytics-cohort-explorer","automation-webhook-health","design-system-diff") }
        Triple(high, fresh, allIdeas.size)
    }

    fun doReload() {
        scope.launch {
            refreshing = true
            delay(300)
            refreshing = false
            Toast.makeText(ctx, "Reloaded", Toast.LENGTH_SHORT).show()
        }
    }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })

    fun copyPrompt(text: String) {
        val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("prompt", text))
        result = "Prompt copied"
        terminalMsg = "Prompt copied \u2014 ${selectedIdea?.slug ?: ""}"
        terminalOpen = true
        Toast.makeText(ctx, "Copied", Toast.LENGTH_SHORT).show()
        scope.launch { delay(1500); if (result == "Prompt copied") result = null }
    }

    fun scaffold() {
        if (!valid || busy) {
            error = if (!valid) "Check slug \u2014 kebab-case 3\u201348 chars" else null
            terminalMsg = error ?: terminalMsg
            terminalOpen = true
            return
        }
        val idea = selectedIdea ?: return
        busy = true; error = null; result = null
        terminalMsg = "Queued \u00b7 scaffold stub request prepared for /root/projects/$slug\u2026"
        terminalOpen = true
        scope.launch {
            val res = api.scaffold(slug.trim(), idea.slug, idea.kind, idea.targetSlug.ifEmpty { null })
            busy = false
            if (res.ok) {
                result = res.message
                terminalMsg = "\u2713 Scaffolded $slug \u2014 ${res.message.take(120)}"
                Toast.makeText(ctx, "Scaffolded: $slug", Toast.LENGTH_LONG).show()
            } else {
                error = res.error
                terminalMsg = "\u2717 Scaffold failed \u2014 ${res.error}"
            }
        }
    }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(FilDimens.screen).padding(bottom = 80.dp + 24.dp)) {
            FilScreenHeader(
                title = "Create / Scaffold",
                subtitle = "POST /api/fleet/scaffold \u00b7 ${counts.third} ideas \u00b7 pull to reload",
                actions = {
                    FilledTonalButton(
                        onClick = { doReload() },
                        enabled = !refreshing,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    ) { Text(if (refreshing) "\u21bb \u2026" else "\u21bb Reload", style = FilType.chip) }
                },
            )

            // Search + filters (mirrors web All / High / Fresh)
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search ideas\u2026", color = p.muted2, style = FilType.bodySmall) },
                singleLine = true,
                textStyle = FilType.bodySmall,
                shape = FilShape.card,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = p.accent, unfocusedBorderColor = p.line,
                    cursorColor = p.accent, focusedTextColor = p.text, unfocusedTextColor = p.text,
                    focusedContainerColor = p.panel, unfocusedContainerColor = p.panel,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all" to "All ${counts.third}", "high" to "High ${counts.first}", "fresh" to "Fresh ${counts.second}").forEach { (k, label) ->
                    val active = filter == k
                    FilterChip(
                        selected = active,
                        onClick = { filter = k },
                        label = { Text(label, style = FilType.chip) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = p.accentDeep, selectedLabelColor = p.onAccent,
                            containerColor = p.panel2, labelColor = p.muted
                        ),
                        border = if (active) null else BorderStroke(1.dp, p.line),
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            // Inbox list
            Text("Idea inbox \u00b7 ${filtered.size} / ${allIdeas.size}", style = FilType.sectionLabel, color = p.muted2)
            Spacer(Modifier.height(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                filtered.take(40).forEach { idea ->
                    val isSelected = idea.slug == selectedSlug
                    Card(
                        onClick = { selectedSlug = idea.slug; slug = idea.slug; result = null; error = null; terminalMsg = "Ready \u00b7 ${idea.title} selected." },
                        shape = FilShape.card,
                        colors = CardDefaults.cardColors(containerColor = if (isSelected) p.accentDeep else p.panel2),
                        border = BorderStroke(1.dp, if (isSelected) p.accent else p.line),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                            Box(Modifier.padding(top = 6.dp).size(8.dp).clip(RoundedCornerShape(4.dp)).background(domainColor(idea.category)))
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(idea.title, style = FilType.chip, color = if (isSelected) p.onAccent else p.text, maxLines = 2)
                                Spacer(Modifier.height(2.dp))
                                Text("${idea.category} \u00b7 ${idea.impact} \u00b7 ${idea.kind} \u00b7 gap ${idea.gapScore}", style = FilType.label, color = if (isSelected) p.onAccent.copy(alpha = 0.8f) else p.muted)
                                if (idea.evidence.isNotEmpty()) {
                                    Spacer(Modifier.height(4.dp))
                                    Text(idea.evidence, style = FilType.label, color = if (isSelected) p.onAccent.copy(alpha = 0.7f) else p.muted2, maxLines = 2)
                                }
                            }
                            if (isSelected) Text("\u2713", color = p.onAccent, style = FilType.chip)
                        }
                    }
                }
                if (filtered.isEmpty()) {
                    Text("No ideas match this search.", style = FilType.bodySmall, color = p.muted)
                }
            }

            // Detail — mirrors Bento/Three-Pane: category/impact/kind, Why now (evidence), prompt, slug, actions
            if (selectedIdea != null) {
                Spacer(Modifier.height(16.dp))
                Surface(shape = FilShape.card, color = p.panel, border = BorderStroke(1.dp, p.line)) {
                    Column(Modifier.padding(14.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = RoundedCornerShape(6.dp), color = p.panel3, border = BorderStroke(1.dp, p.line)) { Text(selectedIdea.category, style = FilType.label, color = p.muted, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) }
                            Surface(shape = RoundedCornerShape(6.dp), color = when (selectedIdea.impact) { "high" -> p.accentDeep.copy(alpha = 0.22f) else -> p.panel3 }, border = BorderStroke(1.dp, if (selectedIdea.impact == "high") p.accent.copy(alpha = 0.5f) else p.line)) { Text(selectedIdea.impact, style = FilType.label, color = if (selectedIdea.impact == "high") p.onAccent else p.muted, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) }
                            Text(selectedIdea.kind, style = FilType.label, color = p.muted2)
                            if (selectedIdea.targetSlug.isNotEmpty()) Text("\u2192 ${selectedIdea.targetSlug}", style = FilType.label, color = p.muted2)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(selectedIdea.title, style = FilType.cardTitle, color = p.text)
                        Spacer(Modifier.height(6.dp))
                        // Why now — evidence as amber card like canvas
                        Surface(shape = RoundedCornerShape(8.dp), color = p.warn.copy(alpha = 0.14f), border = BorderStroke(1.dp, p.warn.copy(alpha = 0.35f))) {
                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.Top) {
                                Text("!", color = p.warn, style = FilType.chip, modifier = Modifier.padding(end = 8.dp))
                                Text(selectedIdea.evidence.ifEmpty { "No evidence string \u2014 derived gap." }, style = FilType.bodySmall, color = p.text)
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        // Prompt payload
                        Surface(shape = RoundedCornerShape(8.dp), color = p.panel2, border = BorderStroke(1.dp, p.line)) {
                            Column(Modifier.padding(12.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text("Prompt payload", style = FilType.label, color = p.muted2)
                                    TextButton(onClick = { copyPrompt(selectedIdea.prompt) }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) { Text("Copy prompt", style = FilType.chip, color = p.accent) }
                                }
                                Spacer(Modifier.height(6.dp))
                                Text(selectedIdea.prompt, style = FilType.dataSmall, color = p.text)
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        // Slug
                        Text("Slug", style = FilType.chip, color = p.text)
                        Text("Kebab-case \u00b7 3\u201348 chars \u00b7 will create /root/projects/${slug.ifEmpty { "<slug>" }}", style = FilType.label, color = p.muted2)
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = slug,
                            onValueChange = { slug = it.lowercase().replace(Regex("[^a-z0-9-]"), "-").replace(Regex("-+"), "-"); if (error != null) error = null },
                            placeholder = { Text("my-new-dashboard", color = p.muted2) },
                            singleLine = true,
                            isError = !valid && slug.isNotEmpty(),
                            textStyle = FilType.data,
                            shape = FilShape.card,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = p.accent, unfocusedBorderColor = p.line,
                                errorBorderColor = p.bad, cursorColor = p.accent,
                                focusedTextColor = p.text, unfocusedTextColor = p.text,
                                focusedContainerColor = p.panel, unfocusedContainerColor = p.panel,
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(if (valid) "\u2713 Valid slug" else if (slug.isEmpty()) "Required" else "Lowercase kebab-case, 3\u201348 chars", style = FilType.label, color = if (valid) p.healthy else p.bad)
                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = { scaffold() },
                            modifier = Modifier.fillMaxWidth().height(FilDimens.touch),
                            enabled = !busy && valid,
                            shape = FilShape.card,
                            colors = ButtonDefaults.buttonColors(containerColor = p.accentDeep, contentColor = p.onAccent, disabledContainerColor = p.panel3, disabledContentColor = p.muted),
                        ) { Text(if (busy) "Scaffolding\u2026" else "Scaffold stub", style = FilType.chip) }
                        Spacer(Modifier.height(8.dp))
                        Text("Next: cd /root/projects/${slug.ifEmpty { "<slug>" }} && npm install \u00b7 wire vault data sources (no invented values).", style = FilType.label, color = p.muted2)
                        if (selectedIdea.targetSlug.isNotEmpty()) {
                            Spacer(Modifier.height(4.dp))
                            Text("Enhancement \u2192 merge as tab in ${selectedIdea.targetSlug} (do not scaffold standalone).", style = FilType.label, color = p.muted)
                        }
                    }
                }

                if (error != null) { Spacer(Modifier.height(12.dp)); FilBanner(text = error!!, tone = FilBannerTone.BAD) }
                if (result != null) { Spacer(Modifier.height(12.dp)); FilBanner(text = result!!, tone = FilBannerTone.INFO) }

                // Terminal footer (collapsible like canvas)
                Spacer(Modifier.height(12.dp))
                Surface(shape = RoundedCornerShape(8.dp), color = p.panel2, border = BorderStroke(1.dp, p.line)) {
                    Column(Modifier.padding(10.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = { terminalOpen = !terminalOpen }, contentPadding = PaddingValues(0.dp)) { Text(if (terminalOpen) "\u2304 Terminal output" else "\u203a Terminal output", style = FilType.label, color = p.text) }
                            Text("dl_session \u00b7 /login", style = FilType.label, color = p.muted2)
                        }
                        if (terminalOpen) {
                            Spacer(Modifier.height(6.dp))
                            Text(terminalMsg, style = FilType.dataSmall, color = p.accent)
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text("Versions via /api/app/version \u00b7 in-app update: WorkManager checks versionCode, downloads via /api/app/download (302\u2192GitHub), installs via FileProvider.", style = FilType.label, color = p.muted2)
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = p.panel, contentColor = p.accent)
    }
}
