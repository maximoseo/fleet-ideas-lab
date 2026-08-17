package ai.maximo.ideaslab.screenshots

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilFleetStrip
import ai.maximo.ideaslab.ui.components.FilHealthTrack
import ai.maximo.ideaslab.ui.components.FilListSkeleton
import ai.maximo.ideaslab.ui.components.FilState
import ai.maximo.ideaslab.ui.components.FilTag
import ai.maximo.ideaslab.ui.components.FleetBar
import ai.maximo.ideaslab.ui.components.SkeletonKind
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * The Inventory screen as a whole: strip, then rows, and the loading state that
 * precedes both. Rendering the pieces separately proves each one; rendering
 * them together is the only way to see whether the screen reads as one thing.
 *
 * A realistic fleet — 38 bars, not 6 — because the strip's whole job is to make
 * 38 legible and it behaves differently when the bars get thin.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
class InventoryHeaderScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val fleet: List<FleetBar> = buildList {
        val names = listOf(
            "Agent Fleet", "Agentic OS", "AI Visibility", "Churn", "Clients Automation",
            "Competitor Intel", "Content Automation", "Content Decay", "Engagement", "Fleet Hub",
            "Fleet Ideas Lab", "Forecast", "Indexing", "Journey Lab", "Link Loss",
            "Local SEO", "N8N Monitoring", "Prompt Forge", "Radar", "Renewals",
            "Reports", "Revenue", "Reviews", "Schema Studio", "SEO Audit",
            "SEO Dashboard", "Service Vault", "Site Intel", "Site Scan Fix", "Site Vault",
            "SLA", "Status", "Subscription Quota", "To-Do Tasks", "WP Command",
            "Schema", "AIO", "Hub Status",
        )
        names.forEachIndexed { i, n ->
            val state = when {
                i == 13 -> FilState.UNKNOWN
                i == 12 -> FilState.DOWN
                i == 15 || i == 34 -> FilState.DEGRADED
                else -> FilState.HEALTHY
            }
            add(FleetBar(n.lowercase().replace(' ', '-'), n, state, 68 + (i * 7) % 32))
        }
    }

    private fun capture(name: String, dark: Boolean, content: @Composable () -> Unit) {
        composeRule.setContent {
            FilTheme(darkTheme = dark) {
                Column(
                    Modifier.fillMaxSize().background(FilTheme.palette.bg).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) { content() }
            }
        }
        composeRule.onRoot().captureRoboImage("build/screenshots/$name.png")
    }

    @Test fun inventoryDark() = capture("inventory-dark", dark = true) { Screen() }
    @Test fun inventoryLight() = capture("inventory-light", dark = false) { Screen() }
    @Test fun inventoryLoadingDark() = capture("inventory-loading-dark", dark = true) { Loading() }

    @Composable
    private fun Screen() {
        Text("Fleet Inventory", style = FilType.screenTitle, color = FilTheme.palette.text)
        Text(
            "38 dashboards · live sync · updated 2m ago",
            style = FilType.dataSmall,
            color = FilTheme.palette.muted,
        )
        FilFleetStrip(bars = fleet, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(4.dp))
        listOf(
            Triple("Indexing", FilState.DOWN, 12),
            Triple("Local SEO", FilState.DEGRADED, 52),
            Triple("Journey Lab", FilState.UNKNOWN, null),
        ).forEach { (name, state, health) ->
            FilCard(accent = null) {
                Text(name, style = FilType.cardTitle, color = FilTheme.palette.text)
                Spacer(Modifier.height(6.dp))
                FilTag(text = state.word, color = FilTheme.palette.muted)
                Spacer(Modifier.height(8.dp))
                FilHealthTrack(value = health)
            }
        }
    }

    @Composable
    private fun Loading() {
        Text("Fleet Inventory", style = FilType.screenTitle, color = FilTheme.palette.text)
        Text("Syncing fleet feed…", style = FilType.dataSmall, color = FilTheme.palette.muted)
        FilListSkeleton(SkeletonKind.SITE, count = 4)
    }
}
