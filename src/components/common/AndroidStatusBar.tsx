import React from 'react';
import { Wifi, BatteryMedium, ShieldCheck, Plane } from 'lucide-react';
import { useLiveClock } from '../../hooks/useLiveClock';

interface AndroidStatusBarProps {
  isOfflineMode?: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ isOfflineMode = true }) => {
  const { time24 } = useLiveClock();
  const timeShort = time24.slice(0, 5); // "HH:MM"

  return (
    <div className="w-full bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex items-center justify-between select-none z-50 border-b border-slate-800/80">
      <div className="flex items-center space-x-2 font-medium">
        <span>{timeShort}</span>
        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
          <ShieldCheck className="w-2.5 h-2.5" /> 100% Offline
        </span>
      </div>

      <div className="flex items-center space-x-2.5 text-slate-300">
        <span className="text-[10px] text-slate-400 font-mono">IST (+5:30)</span>
        <Wifi className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex items-center space-x-0.5">
          <span className="w-0.5 h-1.5 bg-slate-200 rounded-xs"></span>
          <span className="w-0.5 h-2 bg-slate-200 rounded-xs"></span>
          <span className="w-0.5 h-2.5 bg-slate-200 rounded-xs"></span>
          <span className="w-0.5 h-3 bg-slate-200 rounded-xs"></span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[11px] font-mono">98%</span>
          <BatteryMedium className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
