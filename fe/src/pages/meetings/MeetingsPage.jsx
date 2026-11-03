import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Eye,
  Pencil,
  User,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  SlidersHorizontal,
  Filter,
  X,
  RotateCcw,
  Building2,
  Video,
  Clock,
  Layers,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { meetingsAPI, usersAPI, customersAPI } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import MeetingFilterDrawer from '../../components/meetings/MeetingFilterDrawer';

const MEETINGS_FILTERS_KEY = 'crm_meetings_active_filters';

const STATUS_STYLES = {
  'Not Started': 'bg-gray-100 text-gray-700',
  Deferred: 'bg-orange-50 text-orange-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Visited: 'bg-purple-50 text-purple-700',
  'Waiting For Input': 'bg-yellow-50 text-yellow-700',
};

const parseLocalDate = (value) => {
  if (!value) return null;
  const clean = typeof value === 'string' ? value.replace(/\.\d{3}Z$|Z$/, '') : value;
  const d = new Date(clean);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value) => {
  if (!value) return '--';
  try {
    const d = parseLocalDate(value);
    if (!d) return value;
    return d
      .toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
  } catch {
    return value;
  }
};

const getStoredFilters = () => {
  try {
    const raw = sessionStorage.getItem(MEETINGS_FILTERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'admin';

  const initialFilters = getStoredFilters();

  const [meetings, setMeetings] = useState([]);
  const [scope, setScope] = useState(() => initialFilters?.scope || (isAdmin ? 'all' : 'me'));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => initialFilters?.search || '');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'lead' | 'normal'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, lead: 0, normal: 0 });
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter drawer states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState(() => initialFilters?.statuses || []);
  const [filterMeetingTypes, setFilterMeetingTypes] = useState(() => initialFilters?.meetingTypes || []);
  const [filterCustomerTypes, setFilterCustomerTypes] = useState(() => initialFilters?.customerTypes || []);
  const [filterRelatedTypes, setFilterRelatedTypes] = useState(() => initialFilters?.relatedTypes || []);
  const [filterUsers, setFilterUsers] = useState(() => initialFilters?.users || []);
  const [filterCustomers, setFilterCustomers] = useState(() => initialFilters?.customers || []);
  const [dateField, setDateField] = useState(() => initialFilters?.dateField || 'from_date');
  const [startDate, setStartDate] = useState(() => initialFilters?.startDate || '');
  const [endDate, setEndDate] = useState(() => initialFilters?.endDate || '');

  // Master lists for labels
  const [usersList, setUsersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);

  useEffect(() => {
    usersAPI
      .getAll({ limit: 200, is_active: 1 })
      .then((res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        setUsersList(list);
      })
      .catch((err) => console.error('Failed to load users for meetings filter:', err));

    customersAPI
      .getAll({ limit: 300 })
      .then((res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        setCustomersList(list);
      })
      .catch(() => {});
  }, []);

  // Sync active filters to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        MEETINGS_FILTERS_KEY,
        JSON.stringify({
          search,
          statuses: filterStatuses,
          meetingTypes: filterMeetingTypes,
          customerTypes: filterCustomerTypes,
          relatedTypes: filterRelatedTypes,
          users: filterUsers,
          customers: filterCustomers,
          dateField,
          startDate,
          endDate,
          scope,
        })
      );
    } catch (e) {
      // ignore
    }
  }, [
    search,
    filterStatuses,
    filterMeetingTypes,
    filterCustomerTypes,
    filterRelatedTypes,
    filterUsers,
    filterCustomers,
    dateField,
    startDate,
    endDate,
    scope,
  ]);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      const defaultDescFields = ['from_date', 'to_date', 'created_at'];
      setSortBy(columnKey);
      setSortOrder(defaultDescFields.includes(columnKey) ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const renderSortableHeader = (columnKey, label, className = 'text-left') => {
    const isSorted = sortBy === columnKey;
    return (
      <th
        key={columnKey}
        onClick={() => handleSort(columnKey)}
        className={`${className} px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-blue-600 hover:bg-gray-100 transition cursor-pointer select-none group whitespace-nowrap`}
        title={`Sort by ${label} (${isSorted ? (sortOrder === 'asc' ? 'Ascending (click for Descending)' : 'Descending (click for Ascending)') : 'Click to sort'})`}
      >
        <div className={`inline-flex items-center gap-1.5 ${className.includes('center') ? 'justify-center' : ''}`}>
          <span>{label}</span>
          <span className="shrink-0 transition-opacity">
            {isSorted ? (
              sortOrder === 'asc' ? (
                <ArrowUp size={13} className="text-blue-600 font-bold stroke-[2.5]" />
              ) : (
                <ArrowDown size={13} className="text-blue-600 font-bold stroke-[2.5]" />
              )
            ) : (
              <ArrowUpDown size={12} className="text-gray-400 opacity-0 group-hover:opacity-70 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const handleOpenMeeting = (id, e) => {
    if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
      window.open(`/meetings/${id}`, '_blank');
    } else {
      navigate(`/meetings/${id}`);
    }
  };

  const handleEditMeeting = (id, e) => {
    if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
      window.open(`/meetings/${id}/edit`, '_blank');
    } else {
      navigate(`/meetings/${id}/edit`);
    }
  };

  const loadMeetings = useCallback(
    async (p = page, l = limit) => {
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
        if (filterStatuses.length > 0) {
          params.status = filterStatuses.join(',');
        }
        if (filterMeetingTypes.length > 0) {
          params.meeting_type = filterMeetingTypes.join(',');
        }
        if (filterCustomerTypes.length > 0) {
          params.customer_type = filterCustomerTypes.join(',');
        }
        if (filterRelatedTypes.length > 0) {
          params.related_to_type = filterRelatedTypes.join(',');
        }
        if (isAdmin && filterUsers.length > 0) {
          params.owner_id = filterUsers.join(',');
        }
        if (filterCustomers.length > 0) {
          params.customer_id = filterCustomers.join(',');
        }
        if (startDate) {
          params.date_field = dateField;
          params.start_date = startDate;
        }
        if (endDate) {
          params.date_field = dateField;
          params.end_date = endDate;
        }
        if (sortBy) {
          params.sort_by = sortBy;
          params.order = sortOrder;
        }

        const res = await meetingsAPI.getAll(params);
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setMeetings(items);

        if (res?.pagination) {
          setPagination(res.pagination);
        }
        if (res?.counts) {
          setCounts(res.counts);
        }
      } catch (error) {
        console.error(error);
        toast.error(error?.message || 'Failed to load meetings');
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      limit,
      activeTab,
      search,
      scope,
      filterStatuses,
      filterMeetingTypes,
      filterCustomerTypes,
      filterRelatedTypes,
      filterUsers,
      filterCustomers,
      dateField,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      isAdmin,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMeetings(page, limit);
    }, 200);
    return () => clearTimeout(timer);
  }, [page, limit, activeTab, search, scope, filterStatuses, filterMeetingTypes, filterCustomerTypes, filterRelatedTypes, filterUsers, filterCustomers, dateField, startDate, endDate, sortBy, sortOrder, loadMeetings]);

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

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  const activeFilterCount = [
    Boolean(filterStatuses.length),
    Boolean(filterMeetingTypes.length),
    Boolean(filterCustomerTypes.length),
    Boolean(filterRelatedTypes.length),
    Boolean(isAdmin && filterUsers.length),
    Boolean(filterCustomers.length),
    Boolean(startDate || endDate),
    isAdmin && scope === 'me',
  ].filter(Boolean).length;

  const hasAnyFilter = Boolean(search) || activeFilterCount > 0;

  const handleClearAllFilters = () => {
    try {
      sessionStorage.removeItem(MEETINGS_FILTERS_KEY);
    } catch (e) {}
    setSearch('');
    setFilterStatuses([]);
    setFilterMeetingTypes([]);
    setFilterCustomerTypes([]);
    setFilterRelatedTypes([]);
    setFilterUsers([]);
    setFilterCustomers([]);
    setStartDate('');
    setEndDate('');
    setDateField('from_date');
    if (isAdmin) setScope('all');
    setSortBy('');
    setSortOrder('desc');
    setPage(1);
  };

  const handleApplyDrawerFilters = (newFilters) => {
    setSearch(newFilters.search || '');
    setFilterStatuses(newFilters.statuses || []);
    setFilterMeetingTypes(newFilters.meetingTypes || []);
    setFilterCustomerTypes(newFilters.customerTypes || []);
    setFilterRelatedTypes(newFilters.relatedTypes || []);
    setFilterUsers(newFilters.users || []);
    setFilterCustomers(newFilters.customers || []);
    setDateField(newFilters.dateField || 'from_date');
    setStartDate(newFilters.startDate || '');
    setEndDate(newFilters.endDate || '');
    if (newFilters.scope) setScope(newFilters.scope);
    setPage(1);
  };

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {scope === 'me'
              ? activeTab === 'lead'
                ? 'My Lead Meetings'
                : activeTab === 'normal'
                ? 'My Normal Meetings'
                : 'My Meetings'
              : activeTab === 'lead'
              ? 'All Lead Meetings'
              : activeTab === 'normal'
              ? 'All Normal Meetings'
              : 'All Meetings'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {scope === 'me'
              ? 'Showing meetings scheduled for you only'
              : 'Showing all meetings across all team members'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadMeetings(page, limit)}
            className="p-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/meetings/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Plus size={17} />
            New Meeting
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
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <span>All</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'all' ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('lead')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'lead'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <span>Lead</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {counts.lead}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('normal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'normal'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <span>Normal</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'normal' ? 'bg-gray-100 text-gray-800' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {counts.normal}
            </span>
          </button>
        </div>

        {/* ADMIN SCOPE SWITCHER (For Me Only vs All Meetings) */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => handleScopeChange('me')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                scope === 'me'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
              title="Show meetings for me only"
            >
              <User size={13} />
              <span>For Me Only</span>
            </button>

            <button
              type="button"
              onClick={() => handleScopeChange('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
              title="Show all meetings across all team members"
            >
              <Users size={13} />
              <span>All Meetings</span>
            </button>
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
        <div className="flex flex-nowrap items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search meetings by subject, location, description, or attendee..."
              className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Button (exact same style as Leads page) */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-lg text-sm font-medium border transition shadow-xs shrink-0 cursor-pointer ${
              activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 font-semibold'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title="Open filters"
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="h-10 px-3 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex-shrink-0 cursor-pointer flex items-center gap-1.5"
              title="Clear all filters"
            >
              <RotateCcw size={14} />
              <span>Clear</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadMeetings(page, limit)}
            className="h-10 w-10 border border-gray-300 rounded-md flex items-center justify-center bg-white hover:bg-gray-50 transition-colors flex-shrink-0 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {/* Active Filter Chips */}
        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            <span className="text-gray-500 font-semibold flex items-center gap-1">
              <Filter size={12} className="text-gray-400" />
              Active Filters:
            </span>

            {/* Search Keywords Chip */}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-medium shadow-2xs">
                <Search size={12} className="text-blue-600" />
                <span>Search: {search}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="hover:text-blue-950 cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Scope Chip - when admin narrowed down to 'me' */}
            {isAdmin && scope === 'me' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full font-medium shadow-2xs">
                <User size={12} className="text-indigo-600" />
                <span>Scope: For Me Only</span>
                <button
                  type="button"
                  onClick={() => {
                    setScope('all');
                    setPage(1);
                  }}
                  className="hover:text-indigo-950 cursor-pointer"
                  title="Switch to All Meetings"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Status Chip */}
            {filterStatuses.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-medium shadow-2xs">
                <span>Status: {filterStatuses.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatuses([]);
                    setPage(1);
                  }}
                  className="hover:text-blue-950 cursor-pointer"
                  title="Remove status filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Meeting Type Chip */}
            {filterMeetingTypes.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full font-medium shadow-2xs">
                <Video size={12} className="text-indigo-600" />
                <span>Type: {filterMeetingTypes.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMeetingTypes([]);
                    setPage(1);
                  }}
                  className="hover:text-indigo-950 cursor-pointer"
                  title="Remove type filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Customer Type Chip */}
            {filterCustomerTypes.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-800 rounded-full font-medium shadow-2xs">
                <span>Customer Type: {filterCustomerTypes.map((c) => (c === 'New' ? 'New' : 'Existing')).join(', ')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterCustomerTypes([]);
                    setPage(1);
                  }}
                  className="hover:text-sky-950 cursor-pointer"
                  title="Remove customer type filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Meeting Owners Chip (Admin only) */}
            {isAdmin && filterUsers.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-full font-medium shadow-2xs">
                <UserCheck size={12} className="text-purple-600" />
                <span>
                  Owner:{' '}
                  {filterUsers
                    .map((uid) => usersList.find((u) => String(u.id) === String(uid))?.name || uid)
                    .join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterUsers([]);
                    setPage(1);
                  }}
                  className="hover:text-purple-950 cursor-pointer"
                  title="Remove owner filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Related Category Type Chip */}
            {filterRelatedTypes.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-medium shadow-2xs">
                <Layers size={12} className="text-emerald-600" />
                <span>Category: {filterRelatedTypes.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterRelatedTypes([]);
                    setPage(1);
                  }}
                  className="hover:text-emerald-950 cursor-pointer"
                  title="Remove category filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Customers Chip */}
            {filterCustomers.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-full font-medium shadow-2xs">
                <Building2 size={12} className="text-cyan-600" />
                <span>
                  Customer:{' '}
                  {filterCustomers
                    .map((cid) => customersList.find((c) => String(c.id) === String(cid))?.company_name || cid)
                    .join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterCustomers([]);
                    setPage(1);
                  }}
                  className="hover:text-cyan-950 cursor-pointer"
                  title="Remove customer filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Date Range Chip */}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 rounded-full font-medium shadow-2xs">
                <Clock size={12} className="text-slate-600" />
                <span>
                  {dateField === 'from_date'
                    ? 'Start Time'
                    : dateField === 'to_date'
                    ? 'End Time'
                    : 'Created Time'}
                  : {startDate || '—'} to {endDate || '—'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="hover:text-slate-950 cursor-pointer"
                  title="Remove date filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {renderSortableHeader('meeting_subject', 'Meeting Subject')}
                {renderSortableHeader('status', 'Status')}
                {renderSortableHeader('from_date', 'From Date')}
                {renderSortableHeader('to_date', 'To Date')}
                {renderSortableHeader('meeting_owner', 'Meeting Owner')}
                {renderSortableHeader('customer_type', 'Customer Type')}
                {renderSortableHeader('created_at', 'Created Time')}
                {renderSortableHeader('meeting_type', 'Meeting Type')}
                {renderSortableHeader('related_to', 'Related To')}
                {renderSortableHeader('contact', 'Contact')}
                {renderSortableHeader('description', 'Description')}
                <th className="w-[120px] px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" className="py-12 text-center text-gray-500">
                    Loading meetings...
                  </td>
                </tr>
              ) : meetings.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-12 text-center text-gray-500">
                    {hasAnyFilter
                      ? 'No meetings match your filter criteria.'
                      : activeTab === 'lead'
                      ? 'No lead meetings yet.'
                      : activeTab === 'normal'
                      ? 'No normal meetings yet.'
                      : 'No meetings yet. Create your first meeting.'}
                  </td>
                </tr>
              ) : (
                meetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => handleOpenMeeting(meeting.id, e)}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        handleOpenMeeting(meeting.id, e);
                      }
                    }}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-800">{meeting.meeting_subject}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          STATUS_STYLES[meeting.meeting_status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {meeting.meeting_status || '--'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(meeting.from_date)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(meeting.to_date)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {meeting.meeting_owner_name || '--'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {meeting.customer_type || '--'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(meeting.created_at)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {meeting.meeting_type || '--'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {meeting.related_name || '--'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {meeting.meeting_to_name || '--'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600 max-w-[250px] truncate">
                      {meeting.description || '--'}
                    </td>

                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title="View"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMeeting(meeting.id, e);
                          }}
                          onAuxClick={(e) => {
                            if (e.button === 1) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenMeeting(meeting.id, e);
                            }
                          }}
                          className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditMeeting(meeting.id, e);
                          }}
                          onAuxClick={(e) => {
                            if (e.button === 1) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditMeeting(meeting.id, e);
                            }
                          }}
                          className="p-2 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
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
          itemName="meetings"
          loading={loading}
        />
      </div>

      {/* Filter Drawer */}
      <MeetingFilterDrawer
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={{
          search,
          statuses: filterStatuses,
          meetingTypes: filterMeetingTypes,
          customerTypes: filterCustomerTypes,
          relatedTypes: filterRelatedTypes,
          users: filterUsers,
          customers: filterCustomers,
          scope,
          dateField,
          startDate,
          endDate,
        }}
        onApply={handleApplyDrawerFilters}
        onReset={handleClearAllFilters}
        usersList={usersList}
        isAdmin={isAdmin}
      />
    </div>
  );
}
