package ai.maximo.ideaslab.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun FleetHistoryScreen(api: ApiClient) {
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
  Column(Modifier.fillMaxSize().padding(16.dp)) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Column { Text("Fleet History", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold); Text("Scaffolds + copies — 50 recent · persists to Supabase or host JSON", style = MaterialTheme.typography.bodySmall, color = Color(0xFF9CA3AF)) }
      FilledTonalButton(onClick = { load() }) { Text("Reload") }
    }
    Spacer(Modifier.height(12.dp))
    if (loading) { Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = androidx.compose.ui.Alignment.Center) { CircularProgressIndicator() } }
    else if (entries.isEmpty()) {
      Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(24.dp), contentAlignment = androidx.compose.ui.Alignment.Center) {
        Text("No history yet — scaffold a dashboard or copy a brief from Ideas", style = MaterialTheme.typography.bodySmall, color = Color(0xFF9CA3AF))
      }
    } else {
      LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 88.dp)) {
        items(entries) { e ->
          val kind = e.optString("kind", "note")
          val slug = e.optString("slug", "")
          val dir = e.optString("dir", "")
          val mode = e.optString("mode", "")
          val at = e.optString("created_at", "")
          Column(Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(12.dp)).padding(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
              val bg = when(kind){"scaffold"->Color(0xFF10B981);"copy"->Color(0xFF7C3AED); else->Color(0xFF6B7280)}
              Box(Modifier.clip(RoundedCornerShape(999.dp)).background(bg.copy(0.2f)).padding(horizontal=8.dp, vertical=2.dp)) { Text(kind, style = MaterialTheme.typography.labelSmall, color = bg) }
              Text(slug, style = MaterialTheme.typography.labelMedium, color = Color(0xFFF0ECF7), maxLines=1)
            }
            if (dir.isNotEmpty()) Text(dir, style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF), maxLines=1)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
              if (mode.isNotEmpty()) Text(mode, style = MaterialTheme.typography.labelSmall, color = Color(0xFFFBBF24))
              Text(at.take(19).replace("T"," "), style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280))
            }
          }
        }
      }
    }
  }
}
