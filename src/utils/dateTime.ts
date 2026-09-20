/**
 * Centralized Date, Time, and Working Day Utilities
 * Fixed to Asia/Kolkata timezone without external API calls.
 */

import { Holiday } from '../types';

export const SCHOOL_TIMEZONE = 'Asia/Kolkata';

export class DateTimeService {
  /**
   * Returns current date in Asia/Kolkata timezone as YYYY-MM-DD
   */
  public static getCurrentIndiaDate(): string {
    const now = new Date();
    // Format using en-CA (YYYY-MM-DD format) in Asia/Kolkata timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: SCHOOL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  }

  /**
   * Returns current time in Asia/Kolkata timezone as 24-hr HH:MM:SS
   */
  public static getCurrentIndiaTime(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: SCHOOL_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(now);
  }

  /**
   * Returns current formatted display date (e.g. "Wednesday, 20 September 2026")
   */
  public static getFormattedDate(dateStr?: string): string {
    const d = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: SCHOOL_TIMEZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  }

  /**
   * Checks if a given date string (YYYY-MM-DD) falls on a Sunday.
   * Sunday is ALWAYS non-working.
   */
  public static isSunday(dateStr: string): boolean {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCDay() === 0; // 0 = Sunday
  }

  /**
   * Checks if a given date string (YYYY-MM-DD) is a configured school holiday
   */
  public static isHoliday(dateStr: string, holidays: Holiday[]): Holiday | undefined {
    return holidays.find(h => h.date === dateStr);
  }

  /**
   * Checks if a given date is a valid school working day (neither Sunday nor Holiday)
   */
  public static isWorkingDay(dateStr: string, holidays: Holiday[]): boolean {
    if (this.isSunday(dateStr)) return false;
    if (this.isHoliday(dateStr, holidays)) return false;
    return true;
  }

  /**
   * Calculates the exact number of school working days in a date range (inclusive),
   * strictly excluding all Sundays and all configured holidays.
   */
  public static getWorkingDaysInRange(
    startDateStr: string,
    endDateStr: string,
    holidays: Holiday[]
  ): number {
    const [sY, sM, sD] = startDateStr.split('-').map(Number);
    const [eY, eM, eD] = endDateStr.split('-').map(Number);

    const start = new Date(Date.UTC(sY, sM - 1, sD));
    const end = new Date(Date.UTC(eY, eM - 1, eD));

    if (start > end) return 0;

    let workingDaysCount = 0;
    const current = new Date(start);

    while (current <= end) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (this.isWorkingDay(dateStr, holidays)) {
        workingDaysCount++;
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return workingDaysCount;
  }

  /**
   * Returns all dates in a month (YYYY-MM) with working status flag
   */
  public static getDaysInMonth(
    yearMonth: string, // YYYY-MM
    holidays: Holiday[]
  ): Array<{ date: string; dayNum: number; isSunday: boolean; holiday?: Holiday; isWorking: boolean }> {
    const [year, month] = yearMonth.split('-').map(Number);
    const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const result = [];

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
      const isSun = this.isSunday(dateStr);
      const hol = this.isHoliday(dateStr, holidays);
      const isWork = !isSun && !hol;

      result.push({
        date: dateStr,
        dayNum: day,
        isSunday: isSun,
        holiday: hol,
        isWorking: isWork,
      });
    }

    return result;
  }
}
