package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.FleetData
import kotlinx.coroutines.launch

@Composable
fun IdeasScreen(api: ApiClient) {
    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    var busySlug by remember { mutableStateOf<String?>(null) }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Fleet Ideas", style = MaterialTheme.typography.titleMedium)
        Text("12 cards · Copy prompt · Scaffold slug", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.6f))
        Spacer(Modifier.height(12.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
            items(FleetData.ideas) { idea ->
                Column(Modifier.clip(RoundedCornerShape(16.dp)).background(Color(0xFF1A1428)).border(1.dp, Color(0xFF3D3355), RoundedCornerShape(16.dp)).padding(12.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(idea.title, style = MaterialTheme.typography.titleSmall, color = Color(0xFFF0ECF7), modifier = Modifier.weight(1f))
                        Box(Modifier.clip(RoundedCornerShape(999.dp)).background(when(idea.impact){ "high"->Color(0xFF7C3AED); "med"->Color(0xFF2563EB); else->Color(0xFF6B7280) }.copy(alpha=0.2f)).padding(horizontal=8.dp, vertical=2.dp)) {
                            Text(idea.impact, style = MaterialTheme.typography.labelSmall, color = Color(0xFFA78BFA))
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text("${idea.category} · ${idea.slug}", style = MaterialTheme.typography.labelSmall, color = Color(0xFFA89BC2))
                    Spacer(Modifier.height(6.dp))
                    Text(idea.prompt, style = MaterialTheme.typography.bodySmall, color = Color(0xFFA89BC2), maxLines = 3)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = {
                            clipboard.setText(AnnotatedString(idea.prompt))
                            Toast.makeText(ctx, "Copied: ${idea.title}", Toast.LENGTH_SHORT).show()
                        }, modifier = Modifier.weight(1f)) { Text("Copy") }
                        Button(onClick = {
                            busySlug = idea.slug
                            scope.launch {
                                val res = api.scaffold(idea.slug)
                                busySlug = null
                                Toast.makeText(ctx, if(res.ok) res.message else (res.error ?: "Failed"), Toast.LENGTH_LONG).show()
                            }
                        }, modifier = Modifier.weight(1f), enabled = busySlug != idea.slug,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
                        ) { Text(if(busySlug==idea.slug) "..." else "Scaffold") }
                    }
                }
            }
        }
    }
}
