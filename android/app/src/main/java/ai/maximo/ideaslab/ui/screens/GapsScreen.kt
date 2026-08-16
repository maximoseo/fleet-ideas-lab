package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun GapsScreen() {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var refreshing by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableStateOf(0) }
    fun doReload() {
        scope.launch {
            refreshing = true
            delay(400)
            reloadKey++
            refreshing = false
            Toast.makeText(ctx, "Reloaded · gaps derived from 37", Toast.LENGTH_SHORT).show()
        }
    }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val sites = remember(reloadKey) { FleetData.sites }
    val gaps = FleetData.gaps
    val map = FleetData.matrix.associateBy { "${it.site}::${it.gap}" }

    // Warm rule for cells: 0 none = quiet panel, 1 low = amber, 2 high = red-pink.
    fun cellColor(level: Int): Color = when (level) { 2 -> p.bad; 1 -> p.warn; else -> p.panel2 }
    fun cellWord(level: Int): String = when (level) { 2 -> "high"; 1 -> "low"; else -> "none" }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().padding(FilDimens.screen)) {
            FilScreenHeader(
                title = "Gap Matrix",
                subtitle = "Sites × {SEO, Design, Content, Tech} · 0 none · 1 low · 2 high",
                actions = {
                    FilledTonalButton(
                        onClick = { doReload() },
                        enabled = !refreshing,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    ) { Text(if (refreshing) "↻ …" else "↻ Reload", style = FilType.chip) }
                },
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                LegendDot(cellColor(0), "0 · none", bordered = true)
                LegendDot(cellColor(1), "1 · low")
                LegendDot(cellColor(2), "2 · high")
            }
            Text(
                "Cool = fine · warm = needs attention",
                style = FilType.label,
                color = p.muted2,
                modifier = Modifier.padding(top = 6.dp),
            )
            Spacer(Modifier.height(12.dp))
            val hScroll = rememberScrollState()
            val vScroll = rememberScrollState()
            Column(Modifier.fillMaxSize().verticalScroll(vScroll)) {
                Row(Modifier.horizontalScroll(hScroll)) {
                    Column {
                        Row {
                            Box(
                                Modifier.width(140.dp).height(36.dp).background(p.panel2).border(FilDimens.border, p.line),
                                contentAlignment = Alignment.CenterStart,
                            ) {
                                Text("SITE / GAP", style = FilType.sectionLabel, color = p.muted2, modifier = Modifier.padding(start = 8.dp))
                            }
                            gaps.forEach { g ->
                                Box(
                                    Modifier.width(80.dp).height(36.dp).background(p.panel3).border(FilDimens.border, p.line),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(g, style = FilType.label, color = p.text, maxLines = 1)
                                }
                            }
                        }
                        sites.forEach { s ->
                            Row {
                                Box(
                                    Modifier.width(140.dp).height(44.dp).background(p.panel).border(FilDimens.border, p.line).padding(horizontal = 8.dp),
                                    contentAlignment = Alignment.CenterStart,
                                ) {
                                    Text(s.slug, style = FilType.dataSmall, color = p.text, maxLines = 1)
                                }
                                gaps.forEach { g ->
                                    val level = map["${s.slug}::${g}"]?.level ?: 0
                                    val bg = cellColor(level)
                                    Box(
                                        Modifier
                                            .width(80.dp).height(44.dp)
                                            .clip(FilShape.inset)
                                            .background(bg.copy(alpha = if (level == 0) 1f else 0.85f))
                                            .border(FilDimens.border, if (level == 0) p.line else bg, FilShape.inset)
                                            .semantics { contentDescription = "${s.slug} $g gap ${cellWord(level)}" },
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            level.toString(),
                                            style = FilType.data,
                                            color = if (level == 0) p.muted2 else p.onAccent,
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(88.dp + 16.dp))
                    }
                }
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = p.panel, contentColor = p.accent)
    }
}

@Composable
private fun LegendDot(color: Color, label: String, bordered: Boolean = false) {
    val p = FilTheme.palette
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(
            Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(color)
                .border(FilDimens.border, if (bordered) p.line else color, CircleShape),
        )
        Text(label, style = FilType.label, color = p.muted)
    }
}
