package ai.maximo.ideaslab.data

import android.content.Context
import ai.maximo.ideaslab.BuildConfig
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

private val Context.fleetCacheStore by preferencesDataStore(name = "fleet_cache")

/** Live probe health for one dashboard, as served by GET /api/app/fleet. */
data class FleetLiveHealth(
    val state: String,      // healthy | degraded | down (anything else renders as unknown)
    val lastStatus: Int,    // last HTTP status the probe saw (0 when unknown)
    val latencyMs: Long,
    val checkedAt: String,  // ISO-8601 timestamp from the backend
)

enum class FleetSource { LIVE, CACHE, SNAPSHOT }

/**
 * The feed rejected this build's APP_TOKEN (401/403).
 *
 * Its own type so the UI can say "this app build is out of date — update"
 * instead of the generic offline message. The token ships inside the APK, so
 * a rotation on the server makes every older install look merely offline.
 */
class StaleAppTokenException :
    Exception("This app build is out of date — update to keep live fleet data")

data class FleetFeed(
    val sites: List<FleetSite>,
    val health: Map<String, FleetLiveHealth>,
    val source: FleetSource,
    val fetchedAtMillis: Long, // when the data came from the network (0 for the bundled snapshot)
    val error: String? = null,
    /**
     * The server rejected this build's APP_TOKEN.
     *
     * Distinct from ordinary offline: the data on screen is stale and staying
     * stale until the app is updated, because the token baked into this APK is
     * no longer the one production accepts. Falling back to the cache silently
     * is how an out-of-date install looks healthy for weeks.
     */
    val staleToken: Boolean = false,
)

/**
 * Live fleet inventory with honest offline behaviour.
 *
 * Order of preference on every load:
 *   1. GET $BASE_URL/api/app/fleet (APP_TOKEN bearer, 8s ceiling) → cached on success
 *   2. the last cached copy (any failure: offline, 401, timeout, bad JSON)
 *   3. the bundled FleetData snapshot, flagged SNAPSHOT so the UI can say so
 *
 * Cache follows the existing store pattern (DataStore preferences, raw JSON string),
 * same as FleetSeenStore / FleetFavoritesStore — Room stays out of this path.
 */
class FleetRepository(private val context: Context) {

    companion object {
        private val KEY_JSON = stringPreferencesKey("fleet_feed_json")
        private val KEY_FETCHED_AT = longPreferencesKey("fleet_feed_fetched_at")
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .build()
    private val base = BuildConfig.BASE_URL.trimEnd('/')

    suspend fun load(): FleetFeed = withContext(Dispatchers.IO) {
        try {
            if (BuildConfig.APP_TOKEN.isBlank()) throw Exception("APP_TOKEN not configured")
            val req = Request.Builder()
                .url("$base/api/app/fleet")
                .header("Authorization", "Bearer ${BuildConfig.APP_TOKEN}")
                .header("Accept", "application/json")
                .get()
                .build()
            client.newCall(req).execute().use { res ->
                val txt = res.body?.string().orEmpty()
                if (res.code == 401 || res.code == 403) throw StaleAppTokenException()
                if (!res.isSuccessful) throw Exception("HTTP ${res.code}")
                val parsed = parseFeed(txt)
                val now = System.currentTimeMillis()
                saveCache(txt, now)
                parsed.copy(source = FleetSource.LIVE, fetchedAtMillis = now)
            }
        } catch (e: Exception) {
            val stale = e is StaleAppTokenException
            val cached = readCache()
            if (cached != null) {
                cached.copy(source = FleetSource.CACHE, error = e.message, staleToken = stale)
            } else {
                FleetFeed(
                    sites = FleetData.sites,
                    health = emptyMap(),
                    source = FleetSource.SNAPSHOT,
                    fetchedAtMillis = 0,
                    error = e.message,
                    staleToken = stale,
                )
            }
        }
    }

    private suspend fun saveCache(json: String, fetchedAt: Long) {
        context.fleetCacheStore.edit { prefs ->
            prefs[KEY_JSON] = json
            prefs[KEY_FETCHED_AT] = fetchedAt
        }
    }

    private suspend fun readCache(): FleetFeed? {
        val prefs = context.fleetCacheStore.data.first()
        val json = prefs[KEY_JSON] ?: return null
        if (json.isBlank()) return null
        val at = prefs[KEY_FETCHED_AT] ?: 0L
        return try {
            parseFeed(json).copy(fetchedAtMillis = at)
        } catch (_: Exception) {
            null // corrupt cache — caller falls through to the snapshot
        }
    }

    private fun parseFeed(txt: String): FleetFeed {
        val root = JSONObject(txt)
        val arr = root.optJSONArray("inventory") ?: throw Exception("feed missing inventory")
        val sites = ArrayList<FleetSite>(arr.length())
        val health = HashMap<String, FleetLiveHealth>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val slug = o.optString("slug")
            if (slug.isBlank()) continue
            sites.add(
                FleetSite(
                    slug = slug,
                    name = o.optString("name", slug),
                    domain = o.optJSONArray("domains")?.let { d ->
                        (0 until d.length()).joinToString(" + ") { d.optString(it) }
                    }?.ifBlank { "fleet" } ?: "fleet",
                    // Feed has no live/beta rollout flag; every inventoried project is deployed.
                    status = "live",
                    stack = o.optJSONArray("capabilities")?.let { c ->
                        (0 until c.length()).joinToString(" + ") { c.optString(it) }
                    }?.ifBlank { "dashboard" } ?: "dashboard",
                    plainExplainer = o.optString("plainExplainer"),
                )
            )
            val live = o.optJSONObject("live")
            if (live != null) {
                health[slug] = FleetLiveHealth(
                    state = live.optString("state", "unknown"),
                    lastStatus = live.optInt("lastStatus", 0),
                    latencyMs = live.optLong("latencyMs", 0L),
                    checkedAt = live.optString("checkedAt", ""),
                )
            }
        }
        if (sites.isEmpty()) throw Exception("feed inventory empty")
        return FleetFeed(sites, health, FleetSource.LIVE, 0)
    }
}

/** "5m ago" style relative time for an ISO-8601 timestamp; minSdk-24 safe (no java.time). */
fun relativeTime(iso: String, nowMillis: Long = System.currentTimeMillis()): String {
    val then = parseIso8601(iso) ?: return ""
    return relativeAge(then, nowMillis)
}

/** "5m ago" style relative time for an epoch-millis timestamp. */
fun relativeAge(millis: Long, nowMillis: Long = System.currentTimeMillis()): String {
    if (millis <= 0) return ""
    val diff = nowMillis - millis
    if (diff < 0) return "just now"
    val min = diff / 60_000
    return when {
        min < 1 -> "just now"
        min < 60 -> "${min}m ago"
        min < 60 * 24 -> "${min / 60}h ago"
        else -> "${min / (60 * 24)}d ago"
    }
}

private fun parseIso8601(iso: String): Long? {
    if (iso.isBlank()) return null
    val patterns = arrayOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
        "yyyy-MM-dd'T'HH:mm:ssZ",
        "yyyy-MM-dd HH:mm:ss",
    )
    for (p in patterns) {
        try {
            val sdf = SimpleDateFormat(p, Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            val d: Date? = sdf.parse(iso)
            if (d != null) return d.time
        } catch (_: Exception) { }
    }
    return null
}
