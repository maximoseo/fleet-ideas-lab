package ai.maximo.ideaslab.screenshots

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Does anything render to a PNG on this toolchain at all? */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-xhdpi")
class SmokeScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun smoke() {
        composeRule.setContent {
            Box(Modifier.fillMaxSize().padding(16.dp)) { Text("Roborazzi works") }
        }
        composeRule.onRoot().captureRoboImage("build/screenshots/smoke.png")
    }
}
