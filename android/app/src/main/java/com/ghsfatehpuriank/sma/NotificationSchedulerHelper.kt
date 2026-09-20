package com.ghsfatehpuriank.sma

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

object NotificationSchedulerHelper {
    fun rescheduleFromStorage(context: Context) {
        scheduleNextAlarm(context, 8, 0)
    }

    fun scheduleNextAlarm(context: Context, hour: Int, minute: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, NotificationAlarmReceiver::class.java).apply {
            putExtra("teacherName", "VINOD KUMAR")
            putExtra("className", "10th")
            putExtra("sectionName", "A")
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            3005,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (before(Calendar.getInstance())) {
                add(Calendar.DAY_OF_MONTH, 1)
            }
            // Skip Sunday
            if (get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY) {
                add(Calendar.DAY_OF_MONTH, 1)
            }
        }

        try {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                pendingIntent
            )
        } catch (e: SecurityException) {
            alarmManager.set(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                pendingIntent
            )
        }
    }

    fun cancelAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, NotificationAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            3005,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }
}
