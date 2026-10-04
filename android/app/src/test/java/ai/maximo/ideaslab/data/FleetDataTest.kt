package ai.maximo.ideaslab.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FleetDataTest {
    @Test fun matrixCoversEverySiteAndGap() {
        assertEquals(FleetData.sites.size * FleetData.gaps.size, FleetData.matrix.size)
    }

    @Test fun matrixDependsOnDomainNotOnTheSlugHash() {
        val seo = FleetData.sites.first { it.domain == "seo" }
        val tech = FleetData.sites.first { it.domain == "technical" }
        assertEquals(0, FleetData.gapLevel(seo, "SEO"))
        assertEquals(1, FleetData.gapLevel(seo, "Tech"))
        assertEquals(0, FleetData.gapLevel(tech, "Tech"))
        // Two sites in the same domain always get identical rows.
        val a = FleetData.sites.filter { it.domain == "automation" }
        assertTrue(a.size >= 2)
        val row = { s: FleetSite -> FleetData.gaps.map { FleetData.gapLevel(s, it) } }
        assertTrue(a.all { row(it) == row(a.first()) })
    }

    @Test fun slugsAreUnique() {
        assertEquals(FleetData.sites.size, FleetData.sites.map { it.slug }.toSet().size)
    }
}
