package ai.maximo.ideaslab.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.seenDataStore by preferencesDataStore(name = "fleet_seen")

class FleetSeenStore(private val context: Context) {
    companion object {
        val KEY_SEEN = stringSetPreferencesKey("fleet_seen_ids")
    }
    fun seenFlow(): Flow<Set<String>> =
        context.seenDataStore.data.map { it[KEY_SEEN] ?: emptySet() }
    suspend fun getSeen(): Set<String> =
        context.seenDataStore.data.map { it[KEY_SEEN] ?: emptySet() }.first()
    suspend fun addSeen(ids: Set<String>) {
        context.seenDataStore.edit { prefs ->
            val cur = prefs[KEY_SEEN] ?: emptySet()
            prefs[KEY_SEEN] = cur + ids
        }
    }
    suspend fun seedFromIdeas(initialIds: Set<String>) {
        context.seenDataStore.edit { prefs ->
            val cur = prefs[KEY_SEEN]
            if (cur == null || cur.isEmpty()) prefs[KEY_SEEN] = initialIds
        }
    }
    suspend fun clearSeen() {
        context.seenDataStore.edit { it.remove(KEY_SEEN) }
    }
}
