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

class ApiClient(private val sessionStore: SessionStore) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).build()
    private val base = BuildConfig.BASE_URL.trimEnd('/')

    suspend fun login(username: String, password: String, turnstileToken: String = ""): LoginResult = withContext(Dispatchers.IO) {
        try {
            val body = JSONObject().apply {
                put("username", username); put("password", password)
                if (turnstileToken.isNotEmpty()) put("turnstileToken", turnstileToken)
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
    // Back-compat overload
    suspend fun scaffoldSimple(slug: String): ScaffoldResult = scaffold(slug)
}
