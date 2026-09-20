import React from 'react';
import { UserCheck, GraduationCap, ChevronRight } from 'lucide-react';
import { Teacher, SchoolClass, Section } from '../../types';

interface TeacherInfoWidgetProps {
  currentTeacher: Teacher;
  currentClass?: SchoolClass;
  currentSection?: Section;
  onOpenSettings?: () => void;
  allTeachers: Teacher[];
  classes: SchoolClass[];
  sections: Section[];
  onSelectAssignment?: (teacherId: string) => void;
}

export const TeacherInfoWidget: React.FC<TeacherInfoWidgetProps> = ({
  currentTeacher,
  currentClass,
  currentSection,
  onOpenSettings,
  allTeachers,
  classes,
  sections,
  onSelectAssignment,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm border border-blue-200 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Teacher In-Charge
            </span>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              {currentTeacher.name}
            </h3>
            {currentTeacher.employeeCode && (
              <span className="text-[10px] text-slate-500 font-mono">
                Emp ID: {currentTeacher.employeeCode}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Class
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
            <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
            {currentClass?.name || '10th'} {currentSection?.name || 'A'}
          </span>
        </div>
      </div>

      {allTeachers.length > 1 && onSelectAssignment && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">Switch Teacher/Section:</span>
          <div className="flex gap-1 overflow-x-auto py-1">
            {allTeachers.map(t => {
              const cls = classes.find(c => c.id === t.assignedClassId)?.name || '';
              const sec = sections.find(s => s.id === t.assignedSectionId)?.name || '';
              const isSelected = t.id === currentTeacher.id;

              return (
                <button
                  key={t.id}
                  onClick={() => onSelectAssignment(t.id)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-800 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.name.split(' ')[0]} ({cls} {sec})
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
