import React, { useState, useEffect } from 'react';
import { X, Target, Trash2, Plus, Edit2, Star } from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';

export function DashboardDetailsModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isEdit = false
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (initialData && isEdit) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setVisibility(initialData.visibility || 'public');
      setIsDefault(Boolean(initialData.is_default));
    } else {
      setName('');
      setDescription('');
      setVisibility('public');
      setIsDefault(false);
    }
  }, [initialData, isEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Dashboard name is required');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      visibility,
      is_default: isDefault ? 1 : 0
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in">
        <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-sm font-bold text-gray-900">
            {isEdit ? 'Edit Dashboard Information' : 'Create New Dashboard'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Dashboard Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Q4 Executive Sales Overview"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description of this dashboard..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Access Visibility</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Shared / Public (All workspace members)</option>
              <option value="private">Private (Only you)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultCheckbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="isDefaultCheckbox" className="text-xs font-medium text-gray-700 cursor-pointer flex items-center gap-1.5">
              <Star size={13} className={isDefault ? 'fill-amber-400 text-amber-500' : 'text-gray-400'} />
              <span>Set as default dashboard for workspace</span>
            </label>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              {isEdit ? 'Update Dashboard' : 'Create Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ManageTargetsModal({ isOpen, onClose, onTargetChanged }) {
  const [targets, setTargets] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTarget, setEditingTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [metric, setMetric] = useState('leads_estimated_value');
  const [targetValue, setTargetValue] = useState('');
  const [targetPeriod, setTargetPeriod] = useState('monthly');
  const [userId, setUserId] = useState('');

  const loadTargets = () => {
    setLoading(true);
    analyticsAPI.getTargets()
      .then(res => {
        setTargets(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load targets');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      loadTargets();
      setShowForm(false);
      setEditingTarget(null);
      analyticsAPI.getSchemaMetadata()
        .then(res => {
          if (res.data?.users) {
            setUsersList(res.data.users);
          }
        })
        .catch(err => console.error('Error fetching users:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const [targetToDelete, setTargetToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (t) => {
    setEditingTarget(t);
    setName(t.name);
    setMetric(t.metric);
    setTargetValue(t.target_value);
    setTargetPeriod(t.target_period || 'monthly');
    setUserId(t.user_id ? String(t.user_id) : '');
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingTarget(null);
    setName('');
    setMetric('leads_estimated_value');
    setTargetValue('');
    setTargetPeriod('monthly');
    setUserId('');
    setShowForm(true);
  };

  const handleDelete = (t) => {
    setTargetToDelete(t);
  };

  const handleConfirmDelete = () => {
    if (!targetToDelete) return;
    setIsDeleting(true);
    analyticsAPI.deleteTarget(targetToDelete.id)
      .then(() => {
        toast.success('Target removed');
        setTargetToDelete(null);
        setIsDeleting(false);
        loadTargets();
        if (onTargetChanged) onTargetChanged();
      })
      .catch(err => {
        toast.error(err.message || 'Error deleting target');
        setIsDeleting(false);
      });
  };

  const handleSaveTarget = (e) => {
    e.preventDefault();
    if (!name.trim() || !targetValue) {
      toast.error('Name and target value are required');
      return;
    }

    const payload = {
      name: name.trim(),
      metric,
      target_value: Number(targetValue),
      target_period: targetPeriod,
      user_id: userId ? Number(userId) : null
    };

    const action = editingTarget
      ? analyticsAPI.updateTarget(editingTarget.id, payload)
      : analyticsAPI.createTarget(payload);

    action
      .then(() => {
        toast.success(editingTarget ? 'Target updated' : 'Target created');
        setShowForm(false);
        loadTargets();
        if (onTargetChanged) onTargetChanged();
      })
      .catch(err => toast.error(err.message || 'Error saving target'));
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in">
        <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Manage Benchmarks & User Targets</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {showForm ? (
            <form onSubmit={handleSaveTarget} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <div className="text-xs font-bold text-gray-800">
                {editingTarget ? 'Edit Target Benchmark' : 'Add New Target Benchmark'}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Target Title *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. October Sales Target"
                  required
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Assignee / Target Scope</label>
                  <select
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value="">All Users (Team Benchmark)</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.name} (User #{u.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Duration Period</label>
                  <select
                    value={targetPeriod}
                    onChange={e => setTargetPeriod(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Metric Type</label>
                  <select
                    value={metric}
                    onChange={e => setMetric(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value="leads_estimated_value">Leads Revenue Value (₹)</option>
                    <option value="leads_count">Lead Volume / Count</option>
                    <option value="visits_count">Customer Visits Count</option>
                    <option value="calls_count">Calls Logged Count</option>
                    <option value="tasks_count">Completed Tasks Count</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Target Value *</label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    placeholder="e.g. 1500000"
                    required
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-gray-600 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  Save Target
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-gray-500">Configured targets by user and duration:</span>
              <button
                type="button"
                onClick={handleNew}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={13} /> Add Target
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">Loading targets...</div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">No targets configured yet.</div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {targets.map(t => (
                <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{t.name}</h4>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {t.target_period || 'Monthly'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 capitalize mt-0.5">
                      <span>{t.metric?.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <span className={t.user_name ? 'text-indigo-600 font-semibold' : 'text-gray-500'}>
                        {t.user_name ? `👤 ${t.user_name}` : '👥 All Users'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-extrabold text-blue-600">
                      ₹{Number(t.target_value).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      title="Edit target"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete target"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 px-5 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(targetToDelete)}
        title="Delete Target Benchmark"
        message={targetToDelete ? `Are you sure you want to delete "${targetToDelete.name}"?` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTargetToDelete(null)}
      />
    </div>
  );
}

