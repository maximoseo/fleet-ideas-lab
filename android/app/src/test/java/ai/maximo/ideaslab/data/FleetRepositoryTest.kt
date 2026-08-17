package ai.maximo.ideaslab.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * First JVM tests on the Android side. They cover the two pure things the whole
 * inventory screen leans on: how a timestamp is worded, and what the app claims
 * when the feed is not live.
 *
 * The screen's honesty rules are the point. "Offline" and "your build is out of
 * date" are different states with different fixes, and until this release the
 * app said "offline" for both — so a stale install looked merely disconnected
 * while its data quietly froze.
 */
class RelativeTimeTest {
    private val now = 1_760_000_000_000L // fixed clock; no wall-clock flake

    @Test
    fun `zero and negative timestamps render as nothing`() {
        assertEquals("", relativeAge(0, now))
        assertEquals("", relativeAge(-5, now))
    }

    @Test
    fun `a future timestamp does not render as a negative age`() {
        assertEquals("just now", relativeAge(now + 60_000, now))
    }

    @Test
    fun `minutes hours and days`() {
        assertEquals("just now", relativeAge(now - 30_000, now))
        assertEquals("5m ago", relativeAge(now - 5 * 60_000, now))
        assertEquals("2h ago", relativeAge(now - 2 * 3_600_000, now))
        assertEquals("3d ago", relativeAge(now - 3 * 86_400_000, now))
    }

    @Test
    fun `iso timestamps parse in every shape the backend emits`() {
        for (iso in listOf(
            "2026-08-17T12:00:00Z",
            "2026-08-17T12:00:00.000Z",
            "2026-08-17 12:00:00",
        )) {
            assertTrue("failed to parse $iso", relativeTime(iso, now).isNotEmpty())
        }
    }

    @Test
    fun `an unparseable timestamp renders as nothing rather than a wrong age`() {
        assertEquals("", relativeTime("not a date", now))
        assertEquals("", relativeTime("", now))
    }
}

class FleetFeedStateTest {
    private fun feed(
        source: FleetSource,
        staleToken: Boolean = false,
    ) = FleetFeed(
        sites = emptyList(),
        health = emptyMap(),
        source = source,
        fetchedAtMillis = 0,
        staleToken = staleToken,
    )

    @Test
    fun `a live feed is never marked stale`() {
        assertTrue(!feed(FleetSource.LIVE).staleToken)
    }

    @Test
    fun `stale token is distinct from plain offline`() {
        val offline = feed(FleetSource.CACHE)
        val rejected = feed(FleetSource.CACHE, staleToken = true)
        // Same source, different truth: pulling to refresh fixes one and can
        // never fix the other.
        assertEquals(offline.source, rejected.source)
        assertTrue(!offline.staleToken)
        assertTrue(rejected.staleToken)
    }

    @Test
    fun `the stale token exception carries an actionable message`() {
        val msg = StaleAppTokenException().message.orEmpty()
        assertTrue(msg.contains("out of date"))
        assertTrue(msg.contains("update", ignoreCase = true))
    }
}
