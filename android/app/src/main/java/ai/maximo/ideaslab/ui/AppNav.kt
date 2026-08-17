package ai.maximo.ideaslab.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material.icons.outlined.GridOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.FleetFavoritesStore
import ai.maximo.ideaslab.data.FleetSeenStore
import ai.maximo.ideaslab.data.SessionStore
import ai.maximo.ideaslab.ui.screens.*
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

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
fun AppNav(navController: NavHostController, startDestination: String, api: ApiClient, sessionStore: SessionStore, favoritesStore: FleetFavoritesStore? = null, seenStore: FleetSeenStore? = null, afterLogin: String? = null) {
    val back by navController.currentBackStackEntryAsState()
    val route = back?.destination?.route ?: startDestination
    val hideBar = route == "login"
    val p = FilTheme.palette

    Scaffold(
        contentWindowInsets = WindowInsets.navigationBars,
        containerColor = p.bg,
        topBar = {
            if (!hideBar) {
                TopAppBar(
                    title = { Text("Fleet Ideas Lab", style = FilType.cardTitle, color = p.text) },
                    actions = {
                        IconButton(onClick = { navController.navigate("notifications") }, modifier = Modifier.size(44.dp)) {
                            Icon(Icons.Filled.Notifications, contentDescription = "Notifications", tint = p.muted, modifier = Modifier.size(22.dp))
                        }
                        IconButton(onClick = { navController.navigate("settings") }, modifier = Modifier.size(44.dp)) {
                            Icon(Icons.Filled.Settings, contentDescription = "Settings", tint = p.muted, modifier = Modifier.size(22.dp))
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = p.panel,
                        titleContentColor = p.text,
                        actionIconContentColor = p.muted,
                    ),
                    modifier = Modifier.border(BorderStroke(1.dp, p.line.copy(alpha = 0.5f))),
                )
            }
        },
        bottomBar = {
            if (!hideBar) BottomBar(navController, route)
        }
    ) { padding ->
        NavHost(navController = navController, startDestination = startDestination, modifier = Modifier.padding(padding)) {
            composable("login") {
                LoginScreen(api, sessionStore) {
                    // Land on the deep-link target when there was one, Inventory otherwise.
                    navController.navigate(afterLogin ?: "inventory") { popUpTo("login") { inclusive = true } }
                }
            }
            composable("inventory") { InventoryScreenWithUpdate(navController, api, onNotifications = { navController.navigate("notifications") }) }
            composable("ideas") { IdeasScreen(api, favoritesStore = favoritesStore, seenStore = seenStore, onNotifications = { navController.navigate("notifications") }) }
            composable("favorites") { FavoritesScreen(favoritesStore = favoritesStore, onBrowseIdeas = { navController.navigate("ideas") }) }
            composable("gaps") { GapsScreen() }
            composable("create") { CreateScreen(api) }
            composable("update") { UpdateScreen() }
            composable("settings") { SettingsScreen(navController = navController, api = api, sessionStore = sessionStore) }
            // Legacy route — kept for deep links / old bell buttons; now delegates to Settings so nothing breaks
            composable("notifications") { SettingsScreen(navController = navController, api = api, sessionStore = sessionStore) }
            composable("schema-studio") { SchemaStudioScreen(onNotifications = { navController.navigate("notifications") }) }
            composable("fleet-history") { FleetHistoryScreen(api) }
        }
    }
}

@Composable
private fun BottomBar(nav: NavHostController, route: String) {
    val p = FilTheme.palette
    NavigationBar(
        containerColor = p.panel,
        contentColor = p.text,
        tonalElevation = 0.dp,
        // Let NavigationBar handle gesture/3-button insets itself — fixed height(80.dp) was cutting it on phones
        windowInsets = WindowInsets.navigationBars,
        modifier = Modifier
            .border(BorderStroke(1.dp, p.line), shape = androidx.compose.foundation.shape.RoundedCornerShape(0.dp)),
    ) {
        PrimaryTabs.forEach { item ->
            val selected = route == item.route
            // Filled for selected, outlined-equivalent for unselected where available
            val iconVector: ImageVector = when {
                selected -> item.icon
                item.route == "inventory" -> Icons.Outlined.GridView
                item.route == "favorites" -> Icons.Outlined.StarOutline
                item.route == "gaps" -> Icons.Outlined.GridOn
                else -> item.icon
            }
            NavigationBarItem(
                selected = selected,
                onClick = { if (route != item.route) nav.navigate(item.route) },
                icon = {
                    Icon(
                        imageVector = iconVector,
                        contentDescription = item.label,
                        modifier = Modifier.size(24.dp),
                    )
                },
                label = {
                    Text(
                        text = item.label,
                        maxLines = 1,
                        style = FilType.label.copy(fontSize = 10.sp, letterSpacing = 0.2.sp),
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = p.onAccent,
                    selectedTextColor = p.text,
                    indicatorColor = p.accentDeep,
                    unselectedIconColor = p.muted,
                    unselectedTextColor = p.muted,
                ),
            )
        }
    }
}
