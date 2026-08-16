package ai.maximo.ideaslab.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.FleetFavoritesStore
import ai.maximo.ideaslab.data.FleetSeenStore
import ai.maximo.ideaslab.data.SessionStore
import ai.maximo.ideaslab.ui.screens.*

data class NavItem(val route: String, val label: String, val icon: ImageVector)

val PrimaryTabs = listOf(
    NavItem("inventory", "Inventory", Icons.Filled.GridView),
    NavItem("ideas", "Ideas", Icons.Filled.Lightbulb),
    NavItem("favorites", "Favorites", Icons.Filled.Star),
    NavItem("gaps", "Gaps", Icons.Filled.GridOn),
    NavItem("create", "Create", Icons.Filled.AddCircle),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNav(navController: NavHostController, startDestination: String, api: ApiClient, sessionStore: SessionStore, favoritesStore: FleetFavoritesStore? = null, seenStore: FleetSeenStore? = null) {
    val back by navController.currentBackStackEntryAsState()
    val route = back?.destination?.route ?: startDestination
    val hideBar = route == "login"

    Scaffold(
        contentWindowInsets = WindowInsets.navigationBars,
        bottomBar = {
            if (!hideBar) BottomBar(navController, route)
        }
    ) { padding ->
        NavHost(navController = navController, startDestination = startDestination, modifier = Modifier.padding(padding)) {
            composable("login") { LoginScreen(api, sessionStore) { navController.navigate("inventory"){ popUpTo("login"){inclusive=true} } } }
            composable("inventory") { InventoryScreenWithUpdate(navController, api, onNotifications = { navController.navigate("notifications") }) }
            composable("ideas") { IdeasScreen(api, favoritesStore = favoritesStore, seenStore = seenStore, onNotifications = { navController.navigate("notifications") }) }
            composable("favorites") { FavoritesScreen(favoritesStore = favoritesStore, onBrowseIdeas = { navController.navigate("ideas") }) }
            composable("gaps") { GapsScreen() }
            composable("create") { CreateScreen(api) }
            composable("update") { UpdateScreen() }
            composable("notifications") { NotificationSettingsScreen() }
            composable("fleet-history") { FleetHistoryScreen(api) }
        }
    }
}

@Composable
private fun BottomBar(nav: NavHostController, route: String) {
    NavigationBar {
        PrimaryTabs.forEach { item ->
            NavigationBarItem(
                selected = route == item.route,
                onClick = { if(route!=item.route) nav.navigate(item.route) },
                icon = { Icon(item.icon, item.label) },
                label = { Text(item.label, maxLines=1) }
            )
        }
    }
}
