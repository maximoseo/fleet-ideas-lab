package ai.maximo.ideaslab.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme

/**
 * Skeletons shaped like the thing that is coming.
 *
 * A spinner says "something is happening". A skeleton says "two idea cards are
 * arriving and here is where they will sit", so the layout does not jump when
 * the data lands. Four of the app's eight list screens showed a blank screen
 * while loading before this file existed.
 *
 * Every skeleton carries one contentDescription for the whole block. A screen
 * reader should hear "loading" once, not eight times.
 */

/** Site / inventory row: title, one line of description, a health track. */
@Composable
fun SkeletonSiteCard(modifier: Modifier = Modifier) {
    val p = FilTheme.palette
    Column(
        modifier
            .fillMaxWidth()
            .clip(FilShape.card)
            .background(p.panel)
            .border(FilDimens.border, p.line, FilShape.card)
            .padding(FilDimens.card),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LoadingShimmer(Modifier.width(76.dp).height(11.dp))
            LoadingShimmer(Modifier.width(42.dp).height(11.dp))
        }
        Spacer(Modifier.height(10.dp))
        LoadingShimmer(Modifier.fillMaxWidth(0.62f).height(15.dp))
        Spacer(Modifier.height(8.dp))
        LoadingShimmer(Modifier.fillMaxWidth(0.9f).height(11.dp))
        Spacer(Modifier.height(12.dp))
        LoadingShimmer(Modifier.width(96.dp).height(6.dp))
    }
}

/** Idea row: kind chip, title, the amber "why now" band, two tag pills. */
@Composable
fun SkeletonIdeaCard(modifier: Modifier = Modifier) {
    val p = FilTheme.palette
    Column(
        modifier
            .fillMaxWidth()
            .clip(FilShape.card)
            .background(p.panel)
            .border(FilDimens.border, p.line, FilShape.card)
            .padding(FilDimens.card),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            LoadingShimmer(Modifier.width(46.dp).height(14.dp))
            LoadingShimmer(Modifier.width(58.dp).height(14.dp))
        }
        Spacer(Modifier.height(10.dp))
        LoadingShimmer(Modifier.fillMaxWidth(0.75f).height(15.dp))
        Spacer(Modifier.height(10.dp))
        LoadingShimmer(Modifier.fillMaxWidth().height(34.dp))
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            LoadingShimmer(Modifier.width(64.dp).height(18.dp))
            LoadingShimmer(Modifier.width(78.dp).height(18.dp))
        }
    }
}

/** Gap matrix row: label plus five cells. */
@Composable
fun SkeletonGapRow(modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LoadingShimmer(Modifier.width(72.dp).height(12.dp))
        repeat(5) { LoadingShimmer(Modifier.weight(1f).height(28.dp)) }
    }
}

enum class SkeletonKind { SITE, IDEA, GAP, GENERIC }

/**
 * A block of skeletons, announced once.
 *
 * `count` should match what usually arrives — too few and the page still jumps,
 * too many and the screen looks busier loading than loaded.
 */
@Composable
fun FilListSkeleton(
    kind: SkeletonKind,
    count: Int = 4,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth()
            .semantics { contentDescription = "Loading" },
        verticalArrangement = Arrangement.spacedBy(FilDimens.cardGap),
    ) {
        repeat(count) {
            when (kind) {
                SkeletonKind.SITE -> SkeletonSiteCard()
                SkeletonKind.IDEA -> SkeletonIdeaCard()
                SkeletonKind.GAP -> SkeletonGapRow()
                SkeletonKind.GENERIC -> LoadingShimmerCard()
            }
        }
    }
}
