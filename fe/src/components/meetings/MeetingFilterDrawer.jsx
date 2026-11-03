import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Check,
  Search,
  Calendar,
  User,
  Users,
  AlertCircle,
  Briefcase,
  UserCheck,
  Bookmark,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Building2,
  Video,
  Clock,
  Layers,
} from 'lucide-react';
import { customersAPI, savedFiltersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { id: 'Not Started', label: 'Not Started', color: '#64748B' },
  { id: 'In Progress', label: 'In Progress', color: '#3B82F6' },
  { id: 'Completed', label: 'Completed', color: '#10B981' },
  { id: 'Visited', label: 'Visited', color: '#8B5CF6' },
  { id: 'Deferred', label: 'Deferred', color: '#F97316' },
  { id: 'Waiting For Input', label: 'Waiting For Input', color: '#EAB308' },
];

const MEETING_TYPES = [
  { id: 'In Person', label: 'In Person' },
  { id: 'Online', label: 'Online' },
];

const CUSTOMER_TYPES = [
  { id: 'New', label: 'New Customer' },
  { id: 'Existing', label: 'Existing Customer' },
];

const RELATED_TYPES = [
  { id: 'Lead', label: 'Lead' },
  { id: 'Customer', label: 'Customer' },
  { id: 'Product', label: 'Product' },
  { id: 'Normal', label: 'Normal / Other' },
];

export default function MeetingFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  usersList = [],
  isAdmin = false,
}) {
  // Draft filter states
  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatuses, setDraftStatuses] = useState([]);
  const [draftMeetingTypes, setDraftMeetingTypes] = useState([]);
  const [draftCustomerTypes, setDraftCustomerTypes] = useState([]);
  const [draftRelatedTypes, setDraftRelatedTypes] = useState([]);
  const [draftUsers, setDraftUsers] = useState([]);
  const [draftCustomers, setDraftCustomers] = useState([]);
  const [draftScope, setDraftScope] = useState('me');
  const [draftDateField, setDraftDateField] = useState('from_date');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');

  // Master data
  const [customersList, setCustomersList] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [userSearchText, setUserSearchText] = useState('');

  // Visible dynamic fields
  const [visibleFields, setVisibleFields] = useState(new Set());

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState(null); // 'system' | 'fields' | 'modules' | null

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');

  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Saved Searches from Database
  const fetchSavedSearches = async () => {
    try {
      const res = await savedFiltersAPI.getAll('meetings');
      const list = res.data?.data || res.data || [];
      setSavedSearches(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load saved meeting filters:', e);
      setSavedSearches([]);
    }
  };

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  // Fetch customers when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    customersAPI
      .getAll({ limit: 300 })
      .then((res) => {
        const list = res.data || (Array.isArray(res) ? res : []);
        setCustomersList(list);
      })
      .catch(() => {});
  }, [isOpen]);

  // Sync draft states when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    const searchVal = filters?.search || '';
    const statusesVal = filters?.statuses ? [...filters.statuses] : [];
    const meetingTypesVal = filters?.meetingTypes ? [...filters.meetingTypes] : [];
    const customerTypesVal = filters?.customerTypes ? [...filters.customerTypes] : [];
    const relatedTypesVal = filters?.relatedTypes ? [...filters.relatedTypes] : [];
    const usersVal = filters?.users ? [...filters.users] : [];
    const customersVal = filters?.customers ? [...filters.customers] : [];
    const scopeVal = filters?.scope || (isAdmin ? 'all' : 'me');
    const dateFieldVal = filters?.dateField || 'from_date';
    const startDateVal = filters?.startDate || '';
    const endDateVal = filters?.endDate || '';

    setDraftSearch(searchVal);
    setDraftStatuses(statusesVal);
    setDraftMeetingTypes(meetingTypesVal);
    setDraftCustomerTypes(customerTypesVal);
    setDraftRelatedTypes(relatedTypesVal);
    setDraftUsers(usersVal);
    setDraftCustomers(customersVal);
    setDraftScope(scopeVal);
    setDraftDateField(dateFieldVal);
    setDraftStartDate(startDateVal);
    setDraftEndDate(endDateVal);

    // Auto-detect which fields should be visible based on active values
    const visible = new Set();
    if (searchVal.trim()) visible.add('search');
    if (isAdmin && (scopeVal === 'me' || scopeVal === 'all')) visible.add('scope');
    if (statusesVal.length > 0) visible.add('status');
    if (meetingTypesVal.length > 0) visible.add('meeting_type');
    if (customerTypesVal.length > 0) visible.add('customer_type');
    if (relatedTypesVal.length > 0) visible.add('related_type');
    if (usersVal.length > 0) visible.add('assigned_users');
    if (customersVal.length > 0) visible.add('customer');
    if (startDateVal || endDateVal) visible.add('date_range');

    setVisibleFields(visible);
    setOpenDropdown(null);
    setShowSaveInput(false);
  }, [isOpen, filters, isAdmin]);

  const toggleArrayItem = (list, setList, item) => {
    const str = String(item);
    if (list.includes(str)) {
      setList(list.filter((x) => x !== str));
    } else {
      setList([...list, str]);
    }
  };

  const addField = (fieldKey) => {
    setVisibleFields((prev) => new Set([...prev, fieldKey]));
    setOpenDropdown(null);
  };

  const removeField = (fieldKey) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });

    switch (fieldKey) {
      case 'search':
        setDraftSearch('');
        break;
      case 'scope':
        setDraftScope(isAdmin ? 'all' : 'me');
        break;
      case 'status':
        setDraftStatuses([]);
        break;
      case 'meeting_type':
        setDraftMeetingTypes([]);
        break;
      case 'customer_type':
        setDraftCustomerTypes([]);
        break;
      case 'related_type':
        setDraftRelatedTypes([]);
        break;
      case 'assigned_users':
        setDraftUsers([]);
        break;
      case 'customer':
        setDraftCustomers([]);
        break;
      case 'date_preset':
      case 'date_range':
        setDraftStartDate('');
        setDraftEndDate('');
        break;
      default:
        break;
    }
  };

  const applyDatePreset = (preset) => {
    const today = new Date();
    const formatYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'today') {
      const s = formatYMD(today);
      setDraftStartDate(s);
      setDraftEndDate(s);
    } else if (preset === 'tomorrow') {
      const tom = new Date(today);
      tom.setDate(today.getDate() + 1);
      const s = formatYMD(tom);
      setDraftStartDate(s);
      setDraftEndDate(s);
    } else if (preset === 'this_week') {
      const day = today.getDay();
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setDraftStartDate(formatYMD(monday));
      setDraftEndDate(formatYMD(sunday));
    } else if (preset === 'next_week') {
      const day = today.getDay();
      const diffToNextMonday = today.getDate() - day + (day === 0 ? -6 : 1) + 7;
      const nextMonday = new Date(today);
      nextMonday.setDate(diffToNextMonday);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      setDraftStartDate(formatYMD(nextMonday));
      setDraftEndDate(formatYMD(nextSunday));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDraftStartDate(formatYMD(firstDay));
      setDraftEndDate(formatYMD(lastDay));
    } else if (preset === 'last_7_days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setDraftStartDate(formatYMD(past));
      setDraftEndDate(formatYMD(today));
    } else if (preset === 'last_30_days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setDraftStartDate(formatYMD(past));
      setDraftEndDate(formatYMD(today));
    }
  };

  const handleReset = () => {
    setDraftSearch('');
    setDraftStatuses([]);
    setDraftMeetingTypes([]);
    setDraftCustomerTypes([]);
    setDraftRelatedTypes([]);
    setDraftUsers([]);
    setDraftCustomers([]);
    setDraftStartDate('');
    setDraftEndDate('');
    setDraftDateField('from_date');
    setDraftScope(isAdmin ? 'all' : 'me');
    setVisibleFields(new Set());
    onReset?.();
  };

  const handleApply = () => {
    onApply?.({
      search: draftSearch.trim(),
      statuses: draftStatuses,
      meetingTypes: draftMeetingTypes,
      customerTypes: draftCustomerTypes,
      relatedTypes: draftRelatedTypes,
      users: draftUsers,
      customers: draftCustomers,
      scope: draftScope,
      dateField: draftDateField,
      startDate: draftStartDate,
      endDate: draftEndDate,
    });
    onClose?.();
  };

  // Saved Searches Actions
  const handleSaveSearch = async () => {
    if (!newSearchName.trim()) {
      toast.error('Please enter a name for this template');
      return;
    }

    if (activeCount === 0) {
      toast.error('Please configure at least one filter before saving as a template');
      return;
    }

    const criteria = {
      search: draftSearch.trim(),
      statuses: draftStatuses,
      meetingTypes: draftMeetingTypes,
      customerTypes: draftCustomerTypes,
      relatedTypes: draftRelatedTypes,
      users: draftUsers,
      customers: draftCustomers,
      scope: draftScope,
      dateField: draftDateField,
      startDate: draftStartDate,
      endDate: draftEndDate,
    };

    try {
      const res = await savedFiltersAPI.create({
        name: newSearchName.trim(),
        module: 'meetings',
        criteria,
      });
      const created = res.data?.data;
      if (created) {
        setSavedSearches((prev) => [created, ...prev]);
      } else {
        await fetchSavedSearches();
      }
      toast.success(`Template "${newSearchName.trim()}" saved!`);
      setNewSearchName('');
      setShowSaveInput(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save search template');
    }
  };

  const handleDeleteSavedSearch = async (e, id) => {
    e.stopPropagation();
    try {
      await savedFiltersAPI.remove(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      toast.success('Template removed');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleLoadSavedSearch = (s) => {
    const c = s.criteria || {};
    const searchVal = c.search || '';
    const statusesVal = c.statuses || [];
    const meetingTypesVal = c.meetingTypes || [];
    const customerTypesVal = c.customerTypes || [];
    const relatedTypesVal = c.relatedTypes || [];
    const usersVal = c.users || [];
    const customersVal = c.customers || [];
    const scopeVal = c.scope || (isAdmin ? 'all' : 'me');
    const dateFieldVal = c.dateField || 'from_date';
    const startDateVal = c.startDate || '';
    const endDateVal = c.endDate || '';

    setDraftSearch(searchVal);
    setDraftStatuses(statusesVal);
    setDraftMeetingTypes(meetingTypesVal);
    setDraftCustomerTypes(customerTypesVal);
    setDraftRelatedTypes(relatedTypesVal);
    setDraftUsers(usersVal);
    setDraftCustomers(customersVal);
    setDraftScope(scopeVal);
    setDraftDateField(dateFieldVal);
    setDraftStartDate(startDateVal);
    setDraftEndDate(endDateVal);

    const visible = new Set();
    if (searchVal.trim()) visible.add('search');
    if (isAdmin && (scopeVal === 'me' || scopeVal === 'all')) visible.add('scope');
    if (statusesVal.length) visible.add('status');
    if (meetingTypesVal.length) visible.add('meeting_type');
    if (customerTypesVal.length) visible.add('customer_type');
    if (relatedTypesVal.length) visible.add('related_type');
    if (usersVal.length) visible.add('assigned_users');
    if (customersVal.length) visible.add('customer');
    if (startDateVal || endDateVal) visible.add('date_range');

    setVisibleFields(visible);

    onApply?.({
      search: searchVal.trim(),
      statuses: statusesVal,
      meetingTypes: meetingTypesVal,
      customerTypes: customerTypesVal,
      relatedTypes: relatedTypesVal,
      users: usersVal,
      customers: customersVal,
      scope: scopeVal,
      dateField: dateFieldVal,
      startDate: startDateVal,
      endDate: endDateVal,
    });

    toast.success(`Applied template "${s.name}"`);
  };

  const activeCount = [
    Boolean(draftSearch.trim()),
    Boolean(draftStatuses.length),
    Boolean(draftMeetingTypes.length),
    Boolean(draftCustomerTypes.length),
    Boolean(draftRelatedTypes.length),
    Boolean(isAdmin && draftUsers.length),
    Boolean(draftCustomers.length),
    Boolean(draftStartDate || draftEndDate),
    isAdmin && draftScope === 'me',
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Filter Meetings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Customize search and filter criteria</p>
            </div>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6" ref={dropdownRef}>
            {/* 1. Saved Search Templates */}
            <div className="border-b border-gray-100 pb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Bookmark size={14} className="text-blue-600" />
                  Saved Search Templates
                </span>
                {!showSaveInput && (
                  <button
                    type="button"
                    onClick={() => setShowSaveInput(true)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Save Current as Template</span>
                  </button>
                )}
              </div>

              {/* Inline Save Input */}
              {showSaveInput && (
                <div className="mb-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-900">Name your template</span>
                    <span className="text-[11px] text-blue-700 font-medium">
                      {activeCount > 0 ? `${activeCount} criteria selected` : 'Select filters below'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSearchName}
                      onChange={(e) => setNewSearchName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSearch();
                        if (e.key === 'Escape') {
                          setShowSaveInput(false);
                          setNewSearchName('');
                        }
                      }}
                      placeholder="Template name (e.g. My In-Person Meetings)..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveSearch}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer shadow-xs transition shrink-0"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSaveInput(false);
                        setNewSearchName('');
                      }}
                      className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {savedSearches.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 text-center">
                  <Bookmark size={16} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-600 font-medium">No saved search templates yet</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure filters below and click "Save Current as Template" for one-click access.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleLoadSavedSearch(s)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 transition cursor-pointer shadow-2xs"
                      title={`Click to apply template "${s.name}"`}
                    >
                      <Bookmark size={12} className="text-blue-500" />
                      <span className="font-medium">{s.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedSearch(e, s.id)}
                        className="text-gray-400 hover:text-red-500 ml-1 p-0.5 rounded cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. System Defined Searches */}
            <div className="border-b border-gray-100 pb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">System Defined Searches</h3>

              <div className="space-y-3">
                {/* Scope (Admin only) */}
                {visibleFields.has('scope') && isAdmin && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <User size={13} className="text-blue-600" />
                        Meeting Ownership Scope
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField('scope')}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-white cursor-pointer"
                        title="Remove criteria"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDraftScope('me')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          draftScope === 'me'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <User size={13} />
                        <span>For Me Only</span>
                        {draftScope === 'me' && <Check size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftScope('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          draftScope === 'all'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Users size={13} />
                        <span>All Meetings</span>
                        {draftScope === 'all' && <Check size={13} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Date Presets */}
                {visibleFields.has('date_preset') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Calendar size={13} className="text-blue-600" />
                        Quick Date Presets
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField('date_preset')}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-white cursor-pointer"
                        title="Remove criteria"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'today', label: 'Today' },
                        { id: 'tomorrow', label: 'Tomorrow' },
                        { id: 'this_week', label: 'This Week' },
                        { id: 'next_week', label: 'Next Week' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'last_7_days', label: 'Last 7 Days' },
                        { id: 'last_30_days', label: 'Last 30 Days' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyDatePreset(preset.id)}
                          className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300 text-xs font-medium transition cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meeting Status */}
                {visibleFields.has('status') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-blue-600" />
                        Meeting Status ({draftStatuses.length} selected)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDraftStatuses(STATUS_OPTIONS.map((s) => s.id))}
                          className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                        >
                          All
                        </button>
                        <span className="text-gray-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={() => setDraftStatuses([])}
                          className="text-[11px] text-gray-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField('status')}
                          className="text-gray-400 hover:text-red-500 p-0.5 rounded cursor-pointer ml-1"
                          title="Remove criteria"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((st) => {
                        const isSelected = draftStatuses.includes(st.id);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => toggleArrayItem(draftStatuses, setDraftStatuses, st.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: st.color }}
                            />
                            <span>{st.label}</span>
                            {isSelected && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* + Add a system defined field Button */}
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'system' ? null : 'system')}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add a system defined field</span>
                  <ChevronDown size={13} className="text-gray-400" />
                </button>

                {openDropdown === 'system' && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5 animate-in fade-in duration-150">
                    {[
                      {
                        key: 'scope',
                        label: 'Meeting Ownership Scope',
                        desc: 'Filter For Me Only vs All Meetings',
                        available: !visibleFields.has('scope') && isAdmin,
                      },
                      {
                        key: 'date_preset',
                        label: 'Quick Date Presets',
                        desc: 'Today, tomorrow, this week, next week...',
                        available: !visibleFields.has('date_preset'),
                      },
                      {
                        key: 'status',
                        label: 'Meeting Status',
                        desc: 'Not Started, In Progress, Completed...',
                        available: !visibleFields.has('status'),
                      },
                    ]
                      .filter((item) => item.available)
                      .map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => addField(item.key)}
                          className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-xs text-gray-700 hover:text-blue-600 cursor-pointer transition"
                        >
                          <div className="font-semibold text-gray-800">{item.label}</div>
                          <div className="text-[11px] text-gray-400">{item.desc}</div>
                        </button>
                      ))}
                    {![
                      !visibleFields.has('scope') && isAdmin,
                      !visibleFields.has('date_preset'),
                      !visibleFields.has('status'),
                    ].some(Boolean) && (
                      <div className="px-3.5 py-2 text-xs text-gray-400 italic">
                        All system fields added
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Search by Fields */}
            <div className="border-b border-gray-100 pb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Search by Fields</h3>

              <div className="space-y-3">
                {/* Search / Keywords */}
                {visibleFields.has('search') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Search size={13} className="text-blue-600" />
                        Keywords / Subject
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField('search')}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-white cursor-pointer"
                        title="Remove criteria"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Search subject, location, notes (comma-separated)..."
                        value={draftSearch}
                        onChange={(e) => setDraftSearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Separate multiple terms with comma (,) to match any value
                      </p>
                    </div>
                  </div>
                )}

                {/* Meeting Type */}
                {visibleFields.has('meeting_type') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Video size={13} className="text-blue-600" />
                        Meeting Type
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField('meeting_type')}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-white cursor-pointer"
                        title="Remove criteria"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {MEETING_TYPES.map((t) => {
                        const isSelected = draftMeetingTypes.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleArrayItem(draftMeetingTypes, setDraftMeetingTypes, t.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span>{t.label}</span>
                            {isSelected && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer Type */}
                {visibleFields.has('customer_type') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Briefcase size={13} className="text-indigo-600" />
                        Customer Type
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField('customer_type')}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-white cursor-pointer"
                        title="Remove criteria"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CUSTOMER_TYPES.map((ct) => {
                        const isSelected = draftCustomerTypes.includes(ct.id);
                        return (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => toggleArrayItem(draftCustomerTypes, setDraftCustomerTypes, ct.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span>{ct.label}</span>
                            {isSelected && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Meeting Owners (Admin only) */}
                {visibleFields.has('assigned_users') && isAdmin && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <UserCheck size={13} className="text-purple-600" />
                        Meeting Owners ({draftUsers.length} selected)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDraftUsers([])}
                          className="text-[11px] text-gray-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField('assigned_users')}
                          className="text-gray-400 hover:text-red-500 p-0.5 rounded cursor-pointer ml-1"
                          title="Remove criteria"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {usersList.length > 6 && (
                      <input
                        type="text"
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        placeholder="Search owners..."
                        className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {usersList
                        .filter((u) => u.is_active === 1 || u.is_active === true || u.is_active === '1' || u.is_active === undefined)
                        .filter((u) => !userSearchText || u.name?.toLowerCase().includes(userSearchText.toLowerCase()))
                        .map((u) => {
                          const isSelected = draftUsers.includes(String(u.id));
                          return (
                            <button
                              type="button"
                              key={u.id}
                              onClick={() => toggleArrayItem(draftUsers, setDraftUsers, u.id)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <span>{u.name}</span>
                              {isSelected && <Check size={12} />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Custom Date Range */}
                {visibleFields.has('date_range') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Clock size={13} className="text-blue-600" />
                        Custom Date Range
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField('date_range')}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-white cursor-pointer"
                        title="Remove criteria"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-0.5">Date Field</label>
                      <select
                        value={draftDateField}
                        onChange={(e) => setDraftDateField(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="from_date">Meeting From (Start Date & Time)</option>
                        <option value="to_date">Meeting To (End Date & Time)</option>
                        <option value="created_at">Created Date</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-0.5">From</label>
                        <input
                          type="date"
                          value={draftStartDate}
                          onChange={(e) => setDraftStartDate(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-0.5">To</label>
                        <input
                          type="date"
                          value={draftEndDate}
                          onChange={(e) => setDraftEndDate(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* + Add a field Button */}
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'fields' ? null : 'fields')}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add a field</span>
                  <ChevronDown size={13} className="text-gray-400" />
                </button>

                {openDropdown === 'fields' && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5 animate-in fade-in duration-150">
                    {[
                      {
                        key: 'search',
                        label: 'Keywords / Subject',
                        desc: 'Match meeting subject, notes, or location',
                        available: !visibleFields.has('search'),
                      },
                      {
                        key: 'meeting_type',
                        label: 'Meeting Type',
                        desc: 'In Person vs Online',
                        available: !visibleFields.has('meeting_type'),
                      },
                      {
                        key: 'customer_type',
                        label: 'Customer Type',
                        desc: 'New vs Existing Customer',
                        available: !visibleFields.has('customer_type'),
                      },
                      {
                        key: 'assigned_users',
                        label: 'Meeting Owners',
                        desc: 'Filter by user who owns the meeting',
                        available: !visibleFields.has('assigned_users') && isAdmin,
                      },
                      {
                        key: 'date_range',
                        label: 'Custom Date Range',
                        desc: 'Start / End date range picker',
                        available: !visibleFields.has('date_range'),
                      },
                    ]
                      .filter((item) => item.available)
                      .map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => addField(item.key)}
                          className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-xs text-gray-700 hover:text-blue-600 cursor-pointer transition"
                        >
                          <div className="font-semibold text-gray-800">{item.label}</div>
                          <div className="text-[11px] text-gray-400">{item.desc}</div>
                        </button>
                      ))}
                    {![
                      !visibleFields.has('search'),
                      !visibleFields.has('meeting_type'),
                      !visibleFields.has('customer_type'),
                      !visibleFields.has('assigned_users') && isAdmin,
                      !visibleFields.has('date_range'),
                    ].some(Boolean) && (
                      <div className="px-3.5 py-2 text-xs text-gray-400 italic">
                        All fields added
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Search by Related Modules */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Search by Related Modules</h3>

              <div className="space-y-3">
                {/* Related Category Type */}
                {visibleFields.has('related_type') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Layers size={13} className="text-emerald-600" />
                        Meeting Category / Related To
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField('related_type')}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-white cursor-pointer"
                        title="Remove criteria"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {RELATED_TYPES.map((rt) => {
                        const isSelected = draftRelatedTypes.includes(rt.id);
                        return (
                          <button
                            key={rt.id}
                            type="button"
                            onClick={() => toggleArrayItem(draftRelatedTypes, setDraftRelatedTypes, rt.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span>{rt.label}</span>
                            {isSelected && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer Account */}
                {visibleFields.has('customer') && (
                  <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <Building2 size={13} className="text-blue-600" />
                        Customer Company ({draftCustomers.length} selected)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDraftCustomers([])}
                          className="text-[11px] text-gray-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField('customer')}
                          className="text-gray-400 hover:text-red-500 p-0.5 rounded cursor-pointer ml-1"
                          title="Remove criteria"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {customersList.length > 5 && (
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customer company..."
                        className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {customersList
                        .filter((c) => !customerSearch || c.company_name?.toLowerCase().includes(customerSearch.toLowerCase()))
                        .map((c) => {
                          const isSelected = draftCustomers.includes(String(c.id));
                          return (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => toggleArrayItem(draftCustomers, setDraftCustomers, c.id)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <span>{c.company_name}</span>
                              {isSelected && <Check size={12} />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* + Add a related module Button */}
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'modules' ? null : 'modules')}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add a related module</span>
                  <ChevronDown size={13} className="text-gray-400" />
                </button>

                {openDropdown === 'modules' && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5 animate-in fade-in duration-150">
                    {[
                      {
                        key: 'related_type',
                        label: 'Meeting Category',
                        desc: 'Lead, Customer, Product, or Normal',
                        available: !visibleFields.has('related_type'),
                      },
                      {
                        key: 'customer',
                        label: 'Customer Company',
                        desc: 'Filter by related customer account',
                        available: !visibleFields.has('customer'),
                      },
                    ]
                      .filter((item) => item.available)
                      .map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => addField(item.key)}
                          className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-xs text-gray-700 hover:text-blue-600 cursor-pointer transition"
                        >
                          <div className="font-semibold text-gray-800">{item.label}</div>
                          <div className="text-[11px] text-gray-400">{item.desc}</div>
                        </button>
                      ))}
                    {![
                      !visibleFields.has('related_type'),
                      !visibleFields.has('customer'),
                    ].some(Boolean) && (
                      <div className="px-3.5 py-2 text-xs text-gray-400 italic">
                        All related modules added
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-gray-600 hover:text-gray-800 py-2 cursor-pointer transition"
            >
              Reset
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <span>Search</span>
                {activeCount > 0 && <span>({activeCount})</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

