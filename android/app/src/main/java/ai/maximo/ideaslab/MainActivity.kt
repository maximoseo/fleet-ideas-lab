package ai.maximo.ideaslab

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.app.ActivityCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import androidx.navigation.compose.rememberNavController
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.NotificationHelper
import ai.maximo.ideaslab.data.SessionStore
import ai.maximo.ideaslab.data.UpdateCheckWorker
import ai.maximo.ideaslab.ui.AppNav
import ai.maximo.ideaslab.ui.theme.FleetIdeasLabTheme

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        NotificationHelper.ensureChannels(applicationContext)
        UpdateCheckWorker.schedule(applicationContext)
        if (Build.VERSION.SDK_INT >= 33) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 9001)
            }
        }
        val sessionStore = SessionStore(applicationContext)
        val api = ApiClient(sessionStore)
        val open = intent?.getStringExtra("open")
        setContent {
            FleetIdeasLabTheme {
                val nav = rememberNavController()
                var start by remember { mutableStateOf<String?>(null) }
                LaunchedEffect(Unit) {
                    val has = try { api.me() } catch(_:Exception){ false }
                    start = if (has) "inventory" else "login"
                    // Handle notification deep link after nav ready
                    if (has && open != null) {
                        kotlinx.coroutines.delay(600)
                        when (open) {
                            "update" -> nav.navigate("update")
                            "ideas" -> nav.navigate("ideas")
                        }
                    }
                }
                if (start != null) {
                    AppNav(navController = nav, startDestination = start!!, api = api, sessionStore = sessionStore)
                } else {
                    Box(Modifier.fillMaxSize()) {}
                }
            }
        }
    }
}
