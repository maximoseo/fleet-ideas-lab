package ai.maximo.ideaslab.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.FleetData

@Composable
fun GapsScreen() {
    val sites = FleetData.sites
    val gaps = FleetData.gaps
    val map = FleetData.matrix.associateBy { "${it.site}::${it.gap}" }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Gap Matrix", style = MaterialTheme.typography.titleMedium)
        Text("Sites × {SEO, Design, Content, Tech} · 0 none · 1 low · 2 high", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.6f))
        Spacer(Modifier.height(12.dp))
        // Legend
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LegendDot(Color(0xFF1A1428), "0 none"); LegendDot(Color(0xFFFBBF24), "1 low"); LegendDot(Color(0xFFF87171), "2 high")
        }
        Spacer(Modifier.height(12.dp))
        val hScroll = rememberScrollState()
        val vScroll = rememberScrollState()
        Column(Modifier.fillMaxSize().verticalScroll(vScroll)) {
            Row(Modifier.horizontalScroll(hScroll)) {
                Column {
                    // header row
                    Row {
                        Box(Modifier.width(140.dp).height(36.dp).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355)), contentAlignment = Alignment.Center) {
                            Text("Site / Gap", style = MaterialTheme.typography.labelSmall, color = Color(0xFFA89BC2))
                        }
                        gaps.forEach { g ->
                            Box(Modifier.width(80.dp).height(36.dp).background(Color(0xFF231C33)).border(1.dp, Color(0xFF3D3355)), contentAlignment = Alignment.Center) {
                                Text(g, style = MaterialTheme.typography.labelSmall, color = Color(0xFFF0ECF7))
                            }
                        }
                    }
                    // rows
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
                }
            }
        }
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(10.dp).clip(RoundedCornerShape(999.dp)).background(color).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(999.dp)))
        Text(label, style = MaterialTheme.typography.labelSmall, color = Color(0xFFA89BC2))
    }
}
