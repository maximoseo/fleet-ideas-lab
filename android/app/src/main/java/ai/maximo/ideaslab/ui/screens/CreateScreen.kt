package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import kotlinx.coroutines.launch

@Composable
fun CreateScreen(api: ApiClient) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var slug by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Create / Scaffold", style = MaterialTheme.typography.titleMedium)
        Text("POST https://fleet-ideas-lab.maximo-seo.ai/api/fleet/scaffold with dl_session", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.5f))
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
        ) { Text(if(busy) "Scaffolding…" else "Scaffold") }

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
        Spacer(Modifier.weight(1f))
        Text("Requires login — dl_session cookie sent automatically. Ask admin if 401.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha=0.4f))
    }
}
