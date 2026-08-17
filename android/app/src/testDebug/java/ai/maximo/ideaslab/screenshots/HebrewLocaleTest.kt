package ai.maximo.ideaslab.screenshots

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.components.FilFleetStrip
import ai.maximo.ideaslab.ui.components.FilState
import ai.maximo.ideaslab.ui.components.FleetBar
import ai.maximo.ideaslab.ui.theme.FilTheme
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Proves the Hebrew resources actually resolve.
 *
 * This test exists because of one specific trap: Hebrew's ISO code changed from
 * `iw` to `he` in 1989, and Android still resolves the LEGACY code. A
 * `values-he` folder is silently ignored — no error, no warning, the app just
 * shows English. That is the most common way an Android Hebrew translation
 * ships and does nothing, and the only way to catch it is to assert that a
 * Hebrew string is on screen.
 *
 * The qualifier below is `iw` for the same reason.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class HebrewLocaleTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val bars = listOf(
        FleetBar("a", "Agent Fleet", FilState.HEALTHY, 90),
        FleetBar("b", "Local SEO", FilState.DEGRADED, 50),
        FleetBar("c", "Indexer", FilState.DOWN, 10),
        FleetBar("d", "Journey Lab", FilState.UNKNOWN, 0),
    )

    private fun render() {
        composeRule.setContent {
            FilTheme(darkTheme = true) {
                FilFleetStrip(bars = bars, modifier = Modifier.fillMaxWidth().padding(16.dp))
            }
        }
    }

    @Test
    @Config(sdk = [34], qualifiers = "iw-rIL-ldrtl-w390dp-h844dp-xhdpi")
    fun hebrewLegendResolves() {
        render()
        // If values-iw were named values-he, every one of these would still be
        // the English word and this test would fail — which is the point.
        for (word in listOf("תקין", "מדרדר", "מושבת", "לא ידוע")) {
            composeRule.onNodeWithText(word).assertIsDisplayed()
        }
        composeRule.onRoot().captureRoboImage("build/screenshots/locale-hebrew.png")
    }

    @Test
    @Config(sdk = [34], qualifiers = "iw-rIL-ldrtl-w390dp-h844dp-xhdpi")
    fun theColourRuleIsHebrewAndEndsCorrectly() {
        render()
        // The English literal rendered ".not" in an RTL layout — punctuation on
        // the wrong end. The Hebrew string carries its own full stop.
        composeRule
            .onNodeWithText("צבעים חמים אומרים שדשבורד דורש תשומת לב. צבעים קרים אומרים שלא.")
            .assertIsDisplayed()
    }

    @Test
    @Config(sdk = [34], qualifiers = "en-rUS-w390dp-h844dp-xhdpi")
    fun englishIsStillEnglish() {
        render()
        composeRule.onNodeWithText("Healthy").assertIsDisplayed()
    }
}
