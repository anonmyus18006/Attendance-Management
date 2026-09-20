/**
 * Offline JSON Backup & Transactional Import Engine
 * Validates, previews, safely maps IDs across relationships, and executes in an SQLite transaction.
 */

import { BackupData, Student, AttendanceRecord, SchoolClass, Section } from '../types';
import { sqlite } from '../database/sqlite';
import { db } from '../database/db';

export interface ImportPreviewAnalysis {
  isValid: boolean;
  errors: string[];
  version: number;
  appName: string;
  studentCount: number;
  attendanceCount: number;
  classCount: number;
  sectionCount: number;
  teacherCount: number;
  customFieldCount: number;
  newStudentsCount: number;
  conflictingStudentsCount: number;
  data: BackupData | null;
}

export class BackupService {
  /**
   * Generates a complete standalone JSON backup from the database
   */
  public static async generateBackup(): Promise<string> {
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appName: 'GHS Fatehpuria NK - SMA',
      schoolSettings: db.getSchoolSettings(),
      appSettings: db.getAppSettings(),
      academicYears: db.getAcademicYears(),
      teachers: db.getTeachers(),
      teacherAssignments: db.getTeacherAssignments(),
      classes: db.getClasses(),
      sections: db.getSections(),
      students: db.getStudents(),
      studentEnrollments: db.getStudentEnrollments(),
      customFields: db.getCustomFields(),
      customFieldValues: db.getCustomFieldValues(),
      attendanceRecords: db.getAttendanceRecords(),
      holidays: db.getHolidays(),
      pdfHistory: db.getPdfHistory(),
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Parses and rigorously inspects an uploaded JSON backup file
   */
  public static analyzeBackupJson(jsonString: string): ImportPreviewAnalysis {
    const errors: string[] = [];

    try {
      const data = JSON.parse(jsonString) as BackupData;

      if (!data || typeof data !== 'object') {
        return {
          isValid: false,
          errors: ['Invalid JSON format: root is not an object.'],
          version: 0,
          appName: '',
          studentCount: 0,
          attendanceCount: 0,
          classCount: 0,
          sectionCount: 0,
          teacherCount: 0,
          customFieldCount: 0,
          newStudentsCount: 0,
          conflictingStudentsCount: 0,
          data: null,
        };
      }

      if (!Array.isArray(data.students)) {
        errors.push('Missing or invalid "students" array in backup.');
      }
      if (!Array.isArray(data.classes)) {
        errors.push('Missing or invalid "classes" array in backup.');
      }
      if (!Array.isArray(data.sections)) {
        errors.push('Missing or invalid "sections" array in backup.');
      }

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          version: data.version || 0,
          appName: data.appName || 'Unknown',
          studentCount: data.students?.length || 0,
          attendanceCount: data.attendanceRecords?.length || 0,
          classCount: data.classes?.length || 0,
          sectionCount: data.sections?.length || 0,
          teacherCount: data.teachers?.length || 0,
          customFieldCount: data.customFields?.length || 0,
          newStudentsCount: 0,
          conflictingStudentsCount: 0,
          data: null,
        };
      }

      // Check conflicts against existing students (Class + Section + Roll No match)
      const existingStudents = db.getStudents();
      let conflicts = 0;
      let newCount = 0;

      for (const s of data.students) {
        const isConflict = existingStudents.some(
          ex => ex.classId === s.classId && ex.sectionId === s.sectionId && Number(ex.rollNo) === Number(s.rollNo)
        );
        if (isConflict) conflicts++;
        else newCount++;
      }

      return {
        isValid: true,
        errors: [],
        version: data.version || 1,
        appName: data.appName || 'GHS Fatehpuria NK - SMA',
        studentCount: data.students.length,
        attendanceCount: data.attendanceRecords?.length || 0,
        classCount: data.classes.length,
        sectionCount: data.sections.length,
        teacherCount: data.teachers?.length || 0,
        customFieldCount: data.customFields?.length || 0,
        newStudentsCount: newCount,
        conflictingStudentsCount: conflicts,
        data,
      };
    } catch (e: any) {
      return {
        isValid: false,
        errors: [`Syntax error parsing backup file: ${e.message}`],
        version: 0,
        appName: '',
        studentCount: 0,
        attendanceCount: 0,
        classCount: 0,
        sectionCount: 0,
        teacherCount: 0,
        customFieldCount: 0,
        newStudentsCount: 0,
        conflictingStudentsCount: 0,
        data: null,
      };
    }
  }

  /**
   * Executes transactional import with ID relationship mapping and rollback on error
   */
  public static async executeImport(
    data: BackupData,
    mode: 'add_new' | 'update_matching' | 'overwrite_all'
  ): Promise<{ added: number; updated: number; skipped: number }> {
    return await sqlite.transaction(async () => {
      // 1. If overwrite_all, replace everything
      if (mode === 'overwrite_all') {
        db.replaceAllData(data);
        return {
          added: data.students.length,
          updated: 0,
          skipped: 0,
        };
      }

      // 2. Safe mapping for add_new / update_matching
      let added = 0;
      let updated = 0;
      let skipped = 0;

      // Class ID mapping: backupClassId -> localClassId
      const localClasses = db.getClasses();
      const classIdMap = new Map<string, string>();
      for (const bc of data.classes) {
        const existing = localClasses.find(lc => lc.name.toLowerCase() === bc.name.toLowerCase());
        if (existing) {
          classIdMap.set(bc.id, existing.id);
        } else {
          db.addClass({ name: bc.name, numericGrade: bc.numericGrade });
          const created = db.getClasses().find(lc => lc.name.toLowerCase() === bc.name.toLowerCase());
          if (created) classIdMap.set(bc.id, created.id);
        }
      }

      // Section ID mapping: backupSectionId -> localSectionId
      const localSections = db.getSections();
      const sectionIdMap = new Map<string, string>();
      for (const bs of data.sections) {
        const targetClassId = classIdMap.get(bs.classId) || bs.classId;
        const existing = localSections.find(
          ls => ls.classId === targetClassId && ls.name.toLowerCase() === bs.name.toLowerCase()
        );
        if (existing) {
          sectionIdMap.set(bs.id, existing.id);
        } else {
          db.addSection({ classId: targetClassId, name: bs.name });
          const created = db.getSections().find(
            ls => ls.classId === targetClassId && ls.name.toLowerCase() === bs.name.toLowerCase()
          );
          if (created) sectionIdMap.set(bs.id, created.id);
        }
      }

      // Student ID mapping: backupStudentId -> localStudentId
      const studentIdMap = new Map<string, string>();
      const existingStudents = db.getStudents();

      for (const bs of data.students) {
        const targetClassId = classIdMap.get(bs.classId) || bs.classId;
        const targetSectionId = sectionIdMap.get(bs.sectionId) || bs.sectionId;

        const matching = existingStudents.find(
          es =>
            es.classId === targetClassId &&
            es.sectionId === targetSectionId &&
            Number(es.rollNo) === Number(bs.rollNo)
        );

        if (matching) {
          studentIdMap.set(bs.id, matching.id);
          if (mode === 'update_matching') {
            db.updateStudent({
              ...matching,
              name: bs.name,
              fatherName: bs.fatherName,
              motherName: bs.motherName,
              dob: bs.dob,
              address: bs.address,
              examRollNo: bs.examRollNo,
              feesPending: bs.feesPending,
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Add new student
          const newStudent = db.addStudent({
            rollNo: Number(bs.rollNo),
            name: bs.name,
            classId: targetClassId,
            sectionId: targetSectionId,
            fatherName: bs.fatherName,
            motherName: bs.motherName,
            dob: bs.dob,
            address: bs.address,
            examRollNo: bs.examRollNo,
            feesPending: bs.feesPending || 0,
          });
          studentIdMap.set(bs.id, newStudent.id);
          added++;
        }
      }

      // Attendance mapping
      if (Array.isArray(data.attendanceRecords)) {
        for (const ar of data.attendanceRecords) {
          const localStudentId = studentIdMap.get(ar.studentId);
          if (localStudentId) {
            const targetClassId = classIdMap.get(ar.classId) || ar.classId;
            const targetSectionId = sectionIdMap.get(ar.sectionId) || ar.sectionId;

            db.markAttendance({
              studentId: localStudentId,
              date: ar.date,
              classId: targetClassId,
              sectionId: targetSectionId,
              status: ar.status,
              teacherId: ar.teacherId,
              remark: ar.remark,
            });
          }
        }
      }

      return { added, updated, skipped };
    });
  }
}
