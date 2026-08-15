package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.border
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CreateScreen(api: ApiClient) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var slug by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    fun doReload() {
        scope.launch {
            refreshing = true
            delay(300)
            slug = slug.trim()
            refreshing = false
            Toast.makeText(ctx, "Reloaded", Toast.LENGTH_SHORT).show()
        }
    }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp).padding(bottom = 88.dp + 16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Create / Scaffold", style = MaterialTheme.typography.titleMedium, maxLines = 1)
                    Text("POST fleet-ideas-lab.vercel.app/api/fleet/scaffold \u00b7 Pull to reload", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.5f), maxLines = 2)
                }
                FilledTonalButton(onClick = { doReload() }, enabled = !refreshing, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
                    Text(if (refreshing) "\u21bb Reloading\u2026" else "\u21bb Reload", style = MaterialTheme.typography.labelSmall)
                }
            }
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = slug,
                onValueChange = { slug = it.lowercase().replace(Regex("[^a-z0-9-]"), "-") },
                label = { Text("slug (e.g. my-new-dash)") },
                placeholder = { Text("my-new-dashboard") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            Text("Slug is normalized to lowercase kebab-case. Scaffold creates fleet entry + repo stub.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF6B5F82))
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    if (slug.isBlank()) { error = "Slug required"; return@Button }
                    busy = true; error = null; result = null
                    scope.launch {
                        val res = api.scaffold(slug.trim())
                        busy = false
                        if (res.ok) {
                            result = res.message
                            Toast.makeText(ctx, "Scaffolded: $slug", Toast.LENGTH_LONG).show()
                        } else error = res.error
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !busy && slug.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
            ) { Text(if(busy) "Scaffolding\u2026" else "Scaffold") }

            if (error != null) {
                Spacer(Modifier.height(12.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2A1010)), modifier = Modifier.fillMaxWidth().border(1.dp, Color(0xFFF87171).copy(alpha=0.3f), RoundedCornerShape(12.dp))) {
                    Box(Modifier.padding(12.dp)) { Text(error!!, style = MaterialTheme.typography.bodySmall, color = Color(0xFFFCA5A5)) }
                }
            }
            if (result != null) {
                Spacer(Modifier.height(12.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1E14)), modifier = Modifier.fillMaxWidth().border(1.dp, Color(0xFF34D399).copy(alpha=0.3f), RoundedCornerShape(12.dp))) {
                    Box(Modifier.padding(12.dp)) { Text(result!!, style = MaterialTheme.typography.bodySmall, color = Color(0xFF6EE7B7)) }
                }
            }
            Spacer(Modifier.height(12.dp))
            Text("Requires login \u2014 dl_session cookie sent automatically. Ask admin if 401.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.4f))
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = Color.White, contentColor = Color(0xFF7C3AED))
    }
}
