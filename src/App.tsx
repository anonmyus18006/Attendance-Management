import React, { useState, useEffect, useMemo } from 'react';
import { AndroidStatusBar } from './components/common/AndroidStatusBar';
import { AndroidNavBar, NavigationTab } from './components/common/AndroidNavBar';
import { TopBar } from './components/common/TopBar';
import { LiveClockWidget } from './components/dashboard/LiveClockWidget';
import { TeacherInfoWidget } from './components/dashboard/TeacherInfoWidget';
import { AttendanceSlider } from './components/dashboard/AttendanceSlider';
import { QuickActionsGrid } from './components/dashboard/QuickActionsGrid';
import { TodaySummaryView } from './components/dashboard/TodaySummaryView';
import { StudentRegister } from './components/sims/StudentRegister';
import { StudentFormModal } from './components/sims/StudentFormModal';
import { StudentProfileModal } from './components/sims/StudentProfileModal';
import { AttendanceHistory } from './components/attendance/AttendanceHistory';
import { AttendanceSession } from './components/attendance/AttendanceSession';
import { HolidayManager } from './components/attendance/HolidayManager';
import { MasterPdfExportModal } from './components/pdf/MasterPdfExportModal';
import { SettingsView } from './components/settings/SettingsView';
import { PasswordDialog } from './components/common/PasswordDialog';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { useDatabase } from './hooks/useDatabase';
import { NotificationService, ScheduledReminder } from './services/notificationService';
import { Student, SchoolClass, Section, Teacher } from './types';
import { Bell, X, ShieldAlert } from 'lucide-react';

export default function App() {
  const db = useDatabase();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [activeSubView, setActiveSubView] = useState<'none' | 'attendanceSession' | 'todaySummary' | 'holidays'>('none');

  // Selected Class & Section for Active Attendance
  const [sessionClassId, setSessionClassId] = useState<string>('class-10');
  const [sessionSectionId, setSessionSectionId] = useState<string>('sec-10-a');

  // Modals
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Security & Lock
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Notification Toast state
  const [activeToastReminder, setActiveToastReminder] = useState<ScheduledReminder | null>(null);

  // Database reactive entities
  const schoolSettings = db.getSchoolSettings();
  const appSettings = db.getAppSettings();
  const classes = db.getClasses();
  const sections = db.getSections();
  const teachers = db.getTeachers();
  const students = db.getStudents();
  const holidays = db.getHolidays();

  // Selected or Primary Teacher
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const activeTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || teachers[0] || {
      id: 'teacher-vinod',
      name: 'VINOD KUMAR',
      assignedClassId: 'class-10',
      assignedSectionId: 'sec-10-a',
      notificationEnabled: true,
    };
  }, [teachers, selectedTeacherId]);

  const activeTeacherClass = classes.find(c => c.id === activeTeacher.assignedClassId);
  const activeTeacherSection = sections.find(s => s.id === activeTeacher.assignedSectionId);

  // Initialize notification service on mount
  useEffect(() => {
    NotificationService.init();
    const unsub = NotificationService.onReminder(reminder => {
      setActiveToastReminder(reminder);
    });
    return unsub;
  }, []);

  // Handler to guard actions behind student edit lock password
  const executeGuardedAction = (action: () => void) => {
    if (appSettings.isStudentEditLocked && appSettings.editPasswordHash) {
      setPendingAction(() => action);
      setIsPasswordPromptOpen(true);
    } else {
      action();
    }
  };

  // Launch Attendance Session
  const handleStartAttendance = (classId: string, sectionId: string) => {
    setSessionClassId(classId);
    setSessionSectionId(sectionId);
    setActiveSubView('attendanceSession');
  };

  // Open Add Student Modal (Guarded)
  const handleOpenAddStudent = () => {
    executeGuardedAction(() => {
      setEditingStudent(null);
      setIsStudentFormOpen(true);
    });
  };

  // Open Edit Student Modal (Guarded)
  const handleOpenEditStudent = (student: Student) => {
    executeGuardedAction(() => {
      setEditingStudent(student);
      setIsStudentFormOpen(true);
      setSelectedStudentForProfile(null);
    });
  };

  // Delete Student (Guarded)
  const handlePromptDeleteStudent = (student: Student) => {
    executeGuardedAction(() => {
      setStudentToDelete(student);
    });
  };

  const handleConfirmDeleteStudent = () => {
    if (studentToDelete) {
      db.deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
      setSelectedStudentForProfile(null);
    }
  };

  // Switch Sub-views back to main tab
  const handleBackToMain = () => {
    setActiveSubView('none');
  };

  const sessionClass = classes.find(c => c.id === sessionClassId) || classes[0];
  const sessionSection = sections.find(s => s.id === sessionSectionId) || sections[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-900 flex justify-center items-start sm:p-4 font-sans antialiased selection:bg-blue-200">
      {/* Mobile Frame Container: styled like an Android device */}
      <div className="w-full max-w-md bg-slate-100 min-h-screen sm:min-h-[850px] sm:max-h-[920px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border sm:border-slate-700/60 relative">
        {/* Android Status Bar */}
        <AndroidStatusBar isOfflineMode={true} />

        {/* Top Header Bar */}
        <TopBar
          schoolSettings={schoolSettings}
          appSettings={appSettings}
          title={
            activeSubView === 'attendanceSession'
              ? 'Roll-by-Roll Attendance'
              : activeSubView === 'todaySummary'
              ? "Today's Summary"
              : activeSubView === 'holidays'
              ? 'School Holidays'
              : undefined
          }
          onBack={activeSubView !== 'none' ? handleBackToMain : undefined}
          onToggleLock={() => {
            if (appSettings.isStudentEditLocked) {
              // Unlock prompt
              executeGuardedAction(() => {
                db.updateAppSettings({ isStudentEditLocked: false });
              });
            } else {
              // Directly lock
              db.updateAppSettings({ isStudentEditLocked: true });
            }
          }}
          onOpenNotifications={() => {
            const rem = NotificationService.testTriggerNow();
            setActiveToastReminder(rem);
          }}
        />

        {/* In-App Toast Notification Banner (8:00 AM Reminder Simulator) */}
        {activeToastReminder && (
          <div className="bg-blue-900 text-white p-3 mx-3 mt-2 rounded-xl shadow-lg border border-blue-700 flex items-start justify-between z-30 animate-in slide-in-from-top duration-300">
            <div className="flex items-start space-x-2.5">
              <div className="p-1.5 bg-blue-800 rounded-lg text-amber-300 shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                    Attendance Reminder ({activeToastReminder.timeStr})
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 rounded-sm">
                    {activeToastReminder.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-white mt-0.5">
                  {activeToastReminder.reason || 'Class attendance is ready to be taken.'}
                </p>
                <p className="text-[11px] text-blue-200">
                  Teacher: {activeToastReminder.teacherName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveToastReminder(null)}
              className="p-1 text-blue-300 hover:text-white rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-3.5 space-y-4 pb-20 safe-area-bottom">
          {/* Subview 1: Roll-by-Roll Attendance Session */}
          {activeSubView === 'attendanceSession' && sessionClass && sessionSection && (
            <AttendanceSession
              classObj={sessionClass}
              sectionObj={sessionSection}
              teacher={activeTeacher}
              onClose={handleBackToMain}
            />
          )}

          {/* Subview 2: Today's Full School Summary */}
          {activeSubView === 'todaySummary' && (
            <TodaySummaryView
              classes={classes}
              sections={sections}
              onBack={handleBackToMain}
              onTakeAttendance={handleStartAttendance}
            />
          )}

          {/* Subview 3: School Holiday Calendar Manager */}
          {activeSubView === 'holidays' && (
            <div className="space-y-3">
              <HolidayManager
                holidays={holidays}
                onHolidaysChange={() => {}}
              />
            </div>
          )}

          {/* Main Tab 1: Dashboard */}
          {activeSubView === 'none' && currentTab === 'dashboard' && (
            <div className="space-y-3.5">
              {/* Live Asia/Kolkata Clock Widget */}
              <LiveClockWidget />

              {/* Teacher In-Charge Widget */}
              <TeacherInfoWidget
                currentTeacher={activeTeacher}
                currentClass={activeTeacherClass}
                currentSection={activeTeacherSection}
                allTeachers={teachers}
                classes={classes}
                sections={sections}
                onSelectAssignment={teacherId => setSelectedTeacherId(teacherId)}
              />

              {/* Attendance Carousel / Slider */}
              <AttendanceSlider
                classes={classes}
                sections={sections}
                onTakeAttendance={handleStartAttendance}
              />

              {/* Quick Actions Grid */}
              <QuickActionsGrid
                onTakeAttendance={() =>
                  handleStartAttendance(
                    activeTeacher.assignedClassId || 'class-10',
                    activeTeacher.assignedSectionId || 'sec-10-a'
                  )
                }
                onOpenSims={() => setCurrentTab('sims')}
                onAddStudent={handleOpenAddStudent}
                onOpenPdfExport={() => setIsPdfModalOpen(true)}
                onOpenHolidays={() => setActiveSubView('holidays')}
                onOpenSummary={() => setActiveSubView('todaySummary')}
              />
            </div>
          )}

          {/* Main Tab 2: SIMS Register */}
          {activeSubView === 'none' && currentTab === 'sims' && (
            <StudentRegister
              students={students}
              classes={classes}
              sections={sections}
              onSelectStudent={s => setSelectedStudentForProfile(s)}
              onAddNewStudent={handleOpenAddStudent}
              onOpenPdfModal={() => setIsPdfModalOpen(true)}
            />
          )}

          {/* Main Tab 3: Attendance Reports & History */}
          {activeSubView === 'none' && currentTab === 'attendance' && (
            <AttendanceHistory
              classes={classes}
              sections={sections}
              onTakeAttendanceFor={handleStartAttendance}
            />
          )}

          {/* Main Tab 4: Settings & Admin */}
          {activeSubView === 'none' && currentTab === 'settings' && (
            <SettingsView
              schoolSettings={schoolSettings}
              appSettings={appSettings}
              teachers={teachers}
              classes={classes}
              sections={sections}
              onRefresh={() => {}}
            />
          )}
        </main>

        {/* Android Bottom Navigation Bar */}
        {activeSubView === 'none' && (
          <div className="absolute bottom-0 left-0 right-0">
            <AndroidNavBar currentTab={currentTab} onTabChange={setCurrentTab} />
          </div>
        )}

        {/* --- MODALS & DIALOGS --- */}

        {/* Master PDF Export Modal */}
        <MasterPdfExportModal
          isOpen={isPdfModalOpen}
          classes={classes}
          sections={sections}
          onClose={() => setIsPdfModalOpen(false)}
        />

        {/* Student Profile Card Modal */}
        <StudentProfileModal
          student={selectedStudentForProfile}
          classObj={classes.find(c => c.id === selectedStudentForProfile?.classId)}
          sectionObj={sections.find(s => s.id === selectedStudentForProfile?.sectionId)}
          onClose={() => setSelectedStudentForProfile(null)}
          onEdit={handleOpenEditStudent}
          onDelete={handlePromptDeleteStudent}
        />

        {/* Add / Edit Student Modal */}
        <StudentFormModal
          isOpen={isStudentFormOpen}
          editingStudent={editingStudent}
          classes={classes}
          sections={sections}
          onClose={() => {
            setIsStudentFormOpen(false);
            setEditingStudent(null);
          }}
          onSaved={() => {
            // refresh happens automatically via useDatabase()
          }}
        />

        {/* Password Prompt Dialog for Student Edit Lock */}
        <PasswordDialog
          isOpen={isPasswordPromptOpen}
          title="Security Authorization Required"
          subtitle="Enter student edit lock password to modify school records."
          expectedHash={appSettings.editPasswordHash}
          onSuccess={() => {
            setIsPasswordPromptOpen(false);
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
          }}
          onCancel={() => {
            setIsPasswordPromptOpen(false);
            setPendingAction(null);
          }}
        />

        {/* Delete Student Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!studentToDelete}
          title="Delete Student Record"
          message={`Are you sure you want to permanently delete "${studentToDelete?.name}" (Roll No. ${studentToDelete?.rollNo})? All local attendance records associated with this student will also be removed.`}
          confirmText="Delete Student"
          isDestructive
          onConfirm={handleConfirmDeleteStudent}
          onCancel={() => setStudentToDelete(null)}
        />
      </div>
    </div>
  );
}
