export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';

export type CustomFieldType = 'text' | 'long_text' | 'number' | 'date' | 'boolean' | 'dropdown';

export type CustomFieldScope =
  | 'global'
  | 'specific_class'
  | 'specific_class_all_sections'
  | 'specific_section'
  | 'specific_student';

export interface SchoolSettings {
  id: string;
  name: string;
  code: string;
  address: string;
  pin: string;
  tehsil: string;
  district: string;
  state: string;
  logoBase64?: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  academicYear: string;
  primaryTimezone: string;
  isAppLocked: boolean;
  isStudentEditLocked: boolean;
  appLockPasswordHash?: string;
  appLockSalt?: string;
  editPasswordHash?: string;
  editLockSalt?: string;
  notificationReminderEnabled: boolean;
  notificationReminderTime: string; // HH:MM format e.g. "08:00"
  skipSundayReminder: boolean;
  skipHolidayReminder: boolean;
  defaultPdfFields: string[];
  pdfOrientation: 'portrait' | 'landscape' | 'auto';
  showSchoolLogoInPdf: boolean;
  showSchoolCodeInPdf: boolean;
  showGeneratedDateTimeInPdf: boolean;
  showPageNumbersInPdf: boolean;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  employeeCode?: string;
  phone?: string;
  assignedClassId: string;
  assignedSectionId: string;
  notificationEnabled: boolean;
  createdAt: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "10th", "9th"
  numericGrade?: number;
  order: number;
}

export interface Section {
  id: string;
  classId: string;
  name: string; // e.g. "A", "B"
}

export interface Student {
  id: string;
  rollNo: number;
  name: string;
  classId: string;
  sectionId: string;
  fatherName: string;
  motherName: string;
  dob: string; // YYYY-MM-DD
  address: string;
  examRollNo?: string;
  feesPending: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomField {
  id: string;
  name: string;
  description?: string;
  type: CustomFieldType;
  scope: CustomFieldScope;
  targetClassId?: string;
  targetSectionId?: string;
  targetStudentId?: string;
  isRequired: boolean;
  isActive: boolean;
  options?: string[]; // for dropdown
  createdAt: string;
}

export interface CustomFieldValue {
  id: string;
  studentId: string;
  fieldId: string;
  value: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  classId: string;
  sectionId: string;
  status: AttendanceStatus;
  teacherId?: string;
  remark?: string;
  timestamp: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  reason?: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2026-2027"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
  createdAt: string;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  rollNo: number;
  status: 'active' | 'promoted' | 'archived' | 'transferred';
  enrolledAt: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  isPrimary: boolean;
  assignedAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  academicYearId: string;
  amountDue: number;
  amountPaid: number;
  lastUpdated: string;
}

export interface GeneratedPdfHistory {
  id: string;
  fileName: string;
  filePath?: string;
  type: 'STUDENT_CARD' | 'CLASS_REGISTER' | 'ATTENDANCE_DAILY' | 'ATTENDANCE_MONTHLY' | 'ATTENDANCE_YEARLY' | 'SCHOOL_SUMMARY';
  generatedAt: string;
  recordCount: number;
  targetInfo: string;
  existsLocally?: boolean;
}

export interface AttendanceSummary {
  totalStudents: number;
  markedStudents: number;
  unmarkedStudents: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  holidayCount: number;
  percentage: number;
  isComplete: boolean;
  isNonWorkingDay?: boolean;
  nonWorkingReason?: string;
}

export interface StudentAttendanceStat {
  studentId: string;
  studentName: string;
  rollNo: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  attendancePercentage: number;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  appName: string;
  schoolSettings: SchoolSettings;
  appSettings: AppSettings;
  academicYears?: AcademicYear[];
  teachers: Teacher[];
  teacherAssignments?: TeacherAssignment[];
  classes: SchoolClass[];
  sections: Section[];
  students: Student[];
  studentEnrollments?: StudentEnrollment[];
  customFields: CustomField[];
  customFieldValues: CustomFieldValue[];
  attendanceRecords: AttendanceRecord[];
  holidays: Holiday[];
  fees?: FeeRecord[];
  pdfHistory?: GeneratedPdfHistory[];
}
