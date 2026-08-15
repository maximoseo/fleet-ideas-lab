package ai.maximo.ideaslab.data

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import ai.maximo.ideaslab.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

data class AppVersion(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val fallbackUrl: String,
    val changelog: String,
    val mandatory: Boolean,
)

sealed class UpdateCheckResult {
    data object UpToDate: UpdateCheckResult()
    data class UpdateAvailable(val remote: AppVersion): UpdateCheckResult()
    data class Error(val message: String): UpdateCheckResult()
}

object UpdateChecker {
    private val client = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS).build()

    suspend fun fetchRemote(): AppVersion? = withContext(Dispatchers.IO) {
        try {
            val url = BuildConfig.BASE_URL.trimEnd('/') + "/api/app/version"
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            val txt = res.body?.string() ?: return@withContext null
            val j = JSONObject(txt)
            AppVersion(
                versionCode = j.optInt("versionCode", 0),
                versionName = j.optString("versionName", ""),
                apkUrl = j.optString("apkUrl", ""),
                fallbackUrl = j.optString("fallbackUrl", ""),
                changelog = j.optString("changelog", ""),
                mandatory = j.optBoolean("mandatory", false),
            )
        } catch (_: Exception) { null }
    }

    fun localVersionCode(ctx: Context): Int {
        return try {
            val pi = if (Build.VERSION.SDK_INT >= 33) ctx.packageManager.getPackageInfo(ctx.packageName, PackageManager.PackageInfoFlags.of(0))
            else @Suppress("DEPRECATION") ctx.packageManager.getPackageInfo(ctx.packageName, 0)
            if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode.toInt() else @Suppress("DEPRECATION") pi.versionCode
        } catch (_: Exception) { 0 }
    }

    suspend fun check(ctx: Context): UpdateCheckResult {
        val remote = fetchRemote() ?: return UpdateCheckResult.Error("Could not reach update server")
        if (remote.versionCode <= 0) return UpdateCheckResult.Error("Bad remote version")
        val local = localVersionCode(ctx)
        return if (remote.versionCode > local) UpdateCheckResult.UpdateAvailable(remote) else UpdateCheckResult.UpToDate
    }

    suspend fun downloadApk(ctx: Context, remote: AppVersion, onProgress: ((Int)->Unit)? = null): File? = withContext(Dispatchers.IO) {
        try {
            val url = remote.apkUrl.ifEmpty { remote.fallbackUrl }
            if (url.isEmpty()) return@withContext null
            val req = Request.Builder().url(url).get().build()
            val res = client.newCall(req).execute()
            if (!res.isSuccessful) return@withContext null
            val body = res.body ?: return@withContext null
            val total = body.contentLength()
            val dir = File(ctx.getExternalFilesDir(null), "updates").apply { mkdirs() }
            val file = File(dir, "ideaslab-${remote.versionName}.apk")
            file.outputStream().use { out ->
                val input = body.byteStream()
                val buf = ByteArray(32 * 1024)
                var read: Int
                var done = 0L
                while (input.read(buf).also { read = it } != -1) {
                    out.write(buf, 0, read)
                    done += read
                    if (total > 0) onProgress?.invoke(((done * 100 / total).toInt()).coerceIn(0,100))
                }
            }
            file
        } catch (_: Exception) { null }
    }

    fun canInstallPackages(ctx: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= 26) ctx.packageManager.canRequestPackageInstalls() else true
    }

    fun requestInstallPermissionIntent(ctx: Context): Intent {
        return Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply { data = Uri.parse("package:${ctx.packageName}") }
    }

    fun installApk(ctx: Context, file: File) {
        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        ctx.startActivity(intent)
    }
}
