import React, { useState, useEffect, useMemo } from 'react';
import { X, SlidersHorizontal, AlertCircle, Loader2 } from 'lucide-react';
import { leadsAPI, usersAPI } from '../../services/api';
import SearchableSelect from '../common/SearchableSelect';
import toast from 'react-hot-toast';

export default function BulkUpdateModal({
  isOpen,
  onClose,
  selectedLeadIds = [],
  domainsList = [],
  usersList = [],
  stages = [],
  isAdmin = false,
  onSuccess,
}) {
  const [selectedField, setSelectedField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [localUsers, setLocalUsers] = useState(usersList || []);
  const [localStages, setLocalStages] = useState(stages || []);

  // Fetch users if admin and usersList is not yet populated
  useEffect(() => {
    if (isOpen && isAdmin) {
      if (usersList && usersList.length > 0) {
        setLocalUsers(usersList);
      } else {
        usersAPI.getAll({ limit: 200, is_active: 1 })
          .then((res) => setLocalUsers(res.data || []))
          .catch(() => {});
      }
    }
  }, [isOpen, isAdmin, usersList]);

  // Fetch stages if not yet populated
  useEffect(() => {
    if (isOpen) {
      if (stages && stages.length > 0) {
        setLocalStages(stages);
      } else {
        leadsAPI.getStages()
          .then((res) => {
            const list = res?.data || (Array.isArray(res) ? res : []);
            setLocalStages(list);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, stages]);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSelectedField('');
      setFieldValue('');
      setLoading(false);
    }
  }, [isOpen]);

  const availableFields = useMemo(() => {
    const fields = [
      { id: 'title', label: 'Lead Name', type: 'text' },
      { id: 'stage_id', label: 'Lead Stage', type: 'stage' },
      { id: 'expected_close_date', label: 'Closing Date', type: 'date' },
      { id: 'lead_type', label: 'Lead Type', type: 'select', options: ['New Business', 'Existing Business', 'Renewal'] },
      { id: 'description', label: 'Description', type: 'textarea' },
      { id: 'next_visit', label: 'Next Visit', type: 'date' },
      { id: 'actual_scheduled_week', label: 'Actual Scheduled Week', type: 'text', placeholder: 'e.g. W42 or Week 42' },
      { id: 'domain_id', label: 'Domain', type: 'domain' },
      { id: 'rescheduled_week', label: 'Rescheduled Week', type: 'text', placeholder: 'e.g. W44 or Week 44' },
      { id: 'on_hold_reason', label: 'On Hold Reason', type: 'textarea', placeholder: 'Enter on hold reason...' },
    ];

    // Change Ownership is only available to Admin
    if (isAdmin) {
      fields.push({
        id: 'assigned_to',
        label: 'Change Ownership',
        type: 'user',
        placeholder: 'Select new owner...',
      });
    }

    return fields;
  }, [isAdmin]);

  if (!isOpen) return null;

  const currentFieldConfig = availableFields.find((f) => f.id === selectedField);

  const handleFieldChange = (e) => {
    const newField = e.target.value;
    setSelectedField(newField);
    setFieldValue('');
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!selectedField) {
      toast.error('Please select a field to update');
      return;
    }

    if (!selectedLeadIds || selectedLeadIds.length === 0) {
      toast.error('No leads selected');
      return;
    }

    if (currentFieldConfig?.type === 'user' && (!fieldValue || String(fieldValue).trim() === '')) {
      toast.error('Please select a new owner');
      return;
    }

    if (currentFieldConfig?.type === 'stage' && (!fieldValue || String(fieldValue).trim() === '')) {
      toast.error('Please select a stage');
      return;
    }

    setLoading(true);
    try {
      const res = await leadsAPI.bulkUpdate({
        lead_ids: selectedLeadIds,
        field: selectedField,
        value: fieldValue,
      });

      toast.success(
        res.data?.message ||
          `Successfully updated ${selectedLeadIds.length} lead${selectedLeadIds.length === 1 ? '' : 's'}`
      );
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Bulk update error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to bulk update leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-blue-600" />
              Bulk Update
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Updating <strong className="text-blue-700 font-semibold">{selectedLeadIds.length}</strong> selected{' '}
              {selectedLeadIds.length === 1 ? 'lead' : 'leads'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4">
            {/* Field Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Select Field
              </label>
              <select
                value={selectedField}
                onChange={handleFieldChange}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium"
              >
                <option value="">-- Select Field --</option>
                {availableFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Value Input */}
            {selectedField && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  {currentFieldConfig?.type === 'user' ? 'Select New Lead Owner' : `New Value for ${currentFieldConfig?.label}`}
                </label>

                {currentFieldConfig?.type === 'text' && (
                  <input
                    type="text"
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={currentFieldConfig.placeholder || `Enter ${currentFieldConfig.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    autoFocus
                  />
                )}

                {currentFieldConfig?.type === 'date' && (
                  <div className="relative">
                    <input
                      type="date"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      autoFocus
                    />
                  </div>
                )}

                {currentFieldConfig?.type === 'select' && (
                  <select
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                    autoFocus
                  >
                    <option value="">-- Select {currentFieldConfig.label} --</option>
                    {currentFieldConfig.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {currentFieldConfig?.type === 'domain' && (
                  <select
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                    autoFocus
                  >
                    <option value="">-- Select Domain --</option>
                    {domainsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}

                {currentFieldConfig?.type === 'stage' && (
                  <div className="space-y-2">
                    <select
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer font-medium"
                      autoFocus
                    >
                      <option value="">-- Select Stage --</option>
                      {localStages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {fieldValue && (
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              localStages.find((s) => String(s.id) === String(fieldValue))?.color || '#3B82F6',
                          }}
                        />
                        <span className="font-semibold text-gray-700">
                          Selected Stage: {localStages.find((s) => String(s.id) === String(fieldValue))?.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Change Ownership: Searchable user selection for Admin */}
                {currentFieldConfig?.type === 'user' && (
                  <SearchableSelect
                    value={fieldValue}
                    onChange={(val) => setFieldValue(val)}
                    options={localUsers.map((u) => ({
                      value: u.id,
                      label: u.name,
                      subtext: u.role_name || u.role || u.email || '',
                    }))}
                    placeholder="-- Search & Select New Owner --"
                    className="w-full"
                    required
                  />
                )}

                {currentFieldConfig?.type === 'textarea' && (
                  <textarea
                    rows={4}
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={currentFieldConfig.placeholder || `Enter ${currentFieldConfig.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                    autoFocus
                  />
                )}

                <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} className="text-gray-400 shrink-0" />
                  This value will be applied to all {selectedLeadIds.length} selected records.
                </p>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !selectedField ||
                (currentFieldConfig?.type === 'user' && !fieldValue) ||
                (currentFieldConfig?.type === 'stage' && !fieldValue)
              }
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>{loading ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
