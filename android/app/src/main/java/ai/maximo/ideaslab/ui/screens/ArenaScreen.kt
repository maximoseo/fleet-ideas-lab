package ai.maximo.ideaslab.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.ui.theme.*

@Composable
fun ArenaScreen(api: ApiClient) {
    var selected by remember { mutableStateOf(AllStyles.first()) }
    var tweaks by remember { mutableStateOf(Tweaks()) }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Style Arena", style = MaterialTheme.typography.titleMedium)
        Text("5 styles · tap to inspect", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.6f))
        Spacer(Modifier.height(12.dp))
        // chips
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AllStyles.forEach { s ->
                FilterChip(selected = selected.id==s.id, onClick = { selected = s }, label = { Text(s.name, maxLines=1) })
            }
        }
        Spacer(Modifier.height(12.dp))
        // selected preview
        DashboardPreviewCard(style = selected, tweaks = tweaks)
        Spacer(Modifier.height(12.dp))
        TweaksBar(tweaks) { tweaks = it }
        Spacer(Modifier.height(8.dp))
        // grid of 5
        LazyVerticalGrid(columns = GridCells.Fixed(2), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth().weight(1f)) {
            items(AllStyles) { s ->
                Box(Modifier.clip(RoundedCornerShape(16.dp)).border(1.dp, if(s.id==selected.id) s.accent else Color.White.copy(0.1f), RoundedCornerShape(16.dp)).clickable{ selected = s }.padding(8.dp)) {
                    Column {
                        Text(s.name, style = MaterialTheme.typography.labelMedium)
                        Text(s.description.take(32), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.5f))
                        Spacer(Modifier.height(8.dp))
                        Box(Modifier.fillMaxWidth().height(56.dp).clip(RoundedCornerShape(12.dp)).background(s.surface).border(1.dp, s.border, RoundedCornerShape(12.dp)))
                    }
                }
            }
        }
    }
}

data class Tweaks(val fontScale: Float = 1f, val radiusScale: Float = 1f, val spacingScale: Float = 1f, val motionLevel: Int = 1, val accentOverride: Color? = null)

@Composable
private fun DashboardPreviewCard(style: StyleTokens, tweaks: Tweaks) {
    val accent = tweaks.accentOverride ?: style.accent
    val r = (style.radius * tweaks.radiusScale).toInt()
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape((r+4).dp)).background(style.bg).border(1.dp, style.border, RoundedCornerShape((r+4).dp)).padding(12.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Client Board", color = style.textPrimary)
            Text("Connected", color = style.textMuted, style = MaterialTheme.typography.labelSmall)
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf("Today","Clients","Tasks").forEachIndexed{ i,l -> Box(Modifier.clip(CircleShape).background(if(i==0) accent else Color.Transparent).border(1.dp, style.border, CircleShape).padding(horizontal=10.dp, vertical=4.dp)) { Text(l, color = if(i==0) Color.White else style.textSecondary, style=MaterialTheme.typography.labelSmall) } } }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatBox("35","Active clients", accent, style, r); StatBox("128","Open tasks", style.warning, style, r)
        }
        Spacer(Modifier.height(8.dp))
        Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(r.dp)).background(style.surface).border(1.dp, style.border, RoundedCornerShape(r.dp)).padding(12.dp)) {
            Column { Text("Recent tasks", color = style.textPrimary, style=MaterialTheme.typography.labelMedium); Spacer(Modifier.height(8.dp)); listOf("Content update — A","SEO scan — B","Monthly report — C").forEach{ t-> Text(t, color=style.textSecondary, style=MaterialTheme.typography.bodySmall); Spacer(Modifier.height(4.dp)) } }
        }
    }
}
@Composable private fun StatBox(v:String,l:String,c:Color,s:StyleTokens,r:Int){ Column(Modifier.clip(RoundedCornerShape(r.dp)).background(s.elevated).border(1.dp,s.border,RoundedCornerShape(r.dp)).padding(10.dp)) { Text(v, color=c, style=MaterialTheme.typography.titleMedium); Text(l, color=s.textMuted, style=MaterialTheme.typography.labelSmall) } }

@Composable private fun TweaksBar(t: Tweaks, on: (Tweaks)->Unit){
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color.White.copy(0.05f)).border(1.dp, Color.White.copy(0.1f), RoundedCornerShape(12.dp)).padding(12.dp)) {
        Text("Tweaks", style=MaterialTheme.typography.labelLarge)
        LabeledSlider("Font", t.fontScale, 0.8f,1.4f){ on(t.copy(fontScale=it)) }
        LabeledSlider("Radius", t.radiusScale, 0.5f,2f){ on(t.copy(radiusScale=it)) }
        LabeledSlider("Spacing", t.spacingScale, 0.7f,1.5f){ on(t.copy(spacingScale=it)) }
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp), modifier=Modifier.fillMaxWidth()){
            Button(onClick={ val brief = "Design brief — \\${'$'}{t}"; /* share */ }, modifier=Modifier.weight(1f)){ Text("Copy Brief", maxLines=1) }
            OutlinedButton(onClick={}, modifier=Modifier.weight(1f)){ Text("Image Prompt") }
        }
    }
}
@Composable private fun LabeledSlider(label:String, v:Float, min:Float, max:Float, on:(Float)->Unit){ Column{ Text("$label: ${String.format("%.1f", v)}x", style=MaterialTheme.typography.labelSmall); Slider(value=v, onValueChange=on, valueRange=min..max) } }
