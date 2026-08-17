package ai.maximo.ideaslab.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.theme.FilTheme

/**
 * Latency over the last N probes, one vertical tick per probe.
 *
 * Ticks rather than a line, on purpose: probes are discrete samples 15 minutes
 * apart, and a connecting line would draw a value at times nothing was measured.
 *
 * A failed probe is a full-height warm tick regardless of its latency — a
 * request that never completed has no meaningful duration, and plotting it at
 * whatever the timeout was would put a tall spike in the chart that reads as
 * "slow" when the truth is "gone".
 */
@Composable
fun FilSparkline(
    /** Newest first, as the API returns them. */
    latencies: List<Pair<Long, Boolean>>,
    modifier: Modifier = Modifier,
    height: androidx.compose.ui.unit.Dp = 44.dp,
) {
    val p = FilTheme.palette
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    // Oldest on the start edge, so time reads in the reading direction.
    val series = latencies.reversed().let { if (rtl) it.reversed() else it }
    val okColor = p.healthy
    val badColor = p.bad
    val trackColor = p.panel3

    // Scale to the slowest SUCCESSFUL probe. Failures have no duration and must
    // not set the ceiling, or one timeout flattens every real measurement.
    val ceiling = series.filter { it.second }.maxOfOrNull { it.first }?.coerceAtLeast(1L) ?: 1L

    val label = if (series.isEmpty()) {
        "No probe history"
    } else {
        val fails = series.count { !it.second }
        "Latency of the last ${series.size} probes, $fails failed"
    }

    Canvas(
        modifier
            .fillMaxWidth()
            .height(height)
            .semantics { contentDescription = label },
    ) {
        if (series.isEmpty()) {
            // A flat baseline, not an empty box — "nothing measured" still has a
            // shape, and an empty canvas reads as a rendering bug.
            drawLine(
                color = trackColor,
                start = Offset(0f, size.height / 2f),
                end = Offset(size.width, size.height / 2f),
                strokeWidth = 2f,
            )
            return@Canvas
        }
        val slot = size.width / series.size
        val barWidth = (slot * 0.62f).coerceAtLeast(1.5f)
        series.forEachIndexed { i, (ms, ok) ->
            val x = i * slot + (slot - barWidth) / 2f
            val fraction = if (ok) (ms.toFloat() / ceiling).coerceIn(0.06f, 1f) else 1f
            val top = size.height * (1f - fraction)
            drawLine(
                color = if (ok) okColor else badColor,
                start = Offset(x + barWidth / 2f, size.height),
                end = Offset(x + barWidth / 2f, top),
                strokeWidth = barWidth,
                cap = StrokeCap.Butt,
            )
        }
    }
}
