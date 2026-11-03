import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';

import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { tasksAPI } from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';

const statusClasses = {
  'Not Started': 'bg-gray-100 text-gray-700',
  Deferred: 'bg-orange-50 text-orange-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  'Waiting for Input': 'bg-yellow-100 text-yellow-700'
};

const formatDate = (value, pattern = 'EEE, dd-MMM-yyyy') => {
  if (!value) return '-';
  try {
    return format(new Date(value), pattern);
  } catch {
    return value;
  }
};

const formatDateTime = value => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'EEE, dd-MMM-yyyy hh:mm a');
  } catch {
    return value;
  }
};

export default function TaskDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getById(id);
      const payload = response?.data ?? response;
      const taskData = payload?.data ?? payload;
      setTask(taskData || null);
    } catch (error) {
      console.error('Load task error:', error);
      toast.error(error?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [id]);

  const handleMarkCompleted = async () => {
    if (!task) return;

    try {
      setSaving(true);
      await tasksAPI.update(id, {
        task_subject: task.task_subject,
        due_date: task.due_date,
        completed_date: new Date().toISOString().split('T')[0],
        task_status: 'Completed',
        reminder: task.reminder ? 1 : 0,
        priority: task.priority || 'Medium',
        task_to_type: task.task_to_type || null,
        task_to_id: task.task_to_id || null,
        related_to_type: task.related_to_type || null,
        related_to_id: task.related_to_id || null,
        description: task.description || null
      });
      toast.success('Task marked as completed');
      await loadTask();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Failed to complete task');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Opens the confirm modal — does NOT delete yet.
   */
  const handleDelete = () => {
    setShowMenu(false);
    setConfirmDelete(true);
  };

  /**
   * Performs the delete when the user confirms.
   */
  const confirmDeleteTask = async () => {
    try {
      setDeleting(true);
      await tasksAPI.remove(id);
      toast.success('Task deleted successfully');
      navigate('/tasks');
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const closeConfirmDelete = () => {
    if (deleting) return;
    setConfirmDelete(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            Loading task...
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h2 className="font-semibold text-gray-800">Task not found</h2>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Back to Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusClass =
    statusClasses[task.task_status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen  text-[#334155]">
      {/* DELETE CONFIRMATION */}
      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.task_subject}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteTask}
        onCancel={closeConfirmDelete}
        loading={deleting}
      />

      {/* HEADER */}
      <div className=" border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="mt-1 p-1 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={21} />
              </button>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[20px] font-semibold text-[#111827]">
                    {task.task_subject}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                  >
                    {task.task_status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2 text-sm text-[#718096]">
                  <span>Task</span>
                  <span>·</span>
                  <span>Owned by {task.task_owner_name || '--'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {task.task_status !== 'Completed' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleMarkCompleted}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 size={16} />
                  {saving ? 'Updating...' : 'Mark as Completed'}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(`/tasks/${id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Edit size={16} />
                Edit
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                >
                  <MoreHorizontal size={18} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-11 z-50 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        {/* FORM DETAILS */}
        <section className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Form Details
            </h2>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-x-12 gap-y-5">
              <DetailRow label="Priority" value={task.priority || '-'} />
              <DetailRow label="Due Date" value={formatDate(task.due_date)} />
              <DetailRow
                label="Task Status"
                value={task.task_status || '-'}
              />
              <DetailRow
                label="Completed Date"
                value={formatDate(task.completed_date)}
              />
              <DetailRow
                label="Related To"
                value={
                  task.related_name || task.related_to_id || '-'
                }
              />
              <DetailRow
                label="Task Owner"
                value={task.task_owner_name || '-'}
              />
            </div>
          </div>
        </section>

        {/* TASK INFORMATION */}
        <section className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Task Information
            </h2>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <DetailRow
                label="Task Subject"
                value={task.task_subject || '-'}
              />
              <DetailRow label="Due Date" value={formatDate(task.due_date)} />
              <DetailRow
                label="Task Status"
                value={task.task_status || '-'}
              />
              <DetailRow
                label="Completed Date"
                value={formatDate(task.completed_date)}
              />
              <DetailRow
                label="Created By"
                value={task.task_owner_name || '-'}
              />
              <DetailRow
                label="Modified By"
                value={task.task_owner_name || '-'}
              />
              <DetailRow
                label="Created Time"
                value={formatDateTime(task.created_at)}
              />
              <DetailRow
                label="Closed Time"
                value={
                  task.task_status === 'Completed'
                    ? formatDateTime(task.completed_date)
                    : '-'
                }
              />
              <DetailRow
                label="Modified Time"
                value={formatDateTime(task.updated_at)}
              />
              <DetailRow
                label="Reminder"
                value={task.reminder ? 'Enabled' : 'Disabled'}
              />
            </div>
          </div>
        </section>

        {/* ADDITIONAL INFORMATION */}
        <section className="bg-white border border-gray-200 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Additional Information
            </h2>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <DetailRow label="Priority" value={task.priority || '-'} />
              <DetailRow
                label="Task Owner"
                value={task.task_owner_name || '-'}
              />
              <DetailRow
                label="Task To"
                value={task.task_to_name || '-'}
              />
              <DetailRow
                label="Related To"
                value={
                  task.related_name || task.related_to_id || '-'
                }
              />

              <div className="col-span-2">
                <div className="text-sm text-gray-500 mb-1">
                  Description
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {task.description || '-'}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[165px_1fr] items-start gap-4">
      <div className="text-sm text-[#64748b]">{label}</div>
      <div className="text-sm text-[#334155] font-medium break-words">
        {value}
      </div>
    </div>
  );
}