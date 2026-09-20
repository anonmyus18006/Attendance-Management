import React from 'react';
import {
  X,
  FileDown,
  Edit2,
  Trash2,
  User,
  Calendar,
  Phone,
  Home,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
} from 'lucide-react';
import { Student, SchoolClass, Section } from '../../types';
import { db } from '../../database/db';
import { calculateStudentAttendanceStats } from '../../services/attendanceService';
import { PdfService } from '../../services/pdfService';

interface StudentProfileModalProps {
  student: Student | null;
  classObj?: SchoolClass;
  sectionObj?: Section;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  classObj,
  sectionObj,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!student) return null;

  const stat = calculateStudentAttendanceStats(student);
  const customFields = db.getApplicableCustomFieldsForStudent(student);

  const handleDownloadPdf = () => {
    PdfService.exportSingleStudent(student, classObj, sectionObj);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8 animate-in fade-in">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 border-2 border-blue-200 flex items-center justify-center font-black font-mono text-lg shrink-0">
              {student.rollNo}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.2 rounded-full uppercase">
                  {classObj?.name || 'Class'} {sectionObj?.name || 'Sec'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Roll #{student.rollNo}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                {student.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master PDF Export Action */}
        <div className="mt-3">
          <button
            id="student-download-pdf-btn"
            onClick={handleDownloadPdf}
            className="w-full py-2.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <FileDown className="w-4 h-4" /> Download Official Student Card PDF
          </button>
        </div>

        {/* Attendance Statistics Card */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Attendance Performance (Sundays &amp; Holidays Excluded)
          </span>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Working Days</span>
              <span className="text-sm font-black text-slate-800">{stat.workingDays}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block">Present</span>
              <span className="text-sm font-black text-emerald-800">{stat.presentDays}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-[9px] font-bold text-red-700 uppercase block">Absent</span>
              <span className="text-sm font-black text-red-800">{stat.absentDays}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-[9px] font-bold text-amber-700 uppercase block">Leave</span>
              <span className="text-sm font-black text-amber-800">{stat.leaveDays}</span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Overall Attendance Rate:</span>
            <span className="font-black text-base font-mono text-blue-900">
              {stat.attendancePercentage}%
            </span>
          </div>
        </div>

        {/* Student Details List */}
        <div className="mt-4 divide-y divide-slate-100 text-xs text-slate-700">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 font-medium">Father&apos;s Name:</span>
            <strong className="text-slate-900">{student.fatherName}</strong>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 font-medium">Mother&apos;s Name:</span>
            <strong className="text-slate-900">{student.motherName || 'Not Provided'}</strong>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 font-medium">Date of Birth:</span>
            <strong className="text-slate-900">{student.dob || 'Not Provided'}</strong>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 font-medium">Exam / Board Roll No:</span>
            <strong className="text-slate-900 font-mono">{student.examRollNo || 'N/A'}</strong>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 font-medium">Residential Address:</span>
            <strong className="text-slate-900 text-right max-w-xs">{student.address || 'Sirsa, Haryana'}</strong>
          </div>
          <div className="py-2 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Fees Status:</span>
            {student.feesPending > 0 ? (
              <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Pending: ₹{student.feesPending}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Fully Paid (₹0)
              </span>
            )}
          </div>

          {/* Custom Fields */}
          {customFields.map(cf => {
            const val = db.getCustomFieldValue(student.id, cf.id);
            if (!val) return null;
            return (
              <div key={cf.id} className="py-2 flex justify-between">
                <span className="text-slate-500 font-medium">{cf.name}:</span>
                <strong className="text-slate-900">{val}</strong>
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Edit & Delete */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            id="student-delete-btn"
            onClick={() => onDelete(student)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Student
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              id="student-edit-btn"
              onClick={() => onEdit(student)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
