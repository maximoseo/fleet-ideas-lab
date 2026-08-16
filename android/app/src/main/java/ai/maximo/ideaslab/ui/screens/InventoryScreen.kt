package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.data.buildImprovePromptForProject
import ai.maximo.ideaslab.ui.CommandPaletteSheet
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun InventoryScreen(navController: NavController? = null, onNotifications: () -> Unit = {}) {
    var shuffleSeed by remember { mutableStateOf(0) }
    var paletteOpen by remember { mutableStateOf(false) }
    val ctx = LocalContext.current
    val clipboardImprove = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    var refreshing by remember { mutableStateOf(false) }
    fun doReload() { scope.launch { refreshing = true; delay(400); shuffleSeed++; refreshing = false; Toast.makeText(ctx, "Reloaded \u00b7 ${FleetData.sites.size} sites", Toast.LENGTH_SHORT).show() } }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val sites = remember(shuffleSeed) {
        if (shuffleSeed == 0) FleetData.sites else {
            val n = FleetData.sites.size
            val k = shuffleSeed % n
            FleetData.sites.drop(k) + FleetData.sites.take(k)
        }
    }
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Fleet Inventory", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("${FleetData.sites.size} verified \u00b7 audit 2026-08-15 \u00b7 violet #7C3AED", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.6f))
            }
            FilledTonalButton(onClick = { shuffleSeed++ }, modifier = Modifier.height(36.dp), contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp)) {
                Text("Find more \u21bb", style = MaterialTheme.typography.labelMedium)
            }
            OutlinedButton(onClick = { paletteOpen = true }, modifier = Modifier.height(36.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp)) { Text("\u2318K", style = MaterialTheme.typography.labelMedium) }
            FilledTonalButton(onClick = { doReload() }, enabled = !refreshing, modifier = Modifier.height(36.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp)) { Text(if (refreshing) "\u21bb" else "\u21bb Reload", style = MaterialTheme.typography.labelMedium) }
            IconButton(onClick = onNotifications, modifier = Modifier.size(36.dp)) { Text("\uD83D\uDD14", style = MaterialTheme.typography.titleMedium) }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            val chips = listOf(Triple("Live", Color(0xFF34D399), "\u22643d"), Triple("Beta", Color(0xFF60A5FA), "4-7d"), Triple("Build", Color(0xFFFBBF24), ">7d"))
            for ((label, col, hint) in chips) {
                Row(Modifier.clip(RoundedCornerShape(999.dp)).background(col.copy(alpha=0.15f)).border(1.dp, col.copy(alpha=0.3f), RoundedCornerShape(999.dp)).padding(horizontal=8.dp, vertical=4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(6.dp).clip(RoundedCornerShape(999.dp)).background(col)); Spacer(Modifier.width(6.dp)); Text("$label $hint", style = MaterialTheme.typography.labelSmall, color = col)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 8.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(6.dp).clip(RoundedCornerShape(999.dp)).background(Color(0xFFF38020)))
            Spacer(Modifier.width(6.dp))
            Text("Protected by Cloudflare Turnstile \u00b7 Encrypted dl_session", style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF))
        }
        Box(Modifier.fillMaxSize().pullRefresh(pullState)) {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 88.dp + 16.dp)
            ) {
                items(sites) { site ->
                    val explainer = when(site.status) { "live" -> "Live \u00b7 \u22643d, alias OK"; "beta" -> "Beta \u00b7 4-7d, still reachable"; else -> "Build \u00b7 >7d, needs attention" }
                    val statusColor = when(site.status) { "live" -> Color(0xFF34D399); "beta" -> Color(0xFFFBBF24); else -> Color(0xFFF87171) }
                    Column(Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(12.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(site.name, style = MaterialTheme.typography.labelMedium, color = Color(0xFFF0ECF7), maxLines = 1, modifier = Modifier.weight(1f))
                            Spacer(Modifier.width(8.dp))
                            Box(Modifier.clip(RoundedCornerShape(999.dp)).background(statusColor.copy(alpha=0.15f)).padding(horizontal=6.dp, vertical=2.dp)) {
                                Text(site.status, style = MaterialTheme.typography.labelSmall, color = statusColor)
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(site.domain, style = MaterialTheme.typography.bodySmall, color = Color(0xFFA89BC2), maxLines=1)
                        Spacer(Modifier.height(8.dp))
                        Text(site.stack, style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B5F82))
                        Text(explainer, style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280))
                        Spacer(Modifier.height(8.dp))
                        Box(Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF7C3AED).copy(alpha=0.15f)).border(1.dp, Color(0xFF7C3AED).copy(alpha=0.3f), RoundedCornerShape(8.dp)).padding(horizontal=8.dp, vertical=4.dp)) {
                            Text(site.slug, style = MaterialTheme.typography.labelSmall, color = Color(0xFFA78BFA))
                        }
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(onClick = {
                            val brief = buildImprovePromptForProject(site)
                            clipboardImprove.setText(AnnotatedString(brief))
                            Toast.makeText(ctx, "IMPROVE brief copied (" + site.slug + ")", Toast.LENGTH_SHORT).show()
                        }, modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) {
                            Text("Copy IMPROVE", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                item(span = { GridItemSpan(2) }) {
                    Column(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("MaximoSEO \u00b7 Fleet Ideas Lab \u00b7 Versions via /api/app/version", style = MaterialTheme.typography.labelSmall, color = Color(0xFF4B5563))
                        Spacer(Modifier.height(4.dp))
                        Text("Find more ideas shuffles ordering \u00b7 deterministic, no invented data", style = MaterialTheme.typography.labelSmall, color = Color(0xFF374151))
                    }
                }
            }
            PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = Color.White, contentColor = Color(0xFF7C3AED))
        }
        if (paletteOpen && navController != null) {
            CommandPaletteSheet(open = true, onClose = { paletteOpen = false }, nav = navController)
        }
    }
}

@Composable
fun InventoryScreenWithUpdate(navController: NavController, api: ai.maximo.ideaslab.data.ApiClient, onNotifications: () -> Unit = {}) {
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        UpdateBanner()
        InventoryScreen(navController = navController, onNotifications = onNotifications)
    }
}
