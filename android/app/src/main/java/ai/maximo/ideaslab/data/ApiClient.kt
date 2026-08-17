package ai.maximo.ideaslab.data

import ai.maximo.ideaslab.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class LoginResult(val ok: Boolean, val error: String? = null)
data class AnalyzeResult(val ok: Boolean, val title: String = "", val error: String? = null)
data class ScaffoldResult(val ok: Boolean, val message: String = "", val error: String? = null)
/** One probe row, newest first, as served by GET /api/fleet/probe-history. */
data class ProbeRow(val checkedAt: String, val ok: Boolean, val status: Int, val latencyMs: Long, val error: String?)

/** p50 / p95 / max over a window. p95 is the number that says "getting slower". */
data class LatencyStats(val probes: Int, val p50: Int?, val p95: Int?, val max: Int?)

data class ProbeHistory(
    val probes: List<ProbeRow>,
    val state: String?,
    val consecutiveFailures: Int,
    val lastOkAt: String?,
    val last24h: LatencyStats?,
    val last7d: LatencyStats?,
    val persisted: Boolean,
    val error: String? = null,
)

data class NotifyResult(val ok: Boolean, val bot: String? = null, val messageId: Long? = null, val botUsername: String? = null, val error: String? = null)

class ApiClient(private val sessionStore: SessionStore) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).build()
    private val base = BuildConfig.BASE_URL.trimEnd('/')
    fun baseUrl(): String = base
    suspend fun getToken(): String? = sessionStore.getSession()

    suspend fun login(username: String, password: String, turnstileToken: String = ""): LoginResult = withContext(Dispatchers.IO) {
        try {
            val body = JSONObject().apply {
                put("username", username); put("password", password)
                if (turnstileToken.isNotEmpty()) put("turnstileToken", turnstileToken)
                // First-party app channel: the server skips Turnstile for the
                // revocable app token (password + rate-limit still enforced).
                put("appToken", BuildConfig.APP_TOKEN)
            }.toString().toRequestBody("application/json".toMediaType())
            val req = Request.Builder().url("$base/api/auth/login").post(body).build()
            val res = client.newCall(req).execute()
            val txt = res.body?.string() ?: ""
            val json = try { JSONObject(txt) } catch(_: Exception) { JSONObject() }
            if (res.isSuccessful) {
                val cookie = res.headers("set-cookie").firstOrNull { it.contains("dl_session") }
                val token = cookie?.substringAfter("dl_session=")?.substringBefore(";") ?: json.optString("token", "")
                if (token.isNotEmpty()) sessionStore.saveSession(token, username)
                LoginResult(true)
            } else {
                LoginResult(false, json.optString("error", "Login failed (${res.code})"))
            }
        } catch (e: Exception) { LoginResult(false, e.message ?: "Network error") }
    }

    suspend fun me(): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = sessionStore.getSession() ?: return@withContext false
            val req = Request.Builder().url("$base/api/auth/me").header("Cookie", "dl_session=$token").get().build()
            val res = client.newCall(req).execute()
            res.isSuccessful
        } catch(_: Exception) { false }
    }

    suspend fun analyze(url: String): AnalyzeResult = withContext(Dispatchers.IO) {
        try {
            val token = sessionStore.getSession() ?: return@withContext AnalyzeResult(false, error="Not authenticated")
            val body = JSONObject().put("url", url).toString().toRequestBody("application/json".toMediaType())
            val req = Request.Builder().url("$base/api/analyze").header("Cookie", "dl_session=$token").post(body).build()
            val res = client.newCall(req).execute()
            val txt = res.body?.string() ?: ""
            val json = try { JSONObject(txt) } catch(_: Exception) { JSONObject() }
            if (res.isSuccessful) AnalyzeResult(true, json.optString("title", url))
            else AnalyzeResult(false, error=json.optString("error", "Analyze failed"))
        } catch(e: Exception) { AnalyzeResult(false, error=e.message) }
    }

    /** Fleet scaffold — POST /api/fleet/scaffold with dl_session cookie (Vercel-aware) */
    suspend fun scaffold(slug: String, ideaId: String? = null, kind: String? = null, targetSlug: String? = null): ScaffoldResult = withContext(Dispatchers.IO) {
        try {
            val token = sessionStore.getSession() ?: return@withContext ScaffoldResult(false, error="Not authenticated — please login")
            if (slug.isBlank()) return@withContext ScaffoldResult(false, error="Slug required")
            val jsonBody = JSONObject().apply {
                put("slug", slug.trim())
                if (ideaId != null) put("ideaId", ideaId)
                if (kind != null) put("kind", kind)
                if (targetSlug != null) put("targetSlug", targetSlug)
            }
            val body = jsonBody.toString().toRequestBody("application/json".toMediaType())
            val req = Request.Builder()
                .url("$base/api/fleet/scaffold")
                .header("Cookie", "dl_session=$token")
                .post(body)
                .build()
            val res = client.newCall(req).execute()
            val txt = res.body?.string() ?: ""
            val json = try { JSONObject(txt) } catch(_: Exception) { JSONObject() }
            if (res.isSuccessful) {
                val dir = json.optString("dir", "")
                val mode = json.optString("mode", "")
                val note = json.optString("note", "")
                val k = json.optString("kind", kind ?: "new")
                val target = json.optString("targetSlug", targetSlug ?: "")
                val prefix = if (k == "enhancement") "Tab scaffolded" else "Dashboard scaffolded"
                val targetNote = if (k == "enhancement" && target.isNotEmpty()) " \u2014 feature branch for $target (merge as tab)" else " \u2014 new standalone dashboard"
                val modeNote = if (mode == "vercel-tmp") " (Vercel /tmp \u2014 ephemeral)" else ""
                val msg = "$prefix $slug at $dir$modeNote$targetNote" + (if (note.isNotEmpty()) " \u00b7 $note" else "")
                ScaffoldResult(true, msg)
            } else {
                ScaffoldResult(false, error=json.optString("error", "Scaffold failed (${res.code})"))
            }
        } catch (e: Exception) { ScaffoldResult(false, error=e.message ?: "Network error") }
    }
    suspend fun notifyIdea(ideaSlug: String, ideaId: String? = null, mode: String = "build", bot: String = "coding"): NotifyResult = withContext(Dispatchers.IO) {
        try {
            val token = sessionStore.getSession() ?: return@withContext NotifyResult(false, error="Not authenticated — please login")
            val jsonBody = JSONObject().apply {
                put("ideaSlug", ideaSlug)
                if (ideaId != null) put("ideaId", ideaId)
                put("mode", mode)
                put("bot", bot)
            }
            val body = jsonBody.toString().toRequestBody("application/json".toMediaType())
            val req = Request.Builder()
                .url("$base/api/fleet/notify")
                .header("Cookie", "dl_session=$token")
                .post(body)
                .build()
            val res = client.newCall(req).execute()
            val txt2 = res.body?.string() ?: ""
            val json = try { JSONObject(txt2) } catch(_: Exception) { JSONObject() }
            if (res.isSuccessful) {
                val b = json.optString("bot", bot)
                val mid = if (json.has("message_id") && !json.isNull("message_id")) json.optLong("message_id") else null
                val bun = json.optString("botUsername", if (b=="coding") "CodingAgent64Bot" else "HermesAgent64SparkBot")
                NotifyResult(true, bot=b, messageId=mid, botUsername=bun)
            } else {
                NotifyResult(false, error=json.optString("error", "Notify failed (${res.code})"))
            }
        } catch (e: Exception) { NotifyResult(false, error=e.message ?: "Network error") }
    }

    suspend fun logout(): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = sessionStore.getSession()
            val req = Request.Builder()
                .url("$base/api/auth/logout")
                .apply { if (!token.isNullOrEmpty()) header("Cookie", "dl_session=$token") }
                .post("".toRequestBody("application/json".toMediaType()))
                .build()
            // Best-effort: even if server is unreachable we still clear local session
            try { client.newCall(req).execute().close() } catch (_: Exception) {}
            true
        } catch (_: Exception) { true }
    }
    // Back-compat overload

    /**
     * Probe history + latency percentiles for one dashboard.
     *
     * The backend has served p50/p95 since 2026-08-17 and nothing consumed it.
     * An average hides the tail a person actually notices; "usually 150ms,
     * sometimes 3s" and "always 400ms" are different problems.
     */
    suspend fun probeHistory(slug: String): ProbeHistory = withContext(Dispatchers.IO) {
        try {
            val token = sessionStore.getSession()
                ?: return@withContext ProbeHistory(emptyList(), null, 0, null, null, null, false, "Not authenticated")
            val req = Request.Builder()
                .url("$base/api/fleet/probe-history?slug=" + java.net.URLEncoder.encode(slug, "UTF-8"))
                .header("Cookie", "dl_session=$token")
                .get().build()
            val res = client.newCall(req).execute()
            val txt = res.body?.string() ?: ""
            if (!res.isSuccessful) {
                return@withContext ProbeHistory(emptyList(), null, 0, null, null, null, false, "HTTP ${res.code}")
            }
            val root = JSONObject(txt)
            val arr = root.optJSONArray("probes")
            val rows = buildList {
                for (i in 0 until (arr?.length() ?: 0)) {
                    val o = arr!!.getJSONObject(i)
                    add(
                        ProbeRow(
                            checkedAt = o.optString("checked_at"),
                            ok = o.optBoolean("ok"),
                            status = o.optInt("status"),
                            latencyMs = o.optLong("latency_ms"),
                            error = o.optString("error").ifBlank { null },
                        )
                    )
                }
            }
            val health = root.optJSONObject("health")
            val latency = root.optJSONObject("latency")
            fun stats(key: String): LatencyStats? {
                val o = latency?.optJSONObject(key) ?: return null
                // A missing percentile is null, not zero — zero is a claim.
                fun intOrNull(k: String) = if (o.isNull(k)) null else o.optInt(k)
                return LatencyStats(o.optInt("probes"), intOrNull("p50_ms"), intOrNull("p95_ms"), intOrNull("max_ms"))
            }
            ProbeHistory(
                probes = rows,
                state = health?.optString("state")?.ifBlank { null },
                consecutiveFailures = health?.optInt("consecutive_failures") ?: 0,
                lastOkAt = health?.optString("last_ok_at")?.ifBlank { null },
                last24h = stats("last24h"),
                last7d = stats("last7d"),
                persisted = root.optBoolean("persisted"),
            )
        } catch (e: Exception) {
            ProbeHistory(emptyList(), null, 0, null, null, null, false, e.message ?: "Network error")
        }
    }

    suspend fun scaffoldSimple(slug: String): ScaffoldResult = scaffold(slug)
}
