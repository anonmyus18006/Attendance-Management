import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, Save, Check } from 'lucide-react';
import { Student, SchoolClass, Section, CustomField } from '../../types';
import { db } from '../../database/db';

interface StudentFormModalProps {
  isOpen: boolean;
  editingStudent?: Student | null;
  classes: SchoolClass[];
  sections: Section[];
  onClose: () => void;
  onSaved: (student: Student) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  editingStudent,
  classes,
  sections,
  onClose,
  onSaved,
}) => {
  const [classId, setClassId] = useState<string>(classes[0]?.id || '');
  const [sectionId, setSectionId] = useState<string>('');
  const [rollNo, setRollNo] = useState<number>(1);
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [examRollNo, setExamRollNo] = useState('');
  const [feesPending, setFeesPending] = useState<number>(0);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // Update sections when classId changes
  const classSections = sections.filter(s => s.classId === classId);

  useEffect(() => {
    if (editingStudent) {
      setClassId(editingStudent.classId);
      setSectionId(editingStudent.sectionId);
      setRollNo(editingStudent.rollNo);
      setName(editingStudent.name);
      setFatherName(editingStudent.fatherName);
      setMotherName(editingStudent.motherName);
      setDob(editingStudent.dob || '');
      setAddress(editingStudent.address || '');
      setExamRollNo(editingStudent.examRollNo || '');
      setFeesPending(editingStudent.feesPending || 0);

      // Fetch custom values
      const cfs = db.getApplicableCustomFieldsForStudent(editingStudent);
      const vals: Record<string, string> = {};
      cfs.forEach(cf => {
        vals[cf.id] = db.getCustomFieldValue(editingStudent.id, cf.id) || '';
      });
      setCustomValues(vals);
    } else {
      const initialClass = classes[0]?.id || '';
      setClassId(initialClass);
      const firstSec = sections.find(s => s.classId === initialClass);
      const initialSecId = firstSec?.id || '';
      setSectionId(initialSecId);

      // Auto-suggest next roll number
      if (initialClass && initialSecId) {
        const nextRoll = db.getNextAvailableRollNo(initialClass, initialSecId);
        setRollNo(nextRoll);
      } else {
        setRollNo(1);
      }

      setName('');
      setFatherName('');
      setMotherName('');
      setDob('');
      setAddress('');
      setExamRollNo('');
      setFeesPending(0);
      setCustomValues({});
    }
    setError('');
  }, [editingStudent, isOpen, classes, sections]);

  // When class changes in Add Mode, auto-update section and next roll number
  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId);
    const firstSec = sections.find(s => s.classId === newClassId);
    const newSecId = firstSec?.id || '';
    setSectionId(newSecId);
    if (!editingStudent && newClassId && newSecId) {
      setRollNo(db.getNextAvailableRollNo(newClassId, newSecId));
    }
  };

  const handleSectionChange = (newSecId: string) => {
    setSectionId(newSecId);
    if (!editingStudent && classId && newSecId) {
      setRollNo(db.getNextAvailableRollNo(classId, newSecId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fatherName.trim() || !classId || !sectionId) {
      setError('Please fill in student name, father name, class, and section.');
      return;
    }

    if (rollNo <= 0) {
      setError('Roll number must be a positive integer.');
      return;
    }

    // Check unique constraint: (classId, sectionId, rollNo)
    const duplicate = db.findDuplicateRollNo(
      classId,
      sectionId,
      rollNo,
      editingStudent?.id
    );
    if (duplicate) {
      setError(`Roll number ${rollNo} is already assigned to "${duplicate.name}" in this class/section.`);
      return;
    }

    try {
      let saved: Student;
      if (editingStudent) {
        saved = db.updateStudent(editingStudent.id, {
          classId,
          sectionId,
          rollNo: Number(rollNo),
          name: name.trim(),
          fatherName: fatherName.trim(),
          motherName: motherName.trim(),
          dob: dob || '',
          address: address.trim() || '',
          examRollNo: examRollNo.trim() || undefined,
          feesPending: Number(feesPending) || 0,
        });
      } else {
        saved = db.addStudent({
          classId,
          sectionId,
          rollNo: Number(rollNo),
          name: name.trim(),
          fatherName: fatherName.trim(),
          motherName: motherName.trim(),
          dob: dob || '',
          address: address.trim() || '',
          examRollNo: examRollNo.trim() || undefined,
          feesPending: Number(feesPending) || 0,
        });
      }

      // Save custom fields
      Object.entries(customValues).forEach(([fieldId, value]) => {
        db.setCustomFieldValue(saved.id, fieldId, value);
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save student record');
    }
  };

  if (!isOpen) return null;

  const applicableCustomFields = db.getCustomFields(classId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Student Record' : 'Register New Student'}
              </h3>
              <p className="text-xs text-slate-500">
                GHS Fatehpuria NK (Code: 3005) • Offline SIMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 my-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {/* Class, Section, Roll No Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Class *</label>
              <select
                value={classId}
                onChange={e => handleClassChange(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600"
                required
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Class {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Section *</label>
              <select
                value={sectionId}
                onChange={e => handleSectionChange(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-600"
                required
              >
                {classSections.map(s => (
                  <option key={s.id} value={s.id}>
                    Sec {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Roll No *</label>
              <input
                type="number"
                min="1"
                value={rollNo}
                onChange={e => setRollNo(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Student Full Name */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Student Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* Parents Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Father&apos;s Name *</label>
              <input
                type="text"
                placeholder="e.g. Suresh Sharma"
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Mother&apos;s Name</label>
              <input
                type="text"
                placeholder="e.g. Sunita Devi"
                value={motherName}
                onChange={e => setMotherName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* DOB & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Exam / Board Roll No</label>
              <input
                type="text"
                placeholder="e.g. HBSE-10-3005-01"
                value={examRollNo}
                onChange={e => setExamRollNo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Address / Village</label>
            <input
              type="text"
              placeholder="e.g. Village Fatehpuria, District Sirsa, Haryana"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Fees Pending */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">Pending Fees (₹)</label>
            <input
              type="number"
              min="0"
              value={feesPending}
              onChange={e => setFeesPending(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Dynamic Custom Fields */}
          {applicableCustomFields.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Additional School Fields
              </span>
              {applicableCustomFields.map(cf => (
                <div key={cf.id}>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    {cf.name} {cf.isRequired && '*'}
                  </label>
                  {cf.type === 'dropdown' && cf.options ? (
                    <select
                      value={customValues[cf.id] || ''}
                      onChange={e => setCustomValues({ ...customValues, [cf.id]: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                      required={cf.isRequired}
                    >
                      <option value="">Select option</option>
                      {cf.options.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                      value={customValues[cf.id] || ''}
                      onChange={e => setCustomValues({ ...customValues, [cf.id]: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                      required={cf.isRequired}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{editingStudent ? 'Save Changes' : 'Register Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
