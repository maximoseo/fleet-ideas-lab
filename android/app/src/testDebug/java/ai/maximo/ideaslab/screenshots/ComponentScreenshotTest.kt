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
 * Renders the new components to PNG so they can be looked at.
 *
 * There is no emulator and no /dev/kvm on this machine. Without these the only
 * verification available for a visual change would be "it compiled", and the
 * light-theme bug on the web side is a standing reminder of how far that gets
 * you: it type-checked, it built, it deployed, and it had never once worked.
 *
 * Both themes, because a component is not done until it has been seen in both.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
class ComponentScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    /** A realistic fleet: mostly fine, a couple warm, one unknown. */
    private val bars = listOf(
        FleetBar("agent-fleet", "Agent Fleet", FilState.HEALTHY, 92),
        FleetBar("schema-studio", "Schema Studio", FilState.HEALTHY, 88),
        FleetBar("seo-dashboard", "SEO Dashboard", FilState.HEALTHY, 81),
        FleetBar("site-intel", "Site Intel", FilState.HEALTHY, 77),
        FleetBar("prompt-forge", "Prompt Forge", FilState.HEALTHY, 74),
        FleetBar("content-decay", "Content Decay", FilState.HEALTHY, 70),
        FleetBar("local-seo", "Local SEO", FilState.DEGRADED, 58),
        FleetBar("wp-command", "WP Command Center", FilState.DEGRADED, 52),
        FleetBar("indexer", "Indexer", FilState.DOWN, 12),
        FleetBar("journey-lab", "Journey Lab", FilState.UNKNOWN, 0),
        FleetBar("hub", "Fleet Hub", FilState.HEALTHY, 95),
        FleetBar("radar", "Radar", FilState.HEALTHY, 86),
    )

    private fun capture(name: String, dark: Boolean, content: @Composable () -> Unit) {
        composeRule.setContent {
            FilTheme(darkTheme = dark) {
                Column(
                    Modifier
                        .fillMaxSize()
                        .background(FilTheme.palette.bg)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) { content() }
            }
        }
        composeRule.onRoot().captureRoboImage("build/screenshots/$name.png")
    }

    @Test fun fleetStripDark() = capture("fleet-strip-dark", dark = true) { StripBlock() }
    @Test fun fleetStripLight() = capture("fleet-strip-light", dark = false) { StripBlock() }
    @Test fun healthTracksDark() = capture("health-tracks-dark", dark = true) { TrackBlock() }
    @Test fun healthTracksLight() = capture("health-tracks-light", dark = false) { TrackBlock() }
    @Test fun skeletonsDark() = capture("skeletons-dark", dark = true) { SkeletonBlock() }
    @Test fun skeletonsLight() = capture("skeletons-light", dark = false) { SkeletonBlock() }

    @Composable
    private fun StripBlock() {
        Text("Fleet strip", style = FilType.sectionLabel, color = FilTheme.palette.muted)
        FilFleetStrip(bars = bars, modifier = Modifier.fillMaxWidth())
    }

    @Composable
    private fun TrackBlock() {
        Text("Health tracks", style = FilType.sectionLabel, color = FilTheme.palette.muted)
        listOf(95 to "Fleet Hub", 74 to "Prompt Forge", 58 to "Local SEO", 12 to "Indexer").forEach { (v, name) ->
            FilCard {
                Text(name, style = FilType.cardTitle, color = FilTheme.palette.text)
                Spacer(Modifier.height(8.dp))
                FilHealthTrack(value = v)
            }
        }
        FilCard {
            Text("Journey Lab", style = FilType.cardTitle, color = FilTheme.palette.text)
            Spacer(Modifier.height(8.dp))
            // The one that matters: unknown must not render as zero.
            FilHealthTrack(value = null)
        }
    }

    @Composable
    private fun SkeletonBlock() {
        Text("Site skeleton", style = FilType.sectionLabel, color = FilTheme.palette.muted)
        FilListSkeleton(SkeletonKind.SITE, count = 1)
        Text("Idea skeleton", style = FilType.sectionLabel, color = FilTheme.palette.muted)
        FilListSkeleton(SkeletonKind.IDEA, count = 1)
        Text("Gap skeleton", style = FilType.sectionLabel, color = FilTheme.palette.muted)
        FilListSkeleton(SkeletonKind.GAP, count = 3)
    }
}
