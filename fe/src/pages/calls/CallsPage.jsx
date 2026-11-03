import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  Eye,
  Pencil,
  User,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { callsAPI } from '../../services/api';
import Pagination from '../../components/common/Pagination';

const STATUS_OPTIONS = [
  'Completed',
  'Scheduled',
  'Overdue',
  'Cancelled'
];

const STATUS_STYLES = {
  Completed: 'bg-green-50 text-green-700',
  Scheduled: 'bg-blue-50 text-blue-700',
  Overdue: 'bg-red-50 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-600'
};

export default function CallsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'admin';

  const [calls, setCalls] = useState([]);
  const [scope, setScope] = useState('me'); // 'me' (For Me Only) | 'all' (All Calls)
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'lead' | 'normal'
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, lead: 0, normal: 0 });

  const loadCalls = useCallback(async (p = page, l = limit) => {
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
      if (search && search.trim()) {
        params.search = search.trim();
      }
      if (status) {
        params.status = status;
      }

      const res = await callsAPI.getAll(params);
      const records = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.calls) ? res.calls : (Array.isArray(res) ? res : []));
      setCalls(records);

      if (res?.pagination) {
        setPagination(res.pagination);
      }
      if (res?.counts) {
        setCounts(res.counts);
      }
    } catch (error) {
      console.error('Load calls error:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load calls'
      );
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeTab, search, status, scope]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCalls(page, limit);
    }, 200);
    return () => clearTimeout(timer);
  }, [page, limit, activeTab, search, status, scope, loadCalls]);

  const handleScopeChange = (newScope) => {
    setScope(newScope);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  const formatDate = value => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = call => {
    const minutes = String(call.duration_minutes || 0).padStart(2, '0');
    const seconds = String(call.duration_seconds || 0).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const hasFilters = search || status;

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {scope === 'me'
              ? (activeTab === 'lead' ? 'My Lead Calls' : activeTab === 'normal' ? 'My Normal Calls' : 'My Calls')
              : (activeTab === 'lead' ? 'All Lead Calls' : activeTab === 'normal' ? 'All Normal Calls' : 'All Calls')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {scope === 'me'
              ? 'Showing calls scheduled/logged by you only'
              : 'Showing all calls across all team members'}
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNewMenu(prev => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus size={17} />
            New
            <ChevronDown size={16} />
          </button>

          {showNewMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNewMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    navigate('/calls/schedule');
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Schedule a Call
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMenu(false);
                    navigate('/calls/log');
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Log a Call
                </button>
              </div>
            </>
          )}
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

        {/* ADMIN SCOPE SWITCHER (For Me Only vs All Calls) */}
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
              title="Show calls for me only"
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
              title="Show all calls across all team members"
            >
              <Users size={13} />
              <span>All Calls</span>
            </button>
          </div>
        )}
      </div>

      {/* TOOLBAR */}
<div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
  <div className="flex flex-nowrap items-center gap-3">
    {/* Search */}
    <div className="relative flex-1 min-w-0">
      <Search
        size={17}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        value={search}
        onChange={handleSearchChange}
        placeholder="Search calls..."
        className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
      />
    </div>

    {/* Status */}
    <select
      value={status}
      onChange={handleStatusChange}
      className="h-10 w-40 px-3 border border-gray-300 rounded-md text-sm bg-white flex-shrink-0"
    >
      <option value="">All Status</option>
      {STATUS_OPTIONS.map(opt => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>

    {/* Clear */}
    {hasFilters && (
      <button
        type="button"
        onClick={() => {
          setSearch('');
          setStatus('');
          setPage(1);
        }}
        className="h-10 px-3 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex-shrink-0"
      >
        Clear
      </button>
    )}

    {/* Refresh */}
    <button
      type="button"
      onClick={loadCalls}
      className="h-10 w-10 border border-gray-300 rounded-md flex items-center justify-center bg-white hover:bg-gray-50 transition-colors flex-shrink-0"
      title="Refresh"
    >
      <RefreshCw size={17} />
    </button>
  </div>
</div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <Th>Call Subject</Th>
                <Th>Status</Th>
                <Th>Start Time</Th>
                <Th>Duration</Th>
                <Th>Related To</Th>
                <Th>Contact</Th>
                <Th>Call Owner</Th>
                <th className="w-[120px] px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    Loading calls...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    {hasFilters
                      ? 'No calls match your filters.'
                      : activeTab === 'lead'
                      ? 'No lead calls yet.'
                      : activeTab === 'normal'
                      ? 'No normal calls yet.'
                      : 'No calls yet. Create your first call.'}
                  </td>
                </tr>
              ) : (
                calls.map(call => (
                  <tr
                    key={call.id}
                    onClick={() => navigate(`/calls/${call.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-4 font-medium text-gray-800">
                      {call.call_subject}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          STATUS_STYLES[call.call_status] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {call.call_status || '--'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(call.start_time)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {formatDuration(call)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {call.related_name ||
                        (call.related_to_type
                          ? `${call.related_to_type} #${call.related_to_id}`
                          : '--')}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {call.call_to_name || '--'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {call.call_owner_name || '--'}
                    </td>

                    <td
                      className="px-4 py-4"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title="View"
                          onClick={() => navigate(`/calls/${call.id}`)}
                          className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          title="Edit"
                          onClick={() => navigate(`/calls/${call.id}/edit`)}
                          className="p-2 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages || 1}
          totalItems={pagination.total || 0}
          limit={pagination.limit || limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          itemName="calls"
          loading={loading}
        />
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
      {children}
    </th>
  );
}