package ai.maximo.ideaslab.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.ui.components.EmptyState
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.FilTag
import ai.maximo.ideaslab.ui.components.LoadingShimmerCard
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun FleetHistoryScreen(api: ApiClient) {
  val p = FilTheme.palette
  var entries by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
  var loading by remember { mutableStateOf(true) }
  val scope = rememberCoroutineScope()
  fun load() {
    scope.launch {
      loading = true
      // Call GET /api/fleet/history via api client helper (reuse OkHttp)
      try {
        val token = api.getToken()
        if (token == null) { loading = false; return@launch }
        val client = okhttp3.OkHttpClient()
        val req = okhttp3.Request.Builder().url(api.baseUrl() + "/api/fleet/history").header("Cookie", "dl_session=$token").get().build()
        val res = client.newCall(req).execute()
        val txt = res.body?.string() ?: "{}"
        val json = JSONObject(txt)
        val arr = json.optJSONArray("entries")
        val list = mutableListOf<JSONObject>()
        if (arr != null) for (i in 0 until arr.length()) list.add(arr.getJSONObject(i))
        entries = list
      } catch (_: Exception) {}
      loading = false
    }
  }
  LaunchedEffect(Unit) { load() }
  Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = FilDimens.screen)) {
    FilScreenHeader(
      title = "Fleet History",
      subtitle = "Scaffolds + copies — 50 recent · persists to Supabase or host JSON",
      actions = {
        FilledTonalButton(onClick = { load() }, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
          Text("↻ Reload", style = FilType.chip)
        }
      },
    )
    Spacer(Modifier.height(4.dp))
    if (loading) {
      Column(verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap)) {
        LoadingShimmerCard(); LoadingShimmerCard(); LoadingShimmerCard()
      }
    } else if (entries.isEmpty()) {
      EmptyState(
        title = "No history yet",
        body = "Scaffold a dashboard or copy a brief from Ideas — actions land here.",
        glyph = "◇",
      )
    } else {
      LazyColumn(verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap), modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 88.dp)) {
        items(entries) { e ->
          val kind = e.optString("kind", "note")
          val slug = e.optString("slug", "")
          val dir = e.optString("dir", "")
          val mode = e.optString("mode", "")
          val at = e.optString("created_at", "")
          FilCard {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
              val kindColor = when (kind) { "scaffold" -> p.healthy; "copy" -> p.accent; else -> p.muted }
              FilTag(text = kind, color = kindColor)
              Text(slug, style = FilType.cardTitle, color = p.text, maxLines = 1)
            }
            if (dir.isNotEmpty()) {
              Spacer(Modifier.height(4.dp))
              Text(dir, style = FilType.dataSmall, color = p.muted, maxLines = 1)
            }
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
              if (mode.isNotEmpty()) Text(mode, style = FilType.label, color = p.warn)
              Text(at.take(19).replace("T", " "), style = FilType.dataSmall, color = p.muted2)
            }
          }
        }
      }
    }
  }
}
