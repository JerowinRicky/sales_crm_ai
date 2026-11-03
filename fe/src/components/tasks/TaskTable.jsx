import React from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Pagination from '../common/Pagination';

const STATUS_STYLES = {
  'Not Started': 'bg-gray-100 text-gray-700',
  Deferred: 'bg-orange-50 text-orange-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  'Waiting for Input': 'bg-yellow-50 text-yellow-700'
};

export default function TaskTable({
  tasks,
  loading,
  onView,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
  onLimitChange
}) {
  const formatDate = date => {
    if (!date) return '--';
    try {
      return format(new Date(date), 'EEE, dd-MMM-yyyy');
    } catch {
      return '--';
    }
  };

  const formatCreatedTime = date => {
    if (!date) return '--';
    try {
      return format(new Date(date), 'EEE, dd-MMM-yyyy HH:mm');
    } catch {
      return '--';
    }
  };

  const getInitials = subject => {
    if (!subject) return 'TA';
    return subject
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleEdit = (e, id) => {
    e.stopPropagation();
    onEdit(id);
  };

  const handleView = (e, id) => {
    e.stopPropagation();
    onView(id);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-500">Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-gray-400 text-lg">✓</span>
          </div>
          <h3 className="text-base font-semibold text-gray-700">
            No Tasks Found
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            There are no tasks matching your current filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-[340px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Task Subject
                </span>
              </th>
              <th className="w-[160px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Due Date
                </span>
              </th>
              <th className="w-[160px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Completed Date
                </span>
              </th>
              <th className="w-[150px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Status
                </span>
              </th>
              <th className="w-[220px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Description
                </span>
              </th>
              <th className="w-[190px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Created Time
                </span>
              </th>
              <th className="w-[160px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Task Owner
                </span>
              </th>
              <th className="w-[200px] px-4 py-3.5 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Related To
                </span>
              </th>
              <th className="w-[140px] px-4 py-3.5 text-center">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Actions
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {tasks.map(task => (
              <tr
                key={task.id}
                onClick={() => onView(task.id)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-indigo-600">
                        {getInitials(task.task_subject)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate max-w-[260px]">
                        {task.task_subject}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className="text-sm text-gray-700 whitespace-nowrap">
                    {formatDate(task.due_date)}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span className="text-sm text-gray-700 whitespace-nowrap">
                    {formatDate(task.completed_date)}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
                      STATUS_STYLES[task.task_status] ||
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {task.task_status || '--'}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <div
                    className="text-sm text-gray-600 truncate max-w-[200px]"
                    title={task.description || ''}
                  >
                    {task.description || '--'}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div
                    className="inline-flex px-3 py-1.5 rounded-md bg-gray-100 text-xs text-gray-600 whitespace-nowrap"
                    title={task.created_at || ''}
                  >
                    {formatCreatedTime(task.created_at)}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {task.task_owner_name || '--'}
                  </span>
                </td>

                <td className="px-4 py-4">
                  {task.related_name ? (
                    <div>
                      <div className="text-sm text-gray-800 font-medium truncate max-w-[180px]">
                        {task.related_name}
                      </div>
                      {task.related_to_type && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {task.related_to_type}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">--</span>
                  )}
                </td>

                {/* ACTIONS */}
                <td
                  className="px-4 py-4"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={e => handleView(e, task.id)}
                      title="View"
                      className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={e => handleEdit(e, task.id)}
                      title="Edit"
                      className="p-2 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={e => handleDelete(e, task.id)}
                      title="Delete"
                      className="p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.page || 1}
          totalPages={pagination.totalPages || 1}
          totalItems={pagination.total || 0}
          limit={pagination.limit || 15}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          itemName="tasks"
          loading={loading}
        />
      )}
    </div>
  );
}