package ai.maximo.ideaslab.ui.components

import androidx.compose.foundation.layout.BoxWithConstraintsScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * How wide is the window, in the only three buckets that change a layout.
 *
 * The app had no window-size handling at all, so a tablet or a landscape phone
 * got a phone layout stretched across the width — 38 cards each a hand span
 * wide, with most of the screen unused.
 *
 * Deliberately not `androidx.compose.material3.windowsizeclass`: that is another
 * dependency and another artifact in a 2.9 MB APK for something that is three
 * comparisons. The breakpoints are Material's own.
 */
enum class FilWidth {
    /** Phone portrait. One column. */
    COMPACT,

    /** Large phone landscape, small tablet. Two columns. */
    MEDIUM,

    /** Tablet. Two columns, and room for a detail pane beside the list. */
    EXPANDED;

    /** Columns a card grid should use at this width. */
    val columns: Int
        get() = when (this) {
            COMPACT -> 1
            MEDIUM -> 2
            EXPANDED -> 2
        }

    /** Is there room to show a list and a detail at the same time? */
    val supportsSideBySide: Boolean get() = this == EXPANDED
}

@Composable
@ReadOnlyComposable
fun rememberFilWidth(): FilWidth = widthOf(LocalConfiguration.current.screenWidthDp.dp)

/** Pure, so it can be tested without a composition. */
fun widthOf(width: Dp): FilWidth = when {
    width < 600.dp -> FilWidth.COMPACT
    width < 840.dp -> FilWidth.MEDIUM
    else -> FilWidth.EXPANDED
}

/** Width bucket from a BoxWithConstraints, for a pane rather than the window. */
val BoxWithConstraintsScope.filWidth: FilWidth
    get() = widthOf(maxWidth)
