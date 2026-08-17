package ai.maximo.ideaslab.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

/**
 * Fil surfaces — the one card style for the whole app:
 * tonal panel background, 1dp line border, 12dp radius, 12dp inner padding.
 */

@Composable
fun FilCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    contentDescription: String? = null,
    /** Subtle start-edge state accent (e.g. health color on triage rows). */
    accent: Color? = null,
    /**
     * Raise this one card above the rest.
     *
     * Every card carried identical weight, so a screen of 38 pulled the eye
     * nowhere — the thing that is broken looked exactly like the 37 that are
     * fine. Emphasis is a brighter surface and a warmer border, and it is meant
     * for ONE card at a time: mark half of them and it stops meaning anything.
     */
    emphasised: Boolean = false,
    padding: PaddingValues = PaddingValues(FilDimens.card),
    content: @Composable ColumnScope.() -> Unit,
) {
    val p = FilTheme.palette
    var m = modifier
        .fillMaxWidth()
        .clip(FilShape.card)
        .background(if (emphasised) p.panel2 else p.panel)
        .border(
            if (emphasised) FilDimens.border * 2 else FilDimens.border,
            if (emphasised) (accent ?: p.accent).copy(alpha = 0.55f) else p.line,
            FilShape.card,
        )
    if (onClick != null) m = m.clickable(onClick = onClick)
    if (contentDescription != null) m = m.semantics { this.contentDescription = contentDescription }
    if (accent == null) {
        Column(Modifier.then(m).padding(padding), content = content)
    } else {
        Row(Modifier.then(m).height(IntrinsicSize.Min)) {
            Box(
                Modifier
                    .width(FilDimens.accentBar)
                    .fillMaxHeight()
                    .background(accent.copy(alpha = 0.9f)),
            )
            Column(Modifier.weight(1f).padding(padding), content = content)
        }
    }
}

/** Nested inset surface (panel2 bg, inset radius) for content inside a FilCard. */
@Composable
fun FilInset(
    modifier: Modifier = Modifier,
    padding: PaddingValues = PaddingValues(10.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val p = FilTheme.palette
    Column(
        modifier
            .fillMaxWidth()
            .clip(FilShape.inset)
            .background(p.panel2)
            .border(FilDimens.border, p.line, FilShape.inset)
            .padding(padding),
        content = content,
    )
}

/** Screen title pattern — 22/800 title + muted subtitle, optional trailing actions. */
@Composable
fun FilScreenHeader(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    actions: (@Composable RowScope.() -> Unit)? = null,
) {
    val p = FilTheme.palette
    Row(
        modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = FilType.screenTitle, color = p.text, maxLines = 1)
            if (subtitle != null) {
                Spacer(Modifier.height(2.dp))
                Text(subtitle, style = FilType.bodySmall, color = p.muted, maxLines = 2)
            }
        }
        if (actions != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically, content = actions)
        }
    }
}

/** 11sp/700 uppercase letterspaced section label with an optional trailing slot. */
@Composable
fun SectionHeader(
    text: String,
    modifier: Modifier = Modifier,
    trailing: (@Composable RowScope.() -> Unit)? = null,
) {
    val p = FilTheme.palette
    Row(
        modifier.fillMaxWidth().padding(top = 4.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text.uppercase(), style = FilType.sectionLabel, color = p.muted2)
        if (trailing != null) Row(verticalAlignment = Alignment.CenterVertically, content = trailing)
    }
}

/** Banner tones — the warm rule in container form. */
enum class FilBannerTone { INFO, WARN, BAD }

/** Full-width status banner (e.g. honest offline indicator). Icon + words, never color alone. */
@Composable
fun FilBanner(
    text: String,
    tone: FilBannerTone,
    modifier: Modifier = Modifier,
) {
    val p = FilTheme.palette
    val (color, glyph) = when (tone) {
        FilBannerTone.INFO -> p.healthy to "i"
        FilBannerTone.WARN -> p.warn to "!"
        FilBannerTone.BAD -> p.bad to "✕"
    }
    Row(
        modifier
            .fillMaxWidth()
            .clip(FilShape.inset)
            .background(color.copy(alpha = 0.12f))
            .border(FilDimens.border, color.copy(alpha = 0.35f), FilShape.inset)
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .semantics { contentDescription = text },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(glyph, style = FilType.chip, color = color)
        Spacer(Modifier.size(8.dp))
        Text(text, style = FilType.bodySmall, color = p.text)
    }
}

/**
 * Honest empty state — says what is true and what to do next, never fakes data.
 */
@Composable
fun EmptyState(
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    glyph: String = "—",
    action: (@Composable () -> Unit)? = null,
) {
    val p = FilTheme.palette
    FilCard(modifier = modifier.padding(vertical = 4.dp), padding = PaddingValues(24.dp)) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(glyph, style = MaterialTheme.typography.headlineMedium, color = p.muted2)
            Spacer(Modifier.height(8.dp))
            Text(title, style = FilType.cardTitle, color = p.text)
            Spacer(Modifier.height(4.dp))
            Text(body, style = FilType.bodySmall, color = p.muted, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            if (action != null) {
                Spacer(Modifier.height(12.dp))
                action()
            }
        }
    }
}

/** True when the device has animations disabled (reduced motion). */
@Composable
fun rememberReducedMotion(): Boolean {
    val ctx = LocalContext.current
    return remember {
        try {
            android.provider.Settings.Global.getFloat(
                ctx.contentResolver,
                android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
                1f,
            ) == 0f
        } catch (_: Exception) {
            false
        }
    }
}

/**
 * Placeholder shimmer block. With reduced motion on, renders a static tonal
 * block instead of animating.
 */
@Composable
fun LoadingShimmer(
    modifier: Modifier = Modifier,
    reducedMotion: Boolean = rememberReducedMotion(),
) {
    val p = FilTheme.palette
    val base = p.panel2
    if (reducedMotion) {
        Box(modifier.clip(FilShape.inset).background(base))
    } else {
        val transition = rememberInfiniteTransition(label = "fil-shimmer")
        val alpha by transition.animateFloat(
            initialValue = 0.45f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(900), RepeatMode.Reverse),
            label = "fil-shimmer-alpha",
        )
        Box(modifier.clip(FilShape.inset).background(base.copy(alpha = alpha)))
    }
}

/** A simple shimmering card placeholder matching the FilCard silhouette. */
@Composable
fun LoadingShimmerCard(modifier: Modifier = Modifier) {
    val p = FilTheme.palette
    Column(
        modifier
            .fillMaxWidth()
            .clip(FilShape.card)
            .background(p.panel)
            .border(FilDimens.border, p.line, FilShape.card)
            .padding(FilDimens.card),
    ) {
        LoadingShimmer(Modifier.fillMaxWidth(0.55f).height(14.dp))
        Spacer(Modifier.height(10.dp))
        LoadingShimmer(Modifier.fillMaxWidth().height(10.dp))
        Spacer(Modifier.height(6.dp))
        LoadingShimmer(Modifier.fillMaxWidth(0.8f).height(10.dp))
    }
}
