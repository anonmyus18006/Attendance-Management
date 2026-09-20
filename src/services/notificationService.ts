import { db } from '../database/db';
import { getTodayDateString } from './attendanceService';

export interface ScheduledReminder {
  timeStr: string; // e.g. "08:00"
  teacherName: string;
  className: string;
  sectionName: string;
  status: 'PENDING' | 'DISMISSED' | 'SKIPPED_SUNDAY' | 'SKIPPED_HOLIDAY' | 'DELIVERED';
  reason?: string;
}

export class NotificationService {
  private static checkInterval: number | null = null;
  private static listeners: Set<(reminder: ScheduledReminder) => void> = new Set();
  private static lastTriggeredDate: string | null = null;

  public static init(): void {
    if (this.checkInterval) return;

    // Request browser notification permission if available
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }

    // Schedule regular offline check (every 30 seconds)
    this.checkReminder();
    this.checkInterval = window.setInterval(() => {
      this.checkReminder();
    }, 30000);
  }

  public static onReminder(callback: (reminder: ScheduledReminder) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public static checkReminder(): ScheduledReminder | null {
    const settings = db.getAppSettings();
    if (!settings.notificationReminderEnabled) return null;

    const todayStr = getTodayDateString();
    const isSunday = db.isDateSunday(todayStr);
    const holiday = db.isDateHoliday(todayStr);

    if (isSunday && settings.skipSundayReminder) {
      return {
        timeStr: settings.notificationReminderTime,
        teacherName: 'All Teachers',
        className: 'All',
        sectionName: 'All',
        status: 'SKIPPED_SUNDAY',
        reason: 'Today is Sunday (Non-school day)',
      };
    }

    if (holiday && settings.skipHolidayReminder) {
      return {
        timeStr: settings.notificationReminderTime,
        teacherName: 'All Teachers',
        className: 'All',
        sectionName: 'All',
        status: 'SKIPPED_HOLIDAY',
        reason: `School Holiday: ${holiday.name}`,
      };
    }

    const teachers = db.getTeachers().filter(t => t.notificationEnabled);
    const classes = db.getClasses();
    const sections = db.getSections();

    // Check time in Asia/Kolkata
    const now = new Date();
    const kolkataTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    // If current time >= scheduled time and not yet triggered today
    if (kolkataTimeStr >= settings.notificationReminderTime && this.lastTriggeredDate !== todayStr) {
      this.lastTriggeredDate = todayStr;

      // Primary assigned teacher
      const primaryTeacher = teachers[0] || {
        name: 'VINOD KUMAR',
        assignedClassId: 'class-10',
        assignedSectionId: 'sec-10-a',
      };
      const cls = classes.find(c => c.id === primaryTeacher.assignedClassId)?.name || '10th';
      const sec = sections.find(s => s.id === primaryTeacher.assignedSectionId)?.name || 'A';

      const reminder: ScheduledReminder = {
        timeStr: settings.notificationReminderTime,
        teacherName: primaryTeacher.name,
        className: cls,
        sectionName: sec,
        status: 'DELIVERED',
        reason: `Class ${cls} ${sec} attendance is ready to be taken.`,
      };

      // Native browser notification if allowed
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Attendance Reminder — GHS Fatehpuria NK', {
            body: `Class ${cls} ${sec} attendance is ready to be taken.\nTeacher: ${primaryTeacher.name}`,
            icon: '/favicon.ico',
          });
        } catch (e) {
          // ignore
        }
      }

      this.listeners.forEach(fn => fn(reminder));
      return reminder;
    }

    return null;
  }

  public static testTriggerNow(): ScheduledReminder {
    const settings = db.getAppSettings();
    const teachers = db.getTeachers();
    const classes = db.getClasses();
    const sections = db.getSections();

    const t = teachers[0] || { name: 'VINOD KUMAR', assignedClassId: 'class-10', assignedSectionId: 'sec-10-a' };
    const cls = classes.find(c => c.id === t.assignedClassId)?.name || '10th';
    const sec = sections.find(s => s.id === t.assignedSectionId)?.name || 'A';

    const reminder: ScheduledReminder = {
      timeStr: settings.notificationReminderTime,
      teacherName: t.name,
      className: cls,
      sectionName: sec,
      status: 'DELIVERED',
      reason: `Class ${cls} ${sec} attendance is ready to be taken.`,
    };

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Attendance Reminder — GHS Fatehpuria NK', {
          body: `Class ${cls} ${sec} attendance is ready to be taken.\nTeacher: ${t.name}`,
          icon: '/favicon.ico',
        });
      } catch (e) {}
    }

    this.listeners.forEach(fn => fn(reminder));
    return reminder;
  }
}
