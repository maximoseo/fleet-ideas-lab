package ai.maximo.ideaslab.data

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class UpdateCheckWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        return try {
            NotificationHelper.ensureChannels(applicationContext)
            when (val check = UpdateChecker.check(applicationContext)) {
                is UpdateCheckResult.UpdateAvailable -> {
                    NotificationHelper.notifyUpdateAvailable(applicationContext, check.remote.versionName, check.remote.changelog)
                }
                else -> {}
            }
            // Also check for new ideas count diff (best-effort, no auth — use cached)
            // If we have a session, we could poll /api/fleet/ideas count — skipped for sideload
            Result.success()
        } catch (_: Exception) { Result.retry() }
    }

    companion object {
        const val WORK_NAME = "ideaslab_daily_update_check"

        fun schedule(ctx: Context) {
            val req = PeriodicWorkRequestBuilder<UpdateCheckWorker>(12, TimeUnit.HOURS)
                .setInitialDelay(10, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, req)
        }
    }
}
