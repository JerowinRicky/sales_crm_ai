import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, User, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import { tasksAPI } from '../../services/api';

import TaskFilters from '../../components/tasks/TaskFilters';
import TaskTable from '../../components/tasks/TaskTable';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function TasksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'admin';

  const [tasks, setTasks] = useState([]);
  const [scope, setScope] = useState('me'); // 'me' (For Me Only) | 'all' (All Tasks)
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: ''
  });
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'lead' | 'normal'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, lead: 0, normal: 0 });

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    task: null
  });
  const [deleting, setDeleting] = useState(false);

  const loadTasks = useCallback(async (p = page, l = limit) => {
    try {
      setLoading(true);
      const params = {
        page: p,
        limit: l,
        scope: scope,
      };
      if (activeTab && activeTab !== 'all') {
        params.tab = activeTab;
      }
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.priority) {
        params.priority = filters.priority;
      }

      const res = await tasksAPI.getAll(params);
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setTasks(items);

      if (res?.pagination) {
        setPagination(res.pagination);
      }
      if (res?.counts) {
        setCounts(res.counts);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeTab, filters, scope]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks(page, limit);
    }, 200);
    return () => clearTimeout(timer);
  }, [page, limit, activeTab, filters, scope, loadTasks]);

  const handleScopeChange = (newScope) => {
    setScope(newScope);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  /**
   * Opens the confirm modal — does NOT delete yet.
   */
  const handleDelete = id => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    setConfirmDelete({
      isOpen: true,
      task
    });
  };

  /**
   * Performs the delete when user confirms.
   */
  const confirmDeleteTask = async () => {
    const { task } = confirmDelete;
    if (!task) return;

    try {
      setDeleting(true);

      await tasksAPI.remove(task.id);

      toast.success('Task deleted successfully');

      // Remove locally for instant feedback
      setTasks(prev => prev.filter(t => t.id !== task.id));

      closeConfirmDelete();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const closeConfirmDelete = () => {
    if (deleting) return;
    setConfirmDelete({ isOpen: false, task: null });
  };

  return (
    <div className="p-6">
      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Task"
        message={
          confirmDelete.task
            ? `Are you sure you want to delete "${confirmDelete.task.task_subject}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteTask}
        onCancel={closeConfirmDelete}
        loading={deleting}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {scope === 'me'
              ? (activeTab === 'lead' ? 'My Lead Tasks' : activeTab === 'normal' ? 'My Normal Tasks' : 'My Tasks')
              : (activeTab === 'lead' ? 'All Lead Tasks' : activeTab === 'normal' ? 'All Normal Tasks' : 'All Tasks')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {scope === 'me'
              ? 'Showing tasks assigned to you only'
              : 'Showing all tasks across all team members'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTasks}
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus size={17} />
            New Task
          </button>
        </div>
      </div>

      {/* TABS & ADMIN SCOPE TOGGLE */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        {/* TABS (All / Lead / Normal) */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-fit border border-gray-200">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <span>All</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'all'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-gray-200 text-gray-600'
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('lead')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'lead'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <span>Lead</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'lead'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {counts.lead}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('normal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'normal'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <span>Normal</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'normal'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {counts.normal}
            </span>
          </button>
        </div>

        {/* ADMIN SCOPE SWITCHER (For Me Only vs All Tasks) */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => handleScopeChange('me')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scope === 'me'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
              title="Show tasks for me only"
            >
              <User size={13} />
              <span>For Me Only</span>
            </button>

            <button
              type="button"
              onClick={() => handleScopeChange('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                scope === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
              title="Show all tasks across all team members"
            >
              <Users size={13} />
              <span>All Tasks</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <TaskFilters filters={filters} setFilters={handleFiltersChange} />

      {/* Table */}
      <TaskTable
        tasks={tasks}
        loading={loading}
        onView={id => navigate(`/tasks/${id}`)}
        onEdit={id => navigate(`/tasks/${id}/edit`)}
        onDelete={handleDelete}
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
    </div>
  );
}