package ai.maximo.ideaslab.data

import ai.maximo.ideaslab.ui.components.FilWidth
import ai.maximo.ideaslab.ui.components.widthOf
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The queue's serialisation and the width buckets — both pure, both easy to get
 * subtly wrong, neither needing a device.
 */
class PendingActionSerialisationTest {

    @Test
    fun `an action survives a round trip`() {
        val a = PendingAction(
            id = "abc",
            kind = "scaffold",
            slug = "local-seo",
            payload = """{"mode":"build"}""",
            queuedAtMillis = 1_760_000_000_000L,
            attempts = 2,
            lastError = "timeout",
        )
        val back = PendingAction.fromJson(a.toJson())
        assertEquals(a, back)
    }

    @Test
    fun `a missing error round-trips as null, not as the string "null"`() {
        val a = PendingAction("id", "notify", "slug", "{}", 1L)
        val back = PendingAction.fromJson(a.toJson())
        assertNull(back.lastError)
    }

    @Test
    fun `a payload containing quotes and newlines survives`() {
        // Briefs are multi-line text with quotes in them; naive concatenation
        // would corrupt the queue on the first real action.
        val payload = "line one\n\"quoted\"\nline three"
        val back = PendingAction.fromJson(PendingAction("i", "notify", "s", payload, 1L).toJson())
        assertEquals(payload, back.payload)
    }

    @Test
    fun `hebrew payloads survive`() {
        val payload = "בריף שיפור — דשבורד האינדוקס"
        val back = PendingAction.fromJson(PendingAction("i", "notify", "s", payload, 1L).toJson())
        assertEquals(payload, back.payload)
    }
}

class WindowWidthTest {

    @Test
    fun `phone portrait is compact`() {
        assertEquals(FilWidth.COMPACT, widthOf(390.dp))
        assertEquals(1, widthOf(390.dp).columns)
        assertTrue(!widthOf(390.dp).supportsSideBySide)
    }

    @Test
    fun `phone landscape and small tablets are medium`() {
        assertEquals(FilWidth.MEDIUM, widthOf(640.dp))
        assertEquals(2, widthOf(640.dp).columns)
    }

    @Test
    fun `tablets are expanded and can show a detail beside the list`() {
        assertEquals(FilWidth.EXPANDED, widthOf(1024.dp))
        assertTrue(widthOf(1024.dp).supportsSideBySide)
    }

    @Test
    fun `the boundaries land on the documented side`() {
        // 600 and 840 are Material's breakpoints; off-by-one here silently
        // changes the layout of every tablet.
        assertEquals(FilWidth.COMPACT, widthOf(599.dp))
        assertEquals(FilWidth.MEDIUM, widthOf(600.dp))
        assertEquals(FilWidth.MEDIUM, widthOf(839.dp))
        assertEquals(FilWidth.EXPANDED, widthOf(840.dp))
    }
}
