import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  X,
  Target,
  Clock,
  User,
  Inbox,
} from 'lucide-react';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { refreshUnread } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & search
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'lead_push'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0 });

  const fetchNotifications = useCallback(async (p = page, l = limit, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        page: p,
        limit: l,
      };

      if (activeTab === 'unread') params.is_read = 'false';
      else if (activeTab === 'read') params.is_read = 'true';
      else params.is_read = 'all';

      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();

      const res = await notificationsAPI.getAll(params);
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setNotifications(items);
      setUnreadCount(res?.unread_count ?? 0);

      if (res?.pagination) {
        setPagination(res.pagination);
      }
      if (res?.counts) {
        setCounts(res.counts);
      }
      if (isRefresh) toast.success('Notifications updated');
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, activeTab, typeFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications(page, limit);
    }, 200);
    return () => clearTimeout(timer);
  }, [page, limit, activeTab, typeFilter, searchQuery, fetchNotifications]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  // Mark single as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setCounts((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1,
      }));
      refreshUnread();
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      toast('No unread notifications');
      return;
    }
    setActionLoading(true);
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: 1, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      setCounts((prev) => ({
        ...prev,
        read: prev.all,
        unread: 0,
      }));
      refreshUnread();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete notification
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationsAPI.remove(id);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
        refreshUnread();
      }
      setCounts((prev) => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        unread: target && !target.is_read ? Math.max(0, prev.unread - 1) : prev.unread,
        read: target && target.is_read ? Math.max(0, prev.read - 1) : prev.read,
      }));
      toast.success('Notification removed');
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };

  // Counts
  const totalCount = counts.all || notifications.length;
  const unreadTotal = counts.unread !== undefined ? counts.unread : unreadCount;
  const readTotal = counts.read !== undefined ? counts.read : Math.max(0, totalCount - unreadTotal);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all';

  return (
    <div className="p-6 flex flex-col gap-5 w-full">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time alerts, lead pushes, and administrative notifications
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-xs"
            title="Refresh notifications"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={actionLoading || unreadCount === 0}
            className={`h-9 px-3.5 rounded-lg text-sm font-medium transition inline-flex items-center gap-1.5 shadow-sm ${
              unreadCount > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        </div>
      </div>

      {/* ── TOOLBAR: TABS + SEARCH + FILTERS ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Segmented Tab Pills */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'all' ? 'bg-gray-200 text-gray-800' : 'bg-gray-200/60 text-gray-500'
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('unread')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'unread'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Unread</span>
            {unreadTotal > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white">
                {unreadTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('read')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'read'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Read</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'read' ? 'bg-gray-200 text-gray-800' : 'bg-gray-200/60 text-gray-500'
              }`}
            >
              {readTotal}
            </span>
          </button>
        </div>

        {/* Right Controls: Search & Type Filter */}
        <div className="flex items-center gap-2 flex-1 justify-end max-w-2xl min-w-0">
          {/* Search box - BIG WIDTH */}
          <div className="relative flex-1 min-w-[240px] sm:min-w-[340px]">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search notifications..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Type dropdown - SMALL WIDTH */}
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            className="h-8 w-28 sm:w-32 flex-shrink-0 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="lead_push">Lead Updates</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setPage(1);
              }}
              className="h-8 px-2.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── NOTIFICATIONS FEED ── */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 shadow-xs">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-2 spin" />
          <p className="text-xs font-medium">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
            <Inbox size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              No notifications to display
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {hasActiveFilters
                ? 'No notifications match your search or filter criteria.'
                : activeTab === 'unread'
                ? 'Hurray! You have caught up with all your notifications.'
                : 'No notification records exist currently.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setActiveTab('all');
                setPage(1);
              }}
              className="mt-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notifications.map((notif) => {
            const isUnread = !notif.is_read;
            const isLead = notif.entity_type === 'lead' || notif.type === 'lead_push';

            return (
              <div
                key={notif.id}
                className={`group bg-white border rounded-xl p-3.5 transition-all duration-150 flex flex-col gap-2.5 shadow-xs hover:shadow-sm ${
                  isUnread
                    ? 'border-l-4 border-l-blue-600 border-gray-200 bg-gradient-to-r from-blue-50/20 via-white to-white'
                    : 'border-l-4 border-l-gray-300 border-gray-200'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                    {/* Icon Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isUnread
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isLead ? <Target size={14} /> : <Bell size={14} />}
                    </div>

                    {/* Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <h2
                        className={`text-sm leading-snug truncate ${
                          isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        }`}
                      >
                        {notif.title}
                      </h2>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isUnread
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isUnread ? 'New' : 'Read'}
                    </span>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition shadow-2xs"
                        title="Mark as read"
                      >
                        <Check size={12} />
                        Mark Read
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {notif.message}
                </div>

                {/* Footer Details: Sender, Date, Lead Link */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-3 text-gray-500 flex-wrap">
                    {notif.sender_name && (
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        <span>Pushed by:</span>
                        <strong className="text-gray-700">{notif.sender_name}</strong>
                      </span>
                    )}

                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock size={12} />
                      {formatDate(notif.created_at)}
                    </span>
                  </div>

                  {/* Direct Lead Button */}
                  {notif.link && (
                    <button
                      type="button"
                      onClick={() => navigate(notif.link)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                    >
                      <Target size={12} />
                      <span>
                        Open Lead {notif.lead_title ? `(${notif.lead_title})` : ''}
                      </span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PAGINATION ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages || 1}
          totalItems={pagination.total || 0}
          limit={pagination.limit || limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          itemName="notifications"
          loading={loading}
        />
      </div>
    </div>
  );
}
