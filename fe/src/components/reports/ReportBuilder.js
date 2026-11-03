import React, { useState, useEffect } from 'react';
import {
  Pencil,
  Plus,
  X,
  GripVertical,
  RefreshCw,
  Folder,
  Trash2,
  Filter,
  Check,
  Search,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { reportsAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Curated schema fields matching table columns across pages
const FALLBACK_MODULE_FIELDS = {
  Lead: [
    { key: 'title', label: 'Title', module: 'Lead', type: 'string' },
    { key: 'company_name', label: 'Customer', module: 'Lead', type: 'string' },
    { key: 'domain_name', label: 'Domain', module: 'Lead', type: 'string' },
    { key: 'stage_name', label: 'Stage', module: 'Lead', type: 'string' },
    { key: 'estimated_value', label: 'Amount (₹)', module: 'Lead', type: 'currency' },
    { key: 'priority', label: 'Priority', module: 'Lead', type: 'string' },
    { key: 'assigned_to_name', label: 'Assigned', module: 'Lead', type: 'string' },
    { key: 'expected_close_date', label: 'Close Date', module: 'Lead', type: 'date' },
    { key: 'next_visit', label: 'Next Visit', module: 'Lead', type: 'date' },
    { key: 'created_at', label: 'Created Time', module: 'Lead', type: 'datetime' },
    { key: 'updated_at', label: 'Modified Time', module: 'Lead', type: 'datetime' },
    { key: 'description', label: 'Description', module: 'Lead', type: 'string' },
    { key: 'contact_name', label: 'Contact Person', module: 'Lead', type: 'string' },
    { key: 'contact_phone', label: 'Contact Phone', module: 'Lead', type: 'string' },
    { key: 'contact_email', label: 'Contact Email', module: 'Lead', type: 'string' },
    { key: 'source', label: 'Lead Source', module: 'Lead', type: 'string' },
    { key: 'lead_type', label: 'Lead Type', module: 'Lead', type: 'string' },
    { key: 'pipeline', label: 'Pipeline', module: 'Lead', type: 'string' },
    { key: 'probability', label: 'Win Probability (%)', module: 'Lead', type: 'number' },
    { key: 'actual_close_date', label: 'Actual Close Date', module: 'Lead', type: 'date' },
    { key: 'created_by_name', label: 'Created By', module: 'Lead', type: 'string' },
  ],
  Customer: [
    { key: 'company_name', label: 'Customer / Company', module: 'Customer', type: 'string' },
    { key: 'contact_person', label: 'Primary Contact', module: 'Customer', type: 'string' },
    { key: 'phone', label: 'Phone', module: 'Customer', type: 'string' },
    { key: 'email', label: 'Email', module: 'Customer', type: 'string' },
    { key: 'industry', label: 'Industry', module: 'Customer', type: 'string' },
    { key: 'city', label: 'City', module: 'Customer', type: 'string' },
    { key: 'state', label: 'State', module: 'Customer', type: 'string' },
    { key: 'country', label: 'Country', module: 'Customer', type: 'string' },
    { key: 'assigned_to_name', label: 'Account Owner', module: 'Customer', type: 'string' },
    { key: 'created_at', label: 'Created Date', module: 'Customer', type: 'datetime' },
  ],
  Contact: [
    { key: 'contact_name', label: 'Contact Name', module: 'Contact', type: 'string' },
    { key: 'phone', label: 'Phone Number', module: 'Contact', type: 'string' },
    { key: 'email', label: 'Email Address', module: 'Contact', type: 'string' },
    { key: 'designation', label: 'Designation', module: 'Contact', type: 'string' },
    { key: 'customer_name', label: 'Company', module: 'Contact', type: 'string' },
    { key: 'created_at', label: 'Created Date', module: 'Contact', type: 'datetime' },
  ],
  Product: [
    { key: 'product_name', label: 'Product Name', module: 'Product', type: 'string' },
    { key: 'product_code', label: 'Product Code', module: 'Product', type: 'string' },
    { key: 'category', label: 'Category', module: 'Product', type: 'string' },
    { key: 'price', label: 'Standard Price', module: 'Product', type: 'currency' },
    { key: 'description', label: 'Description', module: 'Product', type: 'string' },
  ],
  Meeting: [
    { key: 'subject', label: 'Meeting Subject', module: 'Meeting', type: 'string' },
    { key: 'related_name', label: 'Related To', module: 'Meeting', type: 'string' },
    { key: 'meeting_type', label: 'Meeting Type', module: 'Meeting', type: 'string' },
    { key: 'status', label: 'Status', module: 'Meeting', type: 'string' },
    { key: 'location', label: 'Location', module: 'Meeting', type: 'string' },
    { key: 'start_time', label: 'Start Time', module: 'Meeting', type: 'datetime' },
    { key: 'end_time', label: 'End Time', module: 'Meeting', type: 'datetime' },
    { key: 'meeting_owner_name', label: 'Meeting Owner', module: 'Meeting', type: 'string' },
  ],
  Task: [
    { key: 'subject', label: 'Task Subject', module: 'Task', type: 'string' },
    { key: 'status', label: 'Status', module: 'Task', type: 'string' },
    { key: 'priority', label: 'Priority', module: 'Task', type: 'string' },
    { key: 'due_date', label: 'Due Date', module: 'Task', type: 'date' },
    { key: 'assigned_to_name', label: 'Assigned User', module: 'Task', type: 'string' },
    { key: 'description', label: 'Description', module: 'Task', type: 'string' },
  ],
  Call: [
    { key: 'subject', label: 'Call Subject', module: 'Call', type: 'string' },
    { key: 'call_type', label: 'Call Type', module: 'Call', type: 'string' },
    { key: 'call_purpose', label: 'Call Purpose', module: 'Call', type: 'string' },
    { key: 'call_status', label: 'Status', module: 'Call', type: 'string' },
    { key: 'call_start_time', label: 'Start Time', module: 'Call', type: 'datetime' },
    { key: 'call_duration', label: 'Duration (mins)', module: 'Call', type: 'number' },
    { key: 'call_owner_name', label: 'Call Owner', module: 'Call', type: 'string' },
  ],
  Visit: [
    { key: 'customer_name', label: 'Customer / Company', module: 'Visit', type: 'string' },
    { key: 'user_name', label: 'Executive', module: 'Visit', type: 'string' },
    { key: 'check_in_time', label: 'Check-In Time', module: 'Visit', type: 'datetime' },
    { key: 'check_out_time', label: 'Check-Out Time', module: 'Visit', type: 'datetime' },
    { key: 'visit_purpose', label: 'Visit Purpose', module: 'Visit', type: 'string' },
    { key: 'outcome', label: 'Visit Outcome', module: 'Visit', type: 'string' },
    { key: 'notes', label: 'Notes', module: 'Visit', type: 'string' },
  ]
};

export default function ReportBuilder({
  initialReport = null,
  initialConfig = null,
  metadata = null,
  folders = [],
  onClose,
  onCancel,
  onSaved,
  onSaveSuccess,
  onRunReport,
  onBack
}) {
  const config = initialReport || initialConfig;
  const handleClose = onClose || onCancel;
  const handleSaveDone = onSaved || onSaveSuccess;

  // Form & view state
  const [meta, setMeta] = useState(metadata);
  const [reportName, setReportName] = useState(config?.name || 'Untitled');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [primaryModule, setPrimaryModule] = useState(config?.primary_module || 'Lead');
  const [childModule, setChildModule] = useState(config?.child_module || null);
  const [selectedColumns, setSelectedColumns] = useState(
    Array.isArray(config?.selected_columns)
      ? config.selected_columns
      : typeof config?.selected_columns === 'string'
      ? JSON.parse(config.selected_columns || '[]')
      : []
  );
  const [filters, setFilters] = useState(
    Array.isArray(config?.filters)
      ? config.filters
      : typeof config?.filters === 'string'
      ? JSON.parse(config.filters || '[]')
      : []
  );
  const [rowGroups, setRowGroups] = useState(config?.row_groups || []);
  const [aggregates, setAggregates] = useState(config?.aggregates || []);
  const [activeTab, setActiveTab] = useState('columns'); // 'columns' | 'filters'

  // Available fields from metadata or fallback catalog
  const [availableFields, setAvailableFields] = useState(() => {
    return FALLBACK_MODULE_FIELDS[config?.primary_module || 'Lead'] || [];
  });

  // Live preview state
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Save Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: config?.name || 'Untitled',
    description: config?.description || '',
    folder_id: config?.folder_id || ''
  });
  const [saving, setSaving] = useState(false);

  // Sync props when config changes
  useEffect(() => {
    if (config?.primary_module) setPrimaryModule(config.primary_module);
    setChildModule(config?.child_module || null);
    if (config?.name) setReportName(config.name);
    if (Array.isArray(config?.selected_columns)) {
      setSelectedColumns(config.selected_columns);
    }
  }, [config?.primary_module, config?.child_module, config?.name]);

  // Fetch metadata if not provided
  useEffect(() => {
    if (!meta) {
      reportsAPI.getModulesMetadata()
        .then((res) => {
          const payload = res?.data || res;
          if (payload?.modules) {
            setMeta(payload);
          }
        })
        .catch((err) => console.error('Failed to load modules metadata:', err));
    }
  }, [meta]);

  // Initialize available fields based on metadata + fallbacks
  useEffect(() => {
    let pFields = [];
    if (meta?.modules) {
      const pMod = meta.modules.find((m) => m.key === primaryModule);
      if (pMod?.fields) pFields = pMod.fields.map(f => ({ ...f, module: primaryModule }));
    }
    if (pFields.length === 0 && FALLBACK_MODULE_FIELDS[primaryModule]) {
      pFields = FALLBACK_MODULE_FIELDS[primaryModule];
    }

    let cFields = [];
    if (childModule) {
      if (meta?.childFields && meta.childFields[childModule]) {
        cFields = meta.childFields[childModule].map(f => ({ ...f, module: childModule }));
      } else if (FALLBACK_MODULE_FIELDS[childModule]) {
        cFields = FALLBACK_MODULE_FIELDS[childModule].map(f => ({ ...f, module: childModule }));
      }
    }

    const combined = [...pFields, ...cFields];
    setAvailableFields(combined);

    // If no columns are selected yet, pick standard default columns matching table
    if (!selectedColumns || selectedColumns.length === 0) {
      if (primaryModule === 'Lead') {
        const defaults = [
          { key: 'title', label: 'Title', module: 'Lead' },
          { key: 'company_name', label: 'Customer', module: 'Lead' },
          { key: 'domain_name', label: 'Domain', module: 'Lead' },
          { key: 'stage_name', label: 'Stage', module: 'Lead' },
          { key: 'estimated_value', label: 'Amount (₹)', module: 'Lead' },
          { key: 'priority', label: 'Priority', module: 'Lead' },
          { key: 'assigned_to_name', label: 'Assigned', module: 'Lead' },
          { key: 'expected_close_date', label: 'Close Date', module: 'Lead' },
        ];
        setSelectedColumns(defaults);
      } else {
        setSelectedColumns(combined.slice(0, 5));
      }
    }
  }, [primaryModule, childModule, meta]);

  // Fetch Live Preview Data
  const loadPreview = async () => {
    if (!selectedColumns || selectedColumns.length === 0) {
      setPreviewRows([]);
      setTotalRecords(0);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await reportsAPI.preview({
        primary_module: primaryModule,
        child_module: childModule,
        selected_columns: selectedColumns,
        filters,
        row_groups: rowGroups,
        aggregates
      });
      const payload = res?.data || res;
      const rows = payload?.rows || payload?.data?.rows || (Array.isArray(payload) ? payload : []);
      const total = payload?.total !== undefined ? payload.total : (payload?.data?.total || rows.length);
      setPreviewRows(rows);
      setTotalRecords(total);
    } catch (e) {
      console.error('Preview error:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [primaryModule, childModule, selectedColumns, filters]);

  // Add / Remove Columns
  const handleAddColumn = (field) => {
    if (selectedColumns.some((c) => c.key === field.key)) {
      toast('Column already added', { icon: 'ℹ️' });
      return;
    }
    setSelectedColumns([...selectedColumns, field]);
  };

  const handleRemoveColumn = (indexToRemove) => {
    setSelectedColumns(selectedColumns.filter((_, i) => i !== indexToRemove));
  };

  // Reordering columns (simple move up / down)
  const handleMoveColumn = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedColumns.length) return;
    const updated = [...selectedColumns];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setSelectedColumns(updated);
  };

  // Filters management
  const handleAddFilter = () => {
    if (availableFields.length === 0) return;
    setFilters([
      ...filters,
      { field: availableFields[0].key, operator: 'like', value: '', module: availableFields[0].module }
    ]);
  };

  const handleUpdateFilter = (index, updatedField) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], ...updatedField };
    setFilters(updated);
  };

  const handleRemoveFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Save report
  const handleSaveReport = async (e) => {
    if (e) e.preventDefault();
    if (!saveForm.name.trim()) {
      toast.error('Report name is required');
      return;
    }
    if (!selectedColumns || selectedColumns.length === 0) {
      toast.error('Please select at least one column for the report');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: saveForm.name.trim(),
        description: saveForm.description?.trim() || null,
        folder_id: saveForm.folder_id ? parseInt(saveForm.folder_id, 10) : null,
        primary_module: primaryModule,
        child_module: childModule,
        selected_columns: selectedColumns,
        filters,
        row_groups: rowGroups,
        aggregates
      };

      if (initialConfig?.id) {
        await reportsAPI.update(initialConfig.id, payload);
        toast.success('Report updated successfully');
      } else {
        const res = await reportsAPI.create(payload);
        toast.success('Report created successfully');
      }

      setIsSaveModalOpen(false);
      if (handleSaveDone) handleSaveDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* ================= TOP HEADER ================= */}
      <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition cursor-pointer shadow-2xs mr-1"
              title="Back to Step 1: Module Selection"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {/* Editable Title */}
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={reportName}
              onChange={(e) => {
                setReportName(e.target.value);
                setSaveForm((f) => ({ ...f, name: e.target.value }));
              }}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false);
              }}
              className="text-lg font-bold text-gray-900 border-b border-blue-600 focus:outline-none px-1"
            />
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
              <h1 className="text-lg font-bold text-gray-900">{reportName}</h1>
              <Pencil size={14} className="text-gray-400 group-hover:text-blue-600 transition" />
            </div>
          )}

          {/* Module Badge Pill */}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
            title="Click to change module"
          >
            <span>{primaryModule} {childModule ? `+ ${childModule}` : ''}</span>
            <span className="text-[10px] text-blue-500 underline font-normal">(change)</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onRunReport && onRunReport({ primary_module: primaryModule, child_module: childModule, selected_columns: selectedColumns, filters, name: reportName })}
            className="px-4 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
          >
            Run
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveForm((f) => ({ ...f, name: reportName }));
              setIsSaveModalOpen(true);
            }}
            className="px-4 py-1.5 text-xs sm:text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition cursor-pointer shadow-xs"
          >
            Save
          </button>
        </div>
      </header>

      {/* ================= BUILDER BODY ================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Tabs for Columns and Filters */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('columns')}
              className={`flex-1 py-3 text-center transition cursor-pointer ${
                activeTab === 'columns'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Columns
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('filters')}
              className={`flex-1 py-3 text-center transition cursor-pointer ${
                activeTab === 'filters'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Filters {filters.length > 0 && `(${filters.length})`}
            </button>
          </div>

          {/* TAB 1: COLUMNS */}
          {activeTab === 'columns' && (
            <div className="p-4 flex flex-col gap-6">
              {/* Columns Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">
                    Columns ({selectedColumns.length})
                  </span>
                </div>

                {/* Direct Dropdown to Add Column */}
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Select Column to Add
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const found = availableFields.find((f) => f.key === e.target.value);
                      if (found) handleAddColumn(found);
                    }}
                    className="w-full h-10 px-3 bg-white border border-blue-400 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs transition cursor-pointer"
                  >
                    <option value="">+ Add Column</option>
                    {availableFields.map((f) => {
                      const isAdded = selectedColumns.some((c) => c.key === f.key);
                      return (
                        <option key={`${f.module || ''}-${f.key}`} value={f.key} disabled={isAdded}>
                          {f.label} {f.module && f.module !== primaryModule ? `(${f.module})` : ''} {isAdded ? '✓ (Added)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  {selectedColumns.length === 0 ? (
                    <div className="py-6 px-3 text-center border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 bg-gray-50/50">
                      No columns selected yet. Choose a column from the dropdown above to add it.
                    </div>
                  ) : (
                    selectedColumns.map((col, idx) => (
                      <div
                        key={`${col.key}-${idx}`}
                        className="group flex items-center justify-between px-3 py-2 bg-gray-50/90 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700 transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <GripVertical size={13} className="text-gray-400 shrink-0 cursor-grab" />
                          <span className="truncate font-semibold text-gray-800">{col.label}</span>
                          {col.module && col.module !== primaryModule && (
                            <span className="text-[10px] text-gray-400">({col.module})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(idx, -1)}
                              className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                              title="Move Up"
                            >
                              ▲
                            </button>
                          )}
                          {idx < selectedColumns.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveColumn(idx, 1)}
                              className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveColumn(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                            title="Remove column"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILTERS */}
          {activeTab === 'filters' && (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">
                  Criteria / Filters
                </span>
                <button
                  type="button"
                  onClick={handleAddFilter}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  <Plus size={13} /> Add Criteria
                </button>
              </div>

              {filters.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No filter criteria added. Click "+ Add Criteria" above to filter by date or fields.
                </div>
              ) : (
                filters.map((fil, idx) => {
                  const fieldMeta = availableFields.find((f) => f.key === fil.field);
                  const isDateField =
                    fieldMeta?.type === 'date' ||
                    fieldMeta?.type === 'datetime' ||
                    fil.field.includes('date') ||
                    fil.field.includes('_at');

                  return (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={fil.field}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            const newMeta = availableFields.find((f) => f.key === newKey);
                            handleUpdateFilter(idx, {
                              field: newKey,
                              module: newMeta?.module || primaryModule,
                              value: '',
                              date_from: '',
                              date_to: ''
                            });
                          }}
                          className="text-xs bg-white border border-gray-300 rounded-md px-2 py-1.5 font-medium text-gray-700 flex-1 cursor-pointer"
                        >
                          {availableFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label} ({f.module})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 transition cursor-pointer"
                          title="Remove filter"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Date Filter: Custom Date Range (From Date and To Date) */}
                      {isDateField ? (
                        <div className="bg-white p-2.5 rounded-md border border-gray-200 space-y-2">
                          <span className="text-[11px] font-semibold text-blue-700 block">
                            📅 Date Filter (From - To)
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] uppercase font-semibold text-gray-500 block mb-0.5">
                                From Date
                              </label>
                              <input
                                type="date"
                                value={fil.date_from || ''}
                                onChange={(e) => handleUpdateFilter(idx, { date_from: e.target.value })}
                                className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-semibold text-gray-500 block mb-0.5">
                                To Date
                              </label>
                              <input
                                type="date"
                                value={fil.date_to || ''}
                                onChange={(e) => handleUpdateFilter(idx, { date_to: e.target.value })}
                                className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Text/Number Filter */
                        <div className="flex items-center gap-2">
                          <select
                            value={fil.operator || 'like'}
                            onChange={(e) => handleUpdateFilter(idx, { operator: e.target.value })}
                            className="text-xs bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-700 w-28 cursor-pointer"
                          >
                            <option value="like">contains</option>
                            <option value="eq">equals</option>
                            <option value="neq">not equals</option>
                            <option value="gte">&gt;=</option>
                            <option value="lte">&lt;=</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Value..."
                            value={fil.value || ''}
                            onChange={(e) => handleUpdateFilter(idx, { value: e.target.value })}
                            className="flex-1 text-xs bg-white border border-gray-300 rounded px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </aside>

        {/* Right Main Panel: LIVE PREVIEW TABLE */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Preview Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Preview</span>
              <button
                type="button"
                onClick={loadPreview}
                className="p-1 text-gray-400 hover:text-gray-700 transition"
                title="Refresh Preview"
              >
                <RefreshCw size={13} className={previewLoading ? 'animate-spin' : ''} />
              </button>
              <span className="text-xs text-gray-400 hidden sm:inline">
                Preview shows a limited number of rows. Run the report to see actual aggregate values.
              </span>
            </div>

            <span className="text-xs font-semibold text-gray-700">
              Total Records: {totalRecords.toLocaleString()}
            </span>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs text-gray-700 border-collapse">
              <thead className="bg-gray-50 text-gray-600 font-semibold sticky top-0 border-b border-gray-200 z-10">
                <tr>
                  {selectedColumns.map((col, idx) => (
                    <th key={`${col.key}-${idx}`} className="px-4 py-3 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewLoading ? (
                  <tr>
                    <td colSpan={selectedColumns.length || 1} className="py-16 text-center text-gray-400">
                      Loading preview data...
                    </td>
                  </tr>
                ) : previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={selectedColumns.length || 1} className="py-16 text-center text-gray-400">
                      No records match the report criteria
                    </td>
                  </tr>
                ) : (
                  previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-50/80 transition">
                      {selectedColumns.map((col, cIdx) => {
                        const val = row[col.key];
                        return (
                          <td key={cIdx} className="px-4 py-3 whitespace-nowrap">
                            {val !== null && val !== undefined && val !== '' ? String(val) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Preview Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between shrink-0">
            <span>
              Showing {previewRows.length} of {totalRecords.toLocaleString()} records
            </span>
          </div>
        </main>
      </div>



      {/* ================= SAVE REPORT MODAL ================= */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Save Report</h3>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Report Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={saveForm.name}
                  onChange={(e) => setSaveForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Q4 Executive Performance"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Folder
                </label>
                <select
                  value={saveForm.folder_id}
                  onChange={(e) => setSaveForm((f) => ({ ...f, folder_id: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">General (No Folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={saveForm.description}
                  onChange={(e) => setSaveForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Summary of this report's purpose and contents..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

