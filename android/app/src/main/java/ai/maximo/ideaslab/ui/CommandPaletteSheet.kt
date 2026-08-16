package ai.maximo.ideaslab.ui

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
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import ai.maximo.ideaslab.data.FleetData

@Composable
fun CommandPaletteSheet(open: Boolean, onClose: () -> Unit, nav: NavController) {
  if (!open) return
  var q by remember { mutableStateOf("") }
  val all = remember {
    val entries = mutableListOf<Triple<String,String,String>>()
    for (s in FleetData.sites) entries.add(Triple(s.slug, s.name + " \u00b7 " + s.domain + " \u00b7 " + s.status, "dashboard"))
    for (idea in FleetData.ideas) entries.add(Triple(idea.slug, idea.title + " \u00b7 " + idea.category + " \u00b7 " + idea.kind + " · Gap " + idea.gapScore + "%", "idea"))
    for (g in FleetData.gaps) entries.add(Triple(g.lowercase() + "-gap", g + " gap radar", "gap"))
    entries
  }
  val filtered = remember(q) {
    if (q.isBlank()) all.take(20) else all.filter { it.first.contains(q.lowercase(), true) || it.second.contains(q.lowercase(), true) }.take(20)
  }
  AlertDialog(
    onDismissRequest = onClose,
    title = { Text("\u2318K Jump — dashboards · ideas · gaps", style = MaterialTheme.typography.titleSmall) },
    text = {
      Column(Modifier.fillMaxWidth()) {
        OutlinedTextField(value = q, onValueChange = { q = it }, placeholder = { Text("site-intel, anomaly, outreach…", style = MaterialTheme.typography.bodySmall) }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        LazyColumn(Modifier.heightIn(max = 320.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
          items(filtered) { (slug, sub, kind) ->
            Surface(onClick = {
              onClose()
              when (kind) {
                "dashboard" -> nav.navigate(if (slug == "schema-studio") "schema-studio" else "inventory")
                "idea" -> nav.navigate("ideas")
                else -> nav.navigate("gaps")
              }
            }, shape = RoundedCornerShape(12.dp), color = Color(0xFF231C33), modifier = Modifier.fillMaxWidth().border(1.dp, Color(0xFF3D3355), RoundedCornerShape(12.dp))) {
              Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Surface(shape = RoundedCornerShape(999.dp), color = when(kind){"dashboard"->Color(0xFF7C3AED).copy(0.2f);"idea"->Color(0xFF10B981).copy(0.2f); else->Color(0xFFF59E0B).copy(0.2f)}) { Text(kind, style = MaterialTheme.typography.labelSmall, color = when(kind){"dashboard"->Color(0xFFA78BFA);"idea"->Color(0xFF86EFAC); else->Color(0xFFFBBF24)}, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) }
                  Text(slug, style = MaterialTheme.typography.labelSmall, color = Color(0xFFF0ECF7))
                }
                Text(sub, style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF), maxLines = 1)
              }
            }
          }
        }
      }
    },
    confirmButton = { TextButton(onClick = onClose) { Text("Close") } }
  )
}
