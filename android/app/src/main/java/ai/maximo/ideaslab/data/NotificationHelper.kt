package ai.maximo.ideaslab.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import ai.maximo.ideaslab.MainActivity

object NotificationHelper {
    const val CHANNEL_UPDATES = "ideaslab_updates"
    const val CHANNEL_IDEAS = "ideaslab_ideas"
    const val NOTIF_UPDATE = 1001
    const val NOTIF_IDEA = 1002

    fun ensureChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channels = listOf(
            NotificationChannel(CHANNEL_UPDATES, "Updates", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "New APK versions and critical fleet updates"
            },
            NotificationChannel(CHANNEL_IDEAS, "Fleet Ideas", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "New dashboard ideas and inspirations"
            },
        )
        for (ch in channels) nm.createNotificationChannel(ch)
    }

    private fun pendingForUpdate(ctx: Context): PendingIntent {
        val intent = Intent(ctx, MainActivity::class.java).apply { putExtra("open", "update") }
        return PendingIntent.getActivity(ctx, 9001, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun pendingForIdeas(ctx: Context): PendingIntent {
        val intent = Intent(ctx, MainActivity::class.java).apply { putExtra("open", "ideas") }
        return PendingIntent.getActivity(ctx, 9002, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun notifyUpdateAvailable(ctx: Context, versionName: String, changelog: String) {
        ensureChannels(ctx)
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notif = NotificationCompat.Builder(ctx, CHANNEL_UPDATES)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("Update available \u00b7 $versionName")
            .setContentText(changelog.take(80))
            .setStyle(NotificationCompat.BigTextStyle().bigText(changelog))
            .setContentIntent(pendingForUpdate(ctx))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        try { nm.notify(NOTIF_UPDATE, notif) } catch (_: SecurityException) {}
    }

    fun notifyNewIdeas(ctx: Context, count: Int) {
        if (count <= 0) return
        ensureChannels(ctx)
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notif = NotificationCompat.Builder(ctx, CHANNEL_IDEAS)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("$count new ideas")
            .setContentText("Open Ideas Lab to explore")
            .setContentIntent(pendingForIdeas(ctx))
            .setAutoCancel(true)
            .build()
        try { nm.notify(NOTIF_IDEA, notif) } catch (_: SecurityException) {}
    }

    fun cancelUpdate(ctx: Context) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(NOTIF_UPDATE)
    }
}
