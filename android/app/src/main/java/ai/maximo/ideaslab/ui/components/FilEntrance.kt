package ai.maximo.ideaslab.ui.components

import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/**
 * One entrance per list, and that is the whole motion budget.
 *
 * The house rule is explicit: scattering hover and press animations reads as
 * generated; spend motion on a single entrance. So items fade in and rise 8dp,
 * staggered, and nothing else in the app moves.
 *
 * Two limits that keep it from becoming a nuisance:
 *  - the stagger is capped, so item 30 does not wait a second to appear;
 *  - at zero animation scale (the OS "remove animations" setting) the item is
 *    simply drawn at its final values. `rememberReducedMotion()` reads that
 *    setting, and it is honoured here rather than reimplemented.
 */
private const val MAX_STAGGERED_ITEMS = 8
private const val STAGGER_MS = 30
private const val DURATION_MS = 220

@Composable
fun Modifier.filEntrance(
    index: Int,
    reducedMotion: Boolean = rememberReducedMotion(),
): Modifier {
    if (reducedMotion) return this

    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay((index.coerceAtMost(MAX_STAGGERED_ITEMS) * STAGGER_MS).toLong())
        visible = true
    }

    val progress by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(DURATION_MS, easing = LinearOutSlowInEasing),
        label = "fil-entrance",
    )

    return this
        .alpha(progress)
        .layout { measurable, constraints ->
            val placeable = measurable.measure(constraints)
            // Rise 8dp into place. Offset only — never a size change, which
            // would reflow every sibling on each frame.
            val dy = ((1f - progress) * 8.dp.toPx()).toInt()
            layout(placeable.width, placeable.height) { placeable.placeRelative(0, dy) }
        }
}
