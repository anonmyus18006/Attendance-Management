import { db } from '../database/db';
import { AttendanceRecord, AttendanceSummary, StudentAttendanceStat, Student } from '../types';

export interface WorkingDayRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalCalendarDays: number;
  sundaysCount: number;
  holidaysCount: number;
  totalWorkingDays: number;
  workingDates: string[];
}

export function computeWorkingDays(startDateStr: string, endDateStr: string): WorkingDayRange {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  let calendarDays = 0;
  let sundays = 0;
  let holidays = 0;
  const workingDates: string[] = [];

  const curr = new Date(start);
  while (curr <= end) {
    calendarDays++;
    const dateStr = curr.toISOString().split('T')[0];
    const isSunday = curr.getDay() === 0;
    const holiday = db.isDateHoliday(dateStr);

    if (isSunday) {
      sundays++;
    } else if (holiday) {
      holidays++;
    } else {
      workingDates.push(dateStr);
    }

    curr.setDate(curr.getDate() + 1);
  }

  const totalWorkingDays = Math.max(0, calendarDays - sundays - holidays);

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    totalCalendarDays: calendarDays,
    sundaysCount: sundays,
    holidaysCount: holidays,
    totalWorkingDays,
    workingDates,
  };
}

export function getTodayDateString(): string {
  // Asia/Kolkata timezone representation
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).format(now); // formats YYYY-MM-DD
  return parts;
}

export function getTodayDisplayDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('en-IN', options).format(now);
}

export function calculateStudentAttendanceStats(
  student: Student,
  startDateStr?: string,
  endDateStr?: string
): StudentAttendanceStat {
  const today = getTodayDateString();
  const start = startDateStr || student.createdAt.split('T')[0] || '2026-04-01';
  const end = endDateStr || today;

  const workingDayInfo = computeWorkingDays(start, end);
  const records = db.getAttendanceRecords({
    studentId: student.id,
    startDate: start,
    endDate: end,
  });

  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;

  records.forEach(r => {
    // Only evaluate records for recognized working days
    if (r.status === 'PRESENT') presentCount++;
    else if (r.status === 'ABSENT') absentCount++;
    else if (r.status === 'LEAVE') leaveCount++;
  });

  // Working days where student had registered records or total period working days
  const effectiveWorkingDays = Math.max(
    presentCount + absentCount + leaveCount,
    workingDayInfo.totalWorkingDays,
    1
  );

  const percentage = Number(((presentCount / effectiveWorkingDays) * 100).toFixed(2));

  return {
    studentId: student.id,
    studentName: student.name,
    rollNo: student.rollNo,
    workingDays: effectiveWorkingDays,
    presentDays: presentCount,
    absentDays: absentCount,
    leaveDays: leaveCount,
    attendancePercentage: percentage,
  };
}

export function getClassAttendanceSummaryForDate(
  classId: string,
  sectionId: string,
  dateStr: string
): AttendanceSummary {
  const students = db.getStudents(classId, sectionId);
  const total = students.length;

  if (total === 0) {
    return {
      totalStudents: 0,
      markedStudents: 0,
      unmarkedStudents: 0,
      presentCount: 0,
      absentCount: 0,
      leaveCount: 0,
      holidayCount: 0,
      percentage: 0,
      isComplete: false,
      isNonWorkingDay: false,
    };
  }

  const isSunday = db.isDateSunday(dateStr);
  const holiday = db.isDateHoliday(dateStr);

  if (isSunday || holiday) {
    return {
      totalStudents: total,
      markedStudents: 0,
      unmarkedStudents: total,
      presentCount: 0,
      absentCount: 0,
      leaveCount: 0,
      holidayCount: total,
      percentage: 0,
      isComplete: false,
      isNonWorkingDay: true,
      nonWorkingReason: isSunday ? 'Sunday (Weekly Off)' : (holiday?.name || 'School Holiday'),
    };
  }

  const records = db.getAttendanceRecords({ classId, sectionId, date: dateStr });
  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach(r => recordMap.set(r.studentId, r));

  let present = 0;
  let absent = 0;
  let leave = 0;

  students.forEach(student => {
    const rec = recordMap.get(student.id);
    if (rec?.status === 'PRESENT') present++;
    else if (rec?.status === 'ABSENT') absent++;
    else if (rec?.status === 'LEAVE') leave++;
  });

  const markedCount = present + absent + leave;
  const unmarkedCount = Math.max(0, total - markedCount);
  const isComplete = total > 0 && markedCount === total;
  // Rule: NEVER calculate (present / markedCount) as percentage when attendance is incomplete
  const percentage = isComplete ? Number(((present / total) * 100).toFixed(2)) : 0;

  return {
    totalStudents: total,
    markedStudents: markedCount,
    unmarkedStudents: unmarkedCount,
    presentCount: present,
    absentCount: absent,
    leaveCount: leave,
    holidayCount: 0,
    percentage,
    isComplete,
    isNonWorkingDay: false,
  };
}
