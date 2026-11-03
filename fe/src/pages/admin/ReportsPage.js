import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  Star,
  MoreVertical,
  Play,
  Edit,
  Copy,
  Download,
  Trash2,
  Folder as FolderIcon,
  CheckSquare,
  Square,
  Loader2,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsAPI } from '../../services/api';
import FolderSidebar from '../../components/reports/FolderSidebar';
import CreateReportModal from '../../components/reports/CreateReportModal';
import ReportBuilder from '../../components/reports/ReportBuilder';
import ReportRunnerModal from '../../components/reports/ReportRunnerModal';
import FolderManageModal from '../../components/reports/FolderManageModal';

export default function ReportsPage() {
  // Folder & View state
  const [folders, setFolders] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    recent: 0,
    created_by_me: 0,
    favorites: 0,
  });
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [activeFolder, setActiveFolder] = useState(null);

  // Reports listing state
  const [reports, setReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Active View
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [builderReport, setBuilderReport] = useState(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [runnerReport, setRunnerReport] = useState(null);
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);

  // Action menu dropdown state
  const [openMenuReportId, setOpenMenuReportId] = useState(null);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuReportId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch folders and counts
  const loadFolders = useCallback(async () => {
    try {
      const res = await reportsAPI.getFolders();
      const folderList = res?.folders || res?.data?.folders || (Array.isArray(res?.data) ? res.data : []);
      const countData = res?.counts || res?.data?.counts;
      setFolders(folderList);
      if (countData) {
        setCounts(countData);
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Fetch reports list
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (['all', 'recent', 'created_by_me', 'favorites'].includes(activeFolderId)) {
        params.view = activeFolderId;
      } else if (activeFolderId) {
        params.folder_id = activeFolderId;
      }

      const res = await reportsAPI.getReports(params);
      const repList = res?.reports || (Array.isArray(res?.data) ? res.data : res?.data?.reports) || (Array.isArray(res) ? res : []);
      const tot = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : repList.length);
      setReports(repList);
      setTotalCount(tot);
      setActiveFolder(res?.active_folder || res?.data?.active_folder || null);
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, searchQuery]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handle Favorite toggle
  const handleToggleFavorite = async (e, report) => {
    e.stopPropagation();
    try {
      const res = await reportsAPI.toggleFavorite(report.id);
      const isFav = res?.is_favorite !== undefined ? res.is_favorite : res?.data?.is_favorite;
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, is_favorite: isFav } : r))
      );
      loadFolders();
    } catch (err) {
      toast.error('Failed to update favorite status');
    }
  };

  // Handle Delete report
  const handleDeleteReport = async (report) => {
    setOpenMenuReportId(null);
    if (!window.confirm(`Are you sure you want to delete report "${report.name}"?`)) {
      return;
    }
    try {
      await (reportsAPI.deleteReport || reportsAPI.remove)(report.id);
      toast.success('Report deleted successfully');
      loadReports();
      loadFolders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete report');
    }
  };

  // Handle Clone report
  const handleCloneReport = async (report) => {
    setOpenMenuReportId(null);
    try {
      const res = await (reportsAPI.cloneReport || reportsAPI.clone)(report.id);
      toast.success('Report cloned successfully');
      loadReports();
      loadFolders();
      const rep = res?.report || res?.data?.report;
      if (rep) {
        handleOpenRunner(rep);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clone report');
    }
  };

  // Run / Open report
  const handleOpenRunner = (report) => {
    setOpenMenuReportId(null);
    setRunnerReport(report);
    setIsRunnerOpen(true);
  };

  // Edit report in builder
  const handleEditReport = (report) => {
    setOpenMenuReportId(null);
    setBuilderReport(report);
    setIsBuilderOpen(true);
  };

  // Create wizard completion -> Open Builder
  const handleWizardComplete = (config) => {
    setIsCreateModalOpen(false);
    const prim = config.primary_module || config.primaryModule || 'Lead';
    const ch = config.child_module || config.childModule || null;
    setBuilderReport((prev) => ({
      id: prev?.id || null,
      name: prev?.name || 'Untitled',
      description: prev?.description || '',
      folder_id: prev?.folder_id || (typeof activeFolderId === 'number' ? activeFolderId : (folders[0]?.id || null)),
      primary_module: prim,
      child_module: ch,
      selected_columns: prev?.primary_module === prim ? (prev?.selected_columns || []) : [],
      row_groups: [],
      aggregates: [],
      filters: prev?.primary_module === prim ? (prev?.filters || []) : [],
    }));
    setIsBuilderOpen(true);
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Current folder display name
  const currentFolderTitle = useMemo(() => {
    if (activeFolderId === 'all') return 'All Reports';
    if (activeFolderId === 'recent') return 'Recent Reports';
    if (activeFolderId === 'created_by_me') return 'Created by Me Reports';
    if (activeFolderId === 'favorites') return 'Favourite Reports';
    const found = folders.find((f) => f.id === activeFolderId);
    return found ? found.name : 'All Reports';
  }, [activeFolderId, folders]);

  // If builder is active, display builder full-screen view
  if (isBuilderOpen && builderReport) {
    return (
      <div className="space-y-4">
        <ReportBuilder
          initialReport={builderReport}
          folders={folders}
          onBack={() => {
            setIsBuilderOpen(false);
            setIsCreateModalOpen(true);
          }}
          onClose={() => {
            setIsBuilderOpen(false);
            setBuilderReport(null);
            loadReports();
            loadFolders();
          }}
          onSaved={(savedReport) => {
            setIsBuilderOpen(false);
            setBuilderReport(null);
            loadReports();
            loadFolders();
            toast.success('Report saved successfully!');
          }}
          onRunReport={(reportToRun) => {
            setIsBuilderOpen(false);
            setBuilderReport(null);
            handleOpenRunner(reportToRun);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header matching Leads & Analytics layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {currentFolderTitle}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Build custom reports, analyze CRM data, and export datasets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Full-size Search Input */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${currentFolderTitle}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs transition"
            />
          </div>

          {/* Primary Action Button - Standard CRM Blue */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Report</span>
          </button>
        </div>
      </div>

      {/* Main Container Card: Full Size */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[680px]">
        {/* Left Folders Sidebar */}
        <FolderSidebar
          folders={folders}
          counts={counts}
          activeFolderId={activeFolderId}
          onSelectFolder={(id) => {
            setActiveFolderId(id);
            setSelectedIds([]);
          }}
          onEditFolders={() => setIsFolderModalOpen(true)}
        />

        {/* Right Main Table & View */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Header info in right panel */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-900">{currentFolderTitle}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold font-mono border border-gray-200">
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              Reports across all folders, newest activity first
            </p>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50/80">
                  <th className="py-3.5 px-5 w-12 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {selectedIds.length > 0 && selectedIds.length === reports.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-2 w-8"></th>
                  <th className="py-3.5 px-5 font-semibold text-gray-700">Report Name</th>
                  <th className="py-3.5 px-5 font-semibold text-gray-700">Description</th>
                  <th className="py-3.5 px-5 font-semibold text-gray-700">Created By</th>
                  <th className="py-3.5 px-5 font-semibold text-gray-700">Updated By</th>
                  <th className="py-3.5 px-5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Loading reports...</span>
                      </div>
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                        <FileText className="w-12 h-12 text-gray-300 stroke-1" />
                        <span className="font-semibold text-gray-700 text-base">No reports found</span>
                        <p className="text-sm text-gray-500 max-w-sm">
                          {searchQuery
                            ? `No reports matching "${searchQuery}"`
                            : 'No reports in this folder yet. Click "Create Report" above to build your first report.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const isSelected = selectedIds.includes(report.id);
                    const isMenuOpen = openMenuReportId === report.id;

                    return (
                      <tr
                        key={report.id}
                        onClick={() => handleOpenRunner(report)}
                        className={`group hover:bg-blue-50/40 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-4 px-5 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOne(report.id);
                          }}
                        >
                          <button
                            type="button"
                            className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                            )}
                          </button>
                        </td>

                        {/* Star Favorite */}
                        <td className="py-4 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, report)}
                            className="text-gray-300 hover:text-amber-400 transition-colors focus:outline-none cursor-pointer p-1"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                report.is_favorite
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300 group-hover:text-gray-400'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Report Name + Folder tag */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                              {report.name}
                            </span>
                            {report.folder_name && (
                              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-normal">
                                <FolderIcon className="w-3.5 h-3.5 text-gray-400" />
                                {report.folder_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-4 px-5 text-gray-600 max-w-sm truncate text-sm">
                          {report.description || '—'}
                        </td>

                        {/* Created By */}
                        <td className="py-4 px-5 text-gray-700 whitespace-nowrap text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {report.created_by_name || 'System'}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                        </td>

                        {/* Updated By */}
                        <td className="py-4 px-5 text-gray-700 whitespace-nowrap text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {report.updated_by_name || report.created_by_name || '—'}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">
                              {formatDate(report.updated_at || report.created_at)}
                            </span>
                          </div>
                        </td>

                        {/* Action Menu (3 dots) */}
                        <td
                          className="py-4 px-5 text-center relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuReportId(isMenuOpen ? null : report.id)
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="absolute right-4 top-11 z-30 w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1 text-sm text-gray-700 text-left animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                onClick={() => handleOpenRunner(report)}
                                className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Play className="w-4 h-4 text-gray-500" />
                                <span>Run</span>
                              </button>
                              <button
                                onClick={() => handleEditReport(report)}
                                className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4 text-gray-500" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleCloneReport(report)}
                                className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Copy className="w-4 h-4 text-gray-500" />
                                <span>Clone</span>
                              </button>
                              <button
                                onClick={() => handleOpenRunner(report)}
                                className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Download className="w-4 h-4 text-gray-500" />
                                <span>Export</span>
                              </button>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                onClick={() => handleDeleteReport(report)}
                                className="w-full px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600 bg-gray-50/60">
            <div>
              <span className="font-semibold text-gray-800">Total : {totalCount}</span> reports
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-gray-800">{selectedIds.length} selected</span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wizard Modal: Module + Child Module selection */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        initialPrimary={builderReport?.primary_module || ''}
        initialChild={builderReport?.child_module || ''}
        onClose={() => {
          setIsCreateModalOpen(false);
          setBuilderReport(null);
        }}
        onContinue={handleWizardComplete}
      />

      {/* Runner / Export Modal */}
      <ReportRunnerModal
        report={runnerReport}
        isOpen={isRunnerOpen}
        onClose={() => {
          setIsRunnerOpen(false);
          setRunnerReport(null);
        }}
        onEdit={(rep) => {
          setIsRunnerOpen(false);
          setRunnerReport(null);
          handleEditReport(rep);
        }}
      />

      {/* Manage Folders Modal */}
      <FolderManageModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folders={folders}
        onFolderChanged={() => {
          loadFolders();
          loadReports();
        }}
      />
    </div>
  );
}
