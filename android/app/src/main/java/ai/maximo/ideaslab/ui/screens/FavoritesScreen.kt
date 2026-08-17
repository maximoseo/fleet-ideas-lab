package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.data.FleetFavoritesStore
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
fun FavoritesScreen(favoritesStore: FleetFavoritesStore? = null, onBrowseIdeas: () -> Unit = {}) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    val favSet by favoritesStore?.favoritesFlow()?.collectAsState(initial = emptySet()) ?: remember { mutableStateOf(emptySet<String>()) }
    var refreshing by remember { mutableStateOf(false) }
    fun doReload() { scope.launch { refreshing = true; delay(400); refreshing = false; Toast.makeText(ctx, "Favorites · ${favSet.size} saved", Toast.LENGTH_SHORT).show() } }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val list = remember(favSet) { FleetData.ideas.filter { it.slug in favSet } }
    val newCount = list.count { it.kind == "new" }
    val enhCount = list.count { it.kind == "enhancement" }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().padding(horizontal = FilDimens.screen)) {
            FilScreenHeader(
                title = "Favorites",
                subtitle = "${list.size} saved · $newCount new · $enhCount enhance · persists in DataStore",
                actions = {
                    FilledTonalButton(
                        onClick = { doReload() },
                        enabled = !refreshing,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    ) { Text(if (refreshing) "↻ …" else "↻", style = FilType.chip) }
                },
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onBrowseIdeas, modifier = Modifier.heightIn(min = 40.dp)) { Text("Browse Ideas →", style = FilType.chip) }
                if (list.isNotEmpty() && favoritesStore != null) {
                    OutlinedButton(
                        onClick = { scope.launch { favSet.forEach { favoritesStore.toggleFavorite(it) } } },
                        modifier = Modifier.heightIn(min = 40.dp),
                    ) { Text("Clear all ★", style = FilType.chip) }
                }
            }
            Spacer(Modifier.height(12.dp))
            if (list.isEmpty()) {
                EmptyState(
                    title = "No favorites yet",
                    body = "Go to Ideas and tap ☆ on any card — it turns ★ and appears here. Survives reload and restart.",
                    glyph = "☆",
                ) {
                    Button(
                        onClick = onBrowseIdeas,
                        colors = ButtonDefaults.buttonColors(containerColor = p.accentDeep, contentColor = p.onAccent),
                    ) { Text("Browse 11 ideas →", style = FilType.chip) }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap), modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 80.dp + 24.dp, top = 4.dp)) {
                    items(list) { idea ->
                        var expanded by remember(idea.slug) { mutableStateOf(false) }
                        FilCard {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(idea.title, style = FilType.cardTitle, color = p.text, modifier = Modifier.weight(1f).padding(end = 8.dp), maxLines = 2, overflow = TextOverflow.Ellipsis)
                                FilTag(text = "★ saved", color = p.accent)
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(idea.category + " · " + idea.slug, style = FilType.label, color = p.muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(6.dp))
                            Text(idea.prompt, style = FilType.bodySmall, color = p.muted, maxLines = if (expanded) Int.MAX_VALUE else 2, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(8.dp))
                            OutlinedButton(onClick = { expanded = !expanded }, modifier = Modifier.fillMaxWidth().heightIn(min = 40.dp)) {
                                Text(if (expanded) "Hide brief ▲" else "Professional brief ▼", style = FilType.chip)
                            }
                            if (expanded) {
                                Spacer(Modifier.height(8.dp))
                                FilInset(padding = PaddingValues(10.dp)) {
                                    Text("Gap ${idea.gapScore}% · ${idea.evidence.take(160)}", style = FilType.dataSmall, color = p.accent)
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                OutlinedButton(onClick = {
                                    scope.launch { favoritesStore?.toggleFavorite(idea.slug) }
                                    Toast.makeText(ctx, "Removed ★ " + idea.slug, Toast.LENGTH_SHORT).show()
                                }, modifier = Modifier.weight(1f).heightIn(min = 44.dp)) { Text("Remove ★", style = FilType.chip) }
                                OutlinedButton(onClick = {
                                    val full = buildAgentPrompt(idea)
                                    clipboard.setText(AnnotatedString(full))
                                    Toast.makeText(ctx, "BUILD brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                                }, modifier = Modifier.weight(1f).heightIn(min = 44.dp)) { Text("Copy BUILD", style = FilType.chip) }
                                OutlinedButton(onClick = {
                                    val full = buildImprovePrompt(idea)
                                    clipboard.setText(AnnotatedString(full))
                                    Toast.makeText(ctx, "IMPROVE brief copied (" + idea.slug + ")", Toast.LENGTH_SHORT).show()
                                }, modifier = Modifier.weight(1f).heightIn(min = 44.dp)) { Text("Copy IMPROVE", style = FilType.chip) }
                            }
                        }
                    }
                }
            }
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = p.panel, contentColor = p.accent)
    }
}
