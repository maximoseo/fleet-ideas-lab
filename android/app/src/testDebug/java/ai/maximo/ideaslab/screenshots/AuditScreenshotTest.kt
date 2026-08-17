package ai.maximo.ideaslab.screenshots

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilFleetStrip
import ai.maximo.ideaslab.ui.components.FilHealthTrack
import ai.maximo.ideaslab.ui.components.FilState
import ai.maximo.ideaslab.ui.components.FilTag
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
 * Audit renders: the conditions nobody looks at.
 *
 * Large text and right-to-left are where an interface actually breaks, and both
 * are cheap to check once there is a renderer. A phone at fontScale 2.0 is not
 * an edge case — it is what an ops console looks like to anyone over forty
 * reading it outdoors.
 *
 * These exist to FIND problems, not to prove there are none.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
class AuditScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val bars = List(20) { i ->
        FleetBar(
            "s$i", "Dashboard $i",
            when {
                i == 3 -> FilState.DOWN
                i == 7 || i == 11 -> FilState.DEGRADED
                i == 9 -> FilState.UNKNOWN
                else -> FilState.HEALTHY
            },
            60 + (i * 5) % 40,
        )
    }

    private fun capture(
        name: String,
        fontScale: Float = 1f,
        rtl: Boolean = false,
    ) {
        composeRule.setContent {
            val base = LocalDensity.current
            CompositionLocalProvider(
                LocalDensity provides Density(density = base.density, fontScale = fontScale),
                LocalLayoutDirection provides if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr,
            ) {
                FilTheme(darkTheme = true) { Screen(rtl) }
            }
        }
        composeRule.onRoot().captureRoboImage("build/screenshots/audit-$name.png")
    }

    @Test fun baseline() = capture("baseline")
    @Test fun largeText() = capture("font-1_5", fontScale = 1.5f)
    @Test fun hugeText() = capture("font-2_0", fontScale = 2.0f)
    @Test fun rightToLeft() = capture("rtl", rtl = true)

    @Composable
    private fun Screen(rtl: Boolean) {
        Column(
            Modifier.fillMaxSize().background(FilTheme.palette.bg).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                if (rtl) "מלאי הצי" else "Fleet Inventory",
                style = FilType.screenTitle,
                color = FilTheme.palette.text,
            )
            Text(
                if (rtl) "38 דשבורדים · סנכרון חי · עודכן לפני 2 דקות"
                else "38 dashboards · live sync · updated 2m ago",
                style = FilType.dataSmall,
                color = FilTheme.palette.muted,
            )
            FilFleetStrip(bars = bars, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(4.dp))
            FilCard {
                Text(
                    if (rtl) "מנוע האינדוקס" else "Indexing Dashboard",
                    style = FilType.cardTitle,
                    color = FilTheme.palette.text,
                )
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilTag(text = "down", color = FilTheme.palette.bad)
                    FilTag(text = "automation", color = FilTheme.palette.muted)
                    FilTag(text = "reporting", color = FilTheme.palette.muted)
                }
                Spacer(Modifier.height(8.dp))
                FilHealthTrack(value = 12)
                Spacer(Modifier.height(8.dp))
                Text(
                    if (rtl) "נבדק לפני 4 דקות · השהיה 947 מ״ש"
                    else "checked 4m ago · latency 947ms",
                    style = FilType.dataSmall,
                    color = FilTheme.palette.muted,
                )
            }
        }
    }
}
