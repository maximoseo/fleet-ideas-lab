package ai.maximo.ideaslab.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

/**
 * Health track — a constant-width rail with a marker at the value.
 *
 * Replaces coloured score badges. A badge encodes the value in its colour, so
 * comparing two of them means decoding two colours; a track of fixed width
 * encodes it in **position**, which the eye compares directly and which still
 * works in greyscale or with colour blindness.
 *
 * Constant width is the whole point — a bar whose *length* is the value is a
 * different component and does not line up between rows.
 */
@Composable
fun FilHealthTrack(
    /** 0..100, or null for genuinely unknown. */
    value: Int?,
    modifier: Modifier = Modifier,
    trackWidth: androidx.compose.ui.unit.Dp = 88.dp,
    showValue: Boolean = true,
) {
    val p = FilTheme.palette
    // Bands match the web's healthLevel() so the two surfaces never disagree
    // about the same number. The first draft put the warm band at 55-79, which
    // painted a 74 amber — and warm has to mean "this wants attention", not
    // "this is merely not perfect", or the colour stops carrying information.
    val state = when {
        value == null -> FilState.UNKNOWN
        value >= 65 -> FilState.HEALTHY
        value >= 45 -> FilState.DEGRADED
        else -> FilState.DOWN
    }
    val unknownColor = p.unknown
    val markerColor = when (state) {
        FilState.HEALTHY -> p.healthy
        FilState.DEGRADED -> p.warn
        FilState.DOWN -> p.bad
        FilState.UNKNOWN -> p.unknown
    }

    Row(
        modifier.semantics {
            contentDescription =
                if (value == null) "health unknown, no probe data" else "health $value of 100, ${state.word}"
        },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        BoxWithConstraints(
            Modifier
                .width(trackWidth)
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(p.panel3),
        ) {
            if (value != null) {
                val clamped = value.coerceIn(0, 100)
                // 3dp marker, inset so it never clips at either end.
                val travel = maxWidth - 3.dp
                Box(
                    Modifier
                        .offset(x = travel * (clamped / 100f))
                        .width(3.dp)
                        .fillMaxHeight()
                        .background(markerColor),
                )
            } else {
                // Unknown hatches the WHOLE rail. The first draft drew a short
                // stub at the left, which reads as "a very low score" — the one
                // reading it must not be mistaken for. Hatching across the full
                // width says "no measurement", which is the actual claim.
                Canvas(Modifier.fillMaxSize()) {
                    var x = -size.height
                    while (x < size.width + size.height) {
                        drawLine(
                            color = unknownColor.copy(alpha = 0.75f),
                            start = Offset(x, size.height),
                            end = Offset(x + size.height, 0f),
                            strokeWidth = 1.5f,
                        )
                        x += 5f
                    }
                }
            }
        }
        if (showValue) {
            Text(
                // A dash, never "0".
                text = value?.toString() ?: "—",
                style = FilType.dataSmall,
                color = if (value == null) p.muted else p.text,
            )
        }
    }
}
