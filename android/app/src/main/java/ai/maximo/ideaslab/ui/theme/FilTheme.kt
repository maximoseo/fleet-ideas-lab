package ai.maximo.ideaslab.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Fleet Ideas Lab design tokens — "operator console" system.
 *
 * Core rule: cool = fine, warm = a problem.
 *   healthy  → brand violet (never green)
 *   degraded → amber
 *   down     → red-pink
 *   unknown  → neutral hatched/muted
 * Never encode state with color alone — components pair it with an icon/word.
 *
 * Everything a screen needs comes from [FilTheme.palette], [FilType] and
 * [FilDimens] — no hardcoded hex in screens.
 */

// ── Raw palettes ────────────────────────────────────────────────────────────

@Immutable
data class FilPalette(
    val bg: Color,
    val panel: Color,
    val panel2: Color,
    val panel3: Color,
    val text: Color,
    val muted: Color,
    val muted2: Color,
    val line: Color,
    val accent: Color,
    val accentDeep: Color,
    /** Cool = fine. Brand violet, never green. */
    val healthy: Color,
    /** Warm = needs attention. */
    val warn: Color,
    /** Hot = a problem. */
    val bad: Color,
    /** No probe data — honest neutral, never disguised as healthy. */
    val unknown: Color,
    val onAccent: Color,
) {
    /** Map a live-probe state string to its band color. */
    fun stateColor(state: String): Color = when (state) {
        "healthy" -> healthy
        "degraded" -> warn
        "down" -> bad
        else -> unknown
    }
}

val FilDarkPalette = FilPalette(
    bg = Color(0xFF0C0A13),
    panel = Color(0xFF151120),
    panel2 = Color(0xFF1C1729),
    panel3 = Color(0xFF241D35),
    text = Color(0xFFEFEBFA),
    muted = Color(0xFF8C82AB),
    muted2 = Color(0xFF645B80),
    line = Color(0xFF2B2340),
    accent = Color(0xFFA78BFA),
    accentDeep = Color(0xFF7C5CE8),
    healthy = Color(0xFF8B7FE8),
    warn = Color(0xFFE8B14C),
    bad = Color(0xFFF2637E),
    unknown = Color(0xFF645B80),
    onAccent = Color(0xFFFFFFFF),
)

val FilLightPalette = FilPalette(
    bg = Color(0xFFF5F3FA),
    panel = Color(0xFFFFFFFF),
    panel2 = Color(0xFFFAF8FE),
    panel3 = Color(0xFFF2EEFB),
    text = Color(0xFF191428),
    muted = Color(0xFF6A6088),
    muted2 = Color(0xFF968DB4),
    line = Color(0xFFE3DCF2),
    accent = Color(0xFF6D4FD8),
    accentDeep = Color(0xFF5636C4),
    healthy = Color(0xFF6D5FD0),
    warn = Color(0xFFA8730C),
    bad = Color(0xFFC9314F),
    unknown = Color(0xFF968DB4),
    onAccent = Color(0xFFFFFFFF),
)

val LocalFilPalette = staticCompositionLocalOf { FilDarkPalette }

// ── Typography ──────────────────────────────────────────────────────────────

/**
 * Type scale. Numbers/metrics are always monospace — an ops console aligns
 * its figures or it lies about them.
 */
object FilType {
    /** Screen title — 22sp / 800. */
    val screenTitle = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.3).sp)
    /** Section label — 11sp / 700 / uppercase / letterspaced. */
    val sectionLabel = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
    /** Card title — 15sp / 700. */
    val cardTitle = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Bold)
    /** Body — 14sp. */
    val body = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal)
    /** Secondary body — 13sp. */
    val bodySmall = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Normal)
    /** Data / metrics — 13sp monospace. */
    val data = TextStyle(fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Medium)
    /** Small data (timestamps, latency) — 11sp monospace. */
    val dataSmall = TextStyle(fontSize = 11.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Normal)
    /** Chip / label — 12sp / 600. */
    val chip = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    /** Tiny label — 11sp / 500. */
    val label = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium)
}

/** Material typography mapped onto the Fil scale so stock widgets look right. */
private val FilMaterialTypography = Typography(
    headlineSmall = FilType.screenTitle,
    titleLarge = FilType.screenTitle.copy(fontSize = 20.sp),
    titleMedium = FilType.cardTitle,
    titleSmall = FilType.cardTitle.copy(fontSize = 14.sp),
    bodyLarge = FilType.body,
    bodyMedium = FilType.body,
    bodySmall = FilType.bodySmall.copy(fontSize = 12.sp),
    labelLarge = FilType.chip,
    labelMedium = FilType.chip,
    labelSmall = FilType.label,
)

// ── Shape / spacing ─────────────────────────────────────────────────────────

object FilDimens {
    /** Screen edge padding. */
    val screen = 16.dp
    /** Card inner padding. */
    val card = 12.dp
    /** Gap between cards. */
    val cardGap = 12.dp
    /** Card corner radius. */
    val cardRadius = 12.dp
    /** Small element (chip, badge) radius. */
    val chipRadius = 999.dp
    /** Inset panel radius (nested surfaces). */
    val insetRadius = 8.dp
    /** Card / panel hairline border. */
    val border = 1.dp
    /** Minimum touch target. */
    val touch = 48.dp
    /** Start-edge state accent width on list rows. */
    val accentBar = 3.dp
}

object FilShape {
    val card = RoundedCornerShape(FilDimens.cardRadius)
    val chip = RoundedCornerShape(FilDimens.chipRadius)
    val inset = RoundedCornerShape(FilDimens.insetRadius)
}

// ── Theme entry point ───────────────────────────────────────────────────────

private val FilDarkScheme = darkColorScheme(
    primary = FilDarkPalette.accentDeep,
    onPrimary = FilDarkPalette.onAccent,
    primaryContainer = FilDarkPalette.panel3,
    onPrimaryContainer = FilDarkPalette.text,
    secondary = FilDarkPalette.accent,
    onSecondary = FilDarkPalette.bg,
    secondaryContainer = FilDarkPalette.panel2,
    onSecondaryContainer = FilDarkPalette.text,
    background = FilDarkPalette.bg,
    onBackground = FilDarkPalette.text,
    surface = FilDarkPalette.bg,
    onSurface = FilDarkPalette.text,
    surfaceVariant = FilDarkPalette.panel2,
    onSurfaceVariant = FilDarkPalette.muted,
    surfaceContainerLowest = FilDarkPalette.bg,
    surfaceContainerLow = FilDarkPalette.panel,
    surfaceContainer = FilDarkPalette.panel,
    surfaceContainerHigh = FilDarkPalette.panel2,
    surfaceContainerHighest = FilDarkPalette.panel3,
    outline = FilDarkPalette.line,
    outlineVariant = FilDarkPalette.line,
    error = FilDarkPalette.bad,
    onError = FilDarkPalette.onAccent,
    errorContainer = FilDarkPalette.bad.copy(alpha = 0.16f),
    onErrorContainer = FilDarkPalette.bad,
    scrim = FilDarkPalette.bg,
)

private val FilLightScheme = lightColorScheme(
    primary = FilLightPalette.accent,
    onPrimary = FilLightPalette.onAccent,
    primaryContainer = FilLightPalette.panel3,
    onPrimaryContainer = FilLightPalette.accentDeep,
    secondary = FilLightPalette.accentDeep,
    onSecondary = FilLightPalette.onAccent,
    secondaryContainer = FilLightPalette.panel3,
    onSecondaryContainer = FilLightPalette.text,
    background = FilLightPalette.bg,
    onBackground = FilLightPalette.text,
    surface = FilLightPalette.bg,
    onSurface = FilLightPalette.text,
    surfaceVariant = FilLightPalette.panel3,
    onSurfaceVariant = FilLightPalette.muted,
    surfaceContainerLowest = FilLightPalette.panel2,
    surfaceContainerLow = FilLightPalette.panel2,
    surfaceContainer = FilLightPalette.panel,
    surfaceContainerHigh = FilLightPalette.panel3,
    surfaceContainerHighest = FilLightPalette.panel3,
    outline = FilLightPalette.line,
    outlineVariant = FilLightPalette.line,
    error = FilLightPalette.bad,
    onError = FilLightPalette.onAccent,
    errorContainer = FilLightPalette.bad.copy(alpha = 0.10f),
    onErrorContainer = FilLightPalette.bad,
    scrim = FilLightPalette.text.copy(alpha = 0.4f),
)

/** Accessor object — `FilTheme.palette` from any composable. */
object FilTheme {
    val palette: FilPalette
        @Composable get() = LocalFilPalette.current
}

/**
 * Fixed brand themes, no dynamic color. Dark is the primary operator surface;
 * light follows the same tokens.
 */
@Composable
fun FilTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val palette = if (darkTheme) FilDarkPalette else FilLightPalette
    CompositionLocalProvider(LocalFilPalette provides palette) {
        MaterialTheme(
            colorScheme = if (darkTheme) FilDarkScheme else FilLightScheme,
            typography = FilMaterialTypography,
            content = content,
        )
    }
}
