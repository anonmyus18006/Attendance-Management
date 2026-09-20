import {
  SchoolSettings,
  AppSettings,
  Teacher,
  SchoolClass,
  Section,
  Student,
  CustomField,
  CustomFieldValue,
  AttendanceRecord,
  Holiday,
  GeneratedPdfHistory,
  BackupData,
  AcademicYear,
  TeacherAssignment,
  StudentEnrollment,
} from '../types';
import {
  DEFAULT_SCHOOL_SETTINGS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_CLASSES,
  DEFAULT_SECTIONS,
  DEFAULT_TEACHERS,
  DEFAULT_HOLIDAYS,
  DEFAULT_CUSTOM_FIELDS,
  DEFAULT_STUDENTS,
  DEFAULT_CUSTOM_FIELD_VALUES,
  DEFAULT_ACADEMIC_YEARS,
  DEFAULT_TEACHER_ASSIGNMENTS,
  DEFAULT_STUDENT_ENROLLMENTS,
  generateSeedAttendance,
} from './seed';

const STORAGE_KEY_PREFIX = 'ghs_school_offline_db_v1_';

export interface DatabaseState {
  schoolSettings: SchoolSettings;
  appSettings: AppSettings;
  teachers: Teacher[];
  classes: SchoolClass[];
  sections: Section[];
  students: Student[];
  customFields: CustomField[];
  customFieldValues: CustomFieldValue[];
  attendanceRecords: AttendanceRecord[];
  holidays: Holiday[];
  pdfHistory: GeneratedPdfHistory[];
  academicYears: AcademicYear[];
  teacherAssignments: TeacherAssignment[];
  studentEnrollments: StudentEnrollment[];
}

type Listener = () => void;

class OfflineDatabase {
  private state: DatabaseState;
  private listeners: Set<Listener> = new Set();
  private isInitialized = false;

  constructor() {
    this.state = {
      schoolSettings: { ...DEFAULT_SCHOOL_SETTINGS },
      appSettings: { ...DEFAULT_APP_SETTINGS },
      teachers: [...DEFAULT_TEACHERS],
      classes: [...DEFAULT_CLASSES],
      sections: [...DEFAULT_SECTIONS],
      students: [...DEFAULT_STUDENTS],
      customFields: [...DEFAULT_CUSTOM_FIELDS],
      customFieldValues: [...DEFAULT_CUSTOM_FIELD_VALUES],
      attendanceRecords: generateSeedAttendance(),
      holidays: [...DEFAULT_HOLIDAYS],
      pdfHistory: [],
      academicYears: [...DEFAULT_ACADEMIC_YEARS],
      teacherAssignments: [...DEFAULT_TEACHER_ASSIGNMENTS],
      studentEnrollments: [...DEFAULT_STUDENT_ENROLLMENTS],
    };
  }

  public init(): void {
    if (this.isInitialized) return;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}state`);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = {
          ...this.state,
          ...parsed,
        };
      } else {
        this.persist();
      }
    } catch (err) {
      console.warn('Failed to load database from localStorage, initializing fresh state', err);
      this.persist();
    }
    this.isInitialized = true;
    this.notify();
  }

  private persist(): void {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}state`, JSON.stringify(this.state));
    } catch (e) {
      console.error('Storage quota exceeded or error writing to local database', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error('Listener notification error', err);
      }
    });
  }

  // --- Transactions ---
  public async runInTransaction<T>(action: () => Promise<T> | T): Promise<T> {
    const backup = JSON.stringify(this.state);
    try {
      const result = await action();
      this.persist();
      this.notify();
      return result;
    } catch (err) {
      this.state = JSON.parse(backup);
      this.persist();
      this.notify();
      throw err;
    }
  }

  // --- School Settings ---
  public getSchoolSettings(): SchoolSettings {
    return { ...this.state.schoolSettings };
  }

  public updateSchoolSettings(settings: Partial<SchoolSettings>): void {
    this.state.schoolSettings = {
      ...this.state.schoolSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    this.notify();
  }

  // --- App Settings ---
  public getAppSettings(): AppSettings {
    return { ...this.state.appSettings };
  }

  public updateAppSettings(settings: Partial<AppSettings>): void {
    this.state.appSettings = {
      ...this.state.appSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    this.notify();
  }

  // --- Classes & Sections ---
  public getClasses(): SchoolClass[] {
    return [...this.state.classes].sort((a, b) => a.order - b.order);
  }

  public addClass(nameOrObj: string | { name: string; numericGrade?: number }, numericGrade?: number): SchoolClass {
    const rawName = typeof nameOrObj === 'string' ? nameOrObj : nameOrObj.name;
    const rawGrade = typeof nameOrObj === 'string' ? numericGrade : (nameOrObj.numericGrade ?? numericGrade);
    const trimmed = rawName.trim();
    if (!trimmed) throw new Error('Class name cannot be empty');
    const existing = this.state.classes.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) throw new Error(`Class "${trimmed}" already exists`);

    const newClass: SchoolClass = {
      id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
      numericGrade: rawGrade || parseInt(trimmed.replace(/\D/g, '')) || undefined,
      order: this.state.classes.length + 1,
    };
    this.state.classes.push(newClass);
    // Create default section 'A'
    this.addSection(newClass.id, 'A');
    this.persist();
    this.notify();
    return newClass;
  }

  public updateClass(id: string, name: string): void {
    const cls = this.state.classes.find(c => c.id === id);
    if (!cls) throw new Error('Class not found');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Class name cannot be empty');
    const existing = this.state.classes.find(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) throw new Error(`Class "${trimmed}" already exists`);
    cls.name = trimmed;
    this.persist();
    this.notify();
  }

  public deleteClass(id: string): void {
    const studentCount = this.state.students.filter(s => s.classId === id).length;
    if (studentCount > 0) {
      throw new Error(`Cannot delete class: ${studentCount} students are currently enrolled in it. Move or delete them first.`);
    }
    this.state.classes = this.state.classes.filter(c => c.id !== id);
    this.state.sections = this.state.sections.filter(s => s.classId !== id);
    this.state.teachers = this.state.teachers.filter(t => t.assignedClassId !== id);
    this.persist();
    this.notify();
  }

  public getSections(classId?: string): Section[] {
    if (classId) {
      return this.state.sections.filter(s => s.classId === classId);
    }
    return [...this.state.sections];
  }

  public addSection(classIdOrObj: string | { classId: string; name: string }, maybeName?: string): Section {
    const classId = typeof classIdOrObj === 'string' ? classIdOrObj : classIdOrObj.classId;
    const rawName = typeof classIdOrObj === 'string' ? (maybeName || '') : classIdOrObj.name;
    const trimmed = rawName.trim().toUpperCase();
    if (!trimmed) throw new Error('Section name cannot be empty');
    const existing = this.state.sections.find(
      s => s.classId === classId && s.name.toUpperCase() === trimmed
    );
    if (existing) throw new Error(`Section "${trimmed}" already exists for this class`);

    const newSection: Section = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      classId,
      name: trimmed,
    };
    this.state.sections.push(newSection);
    this.persist();
    this.notify();
    return newSection;
  }

  public renameSection(id: string, name: string): void {
    const sec = this.state.sections.find(s => s.id === id);
    if (!sec) throw new Error('Section not found');
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) throw new Error('Section name cannot be empty');
    const existing = this.state.sections.find(
      s => s.id !== id && s.classId === sec.classId && s.name.toUpperCase() === trimmed
    );
    if (existing) throw new Error(`Section "${trimmed}" already exists for this class`);
    sec.name = trimmed;
    this.persist();
    this.notify();
  }

  public deleteSection(id: string): void {
    const studentCount = this.state.students.filter(s => s.sectionId === id).length;
    if (studentCount > 0) {
      throw new Error(`Cannot delete section: ${studentCount} students belong to this section.`);
    }
    this.state.sections = this.state.sections.filter(s => s.id !== id);
    this.persist();
    this.notify();
  }

  // --- Teachers ---
  public getTeachers(): Teacher[] {
    return [...this.state.teachers];
  }

  public addTeacher(teacher: Omit<Teacher, 'id' | 'createdAt'>): Teacher {
    const newTeacher: Teacher = {
      ...teacher,
      id: `teacher-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.teachers.push(newTeacher);
    this.persist();
    this.notify();
    return newTeacher;
  }

  public updateTeacher(id: string, updates: Partial<Teacher>): void {
    const t = this.state.teachers.find(item => item.id === id);
    if (!t) throw new Error('Teacher not found');
    Object.assign(t, updates);
    this.persist();
    this.notify();
  }

  public deleteTeacher(id: string): void {
    this.state.teachers = this.state.teachers.filter(t => t.id !== id);
    this.persist();
    this.notify();
  }

  // --- Students with Duplicate Constraint Check ---
  public getStudents(classId?: string, sectionId?: string): Student[] {
    let list = [...this.state.students];
    if (classId) {
      list = list.filter(s => s.classId === classId);
    }
    if (sectionId) {
      list = list.filter(s => s.sectionId === sectionId);
    }
    return list.sort((a, b) => a.rollNo - b.rollNo);
  }

  public getStudentById(id: string): Student | undefined {
    return this.state.students.find(s => s.id === id);
  }

  public findDuplicateRollNo(
    classId: string,
    sectionId: string,
    rollNo: number,
    excludeStudentId?: string
  ): Student | undefined {
    return this.state.students.find(
      s =>
        s.classId === classId &&
        s.sectionId === sectionId &&
        Number(s.rollNo) === Number(rollNo) &&
        s.id !== excludeStudentId
    );
  }

  public getNextAvailableRollNo(classId: string, sectionId: string): number {
    const sectionStudents = this.getStudents(classId, sectionId);
    if (sectionStudents.length === 0) return 1;
    const maxRoll = Math.max(...sectionStudents.map(s => Number(s.rollNo) || 0));
    return maxRoll + 1;
  }

  public validateUniqueStudent(classId: string, sectionId: string, rollNo: number, excludeStudentId?: string): void {
    const duplicate = this.findDuplicateRollNo(classId, sectionId, rollNo, excludeStudentId);
    if (duplicate) {
      const cls = this.state.classes.find(c => c.id === classId)?.name || 'Class';
      const sec = this.state.sections.find(s => s.id === sectionId)?.name || 'Section';
      throw new Error(
        `DUPLICATE RECORD: Roll No. ${rollNo} already exists in ${cls} ${sec} (${duplicate.name}). A student identity must be unique within a class and section.`
      );
    }
  }

  public addStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Student {
    this.validateUniqueStudent(studentData.classId, studentData.sectionId, studentData.rollNo);

    const newStudent: Student = {
      ...studentData,
      id: `stu-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.students.push(newStudent);
    this.persist();
    this.notify();
    return newStudent;
  }

  public updateStudent(idOrStudent: string | Student, updates?: Partial<Student>): Student {
    const id = typeof idOrStudent === 'string' ? idOrStudent : idOrStudent.id;
    const student = this.state.students.find(s => s.id === id);
    if (!student) throw new Error('Student not found');

    const effectiveUpdates: Partial<Student> = typeof idOrStudent === 'string' ? (updates || {}) : (updates ? { ...idOrStudent, ...updates } : idOrStudent);

    const targetClassId = effectiveUpdates.classId ?? student.classId;
    const targetSectionId = effectiveUpdates.sectionId ?? student.sectionId;
    const targetRollNo = effectiveUpdates.rollNo ?? student.rollNo;

    if (
      targetClassId !== student.classId ||
      targetSectionId !== student.sectionId ||
      targetRollNo !== student.rollNo
    ) {
      this.validateUniqueStudent(targetClassId, targetSectionId, targetRollNo, id);
    }

    Object.assign(student, {
      ...effectiveUpdates,
      updatedAt: new Date().toISOString(),
    });

    this.persist();
    this.notify();
    return student;
  }

  public updateStudentField<K extends keyof Student>(id: string, field: K, value: Student[K]): void {
    const student = this.state.students.find(s => s.id === id);
    if (!student) throw new Error('Student not found');

    if (field === 'rollNo') {
      this.validateUniqueStudent(student.classId, student.sectionId, Number(value), id);
    }

    student[field] = value;
    student.updatedAt = new Date().toISOString();
    this.persist();
    this.notify();
  }

  public clearStudentFees(id: string): void {
    const student = this.state.students.find(s => s.id === id);
    if (!student) throw new Error('Student not found');
    student.feesPending = 0;
    student.updatedAt = new Date().toISOString();
    this.persist();
    this.notify();
  }

  public deleteStudent(id: string): void {
    this.state.students = this.state.students.filter(s => s.id !== id);
    this.state.customFieldValues = this.state.customFieldValues.filter(cfv => cfv.studentId !== id);
    this.state.attendanceRecords = this.state.attendanceRecords.filter(att => att.studentId !== id);
    this.persist();
    this.notify();
  }

  // --- Dynamic Custom Fields ---
  public getCustomFields(classId?: string): CustomField[] {
    let fields = [...this.state.customFields].filter(f => f.isActive);
    if (classId) {
      fields = fields.filter(
        f => f.scope === 'global' || f.targetClassId === classId
      );
    }
    return fields;
  }

  public getAllCustomFields(): CustomField[] {
    return [...this.state.customFields];
  }

  public addCustomField(field: Omit<CustomField, 'id' | 'createdAt'>): CustomField {
    const newField: CustomField = {
      ...field,
      id: `cf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.customFields.push(newField);
    this.persist();
    this.notify();
    return newField;
  }

  public updateCustomField(id: string, updates: Partial<CustomField>): void {
    const field = this.state.customFields.find(f => f.id === id);
    if (!field) throw new Error('Custom field not found');
    Object.assign(field, updates);
    this.persist();
    this.notify();
  }

  public deleteCustomField(id: string): void {
    this.state.customFields = this.state.customFields.filter(f => f.id !== id);
    this.state.customFieldValues = this.state.customFieldValues.filter(v => v.fieldId !== id);
    this.persist();
    this.notify();
  }

  public getApplicableCustomFieldsForStudent(student: Student): CustomField[] {
    return this.state.customFields.filter(f => {
      if (!f.isActive) return false;
      switch (f.scope) {
        case 'global':
          return true;
        case 'specific_class':
        case 'specific_class_all_sections':
          return f.targetClassId === student.classId;
        case 'specific_section':
          return f.targetClassId === student.classId && f.targetSectionId === student.sectionId;
        case 'specific_student':
          return f.targetStudentId === student.id;
        default:
          return false;
      }
    });
  }

  public getCustomFieldValue(studentId: string, fieldId: string): string {
    const record = this.state.customFieldValues.find(
      v => v.studentId === studentId && v.fieldId === fieldId
    );
    return record?.value ?? '';
  }

  public setCustomFieldValue(studentId: string, fieldId: string, value: string): void {
    const existingIndex = this.state.customFieldValues.findIndex(
      v => v.studentId === studentId && v.fieldId === fieldId
    );
    if (existingIndex >= 0) {
      this.state.customFieldValues[existingIndex].value = value;
      this.state.customFieldValues[existingIndex].updatedAt = new Date().toISOString();
    } else {
      this.state.customFieldValues.push({
        id: `cfv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId,
        fieldId,
        value,
        updatedAt: new Date().toISOString(),
      });
    }
    this.persist();
    this.notify();
  }

  // --- Holidays ---
  public getHolidays(): Holiday[] {
    return [...this.state.holidays].sort((a, b) => a.date.localeCompare(b.date));
  }

  public isDateHoliday(dateStr: string): Holiday | undefined {
    // Check direct date match
    const direct = this.state.holidays.find(h => h.date === dateStr);
    if (direct) return direct;

    // Check recurring holiday matching MM-DD
    const monthDay = dateStr.slice(5); // "MM-DD"
    return this.state.holidays.find(h => h.isRecurring && h.date.slice(5) === monthDay);
  }

  public isDateSunday(dateStr: string): boolean {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getDay() === 0;
  }

  public isNonWorkingDay(dateStr: string): boolean {
    return this.isDateSunday(dateStr) || !!this.isDateHoliday(dateStr);
  }

  public addHoliday(holiday: Omit<Holiday, 'id' | 'createdAt'>): Holiday {
    const existing = this.state.holidays.find(h => h.date === holiday.date);
    if (existing) throw new Error(`A holiday is already registered on ${holiday.date} (${existing.name})`);

    const newHoliday: Holiday = {
      ...holiday,
      id: `hol-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.holidays.push(newHoliday);
    this.persist();
    this.notify();
    return newHoliday;
  }

  public updateHoliday(id: string, updates: Partial<Holiday>): void {
    const hol = this.state.holidays.find(h => h.id === id);
    if (!hol) throw new Error('Holiday not found');
    Object.assign(hol, updates);
    this.persist();
    this.notify();
  }

  public deleteHoliday(id: string): void {
    this.state.holidays = this.state.holidays.filter(h => h.id !== id);
    this.persist();
    this.notify();
  }

  // --- Attendance Records ---
  public getAttendanceRecords(filter?: {
    date?: string;
    classId?: string;
    sectionId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
  }): AttendanceRecord[] {
    let list = [...this.state.attendanceRecords];
    if (!filter) return list;

    if (filter.date) {
      list = list.filter(r => r.date === filter.date);
    }
    if (filter.classId) {
      list = list.filter(r => r.classId === filter.classId);
    }
    if (filter.sectionId) {
      list = list.filter(r => r.sectionId === filter.sectionId);
    }
    if (filter.studentId) {
      list = list.filter(r => r.studentId === filter.studentId);
    }
    if (filter.startDate) {
      list = list.filter(r => r.date >= filter.startDate!);
    }
    if (filter.endDate) {
      list = list.filter(r => r.date <= filter.endDate!);
    }
    return list;
  }

  public recordAttendance(
    studentId: string,
    date: string,
    classId: string,
    sectionId: string,
    status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY',
    teacherId?: string,
    remark?: string
  ): AttendanceRecord {
    const existingIndex = this.state.attendanceRecords.findIndex(
      r => r.studentId === studentId && r.date === date
    );

    if (existingIndex >= 0) {
      const record = this.state.attendanceRecords[existingIndex];
      record.status = status;
      record.classId = classId;
      record.sectionId = sectionId;
      if (teacherId) record.teacherId = teacherId;
      if (remark !== undefined) record.remark = remark;
      record.timestamp = new Date().toISOString();
      this.persist();
      this.notify();
      return record;
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      studentId,
      date,
      classId,
      sectionId,
      status,
      teacherId,
      remark,
      timestamp: new Date().toISOString(),
    };
    this.state.attendanceRecords.push(newRecord);
    this.persist();
    this.notify();
    return newRecord;
  }

  // --- PDF History ---
  public getPdfHistory(): GeneratedPdfHistory[] {
    return [...this.state.pdfHistory].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  public addPdfHistory(item: Omit<GeneratedPdfHistory, 'id' | 'generatedAt'>): void {
    const entry: GeneratedPdfHistory = {
      ...item,
      id: `pdf-${Date.now()}`,
      generatedAt: new Date().toISOString(),
    };
    this.state.pdfHistory.unshift(entry);
    if (this.state.pdfHistory.length > 50) {
      this.state.pdfHistory.pop();
    }
    this.persist();
    this.notify();
  }

  public deletePdfHistory(id: string): void {
    this.state.pdfHistory = this.state.pdfHistory.filter(p => p.id !== id);
    this.persist();
    this.notify();
  }

  public clearPdfHistory(): void {
    this.state.pdfHistory = [];
    this.persist();
    this.notify();
  }

  public resetToSeedData(): void {
    this.resetAllData();
  }

  // --- Database Stats ---
  public getStats() {
    return {
      classesCount: this.state.classes.length,
      sectionsCount: this.state.sections.length,
      teachersCount: this.state.teachers.length,
      studentsCount: this.state.students.length,
      attendanceCount: this.state.attendanceRecords.length,
      holidaysCount: this.state.holidays.length,
      customFieldsCount: this.state.customFields.length,
      pdfCount: this.state.pdfHistory.length,
    };
  }

  // --- Complete App Backup & Restore ---
  public exportBackup(): BackupData {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      appName: this.state.schoolSettings.name,
      schoolSettings: this.getSchoolSettings(),
      appSettings: this.getAppSettings(),
      teachers: this.getTeachers(),
      classes: this.getClasses(),
      sections: this.getSections(),
      students: this.getStudents(),
      customFields: this.getAllCustomFields(),
      customFieldValues: [...this.state.customFieldValues],
      attendanceRecords: [...this.state.attendanceRecords],
      holidays: this.getHolidays(),
      pdfHistory: this.getPdfHistory(),
    };
  }

  public importBackup(
    data: BackupData,
    mode: 'add_new' | 'update_matching' | 'overwrite_all'
  ): { added: number; updated: number; skipped: number } {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON file format. Expecting valid school backup data.');
    }
    if (!data.schoolSettings || !Array.isArray(data.students)) {
      throw new Error('Corrupt or incompatible JSON structure: missing school settings or students list.');
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    if (mode === 'overwrite_all') {
      this.state = {
        schoolSettings: data.schoolSettings,
        appSettings: data.appSettings || this.state.appSettings,
        teachers: data.teachers || [],
        classes: data.classes || [],
        sections: data.sections || [],
        students: data.students || [],
        customFields: data.customFields || [],
        customFieldValues: data.customFieldValues || [],
        attendanceRecords: data.attendanceRecords || [],
        holidays: data.holidays || [],
        pdfHistory: data.pdfHistory || [],
        academicYears: (data as any).academicYears || this.state.academicYears,
        teacherAssignments: (data as any).teacherAssignments || this.state.teacherAssignments,
        studentEnrollments: (data as any).studentEnrollments || this.state.studentEnrollments,
      };
      this.persist();
      this.notify();
      return { added: data.students.length, updated: 0, skipped: 0 };
    }

    // Merge mode
    if (data.classes) {
      data.classes.forEach(c => {
        if (!this.state.classes.some(existing => existing.id === c.id || existing.name === c.name)) {
          this.state.classes.push(c);
        }
      });
    }

    if (data.sections) {
      data.sections.forEach(s => {
        if (!this.state.sections.some(existing => existing.id === s.id)) {
          this.state.sections.push(s);
        }
      });
    }

    if (data.students) {
      data.students.forEach(importedStudent => {
        const match = this.state.students.find(
          s =>
            s.id === importedStudent.id ||
            (s.classId === importedStudent.classId &&
              s.sectionId === importedStudent.sectionId &&
              Number(s.rollNo) === Number(importedStudent.rollNo))
        );

        if (match) {
          if (mode === 'update_matching') {
            Object.assign(match, importedStudent);
            updated++;
          } else {
            skipped++;
          }
        } else {
          this.state.students.push(importedStudent);
          added++;
        }
      });
    }

    if (data.attendanceRecords) {
      data.attendanceRecords.forEach(record => {
        const existing = this.state.attendanceRecords.find(
          r => r.studentId === record.studentId && r.date === record.date
        );
        if (existing) {
          if (mode === 'update_matching') {
            Object.assign(existing, record);
          }
        } else {
          this.state.attendanceRecords.push(record);
        }
      });
    }

    this.persist();
    this.notify();
    return { added, updated, skipped };
  }

  public markAttendance(params: {
    studentId: string;
    date: string;
    classId: string;
    sectionId: string;
    status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';
    teacherId?: string;
    remark?: string;
  }): AttendanceRecord {
    return this.recordAttendance(
      params.studentId,
      params.date,
      params.classId,
      params.sectionId,
      params.status,
      params.teacherId,
      params.remark
    );
  }

  // --- Academic Years ---
  public getAcademicYears(): AcademicYear[] {
    return this.state.academicYears || [];
  }

  public addAcademicYear(data: Omit<AcademicYear, 'id' | 'createdAt'>): AcademicYear {
    const newYear: AcademicYear = {
      ...data,
      id: `ay-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    if (newYear.isCurrent) {
      this.state.academicYears.forEach(y => (y.isCurrent = false));
      this.state.appSettings.academicYear = newYear.name;
    }
    this.state.academicYears.push(newYear);
    this.persist();
    this.notify();
    return newYear;
  }

  public setActiveAcademicYear(id: string): void {
    let activeName = '';
    this.state.academicYears.forEach(y => {
      if (y.id === id) {
        y.isCurrent = true;
        activeName = y.name;
      } else {
        y.isCurrent = false;
      }
    });
    if (activeName) {
      this.state.appSettings.academicYear = activeName;
    }
    this.persist();
    this.notify();
  }

  // --- Relational Collections ---
  public getTeacherAssignments(): TeacherAssignment[] {
    return this.state.teacherAssignments || [];
  }

  public getStudentEnrollments(): StudentEnrollment[] {
    return this.state.studentEnrollments || [];
  }

  public getCustomFieldValues(): CustomFieldValue[] {
    return this.state.customFieldValues || [];
  }

  public replaceAllData(backup: BackupData): void {
    this.state = {
      schoolSettings: backup.schoolSettings,
      appSettings: backup.appSettings || this.state.appSettings,
      teachers: backup.teachers || [],
      classes: backup.classes || [],
      sections: backup.sections || [],
      students: backup.students || [],
      customFields: backup.customFields || [],
      customFieldValues: backup.customFieldValues || [],
      attendanceRecords: backup.attendanceRecords || [],
      holidays: backup.holidays || [],
      pdfHistory: backup.pdfHistory || [],
      academicYears: backup.academicYears || [...DEFAULT_ACADEMIC_YEARS],
      teacherAssignments: backup.teacherAssignments || [...DEFAULT_TEACHER_ASSIGNMENTS],
      studentEnrollments: backup.studentEnrollments || [...DEFAULT_STUDENT_ENROLLMENTS],
    };
    this.persist();
    this.notify();
  }

  public resetAllData(): void {
    this.state = {
      schoolSettings: { ...DEFAULT_SCHOOL_SETTINGS },
      appSettings: { ...DEFAULT_APP_SETTINGS },
      teachers: [...DEFAULT_TEACHERS],
      classes: [...DEFAULT_CLASSES],
      sections: [...DEFAULT_SECTIONS],
      students: [...DEFAULT_STUDENTS],
      customFields: [...DEFAULT_CUSTOM_FIELDS],
      customFieldValues: [...DEFAULT_CUSTOM_FIELD_VALUES],
      attendanceRecords: generateSeedAttendance(),
      holidays: [...DEFAULT_HOLIDAYS],
      pdfHistory: [],
      academicYears: [...DEFAULT_ACADEMIC_YEARS],
      teacherAssignments: [...DEFAULT_TEACHER_ASSIGNMENTS],
      studentEnrollments: [...DEFAULT_STUDENT_ENROLLMENTS],
    };
    this.persist();
    this.notify();
  }
}

export const db = new OfflineDatabase();
// Auto-initialize
db.init();
