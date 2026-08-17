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
import androidx.navigation.NavController
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.NotificationHelper
import ai.maximo.ideaslab.data.SessionStore
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilInset
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.SectionHeader
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    navController: NavController? = null,
    api: ApiClient? = null,
    sessionStore: SessionStore? = null,
) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()

    // ── Notification state (same as NotificationSettingsScreen, but embedded here properly) ──
    val hasPermission = remember {
        mutableStateOf(
            if (Build.VERSION.SDK_INT >= 33) ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            else true
        )
    }
    val prefs = remember { ctx.getSharedPreferences("ideaslab_notif_prefs", 0) }
    var updatesEnabled by remember { mutableStateOf(prefs.getBoolean("updates_enabled", true)) }
    var ideasEnabled by remember { mutableStateOf(prefs.getBoolean("ideas_enabled", true)) }
    fun savePrefs() {
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

    // ── Account state ──
    var username by remember { mutableStateOf<String?>(null) }
    var showLogoutConfirm by remember { mutableStateOf(false) }
    var loggingOut by remember { mutableStateOf(false) }
    LaunchedEffect(sessionStore) {
        try { username = sessionStore?.getUsername() } catch (_: Exception) {}
    }
    fun doLogout() {
        if (loggingOut) return
        loggingOut = true
        scope.launch {
            try { api?.logout() } catch (_: Exception) {}
            try { sessionStore?.clear() } catch (_: Exception) {}
            loggingOut = false
            Toast.makeText(ctx, "Logged out", Toast.LENGTH_SHORT).show()
            navController?.navigate("login") {
                popUpTo(navController.graph.startDestinationId) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    Column(
        Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(FilDimens.screen).padding(bottom = 88.dp + 16.dp),
        verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
    ) {
        FilScreenHeader(
            title = "Settings",
            subtitle = "Account, notifications, and app — like most apps, logout lives here at the bottom.",
        )

        // ── Account ──────────────────────────────────────────────
        SectionHeader("Account")
        FilCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Avatar circle with initial
                Surface(
                    shape = androidx.compose.foundation.shape.CircleShape,
                    color = p.panel3,
                    border = androidx.compose.foundation.BorderStroke(1.dp, p.line),
                    modifier = Modifier.size(44.dp),
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = (username?.firstOrNull()?.uppercase() ?: "O"),
                            style = FilType.cardTitle,
                            color = p.text,
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(username ?: "Operator", style = FilType.cardTitle, color = p.text)
                    Text("dl_session · EncryptedSharedPreferences + DataStore", style = FilType.label, color = p.muted2)
                }
            }
            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = p.line)
            Spacer(Modifier.height(12.dp))
            Text(
                "Sign out clears your session locally and invalidates the server cookie (POST /api/auth/logout). You will return to the login screen.",
                style = FilType.label,
                color = p.muted,
            )
        }

        // ── Notifications ────────────────────────────────────────
        SectionHeader("Notifications")
        FilBanner(
            text = if (hasPermission.value) {
                "Notifications allowed — you will receive update and idea notifications."
            } else {
                "Notifications blocked — on Android 13+ grant permission in system settings."
            },
            tone = if (hasPermission.value) FilBannerTone.INFO else FilBannerTone.WARN,
        )
        if (!hasPermission.value) {
            OutlinedButton(onClick = { openSystemSettings() }, modifier = Modifier.fillMaxWidth().heightIn(min = FilDimens.touch)) {
                Text("Open system settings", style = FilType.chip)
            }
        }
        FilCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("App updates", style = FilType.cardTitle, color = p.text)
                    Text("New APK versions (ideaslab_updates, HIGH)", style = FilType.label, color = p.muted)
                }
                Switch(checked = updatesEnabled, onCheckedChange = { updatesEnabled = it; savePrefs() })
            }
            HorizontalDivider(color = p.line, modifier = Modifier.padding(vertical = 10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("New ideas", style = FilType.cardTitle, color = p.text)
                    Text("Fleet idea digests (ideaslab_ideas)", style = FilType.label, color = p.muted)
                }
                Switch(checked = ideasEnabled, onCheckedChange = { ideasEnabled = it; savePrefs() })
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Button(
                onClick = {
                    if (updatesEnabled) NotificationHelper.notifyUpdateAvailable(ctx, "1.3.1", "Test · Logout now lives in Settings")
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

        FilInset {
            Text("CHANNELS", style = FilType.sectionLabel, color = p.muted2)
            Spacer(Modifier.height(4.dp))
            Text("ideaslab_updates · HIGH · sound + heads-up", style = FilType.dataSmall, color = p.muted)
            Text("ideaslab_ideas · DEFAULT · quiet", style = FilType.dataSmall, color = p.muted)
        }

        // ── App ──────────────────────────────────────────────────
        SectionHeader("App")
        FilCard {
            Text("Fleet Ideas Lab", style = FilType.cardTitle, color = p.text)
            Text("38 dashboards · 29 ideas pool · Versions via /api/app/version", style = FilType.label, color = p.muted)
            Spacer(Modifier.height(6.dp))
            Text("Background checks run every 12h via WorkManager. Tap a notification to open Update or Ideas via deep link.", style = FilType.label, color = p.muted2)
        }

        // ── Destructive — Logout at the very bottom, like Gmail/Slack/Settings ──
        Spacer(Modifier.height(4.dp))
        HorizontalDivider(color = p.line)
        Spacer(Modifier.height(4.dp))
        Button(
            onClick = { showLogoutConfirm = true },
            enabled = !loggingOut && sessionStore != null,
            modifier = Modifier.fillMaxWidth().heightIn(min = FilDimens.touch),
            colors = ButtonDefaults.buttonColors(containerColor = p.bad, contentColor = p.onAccent),
        ) { Text(if (loggingOut) "Logging out…" else "Logout  —  התנתק", style = FilType.chip) }
        if (sessionStore == null) {
            Spacer(Modifier.height(6.dp))
            Text("Logout unavailable in preview", style = FilType.label, color = p.muted2)
        }
        Text("Logout clears dl_session locally and calls POST /api/auth/logout to clear the server cookie. Back stack is cleared — you cannot return with the back button.", style = FilType.label, color = p.muted2)

        if (showLogoutConfirm) {
            AlertDialog(
                onDismissRequest = { if (!loggingOut) showLogoutConfirm = false },
                title = { Text("Log out?", style = FilType.cardTitle, color = p.text) },
                text = { Text("This will clear your session (dl_session) and return you to the login screen. You will need to sign in again.", style = FilType.bodySmall, color = p.muted) },
                confirmButton = {
                    TextButton(onClick = { showLogoutConfirm = false; doLogout() }, enabled = !loggingOut) {
                        Text("Logout", color = p.bad, style = FilType.chip)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutConfirm = false }, enabled = !loggingOut) {
                        Text("Cancel", style = FilType.chip)
                    }
                },
                containerColor = p.panel,
                titleContentColor = p.text,
                textContentColor = p.muted,
            )
        }
    }
}
