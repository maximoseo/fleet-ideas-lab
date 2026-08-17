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
import ai.maximo.ideaslab.ui.components.FilHealthTrack
import ai.maximo.ideaslab.ui.components.FilSparkline
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
 * The detail screen's two novel pieces: the latency sparkline and the empty
 * case. Rendered rather than assumed, because a chart that looks reasonable in
 * code is exactly the kind of thing that comes out wrong.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
class DetailScreenshotTest {

    @get:Rule
    val composeRule = createComposeRule()

    // A realistic day: mostly fast, a slow patch, two outright failures.
    private val probes: List<Pair<Long, Boolean>> = buildList {
        repeat(20) { add((120L + (it * 37) % 90) to true) }
        add(0L to false)
        add(0L to false)
        repeat(8) { add((900L + (it * 60)) to true) }
        repeat(18) { add((140L + (it * 21) % 70) to true) }
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

    @Test fun detailDark() = capture("detail-dark", dark = true) { Detail() }
    @Test fun detailLight() = capture("detail-light", dark = false) { Detail() }

    @Composable
    private fun Detail() {
        Text("Indexing Dashboard", style = FilType.screenTitle, color = FilTheme.palette.text)
        Text("indexer.maximo-seo.ai", style = FilType.dataSmall, color = FilTheme.palette.muted)

        FilCard {
            Text("State", style = FilType.sectionLabel, color = FilTheme.palette.muted)
            Spacer(Modifier.height(8.dp))
            FilHealthTrack(value = 15)
            Spacer(Modifier.height(8.dp))
            Text("2 consecutive failures", style = FilType.dataSmall, color = FilTheme.palette.warn)
        }

        FilCard {
            Text("Latency", style = FilType.sectionLabel, color = FilTheme.palette.muted)
            Spacer(Modifier.height(8.dp))
            FilSparkline(latencies = probes, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            Text("p50 149 · p95 947 · max 1204", style = FilType.dataSmall, color = FilTheme.palette.text)
        }

        FilCard {
            Text("No history yet", style = FilType.sectionLabel, color = FilTheme.palette.muted)
            Spacer(Modifier.height(8.dp))
            // The empty sparkline must still have a shape — an empty canvas
            // reads as a rendering bug rather than as "nothing measured".
            FilSparkline(latencies = emptyList(), modifier = Modifier.fillMaxWidth())
        }
    }
}
