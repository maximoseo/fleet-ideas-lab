package ai.maximo.ideaslab.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.NotificationHelper
import ai.maximo.ideaslab.data.UpdateChecker
import ai.maximo.ideaslab.data.UpdateCheckResult
import kotlinx.coroutines.launch

@Composable
fun UpdateBanner() {
    val ctx = LocalContext.current
    var state by remember { mutableStateOf<UpdateCheckResult?>(null) }
    LaunchedEffect(Unit) {
        state = try { UpdateChecker.check(ctx) } catch(_: Exception) { null }
    }
    val avail = state as? UpdateCheckResult.UpdateAvailable ?: return
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf<Int?>(null) }
    Card(Modifier.fillMaxWidth().padding(12.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1430))) {
        Column(Modifier.padding(14.dp)) {
            Text("\u2728 Update available \u00b7 ${avail.remote.versionName}", style = MaterialTheme.typography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(avail.remote.changelog, style = MaterialTheme.typography.bodySmall, color = Color(0xFFB8AAD6))
            Spacer(Modifier.height(10.dp))
            if (progress != null) LinearProgressIndicator(progress = (progress!! / 100f), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {
                    if (busy) return@Button
                    busy = true
                    scope.launch {
                        val file = UpdateChecker.downloadApk(ctx, avail.remote) { p -> progress = p }
                        busy = false
                        if (file != null) {
                            if (!UpdateChecker.canInstallPackages(ctx)) {
                                ctx.startActivity(UpdateChecker.requestInstallPermissionIntent(ctx).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                            } else {
                                UpdateChecker.installApk(ctx, file)
                                NotificationHelper.cancelUpdate(ctx)
                            }
                        } else {
                            // fallback: open browser
                            try {
                                ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(avail.remote.apkUrl.ifEmpty { avail.remote.fallbackUrl })).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                            } catch(_: Exception) {}
                        }
                    }
                }, enabled = !busy) { Text(if (busy) "Downloading ${progress ?: 0}%" else "Update now") }
                OutlinedButton(onClick = {
                    // Open in browser as fallback
                    try {
                        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(avail.remote.apkUrl.ifEmpty { avail.remote.fallbackUrl })).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                    } catch(_: Exception) {}
                }) { Text("Open link") }
            }
        }
    }
}

@Composable
fun UpdateScreen() {
    val ctx = LocalContext.current
    var state by remember { mutableStateOf<UpdateCheckResult?>(null) }
    var busy by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf<Int?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        state = try { UpdateChecker.check(ctx) } catch(_: Exception) { UpdateCheckResult.Error("Check failed") }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Updates", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF140F2A))) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("What's new in 1.2.0", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Color(0xFFA78BFA))
                Text(
                    "Live health sync \u2014 the Inventory now pulls the live fleet feed (/api/app/fleet) " +
                        "and shows a per-dashboard health chip (healthy / degraded / down) with latency and " +
                        "last-checked time. Fully offline-honest: on any failure it falls back to the last " +
                        "cached copy, then to the bundled snapshot with a clear 'offline snapshot' indicator.",
                    style = MaterialTheme.typography.bodySmall, color = Color(0xFFB8AAD6)
                )
            }
        }
        when (val s = state) {
            null -> { CircularProgressIndicator() }
            is UpdateCheckResult.UpToDate -> {
                Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("You are up to date \u2713", fontWeight = FontWeight.SemiBold); Text("No new version found.", style = MaterialTheme.typography.bodySmall) } }
                OutlinedButton(onClick = { state = null; scope.launch { state = try { UpdateChecker.check(ctx) } catch(_: Exception){ UpdateCheckResult.Error("Failed") } } }) { Text("Check again") }
            }
            is UpdateCheckResult.Error -> {
                Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF1A0F0F))) { Column(Modifier.padding(16.dp)) { Text("Check failed", color = Color(0xFFFCA5A5)); Text(s.message, style = MaterialTheme.typography.bodySmall, color = Color(0xFFFECACA)) } }
                OutlinedButton(onClick = { state = null; scope.launch { state = try { UpdateChecker.check(ctx) } catch(_: Exception){ UpdateCheckResult.Error("Failed") } } }) { Text("Retry") }
            }
            is UpdateCheckResult.UpdateAvailable -> {
                Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF140F2A))) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Version ${s.remote.versionName} available", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Installed: ${UpdateChecker.localVersionCode(ctx)} \u2192 ${s.remote.versionCode}", style = MaterialTheme.typography.labelMedium, color = Color(0xFFA78BFA))
                        HorizontalDivider()
                        Text(s.remote.changelog, style = MaterialTheme.typography.bodyMedium)
                        if (progress != null) LinearProgressIndicator(progress = (progress!!/100f), modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Button(onClick = {
                                if (busy) return@Button
                                busy = true; progress = 0
                                scope.launch {
                                    val file = UpdateChecker.downloadApk(ctx, s.remote) { p -> progress = p }
                                    busy = false
                                    if (file != null) {
                                        if (!UpdateChecker.canInstallPackages(ctx)) {
                                            ctx.startActivity(UpdateChecker.requestInstallPermissionIntent(ctx).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                                        } else {
                                            UpdateChecker.installApk(ctx, file)
                                            NotificationHelper.cancelUpdate(ctx)
                                        }
                                    } else {
                                        try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(s.remote.apkUrl.ifEmpty { s.remote.fallbackUrl })).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }) } catch(_: Exception){}
                                    }
                                }
                            }, enabled = !busy) { Text(if (busy) "Downloading ${progress ?: 0}%" else "Download & install") }
                            OutlinedButton(onClick = {
                                try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(s.remote.apkUrl.ifEmpty { s.remote.fallbackUrl })).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }) } catch(_: Exception){}
                            }) { Text("Open link") }
                        }
                        Text("APK will be saved to updates/ and installed via system installer. Allow Unknown sources if prompted.", style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280))
                    }
                }
            }
        }
    }
}
