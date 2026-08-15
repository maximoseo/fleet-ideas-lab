package ai.maximo.ideaslab

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import androidx.navigation.compose.rememberNavController
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.SessionStore
import ai.maximo.ideaslab.ui.AppNav
import ai.maximo.ideaslab.ui.theme.FleetIdeasLabTheme

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        val sessionStore = SessionStore(applicationContext)
        val api = ApiClient(sessionStore)
        setContent {
            FleetIdeasLabTheme {
                val nav = rememberNavController()
                var start by remember { mutableStateOf<String?>(null) }
                LaunchedEffect(Unit) {
                    val has = try { api.me() } catch(_:Exception){ false }
                    start = if (has) "inventory" else "login"
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
