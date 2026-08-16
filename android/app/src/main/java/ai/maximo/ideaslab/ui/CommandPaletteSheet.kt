package ai.maximo.ideaslab.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.ui.components.EmptyState
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilSearchField
import ai.maximo.ideaslab.ui.components.FilTag
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

@Composable
fun CommandPaletteSheet(open: Boolean, onClose: () -> Unit, nav: NavController) {
  if (!open) return
  val p = FilTheme.palette
  var q by remember { mutableStateOf("") }
  val all = remember {
    val entries = mutableListOf<Triple<String,String,String>>()
    for (s in FleetData.sites) entries.add(Triple(s.slug, s.name + " · " + s.domain + " · " + s.status, "dashboard"))
    for (idea in FleetData.ideas) entries.add(Triple(idea.slug, idea.title + " · " + idea.category + " · " + idea.kind + " · Gap " + idea.gapScore + "%", "idea"))
    for (g in FleetData.gaps) entries.add(Triple(g.lowercase() + "-gap", g + " gap radar", "gap"))
    entries
  }
  val filtered = remember(q) {
    if (q.isBlank()) all.take(20) else all.filter { it.first.contains(q.lowercase(), true) || it.second.contains(q.lowercase(), true) }.take(20)
  }
  AlertDialog(
    onDismissRequest = onClose,
    title = { Text("⌘K Jump — dashboards · ideas · gaps", style = FilType.cardTitle) },
    text = {
      Column(Modifier.fillMaxWidth()) {
        FilSearchField(value = q, onValueChange = { q = it }, placeholder = "site-intel, anomaly, outreach…")
        Spacer(Modifier.height(8.dp))
        if (filtered.isEmpty()) {
          EmptyState(
            title = "No matches",
            body = "Nothing in the fleet matches \"$q\" — try a dashboard slug, an idea, or a gap name.",
            glyph = "◇",
          )
        } else {
          LazyColumn(Modifier.heightIn(max = 320.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items(filtered) { (slug, sub, kind) ->
              val kindColor = when (kind) { "dashboard" -> p.accent; "idea" -> p.healthy; else -> p.warn }
              FilCard(onClick = {
                onClose()
                when (kind) {
                  "dashboard" -> nav.navigate(if (slug == "schema-studio") "schema-studio" else "inventory")
                  "idea" -> nav.navigate("ideas")
                  else -> nav.navigate("gaps")
                }
              }, padding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  FilTag(text = kind, color = kindColor)
                  Text(slug, style = FilType.dataSmall, color = p.text)
                }
                Text(sub, style = FilType.label, color = p.muted, maxLines = 1)
              }
            }
          }
        }
      }
    },
    confirmButton = { TextButton(onClick = onClose) { Text("Close") } },
  )
}
