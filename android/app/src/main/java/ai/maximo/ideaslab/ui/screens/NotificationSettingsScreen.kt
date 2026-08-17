package ai.maximo.ideaslab.ui.screens

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import ai.maximo.ideaslab.data.NotificationHelper
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilInset
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.SectionHeader
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

@Composable
fun NotificationSettingsScreen() {
    val p = FilTheme.palette
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

    fun openSystemSettings() {
        try {
            ctx.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (_: Exception) {}
    }

    Column(
        Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(FilDimens.screen).padding(bottom = 80.dp + 24.dp),
        verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
    ) {
        FilScreenHeader(
            title = "Notifications",
            subtitle = "Control how Fleet Ideas Lab notifies you. Channels respect system Do Not Disturb.",
        )

        // Permission state — honest banner, cool when granted, warm when blocked.
        FilBanner(
            text = if (hasPermission.value) {
                "Notifications allowed — you will receive update and idea notifications."
            } else {
                "Notifications blocked — on Android 13+ you must grant permission in system settings."
            },
            tone = if (hasPermission.value) FilBannerTone.INFO else FilBannerTone.WARN,
        )
        if (!hasPermission.value) {
            OutlinedButton(onClick = { openSystemSettings() }, modifier = Modifier.fillMaxWidth().heightIn(min = FilDimens.touch)) {
                Text("Open system settings", style = FilType.chip)
            }
        }

        SectionHeader("Channels")
        FilCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("App updates", style = FilType.cardTitle, color = p.text)
                    Text("New APK versions (channel: ideaslab_updates, HIGH)", style = FilType.label, color = p.muted)
                }
                Switch(checked = updatesEnabled, onCheckedChange = { updatesEnabled = it; save() })
            }
            HorizontalDivider(color = p.line, modifier = Modifier.padding(vertical = 10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("New ideas", style = FilType.cardTitle, color = p.text)
                    Text("Fleet idea digests (channel: ideaslab_ideas)", style = FilType.label, color = p.muted)
                }
                Switch(checked = ideasEnabled, onCheckedChange = { ideasEnabled = it; save() })
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = {
                    // Fire test notifications — respects toggles
                    if (updatesEnabled) NotificationHelper.notifyUpdateAvailable(ctx, "1.0.4", "Test · In-app update + fingerprint + pull-to-refresh are working")
                    if (ideasEnabled) NotificationHelper.notifyNewIdeas(ctx, 3)
                    Toast.makeText(ctx, "Test notification sent", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.weight(1f).heightIn(min = FilDimens.touch),
                colors = ButtonDefaults.buttonColors(containerColor = p.accentDeep, contentColor = p.onAccent),
            ) { Text("Send test", style = FilType.chip) }
            OutlinedButton(
                onClick = {
                    NotificationHelper.ensureChannels(ctx)
                    Toast.makeText(ctx, "Channels ensured", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.weight(1f).heightIn(min = FilDimens.touch),
            ) { Text("Ensure channels", style = FilType.chip) }
        }

        Text(
            "Tapping a notification opens the relevant screen (Update or Ideas) via deep link fleetideaslab://update / ://ideas. Background checks run every 12h via WorkManager.",
            style = FilType.label,
            color = p.muted2,
        )

        FilInset {
            Text("CHANNELS", style = FilType.sectionLabel, color = p.muted2)
            Spacer(Modifier.height(4.dp))
            Text("ideaslab_updates · HIGH · sound + heads-up", style = FilType.dataSmall, color = p.muted)
            Text("ideaslab_ideas · DEFAULT · quiet", style = FilType.dataSmall, color = p.muted)
        }
    }
}
