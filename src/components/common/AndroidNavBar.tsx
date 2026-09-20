import React from 'react';
import { LayoutDashboard, Users, CalendarCheck, Settings } from 'lucide-react';

export type NavigationTab = 'dashboard' | 'sims' | 'attendance' | 'settings';

interface AndroidNavBarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard' as NavigationTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sims' as NavigationTab, label: 'SIMS Register', icon: Users },
    { id: 'attendance' as NavigationTab, label: 'Attendance', icon: CalendarCheck },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="w-full bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around z-40 select-none safe-area-bottom">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`nav-btn-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center min-w-[72px] min-h-[48px] px-2 py-1 rounded-xl transition-all ${
              isActive
                ? 'text-blue-700 font-semibold'
                : 'text-slate-500 hover:text-slate-800 font-normal'
            }`}
          >
            <div
              className={`p-1 rounded-full transition-all ${
                isActive ? 'bg-blue-100 text-blue-700 shadow-xs' : 'bg-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
