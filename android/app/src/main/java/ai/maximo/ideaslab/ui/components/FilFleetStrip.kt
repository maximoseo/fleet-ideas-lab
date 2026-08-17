package ai.maximo.ideaslab.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

/**
 * Fleet strip — one bar per dashboard, height follows health, worst first.
 *
 * The signature component of the house design system, present on the web and
 * missing from the app until now. It exists so a fleet of 38 reads as one
 * shape: a calm violet field with warm spikes where something wants attention.
 *
 * Three rules it must not break:
 *  - **Cool = fine, warm = a problem.** Healthy is the brand violet, never
 *    green. Spending the loudest colour on the state you need not look at is
 *    how a dashboard becomes wallpaper.
 *  - **Unknown is hatched, never a zero-height bar.** "No data" drawn as zero
 *    reads as catastrophic, and it is not the same claim.
 *  - **The legend states the rule in words** and counts each band, so the
 *    strip survives colour blindness and a black-and-white screenshot.
 */
data class FleetBar(
    val slug: String,
    val name: String,
    val state: FilState,
    /** 0..100. Ignored for UNKNOWN, which always draws the hatched stub. */
    val health: Int,
)

private fun FilState.rank(): Int = when (this) {
    FilState.DOWN -> 0
    FilState.DEGRADED -> 1
    FilState.UNKNOWN -> 2
    FilState.HEALTHY -> 3
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FilFleetStrip(
    bars: List<FleetBar>,
    modifier: Modifier = Modifier,
    onBarClick: ((String) -> Unit)? = null,
) {
    val p = FilTheme.palette
    // Worst first. A uniform grid of 38 pulls the eye nowhere.
    val ordered = bars.sortedWith(compareBy({ it.state.rank() }, { it.name.lowercase() }))
    val counts = FilState.entries.associateWith { s -> bars.count { it.state == s } }

    Column(modifier) {
        Row(
            Modifier.fillMaxWidth().height(64.dp),
            horizontalArrangement = Arrangement.spacedBy(3.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            ordered.forEach { bar ->
                val fraction = when (bar.state) {
                    FilState.UNKNOWN -> 0.34f
                    FilState.DOWN -> 1f
                    FilState.DEGRADED -> 0.72f
                    FilState.HEALTHY -> (0.36f + (bar.health.coerceIn(0, 100) / 100f) * 0.5f)
                }
                val color = when (bar.state) {
                    FilState.HEALTHY -> p.healthy
                    FilState.DEGRADED -> p.warn
                    FilState.DOWN -> p.bad
                    FilState.UNKNOWN -> p.unknown
                }
                val label = if (bar.state == FilState.UNKNOWN) {
                    "${bar.name}: unknown, no probe data"
                } else {
                    "${bar.name}: ${bar.state.word}, health ${bar.health}"
                }
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight(fraction)
                        .clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp))
                        .semantics { contentDescription = label }
                        .then(
                            if (onBarClick != null) Modifier.clickable { onBarClick(bar.slug) }
                            else Modifier
                        ),
                ) {
                    if (bar.state == FilState.UNKNOWN) HatchedStub(color) else Box(
                        Modifier.fillMaxSize().background(color)
                    )
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(p.line))
        Spacer(Modifier.height(8.dp))

        // Legend: counts per band AND the rule in words.
        //
        // FlowRow, not Row. Rendered at fontScale 2.0 the fixed row pushed the
        // Unknown band off the end, so a fleet WITH unknown dashboards reported
        // as if it had none — the legend is what makes the strip honest, and it
        // was the part that broke. A band may now wrap to a second line; it may
        // never disappear.
        FlowRow(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            LegendDot(p.healthy, "Healthy", counts[FilState.HEALTHY] ?: 0)
            LegendDot(p.warn, "Degraded", counts[FilState.DEGRADED] ?: 0)
            LegendDot(p.bad, "Down", counts[FilState.DOWN] ?: 0)
            LegendDot(p.unknown, "Unknown", counts[FilState.UNKNOWN] ?: 0, hatched = true)
        }
        Spacer(Modifier.height(6.dp))
        Text(
            "Warm colours mean a dashboard wants attention. Cool means it does not.",
            style = FilType.label,
            color = p.muted,
        )
    }
}

@Composable
private fun LegendDot(color: Color, word: String, count: Int, hatched: Boolean = false) {
    val p = FilTheme.palette
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Box(Modifier.size(9.dp).clip(CircleShape)) {
            if (hatched) HatchedStub(color) else Box(Modifier.fillMaxSize().background(color))
        }
        Text(word, style = FilType.label, color = p.muted, softWrap = false)
        // Counts are data: mono, so the figures line up between bands.
        Text("$count", style = FilType.dataSmall, color = p.text)
    }
}

/**
 * Diagonal hatching for "we do not know".
 * Deliberately not a solid low bar — a solid bar states a value.
 */
@Composable
private fun HatchedStub(color: Color) {
    Canvas(Modifier.fillMaxSize()) {
        val step = 6f
        var x = -size.height
        while (x < size.width + size.height) {
            drawLine(
                color = color.copy(alpha = 0.55f),
                start = Offset(x, size.height),
                end = Offset(x + size.height, 0f),
                strokeWidth = 1.6f,
                cap = StrokeCap.Butt,
            )
            x += step
        }
    }
}
