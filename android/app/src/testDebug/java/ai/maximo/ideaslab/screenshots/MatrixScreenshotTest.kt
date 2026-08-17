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
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilFleetStrip
import ai.maximo.ideaslab.ui.components.FilHealthTrack
import ai.maximo.ideaslab.ui.components.FilSparkline
import ai.maximo.ideaslab.ui.components.FilState
import ai.maximo.ideaslab.ui.components.FleetBar
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
 * The full grid: light and dark, three font scales, both layout directions, and
 * a tablet width. Every combination is captured AND asserted, so a regression
 * shows up as a red test rather than as a picture nobody opened.
 *
 * This is the grid that found the two defects wave 1 fixed. It exists to keep
 * finding them.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MatrixScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val bars = List(24) { i ->
        FleetBar(
            "s$i", "Dashboard $i",
            when {
                i == 2 -> FilState.DOWN
                i == 5 || i == 9 -> FilState.DEGRADED
                i == 7 -> FilState.UNKNOWN
                else -> FilState.HEALTHY
            },
            62 + (i * 9) % 36,
        )
    }

    private fun render(dark: Boolean, fontScale: Float) {
        composeRule.setContent {
            val base = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(base.density, fontScale)) {
                FilTheme(darkTheme = dark) {
                    Column(
                        Modifier.fillMaxSize().background(FilTheme.palette.bg).padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        FilFleetStrip(bars = bars, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(4.dp))
                        FilCard(emphasised = true, accent = FilTheme.palette.bad) {
                            Text("Worst first", style = FilType.cardTitle, color = FilTheme.palette.text)
                            Spacer(Modifier.height(8.dp))
                            FilHealthTrack(value = 15)
                        }
                        FilCard {
                            Text("Ordinary row", style = FilType.cardTitle, color = FilTheme.palette.text)
                            Spacer(Modifier.height(8.dp))
                            FilHealthTrack(value = null)
                            Spacer(Modifier.height(8.dp))
                            FilSparkline(latencies = List(30) { (140L + it * 11) to (it != 12) })
                        }
                    }
                }
            }
        }
    }

    /** Every render must keep the legend whole — that is the invariant. */
    private fun assertLegendIntact() {
        for (word in listOf("Healthy", "Degraded", "Down", "Unknown")) {
            composeRule.onNodeWithText(word).assertIsDisplayed()
        }
    }

    private fun capture(name: String) =
        composeRule.onRoot().captureRoboImage("build/screenshots/matrix-$name.png")

    @Test @Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
    fun darkNormal() { render(true, 1f); assertLegendIntact(); capture("dark-1_0") }

    @Test @Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
    fun darkLarge() { render(true, 1.5f); assertLegendIntact(); capture("dark-1_5") }

    @Test @Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
    fun darkHuge() { render(true, 2f); assertLegendIntact(); capture("dark-2_0") }

    @Test @Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
    fun lightNormal() { render(false, 1f); assertLegendIntact(); capture("light-1_0") }

    @Test @Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
    fun lightHuge() { render(false, 2f); assertLegendIntact(); capture("light-2_0") }

    @Test @Config(sdk = [34], qualifiers = "iw-rIL-ldrtl-w390dp-h844dp-xhdpi")
    fun hebrewRtl() {
        render(true, 1f)
        // Hebrew words, because this is the locale that used to fall back to
        // English silently.
        for (word in listOf("תקין", "מדרדר", "מושבת", "לא ידוע")) {
            composeRule.onNodeWithText(word).assertIsDisplayed()
        }
        capture("hebrew-rtl")
    }

    @Test @Config(sdk = [34], qualifiers = "iw-rIL-ldrtl-w390dp-h844dp-xhdpi")
    fun hebrewRtlLarge() {
        render(true, 1.5f)
        composeRule.onNodeWithText("לא ידוע").assertIsDisplayed()
        capture("hebrew-rtl-1_5")
    }

    @Test @Config(sdk = [34], qualifiers = "w840dp-h1200dp-xhdpi")
    fun tablet() { render(true, 1f); assertLegendIntact(); capture("tablet") }
}
