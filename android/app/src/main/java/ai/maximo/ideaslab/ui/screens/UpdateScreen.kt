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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.NotificationHelper
import ai.maximo.ideaslab.data.UpdateChecker
import ai.maximo.ideaslab.data.UpdateCheckResult
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.LoadingShimmerCard
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.launch

@Composable
fun UpdateBanner() {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    var state by remember { mutableStateOf<UpdateCheckResult?>(null) }
    LaunchedEffect(Unit) {
        state = try { UpdateChecker.check(ctx) } catch(_: Exception) { null }
    }
    val avail = state as? UpdateCheckResult.UpdateAvailable ?: return
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf<Int?>(null) }
    FilCard(Modifier.padding(horizontal = FilDimens.screen, vertical = 6.dp), accent = p.accent) {
        Text("✨ Update available · ${avail.remote.versionName}", style = FilType.cardTitle, color = p.text)
        Spacer(Modifier.height(4.dp))
        Text(avail.remote.changelog, style = FilType.bodySmall, color = p.muted)
        Spacer(Modifier.height(10.dp))
        if (progress != null) LinearProgressIndicator(progress = (progress!! / 100f), modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                if (busy) return@Button
                busy = true
                scope.launch {
                    val file = UpdateChecker.downloadApk(ctx, avail.remote) { pr -> progress = pr }
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
            }, enabled = !busy) { Text(if (busy) "Downloading ${progress ?: 0}%" else "Update now", style = FilType.chip) }
            OutlinedButton(onClick = {
                // Open in browser as fallback
                try {
                    ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(avail.remote.apkUrl.ifEmpty { avail.remote.fallbackUrl })).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                } catch(_: Exception) {}
            }) { Text("Open link", style = FilType.chip) }
        }
    }
}

@Composable
fun UpdateScreen() {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    var state by remember { mutableStateOf<UpdateCheckResult?>(null) }
    var busy by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf<Int?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        state = try { UpdateChecker.check(ctx) } catch(_: Exception) { UpdateCheckResult.Error("Check failed") }
    }

    Column(
        Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(FilDimens.screen).padding(bottom = 80.dp + 24.dp),
        verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
    ) {
        FilScreenHeader(title = "Updates", subtitle = "In-app APK updates · checked against /api/app/version")
        FilCard {
            Text("What's new in 1.2.0", style = FilType.cardTitle, color = p.accent)
            Spacer(Modifier.height(6.dp))
            Text(
                "Live health sync — the Inventory now pulls the live fleet feed (/api/app/fleet) " +
                    "and shows a per-dashboard health chip (healthy / degraded / down) with latency and " +
                    "last-checked time. Fully offline-honest: on any failure it falls back to the last " +
                    "cached copy, then to the bundled snapshot with a clear 'offline snapshot' indicator.",
                style = FilType.bodySmall,
                color = p.muted,
            )
        }
        when (val s = state) {
            null -> {
                LoadingShimmerCard()
                LoadingShimmerCard()
            }
            is UpdateCheckResult.UpToDate -> {
                FilBanner(text = "You are up to date — no new version found.", tone = FilBannerTone.INFO)
                OutlinedButton(
                    onClick = { state = null; scope.launch { state = try { UpdateChecker.check(ctx) } catch(_: Exception){ UpdateCheckResult.Error("Failed") } } },
                    modifier = Modifier.fillMaxWidth().heightIn(min = FilDimens.touch),
                ) { Text("Check again", style = FilType.chip) }
            }
            is UpdateCheckResult.Error -> {
                FilBanner(text = "Check failed — ${s.message}", tone = FilBannerTone.BAD)
                OutlinedButton(
                    onClick = { state = null; scope.launch { state = try { UpdateChecker.check(ctx) } catch(_: Exception){ UpdateCheckResult.Error("Failed") } } },
                    modifier = Modifier.fillMaxWidth().heightIn(min = FilDimens.touch),
                ) { Text("Retry", style = FilType.chip) }
            }
            is UpdateCheckResult.UpdateAvailable -> {
                FilCard(accent = p.accent) {
                    Text("Version ${s.remote.versionName} available", style = FilType.cardTitle, color = p.text)
                    Spacer(Modifier.height(4.dp))
                    Text("Installed: ${UpdateChecker.localVersionCode(ctx)} → ${s.remote.versionCode}", style = FilType.data, color = p.accent)
                    HorizontalDivider(color = p.line, modifier = Modifier.padding(vertical = 10.dp))
                    Text(s.remote.changelog, style = FilType.body, color = p.text)
                    if (progress != null) {
                        Spacer(Modifier.height(8.dp))
                        LinearProgressIndicator(progress = (progress!!/100f), modifier = Modifier.fillMaxWidth())
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Button(onClick = {
                            if (busy) return@Button
                            busy = true; progress = 0
                            scope.launch {
                                val file = UpdateChecker.downloadApk(ctx, s.remote) { pr -> progress = pr }
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
                        }, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = p.accentDeep, contentColor = p.onAccent)) {
                            Text(if (busy) "Downloading ${progress ?: 0}%" else "Download & install", style = FilType.chip)
                        }
                        OutlinedButton(onClick = {
                            try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(s.remote.apkUrl.ifEmpty { s.remote.fallbackUrl })).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }) } catch(_: Exception){}
                        }) { Text("Open link", style = FilType.chip) }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text("APK will be saved to updates/ and installed via system installer. Allow Unknown sources if prompted.", style = FilType.label, color = p.muted2)
                }
            }
        }
    }
}
