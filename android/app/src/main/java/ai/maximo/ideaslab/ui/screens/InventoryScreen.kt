package ai.maximo.ideaslab.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.FleetData

@Composable
fun InventoryScreen() {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Fleet Inventory", style = MaterialTheme.typography.titleMedium)
        Text("${FleetData.sites.size} sites · violet #7C3AED", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.6f))
        Spacer(Modifier.height(12.dp))
        LazyVerticalGrid(columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
            items(FleetData.sites) { site ->
                val statusColor = when(site.status) {
                    "live" -> Color(0xFF34D399)
                    "beta" -> Color(0xFFFBBF24)
                    else -> Color(0xFFF87171)
                }
                Column(Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(12.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(site.name, style = MaterialTheme.typography.labelMedium, color = Color(0xFFF0ECF7), maxLines = 1)
                        Box(Modifier.clip(RoundedCornerShape(999.dp)).background(statusColor.copy(alpha=0.15f)).padding(horizontal=6.dp, vertical=2.dp)) {
                            Text(site.status, style = MaterialTheme.typography.labelSmall, color = statusColor)
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(site.domain, style = MaterialTheme.typography.bodySmall, color = Color(0xFFA89BC2), maxLines=1)
                    Spacer(Modifier.height(8.dp))
                    Text(site.stack, style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B5F82))
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFF7C3AED).copy(alpha=0.15f)).border(1.dp, Color(0xFF7C3AED).copy(alpha=0.3f), RoundedCornerShape(8.dp)).padding(horizontal=8.dp, vertical=4.dp)) {
                        Text(site.slug, style = MaterialTheme.typography.labelSmall, color = Color(0xFFA78BFA))
                    }
                }
            }
        }
    }
}
