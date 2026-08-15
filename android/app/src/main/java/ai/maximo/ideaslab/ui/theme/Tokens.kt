package ai.maximo.ideaslab.ui.theme

import androidx.compose.ui.graphics.Color

data class StyleTokens(
    val id: String,
    val name: String,
    val bg: Color,
    val surface: Color,
    val elevated: Color,
    val border: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val accent: Color,
    val accentStrong: Color,
    val accentGlow: Color,
    val success: Color,
    val warning: Color,
    val error: Color,
    val fontDisplay: String,
    val fontBody: String,
    val radius: Int,
    val radiusBtn: Int,
    val description: String,
)

private fun hex(s: String): Color {
    val h = s.removePrefix("#")
    val v = when (h.length) { 6 -> "FF$h"; 8 -> h; else -> "FF$h" }
    return Color(v.toLong(16))
}

val Violet = StyleTokens(
    id = "violet", name = "Violet Mission Control",
    bg = hex("#0f0b1a"), surface = hex("#1a1428"), elevated = hex("#231c33"), border = hex("#3d3355"),
    textPrimary = hex("#f0ecf7"), textSecondary = hex("#a89bc2"), textMuted = hex("#6b5f82"),
    accent = hex("#a78bfa"), accentStrong = hex("#7c3aed"), accentGlow = Color(0x26A78BFA),
    success = hex("#34d399"), warning = hex("#fbbf24"), error = hex("#f87171"),
    fontDisplay = "Rubik", fontBody = "Heebo", radius = 12, radiusBtn = 8,
    description = "Deep violet, subtle glow, strong typography."
)
val Quiet = StyleTokens(
    id = "quiet", name = "Quiet Ledger",
    bg = hex("#fafaf9"), surface = hex("#ffffff"), elevated = hex("#f5f5f4"), border = hex("#d6d3d1"),
    textPrimary = hex("#1c1917"), textSecondary = hex("#57534e"), textMuted = hex("#a8a29e"),
    accent = hex("#0d9488"), accentStrong = hex("#0f766e"), accentGlow = Color(0x140D9488),
    success = hex("#16a34a"), warning = hex("#d97706"), error = hex("#dc2626"),
    fontDisplay = "Frank Ruhl Libre", fontBody = "Heebo", radius = 8, radiusBtn = 6,
    description = "Minimalist light, airy, thin lines."
)
val Print = StyleTokens(
    id = "print", name = "Print-Tech Paper",
    bg = hex("#f7f5f0"), surface = hex("#fffef9"), elevated = hex("#f0ede5"), border = hex("#d4cfc4"),
    textPrimary = hex("#2c2a25"), textSecondary = hex("#5c584e"), textMuted = hex("#9c9688"),
    accent = hex("#b45309"), accentStrong = hex("#92400e"), accentGlow = Color(0x14B45309),
    success = hex("#15803d"), warning = hex("#ca8a04"), error = hex("#b91c1c"),
    fontDisplay = "JetBrains Mono", fontBody = "Heebo", radius = 4, radiusBtn = 4,
    description = "Paper texture, data as graphics."
)
val Dither = StyleTokens(
    id = "dither", name = "Dither Mono",
    bg = hex("#0a0a0a"), surface = hex("#141414"), elevated = hex("#1e1e1e"), border = hex("#333333"),
    textPrimary = hex("#e5e5e5"), textSecondary = hex("#a3a3a3"), textMuted = hex("#525252"),
    accent = hex("#22c55e"), accentStrong = hex("#16a34a"), accentGlow = Color(0x1A22C55E),
    success = hex("#22c55e"), warning = hex("#eab308"), error = hex("#ef4444"),
    fontDisplay = "JetBrains Mono", fontBody = "JetBrains Mono", radius = 2, radiusBtn = 2,
    description = "Terminal aesthetic, single green accent."
)
val Classical = StyleTokens(
    id = "classical", name = "Classical Archive",
    bg = hex("#fdfcf8"), surface = hex("#ffffff"), elevated = hex("#f7f5f0"), border = hex("#e7e0d6"),
    textPrimary = hex("#1a1714"), textSecondary = hex("#6b5e52"), textMuted = hex("#a89a8a"),
    accent = hex("#9f1239"), accentStrong = hex("#881337"), accentGlow = Color(0x149F1239),
    success = hex("#15803d"), warning = hex("#a16207"), error = hex("#b91c1c"),
    fontDisplay = "Frank Ruhl Libre", fontBody = "Heebo", radius = 6, radiusBtn = 4,
    description = "Warm archive, editorial rules."
)

val AllStyles = listOf(Violet, Quiet, Print, Dither, Classical)
fun styleById(id: String) = AllStyles.find { it.id == id } ?: Violet
