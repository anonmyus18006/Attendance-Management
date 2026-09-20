import React, { useState } from 'react';
import { Palmtree, Plus, Trash2, Edit2, Calendar, Sun, AlertCircle } from 'lucide-react';
import { Holiday } from '../../types';
import { db } from '../../database/db';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface HolidayManagerProps {
  holidays: Holiday[];
  onHolidaysChange: () => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  holidays,
  onHolidaysChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name.trim()) {
      setError('Please provide both holiday date and name.');
      return;
    }

    try {
      if (editingHoliday) {
        db.updateHoliday(editingHoliday.id, {
          date,
          name: name.trim(),
          reason: reason.trim() || undefined,
          isRecurring,
        });
      } else {
        db.addHoliday({
          date,
          name: name.trim(),
          reason: reason.trim() || undefined,
          isRecurring,
        });
      }
      onHolidaysChange();
      setIsAdding(false);
      setEditingHoliday(null);
      setDate('');
      setName('');
      setReason('');
      setIsRecurring(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to save holiday');
    }
  };

  const handleStartEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setDate(h.date);
    setName(h.name);
    setReason(h.reason || '');
    setIsRecurring(h.isRecurring);
    setIsAdding(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      db.deleteHoliday(deleteTarget.id);
      onHolidaysChange();
      setDeleteTarget(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              School Holiday Calendar
            </h3>
            <p className="text-[11px] text-slate-500">
              Sundays &amp; listed holidays are automatically excluded from working days.
            </p>
          </div>
        </div>

        {!isAdding && (
          <button
            onClick={() => {
              setEditingHoliday(null);
              setDate('');
              setName('');
              setReason('');
              setIsRecurring(false);
              setIsAdding(true);
            }}
            className="flex items-center gap-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <form onSubmit={handleSave} className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 animate-in fade-in">
          <h4 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">
            {editingHoliday ? 'Edit School Holiday' : 'Mark Date as School Holiday'}
          </h4>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 mb-3 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Holiday Name *</label>
              <input
                type="text"
                placeholder="e.g. Independence Day, Diwali"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Reason / Category</label>
              <input
                type="text"
                placeholder="e.g. Gazetted National Holiday, State Celebration"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center space-x-2 sm:col-span-2 mt-1">
              <input
                type="checkbox"
                id="is-recurring-cb"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <label htmlFor="is-recurring-cb" className="text-xs text-slate-700 font-medium select-none">
                Annual recurring holiday (repeats every academic year on this date)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingHoliday(null);
                setError('');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
            >
              Save Holiday
            </button>
          </div>
        </form>
      )}

      {/* Sundays Notice */}
      <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl mb-3 text-xs text-blue-900">
        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          <strong>Automated Rule:</strong> All Sundays are automatically designated non-working days and are excluded from attendance percentage calculations.
        </span>
      </div>

      {/* Holidays List */}
      <div className="divide-y divide-slate-100">
        {holidays.map(h => {
          const dateObj = new Date(h.date + 'T00:00:00');
          const formatted = dateObj.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          return (
            <div key={h.id} className="py-3 flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{h.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {formatted} {h.isRecurring && '• (Annual)'}
                  </p>
                  {h.reason && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">{h.reason}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleStartEdit(h)}
                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  title="Edit Holiday"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(h)}
                  className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  title="Delete Holiday"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete School Holiday"
        message={`Are you sure you want to remove "${deleteTarget?.name}" (${deleteTarget?.date}) from the holiday calendar?`}
        confirmText="Delete Holiday"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
