package ai.maximo.ideaslab.ui.screens

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import ai.maximo.ideaslab.data.NotificationHelper

@Composable
fun NotificationSettingsScreen() {
    val ctx = LocalContext.current
    val hasPermission = remember {
        mutableStateOf(
            if (Build.VERSION.SDK_INT >= 33) ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            else true
        )
    }

    // Local toggles persisted via SharedPreferences (lightweight)
    val prefs = remember { ctx.getSharedPreferences("ideaslab_notif_prefs", 0) }
    var updatesEnabled by remember { mutableStateOf(prefs.getBoolean("updates_enabled", true)) }
    var ideasEnabled by remember { mutableStateOf(prefs.getBoolean("ideas_enabled", true)) }

    fun save() {
        prefs.edit().putBoolean("updates_enabled", updatesEnabled).putBoolean("ideas_enabled", ideasEnabled).apply()
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Notifications", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("Control how Fleet Ideas Lab notifies you. Channels respect system Do Not Disturb.", style = MaterialTheme.typography.bodySmall, color = Color(0xFF9CA3AF))

        // Permission card
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = if (hasPermission.value) Color(0xFF0F2A1A) else Color(0xFF2A1A0F))) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(if (hasPermission.value) "\u2713 Notifications allowed" else "\u26A0 Notifications blocked", fontWeight = FontWeight.SemiBold, color = if (hasPermission.value) Color(0xFF86EFAC) else Color(0xFFFDBA74))
                Text(
                    if (hasPermission.value) "You will receive update and idea notifications."
                    else "On Android 13+ you must grant notification permission. Tap Request or open system settings.",
                    style = MaterialTheme.typography.bodySmall, color = Color(0xFFD1D5DB)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (!hasPermission.value && Build.VERSION.SDK_INT >= 33) {
                        OutlinedButton(onClick = {
                            // Request via MainActivity fallback — here open settings as reliable path
                            try {
                                ctx.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                    putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                })
                            } catch (_: Exception) {}
                        }) { Text("Open system settings") }
                    } else if (!hasPermission.value) {
                        Button(onClick = {
                            try {
                                ctx.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                    putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                })
                            } catch (_: Exception) {}
                        }) { Text("Enable") }
                    }
                    TextButton(onClick = {
                        try {
                            ctx.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            })
                        } catch (_: Exception) {}
                    }) { Text("System settings") }
                }
            }
        }

        // Toggles
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1430))) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("App updates", fontWeight = FontWeight.SemiBold, color = Color.White)
                        Text("New APK versions (channel: ideaslab_updates, HIGH)", style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF))
                    }
                    Switch(checked = updatesEnabled, onCheckedChange = { updatesEnabled = it; save() })
                }
                HorizontalDivider(color = Color(0xFF2A2438))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("New ideas", fontWeight = FontWeight.SemiBold, color = Color.White)
                        Text("Fleet idea digests (channel: ideaslab_ideas)", style = MaterialTheme.typography.labelSmall, color = Color(0xFF9CA3AF))
                    }
                    Switch(checked = ideasEnabled, onCheckedChange = { ideasEnabled = it; save() })
                }
            }
        }

        // Actions
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = {
                    // Fire test notifications — respects toggles
                    if (updatesEnabled) NotificationHelper.notifyUpdateAvailable(ctx, "1.0.4", "Test \u00b7 In-app update + fingerprint + pull-to-refresh are working")
                    if (ideasEnabled) NotificationHelper.notifyNewIdeas(ctx, 3)
                    Toast.makeText(ctx, "Test notification sent", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
            ) { Text("Send test") }
            OutlinedButton(
                onClick = {
                    NotificationHelper.ensureChannels(ctx)
                    Toast.makeText(ctx, "Channels ensured", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.weight(1f)
            ) { Text("Ensure channels") }
        }

        Text("Tapping a notification opens the relevant screen (Update or Ideas) via deep link fleetideaslab://update / ://ideas. Background checks run every 12h via WorkManager.", style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280))

        // Channel info
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFF0C0A14))) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Channels", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = Color(0xFF9CA3AF))
                Text("ideaslab_updates \u00b7 HIGH \u00b7 sound + heads-up", style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280))
                Text("ideaslab_ideas \u00b7 DEFAULT \u00b7 quiet", style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280))
            }
        }
    }
}
