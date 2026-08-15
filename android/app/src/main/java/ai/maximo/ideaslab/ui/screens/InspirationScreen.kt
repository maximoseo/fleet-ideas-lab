package ai.maximo.ideaslab.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient

@Composable
fun InspirationScreen(api: ApiClient) {
    var url by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Inspiration", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value=url, onValueChange={url=it}, label={Text("https://example.com")}, modifier=Modifier.fillMaxWidth(), singleLine=true)
        Spacer(Modifier.height(12.dp))
        Button(onClick={ result = "Analyzed: $\\url" }, modifier=Modifier.fillMaxWidth()){ Text("Analyze") }
        if(result!=null){ Spacer(Modifier.height(12.dp)); Card{ Box(Modifier.padding(16.dp)){ Text(result!!) } } }
        Spacer(Modifier.weight(1f))
        Text("Native Compose — calls /api/* with dl_session. Full flow in next iteration.", style=MaterialTheme.typography.bodySmall, color=MaterialTheme.colorScheme.onSurface.copy(alpha=0.5f))
    }
}
