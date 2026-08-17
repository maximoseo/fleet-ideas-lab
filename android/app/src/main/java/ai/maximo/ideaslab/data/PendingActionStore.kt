package ai.maximo.ideaslab.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

private val Context.pendingStore by preferencesDataStore(name = "fil_pending_actions")

/**
 * Actions taken while offline, replayed when the network comes back.
 *
 * Reads already degrade honestly — cached copy, clearly labelled. Writes did
 * not: tapping Scaffold or Send with no signal simply failed, and the operator
 * had to remember to do it again. On a phone, which is where this app is used
 * and where signal is worst, that is the difference between a tool and a
 * viewer with buttons.
 *
 * Two rules:
 *  - **Nothing is dropped silently.** A queued action is visible with a count;
 *    a permanently failed one surfaces rather than vanishing.
 *  - **Replay is at-most-once per entry.** The entry is removed only after the
 *    call returns a definite answer. A network failure leaves it queued; a 4xx
 *    removes it, because retrying a rejected request forever is not persistence,
 *    it is a loop.
 */
data class PendingAction(
    val id: String,
    val kind: String,
    val slug: String,
    val payload: String,
    val queuedAtMillis: Long,
    val attempts: Int = 0,
    val lastError: String? = null,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("kind", kind)
        put("slug", slug)
        put("payload", payload)
        put("queuedAtMillis", queuedAtMillis)
        put("attempts", attempts)
        lastError?.let { put("lastError", it) }
    }

    companion object {
        fun fromJson(o: JSONObject) = PendingAction(
            id = o.optString("id"),
            kind = o.optString("kind"),
            slug = o.optString("slug"),
            payload = o.optString("payload"),
            queuedAtMillis = o.optLong("queuedAtMillis"),
            attempts = o.optInt("attempts"),
            lastError = o.optString("lastError").ifBlank { null },
        )
    }
}

class PendingActionStore(private val context: Context) {

    companion object {
        private val KEY = stringPreferencesKey("pending_actions")

        /** Beyond this an action is not coming back; keeping it is noise. */
        const val MAX_ATTEMPTS = 5
    }

    fun pendingFlow(): Flow<List<PendingAction>> =
        context.pendingStore.data.map { parse(it[KEY]) }

    suspend fun count(): Int = pendingFlow().first().size

    suspend fun enqueue(action: PendingAction) {
        context.pendingStore.edit { prefs ->
            val current = parse(prefs[KEY])
            // Same kind on the same slug replaces rather than stacks — queuing
            // "scaffold X" four times means one scaffold, not four.
            val deduped = current.filterNot { it.kind == action.kind && it.slug == action.slug }
            prefs[KEY] = serialise(deduped + action)
        }
    }

    suspend fun remove(id: String) {
        context.pendingStore.edit { prefs ->
            prefs[KEY] = serialise(parse(prefs[KEY]).filterNot { it.id == id })
        }
    }

    /** Record a failed attempt. Drops the action once it is clearly not landing. */
    suspend fun recordFailure(id: String, error: String) {
        context.pendingStore.edit { prefs ->
            val updated = parse(prefs[KEY]).mapNotNull { a ->
                if (a.id != id) a
                else if (a.attempts + 1 >= MAX_ATTEMPTS) null
                else a.copy(attempts = a.attempts + 1, lastError = error)
            }
            prefs[KEY] = serialise(updated)
        }
    }

    suspend fun clear() {
        context.pendingStore.edit { it[KEY] = "[]" }
    }

    private fun parse(raw: String?): List<PendingAction> {
        if (raw.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONArray(raw)
            buildList { for (i in 0 until arr.length()) add(PendingAction.fromJson(arr.getJSONObject(i))) }
        } catch (_: Exception) {
            // A corrupt queue must not brick the app. Losing queued actions is
            // bad; refusing to start is worse.
            emptyList()
        }
    }

    private fun serialise(list: List<PendingAction>): String {
        val arr = JSONArray()
        list.forEach { arr.put(it.toJson()) }
        return arr.toString()
    }
}
