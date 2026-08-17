package ai.maximo.ideaslab.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.R
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.FleetData
import ai.maximo.ideaslab.data.LatencyStats
import ai.maximo.ideaslab.data.ProbeHistory
import ai.maximo.ideaslab.data.relativeTime
import ai.maximo.ideaslab.ui.components.EmptyState
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilHealthTrack
import ai.maximo.ideaslab.ui.components.FilListSkeleton
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.FilSparkline
import ai.maximo.ideaslab.ui.components.FilState
import ai.maximo.ideaslab.ui.components.FilTag
import ai.maximo.ideaslab.ui.components.SkeletonKind
import ai.maximo.ideaslab.ui.components.color
import ai.maximo.ideaslab.ui.components.labelRes
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

/**
 * One dashboard, in depth.
 *
 * Until now tapping a card or a strip bar did nothing at all — the app could
 * tell you something was wrong and then had nowhere to send you. The web
 * console has had this page for weeks.
 *
 * What it shows, in the order the question gets asked: is it up, has it been
 * up, is it getting slower, and what can I do about it from a phone.
 */
@Composable
fun DashboardDetailScreen(
    slug: String,
    api: ApiClient?,
    onBack: () -> Unit,
) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current

    val site = remember(slug) { FleetData.sites.firstOrNull { it.slug == slug } }
    var history by remember(slug) { mutableStateOf<ProbeHistory?>(null) }

    LaunchedEffect(slug) {
        history = api?.probeHistory(slug)
    }

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        FilScreenHeader(
            title = site?.name ?: slug,
            subtitle = site?.url?.removePrefix("https://")?.ifBlank { null } ?: slug,
            modifier = Modifier.padding(horizontal = FilDimens.screen),
            actions = {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.heightIn(min = FilDimens.touchSmall),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                ) { Text(stringResource(R.string.action_close), style = FilType.chip) }
            },
        )

        val h = history
        LazyColumn(
            Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
            contentPadding = PaddingValues(
                start = FilDimens.screen,
                end = FilDimens.screen,
                top = 8.dp,
                bottom = 96.dp,
            ),
        ) {
            if (h == null) {
                item { FilListSkeleton(SkeletonKind.SITE, count = 3) }
            } else if (h.error != null) {
                // An inline band with a reason, not a toast that vanishes before
                // it is read, and not a blank screen that reads as broken.
                item {
                    FilBanner(
                        text = h.error,
                        tone = FilBannerTone.WARN,
                    )
                }
            } else {
                item { StateCard(h, site?.url) }
                item { LatencyCard(h) }
                item { HistoryCard(h) }
            }

            item {
                Row(
                    Modifier.fillMaxWidth().padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val url = site?.url?.ifBlank { null }
                    FilledTonalButton(
                        onClick = {
                            if (url != null) {
                                ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            }
                        },
                        enabled = url != null,
                        modifier = Modifier.weight(1f).heightIn(min = FilDimens.touch),
                    ) { Text(stringResource(R.string.action_open_site), style = FilType.chip) }
                    OutlinedButton(
                        onClick = {
                            clipboard.setText(AnnotatedString(buildImproveBrief(slug, site?.name ?: slug)))
                            Toast.makeText(ctx, ctx.getString(R.string.action_copy_improve), Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.weight(1f).heightIn(min = FilDimens.touch),
                    ) { Text(stringResource(R.string.action_copy_improve), style = FilType.chip) }
                }
            }
        }
    }
}

@Composable
private fun StateCard(h: ProbeHistory, url: String?) {
    val p = FilTheme.palette
    val state = FilState.of(h.state)
    FilCard(accent = state.color()) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilTag(text = stringResource(state.labelRes()), color = state.color())
            if (h.consecutiveFailures > 0) {
                Text(
                    "${h.consecutiveFailures} consecutive failures",
                    style = FilType.dataSmall,
                    color = p.warn,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        FilHealthTrack(
            // Derived from the state machine, not invented: a live dashboard
            // scores high, a degraded one middling, a down one low, and an
            // unknown one has no score at all.
            value = when (state) {
                FilState.HEALTHY -> 90
                FilState.DEGRADED -> 55
                FilState.DOWN -> 15
                FilState.UNKNOWN -> null
            },
        )
        Spacer(Modifier.height(8.dp))
        Text(
            h.lastOkAt?.let { "last OK ${relativeTime(it)}" } ?: "no successful probe on record",
            style = FilType.dataSmall,
            color = p.muted,
        )
    }
}

@Composable
private fun LatencyCard(h: ProbeHistory) {
    val p = FilTheme.palette
    FilCard {
        Text("Latency", style = FilType.sectionLabel, color = p.muted)
        Spacer(Modifier.height(8.dp))
        LatencyRow("24h", h.last24h)
        Spacer(Modifier.height(6.dp))
        LatencyRow("7d", h.last7d)
        Spacer(Modifier.height(4.dp))
        Text(
            // Why p95 and not an average, said once, on the screen.
            "p95 is the number that says whether it is getting slower. An average hides the tail.",
            style = FilType.label,
            color = p.muted2,
        )
    }
}

@Composable
private fun LatencyRow(window: String, s: LatencyStats?) {
    val p = FilTheme.palette
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(window, style = FilType.label, color = p.muted)
        // A dash where there is no measurement — never a zero.
        Text("p50 ${s?.p50?.toString() ?: "—"}", style = FilType.dataSmall, color = p.text)
        Text("p95 ${s?.p95?.toString() ?: "—"}", style = FilType.dataSmall, color = p.text)
        Text("max ${s?.max?.toString() ?: "—"}", style = FilType.dataSmall, color = p.muted)
    }
}

@Composable
private fun HistoryCard(h: ProbeHistory) {
    val p = FilTheme.palette
    FilCard {
        Text("Recent probes", style = FilType.sectionLabel, color = p.muted)
        Spacer(Modifier.height(8.dp))
        if (h.probes.isEmpty()) {
            EmptyState(
                title = "No probe history",
                body = "Nothing has been recorded for this dashboard yet. The fleet probe runs every 15 minutes.",
                glyph = "◇",
            )
        } else {
            FilSparkline(latencies = h.probes.map { it.latencyMs to it.ok })
            Spacer(Modifier.height(8.dp))
            Text(
                "${h.probes.size} probes · newest ${h.probes.firstOrNull()?.checkedAt?.let { relativeTime(it) } ?: "—"}",
                style = FilType.dataSmall,
                color = p.muted,
            )
        }
    }
}

private fun buildImproveBrief(slug: String, name: String): String = buildString {
    appendLine("IMPROVE brief — $name ($slug)")
    appendLine()
    appendLine("Context: opened from the Fleet Ideas Lab app detail screen.")
    appendLine("Ask: review this dashboard's health, latency trend and recent probe failures,")
    appendLine("then propose the smallest change that would move it.")
}
