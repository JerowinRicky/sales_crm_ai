import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, RefreshCw, Plus, MoreHorizontal, Save, X, Target,
  Edit2, Copy, Trash2, LayoutGrid, Calendar, User, Filter, Star,
  Layers, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ComponentGrid from '../../components/analytics/ComponentGrid';
import ComponentEditorModal from '../../components/analytics/ComponentEditorModal';
import { DashboardDetailsModal, ManageTargetsModal } from '../../components/analytics/DashboardModals';
import ConfirmModal from '../../components/common/ConfirmModal';

const DEFAULT_DATE_RANGES = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' }
];

export default function AnalyticsPage() {
  const { user, isAdmin, isManager } = useAuth();
  const [dashboards, setDashboards] = useState([]);
  const [activeDashboard, setActiveDashboard] = useState(null);
  const [components, setComponents] = useState([]);
  const [initialComponents, setInitialComponents] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [schemaMeta, setSchemaMeta] = useState(null);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedStage, setSelectedStage] = useState('won_po_receipt');
  const [selectedDateRange, setSelectedDateRange] = useState('this_month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [isCreateDashModalOpen, setIsCreateDashModalOpen] = useState(false);
  const [isEditDashModalOpen, setIsEditDashModalOpen] = useState(false);
  const [isManageTargetsOpen, setIsManageTargetsOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    loading: false,
    onConfirm: null
  });

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false);
  const dashboardDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
      if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(e.target)) {
        setDashboardDropdownOpen(false);
      }
    }
    if (moreMenuOpen || dashboardDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen, dashboardDropdownOpen]);

  useEffect(() => {
    analyticsAPI.getSchemaMetadata()
      .then(res => setSchemaMeta(res.data))
      .catch(err => console.error('Error fetching schema metadata:', err));
  }, []);

  const loadDashboards = (selectId = null) => {
    setLoading(true);
    analyticsAPI.getDashboards()
      .then(res => {
        const list = res.data || [];
        setDashboards(list);
        if (list.length > 0) {
          const targetId = selectId || list[0].id;
          loadDashboardDetails(targetId);
        } else {
          setActiveDashboard(null);
          setComponents([]);
          setInitialComponents([]);
          setLoading(false);
        }
      })
      .catch(() => {
        toast.error('Failed to load dashboards');
        setLoading(false);
      });
  };

  const loadDashboardDetails = (id) => {
    setLoading(true);
    analyticsAPI.getDashboardById(id)
      .then(res => {
        const d = res.data;
        setActiveDashboard(d);
        const comps = d.components || [];
        setComponents(comps);
        setInitialComponents(JSON.parse(JSON.stringify(comps)));
        setIsDirty(false);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load dashboard components');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  const handleSelectDashboard = (id) => {
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes on this dashboard. Switch anyway?',
        confirmText: 'Switch Dashboard',
        cancelText: 'Stay Here',
        variant: 'warning',
        loading: false,
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          loadDashboardDetails(id);
        }
      });
      return;
    }
    loadDashboardDetails(id);
  };

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Refreshing dashboard metrics...');
  };

  const handleAddNewComponent = () => {
    setEditingComponent(null);
    setIsCompModalOpen(true);
  };

  const handleEditComponent = (comp) => {
    setEditingComponent(comp);
    setIsCompModalOpen(true);
  };

  const handleSaveComponent = (savedComp) => {
    let updated = [];
    if (savedComp.id || savedComp._tempId) {
      updated = components.map(c =>
        (c.id && c.id === savedComp.id) || (c._tempId && c._tempId === savedComp._tempId)
          ? savedComp
          : c
      );
    } else {
      const tempId = `temp_${Date.now()}`;
      updated = [...components, { ...savedComp, _tempId: tempId, order_position: components.length }];
    }
    setComponents(updated);
    setIsDirty(true);
    toast.success('Component updated. Click Save Dashboard to persist changes.');
  };

  const handleDuplicateComponent = (comp) => {
    const clone = {
      ...JSON.parse(JSON.stringify(comp)),
      id: undefined,
      _tempId: `temp_${Date.now()}`,
      title: `${comp.title} (Copy)`,
      order_position: components.length
    };
    const updated = [...components, clone];
    setComponents(updated);
    setIsDirty(true);
    toast.success('Component duplicated');
  };

  const handleDeleteComponent = (comp) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Component',
      message: `Delete "${comp.title || 'Untitled Component'}" from dashboard?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      loading: false,
      onConfirm: () => {
        const updated = components.filter(c =>
          !((c.id && c.id === comp.id) || (c._tempId && c._tempId === comp._tempId))
        );
        setComponents(updated);
        setIsDirty(true);
        toast.success('Component deleted');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResizeComponent = (comp, newWidth) => {
    const updated = components.map(c => {
      if ((c.id && c.id === comp.id) || (c._tempId && c._tempId === comp._tempId)) {
        return {
          ...c,
          layout: { ...(c.layout || {}), width: newWidth }
        };
      }
      return c;
    });
    setComponents(updated);
    setIsDirty(true);
  };

  const handleReorderComponents = (reordered) => {
    setComponents(reordered);
    setIsDirty(true);
  };

  const handleSaveDashboard = () => {
    if (!activeDashboard) return;

    analyticsAPI.updateDashboard(activeDashboard.id, {
      name: activeDashboard.name,
      description: activeDashboard.description,
      visibility: activeDashboard.visibility,
      components: components
    })
      .then(res => {
        toast.success('Dashboard saved successfully');
        const updatedD = res.data;
        setActiveDashboard(updatedD);
        setComponents(updatedD.components || []);
        setInitialComponents(JSON.parse(JSON.stringify(updatedD.components || [])));
        setIsDirty(false);
      })
      .catch(err => {
        toast.error(err.message || 'Error saving dashboard');
      });
  };

  const handleCancelEditing = () => {
    setComponents(JSON.parse(JSON.stringify(initialComponents)));
    setIsDirty(false);
    toast('Changes discarded');
  };

  const handleSetDefaultDashboard = (dash) => {
    const target = dash || activeDashboard;
    if (!target || target.is_default === 1) return;
    analyticsAPI.setDefaultDashboard(target.id)
      .then(res => {
        toast.success(`"${target.name}" is now the default dashboard`);
        setActiveDashboard(prev => (prev?.id === target.id ? { ...prev, is_default: 1 } : prev));
        setDashboards(prev =>
          prev.map(d => ({
            ...d,
            is_default: d.id === target.id ? 1 : 0
          }))
        );
      })
      .catch(err => {
        toast.error(err.message || 'Failed to set default dashboard');
      });
  };

  const handleCloneDashboard = () => {
    if (!activeDashboard) return;
    analyticsAPI.cloneDashboard(activeDashboard.id)
      .then(res => {
        toast.success('Dashboard cloned successfully');
        loadDashboards(res.data.id);
      })
      .catch(err => toast.error(err.message || 'Error cloning dashboard'));
  };

  const handleDeleteDashboard = (dash = null) => {
    const target = dash || activeDashboard;
    if (!target) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Dashboard',
      message: `Are you sure you want to permanently delete "${target.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          await analyticsAPI.deleteDashboard(target.id);
          toast.success(`Dashboard "${target.name}" deleted`);
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
          loadDashboards();
        } catch (err) {
          toast.error(err.message || 'Error deleting dashboard');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  const activeFilters = {
    user_id: selectedUser || null,
    domain_id: selectedDomain || null,
    stage_id: selectedStage,
    date_range: selectedDateRange,
    date_from: selectedDateRange === 'custom' ? customDateFrom : null,
    date_to: selectedDateRange === 'custom' ? customDateTo : null,
    _refreshKey: refreshKey
  };

  const hasActiveFilters = Boolean(
    selectedUser ||
    selectedDomain ||
    (selectedStage && selectedStage !== 'won_po_receipt') ||
    (selectedDateRange && selectedDateRange !== 'this_month')
  );

  const handleResetFilters = () => {
    setSelectedUser('');
    setSelectedDomain('');
    setSelectedStage('won_po_receipt');
    setSelectedDateRange('this_month');
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. TOP TOOLBAR */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 px-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Selectors & Filters */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Custom Dashboard Selector Dropdown */}
          <div className="relative" ref={dashboardDropdownRef}>
            <button
              type="button"
              onClick={() => setDashboardDropdownOpen(!dashboardDropdownOpen)}
              disabled={loading || dashboards.length === 0}
              className="h-9 px-3 min-w-[240px] max-w-[320px] rounded-lg border border-gray-200 bg-white font-semibold text-xs text-gray-800 shadow-sm flex items-center justify-between gap-2 hover:border-gray-300 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate">{activeDashboard?.name || 'Select Dashboard'}</span>
                {activeDashboard?.is_default === 1 && (
                  <span title="Default Dashboard" className="inline-flex items-center text-amber-500 shrink-0">
                    <Star size={13} className="fill-amber-400 text-amber-500" />
                  </span>
                )}
              </div>
              <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${dashboardDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dashboardDropdownOpen && (
              <div className="absolute left-0 top-10 w-84 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 animate-in fade-in">
                <div className="px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <span>Dashboards ({dashboards.length})</span>
                  <span className="text-[10px] lowercase font-normal text-gray-400">★ default</span>
                </div>

                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-gray-50">
                  {dashboards.map(d => (
                    <div
                      key={d.id}
                      className={`group flex items-center justify-between px-3.5 py-2 text-xs transition ${
                        d.id === activeDashboard?.id
                          ? 'bg-blue-50/70 text-blue-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {/* Dashboard Title & Selection */}
                      <div
                        onClick={() => {
                          setDashboardDropdownOpen(false);
                          handleSelectDashboard(d.id);
                        }}
                        className="flex-1 flex items-center gap-2 truncate mr-2 cursor-pointer"
                        title={d.name}
                      >
                        <span className="truncate">{d.name}</span>
                        {d.is_default === 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full shrink-0">
                            <Star size={10} className="fill-amber-400 text-amber-500" />
                            Default
                          </span>
                        )}
                      </div>

                      {/* Right-Side Action Icons: Star & Delete inside dropdown */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Star / Set as Default */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefaultDashboard(d);
                          }}
                          disabled={d.is_default === 1}
                          title={d.is_default === 1 ? 'Current default dashboard' : `Set "${d.name}" as default`}
                          className={`p-1.5 rounded transition ${
                            d.is_default === 1
                              ? 'text-amber-500 cursor-default'
                              : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50 cursor-pointer'
                          }`}
                        >
                          <Star
                            size={14}
                            className={d.is_default === 1 ? 'fill-amber-400 text-amber-500' : ''}
                          />
                        </button>

                        {/* Delete Dashboard */}
                        {(isAdmin || d.created_by === user?.id) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDashboardDropdownOpen(false);
                              handleDeleteDashboard(d);
                            }}
                            title={`Delete "${d.name}"`}
                            className="p-1.5 rounded text-gray-300 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-1.5 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDashboardDropdownOpen(false);
                      setIsCreateDashModalOpen(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create New Dashboard</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User / Owner Filter */}
          {(!schemaMeta?.users || schemaMeta.users.length > 1) && (
            <div className="relative min-w-[150px]">
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full h-9 pl-8 pr-7 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 cursor-pointer appearance-none transition"
              >
                <option value="">All Users</option>
                {schemaMeta?.users?.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <User size={13} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
              <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Domain Filter */}
          {schemaMeta?.domains && schemaMeta.domains.length > 0 && (
            <div className="relative min-w-[140px]">
              <select
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="w-full h-9 pl-8 pr-7 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 cursor-pointer appearance-none transition"
              >
                <option value="">All Domains</option>
                {schemaMeta.domains.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <Layers size={13} className="absolute left-2.5 top-2.5 text-purple-600 pointer-events-none" />
              <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Stage Calculation Filter */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              title="Filter stage calculated for executive amounts and metrics"
              className="w-full h-9 pl-8 pr-7 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 cursor-pointer appearance-none transition"
            >
              <option value="all">All Stages (Total Pipeline)</option>
              <option value="won_po_receipt">Won - PO Receipt</option>
              {schemaMeta?.stages?.map(s => {
                if (s.name?.toLowerCase().includes('won') && s.name?.toLowerCase().includes('po')) return null;
                return (
                  <option key={s.id} value={s.id}>{s.name}</option>
                );
              })}
            </select>
            <Filter size={13} className="absolute left-2.5 top-2.5 text-blue-600 pointer-events-none" />
            <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Range Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedDateRange}
              onChange={e => setSelectedDateRange(e.target.value)}
              className="w-full h-9 pl-8 pr-7 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 cursor-pointer appearance-none transition"
            >
              {(schemaMeta?.date_ranges && schemaMeta.date_ranges.length > 0 ? schemaMeta.date_ranges : DEFAULT_DATE_RANGES).map(r => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <Calendar size={13} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
            <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
          </div>

          {selectedDateRange === 'custom' && (
            <div className="flex items-center gap-1.5 animate-in">
              <input
                type="date"
                value={customDateFrom}
                onChange={e => setCustomDateFrom(e.target.value)}
                className="h-9 px-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={customDateTo}
                onChange={e => setCustomDateTo(e.target.value)}
                className="h-9 px-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
              />
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters to default"
              className="h-9 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1.5 text-xs font-semibold transition shadow-xs"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            title="Refresh all metrics"
            className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition shadow-sm"
          >
            <RefreshCw size={14} />
          </button>

          <button
            type="button"
            onClick={handleAddNewComponent}
            className="h-9 px-3.5 rounded-lg border border-blue-600 bg-blue-50/50 text-blue-600 hover:bg-blue-100/60 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus size={14} /> Add Component
          </button>

          <button
            type="button"
            onClick={() => setIsCreateDashModalOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
          >
            <LayoutGrid size={14} /> Create Dashboard
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              title="More dashboard options"
              className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition shadow-sm"
            >
              <MoreHorizontal size={15} />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 animate-in">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    handleSetDefaultDashboard(activeDashboard);
                  }}
                  disabled={activeDashboard?.is_default === 1}
                  className={`w-full px-3.5 py-1.5 text-left text-xs flex items-center gap-2 ${
                    activeDashboard?.is_default === 1
                      ? 'text-amber-700 bg-amber-50/50 font-medium cursor-default'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer'
                  }`}
                >
                  <Star
                    size={13}
                    className={activeDashboard?.is_default === 1 ? 'fill-amber-400 text-amber-500' : 'text-gray-400'}
                  />
                  <span>{activeDashboard?.is_default === 1 ? 'Default Dashboard (Current)' : 'Set as Default Dashboard'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setIsEditDashModalOpen(true);
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                >
                  <Edit2 size={13} /> Edit Dashboard Info
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    handleCloneDashboard();
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                >
                  <Copy size={13} /> Clone Dashboard
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setIsManageTargetsOpen(true);
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                >
                  <Target size={13} /> Manage Targets & Goals
                </button>

                <div className="border-t border-gray-100 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    handleDeleteDashboard();
                  }}
                  className="w-full px-3.5 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={13} /> Delete Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. UNSAVED CHANGES BANNER */}
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 px-5 flex items-center justify-between shadow-sm animate-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-bold text-amber-900">
              Unsaved changes on this dashboard
            </span>
            <span className="text-xs text-amber-700 hidden sm:inline">
              — Components, layout, or sizing have been modified.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelEditing}
              className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100/60 transition inline-flex items-center gap-1"
            >
              <X size={13} /> Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSaveDashboard}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Save size={13} /> Save Dashboard
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN CANVAS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
          <span className="text-xs font-medium">Loading dashboard layout...</span>
        </div>
      ) : (
        <ComponentGrid
          components={components}
          dashboardFilters={activeFilters}
          isEditMode={isDirty}
          onEditComponent={handleEditComponent}
          onDuplicateComponent={handleDuplicateComponent}
          onDeleteComponent={handleDeleteComponent}
          onResizeComponent={handleResizeComponent}
          onReorderComponents={handleReorderComponents}
          onAddNewComponent={handleAddNewComponent}
        />
      )}

      {/* 4. MODALS */}
      <ComponentEditorModal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        onSaveComponent={handleSaveComponent}
        initialComponent={editingComponent}
        schemaMeta={schemaMeta}
      />

      <DashboardDetailsModal
        isOpen={isCreateDashModalOpen}
        onClose={() => setIsCreateDashModalOpen(false)}
        onSave={(data) => {
          analyticsAPI.createDashboard(data)
            .then(res => {
              toast.success('Dashboard created successfully');
              setIsCreateDashModalOpen(false);
              loadDashboards(res.data.id);
            })
            .catch(err => toast.error(err.message || 'Error creating dashboard'));
        }}
      />

      <DashboardDetailsModal
        isOpen={isEditDashModalOpen}
        isEdit={true}
        initialData={activeDashboard}
        onClose={() => setIsEditDashModalOpen(false)}
        onSave={(data) => {
          analyticsAPI.updateDashboard(activeDashboard.id, data)
            .then(res => {
              toast.success('Dashboard info updated');
              setIsEditDashModalOpen(false);
              loadDashboards(res.data.id);
            })
            .catch(err => toast.error(err.message || 'Error updating dashboard'));
        }}
      />

      <ManageTargetsModal
        isOpen={isManageTargetsOpen}
        onClose={() => setIsManageTargetsOpen(false)}
        onTargetChanged={() => {
          analyticsAPI.getSchemaMetadata().then(res => setSchemaMeta(res.data));
          setRefreshKey(prev => prev + 1);
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

