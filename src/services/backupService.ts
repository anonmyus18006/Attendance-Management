import { db } from '../database/db';
import { BackupData, Student, AttendanceRecord } from '../types';

export interface ImportAnalysis {
  isValid: boolean;
  error?: string;
  detectedStudents: number;
  detectedClasses: number;
  detectedAttendance: number;
  detectedHolidays: number;
  duplicateStudents: number;
  newStudents: number;
  appName?: string;
  data?: BackupData;
}

export class BackupService {
  // Export full backup as formatted JSON file download
  public static exportFullBackup(): void {
    const backup = db.exportBackup();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const nowStr = new Date().toISOString().split('T')[0];
    const fileName = `GHS_School_Backup_${nowStr}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export specific students subset as JSON
  public static exportStudentsJson(students: Student[], label: string): void {
    const payload = {
      exportType: 'STUDENTS_SUBSET',
      label,
      exportedAt: new Date().toISOString(),
      school: db.getSchoolSettings().name,
      studentsCount: students.length,
      students,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = `Students_${label.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export attendance subset as JSON
  public static exportAttendanceJson(records: AttendanceRecord[], label: string): void {
    const payload = {
      exportType: 'ATTENDANCE_SUBSET',
      label,
      exportedAt: new Date().toISOString(),
      school: db.getSchoolSettings().name,
      recordsCount: records.length,
      records,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = `Attendance_${label.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Analyze uploaded JSON before applying
  public static async analyzeJsonFile(file: File): Promise<ImportAnalysis> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        return {
          isValid: false,
          error: 'File does not contain valid JSON data structure.',
          detectedStudents: 0,
          detectedClasses: 0,
          detectedAttendance: 0,
          detectedHolidays: 0,
          duplicateStudents: 0,
          newStudents: 0,
        };
      }

      // Check if it's a full backup or students subset
      const studentsList: Student[] = Array.isArray(parsed.students) ? parsed.students : [];
      const classesList = Array.isArray(parsed.classes) ? parsed.classes : [];
      const attendanceList = Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : [];
      const holidaysList = Array.isArray(parsed.holidays) ? parsed.holidays : [];

      if (studentsList.length === 0 && classesList.length === 0 && attendanceList.length === 0) {
        return {
          isValid: false,
          error: 'No recognized school data (students, classes, or attendance) found in JSON.',
          detectedStudents: 0,
          detectedClasses: 0,
          detectedAttendance: 0,
          detectedHolidays: 0,
          duplicateStudents: 0,
          newStudents: 0,
        };
      }

      // Check for duplicates against existing DB
      const existingStudents = db.getStudents();
      let duplicates = 0;
      let newCount = 0;

      studentsList.forEach(s => {
        const isDup = existingStudents.some(
          ex =>
            ex.id === s.id ||
            (ex.classId === s.classId && ex.sectionId === s.sectionId && Number(ex.rollNo) === Number(s.rollNo))
        );
        if (isDup) duplicates++;
        else newCount++;
      });

      return {
        isValid: true,
        detectedStudents: studentsList.length,
        detectedClasses: classesList.length,
        detectedAttendance: attendanceList.length,
        detectedHolidays: holidaysList.length,
        duplicateStudents: duplicates,
        newStudents: newCount,
        appName: parsed.appName || parsed.schoolSettings?.name || 'School Backup',
        data: parsed as BackupData,
      };
    } catch (e: any) {
      return {
        isValid: false,
        error: `JSON Parsing Failed: ${e.message || 'Invalid format'}`,
        detectedStudents: 0,
        detectedClasses: 0,
        detectedAttendance: 0,
        detectedHolidays: 0,
        duplicateStudents: 0,
        newStudents: 0,
      };
    }
  }

  // Execute import with selected mode inside database transaction
  public static async executeImport(
    data: BackupData,
    mode: 'add_new' | 'update_matching' | 'overwrite_all'
  ) {
    return await db.runInTransaction(async () => {
      return db.importBackup(data, mode);
    });
  }
}
