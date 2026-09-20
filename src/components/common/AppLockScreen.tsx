/**
 * App Lock Screen
 * Enforces authentication on launch or return when App Lock is enabled in Settings.
 */

import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, School, Eye, EyeOff } from 'lucide-react';
import { SecurityService } from '../../security/SecurityService';

interface AppLockScreenProps {
  schoolName: string;
  schoolCode: string;
  storedHash?: string;
  storedSalt?: string;
  onUnlocked: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  schoolName,
  schoolCode,
  storedHash,
  storedSalt,
  onUnlocked,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the security password / PIN.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const isValid = await SecurityService.verifyPassword(password.trim(), storedHash, storedSalt);
      if (isValid) {
        SecurityService.unlockApp();
        onUnlocked();
      } else {
        setError('Incorrect security password. Please try again.');
        setPassword('');
      }
    } catch {
      setError('Failed to verify credentials. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white safe-area-top safe-area-bottom">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* School Emblem / Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-xl border border-blue-400/30">
          <School className="w-10 h-10 text-white" />
        </div>

        {/* School Name & Lock Notice */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-white">{schoolName}</h1>
          <p className="text-xs text-blue-300">School Code: {schoolCode}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs mt-2">
            <Lock className="w-3.5 h-3.5" />
            <span>App Lock Protected</span>
          </div>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="w-full space-y-4 pt-2">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter Security Password or PIN"
              autoFocus
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-center text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium tracking-wide pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-red-400 text-xs bg-red-950/50 py-2 px-3 rounded-lg border border-red-800/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{isVerifying ? 'Verifying...' : 'Unlock Application'}</span>
          </button>
        </form>

        <p className="text-xs text-slate-400">
          100% Offline School & Attendance Management System
        </p>
      </div>
    </div>
  );
};
