import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, UserCheck, Play, Sparkles } from 'lucide-react';
import { SchoolClass, Section } from '../../types';
import { getClassAttendanceSummaryForDate, getTodayDateString } from '../../services/attendanceService';

interface AttendanceSliderProps {
  classes: SchoolClass[];
  sections: Section[];
  onTakeAttendance: (classId: string, sectionId: string) => void;
}

export const AttendanceSlider: React.FC<AttendanceSliderProps> = ({
  classes,
  sections,
  onTakeAttendance,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const todayStr = getTodayDateString();

  // Generate class/section pairs
  const pairs: { classObj: SchoolClass; sectionObj: Section }[] = [];
  classes.forEach(c => {
    const classSections = sections.filter(s => s.classId === c.id);
    classSections.forEach(s => {
      pairs.push({ classObj: c, sectionObj: s });
    });
  });

  // Auto-scroll every 4 seconds unless paused/hovered
  useEffect(() => {
    if (isPaused || pairs.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % pairs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, pairs.length]);

  if (pairs.length === 0) return null;

  const currentPair = pairs[activeIndex] || pairs[0];
  const summary = getClassAttendanceSummaryForDate(
    currentPair.classObj.id,
    currentPair.sectionObj.id,
    todayStr
  );

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Daily Attendance Carousel
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveIndex(prev => (prev - 1 + pairs.length) % pairs.length)}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            title="Previous Class"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-500 px-1">
            {activeIndex + 1}/{pairs.length}
          </span>
          <button
            onClick={() => setActiveIndex(prev => (prev + 1) % pairs.length)}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            title="Next Class"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tappable Card */}
      <div
        id={`attendance-card-${currentPair.classObj.name}-${currentPair.sectionObj.name}`}
        onClick={() => onTakeAttendance(currentPair.classObj.id, currentPair.sectionObj.id)}
        className="cursor-pointer bg-gradient-to-br from-slate-50 to-blue-50/60 hover:from-blue-50/80 hover:to-blue-100/60 rounded-xl p-3.5 border border-slate-200/80 hover:border-blue-300 transition-all shadow-xs group"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black text-slate-900 group-hover:text-blue-900 transition-colors">
                {currentPair.classObj.name} {currentPair.sectionObj.name}
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Today ({todayStr})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total Enrolled Students: <strong className="text-slate-800">{summary.totalStudents}</strong>
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-white group-hover:bg-blue-700 group-hover:text-white px-3 py-1.5 rounded-xl border border-blue-200 group-hover:border-transparent transition-all shadow-xs">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Take Attendance</span>
          </div>
        </div>

        {/* Minimal 3-pill attendance count as specified in prompt */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/70">
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg p-2 text-center">
            <span className="text-[10px] font-bold text-emerald-700 block uppercase">Present</span>
            <span className="text-base font-black text-emerald-800">{summary.presentCount}</span>
          </div>
          <div className="bg-red-50 border border-red-200/80 rounded-lg p-2 text-center">
            <span className="text-[10px] font-bold text-red-700 block uppercase">Absent</span>
            <span className="text-base font-black text-red-800">{summary.absentCount}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2 text-center">
            <span className="text-[10px] font-bold text-amber-700 block uppercase">Leave</span>
            <span className="text-base font-black text-amber-800">{summary.leaveCount}</span>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between">
          {summary.isNonWorkingDay ? (
            <span className="text-slate-500 font-semibold italic">{summary.nonWorkingReason || 'Non-working Day'}</span>
          ) : summary.isComplete ? (
            <>
              <span>Class Attendance Rate:</span>
              <span className="font-bold text-blue-900">{summary.percentage}%</span>
            </>
          ) : summary.markedStudents > 0 ? (
            <>
              <span className="text-amber-700 font-medium">In Progress:</span>
              <span className="font-bold text-amber-800">{summary.markedStudents} of {summary.totalStudents} marked</span>
            </>
          ) : (
            <span className="text-slate-400">Attendance not yet taken today</span>
          )}
        </div>
      </div>

      {/* Slider dots */}
      <div className="flex justify-center items-center gap-1.5 mt-3">
        {pairs.map((p, idx) => (
          <button
            key={`${p.classObj.id}-${p.sectionObj.id}`}
            onClick={() => setActiveIndex(idx)}
            className={`h-1.5 rounded-full transition-all ${
              idx === activeIndex ? 'w-5 bg-blue-700' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
            }`}
            title={`${p.classObj.name} ${p.sectionObj.name}`}
          />
        ))}
      </div>
    </div>
  );
};
