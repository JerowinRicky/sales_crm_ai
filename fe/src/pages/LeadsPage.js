import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, usersAPI, productMasterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Building2,
  Calendar,
  User,
  Target,
  X,
  Eye,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Users,
  Globe,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import ExportButtons from '../components/common/ExportButtons';
import ConfirmModal from '../components/common/ConfirmModal';
import CustomFilterDrawer from '../components/leads/CustomFilterDrawer';
import BulkUpdateModal from '../components/leads/BulkUpdateModal';

const LEADS_VIEW_KEY = 'crm_leads_view';
const LEADS_FILTERS_KEY = 'crm_leads_active_filters';

const getStoredFilters = () => {
  try {
    const raw = sessionStorage.getItem(LEADS_FILTERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return null;
};

const PRIORITY_COLOR = {
  low: '#64748B',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#8B5CF6',
};

const SOURCES = [
  { id: 'cold_call', label: 'Cold Call' },
  { id: 'email', label: 'Email' },
  { id: 'referral', label: 'Referral' },
  { id: 'website', label: 'Website' },
  { id: 'social_media', label: 'Social Media' },
  { id: 'exhibition', label: 'Exhibition' },
  { id: 'walk_in', label: 'Walk-in' },
  { id: 'other', label: 'Other' },
];

/* =========================================================
 * Lead Card (Kanban)
 * ========================================================= */
function LeadCard({ lead, onClick, onDragStart, onDragEnd, dragging }) {
  return (
    <div
      onClick={(e) => onClick(lead, e)}
      onAuxClick={(e) => {
        if (e.button === 1) onClick(lead, e);
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border rounded-lg p-3.5 cursor-pointer transition ${
        dragging ? 'opacity-40' : 'hover:shadow-md'
      }`}
      style={{ borderColor: '#E5E7EB' }}
    >
      <div className="font-semibold text-sm text-gray-900 leading-snug mb-2">
        {lead.title}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <Building2 size={12} className="text-gray-400 flex-shrink-0" />
        <span className="truncate">
          {lead.customer_company || lead.company_name || '—'}
        </span>
      </div>

      {lead.estimated_value > 0 && (
        <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600 mb-2">
          <IndianRupee size={12} />
          {Number(lead.estimated_value).toLocaleString()}
        </div>
      )}

      <div
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mb-2"
        style={{
          background: `${PRIORITY_COLOR[lead.priority] || '#64748B'}15`,
          color: PRIORITY_COLOR[lead.priority] || '#64748B',
        }}
      >
        {lead.priority}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <User size={11} />
          {lead.assigned_to_name?.split(' ')[0] || '—'}
        </span>
        {lead.expected_close_date && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {format(new Date(lead.expected_close_date), 'MMM d')}
          </span>
        )}
      </div>
      
    </div>
  );
}

/* =========================================================
 * Kanban Column
 * ========================================================= */
function KanbanColumn({ stage, leads, onLeadClick, onDrop, dragId, setDragId }) {
  const [over, setOver] = useState(false);
  const total = leads.reduce(
    (s, l) => s + (Number(l.estimated_value) || 0),
    0
  );

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: 280 }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (dragId) onDrop(dragId, stage.id);
      }}
    >
      {/* Header */}
      <div
        className={`px-3.5 py-3 rounded-t-lg border border-b-0 transition ${
          over ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: stage.color || '#2563EB' }}
          />
          <span className="font-semibold text-sm text-gray-900 flex-1 truncate">
            {stage.name}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 px-2.5 py-0.5 text-xs font-semibold">
            {leads.length}
          </span>
        </div>
        {total > 0 && (
          <div className="text-xs font-semibold text-emerald-600 mt-1.5">
            ₹
            {total >= 100000
              ? `${(total / 100000).toFixed(1)}L`
              : total.toLocaleString()}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className={`flex-1 flex flex-col gap-2.5 p-2.5 rounded-b-lg border border-t-0 transition overflow-y-auto ${
          over ? 'bg-blue-50/40 border-blue-400' : 'bg-gray-50 border-gray-200'
        }`}
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {leads.map((l) => (
          <LeadCard
            key={l.id}
            lead={l}
            onClick={onLeadClick}
            dragging={dragId === l.id}
            onDragStart={() => setDragId(l.id)}
            onDragEnd={() => setDragId(null)}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-6 text-xs text-gray-400 font-medium">
            No leads in this stage
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
 * Pagination Bar
 * ========================================================= */
function PaginationBar({
  page,
  total,
  limit,
  setPage,
  setLimit,
  loading,
  className = '',
}) {
  const totalPages = Math.ceil(total / limit) || 1;
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  const getPageNumbers = () => {
    if (totalPages <= 4) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 2) {
      return [1, 2, '...', totalPages];
    }
    if (page === 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (page >= totalPages - 1) {
      return [1, '...', totalPages - 1, totalPages];
    }
    if (page === totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page, '...', totalPages];
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm flex-nowrap overflow-x-auto whitespace-nowrap ${className}`}
    >
      <div className="flex items-center gap-2 flex-nowrap text-xs sm:text-sm text-gray-600 shrink-0">
        <span>
          Showing <strong className="text-gray-900">{startRecord.toLocaleString()} - {endRecord.toLocaleString()}</strong> of <strong className="text-gray-900">{total.toLocaleString()}</strong> leads
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="h-7 inline-flex items-center gap-1 px-2.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          title={`Previous page`}
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1 flex-nowrap">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={loading}
                onClick={() => setPage(p)}
                className={`min-w-[28px] h-7 px-2 text-xs rounded-md font-medium transition ${
                  page === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          disabled={page >= totalPages || totalPages === 0 || loading}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="h-7 inline-flex items-center gap-1 px-2.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          title={`Next page`}
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>

        {setLimit && (
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="h-7 py-0 px-2 border border-gray-300 rounded-md text-xs font-medium bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition ml-0.5"
            title="Records per batch"
          >
            <option value={10}>10 / batch</option>
            <option value={20}>20 / batch</option>
            <option value={30}>30 / batch</option>
            <option value={40}>40 / batch</option>
            <option value={50}>50 / batch</option>
          </select>
        )}
      </div>
    </div>
  );
}

/* =========================================================
 * Main Leads Page
 * ========================================================= */
export default function LeadsPage() {
  const initialSavedFilters = getStoredFilters();

  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => initialSavedFilters?.page ?? 1);
  const [limit, setLimit] = useState(() => {
    const allowed = [10, 20, 30, 40, 50];
    const saved = Number(initialSavedFilters?.limit);
    return allowed.includes(saved) ? saved : 10;
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem(LEADS_VIEW_KEY);
      if (saved === 'list' || saved === 'kanban') {
        return saved;
      }
      if (saved === 'board') {
        return 'kanban';
      }
    } catch {
      // ignore
    }
    return 'kanban';
  });

  const handleViewChange = (newView) => {
    setView(newView);
    try {
      localStorage.setItem(LEADS_VIEW_KEY, newView);
    } catch {
      // ignore
    }
  };
  const [search, setSearch] = useState(() => initialSavedFilters?.search ?? '');
  const [filterStages, setFilterStages] = useState(() => initialSavedFilters?.filterStages ?? []); // Array of stage id strings
  const [filterPriorities, setFilterPriorities] = useState(() => initialSavedFilters?.filterPriorities ?? []); // Array of strings (low, medium, high, critical)
  const [filterUsers, setFilterUsers] = useState(() => initialSavedFilters?.filterUsers ?? []); // Array of user id strings or 'unassigned'
  const [filterSources, setFilterSources] = useState(() => initialSavedFilters?.filterSources ?? []); // Array of source strings
  const [dateField, setDateField] = useState(() => initialSavedFilters?.dateField ?? 'expected_close_date');
  const [startDate, setStartDate] = useState(() => initialSavedFilters?.startDate ?? '');
  const [endDate, setEndDate] = useState(() => initialSavedFilters?.endDate ?? '');
  const [filterCustomers, setFilterCustomers] = useState(() => initialSavedFilters?.filterCustomers ?? []);
  const [filterCustomerGroups, setFilterCustomerGroups] = useState(() => initialSavedFilters?.filterCustomerGroups ?? []);
  const [filterDomains, setFilterDomains] = useState(() => initialSavedFilters?.filterDomains ?? []);
  const [filterMinValue, setFilterMinValue] = useState(() => initialSavedFilters?.filterMinValue ?? '');
  const [filterMaxValue, setFilterMaxValue] = useState(() => initialSavedFilters?.filterMaxValue ?? '');
  const [filterStatus, setFilterStatus] = useState(() => initialSavedFilters?.filterStatus ?? 'all');
  const [sortBy, setSortBy] = useState(() => initialSavedFilters?.sortBy ?? '');
  const [sortOrder, setSortOrder] = useState(() => initialSavedFilters?.sortOrder ?? 'desc');
  const [usersList, setUsersList] = useState([]);
  const [dragId, setDragId] = useState(null);
  const { user, isManager } = useAuth();
  const isAdmin = user?.role_name === 'admin';
  const isSalesManager = user?.role_name === 'sales_manager';

  const getInitialScope = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('crm_user'));
      if (stored?.role_name === 'admin') return 'all';
      if (stored?.role_name === 'sales_manager') return 'domain';
      return 'me';
    } catch {
      return 'all';
    }
  };

  const [scope, setScope] = useState(() => initialSavedFilters?.scope ?? getInitialScope());
  const navigate = useNavigate();
  const handleOpenLead = (leadId, e) => {
    if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
      window.open(`/leads/${leadId}`, '_blank');
    } else {
      navigate(`/leads/${leadId}`);
    }
  };


  // Filter Drawer State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [scopeInitialized, setScopeInitialized] = useState(() => Boolean(initialSavedFilters?.scope));
  useEffect(() => {
    if (user && !scopeInitialized) {
      if (user.role_name === 'admin') {
        setScope('all');
      } else if (user.role_name === 'sales_manager') {
        setScope('domain');
      } else {
        setScope('me');
      }
      setScopeInitialized(true);
    }
  }, [user, scopeInitialized]);

  // Sync active filters to sessionStorage for persistence across page navigations
  useEffect(() => {
    try {
      sessionStorage.setItem(
        LEADS_FILTERS_KEY,
        JSON.stringify({
          search,
          filterStages,
          filterPriorities,
          filterUsers,
          filterSources,
          dateField,
          startDate,
          endDate,
          filterCustomers,
          filterCustomerGroups,
          filterDomains,
          filterMinValue,
          filterMaxValue,
          filterStatus,
          scope,
          page,
          limit,
          sortBy,
          sortOrder,
        })
      );
    } catch (e) {
      // ignore
    }
  }, [
    search,
    filterStages,
    filterPriorities,
    filterUsers,
    filterSources,
    dateField,
    startDate,
    endDate,
    filterCustomers,
    filterCustomerGroups,
    filterDomains,
    filterMinValue,
    filterMaxValue,
    filterStatus,
    scope,
    page,
    limit,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    usersAPI.getAll({ limit: 200, is_active: 1 })
      .then((res) => {
        const list = res.data || (Array.isArray(res) ? res : []);
        setUsersList(list.filter(u => u.is_active === 1 || u.is_active === true || u.is_active === '1'));
      })
      .catch((err) => console.error('Failed to load users for filter:', err));
  }, []);

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [domainsList, setDomainsList] = useState([]);

  useEffect(() => {
    productMasterAPI.getDomains()
      .then((res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        setDomainsList(list);
      })
      .catch((err) => console.error('Failed to load domains:', err));
  }, []);

  // Clear selection on page/scope/search/filter change
  useEffect(() => {
    setSelectedLeadIds([]);
  }, [page, scope, search, filterStages, filterPriorities, filterUsers, filterSources]);

  const handleToggleSelectAll = () => {
    if (leads.length > 0 && selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const handleToggleSelectLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Delete lead state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    lead: null,
    loading: false,
  });

  const handleDeleteLeadClick = (lead) => {
    setDeleteModal({ isOpen: true, lead, loading: false });
  };

  const confirmDeleteLead = async () => {
    if (!deleteModal.lead) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await leadsAPI.remove(deleteModal.lead.id);
      toast.success(`Lead "${deleteModal.lead.title}" deleted`);
      setDeleteModal({ isOpen: false, lead: null, loading: false });
      loadAll();
    } catch (err) {
      toast.error(err.message || 'Failed to delete lead');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleRestoreLead = async (lead) => {
    try {
      await leadsAPI.restore(lead.id);
      toast.success(`Lead "${lead.title}" restored successfully`);
      loadAll();
    } catch (err) {
      toast.error(err.message || 'Failed to restore lead');
    }
  };

  // Stage change confirmation state
  const [confirmStage, setConfirmStage] = useState({
    isOpen: false,
    lead: null,
    fromStage: null,
    toStage: null,
  });
  const [stageUpdating, setStageUpdating] = useState(false);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      const defaultDescFields = ['amount', 'expected_close_date', 'next_visit', 'created_at', 'updated_at'];
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
        className={`${className} px-5 py-3 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition cursor-pointer select-none group`}
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

  useEffect(() => {
    loadAll();
  }, [
    page,
    limit,
    filterStages,
    filterPriorities,
    search,
    scope,
    filterUsers,
    filterSources,
    dateField,
    startDate,
    endDate,
    filterCustomers,
    filterCustomerGroups,
    filterDomains,
    filterMinValue,
    filterMaxValue,
    filterStatus,
    sortBy,
    sortOrder,
  ]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filterStages.length > 0) params.stage_id = filterStages.join(',');
      if (filterPriorities.length > 0) params.priority = filterPriorities.join(',');
      if (search && search.trim()) params.search = search.trim();
      if (scope) params.scope = scope;
      if (isAdmin && filterUsers.length > 0) params.assigned_to = filterUsers.join(',');
      if (filterSources.length > 0) params.source = filterSources.join(',');
      if (startDate) {
        params.date_field = dateField;
        params.start_date = startDate;
      }
      if (endDate) {
        params.date_field = dateField;
        params.end_date = endDate;
      }
      if (filterCustomers?.length > 0) params.customer_id = filterCustomers.join(',');
      if (filterCustomerGroups?.length > 0) params.group_id = filterCustomerGroups.join(',');
      if (filterDomains?.length > 0) params.domain_id = filterDomains.join(',');
      if (filterMinValue !== undefined && filterMinValue !== '') params.min_value = filterMinValue;
      if (filterMaxValue !== undefined && filterMaxValue !== '') params.max_value = filterMaxValue;
      if (filterStatus && filterStatus !== 'all') params.status_filter = filterStatus;
      if (sortBy) {
        params.sort_by = sortBy;
        params.order = sortOrder;
      }

      const [lr, sr] = await Promise.all([
        leadsAPI.getAll(params),
        leadsAPI.getStages(),
      ]);
      const fetchedLeads = lr.data || [];
      setLeads(fetchedLeads);
      try {
        sessionStorage.setItem('leads_nav_ids', JSON.stringify(fetchedLeads.map(l => ({ id: l.id, title: l.title }))));
      } catch (_) {}
      setTotal(lr.total || 0);
      setStages(sr.data || []);
    } catch (e) {
      console.error('Load leads error:', e);
      toast.error(e.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Called when a lead is dropped into a new column.
   * Opens a confirmation modal — does NOT change the stage yet.
   */
  const handleDrop = (leadId, stageId) => {
    setDragId(null);

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === stageId) return;

    const fromStage = stages.find((s) => s.id === lead.stage_id);
    const toStage = stages.find((s) => s.id === stageId);

    setConfirmStage({
      isOpen: true,
      lead,
      fromStage,
      toStage,
    });
  };

  /**
   * Called when the user clicks Confirm in the modal.
   * Performs the actual stage change.
   */
  const confirmStageChange = async () => {
    const { lead, toStage } = confirmStage;
    if (!lead || !toStage) return;

    try {
      setStageUpdating(true);

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                stage_id: toStage.id,
                stage_name: toStage.name,
                stage_color: toStage.color,
              }
            : l
        )
      );

      await leadsAPI.updateStage(lead.id, { stage_id: toStage.id });

      toast.success(`Moved to "${toStage.name}"`);

      closeConfirmStage();
    } catch (e) {
      toast.error(e.message || 'Failed to update stage');
      loadAll();
    } finally {
      setStageUpdating(false);
    }
  };

  /**
   * Cancel — no stage change.
   */
  const closeConfirmStage = () => {
    if (stageUpdating) return;
    setConfirmStage({
      isOpen: false,
      lead: null,
      fromStage: null,
      toStage: null,
    });
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const activeFilterCount = [
    Boolean(filterStages.length),
    Boolean(filterPriorities.length),
    Boolean(isAdmin && filterUsers.length),
    Boolean(filterSources.length),
    Boolean(startDate || endDate),
    Boolean(filterCustomers?.length),
    Boolean(filterCustomerGroups?.length),
    Boolean(filterDomains?.length),
    Boolean(filterMinValue || filterMaxValue),
    Boolean(filterStatus && filterStatus !== 'all'),
    isAdmin && scope === 'me',
    isAdmin && scope === 'deleted',
    isSalesManager && scope === 'me',
    Boolean(sortBy),
  ].filter(Boolean).length;

  const hasAnyFilter = Boolean(search) || activeFilterCount > 0;

  const handleClearAllFilters = () => {
    try {
      sessionStorage.removeItem(LEADS_FILTERS_KEY);
    } catch (e) {}
    setSearch('');
    setFilterStages([]);
    setFilterPriorities([]);
    setFilterUsers([]);
    setFilterSources([]);
    setStartDate('');
    setEndDate('');
    setDateField('expected_close_date');
    setFilterCustomers([]);
    setFilterCustomerGroups([]);
    setFilterDomains([]);
    setFilterMinValue('');
    setFilterMaxValue('');
    setFilterStatus('all');
    setSortBy('');
    setSortOrder('desc');
    if (isAdmin) setScope('all');
    if (isSalesManager) setScope('domain');
    setPage(1);
  };

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const leadsFor = (sid) => leads.filter((l) => l.stage_id === sid);

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* Delete Lead Confirmation */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Lead"
        message={
          deleteModal.lead
            ? `Are you sure you want to delete "${deleteModal.lead.title}"? Once deleted, this lead will be hidden and will not be displayed to anyone.`
            : ''
        }
        confirmText="Delete Lead"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteLead}
        onCancel={() => setDeleteModal({ isOpen: false, lead: null, loading: false })}
        loading={deleteModal.loading}
      />

      {/* Stage Change Confirmation */}
      <ConfirmModal
        isOpen={confirmStage.isOpen}
        title="Change Lead Stage"
        message={
          confirmStage.lead && confirmStage.toStage
            ? `Move "${confirmStage.lead.title}" from "${
                confirmStage.fromStage?.name || '—'
              }" to "${confirmStage.toStage.name}"?`
            : ''
        }
        confirmText="Change Stage"
        cancelText="Cancel"
        variant="primary"
        onConfirm={confirmStageChange}
        onCancel={closeConfirmStage}
        loading={stageUpdating}
      />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leads Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total.toLocaleString()} active sales opportunities
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons data={leads} filename="leads" title="Leads Report" />

          {/* View Switcher */}
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => handleViewChange('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={14} />
              Board
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List size={14} />
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/leads/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={14} />
            New Lead
          </button>
        </div>
      </div>

      {/* Search Bar + Compact Filter Button & Active Filter Chips */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search leads by title, customer, contact (e.g. sen, aw)..."
              className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400 shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Compact Filter Button */}
          <button
            type="button"
            onClick={handleOpenFilterModal}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition shadow-xs shrink-0 cursor-pointer ${
              activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
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
        </div>

        {/* Active Filter Chips */}
        {(activeFilterCount > 0 || Boolean(search)) && (
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
                  onClick={clearSearch}
                  className="hover:text-blue-950 cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Stages Chip */}
            {filterStages.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-medium shadow-2xs">
                <span>
                  Stage: {stages.filter((s) => filterStages.includes(String(s.id))).map((s) => s.name).join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => { setFilterStages([]); setPage(1); }}
                  className="hover:text-blue-950 cursor-pointer"
                  title="Remove stage filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Priority Chip */}
            {filterPriorities.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full font-medium shadow-2xs">
                <span>
                  Priority: {filterPriorities.map((p) => p[0].toUpperCase() + p.slice(1)).join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => { setFilterPriorities([]); setPage(1); }}
                  className="hover:text-amber-950 cursor-pointer"
                  title="Remove priority filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Assignees Chip - Admin only */}
            {isAdmin && filterUsers.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-full font-medium shadow-2xs">
                <span>
                  Assignee: {filterUsers.map((uid) => uid === 'unassigned' ? 'Unassigned' : (usersList.find((u) => String(u.id) === String(uid))?.name || uid)).join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => { setFilterUsers([]); setPage(1); }}
                  className="hover:text-purple-950 cursor-pointer"
                  title="Remove assignee filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Sources Chip */}
            {filterSources.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-medium shadow-2xs">
                <span>
                  Source: {filterSources.map((s) => s.replace('_', ' ')).join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => { setFilterSources([]); setPage(1); }}
                  className="hover:text-emerald-950 cursor-pointer"
                  title="Remove source filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Date Range Chip */}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 rounded-full font-medium shadow-2xs">
                <span>
                  {dateField.replace(/_/g, ' ')}: {startDate || '—'} to {endDate || '—'}
                </span>
                <button
                  type="button"
                  onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                  className="hover:text-slate-950 cursor-pointer"
                  title="Remove date filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Scope Chip - when admin views deleted leads */}
            {isAdmin && scope === 'deleted' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full font-medium shadow-2xs">
                <Trash2 size={12} className="text-rose-600" />
                <span>Scope: Deleted Leads</span>
                <button
                  type="button"
                  onClick={() => { setScope('all'); setPage(1); }}
                  className="hover:text-rose-950 cursor-pointer"
                  title="Switch to Active Leads"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Scope Chip - when admin or sales manager narrowed down to 'me' */}
            {((isAdmin && scope === 'me') || (isSalesManager && scope === 'me')) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full font-medium shadow-2xs">
                <span>Scope: For Me Only</span>
                <button
                  type="button"
                  onClick={() => { setScope(isAdmin ? 'all' : 'domain'); setPage(1); }}
                  className="hover:text-indigo-950 cursor-pointer"
                  title={isAdmin ? "Switch to All Leads" : "Switch to Domain Leads"}
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Customers Chip */}
            {filterCustomers.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-medium shadow-2xs">
                <span>Customer: {filterCustomers.length} selected</span>
                <button
                  type="button"
                  onClick={() => { setFilterCustomers([]); setPage(1); }}
                  className="hover:text-blue-950 cursor-pointer"
                  title="Remove customer filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Customer Groups Chip */}
            {filterCustomerGroups.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-full font-medium shadow-2xs">
                <span>Group: {filterCustomerGroups.length} selected</span>
                <button
                  type="button"
                  onClick={() => { setFilterCustomerGroups([]); setPage(1); }}
                  className="hover:text-purple-950 cursor-pointer"
                  title="Remove group filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Domains Chip */}
            {filterDomains.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-full font-medium shadow-2xs">
                <span>Domain: {filterDomains.length} selected</span>
                <button
                  type="button"
                  onClick={() => { setFilterDomains([]); setPage(1); }}
                  className="hover:text-cyan-950 cursor-pointer"
                  title="Remove domain filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Amount Range Chip */}
            {(filterMinValue || filterMaxValue) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-medium shadow-2xs">
                <span>Value: ₹{filterMinValue || 0} - ₹{filterMaxValue || '∞'}</span>
                <button
                  type="button"
                  onClick={() => { setFilterMinValue(''); setFilterMaxValue(''); setPage(1); }}
                  className="hover:text-emerald-950 cursor-pointer"
                  title="Remove amount filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Status Outcome Chip */}
            {filterStatus && filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full font-medium shadow-2xs capitalize">
                <span>Status: {filterStatus}</span>
                <button
                  type="button"
                  onClick={() => { setFilterStatus('all'); setPage(1); }}
                  className="hover:text-amber-950 cursor-pointer"
                  title="Remove status filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Sort Chip */}
            {sortBy && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-medium shadow-2xs">
                <span>
                  Sorted by: <strong className="capitalize">{sortBy.replace(/_/g, ' ')}</strong> ({sortOrder.toUpperCase()})
                </span>
                <button
                  type="button"
                  onClick={() => { setSortBy(''); setSortOrder('desc'); setPage(1); }}
                  className="hover:text-blue-950 cursor-pointer"
                  title="Reset sorting to default"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 font-semibold ml-1 transition hover:underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Pagination & Batch Notice */}
      <PaginationBar
        page={page}
        total={total}
        limit={limit}
        setPage={setPage}
        setLimit={setLimit}
        loading={loading}
      />

      {/* Content */}
      {loading ? (
        <div className="bg-white border rounded-lg flex items-center justify-center py-16">
          <div className="text-gray-500">Loading lead pipeline...</div>
        </div>
      ) : view === 'kanban' ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3.5 overflow-x-auto pb-3.5">
            {stages.map((s) => (
              <KanbanColumn
                key={s.id}
                stage={s}
                leads={leadsFor(s.id)}
                onLeadClick={(l, e) => handleOpenLead(l.id, e)}
                onDrop={handleDrop}
                dragId={dragId}
                setDragId={setDragId}
              />
            ))}
            {stages.length === 0 && (
              <div className="bg-white border rounded-lg flex flex-col items-center justify-center py-16 w-full">
                <Target size={42} className="text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-700">
                  No stages configured
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add stages in Settings to start managing leads
                </p>
              </div>
            )}
          </div>

          {total > limit && (
            <PaginationBar
              page={page}
              total={total}
              limit={limit}
              setPage={setPage}
              setLimit={setLimit}
              loading={loading}
            />
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Target size={42} className="text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-700">
                No leads found
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {hasAnyFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first lead to get started.'}
              </p>
              {!hasAnyFilter && (
                <button
                  type="button"
                  onClick={() => navigate('/leads/new')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  New Lead
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Selected Records Action Bar */}
              {selectedLeadIds.length > 0 && (
                <div className="flex items-center justify-between bg-blue-50/90 border-b border-blue-200 px-5 py-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-950">
                      {selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'Record' : 'Records'} Selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadIds([])}
                      className="text-xs text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                    >
                      Clear selection
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <SlidersHorizontal size={14} />
                      <span>Bulk Update</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = selectedLeadIds.length > 0 && selectedLeadIds.length < leads.length;
                          }
                        }}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer align-middle"
                        title="Select / deselect all leads on this page"
                      />
                    </th>
                    {renderSortableHeader('title', 'Title')}
                    {renderSortableHeader('customer', 'Customer')}
                    {renderSortableHeader('domain', 'Domain')}
                    {renderSortableHeader('stage', 'Stage')}
                    {renderSortableHeader('amount', 'Amount (₹)')}
                    {renderSortableHeader('priority', 'Priority')}
                    {renderSortableHeader('assigned', 'Assigned')}
                    {renderSortableHeader('expected_close_date', 'Close Date')}
                    {renderSortableHeader('next_visit', 'Next Visit')}
                    {renderSortableHeader('created_at', 'Created Time')}
                    {renderSortableHeader('updated_at', 'Modified Time')}
                    {renderSortableHeader('description', 'Description')}
                    <th className="text-center px-5 py-3 text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((l) => (
                    <tr
                      key={l.id}
                      className={`hover:bg-gray-50 cursor-pointer transition ${
                        selectedLeadIds.includes(l.id) ? 'bg-blue-50/50 hover:bg-blue-50/70' : ''
                      }`}
                      onClick={(e) => handleOpenLead(l.id, e)}
                      onAuxClick={(e) => {
                        if (e.button === 1) handleOpenLead(l.id, e);
                      }}
                    >
                      <td className="w-12 px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(l.id)}
                          onChange={() => handleToggleSelectLead(l.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer align-middle"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {l.title}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Building2 size={14} className="text-gray-400" />
                          {l.customer_company || l.company_name || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {l.domain_name ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
                            <Globe size={12} className="text-slate-500" />
                            {l.domain_name}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: `${l.stage_color || '#2563EB'}15`,
                            color: l.stage_color || '#2563EB',
                          }}
                        >
                          {l.stage_name}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {l.estimated_value ? (
                          <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                            ₹{Number(l.estimated_value).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                          style={{
                            background: `${
                              PRIORITY_COLOR[l.priority] || '#64748B'
                            }15`,
                            color: PRIORITY_COLOR[l.priority] || '#64748B',
                          }}
                        >
                          {l.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-700 text-sm whitespace-nowrap">
                          <User size={14} className="text-gray-400" />
                          {l.assigned_to_name || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {l.expected_close_date
                          ? format(
                              new Date(l.expected_close_date),
                              'dd MMM yyyy'
                            )
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {l.next_visit ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-xs">
                            <Calendar size={12} className="text-blue-500" />
                            {format(new Date(l.next_visit), 'dd MMM yyyy')}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                        {l.created_at ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">
                              {format(new Date(l.created_at), 'dd MMM yyyy')}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {format(new Date(l.created_at), 'hh:mm a')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                        {l.updated_at ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">
                              {format(new Date(l.updated_at), 'dd MMM yyyy')}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {format(new Date(l.updated_at), 'hh:mm a')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 max-w-[220px]" title={l.description || ''}>
                        {l.description ? (
                          <span className="line-clamp-2 text-gray-700 leading-snug">
                            {l.description}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="View"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLead(l.id, e);
                            }}
                            onAuxClick={(e) => {
                              if (e.button === 1) {
                                e.stopPropagation();
                                handleOpenLead(l.id, e);
                              }
                            }}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600 cursor-pointer"
                          >
                            <Eye size={17} />
                          </button>
                          {isAdmin && (
                            scope === 'deleted' || l.is_active === 0 || l.is_active === false ? (
                              <button
                                type="button"
                                title="Restore Lead"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreLead(l);
                                }}
                                className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                              >
                                <RotateCcw size={16} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Delete Lead"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLeadClick(l);
                                }}
                                className="p-2 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination for List View */}
            <PaginationBar
              page={page}
              total={total}
              limit={limit}
              setPage={setPage}
              setLimit={setLimit}
              loading={loading}
              className="border-x-0 border-b-0 rounded-t-none shadow-none"
            />
          </>
        )}
      </div>
      )}

      {/* ================================================= */}
            {/* CUSTOM FILTER SLIDE-OUT DRAWER (RIGHT) */}
      <CustomFilterDrawer
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={{
          search: search,
          stages: filterStages,
          priorities: filterPriorities,
          users: filterUsers,
          sources: filterSources,
          scope: scope,
          dateField: dateField,
          startDate: startDate,
          endDate: endDate,
          customers: filterCustomers,
          customerGroups: filterCustomerGroups,
          domains: filterDomains,
          minValue: filterMinValue,
          maxValue: filterMaxValue,
          statusFilter: filterStatus,
        }}
        onApply={(newFilters) => {
          if (newFilters.search !== undefined) {
            setSearch(newFilters.search);
          }
          setFilterStages(newFilters.stages);
          setFilterPriorities(newFilters.priorities);
          setFilterUsers(newFilters.users);
          setFilterSources(newFilters.sources);
          setScope(newFilters.scope);
          setDateField(newFilters.dateField);
          setStartDate(newFilters.startDate);
          setEndDate(newFilters.endDate);
          setFilterCustomers(newFilters.customers);
          setFilterCustomerGroups(newFilters.customerGroups);
          setFilterDomains(newFilters.domains);
          setFilterMinValue(newFilters.minValue);
          setFilterMaxValue(newFilters.maxValue);
          setFilterStatus(newFilters.statusFilter);
          setPage(1);
        }}
        onReset={() => {
          try {
            sessionStorage.removeItem(LEADS_FILTERS_KEY);
          } catch (e) {}
          setSearch('');
          setFilterStages([]);
          setFilterPriorities([]);
          setFilterUsers([]);
          setFilterSources([]);
          setStartDate('');
          setEndDate('');
          setDateField('expected_close_date');
          setFilterCustomers([]);
          setFilterCustomerGroups([]);
          setFilterDomains([]);
          setFilterMinValue('');
          setFilterMaxValue('');
          setFilterStatus('all');
          setSortBy('');
          setSortOrder('desc');
          if (isAdmin) setScope('all');
          if (isSalesManager) setScope('domain');
          setPage(1);
        }}
        stages={stages}
        usersList={usersList}
        isAdmin={isAdmin}
        isSalesManager={isSalesManager}
      />

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedLeadIds={selectedLeadIds}
        domainsList={domainsList}
        usersList={usersList}
        stages={stages}
        isAdmin={isAdmin}
        onSuccess={() => {
          setSelectedLeadIds([]);
          loadAll();
        }}
      />

    </div>
  );
}