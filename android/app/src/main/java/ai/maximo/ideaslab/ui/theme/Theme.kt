package ai.maximo.ideaslab.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Fleet palette — Violet #7C3AED primary
private val FleetDarkScheme = darkColorScheme(
    primary = Color(0xFF7C3AED),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFF5B21B6),
    onPrimaryContainer = Color(0xFFEDE9FE),
    secondary = Color(0xFFA78BFA),
    onSecondary = Color(0xFF1E1B2E),
    surface = Color(0xFF0C0A14),
    onSurface = Color(0xFFF0ECF7),
    surfaceVariant = Color(0xFF1A1428),
    onSurfaceVariant = Color(0xFFA89BC2),
    background = Color(0xFF0C0A14),
    onBackground = Color(0xFFF0ECF7),
    outline = Color(0xFF3D3355),
    outlineVariant = Color(0xFF2A2340),
    error = Color(0xFFF87171),
    scrim = Color(0xFF0C0A14),
)

@Composable
fun FleetIdeasLabTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = FleetDarkScheme, content = content)
}
