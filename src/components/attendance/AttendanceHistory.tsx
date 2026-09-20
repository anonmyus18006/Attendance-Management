import React, { useState } from 'react';
import {
  Calendar,
  FileText,
  Filter,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BarChart,
  CalendarDays,
} from 'lucide-react';
import { SchoolClass, Section, Student, AttendanceRecord } from '../../types';
import { db } from '../../database/db';
import {
  computeWorkingDays,
  calculateStudentAttendanceStats,
  getTodayDateString,
} from '../../services/attendanceService';
import { PdfService } from '../../services/pdfService';

interface AttendanceHistoryProps {
  classes: SchoolClass[];
  sections: Section[];
  onTakeAttendanceFor: (classId: string, sectionId: string) => void;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  classes,
  sections,
  onTakeAttendanceFor,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections.find(s => s.classId === classes[0]?.id)?.id || ''
  );
  const [activeView, setActiveView] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  // Date selection
  const todayStr = getTodayDateString();
  const [dailyDate, setDailyDate] = useState<string>(todayStr);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // September

  const currentClass = classes.find(c => c.id === selectedClassId);
  const classSections = sections.filter(s => s.classId === selectedClassId);
  const currentSection = sections.find(s => s.id === selectedSectionId);

  const students = db.getStudents(selectedClassId, selectedSectionId);

  // Month info
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const workingDayInfo = computeWorkingDays(startDate, endDate);

  // Monthly aggregates
  let totalPresentDays = 0;
  let totalAbsentDays = 0;
  let totalLeaveDays = 0;

  const studentStats = students.map(s => {
    const stat = calculateStudentAttendanceStats(s, startDate, endDate);
    totalPresentDays += stat.presentDays;
    totalAbsentDays += stat.absentDays;
    totalLeaveDays += stat.leaveDays;
    return stat;
  });

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('en-IN', {
    month: 'long',
  });

  // Daily records
  const dailyRecords = db.getAttendanceRecords({
    classId: selectedClassId,
    sectionId: selectedSectionId,
    date: dailyDate,
  });
  const dailyRecordMap = new Map<string, AttendanceRecord>();
  dailyRecords.forEach(r => dailyRecordMap.set(r.studentId, r));

  const handleExportMonthlyPdf = () => {
    if (!currentClass || !currentSection) return;
    PdfService.exportMonthlyAttendance(
      currentClass,
      currentSection,
      selectedYear,
      selectedMonth,
      students
    );
  };

  const handleExportDailyPdf = () => {
    if (!currentClass || !currentSection) return;
    PdfService.exportDailyAttendance(
      currentClass,
      currentSection,
      dailyDate,
      dailyRecords,
      students
    );
  };

  return (
    <div className="space-y-4">
      {/* Class & Section Selectors */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Select Class &amp; Section
          </h3>
          <button
            onClick={() => onTakeAttendanceFor(selectedClassId, selectedSectionId)}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
          >
            + Take Today&apos;s Attendance
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Class</label>
            <select
              value={selectedClassId}
              onChange={e => {
                const newClassId = e.target.value;
                setSelectedClassId(newClassId);
                const firstSec = sections.find(s => s.classId === newClassId);
                if (firstSec) setSelectedSectionId(firstSec.id);
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Section</label>
            <select
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              {classSections.map(s => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => setActiveView('monthly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeView === 'monthly'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Monthly Register
          </button>
          <button
            onClick={() => setActiveView('daily')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeView === 'daily'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Date-wise Sheet
          </button>
          <button
            onClick={() => setActiveView('yearly')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeView === 'yearly'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Academic Year
          </button>
        </div>
      </div>

      {/* --- MONTHLY REPORT VIEW --- */}
      {activeView === 'monthly' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {monthName} {selectedYear} Attendance
              </h2>
              <p className="text-xs text-slate-500">
                {currentClass?.name} {currentSection?.name} • Working Days: <strong className="text-slate-800">{workingDayInfo.totalWorkingDays}</strong> (Sundays: {workingDayInfo.sundaysCount}, Holidays: {workingDayInfo.holidaysCount})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportMonthlyPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
                title="Export Monthly Register PDF"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>

          {/* Month Aggregate Stat Box */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-center">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500 block">Working Days</span>
              <span className="text-base font-black text-slate-900">{workingDayInfo.totalWorkingDays}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-emerald-700 block">Total Present</span>
              <span className="text-base font-black text-emerald-800">{totalPresentDays}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-red-700 block">Total Absent</span>
              <span className="text-base font-black text-red-800">{totalAbsentDays}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-amber-700 block">Total Leave</span>
              <span className="text-base font-black text-amber-800">{totalLeaveDays}</span>
            </div>
          </div>

          {/* Students List Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                  <th className="py-2.5 px-3">Roll</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-2 text-center text-emerald-700">P</th>
                  <th className="py-2.5 px-2 text-center text-red-700">A</th>
                  <th className="py-2.5 px-2 text-center text-amber-700">L</th>
                  <th className="py-2.5 px-3 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {studentStats.map(stat => (
                  <tr key={stat.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{stat.rollNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{stat.studentName}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-800">{stat.presentDays}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-red-800">{stat.absentDays}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-800">{stat.leaveDays}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900">
                      {stat.attendancePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- DAILY VIEW --- */}
      {activeView === 'daily' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Select Date:</label>
              <input
                type="date"
                value={dailyDate}
                onChange={e => setDailyDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <button
              onClick={handleExportDailyPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Daily Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                  <th className="py-2.5 px-3">Roll</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {students.map(s => {
                  const rec = dailyRecordMap.get(s.id);
                  const status = rec?.status;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{s.rollNo}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3">
                        {status === 'PRESENT' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> PRESENT
                          </span>
                        )}
                        {status === 'ABSENT' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> ABSENT
                          </span>
                        )}
                        {status === 'LEAVE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> LEAVE
                          </span>
                        )}
                        {!status && (
                          <span className="text-[11px] font-bold text-slate-400">UNMARKED</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{rec?.remark || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- YEARLY VIEW --- */}
      {activeView === 'yearly' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Academic Year 2026-2027</h2>
              <p className="text-xs text-slate-500">Cumulative student working day performance</p>
            </div>
            <button
              onClick={() => {
                const classMap = new Map(classes.map(c => [c.id, c]));
                const sectionMap = new Map(sections.map(s => [s.id, s]));
                PdfService.exportStudentRegister(students, {
                  title: `Academic Year Summary: ${currentClass?.name} ${currentSection?.name}`,
                  fileName: `Yearly_Attendance_${currentClass?.name}_${currentSection?.name}.pdf`,
                  classMap,
                  sectionMap,
                  targetInfo: `${currentClass?.name} ${currentSection?.name}`,
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {studentStats.map(stat => (
              <div key={stat.studentId} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 font-mono font-black flex items-center justify-center text-xs">
                    {stat.rollNo}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{stat.studentName}</h4>
                    <span className="text-[10px] text-slate-500">
                      Present: {stat.presentDays} | Absent: {stat.absentDays} | Leave: {stat.leaveDays}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black font-mono text-blue-950">
                    {stat.attendancePercentage}%
                  </span>
                  <span className="text-[9px] text-slate-400 block uppercase">Yearly %</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
