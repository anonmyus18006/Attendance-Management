import React from 'react';
import { FileDown, CheckCircle2, XCircle, Clock, ArrowLeft, School, Sun, Palmtree } from 'lucide-react';
import { SchoolClass, Section } from '../../types';
import { db } from '../../database/db';
import { getClassAttendanceSummaryForDate, getTodayDateString } from '../../services/attendanceService';
import { PdfService } from '../../services/pdfService';

interface TodaySummaryViewProps {
  classes: SchoolClass[];
  sections: Section[];
  onBack: () => void;
  onTakeAttendance: (classId: string, sectionId: string) => void;
}

export const TodaySummaryView: React.FC<TodaySummaryViewProps> = ({
  classes,
  sections,
  onBack,
  onTakeAttendance,
}) => {
  const todayStr = getTodayDateString();
  const isSunday = db.isDateSunday(todayStr);
  const holiday = db.isDateHoliday(todayStr);
  const school = db.getSchoolSettings();

  let totalSchoolStudents = 0;
  let totalSchoolPresent = 0;
  let totalSchoolAbsent = 0;
  let totalSchoolLeave = 0;

  const rows = classes.flatMap(c => {
    const classSections = sections.filter(s => s.classId === c.id);
    return classSections.map(s => {
      const summary = getClassAttendanceSummaryForDate(c.id, s.id, todayStr);
      totalSchoolStudents += summary.totalStudents;
      totalSchoolPresent += summary.presentCount;
      totalSchoolAbsent += summary.absentCount;
      totalSchoolLeave += summary.leaveCount;
      return { classObj: c, sectionObj: s, summary };
    });
  });

  const overallRate =
    totalSchoolStudents > 0
      ? ((totalSchoolPresent / totalSchoolStudents) * 100).toFixed(1)
      : '0.0';

  const handleExportSummaryPdf = () => {
    const classMap = new Map(classes.map(c => [c.id, c]));
    const sectionMap = new Map(sections.map(s => [s.id, s]));
    const allStudents = db.getStudents();

    PdfService.exportStudentRegister(allStudents, {
      title: `SCHOOL ATTENDANCE SUMMARY - ${todayStr}`,
      subtitle: `Overall Attendance: ${overallRate}% | Total Students: ${totalSchoolStudents}`,
      fileName: `School_Attendance_Summary_${todayStr}.pdf`,
      classMap,
      sectionMap,
      targetInfo: `School Summary on ${todayStr}`,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-in fade-in space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Today&apos;s School Attendance Summary
            </h3>
            <p className="text-xs text-slate-500">
              Date: <strong className="text-slate-800">{todayStr}</strong> • {school.name} (Code: {school.code})
            </p>
          </div>
        </div>

        <button
          onClick={handleExportSummaryPdf}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <FileDown className="w-4 h-4" /> Export PDF
        </button>
      </div>

      {/* Working Day Status Notice */}
      {isSunday ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-medium">
          <Sun className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Today is Sunday (Scheduled school holiday). Attendance recorded today does not penalize overall student averages.</span>
        </div>
      ) : holiday ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
          <Palmtree className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Today is an official school holiday: <strong>{holiday.name}</strong>.</span>
        </div>
      ) : null}

      {/* School Aggregate Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-blue-700 block">Total Enrolled</span>
          <span className="text-xl font-black text-blue-950">{totalSchoolStudents}</span>
        </div>
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Present</span>
          <span className="text-xl font-black text-emerald-800">{totalSchoolPresent}</span>
        </div>
        <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-red-700 block">Absent</span>
          <span className="text-xl font-black text-red-800">{totalSchoolAbsent}</span>
        </div>
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">Leave</span>
          <span className="text-xl font-black text-amber-800">{totalSchoolLeave}</span>
        </div>
      </div>

      {/* Class by Class Breakdown */}
      <div className="overflow-x-auto -mx-5 sm:mx-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
              <th className="py-2.5 px-4">Class &amp; Section</th>
              <th className="py-2.5 px-3 text-center">Total</th>
              <th className="py-2.5 px-3 text-center text-emerald-700">Present</th>
              <th className="py-2.5 px-3 text-center text-red-700">Absent</th>
              <th className="py-2.5 px-3 text-center text-amber-700">Leave</th>
              <th className="py-2.5 px-3 text-right">Attendance %</th>
              <th className="py-2.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.map(({ classObj, sectionObj, summary }) => (
              <tr key={`${classObj.id}-${sectionObj.id}`} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900">
                  {classObj.name} - Section {sectionObj.name}
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold">{summary.totalStudents}</td>
                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800">{summary.presentCount}</td>
                <td className="py-3 px-3 text-center font-mono font-bold text-red-800">{summary.absentCount}</td>
                <td className="py-3 px-3 text-center font-mono font-bold text-amber-800">{summary.leaveCount}</td>
                <td className="py-3 px-3 text-right font-mono font-black">
                  {summary.isNonWorkingDay ? (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Off Day
                    </span>
                  ) : summary.isComplete ? (
                    <span className="text-blue-900 font-bold">{summary.percentage}%</span>
                  ) : summary.markedStudents > 0 ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                      In Progress ({summary.markedStudents}/{summary.totalStudents})
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                      Not Started
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onTakeAttendance(classObj.id, sectionObj.id)}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-white hover:bg-blue-700 border border-blue-300 rounded-lg transition-colors"
                  >
                    Open Sheet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
