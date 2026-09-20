import React from 'react';
import { Clock, Calendar, Sun, Palmtree } from 'lucide-react';
import { useLiveClock } from '../../hooks/useLiveClock';
import { db } from '../../database/db';

export const LiveClockWidget: React.FC = () => {
  const { time24, formattedDate, dayOfWeek, isSunday, dateStr } = useLiveClock();
  const holiday = db.isDateHoliday(dateStr);

  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white rounded-2xl p-4 shadow-lg border border-blue-700/40 relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="flex items-center space-x-1.5 text-blue-200 text-xs font-medium tracking-wide mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-300" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black font-mono tracking-tight text-white drop-shadow-xs">
              {time24}
            </span>
            <span className="text-[11px] text-blue-300 font-semibold uppercase tracking-wider">
              IST (24H)
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1 text-xs text-blue-200 bg-blue-950/60 border border-blue-700/50 px-2.5 py-1 rounded-full font-medium">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Asia/Kolkata</span>
          </div>

          <div className="mt-2">
            {isSunday ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full">
                <Sun className="w-3 h-3 text-amber-400" /> Sunday (Non-School Day)
              </span>
            ) : holiday ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
                <Palmtree className="w-3 h-3 text-emerald-400" /> {holiday.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                School Working Day ({dayOfWeek})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
