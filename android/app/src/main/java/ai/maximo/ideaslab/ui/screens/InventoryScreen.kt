package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import ai.maximo.ideaslab.data.FleetFeed
import ai.maximo.ideaslab.data.FleetRepository
import ai.maximo.ideaslab.data.FleetSite
import ai.maximo.ideaslab.R
import ai.maximo.ideaslab.data.FleetSource
import ai.maximo.ideaslab.data.buildImprovePromptForProject
import ai.maximo.ideaslab.data.relativeAge
import ai.maximo.ideaslab.data.relativeTime
import ai.maximo.ideaslab.ui.CommandPaletteSheet
import ai.maximo.ideaslab.ui.components.DomainBadge
import ai.maximo.ideaslab.ui.components.EmptyState
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.FilState
import ai.maximo.ideaslab.ui.components.HealthChip
import ai.maximo.ideaslab.ui.components.FilFleetStrip
import ai.maximo.ideaslab.ui.components.LoadingShimmer
import ai.maximo.ideaslab.ui.components.FilListSkeleton
import ai.maximo.ideaslab.ui.components.FleetBar
import ai.maximo.ideaslab.ui.components.SkeletonKind
import ai.maximo.ideaslab.ui.components.filEntrance
import ai.maximo.ideaslab.ui.components.rememberIncrementalWindow
import ai.maximo.ideaslab.ui.components.color
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

/** Triage rank — lower sorts first in worst-first mode. */
private fun FilState.rank(): Int = when (this) {
    FilState.DOWN -> 0
    FilState.DEGRADED -> 1
    FilState.UNKNOWN -> 2
    FilState.HEALTHY -> 3
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun InventoryScreen(navController: NavController? = null, onNotifications: () -> Unit = {}) {
    val p = FilTheme.palette
    var shuffleSeed by remember { mutableStateOf(0) }
    var worstFirst by remember { mutableStateOf(true) }
    var paletteOpen by remember { mutableStateOf(false) }
    val ctx = LocalContext.current
    val clipboardImprove = LocalClipboardManager.current
    var refreshing by remember { mutableStateOf(false) }
    var feed by remember { mutableStateOf<FleetFeed?>(null) }
    var reloadTick by remember { mutableStateOf(0) }
    val repo = remember { FleetRepository(ctx.applicationContext) }
    // Initial load + every manual reload hits the live feed; failures fall back
    // to the cached copy, then to the bundled snapshot (source tells the truth).
    LaunchedEffect(reloadTick) {
        refreshing = true
        feed = repo.load()
        refreshing = false
        if (reloadTick > 0) {
            val f = feed
            val msg = when {
                f?.staleToken == true -> "App build out of date — update required"
                f?.source == FleetSource.LIVE -> "Live sync · ${f.sites.size} sites"
                f?.source == FleetSource.CACHE -> "Offline · cached copy"
                else -> "Offline snapshot · bundled data"
            }
            Toast.makeText(ctx, msg, Toast.LENGTH_SHORT).show()
        }
    }
    fun doReload() { if (!refreshing) reloadTick++ }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })
    val listState = rememberLazyListState()

    val baseSites = feed?.sites ?: emptyList()
    fun stateOf(site: FleetSite): FilState = FilState.of(feed?.health?.get(site.slug)?.state)

    val counts = remember(baseSites, feed) {
        baseSites.groupingBy { stateOf(it) }.eachCount()
    }
    val sites = remember(baseSites, feed, worstFirst, shuffleSeed) {
        val sorted = if (worstFirst) {
            baseSites.sortedWith(compareBy({ stateOf(it).rank() }, { it.name.lowercase() }))
        } else {
            val byName = baseSites.sortedBy { it.name.lowercase() }
            if (shuffleSeed == 0 || byName.isEmpty()) byName else {
                val k = shuffleSeed % byName.size
                byName.drop(k) + byName.take(k)
            }
        }
        sorted
    }

    val window = rememberIncrementalWindow(
        listState = listState,
        totalCount = sites.size,
        // Re-filtering or re-sorting must not leave a window into the old list.
        resetKey = "${worstFirst}|${shuffleSeed}|${sites.size}",
    )

    val f = feed
    val syncSubtitle = when {
        f == null -> stringResource(R.string.inventory_syncing)
        f.staleToken -> stringResource(R.string.inventory_stale_token, f.sites.size)
        f.source == FleetSource.LIVE ->
            stringResource(R.string.inventory_live, f.sites.size, relativeAge(f.fetchedAtMillis))
        f.source == FleetSource.CACHE ->
            stringResource(R.string.inventory_cached, f.sites.size, relativeAge(f.fetchedAtMillis))
        else -> stringResource(R.string.inventory_snapshot, f.sites.size)
    }

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        FilScreenHeader(
            title = stringResource(R.string.inventory_title),
            subtitle = syncSubtitle,
            modifier = Modifier.padding(horizontal = FilDimens.screen),
            actions = {
                OutlinedButton(
                    onClick = { paletteOpen = true },
                    modifier = Modifier.heightIn(min = FilDimens.touch),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                ) { Text("⌘K", style = FilType.chip) }
                IconButton(onClick = onNotifications, modifier = Modifier.size(FilDimens.touch)) {
                    Text("🔔", style = MaterialTheme.typography.titleMedium)
                }
            },
        )

        // Honest offline indicator — amber, in words, never disguised as live.
        if (f != null && f.source != FleetSource.LIVE) {
            FilBanner(
                text = when {
                    // Not "offline" — the network is fine and the server said no.
                    // Pulling to refresh will never fix this; only an update will.
                    f.staleToken -> stringResource(R.string.banner_stale_token)
                    f.source == FleetSource.CACHE ->
                        stringResource(R.string.banner_offline, relativeAge(f.fetchedAtMillis))
                    else -> stringResource(R.string.banner_snapshot)
                },
                tone = FilBannerTone.WARN,
                modifier = Modifier.padding(horizontal = FilDimens.screen),
            )
            Spacer(Modifier.height(8.dp))
        }

        // Fleet strip — one bar per dashboard, worst first, hatched stub for
        // unknown, legend that counts each band AND states the rule in words.
        // This replaces the four count tiles that used to sit here: the strip
        // carries the same counts and the same sentence, plus the shape of the
        // fleet, which four numbers cannot show.
        if (f != null && baseSites.isNotEmpty()) {
            FilFleetStrip(
                bars = baseSites.map { site ->
                    val st = stateOf(site)
                    FleetBar(
                        slug = site.slug,
                        name = site.name,
                        state = st,
                        health = feed?.health?.get(site.slug)?.let { h ->
                            // No probe latency yet means no reading, not a zero.
                            if (h.lastStatus in 200..399) 90 else 40
                        } ?: 0,
                    )
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = FilDimens.screen),
            )
            Spacer(Modifier.height(4.dp))
        } else if (f == null) {
            // Even the strip gets a placeholder — the header must not pop in.
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = FilDimens.screen)
                    .height(64.dp),
            ) { LoadingShimmer(Modifier.fillMaxSize()) }
            Spacer(Modifier.height(8.dp))
        }

        // Controls: triage sort + shuffle + manual reload.
        Row(
            Modifier.fillMaxWidth().padding(horizontal = FilDimens.screen).padding(top = 8.dp, bottom = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FilterChip(
                selected = worstFirst,
                onClick = { worstFirst = !worstFirst },
                label = { Text(if (worstFirst) stringResource(R.string.inventory_sort_worst) else stringResource(R.string.inventory_sort_alpha), style = FilType.chip) },
                modifier = Modifier.heightIn(min = FilDimens.touchSmall),
            )
            FilledTonalButton(
                onClick = { shuffleSeed++ },
                enabled = !worstFirst,
                modifier = Modifier.heightIn(min = FilDimens.touchSmall),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
            ) { Text("Find more ↻", style = FilType.chip) }
            Spacer(Modifier.weight(1f))
            FilledTonalButton(
                onClick = { doReload() },
                enabled = !refreshing,
                modifier = Modifier.heightIn(min = FilDimens.touchSmall),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
            ) { Text(if (refreshing) "↻ Syncing" else "↻ Reload", style = FilType.chip) }
        }

        Box(Modifier.fillMaxSize().pullRefresh(pullState)) {
            LazyColumn(
                state = listState,
                verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = FilDimens.screen,
                    end = FilDimens.screen,
                    top = 8.dp,
                    bottom = 80.dp + 24.dp,
                ),
            ) {
                if (feed == null) {
                    // Shaped like the row that is coming, so the list does not
                    // jump when the feed lands.
                    item { FilListSkeleton(SkeletonKind.SITE, count = 4) }
                } else if (sites.isEmpty()) {
                    item {
                        EmptyState(
                            title = stringResource(R.string.inventory_empty_title),
                            body = stringResource(R.string.inventory_empty_body),
                            glyph = "◇",
                        )
                    }
                } else {
                    // All 38 cards used to mount on the first frame. Render a
                    // window and extend it on scroll — same helper the Ideas
                    // feed uses, so there is one implementation of this.
                    itemsIndexed(sites.take(window.shown), key = { _, it -> it.slug }) { index, site ->
                        InventoryRow(
                            site = site,
                            state = stateOf(site),
                            feed = feed,
                            modifier = Modifier.filEntrance(index),
                            onCopyImprove = {
                                val brief = buildImprovePromptForProject(site)
                                clipboardImprove.setText(AnnotatedString(brief))
                                Toast.makeText(ctx, "IMPROVE brief copied (" + site.slug + ")", Toast.LENGTH_SHORT).show()
                            },
                        )
                    }
                    if (window.hasMore) {
                        item { FilListSkeleton(SkeletonKind.SITE, count = 1) }
                    }
                    item {
                        Column(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("MaximoSEO · Fleet Ideas Lab · Versions via /api/app/version", style = FilType.label, color = p.muted2)
                            Spacer(Modifier.height(4.dp))
                            Text("Worst-first sorts by probe state · deterministic, no invented data", style = FilType.label, color = p.muted2)
                        }
                    }
                }
            }
            PullRefreshIndicator(
                refreshing = refreshing,
                state = pullState,
                modifier = Modifier.align(Alignment.TopCenter),
                backgroundColor = p.panel,
                contentColor = p.accent,
            )
        }
        if (paletteOpen && navController != null) {
            CommandPaletteSheet(open = true, onClose = { paletteOpen = false }, nav = navController)
        }
    }
}

@Composable
private fun InventoryRow(
    site: FleetSite,
    state: FilState,
    feed: FleetFeed?,
    modifier: Modifier = Modifier,
    onCopyImprove: () -> Unit,
) {
    val p = FilTheme.palette
    val health = feed?.health?.get(site.slug)
    val checked = health?.checkedAt?.let { relativeTime(it) }.orEmpty()
    val latency = health?.latencyMs ?: 0L
    val stateColor = state.color()
    // Rollout status (live/beta/build) is identity, not health — cool hues, with words.
    val (statusWord, statusColor) = when (site.status) {
        "live" -> "live" to p.healthy
        "beta" -> "beta" to p.accent
        else -> "build" to p.warn
    }
    FilCard(
        modifier = modifier,
        accent = stateColor,
        contentDescription = "${site.name}, ${state.word}, checked ${if (checked.isEmpty()) "never" else checked}",
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(site.name, style = FilType.cardTitle, color = p.text, maxLines = 1, modifier = Modifier.weight(1f))
            Spacer(Modifier.width(8.dp))
            HealthChip(state = state, detail = if (latency > 0) "${latency}ms" else null, compact = true)
        }
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            DomainBadge(site.domain)
            Text(statusWord, style = FilType.label, color = statusColor)
            Text("· ${site.stack}", style = FilType.label, color = p.muted2, maxLines = 1)
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                if (checked.isNotEmpty()) "checked $checked" else "never checked",
                style = FilType.dataSmall,
                color = p.muted,
            )
            Text(site.slug, style = FilType.dataSmall, color = p.muted2, maxLines = 1)
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onCopyImprove,
            modifier = Modifier.fillMaxWidth().heightIn(min = FilDimens.touchSmall),
            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
        ) {
            Text("Copy IMPROVE brief", style = FilType.chip)
        }
    }
}

@Composable
fun InventoryScreenWithUpdate(navController: NavController, api: ai.maximo.ideaslab.data.ApiClient, onNotifications: () -> Unit = {}) {
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        UpdateBanner()
        InventoryScreen(navController = navController, onNotifications = onNotifications)
    }
}
