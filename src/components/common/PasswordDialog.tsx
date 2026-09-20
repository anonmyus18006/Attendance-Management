import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { SecurityService } from '../../services/securityService';

interface PasswordDialogProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  expectedHash?: string;
  expectedSalt?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
  isOpen,
  title,
  subtitle = 'Enter password to authorize modification of student records.',
  expectedHash,
  expectedSalt,
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      if (!expectedHash) {
        // No password configured yet, allow directly
        setIsVerifying(false);
        setPassword('');
        onSuccess();
        return;
      }

      const isValid = await SecurityService.verifyPassword(password, expectedHash, expectedSalt);
      if (isValid) {
        setIsVerifying(false);
        setPassword('');
        onSuccess();
      } else {
        setIsVerifying(false);
        setError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setIsVerifying(false);
      setError('Authentication check failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-full">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter security password"
              autoFocus
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="password-cancel-btn"
              onClick={() => {
                setPassword('');
                setError('');
                onCancel();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="password-submit-btn"
              disabled={isVerifying}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isVerifying ? 'Verifying...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
