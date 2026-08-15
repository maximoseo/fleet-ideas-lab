package ai.maximo.ideaslab.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.favoritesDataStore by preferencesDataStore(name = "fleet_favorites")

class FleetFavoritesStore(private val context: Context) {
    companion object {
        val KEY_FAVORITES = stringSetPreferencesKey("fleet_favorites_ids")
    }

    fun favoritesFlow(): Flow<Set<String>> =
        context.favoritesDataStore.data.map { it[KEY_FAVORITES] ?: emptySet() }

    suspend fun getFavorites(): Set<String> =
        context.favoritesDataStore.data.map { it[KEY_FAVORITES] ?: emptySet() }.first()

    suspend fun isFavorite(id: String): Boolean = getFavorites().contains(id)

    suspend fun toggleFavorite(id: String): Boolean {
        var becameFav = false
        context.favoritesDataStore.edit { prefs ->
            val cur = prefs[KEY_FAVORITES] ?: emptySet()
            val next = if (cur.contains(id)) cur - id else cur + id
            becameFav = next.contains(id)
            prefs[KEY_FAVORITES] = next
        }
        return becameFav
    }

    suspend fun setFavorite(id: String, fav: Boolean) {
        context.favoritesDataStore.edit { prefs ->
            val cur = prefs[KEY_FAVORITES] ?: emptySet()
            prefs[KEY_FAVORITES] = if (fav) cur + id else cur - id
        }
    }

    suspend fun clearAll() {
        context.favoritesDataStore.edit { it.remove(KEY_FAVORITES) }
    }
}
