import React from 'react';
import {
  CalendarCheck,
  UserPlus,
  Users,
  FileText,
  Palmtree,
  BarChart3,
} from 'lucide-react';

interface QuickActionsGridProps {
  onTakeAttendance: () => void;
  onOpenSims: () => void;
  onAddStudent: () => void;
  onOpenPdfExport: () => void;
  onOpenHolidays: () => void;
  onOpenSummary: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onTakeAttendance,
  onOpenSims,
  onAddStudent,
  onOpenPdfExport,
  onOpenHolidays,
  onOpenSummary,
}) => {
  const actions = [
    {
      id: 'quick-take-att',
      label: 'Take Attendance',
      sub: 'Roll-by-roll auto next',
      icon: CalendarCheck,
      color: 'bg-blue-600 text-white',
      badge: 'Daily',
      onClick: onTakeAttendance,
    },
    {
      id: 'quick-add-student',
      label: 'Add Student',
      sub: 'New admission',
      icon: UserPlus,
      color: 'bg-emerald-600 text-white',
      badge: '+ Section/Field',
      onClick: onAddStudent,
    },
    {
      id: 'quick-view-sims',
      label: 'Students Register',
      sub: 'Classes & roll nos',
      icon: Users,
      color: 'bg-indigo-600 text-white',
      badge: 'SIMS',
      onClick: onOpenSims,
    },
    {
      id: 'quick-gen-pdf',
      label: 'Generate PDF',
      sub: 'Official school format',
      icon: FileText,
      color: 'bg-rose-600 text-white',
      badge: 'Master Tool',
      onClick: onOpenPdfExport,
    },
    {
      id: 'quick-holidays',
      label: 'Holiday Calendar',
      sub: 'Sundays & holidays',
      icon: Palmtree,
      color: 'bg-amber-600 text-white',
      badge: 'Offline DB',
      onClick: onOpenHolidays,
    },
    {
      id: 'quick-summary',
      label: "Today's Summary",
      sub: 'Class analytics',
      icon: BarChart3,
      color: 'bg-teal-600 text-white',
      badge: 'Reports',
      onClick: onOpenSummary,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {actions.map(act => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              id={act.id}
              onClick={act.onClick}
              className="flex flex-col items-start p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-300 text-left transition-all active:scale-[0.98] shadow-2xs group"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-2 rounded-lg ${act.color} shadow-xs group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">
                  {act.badge}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                {act.label}
              </span>
              <span className="text-[10px] text-slate-500 truncate w-full mt-0.5">
                {act.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
