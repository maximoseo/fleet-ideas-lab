package ai.maximo.ideaslab.screenshots

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.components.FilFleetStrip
import ai.maximo.ideaslab.ui.components.FilState
import ai.maximo.ideaslab.ui.components.FleetBar
import ai.maximo.ideaslab.ui.theme.FilTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * The legend is what makes the fleet strip honest, so it gets an assertion, not
 * just a screenshot.
 *
 * Rendered at fontScale 2.0 the old fixed Row pushed the "Unknown" band off the
 * end of the line. A fleet WITH unknown dashboards therefore reported as if it
 * had none — the interface stated something untrue, and it did so silently.
 *
 * A band may wrap to another line. A band may never disappear.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
class LegendIntegrityTest {

    @get:Rule
    val composeRule = createComposeRule()

    // Distinct counts per band on purpose: with 1-1-1-1 the count assertion
    // matches four nodes and fails for the wrong reason.
    private val bars =
        List(3) { FleetBar("h$it", "H$it", FilState.HEALTHY, 90) } +
            List(2) { FleetBar("d$it", "D$it", FilState.DEGRADED, 50) } +
            List(1) { FleetBar("x$it", "X$it", FilState.DOWN, 10) } +
            List(4) { FleetBar("u$it", "U$it", FilState.UNKNOWN, 0) }

    private fun render(fontScale: Float, rtl: Boolean = false) {
        composeRule.setContent {
            val base = LocalDensity.current
            CompositionLocalProvider(
                LocalDensity provides Density(base.density, fontScale),
                LocalLayoutDirection provides if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr,
            ) {
                FilTheme(darkTheme = true) {
                    FilFleetStrip(bars = bars, modifier = Modifier.fillMaxWidth().padding(16.dp))
                }
            }
        }
    }

    private fun assertEveryBandVisible() {
        for (word in listOf("Healthy", "Degraded", "Down", "Unknown")) {
            composeRule.onNodeWithText(word).assertIsDisplayed()
        }
        // And the counts, which are the other half of the claim. Unknown is
        // last in the row and therefore the one that used to be clipped, so its
        // count is the assertion that matters most.
        for (count in listOf("3", "2", "1", "4")) {
            composeRule.onNodeWithText(count).assertIsDisplayed()
        }
    }

    @Test
    fun allFourBandsSurviveNormalText() {
        render(1.0f)
        assertEveryBandVisible()
    }

    @Test
    fun allFourBandsSurviveLargeText() {
        render(1.5f)
        assertEveryBandVisible()
    }

    @Test
    fun allFourBandsSurviveHugeText() {
        // The case that was broken. Without the FlowRow this fails on "Unknown".
        render(2.0f)
        assertEveryBandVisible()
    }

    @Test
    fun allFourBandsSurviveRightToLeft() {
        render(1.0f, rtl = true)
        assertEveryBandVisible()
    }

    @Test
    fun theColourRuleIsAlwaysStatedInWords() {
        // Colour alone fails a colour-blind reader and a greyscale screenshot.
        render(2.0f)
        composeRule
            .onNodeWithText("Warm colours mean a dashboard wants attention. Cool means it does not.")
            .assertExists()
    }
}
