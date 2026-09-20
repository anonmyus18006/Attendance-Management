package com.ghsfatehpuriank.sma

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            // Trigger rescheduling of 8:00 AM attendance alarm based on SQLite app settings
            NotificationSchedulerHelper.rescheduleFromStorage(context)
        }
    }
}
