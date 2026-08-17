package ai.maximo.ideaslab.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

/**
 * Live health state of a fleet dashboard.
 *
 * The warm rule: cool (violet) = fine, warm (amber) = degraded, hot (red) = down,
 * neutral = honestly unknown. Never rendered as color alone — every
 * representation pairs the color with a glyph and the word.
 */
enum class FilState(val key: String, val word: String, val glyph: String) {
    HEALTHY("healthy", "healthy", "✓"),
    DEGRADED("degraded", "degraded", "!"),
    DOWN("down", "down", "✕"),
    UNKNOWN("unknown", "unknown", "?");

    companion object {
        fun of(raw: String?): FilState = entries.firstOrNull { it.key == raw } ?: UNKNOWN
    }
}

@Composable
fun FilState.color(): androidx.compose.ui.graphics.Color {
    val p = FilTheme.palette
    return when (this) {
        FilState.HEALTHY -> p.healthy
        FilState.DEGRADED -> p.warn
        FilState.DOWN -> p.bad
        FilState.UNKNOWN -> p.unknown
    }
}

/**
 * Health chip — state → color + glyph + word. Optionally appends mono detail
 * (latency, last-checked) so numbers stay tabular.
 */
@Composable
fun HealthChip(
    state: FilState,
    modifier: Modifier = Modifier,
    detail: String? = null,
    compact: Boolean = false,
) {
    val color = state.color()
    val label = state.word + if (detail.isNullOrBlank()) "" else " · $detail"
    Row(
        modifier
            .clip(FilShape.chip)
            .background(color.copy(alpha = 0.14f))
            .border(FilDimens.border, color.copy(alpha = 0.35f), FilShape.chip)
            .padding(horizontal = if (compact) 7.dp else 9.dp, vertical = if (compact) 2.dp else 4.dp)
            .semantics { contentDescription = "Health: $label" },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(state.glyph, style = FilType.label, color = color)
        Spacer(Modifier.width(4.dp))
        Text(state.word, style = FilType.label, color = color, maxLines = 1)
        if (!detail.isNullOrBlank()) {
            Text(" · $detail", style = FilType.dataSmall, color = color, maxLines = 1)
        }
    }
}

/**
 * Health bar — a track with a state-colored marker at [fraction] (0..1).
 * Used for scores/coverage where a number alone would float free of context.
 */
@Composable
fun HealthBar(
    fraction: Float,
    state: FilState,
    modifier: Modifier = Modifier,
    label: String? = null,
) {
    val p = FilTheme.palette
    val color = state.color()
    val clamped = fraction.coerceIn(0f, 1f)
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .weight(1f)
                .height(6.dp)
                .clip(CircleShape)
                .background(p.panel3)
                .border(FilDimens.border, p.line, CircleShape),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(clamped)
                    .fillMaxHeight()
                    .clip(CircleShape)
                    .background(color),
            )
        }
        if (label != null) {
            Spacer(Modifier.width(8.dp))
            Text(label, style = FilType.dataSmall, color = color)
        }
    }
}

/**
 * Domain badge — small neutral-tonal tag for a dashboard domain (seo, content…).
 * Deliberately NOT a state color: domains are identity, not health.
 */
@Composable
fun DomainBadge(domain: String, modifier: Modifier = Modifier) {
    val p = FilTheme.palette
    Row(
        modifier
            .clip(FilShape.inset)
            .background(p.panel3)
            .border(FilDimens.border, p.line, FilShape.inset)
            .padding(horizontal = 7.dp, vertical = 2.dp)
            .semantics { contentDescription = "Domain $domain" },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(domain, style = FilType.label, color = p.muted, maxLines = 1)
    }
}

/**
 * Small tonal tag (priority, kind, category…). Defaults to the neutral panel
 * tone; pass a band color only when the tag actually encodes state.
 */
@Composable
fun FilTag(
    text: String,
    modifier: Modifier = Modifier,
    color: androidx.compose.ui.graphics.Color? = null,
    mono: Boolean = false,
) {
    val p = FilTheme.palette
    val c = color ?: p.muted
    Row(
        modifier
            .clip(FilShape.chip)
            .background(c.copy(alpha = 0.14f))
            .border(FilDimens.border, c.copy(alpha = 0.30f), FilShape.chip)
            .padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text, style = if (mono) FilType.dataSmall else FilType.label, color = c, maxLines = 1)
    }
}

/** Search field on Fil tokens. */
@Composable
fun FilSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Search…",
    onSearch: (() -> Unit)? = null,
) {
    val p = FilTheme.palette
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, style = FilType.bodySmall, color = p.muted2) },
        singleLine = true,
        textStyle = FilType.body,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { onSearch?.invoke() }),
        shape = FilShape.card,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = p.accent,
            unfocusedBorderColor = p.line,
            cursorColor = p.accent,
            focusedTextColor = p.text,
            unfocusedTextColor = p.text,
            focusedContainerColor = p.panel,
            unfocusedContainerColor = p.panel,
        ),
        modifier = modifier.fillMaxWidth().heightIn(min = FilDimens.touch),
    )
}

/**
 * The translated word for this state.
 *
 * `word` stays English because it is also used in log lines and content
 * descriptions built off the API's own vocabulary; this is what a person reads.
 */
fun FilState.labelRes(): Int = when (this) {
    FilState.HEALTHY -> ai.maximo.ideaslab.R.string.state_healthy
    FilState.DEGRADED -> ai.maximo.ideaslab.R.string.state_degraded
    FilState.DOWN -> ai.maximo.ideaslab.R.string.state_down
    FilState.UNKNOWN -> ai.maximo.ideaslab.R.string.state_unknown
}
