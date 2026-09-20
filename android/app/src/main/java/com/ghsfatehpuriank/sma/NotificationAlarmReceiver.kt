package com.ghsfatehpuriank.sma

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import java.util.Calendar

class NotificationAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val calendar = Calendar.getInstance()
        val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)

        // Strict Offline School Rule: NEVER fire on Sunday
        if (dayOfWeek == Calendar.SUNDAY) {
            return
        }

        val teacherName = intent.getStringExtra("teacherName") ?: "Class Teacher"
        val className = intent.getStringExtra("className") ?: "Assigned Class"
        val sectionName = intent.getStringExtra("sectionName") ?: ""

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, "school_attendance_reminders")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Attendance Reminder — 8:00 AM")
            .setContentText("$className $sectionName attendance is ready to be taken ($teacherName).")
            .setStyle(NotificationCompat.BigTextStyle().bigText(
                "School morning bell: Please record student attendance for $className $sectionName. Class in-charge: $teacherName."
            ))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(3005, notification)

        // Schedule next day's alarm
        NotificationSchedulerHelper.scheduleNextAlarm(context, 8, 0)
    }
}
