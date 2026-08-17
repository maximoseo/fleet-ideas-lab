package ai.maximo.ideaslab.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter

/**
 * Render a long list a page at a time, extending as the user scrolls.
 *
 * The Inventory screen mounted all 38 site cards on first frame; the Ideas
 * screen had its own hand-rolled version of this and nothing else did. One
 * implementation, used by both.
 *
 * This is windowing over data already in memory, not paging over a network —
 * the fleet feed arrives in one response. The win is time-to-first-frame and
 * not building 38 card subtrees before showing anything.
 */
class IncrementalWindow(
    private val total: () -> Int,
    private val pageSize: Int,
    initial: Int,
) {
    var shown by mutableIntStateOf(initial)
        private set

    val hasMore: Boolean get() = shown < total()

    fun extend() {
        if (hasMore) shown = (shown + pageSize).coerceAtMost(total())
    }

    /** Filters changed underneath us — start the window again. */
    fun reset(initial: Int) {
        shown = initial.coerceAtMost(maxOf(total(), 1))
    }
}

@Composable
fun rememberIncrementalWindow(
    /**
     * Index of the last visible item. A lambda rather than a LazyListState so
     * the same helper serves a column and a grid — the inventory became a grid
     * on tablets and the two state types share no supertype.
     */
    lastVisibleIndex: () -> Int,
    totalCount: Int,
    pageSize: Int = 12,
    initial: Int = 12,
    /** Change this whenever the underlying list is re-filtered or re-sorted. */
    resetKey: Any? = null,
): IncrementalWindow {
    val window = remember { IncrementalWindow(total = { totalCount }, pageSize = pageSize, initial = initial) }

    // A fresh filter must not leave the user looking at a window into the old list.
    LaunchedEffect(resetKey, totalCount) { window.reset(initial) }

    val nearEnd: State<Boolean> = remember(window) {
        derivedStateOf {
            // Extend two rows before the end so the next page is already there.
            lastVisibleIndex() >= window.shown - 2
        }
    }

    LaunchedEffect(window) {
        snapshotFlow { nearEnd.value }
            .distinctUntilChanged()
            .filter { it }
            .collect { window.extend() }
    }

    return window
}
