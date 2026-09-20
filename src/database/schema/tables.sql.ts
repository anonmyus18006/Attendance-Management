/**
 * SQLite Normalized Database Schema DDL for School Student & Attendance Management App
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- 1. School Information
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT NOT NULL,
    pin TEXT NOT NULL,
    tehsil TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    logo_base64 TEXT,
    updated_at TEXT NOT NULL
);

-- 2. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL,
    primary_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    is_app_locked INTEGER NOT NULL DEFAULT 0,
    is_student_edit_locked INTEGER NOT NULL DEFAULT 1,
    app_lock_salt TEXT,
    app_lock_password_hash TEXT,
    edit_lock_salt TEXT,
    edit_password_hash TEXT,
    notification_reminder_enabled INTEGER NOT NULL DEFAULT 1,
    notification_reminder_time TEXT NOT NULL DEFAULT '08:00',
    skip_sunday_reminder INTEGER NOT NULL DEFAULT 1,
    skip_holiday_reminder INTEGER NOT NULL DEFAULT 1,
    default_pdf_fields TEXT,
    pdf_orientation TEXT NOT NULL DEFAULT 'auto',
    show_school_logo_in_pdf INTEGER NOT NULL DEFAULT 1,
    show_school_code_in_pdf INTEGER NOT NULL DEFAULT 1,
    show_generated_datetime_in_pdf INTEGER NOT NULL DEFAULT 1,
    show_page_numbers_in_pdf INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

-- 3. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- 4. Teachers
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    employee_code TEXT,
    phone TEXT,
    assigned_class_id TEXT NOT NULL,
    assigned_section_id TEXT NOT NULL,
    notification_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 5. Teacher Assignments (Multi-Class / Multi-Section)
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 1,
    assigned_at TEXT NOT NULL,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY(academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, academic_year_id, class_id, section_id)
);

-- 6. Classes
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    numeric_grade INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 7. Sections
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(class_id, name)
);

-- 8. Students (Core Master Record)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    dob TEXT NOT NULL,
    address TEXT NOT NULL,
    exam_roll_no TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 9. Student Enrollments (Historical Class & Section by Academic Year)
CREATE TABLE IF NOT EXISTS student_enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    roll_no INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    enrolled_at TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE,
    -- Strict constraint: Duplicate Roll Number prevented per Academic Year + Class + Section
    UNIQUE(academic_year_id, class_id, section_id, roll_no),
    UNIQUE(student_id, academic_year_id)
);

-- 10. Dynamic Custom Field Definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'text', 'long_text', 'number', 'date', 'boolean', 'dropdown'
    scope TEXT NOT NULL, -- 'global', 'specific_class', 'specific_class_all_sections', 'specific_section', 'specific_student'
    target_class_id TEXT,
    target_section_id TEXT,
    target_student_id TEXT,
    options_json TEXT, -- JSON array of string options
    is_required INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 11. Custom Field Values
CREATE TABLE IF NOT EXISTS custom_field_values (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    value TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(field_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    UNIQUE(student_id, field_id)
);

-- 12. Attendance Records (1 Record per Student per Date per Academic Year)
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD (Asia/Kolkata)
    status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY'
    teacher_id TEXT,
    remark TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE(student_id, date, academic_year_id)
);

-- 13. Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
    name TEXT NOT NULL,
    reason TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- 14. Student Fees
CREATE TABLE IF NOT EXISTS fees (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    amount_due REAL NOT NULL DEFAULT 0,
    amount_paid REAL NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    UNIQUE(student_id, academic_year_id)
);

-- 15. PDF History & Generated Files
CREATE TABLE IF NOT EXISTS pdf_history (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_path TEXT,
    type TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    target_info TEXT NOT NULL,
    generated_at TEXT NOT NULL
);

-- 16. Schema Migrations Log
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);
`;

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_enrollments_lookup ON student_enrollments(academic_year_id, class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date, class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_custom_values_lookup ON custom_field_values(student_id, field_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments ON teacher_assignments(class_id, section_id);
`;
