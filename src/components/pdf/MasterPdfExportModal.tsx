import React, { useState } from 'react';
import {
  X,
  FileDown,
  CheckSquare,
  Square,
  Sparkles,
  School,
  Settings,
  History,
  FileText,
} from 'lucide-react';
import { SchoolClass, Section, Student, CustomField } from '../../types';
import { db } from '../../database/db';
import { PdfService } from '../../services/pdfService';
import { getTodayDateString } from '../../services/attendanceService';

interface MasterPdfExportModalProps {
  isOpen: boolean;
  classes: SchoolClass[];
  sections: Section[];
  onClose: () => void;
}

export const MasterPdfExportModal: React.FC<MasterPdfExportModalProps> = ({
  isOpen,
  classes,
  sections,
  onClose,
}) => {
  const [exportType, setExportType] = useState<
    'ENTIRE_SCHOOL' | 'CLASS_REGISTER' | 'SECTION_REGISTER' | 'DAILY_ATTENDANCE' | 'MONTHLY_ATTENDANCE'
  >('SECTION_REGISTER');

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections.find(s => s.classId === classes[0]?.id)?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Field selection
  const appSettings = db.getAppSettings();
  const customFields = db.getCustomFields();
  const [selectedFields, setSelectedFields] = useState<string[]>(appSettings.defaultPdfFields);

  const availableFieldOptions = [
    { key: 'rollNo', label: 'Roll Number' },
    { key: 'name', label: 'Student Full Name' },
    { key: 'classSection', label: 'Class & Section' },
    { key: 'fatherName', label: "Father's Name" },
    { key: 'motherName', label: "Mother's Name" },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'address', label: 'Residential Address' },
    { key: 'examRollNo', label: 'Exam / Board Roll No' },
    { key: 'feesPending', label: 'Pending Fees (₹)' },
    { key: 'attendancePercentage', label: 'Attendance Percentage' },
    ...customFields.map(cf => ({ key: `cf_${cf.id}`, label: cf.name })),
  ];

  const classSections = sections.filter(s => s.classId === selectedClassId);
  const currentClass = classes.find(c => c.id === selectedClassId);
  const currentSection = sections.find(s => s.id === selectedSectionId);

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedFields(availableFieldOptions.map(f => f.key));
  };

  const handleResetDefaultFields = () => {
    setSelectedFields(['rollNo', 'name', 'classSection', 'fatherName', 'attendancePercentage']);
  };

  const handleExecuteExport = () => {
    const classMap = new Map(classes.map(c => [c.id, c]));
    const sectionMap = new Map(sections.map(s => [s.id, s]));

    if (exportType === 'ENTIRE_SCHOOL') {
      const allStudents = db.getStudents();
      PdfService.exportStudentRegister(allStudents, {
        title: 'ENTIRE SCHOOL STUDENT REGISTER',
        subtitle: `Total Students: ${allStudents.length} | GHS Fatehpuria NK (Code: 3005)`,
        fileName: `School_Student_Register_${getTodayDateString()}.pdf`,
        selectedFieldKeys: selectedFields,
        classMap,
        sectionMap,
        targetInfo: 'Entire School Register',
      });
    } else if (exportType === 'CLASS_REGISTER') {
      if (!currentClass) return;
      const classStudents = db.getStudents(currentClass.id);
      PdfService.exportStudentRegister(classStudents, {
        title: `CLASS REGISTER: ${currentClass.name} (ALL SECTIONS)`,
        subtitle: `Total Students: ${classStudents.length}`,
        fileName: `Class_${currentClass.name}_Register.pdf`,
        selectedFieldKeys: selectedFields,
        classMap,
        sectionMap,
        targetInfo: `Class ${currentClass.name}`,
      });
    } else if (exportType === 'SECTION_REGISTER') {
      if (!currentClass || !currentSection) return;
      const sectionStudents = db.getStudents(currentClass.id, currentSection.id);
      PdfService.exportStudentRegister(sectionStudents, {
        title: `SECTION REGISTER: ${currentClass.name} - ${currentSection.name}`,
        subtitle: `Total Students: ${sectionStudents.length}`,
        fileName: `${currentClass.name}_${currentSection.name}_Register.pdf`,
        selectedFieldKeys: selectedFields,
        classMap,
        sectionMap,
        targetInfo: `${currentClass.name} ${currentSection.name}`,
      });
    } else if (exportType === 'DAILY_ATTENDANCE') {
      if (!currentClass || !currentSection) return;
      const sectionStudents = db.getStudents(currentClass.id, currentSection.id);
      const records = db.getAttendanceRecords({
        classId: currentClass.id,
        sectionId: currentSection.id,
        date: selectedDate,
      });
      const teacher = db.getTeachers().find(t => t.assignedClassId === currentClass.id && t.assignedSectionId === currentSection.id);
      PdfService.exportDailyAttendance(
        currentClass,
        currentSection,
        selectedDate,
        records,
        sectionStudents,
        teacher?.name
      );
    } else if (exportType === 'MONTHLY_ATTENDANCE') {
      if (!currentClass || !currentSection) return;
      const sectionStudents = db.getStudents(currentClass.id, currentSection.id);
      PdfService.exportMonthlyAttendance(
        currentClass,
        currentSection,
        selectedYear,
        selectedMonth,
        sectionStudents
      );
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 my-8 animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official PDF Report Generator
              </h3>
              <p className="text-xs text-slate-500">
                Includes GHS Fatehpuria NK (Code: 3005) header &amp; metadata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Type Selector */}
        <div className="mt-4">
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
            Select Report Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'SECTION_REGISTER', label: 'Section Register' },
              { id: 'CLASS_REGISTER', label: 'Full Class Register' },
              { id: 'ENTIRE_SCHOOL', label: 'Entire School Register' },
              { id: 'DAILY_ATTENDANCE', label: 'Daily Attendance' },
              { id: 'MONTHLY_ATTENDANCE', label: 'Monthly Attendance' },
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setExportType(type.id as any)}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border text-left transition-all ${
                  exportType === type.id
                    ? 'bg-blue-800 text-white border-blue-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scope Options */}
        {exportType !== 'ENTIRE_SCHOOL' && (
          <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Class</label>
              <select
                value={selectedClassId}
                onChange={e => {
                  setSelectedClassId(e.target.value);
                  const firstSec = sections.find(s => s.classId === e.target.value);
                  if (firstSec) setSelectedSectionId(firstSec.id);
                }}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Class {c.name}
                  </option>
                ))}
              </select>
            </div>

            {exportType !== 'CLASS_REGISTER' && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Section</label>
                <select
                  value={selectedSectionId}
                  onChange={e => setSelectedSectionId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                >
                  {classSections.map(s => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Date / Month pickers for attendance reports */}
        {exportType === 'DAILY_ATTENDANCE' && (
          <div className="mt-3">
            <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Attendance Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
            />
          </div>
        )}

        {exportType === 'MONTHLY_ATTENDANCE' && (
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Field Selection (For Register Exports) */}
        {(exportType === 'ENTIRE_SCHOOL' || exportType === 'CLASS_REGISTER' || exportType === 'SECTION_REGISTER') && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Include Columns in PDF ({selectedFields.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFields}
                  className="text-[10px] font-bold text-blue-700 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleResetDefaultFields}
                  className="text-[10px] font-bold text-slate-500 hover:underline"
                >
                  Standard Preset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {availableFieldOptions.map(opt => {
                const isSelected = selectedFields.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleField(opt.key)}
                    className="flex items-center gap-1.5 text-left text-xs text-slate-700 hover:text-slate-900"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-700 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-pdf-export"
            type="button"
            onClick={handleExecuteExport}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Generate &amp; Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
