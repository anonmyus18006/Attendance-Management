import React, { useState } from 'react';
import {
  School,
  UserCheck,
  Lock,
  FileText,
  Bell,
  Sliders,
  Database,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ShieldCheck,
  Clock,
  History,
  Calendar,
  KeyRound,
} from 'lucide-react';
import {
  SchoolSettings,
  AppSettings,
  Teacher,
  SchoolClass,
  Section,
  CustomField,
  AcademicYear,
} from '../../types';
import { db } from '../../database/db';
import { SecurityService } from '../../services/securityService';
import { BackupService, ImportAnalysis } from '../../services/backupService';
import { NotificationService } from '../../services/notificationService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PasswordDialog } from '../common/PasswordDialog';

interface SettingsViewProps {
  schoolSettings: SchoolSettings;
  appSettings: AppSettings;
  teachers: Teacher[];
  classes: SchoolClass[];
  sections: Section[];
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  schoolSettings,
  appSettings,
  teachers,
  classes,
  sections,
  onRefresh,
}) => {
  const [activeSection, setActiveSection] = useState<
    'school' | 'academicYears' | 'teachers' | 'security' | 'pdf' | 'notifications' | 'customFields' | 'backup'
  >('school');

  // School Form State
  const [schoolForm, setSchoolForm] = useState<SchoolSettings>({ ...schoolSettings });
  const [schoolSavedNotice, setSchoolSavedNotice] = useState(false);

  // Security Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');

  // Security Auth Dialog (Prevents Lock Bypass)
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [authTitle, setAuthTitle] = useState('Security Authorization');
  const [authSubtitle, setAuthSubtitle] = useState('Enter password to authorize this action.');
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);

  const requestAuth = (title: string, subtitle: string, action: () => void) => {
    if (appSettings.editPasswordHash || appSettings.appLockPasswordHash) {
      setAuthTitle(title);
      setAuthSubtitle(subtitle);
      setPendingAuthAction(() => action);
      setIsAuthPromptOpen(true);
    } else {
      action();
    }
  };

  // Academic Years Form State
  const academicYears: AcademicYear[] = db.getAcademicYears();
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [yearName, setYearName] = useState('');
  const [yearStart, setYearStart] = useState('2026-04-01');
  const [yearEnd, setYearEnd] = useState('2027-03-31');
  const [yearIsActive, setYearIsActive] = useState(false);

  // Teacher Form State
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmpCode, setTeacherEmpCode] = useState('');
  const [teacherClassId, setTeacherClassId] = useState(classes[0]?.id || '');
  const [teacherSecId, setTeacherSecId] = useState(sections[0]?.id || '');

  // Custom Field Form State
  const [isAddingField, setIsAddingField] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'dropdown'>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldClassScope, setFieldClassScope] = useState<string>('ALL');

  // Backup & Import state
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [importMode, setImportMode] = useState<'add_new' | 'update_matching' | 'overwrite_all'>('add_new');
  const [importStatusMessage, setImportStatusMessage] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // PDF History
  const pdfHistory = db.getPdfHistory();

  // Save School Settings
  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSchoolSettings(schoolForm);
    setSchoolSavedNotice(true);
    setTimeout(() => setSchoolSavedNotice(false), 2500);
    onRefresh();
  };

  // Save Security / Password (Requires current password if one is already configured)
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setSecurityMessage('Password cannot be blank.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage('Passwords do not match.');
      return;
    }

    const saveAction = async () => {
      await SecurityService.setEditPassword(newPassword);
      setSecurityMessage('Security Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      onRefresh();
    };

    if (appSettings.editPasswordHash) {
      requestAuth(
        'Verify Current Password',
        'Enter current security password before changing to a new password.',
        saveAction
      );
    } else {
      await saveAction();
    }
  };

  // Guarded Toggle Edit Lock (PREVENTS LOCK BYPASS BUG)
  const handleToggleEditLock = () => {
    if (appSettings.isStudentEditLocked) {
      requestAuth(
        'Authorize Disabling Edit Lock',
        'Enter security password to unlock student record modifications.',
        () => {
          db.updateAppSettings({ isStudentEditLocked: false });
          setSecurityMessage('Student editing unlocked.');
          onRefresh();
        }
      );
    } else {
      if (!appSettings.editPasswordHash) {
        setSecurityMessage('Please set a security password below before activating Edit Lock.');
        return;
      }
      db.updateAppSettings({ isStudentEditLocked: true });
      setSecurityMessage('Student editing locked.');
      onRefresh();
    }
  };

  // Guarded Toggle App Lock (Startup screen lock)
  const handleToggleAppLock = () => {
    if (appSettings.isAppLocked) {
      requestAuth(
        'Authorize Disabling App Lock',
        'Enter security password to remove application startup lock.',
        () => {
          SecurityService.removeAppLock();
          setSecurityMessage('App Lock disabled.');
          onRefresh();
        }
      );
    } else {
      if (!appSettings.editPasswordHash && !appSettings.appLockPasswordHash) {
        setSecurityMessage('Please set a security password below before activating App Lock.');
        return;
      }
      db.updateAppSettings({ isAppLocked: true });
      setSecurityMessage('App Lock enabled. Startup will now require password.');
      onRefresh();
    }
  };

  // Guarded Remove Password
  const handleRemovePassword = () => {
    requestAuth(
      'Authorize Password Removal',
      'Enter current security password to remove security locks.',
      () => {
        SecurityService.removeEditPassword();
        SecurityService.removeAppLock();
        setSecurityMessage('Password protection removed.');
        onRefresh();
      }
    );
  };

  // Guarded Reset Database
  const handlePromptReset = () => {
    requestAuth(
      'Authorize Factory Reset',
      'Enter security password to wipe and restore default school demo data.',
      () => {
        setIsResetDialogOpen(true);
      }
    );
  };

  // Add Academic Year
  const handleAddAcademicYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearName.trim()) return;
    db.addAcademicYear({
      name: yearName.trim(),
      startDate: yearStart,
      endDate: yearEnd,
      isCurrent: yearIsActive,
    });
    setIsAddingYear(false);
    setYearName('');
    onRefresh();
  };

  // Add Teacher
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;
    db.addTeacher({
      name: teacherName.trim(),
      employeeCode: teacherEmpCode.trim() || undefined,
      assignedClassId: teacherClassId,
      assignedSectionId: teacherSecId,
      notificationEnabled: true,
    });
    setIsAddingTeacher(false);
    setTeacherName('');
    setTeacherEmpCode('');
    onRefresh();
  };

  // Add Custom Field
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;
    const optionsArray =
      fieldType === 'dropdown'
        ? fieldOptions.split(',').map(o => o.trim()).filter(Boolean)
        : undefined;

    db.addCustomField({
      name: fieldName.trim(),
      type: fieldType,
      scope: fieldClassScope === 'ALL' ? 'global' : 'specific_class',
      targetClassId: fieldClassScope === 'ALL' ? undefined : fieldClassScope,
      options: optionsArray,
      isRequired: false,
      isActive: true,
    });
    setIsAddingField(false);
    setFieldName('');
    setFieldOptions('');
    onRefresh();
  };

  // JSON Import File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const analysis = await BackupService.analyzeJsonFile(file);
    setImportAnalysis(analysis);
    setImportStatusMessage('');
  };

  // Execute JSON Import
  const handleApplyImport = async () => {
    if (!importAnalysis || !importAnalysis.data) return;
    try {
      const res = await BackupService.executeImport(importAnalysis.data, importMode);
      setImportStatusMessage(
        `Import Successful! Added ${res.added} records, updated ${res.updated} records, skipped ${res.skipped} records.`
      );
      setImportAnalysis(null);
      onRefresh();
    } catch (err: any) {
      setImportStatusMessage(`Import Error: ${err.message || 'Failed'}`);
    }
  };

  // Reset to Seed
  const handleResetToSeed = () => {
    db.resetToSeedData();
    setIsResetDialogOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Settings Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 overflow-x-auto flex gap-1 text-xs select-none">
        {[
          { id: 'school', label: 'School Profile', icon: School },
          { id: 'academicYears', label: 'Academic Sessions', icon: Calendar },
          { id: 'teachers', label: 'Teachers', icon: UserCheck },
          { id: 'security', label: 'Security & Lock', icon: Lock },
          { id: 'notifications', label: '8:00 AM Reminder', icon: Bell },
          { id: 'customFields', label: 'Custom Fields', icon: Sliders },
          { id: 'pdf', label: 'PDF Settings', icon: FileText },
          { id: 'backup', label: 'JSON Backup', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- 1. SCHOOL PROFILE --- */}
      {activeSection === 'school' && (
        <form onSubmit={handleSaveSchool} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official School Profile</h3>
              <p className="text-xs text-slate-500">Appears on official attendance reports and PDFs</p>
            </div>
            {schoolSavedNotice && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">School Name *</label>
              <input
                type="text"
                value={schoolForm.name}
                onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">School Code (Required) *</label>
              <input
                type="text"
                value={schoolForm.code}
                onChange={e => setSchoolForm({ ...schoolForm, code: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">District</label>
              <input
                type="text"
                value={schoolForm.district}
                onChange={e => setSchoolForm({ ...schoolForm, district: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Address *</label>
              <input
                type="text"
                value={schoolForm.address}
                onChange={e => setSchoolForm({ ...schoolForm, address: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">State</label>
              <input
                type="text"
                value={schoolForm.state}
                onChange={e => setSchoolForm({ ...schoolForm, state: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">PIN Code</label>
              <input
                type="text"
                value={schoolForm.pin}
                onChange={e => setSchoolForm({ ...schoolForm, pin: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end mt-5 pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors"
            >
              Update School Profile
            </button>
          </div>
        </form>
      )}

      {/* --- ACADEMIC SESSIONS MANAGEMENT --- */}
      {activeSection === 'academicYears' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Academic Sessions</h3>
              <p className="text-xs text-slate-500">Manage school academic sessions and current active year</p>
            </div>
            {!isAddingYear && (
              <button
                onClick={() => setIsAddingYear(true)}
                className="flex items-center gap-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Session
              </button>
            )}
          </div>

          {isAddingYear && (
            <form onSubmit={handleAddAcademicYear} className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                New Academic Session
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Session Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-2027"
                    value={yearName}
                    onChange={e => setYearName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={yearStart}
                    onChange={e => setYearStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={yearEnd}
                    onChange={e => setYearEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="year-active-check"
                  checked={yearIsActive}
                  onChange={e => setYearIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm"
                />
                <label htmlFor="year-active-check" className="text-xs text-slate-700 font-medium">
                  Set as Current Active Session
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingYear(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
                >
                  Save Session
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {academicYears.map(yr => (
              <div key={yr.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs ${yr.isCurrent ? 'bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900">{yr.name}</h4>
                      {yr.isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active Session
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {yr.startDate} to {yr.endDate}
                    </p>
                  </div>
                </div>

                {!yr.isCurrent && (
                  <button
                    onClick={() => {
                      db.setActiveAcademicYear(yr.id);
                      onRefresh();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors"
                  >
                    Set Active
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- 2. TEACHERS MANAGEMENT --- */}
      {activeSection === 'teachers' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Faculty &amp; Class Teachers</h3>
              <p className="text-xs text-slate-500">Teachers responsible for taking class attendance</p>
            </div>
            {!isAddingTeacher && (
              <button
                onClick={() => setIsAddingTeacher(true)}
                className="flex items-center gap-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Teacher
              </button>
            )}
          </div>

          {isAddingTeacher && (
            <form onSubmit={handleAddTeacher} className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Register Teacher
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. VINOD KUMAR"
                    value={teacherName}
                    onChange={e => setTeacherName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Emp ID</label>
                  <input
                    type="text"
                    placeholder="e.g. T-3005-01"
                    value={teacherEmpCode}
                    onChange={e => setTeacherEmpCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Assigned Class</label>
                  <select
                    value={teacherClassId}
                    onChange={e => setTeacherClassId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        Class {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Assigned Section</label>
                  <select
                    value={teacherSecId}
                    onChange={e => setTeacherSecId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    {sections
                      .filter(s => s.classId === teacherClassId)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          Section {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingTeacher(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
                >
                  Save Teacher
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {teachers.map(t => {
              const cls = classes.find(c => c.id === t.assignedClassId)?.name || '';
              const sec = sections.find(s => s.id === t.assignedSectionId)?.name || '';

              return (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{t.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        In-Charge: <strong className="text-slate-800">{cls} {sec}</strong> {t.employeeCode && `• ID: ${t.employeeCode}`}
                      </p>
                    </div>
                  </div>

                  {teachers.length > 1 && (
                    <button
                      onClick={() => {
                        db.deleteTeacher(t.id);
                        onRefresh();
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg"
                      title="Delete Teacher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 3. SECURITY & ACCESS LOCK (PREVENTS LOCK BYPASS) --- */}
      {activeSection === 'security' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Application Security &amp; Access Lock</h3>
            <p className="text-xs text-slate-500">
              Prevent unauthorized modification to student information, app startup, or database operations.
            </p>
          </div>

          {/* Student Info Editing Lock Toggle (Guarded against unauthorized toggle) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl ${appSettings.isStudentEditLocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">Student Info Editing Lock</h4>
                  {appSettings.isStudentEditLocked && (
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-100 text-red-800 border border-red-200">
                      Protected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                  When enabled, teachers cannot add, edit, or delete student profiles without entering the security password.
                </p>
              </div>
            </div>

            <button
              id="btn-toggle-edit-lock"
              onClick={handleToggleEditLock}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                appSettings.isStudentEditLocked
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {appSettings.isStudentEditLocked ? 'LOCK ACTIVE' : 'UNLOCKED'}
            </button>
          </div>

          {/* Application Startup Lock (App Lock) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-xl ${appSettings.isAppLocked ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">App Startup Lock (Pin / Password)</h4>
                  {appSettings.isAppLocked && (
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Enforced
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                  Locks the entire application when opened or resumed. Requires security password to access school records.
                </p>
              </div>
            </div>

            <button
              id="btn-toggle-app-lock"
              onClick={handleToggleAppLock}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                appSettings.isAppLocked
                  ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                  : 'bg-slate-600 hover:bg-slate-700 text-white'
              }`}
            >
              {appSettings.isAppLocked ? 'APP LOCKED' : 'APP UNLOCKED'}
            </button>
          </div>

          {/* Change / Set Edit Lock Password */}
          <form onSubmit={handleSavePassword} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {appSettings.editPasswordHash ? 'Change Security Password' : 'Create Security Password'}
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Stored securely as a PBKDF2/SHA-256 cryptographic hash with random per-password salt in SQLite.
            </p>

            {securityMessage && (
              <div className="p-2.5 mb-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium">
                {securityMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              {appSettings.editPasswordHash && (
                <button
                  type="button"
                  id="btn-remove-password"
                  onClick={handleRemovePassword}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Remove Password
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
              >
                Save Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- 4. 8:00 AM ATTENDANCE REMINDERS --- */}
      {activeSection === 'notifications' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daily 08:00 AM Attendance Reminder</h3>
            <p className="text-xs text-slate-500">
              Sends an automated local notification to the teacher in-charge on working school days.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Enable Daily Reminder</h4>
                <p className="text-[11px] text-slate-500">Triggers offline notification without internet</p>
              </div>
              <input
                type="checkbox"
                checked={appSettings.notificationReminderEnabled}
                onChange={e => {
                  db.updateAppSettings({ notificationReminderEnabled: e.target.checked });
                  onRefresh();
                }}
                className="w-5 h-5 rounded-sm text-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Reminder Time</label>
                <input
                  type="time"
                  value={appSettings.notificationReminderTime}
                  onChange={e => {
                    db.updateAppSettings({ notificationReminderTime: e.target.value });
                    onRefresh();
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Test Simulator</span>
                <button
                  type="button"
                  onClick={() => NotificationService.testTriggerNow()}
                  className="w-full py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" /> Trigger Test Notification Now
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Exclusion Rules</span>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skip-sun"
                  checked={appSettings.skipSundayReminder}
                  onChange={e => {
                    db.updateAppSettings({ skipSundayReminder: e.target.checked });
                    onRefresh();
                  }}
                  className="w-4 h-4 rounded-sm text-blue-600"
                />
                <label htmlFor="skip-sun" className="text-xs text-slate-700">
                  Skip reminder on Sundays (Non-school day)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skip-hol"
                  checked={appSettings.skipHolidayReminder}
                  onChange={e => {
                    db.updateAppSettings({ skipHolidayReminder: e.target.checked });
                    onRefresh();
                  }}
                  className="w-4 h-4 rounded-sm text-blue-600"
                />
                <label htmlFor="skip-hol" className="text-xs text-slate-700">
                  Skip reminder on school holidays (from local holiday calendar)
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 5. CUSTOM FIELDS --- */}
      {activeSection === 'customFields' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Custom Student Fields</h3>
              <p className="text-xs text-slate-500">Add school-specific data points to student records &amp; registers</p>
            </div>
            {!isAddingField && (
              <button
                onClick={() => setIsAddingField(true)}
                className="flex items-center gap-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Field
              </button>
            )}
          </div>

          {isAddingField && (
            <form onSubmit={handleAddCustomField} className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                New Custom Field
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Field Label *</label>
                  <input
                    type="text"
                    placeholder="e.g. Aadhar Card No, Bus Stop"
                    value={fieldName}
                    onChange={e => setFieldName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Data Type</label>
                  <select
                    value={fieldType}
                    onChange={e => setFieldType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    <option value="text">Single Line Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="dropdown">Dropdown Options</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Class Scope</label>
                  <select
                    value={fieldClassScope}
                    onChange={e => setFieldClassScope(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    <option value="ALL">All Classes (Global)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        Only Class {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {fieldType === 'dropdown' && (
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                      Dropdown Options (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Route A, Route B, Self-Walk"
                      value={fieldOptions}
                      onChange={e => setFieldOptions(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingField(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
                >
                  Save Field
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {db.getCustomFields().map(cf => {
              const scopeText = cf.targetClassId
                ? `Class ${classes.find(c => c.id === cf.targetClassId)?.name || ''}`
                : 'All Classes';

              return (
                <div key={cf.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{cf.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      Type: <span className="font-mono">{cf.type}</span> • Scope: {scopeText}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      db.deleteCustomField(cf.id);
                      onRefresh();
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg"
                    title="Delete Field"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 6. PDF SETTINGS & HISTORY --- */}
      {activeSection === 'pdf' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">PDF Master Settings &amp; Download History</h3>
            <p className="text-xs text-slate-500">Official formatting and offline PDF download logs</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Show School Code in PDF Header</h4>
                <p className="text-[11px] text-slate-500">Prints &quot;CODE: 3005&quot; in the header bar</p>
              </div>
              <input
                type="checkbox"
                checked={appSettings.showSchoolCodeInPdf}
                onChange={e => {
                  db.updateAppSettings({ showSchoolCodeInPdf: e.target.checked });
                  onRefresh();
                }}
                className="w-5 h-5 rounded-sm text-blue-600"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Page Orientation Default</h4>
                <p className="text-[11px] text-slate-500">Automatic switches to landscape when multiple columns are chosen</p>
              </div>
              <select
                value={appSettings.pdfOrientation}
                onChange={e => {
                  db.updateAppSettings({ pdfOrientation: e.target.value as any });
                  onRefresh();
                }}
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold"
              >
                <option value="auto">Auto (Smart)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* Download History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Saved PDF History ({pdfHistory.length})
              </h4>
              {pdfHistory.length > 0 && (
                <button
                  onClick={() => {
                    db.clearPdfHistory();
                    onRefresh();
                  }}
                  className="text-[10px] font-bold text-red-600 hover:underline"
                >
                  Clear History
                </button>
              )}
            </div>

            {pdfHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center border border-dashed rounded-xl">
                No PDFs generated yet. Generated PDFs will be logged here.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                {pdfHistory.map(h => (
                  <div key={h.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <span className="font-semibold text-slate-900 block font-mono text-[11px]">
                        {h.fileName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {h.targetInfo} • {h.recordCount} records
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 7. BACKUP & RESTORE (JSON ONLY) --- */}
      {activeSection === 'backup' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Database Backup &amp; Restore</h3>
            <p className="text-xs text-slate-500">
              100% Offline JSON file exchange. No internet or external cloud required.
            </p>
          </div>

          {importStatusMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-900">
              {importStatusMessage}
            </div>
          )}

          {/* Export Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Export Full School Database
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Generates a single comprehensive JSON file containing all students, classes, attendance records, holidays, and settings.
            </p>
            <button
              onClick={() => BackupService.exportFullBackup()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" /> Download JSON Backup File
            </button>
          </div>

          {/* Import Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Import School JSON Backup
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Select a valid JSON backup file from your Android storage to inspect and restore.
            </p>

            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />

            {/* Import Pre-Inspection Analysis Modal / Box */}
            {importAnalysis && (
              <div className="mt-4 p-3.5 bg-white border border-blue-200 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Pre-Import Analysis: {importAnalysis.appName}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Students</span>
                    <strong className="text-slate-900">{importAnalysis.detectedStudents}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Attendance</span>
                    <strong className="text-slate-900">{importAnalysis.detectedAttendance}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">New Records</span>
                    <strong className="text-emerald-700">{importAnalysis.newStudents}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Duplicates</span>
                    <strong className="text-amber-700">{importAnalysis.duplicateStudents}</strong>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    Conflict Resolution Mode
                  </label>
                  <select
                    value={importMode}
                    onChange={e => setImportMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold"
                  >
                    <option value="add_new">Add Only New Records (Skip Duplicates)</option>
                    <option value="update_matching">Update Matching Records &amp; Add New</option>
                    <option value="overwrite_all">Complete Restore (Overwrite Everything)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setImportAnalysis(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImport}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
                  >
                    Execute Import Transaction
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset To Factory Seed Data */}
          <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-red-900">Reset to Default School Data</h4>
              <p className="text-[11px] text-red-700 max-w-sm">
                Restores standard GHS Fatehpuria NK demo data (classes, sections, sample students, holidays).
              </p>
            </div>
            <button
              id="btn-reset-db"
              onClick={handlePromptReset}
              className="px-3 py-1.5 text-xs font-bold text-red-700 bg-white border border-red-300 hover:bg-red-100 rounded-xl transition-colors shadow-2xs shrink-0"
            >
              Reset Database
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="Reset Local Database"
        message="This will reset all current records and restore default GHS Fatehpuria NK demo data. Ensure you have exported a JSON backup if you wish to keep your records."
        confirmText="Reset Everything"
        isDestructive
        onConfirm={handleResetToSeed}
        onCancel={() => setIsResetDialogOpen(false)}
      />

      <PasswordDialog
        isOpen={isAuthPromptOpen}
        title={authTitle}
        subtitle={authSubtitle}
        expectedHash={appSettings.editPasswordHash || appSettings.appLockPasswordHash}
        expectedSalt={appSettings.editLockSalt || appSettings.appLockSalt}
        onSuccess={() => {
          setIsAuthPromptOpen(false);
          if (pendingAuthAction) {
            pendingAuthAction();
            setPendingAuthAction(null);
          }
        }}
        onCancel={() => {
          setIsAuthPromptOpen(false);
          setPendingAuthAction(null);
        }}
      />
    </div>
  );
};
