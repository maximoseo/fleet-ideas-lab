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
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.data.FleetFavoritesStore
import ai.maximo.ideaslab.data.buildAgentPrompt
import ai.maximo.ideaslab.data.buildImprovePrompt
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun FavoritesScreen(favoritesStore: FleetFavoritesStore? = null, onBrowseIdeas: () -> Unit = {}) {
    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    val favSet by favoritesStore?.favoritesFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    var refreshing by remember { mutableStateOf(false) }
    fun doReload() { scope.launch { refreshing = true; delay(400); refreshing = false; Toast.makeText(ctx, "Favorites \u00b7 ${favSet.size} saved", Toast.LENGTH_SHORT).show() } }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val list = remember(favSet) { FleetData.ideas.filter { it.slug in favSet } }
    val newCount = list.count { it.kind == "new" }
    val enhCount = list.count { it.kind == "enhancement" }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp).padding(top = 8.dp, bottom = 0.dp)) {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF231C33)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(16.dp)) {
                Text("\u2605 Favorites", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, color = Color(0xFFF0ECF7))
                Spacer(Modifier.height(4.dp))
                Text("Your saved ideas \u2014 tap \u2665 on any idea in Ideas to add it here. Persists in DataStore (Web: localStorage). ${list.size} saved \u00b7 $newCount New \u00b7 $enhCount Enhance.", style = MaterialTheme.typography.bodySmall, color = Color(0xFFA89BC2))
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onBrowseIdeas) { Text("Browse Ideas \u2192") }
                    if (list.isNotEmpty() && favoritesStore != null) {
                        OutlinedButton(onClick = { scope.launch { favSet.forEach { favoritesStore.toggleFavorite(it) } } }) { Text("Clear all \u2605") }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    for ((k,v) in listOf("Saved" to list.size, "New" to newCount, "Enhance" to enhCount)) {
                        Box(Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(12.dp)).padding(horizontal=12.dp, vertical=8.dp)) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("$v", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold); Text(k, style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280)) }
                        }
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            if (list.isEmpty()) {
                Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(24.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("\u2606", style = MaterialTheme.typography.headlineLarge, color = Color(0xFF6B7280))
                        Spacer(Modifier.height(8.dp))
                        Text("No favorites yet", style = MaterialTheme.typography.titleMedium, color = Color(0xFFF0ECF7))
                        Spacer(Modifier.height(4.dp))
                        Text("Go to Ideas and tap \u2661 on any card \u2014 it turns \u2665 and appears here. Survives reload and restart.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF9CA3AF))
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = onBrowseIdeas) { Text("Browse 11 ideas \u2192") }
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 88.dp + 16.dp, top = 4.dp)) {
                    items(list) { idea ->
                        var expanded by remember(idea.slug) { mutableStateOf(false) }
                        Column(Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(12.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(idea.title, style = MaterialTheme.typography.titleSmall, color = Color(0xFFF0ECF7), modifier = Modifier.weight(1f).padding(end = 8.dp), maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Box(Modifier.clip(RoundedCornerShape(999.dp)).background(Color(0xFFF59E0B).copy(alpha=0.2f)).padding(horizontal=6.dp, vertical=1.dp)) { Text("\u2605 saved", style = MaterialTheme.typography.labelSmall, color = Color(0xFFF59E0B)) }
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(idea.category + " \u00b7 " + idea.slug, style = MaterialTheme.typography.labelSmall, color = Color(0xFFA89BC2), maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(6.dp))
                            Text(idea.prompt, style = MaterialTheme.typography.bodySmall, color = Color(0xFFA89BC2), maxLines = if (expanded) Int.MAX_VALUE else 2, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(8.dp))
                            OutlinedButton(onClick = { expanded = !expanded }, modifier = Modifier.fillMaxWidth()) { Text(if (expanded) "Hide brief \u25b2" else "Professional brief \u25bc") }
                            if (expanded) {
                                Spacer(Modifier.height(8.dp))
                                Column(Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF231C33)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(12.dp)).padding(10.dp)) {
                                    Text("Gap " + idea.gapScore + "% \u00b7 " + idea.evidence.take(160), style = MaterialTheme.typography.bodySmall, color = Color(0xFFF59E0B))
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                OutlinedButton(onClick = {
                                    scope.launch { favoritesStore?.toggleFavorite(idea.slug) }
                                    Toast.makeText(ctx, "Removed \u2605 " + idea.slug, Toast.LENGTH_SHORT).show()
                                }, modifier = Modifier.weight(1f)) { Text("Remove \u2605") }
                                OutlinedButton(onClick = {
                                    val full = buildAgentPrompt(idea)
                                    clipboard.setText(AnnotatedString(full))
                                    Toast.makeText(ctx, "BUILD brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                                }, modifier = Modifier.weight(1f)) { Text("Copy BUILD") }
                            }
                            Spacer(Modifier.height(6.dp))
                            OutlinedButton(onClick = {
                                val full = buildImprovePrompt(idea)
                                clipboard.setText(AnnotatedString(full))
                                Toast.makeText(ctx, "IMPROVE brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                            }, modifier = Modifier.fillMaxWidth()) { Text("Copy IMPROVE") }
                        }
                    }
                }
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = Color.White, contentColor = Color(0xFF7C3AED))
    }
}
