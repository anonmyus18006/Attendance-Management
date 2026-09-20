import React from 'react';
import { ArrowLeft, Lock, Unlock, School, Bell } from 'lucide-react';
import { SchoolSettings, AppSettings } from '../../types';

interface TopBarProps {
  schoolSettings: SchoolSettings;
  appSettings: AppSettings;
  title?: string;
  onBack?: () => void;
  onToggleLock?: () => void;
  onOpenNotifications?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  schoolSettings,
  appSettings,
  title,
  onBack,
  onToggleLock,
  onOpenNotifications,
}) => {
  return (
    <header className="w-full bg-blue-900 text-white px-3.5 py-2.5 shadow-md flex items-center justify-between z-40 border-b border-blue-950">
      <div className="flex items-center space-x-2.5 min-w-0">
        {onBack ? (
          <button
            id="topbar-back-btn"
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full hover:bg-blue-800 active:bg-blue-950 text-white transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-1.5 bg-blue-800/80 rounded-lg text-blue-200 border border-blue-700/50">
            <School className="w-5 h-5" />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold truncate leading-tight tracking-tight text-white">
              {title || schoolSettings.name}
            </h1>
            {schoolSettings.code && (
              <span className="text-[10px] font-bold bg-amber-400 text-blue-950 px-1.5 py-0.2 rounded-xs shrink-0 tracking-wide">
                CODE {schoolSettings.code}
              </span>
            )}
          </div>
          {!title && (
            <p className="text-[11px] text-blue-200 truncate leading-tight mt-0.5">
              {schoolSettings.district}, {schoolSettings.state} • Offline SIS
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Lock / Unlock Student Edit Status */}
        {appSettings.isStudentEditLocked ? (
          <button
            id="topbar-lock-btn"
            onClick={onToggleLock}
            className="flex items-center gap-1 text-[11px] bg-red-950/70 text-red-200 border border-red-700/60 px-2 py-1 rounded-lg hover:bg-red-900 transition-colors"
            title="Student Editing Locked. Tap to unlock."
          >
            <Lock className="w-3.5 h-3.5 text-red-300" />
            <span className="font-semibold hidden xs:inline">Locked</span>
          </button>
        ) : (
          <button
            id="topbar-unlock-btn"
            onClick={onToggleLock}
            className="flex items-center gap-1 text-[11px] bg-emerald-950/70 text-emerald-200 border border-emerald-700/60 px-2 py-1 rounded-lg hover:bg-emerald-900 transition-colors"
            title="Student Editing Unlocked. Tap to lock."
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-semibold hidden xs:inline">Unlocked</span>
          </button>
        )}

        {/* Quick Notification Bell */}
        {onOpenNotifications && (
          <button
            id="topbar-bell-btn"
            onClick={onOpenNotifications}
            className="p-1.5 rounded-lg bg-blue-800/80 hover:bg-blue-700 active:bg-blue-950 text-blue-100 transition-colors relative"
            title="8:00 AM Attendance Reminder Status"
          >
            <Bell className="w-4 h-4" />
            {appSettings.notificationReminderEnabled && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full"></span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
