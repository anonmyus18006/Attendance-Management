import {
  SchoolSettings,
  AppSettings,
  Teacher,
  SchoolClass,
  Section,
  Student,
  CustomField,
  CustomFieldValue,
  Holiday,
  AttendanceRecord,
  AcademicYear,
  TeacherAssignment,
  StudentEnrollment,
} from '../types';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  id: 'school-main',
  name: 'GHS Fatehpuria NK School',
  code: '3005',
  address: 'Kharia-Sirsa Road, District Sirsa, Haryana',
  pin: '125055',
  tehsil: 'Rania',
  district: 'Sirsa',
  state: 'Haryana',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'app-settings-main',
  academicYear: '2026-2027',
  primaryTimezone: 'Asia/Kolkata',
  isAppLocked: false,
  isStudentEditLocked: false,
  appLockPasswordHash: '',
  editPasswordHash: '',
  notificationReminderEnabled: true,
  notificationReminderTime: '08:00',
  skipSundayReminder: true,
  skipHolidayReminder: true,
  defaultPdfFields: [
    'rollNo',
    'name',
    'classSection',
    'fatherName',
    'motherName',
    'dob',
    'attendancePercentage',
    'feesPending',
  ],
  pdfOrientation: 'auto',
  showSchoolLogoInPdf: true,
  showSchoolCodeInPdf: true,
  showGeneratedDateTimeInPdf: true,
  showPageNumbersInPdf: true,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_CLASSES: SchoolClass[] = [
  { id: 'class-10', name: '10th', numericGrade: 10, order: 1 },
  { id: 'class-9', name: '9th', numericGrade: 9, order: 2 },
  { id: 'class-8', name: '8th', numericGrade: 8, order: 3 },
  { id: 'class-7', name: '7th', numericGrade: 7, order: 4 },
  { id: 'class-6', name: '6th', numericGrade: 6, order: 5 },
];

export const DEFAULT_SECTIONS: Section[] = [
  { id: 'sec-10-a', classId: 'class-10', name: 'A' },
  { id: 'sec-10-b', classId: 'class-10', name: 'B' },
  { id: 'sec-9-a', classId: 'class-9', name: 'A' },
  { id: 'sec-9-b', classId: 'class-9', name: 'B' },
  { id: 'sec-8-a', classId: 'class-8', name: 'A' },
];

export const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: 'teacher-1',
    name: 'VINOD KUMAR',
    employeeCode: 'T-1001',
    phone: '9812345678',
    assignedClassId: 'class-10',
    assignedSectionId: 'sec-10-a',
    notificationEnabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'teacher-2',
    name: 'MEENA RANI',
    employeeCode: 'T-1002',
    phone: '9876543210',
    assignedClassId: 'class-9',
    assignedSectionId: 'sec-9-a',
    notificationEnabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'teacher-3',
    name: 'RAJESH SAINI',
    employeeCode: 'T-1003',
    phone: '9416012345',
    assignedClassId: 'class-10',
    assignedSectionId: 'sec-10-b',
    notificationEnabled: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_HOLIDAYS: Holiday[] = [
  {
    id: 'hol-1',
    date: '2026-08-15',
    name: 'Independence Day',
    reason: 'National Holiday',
    isRecurring: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hol-2',
    date: '2026-10-02',
    name: 'Gandhi Jayanti',
    reason: 'National Holiday',
    isRecurring: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hol-3',
    date: '2026-11-01',
    name: 'Haryana Day',
    reason: 'State Holiday',
    isRecurring: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hol-4',
    date: '2026-11-14',
    name: 'Diwali',
    reason: 'Festival Holiday',
    isRecurring: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hol-5',
    date: '2026-12-25',
    name: 'Christmas',
    reason: 'Winter Holiday',
    isRecurring: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'hol-6',
    date: '2026-01-26',
    name: 'Republic Day',
    reason: 'National Holiday',
    isRecurring: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_CUSTOM_FIELDS: CustomField[] = [
  {
    id: 'cf-1',
    name: 'Aadhaar Last 4',
    description: 'Last 4 digits of Aadhaar Card',
    type: 'number',
    scope: 'global',
    isRequired: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf-2',
    name: 'Emergency Contact',
    description: 'Alternate emergency telephone number',
    type: 'text',
    scope: 'global',
    isRequired: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf-3',
    name: 'Board Roll Number',
    description: 'HBSE 10th Board Examination Roll No.',
    type: 'text',
    scope: 'specific_class',
    targetClassId: 'class-10',
    isRequired: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cf-4',
    name: 'Blood Group',
    description: 'Student medical blood group',
    type: 'dropdown',
    scope: 'global',
    isRequired: false,
    isActive: true,
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_STUDENTS: Student[] = [
  {
    id: 'stu-10a-1',
    rollNo: 1,
    name: 'Aarav Sharma',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Rajesh Sharma',
    motherName: 'Sunita Sharma',
    dob: '2010-04-12',
    address: 'VPO Fatehpuria Niazmuddin, Sirsa',
    examRollNo: 'EX-10001',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-2',
    rollNo: 2,
    name: 'Ananya Verma',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Satish Verma',
    motherName: 'Kavita Verma',
    dob: '2010-07-25',
    address: 'Kharia Road, Sirsa',
    examRollNo: 'EX-10002',
    feesPending: 1200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-3',
    rollNo: 3,
    name: 'Gurpreet Singh',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Harbhajan Singh',
    motherName: 'Jaswinder Kaur',
    dob: '2010-01-15',
    address: 'Near Gurudwara Sahib, Fatehpuria',
    examRollNo: 'EX-10003',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-4',
    rollNo: 4,
    name: 'Khushi Rani',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Manoj Kumar',
    motherName: 'Saroj Devi',
    dob: '2010-09-08',
    address: 'Main Market, Rania Road, Sirsa',
    examRollNo: 'EX-10004',
    feesPending: 500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-5',
    rollNo: 5,
    name: 'Manish Saini',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Rameshwar Saini',
    motherName: 'Kamla Devi',
    dob: '2010-03-30',
    address: 'Ward No 4, Fatehpuria',
    examRollNo: 'EX-10005',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-6',
    rollNo: 6,
    name: 'Navjot Kaur',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Baldev Singh',
    motherName: 'Paramjeet Kaur',
    dob: '2010-11-19',
    address: 'VPO Fatehpuria, District Sirsa',
    examRollNo: 'EX-10006',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-7',
    rollNo: 7,
    name: 'Pankaj Bishnoi',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Ram Kumar Bishnoi',
    motherName: 'Santosh Bishnoi',
    dob: '2010-06-14',
    address: 'Bishnoi Dhani, Kharia Road',
    examRollNo: 'EX-10007',
    feesPending: 800,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-8',
    rollNo: 8,
    name: 'Pooja Devi',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Dharampal',
    motherName: 'Urmila Devi',
    dob: '2010-02-22',
    address: 'Street No 2, Fatehpuria',
    examRollNo: 'EX-10008',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-9',
    rollNo: 9,
    name: 'Rahul Kumar',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Krishan Kumar',
    motherName: 'Geeta Rani',
    dob: '2010-08-11',
    address: 'Near Old Bus Stand, Fatehpuria',
    examRollNo: 'EX-10009',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10a-10',
    rollNo: 10,
    name: 'Simranjeet Singh',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    fatherName: 'Karamjeet Singh',
    motherName: 'Sukhwinder Kaur',
    dob: '2010-05-04',
    address: 'VPO Fatehpuria NK, Sirsa',
    examRollNo: 'EX-10010',
    feesPending: 1500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // 9th A students
  {
    id: 'stu-9a-1',
    rollNo: 1,
    name: 'Deepak Kamboj',
    classId: 'class-9',
    sectionId: 'sec-9-a',
    fatherName: 'Subhash Chand',
    motherName: 'Vimla Rani',
    dob: '2011-03-12',
    address: 'Dhani Kamboj, Sirsa',
    examRollNo: 'EX-90001',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-9a-2',
    rollNo: 2,
    name: 'Harpreet Kaur',
    classId: 'class-9',
    sectionId: 'sec-9-a',
    fatherName: 'Jagjit Singh',
    motherName: 'Amritpal Kaur',
    dob: '2011-06-20',
    address: 'VPO Fatehpuria, Sirsa',
    examRollNo: 'EX-90002',
    feesPending: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-9a-3',
    rollNo: 3,
    name: 'Kunal Soni',
    classId: 'class-9',
    sectionId: 'sec-9-a',
    fatherName: 'Mohinder Soni',
    motherName: 'Rekha Soni',
    dob: '2011-09-14',
    address: 'Main Bazaar, Rania',
    examRollNo: 'EX-90003',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-9a-4',
    rollNo: 4,
    name: 'Ritu Rani',
    classId: 'class-9',
    sectionId: 'sec-9-a',
    fatherName: 'Surender Singh',
    motherName: 'Krishna Devi',
    dob: '2011-12-05',
    address: 'Near Canal Colony, Kharia',
    examRollNo: 'EX-90004',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-9a-5',
    rollNo: 5,
    name: 'Vikas Punia',
    classId: 'class-9',
    sectionId: 'sec-9-a',
    fatherName: 'Sohan Lal Punia',
    motherName: 'Anita Punia',
    dob: '2011-02-18',
    address: 'VPO Fatehpuria, District Sirsa',
    examRollNo: 'EX-90005',
    feesPending: 600,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // 10th B students
  {
    id: 'stu-10b-1',
    rollNo: 1,
    name: 'Amit Kumar',
    classId: 'class-10',
    sectionId: 'sec-10-b',
    fatherName: 'Rajender Kumar',
    motherName: 'Shakuntla Devi',
    dob: '2010-05-18',
    address: 'Fatehpuria Niazmuddin',
    examRollNo: 'EX-10021',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10b-2',
    rollNo: 2,
    name: 'Bhawna Rani',
    classId: 'class-10',
    sectionId: 'sec-10-b',
    fatherName: 'Om Prakash',
    motherName: 'Sushila Devi',
    dob: '2010-10-11',
    address: 'Kharia Road, Sirsa',
    examRollNo: 'EX-10022',
    feesPending: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'stu-10b-3',
    rollNo: 3,
    name: 'Chandan Lal',
    classId: 'class-10',
    sectionId: 'sec-10-b',
    fatherName: 'Nand Lal',
    motherName: 'Kamlesh Rani',
    dob: '2010-08-29',
    address: 'Near Hospital, Rania',
    examRollNo: 'EX-10023',
    feesPending: 400,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_CUSTOM_FIELD_VALUES: CustomFieldValue[] = [
  {
    id: 'cfv-1',
    studentId: 'stu-10a-1',
    fieldId: 'cf-1',
    value: '4921',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cfv-2',
    studentId: 'stu-10a-1',
    fieldId: 'cf-3',
    value: 'HB-102941',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cfv-3',
    studentId: 'stu-10a-1',
    fieldId: 'cf-4',
    value: 'B+',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cfv-4',
    studentId: 'stu-10a-2',
    fieldId: 'cf-1',
    value: '8812',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cfv-5',
    studentId: 'stu-10a-2',
    fieldId: 'cf-4',
    value: 'O+',
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay-2026-2027',
    name: '2026-2027',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    isCurrent: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ay-2025-2026',
    name: '2025-2026',
    startDate: '2025-04-01',
    endDate: '2026-03-31',
    isCurrent: false,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  {
    id: 'ta-1',
    teacherId: 'teacher-1',
    academicYearId: 'ay-2026-2027',
    classId: 'class-10',
    sectionId: 'sec-10-a',
    isPrimary: true,
    assignedAt: new Date().toISOString(),
  },
  {
    id: 'ta-2',
    teacherId: 'teacher-2',
    academicYearId: 'ay-2026-2027',
    classId: 'class-9',
    sectionId: 'sec-9-a',
    isPrimary: true,
    assignedAt: new Date().toISOString(),
  },
  {
    id: 'ta-3',
    teacherId: 'teacher-3',
    academicYearId: 'ay-2026-2027',
    classId: 'class-10',
    sectionId: 'sec-10-b',
    isPrimary: true,
    assignedAt: new Date().toISOString(),
  },
];

export function generateSeedEnrollments(): StudentEnrollment[] {
  return DEFAULT_STUDENTS.map((s, idx) => ({
    id: `enr-${s.id}-2026`,
    studentId: s.id,
    academicYearId: 'ay-2026-2027',
    classId: s.classId,
    sectionId: s.sectionId,
    rollNo: s.rollNo,
    status: 'active' as const,
    enrolledAt: new Date().toISOString(),
  }));
}

export const DEFAULT_STUDENT_ENROLLMENTS: StudentEnrollment[] = generateSeedEnrollments();

// Generate sample attendance records for recent working school days for 10th A and 9th A
export function generateSeedAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  // Create records for the past 14 days (skipping Sundays)
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay(); // 0 is Sunday
    if (dayOfWeek === 0) continue; // Skip Sunday
    
    const dateStr = d.toISOString().split('T')[0];
    
    // 10th A students
    DEFAULT_STUDENTS.filter(s => s.classId === 'class-10' && s.sectionId === 'sec-10-a').forEach((student, index) => {
      let status: 'PRESENT' | 'ABSENT' | 'LEAVE' = 'PRESENT';
      if (index === 1 && i % 3 === 0) status = 'ABSENT';
      else if (index === 3 && i === 2) status = 'LEAVE';
      else if (index === 6 && i % 4 === 0) status = 'ABSENT';
      else if (index === 9 && i === 5) status = 'LEAVE';
      
      records.push({
        id: `att-10a-${student.id}-${dateStr}`,
        studentId: student.id,
        date: dateStr,
        classId: 'class-10',
        sectionId: 'sec-10-a',
        status,
        teacherId: 'teacher-1',
        timestamp: d.toISOString(),
      });
    });

    // 9th A students
    DEFAULT_STUDENTS.filter(s => s.classId === 'class-9' && s.sectionId === 'sec-9-a').forEach((student, index) => {
      let status: 'PRESENT' | 'ABSENT' | 'LEAVE' = 'PRESENT';
      if (index === 2 && i % 5 === 0) status = 'ABSENT';
      else if (index === 4 && i === 1) status = 'LEAVE';
      
      records.push({
        id: `att-9a-${student.id}-${dateStr}`,
        studentId: student.id,
        date: dateStr,
        classId: 'class-9',
        sectionId: 'sec-9-a',
        status,
        teacherId: 'teacher-2',
        timestamp: d.toISOString(),
      });
    });
  }

  return records;
}

