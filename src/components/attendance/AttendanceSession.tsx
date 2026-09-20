import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  RotateCcw,
  Sparkles,
  Calendar,
  Award,
} from 'lucide-react';
import { SchoolClass, Section, Student, Teacher, AttendanceRecord } from '../../types';
import { db } from '../../database/db';
import { PdfService } from '../../services/pdfService';
import { getTodayDateString } from '../../services/attendanceService';

interface AttendanceSessionProps {
  classObj: SchoolClass;
  sectionObj: Section;
  teacher?: Teacher;
  onClose: () => void;
}

export const AttendanceSession: React.FC<AttendanceSessionProps> = ({
  classObj,
  sectionObj,
  teacher,
  onClose,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedRecords, setMarkedRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [isCompleted, setIsCompleted] = useState(false);
  const [dateStr, setDateStr] = useState(getTodayDateString());
  const [remarkInput, setRemarkInput] = useState('');

  // Load students and existing records for this class, section, date
  useEffect(() => {
    const list = db.getStudents(classObj.id, sectionObj.id);
    setStudents(list);

    const existing = db.getAttendanceRecords({
      classId: classObj.id,
      sectionId: sectionObj.id,
      date: dateStr,
    });
    const map = new Map<string, AttendanceRecord>();
    existing.forEach(r => map.set(r.studentId, r));
    setMarkedRecords(map);

    // If all students already have records, prompt or start at first
    if (list.length > 0 && map.size === list.length) {
      // already marked
    }
  }, [classObj.id, sectionObj.id, dateStr]);

  const currentStudent = students[currentIndex];
  const currentRecord = currentStudent ? markedRecords.get(currentStudent.id) : undefined;

  // Handle Mark Action (Auto-Next)
  const handleMarkStatus = (status: 'PRESENT' | 'ABSENT' | 'LEAVE') => {
    if (!currentStudent) return;

    // Persist immediately in database
    const rec = db.recordAttendance(
      currentStudent.id,
      dateStr,
      classObj.id,
      sectionObj.id,
      status,
      teacher?.id,
      remarkInput.trim() || undefined
    );

    // Update local state map
    setMarkedRecords(prev => {
      const next = new Map(prev);
      next.set(currentStudent.id, rec);
      return next;
    });

    setRemarkInput('');

    // Auto Next flow
    if (currentIndex < students.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last student reached!
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevStudent = students[currentIndex - 1];
      const prevRec = markedRecords.get(prevStudent.id);
      setRemarkInput(prevRec?.remark || '');
    }
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      setCurrentIndex(prev => prev + 1);
      const nextStudent = students[currentIndex + 1];
      const nextRec = markedRecords.get(nextStudent.id);
      setRemarkInput(nextRec?.remark || '');
    } else {
      setIsCompleted(true);
    }
  };

  // Calculate summary statistics
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  markedRecords.forEach(r => {
    if (r.status === 'PRESENT') presentCount++;
    else if (r.status === 'ABSENT') absentCount++;
    else if (r.status === 'LEAVE') leaveCount++;
  });

  const handleDownloadPdf = () => {
    const recordsList = Array.from(markedRecords.values());
    PdfService.exportDailyAttendance(
      classObj,
      sectionObj,
      dateStr,
      recordsList,
      students,
      teacher?.name
    );
  };

  if (students.length === 0) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center">
        <h3 className="text-base font-bold text-slate-800">No Students Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          No students are currently enrolled in {classObj.name} {sectionObj.name}.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-xl"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // --- Completion Screen ---
  if (isCompleted) {
    const totalEnrolled = students.length;
    const percentage = totalEnrolled > 0 ? ((presentCount / totalEnrolled) * 100).toFixed(2) : '0.00';

    return (
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 animate-in fade-in max-w-lg mx-auto">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Attendance Completed
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2">
            {classObj.name} - Section {sectionObj.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Date: <strong className="text-slate-800">{dateStr}</strong> • Teacher: <strong className="text-slate-800">{teacher?.name || 'In-Charge'}</strong>
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-2.5 my-5">
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Present</span>
            <span className="text-2xl font-black text-emerald-800">{presentCount}</span>
          </div>
          <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-red-700 uppercase block">Absent</span>
            <span className="text-2xl font-black text-red-800">{absentCount}</span>
          </div>
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-amber-700 uppercase block">Leave</span>
            <span className="text-2xl font-black text-amber-800">{leaveCount}</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-700 space-y-1.5 mb-5">
          <div className="flex justify-between">
            <span>Total Students:</span>
            <strong className="text-slate-900">{students.length}</strong>
          </div>
          <div className="flex justify-between">
            <span>Attendance Percentage:</span>
            <strong className="text-blue-900 text-sm font-black">{percentage}%</strong>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            id="completion-pdf-btn"
            onClick={handleDownloadPdf}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4" /> Save Official PDF to Downloads
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsCompleted(false);
                setCurrentIndex(0);
              }}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Review / Edit
            </button>
            <button
              onClick={onClose}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Done &amp; Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Active Roll-by-Roll Session ---
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-lg mx-auto">
      {/* Header Info */}
      <div className="bg-blue-900 text-white p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-blue-800 text-blue-100 transition-colors"
            title="Exit Session"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-black tracking-tight">
              {classObj.name} - Section {sectionObj.name}
            </h2>
            <p className="text-[10px] text-blue-200">
              Teacher: {teacher?.name || 'In-Charge'}
            </p>
          </div>
          <span className="text-[10px] font-mono bg-blue-950 px-2 py-1 rounded-md border border-blue-700/50">
            {currentIndex + 1} / {students.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-blue-950/60 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-amber-400 h-1.5 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / students.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Date Context */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar className="w-3.5 h-3.5 text-blue-700" />
          <span>Date: {dateStr}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="text-emerald-700 font-mono">P: {presentCount}</span>
          <span className="text-red-700 font-mono">A: {absentCount}</span>
          <span className="text-amber-700 font-mono">L: {leaveCount}</span>
        </div>
      </div>

      {/* Student Card */}
      <div className="p-5 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-900 border-2 border-blue-200 mb-3 shadow-2xs">
          <span className="text-2xl font-black font-mono">
            {currentStudent.rollNo}
          </span>
        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Roll Number {currentStudent.rollNo}
        </span>
        <h3 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
          {currentStudent.name}
        </h3>

        <div className="mt-2 text-xs text-slate-600 space-y-0.5 max-w-xs mx-auto">
          <p>Father: <strong className="text-slate-800">{currentStudent.fatherName || '-'}</strong></p>
          <p>Mother: <strong className="text-slate-800">{currentStudent.motherName || '-'}</strong></p>
        </div>

        {/* Current status if previously marked */}
        {currentRecord && (
          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full ${
                currentRecord.status === 'PRESENT'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : currentRecord.status === 'ABSENT'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              Current Status: {currentRecord.status}
            </span>
          </div>
        )}

        {/* Optional remark input */}
        <div className="mt-4 max-w-xs mx-auto">
          <input
            type="text"
            placeholder="Optional remark / reason for leave..."
            value={remarkInput}
            onChange={e => setRemarkInput(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Action Buttons: PRESENT, ABSENT, LEAVE (Auto-Next triggers on click!) */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center mb-2.5">
          Tap Status to Auto-Advance
        </span>

        <div className="grid grid-cols-3 gap-2.5">
          <button
            id="btn-mark-present"
            type="button"
            onClick={() => handleMarkStatus('PRESENT')}
            className={`py-3.5 px-2 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all active:scale-[0.96] shadow-sm ${
              currentRecord?.status === 'PRESENT'
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-700'
                : 'bg-white hover:bg-emerald-50 text-emerald-700 border-2 border-emerald-500'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 mb-1 stroke-[2.5]" />
            <span>PRESENT</span>
          </button>

          <button
            id="btn-mark-absent"
            type="button"
            onClick={() => handleMarkStatus('ABSENT')}
            className={`py-3.5 px-2 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all active:scale-[0.96] shadow-sm ${
              currentRecord?.status === 'ABSENT'
                ? 'bg-red-600 text-white ring-2 ring-red-700'
                : 'bg-white hover:bg-red-50 text-red-700 border-2 border-red-500'
            }`}
          >
            <XCircle className="w-5 h-5 mb-1 stroke-[2.5]" />
            <span>ABSENT</span>
          </button>

          <button
            id="btn-mark-leave"
            type="button"
            onClick={() => handleMarkStatus('LEAVE')}
            className={`py-3.5 px-2 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all active:scale-[0.96] shadow-sm ${
              currentRecord?.status === 'LEAVE'
                ? 'bg-amber-600 text-white ring-2 ring-amber-700'
                : 'bg-white hover:bg-amber-50 text-amber-700 border-2 border-amber-500'
            }`}
          >
            <Clock className="w-5 h-5 mb-1 stroke-[2.5]" />
            <span>LEAVE</span>
          </button>
        </div>

        {/* Correction Navigation: Previous and Next Buttons */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
          <button
            id="btn-att-previous"
            type="button"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <button
            type="button"
            onClick={() => setIsCompleted(true)}
            className="text-[11px] font-bold text-blue-700 hover:underline"
          >
            Finish &amp; Summary
          </button>

          <button
            id="btn-att-next"
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {currentIndex === students.length - 1 ? 'Finish' : 'Skip/Next'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
