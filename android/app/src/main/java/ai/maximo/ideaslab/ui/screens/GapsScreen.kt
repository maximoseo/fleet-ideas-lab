package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.FleetData
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun GapsScreen() {
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
            Toast.makeText(ctx, "Reloaded \u00b7 gaps derived from 37", Toast.LENGTH_SHORT).show()
        }
    }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val sites = remember(reloadKey) { FleetData.sites }
    val gaps = FleetData.gaps
    val map = FleetData.matrix.associateBy { "${it.site}::${it.gap}" }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Gap Matrix", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1)
                    Text("Sites \u00d7 {SEO, Design, Content, Tech} \u00b7 0 none \u00b7 1 low \u00b7 2 high \u00b7 Pull to reload", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.6f), maxLines = 2)
                }
                FilledTonalButton(onClick = { doReload() }, enabled = !refreshing, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
                    Text(if (refreshing) "\u21bb Reloading\u2026" else "\u21bb Reload", style = MaterialTheme.typography.labelSmall)
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LegendDot(Color(0xFF1A1428), "0 none"); LegendDot(Color(0xFFFBBF24), "1 low"); LegendDot(Color(0xFFF87171), "2 high")
            }
            Spacer(Modifier.height(12.dp))
            val hScroll = rememberScrollState()
            val vScroll = rememberScrollState()
            Column(Modifier.fillMaxSize().verticalScroll(vScroll)) {
                Row(Modifier.horizontalScroll(hScroll)) {
                    Column {
                        Row {
                            Box(Modifier.width(140.dp).height(36.dp).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355)), contentAlignment = Alignment.Center) {
                                Text("Site / Gap", style = MaterialTheme.typography.labelSmall, color = Color(0xFFA89BC2))
                            }
                            gaps.forEach { g ->
                                Box(Modifier.width(80.dp).height(36.dp).background(Color(0xFF231C33)).border(1.dp, Color(0xFF3D3355)), contentAlignment = Alignment.Center) {
                                    Text(g, style = MaterialTheme.typography.labelSmall, color = Color(0xFFF0ECF7), maxLines = 1)
                                }
                            }
                        }
                        sites.forEach { s ->
                            Row {
                                Box(Modifier.width(140.dp).height(44.dp).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF2A2340)).padding(6.dp), contentAlignment = Alignment.CenterStart) {
                                    Text(s.slug, style = MaterialTheme.typography.labelSmall, color = Color(0xFFF0ECF7), maxLines=1)
                                }
                                gaps.forEach { g ->
                                    val cell = map["${s.slug}::${g}"]
                                    val level = cell?.level ?: 0
                                    val bg = when(level) { 2 -> Color(0xFFF87171); 1 -> Color(0xFFFBBF24); else -> Color(0xFF1A1428) }
                                    val fg = if(level==0) Color(0xFF6B5F82) else Color.White
                                    Box(Modifier.width(80.dp).height(44.dp).clip(RoundedCornerShape(4.dp)).background(bg.copy(alpha=if(level==0)0.5f else 0.9f)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(4.dp)), contentAlignment = Alignment.Center) {
                                        Text(level.toString(), style = MaterialTheme.typography.labelMedium, color = fg)
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(88.dp + 16.dp))
                    }
                }
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = Color.White, contentColor = Color(0xFF7C3AED))
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(10.dp).clip(RoundedCornerShape(999.dp)).background(color).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(999.dp)))
        Text(label, style = MaterialTheme.typography.labelSmall, color = Color(0xFFA89BC2))
    }
}
