import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  FileDown,
  Filter,
  UserCheck,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Student, SchoolClass, Section } from '../../types';
import { db } from '../../database/db';
import { calculateStudentAttendanceStats } from '../../services/attendanceService';
import { PdfService } from '../../services/pdfService';
import { EmptyState } from '../common/EmptyState';

interface StudentRegisterProps {
  students: Student[];
  classes: SchoolClass[];
  sections: Section[];
  onSelectStudent: (student: Student) => void;
  onAddNewStudent: () => void;
  onOpenPdfModal: () => void;
}

export const StudentRegister: React.FC<StudentRegisterProps> = ({
  students,
  classes,
  sections,
  onSelectStudent,
  onAddNewStudent,
  onOpenPdfModal,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'roll' | 'name' | 'attendance'>('roll');

  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const sectionMap = useMemo(() => new Map(sections.map(s => [s.id, s])), [sections]);

  // Available sections based on selected class
  const availableSections = useMemo(() => {
    if (selectedClassId === 'ALL') return sections;
    return sections.filter(s => s.classId === selectedClassId);
  }, [sections, selectedClassId]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        if (selectedClassId !== 'ALL' && s.classId !== selectedClassId) return false;
        if (selectedSectionId !== 'ALL' && s.sectionId !== selectedSectionId) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchFather = s.fatherName.toLowerCase().includes(q);
          const matchRoll = String(s.rollNo).includes(q);
          const matchExam = s.examRollNo?.toLowerCase().includes(q);
          if (!matchName && !matchFather && !matchRoll && !matchExam) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'roll') {
          if (a.classId !== b.classId) return a.classId.localeCompare(b.classId);
          if (a.sectionId !== b.sectionId) return a.sectionId.localeCompare(b.sectionId);
          return Number(a.rollNo) - Number(b.rollNo);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'attendance') {
          const aStat = calculateStudentAttendanceStats(a);
          const bStat = calculateStudentAttendanceStats(b);
          return bStat.attendancePercentage - aStat.attendancePercentage;
        }
        return 0;
      });
  }, [students, selectedClassId, selectedSectionId, searchQuery, sortBy]);

  // Quick export of the current active list
  const handleQuickExportList = () => {
    let title = 'STUDENT INFORMATION REGISTER';
    let label = 'School_Register';
    if (selectedClassId !== 'ALL') {
      const cls = classMap.get(selectedClassId)?.name || '';
      title = `CLASS REGISTER: ${cls}`;
      label = `Class_${cls}`;
      if (selectedSectionId !== 'ALL') {
        const sec = sectionMap.get(selectedSectionId)?.name || '';
        title = `CLASS REGISTER: ${cls} - ${sec}`;
        label = `Class_${cls}_${sec}`;
      }
    }

    PdfService.exportStudentRegister(filteredStudents, {
      title,
      fileName: `${label}_${new Date().toISOString().split('T')[0]}.pdf`,
      classMap,
      sectionMap,
      targetInfo: title,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              SIMS Student Register
            </h2>
            <p className="text-xs text-slate-500">
              Total Enrolled: <strong className="text-slate-800">{students.length}</strong> (Showing: {filteredStudents.length})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="sims-quick-pdf-btn"
              onClick={handleQuickExportList}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0"
              title="Export Current View as PDF"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span className="hidden xs:inline">Export PDF</span>
            </button>
            <button
              id="sims-add-student-btn"
              onClick={onAddNewStudent}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-3">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name, roll, father, exam roll..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Class Select */}
          <div>
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('ALL');
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          <div>
            <select
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Sections</option>
              {availableSections.map(s => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Bar */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
          <span className="text-[11px] text-slate-500 font-medium">Sort Order:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSortBy('roll')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                sortBy === 'roll' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Roll Number
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                sortBy === 'name' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Student Name
            </button>
            <button
              onClick={() => setSortBy('attendance')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                sortBy === 'attendance' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Attendance %
            </button>
          </div>
        </div>
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          title="No Students Found"
          description="Try adjusting your class/section filter or search term, or register a new student."
          actionText="Add New Student"
          onAction={onAddNewStudent}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filteredStudents.map(student => {
            const cls = classMap.get(student.classId);
            const sec = sectionMap.get(student.sectionId);
            const stat = calculateStudentAttendanceStats(student);

            return (
              <div
                key={student.id}
                id={`student-row-${student.id}`}
                onClick={() => onSelectStudent(student)}
                className="p-3.5 hover:bg-blue-50/60 active:bg-blue-100/60 cursor-pointer flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 border border-blue-200 flex items-center justify-center font-black font-mono text-sm shrink-0 group-hover:scale-105 transition-transform">
                    {student.rollNo}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-900 transition-colors">
                        {student.name}
                      </h4>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-sm shrink-0">
                        {cls?.name || 'Class'} {sec?.name || 'Sec'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      Father: <strong className="text-slate-700">{student.fatherName}</strong>
                      {student.feesPending > 0 && (
                        <span className="text-amber-700 font-bold ml-2">
                          • Fees: ₹{student.feesPending}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 ml-2">
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-blue-950 block leading-tight">
                      {stat.attendancePercentage}%
                    </span>
                    <span className="text-[9px] text-slate-400 block uppercase">Attendance</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
