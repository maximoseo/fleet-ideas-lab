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
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import androidx.navigation.compose.rememberNavController
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.NotificationHelper
import ai.maximo.ideaslab.data.FleetFavoritesStore
import ai.maximo.ideaslab.data.FleetSeenStore
import ai.maximo.ideaslab.data.SessionStore
import ai.maximo.ideaslab.data.UpdateCheckWorker
import ai.maximo.ideaslab.ui.AppNav
import ai.maximo.ideaslab.ui.theme.FilTheme

/** Routes a deep link is allowed to open. Anything else is ignored. */
private val DEEP_LINK_ROUTES = setOf("update", "ideas", "schema-studio")

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
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
        val favoritesStore = FleetFavoritesStore(applicationContext)
        val seenStore = FleetSeenStore(applicationContext)
        val api = ApiClient(sessionStore)
        // Two ways in: the notification extra, and a fleetideaslab://<host> deep link.
        val open = intent?.getStringExtra("open") ?: intent?.data
            ?.takeIf { it.scheme == "fleetideaslab" }
            ?.host
        setContent {
            FilTheme {
                val nav = rememberNavController()
                var start by remember { mutableStateOf<String?>(null) }
                LaunchedEffect(Unit) {
                    val has = try { api.me() } catch(_:Exception){ false }
                    start = if (has) "inventory" else "login"
                    // Handle notification deep link after nav ready
                    if (has && open != null && open in DEEP_LINK_ROUTES) {
                        kotlinx.coroutines.delay(600)
                        nav.navigate(open)
                    }
                }
                if (start != null) {
                    AppNav(
                        navController = nav,
                        startDestination = start!!,
                        api = api,
                        sessionStore = sessionStore,
                        favoritesStore = favoritesStore,
                        seenStore = seenStore,
                        // Survives the login detour: without this, opening a deep link
                        // while signed out drops the target and lands on Inventory.
                        afterLogin = open?.takeIf { it in DEEP_LINK_ROUTES },
                    )
                } else {
                    Box(Modifier.fillMaxSize()) {}
                }
            }
        }
    }
}
