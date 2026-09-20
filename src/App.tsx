import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.contentWrapper}>
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
              executeGuardedAction(() => {
                db.updateAppSettings({ isStudentEditLocked: false });
              });
            } else {
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
          <View style={styles.toastBanner}>
            <View style={styles.toastContent}>
              <View style={styles.toastIconBox}>
                <Text style={styles.toastIconText}>🔔</Text>
              </View>
              <View style={styles.toastTextBox}>
                <View style={styles.toastBadgeRow}>
                  <Text style={styles.toastBadgeTitle}>
                    Attendance Reminder ({activeToastReminder.timeStr})
                  </Text>
                  <Text style={styles.toastBadgeStatus}>
                    {activeToastReminder.status}
                  </Text>
                </View>
                <Text style={styles.toastReason}>
                  {activeToastReminder.reason || 'Class attendance is ready to be taken.'}
                </Text>
                <Text style={styles.toastTeacher}>
                  Teacher: {activeToastReminder.teacherName}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setActiveToastReminder(null)}
              style={styles.toastCloseBtn}
            >
              <Text style={styles.toastCloseText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Main Scrollable Content Area */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
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
            <HolidayManager
              holidays={holidays}
              onHolidaysChange={() => {}}
            />
          )}

          {/* Main Tab 1: Dashboard */}
          {activeSubView === 'none' && currentTab === 'dashboard' && (
            <View style={styles.tabContent}>
              <LiveClockWidget />
              <TeacherInfoWidget
                currentTeacher={activeTeacher}
                currentClass={activeTeacherClass}
                currentSection={activeTeacherSection}
                allTeachers={teachers}
                classes={classes}
                sections={sections}
                onSelectAssignment={teacherId => setSelectedTeacherId(teacherId)}
              />
              <AttendanceSlider
                classes={classes}
                sections={sections}
                onTakeAttendance={handleStartAttendance}
              />
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
            </View>
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
        </ScrollView>

        {/* Android Bottom Navigation Bar */}
        {activeSubView === 'none' && (
          <View style={styles.bottomNavContainer}>
            <AndroidNavBar currentTab={currentTab} onTabChange={setCurrentTab} />
          </View>
        )}

        {/* --- MODALS & DIALOGS --- */}
        <MasterPdfExportModal
          isOpen={isPdfModalOpen}
          classes={classes}
          sections={sections}
          onClose={() => setIsPdfModalOpen(false)}
        />

        <StudentProfileModal
          student={selectedStudentForProfile}
          classObj={classes.find(c => c.id === selectedStudentForProfile?.classId)}
          sectionObj={sections.find(s => s.id === selectedStudentForProfile?.sectionId)}
          onClose={() => setSelectedStudentForProfile(null)}
          onEdit={handleOpenEditStudent}
          onDelete={handlePromptDeleteStudent}
        />

        <StudentFormModal
          isOpen={isStudentFormOpen}
          editingStudent={editingStudent}
          classes={classes}
          sections={sections}
          onClose={() => {
            setIsStudentFormOpen(false);
            setEditingStudent(null);
          }}
          onSaved={() => {}}
        />

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

        <ConfirmDialog
          isOpen={!!studentToDelete}
          title="Delete Student Record"
          message={`Are you sure you want to permanently delete "${studentToDelete?.name}" (Roll No. ${studentToDelete?.rollNo})? All local attendance records associated with this student will also be removed.`}
          confirmText="Delete Student"
          isDestructive
          onConfirm={handleConfirmDeleteStudent}
          onCancel={() => setStudentToDelete(null)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  toastBanner: {
    backgroundColor: '#1e3a8a',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 30,
    elevation: 4,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  toastIconBox: {
    padding: 6,
    backgroundColor: '#1e40af',
    borderRadius: 8,
    marginRight: 10,
  },
  toastIconText: {
    fontSize: 14,
  },
  toastTextBox: {
    flex: 1,
  },
  toastBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toastBadgeTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#93c5fd',
    textTransform: 'uppercase',
  },
  toastBadgeStatus: {
    fontSize: 9,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#6ee7b7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  toastReason: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  toastTeacher: {
    fontSize: 11,
    color: '#bfdbfe',
    marginTop: 2,
  },
  toastCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  toastCloseText: {
    fontSize: 14,
    color: '#93c5fd',
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 90,
  },
  tabContent: {
    gap: 14,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

