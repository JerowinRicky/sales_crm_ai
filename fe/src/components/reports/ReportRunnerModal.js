import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  TrendingUp,
  Download,
  Edit,
  Loader2
} from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { exportCSV, exportExcel } from '../../utils/export';
import toast from 'react-hot-toast';

export default function ReportRunnerModal({ isOpen, report, onClose, onEdit }) {
  const [reportDetails, setReportDetails] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const reportId = report?.id;

  const loadData = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await reportsAPI.run(reportId, { limit: 1000 });
      const payload = res?.data || res;
      if (res?.success || payload?.rows) {
        setReportDetails(payload?.report || report);
        setRows(payload?.rows || []);
        setTotal(payload?.total !== undefined ? payload.total : (payload?.rows?.length || 0));
      } else {
        toast.error(res?.message || payload?.message || 'Failed to run report');
      }
    } catch (e) {
      console.error('Failed to run report:', e);
      toast.error('Failed to run report');
    } finally {
      setLoading(false);
    }
  }, [reportId, report]);

  useEffect(() => {
    if (isOpen && reportId) {
      setSearch('');
      loadData();
    } else {
      setRows([]);
      setTotal(0);
      setReportDetails(null);
    }
  }, [isOpen, reportId, loadData]);

  // CRITICAL: Do NOT render anything if modal is not open or no report is selected!
  if (!isOpen || !report) {
    return null;
  }

  const activeReport = reportDetails || report;
  const rawColumns = activeReport?.selected_columns;
  const columns = Array.isArray(rawColumns)
    ? rawColumns
    : typeof rawColumns === 'string'
    ? JSON.parse(rawColumns || '[]')
    : [];

  // Filter rows by search term
  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Object.values(r).some((val) =>
      val !== null && val !== undefined && String(val).toLowerCase().includes(q)
    );
  });

  // Fetch full dataset without LIMIT for downloading
  const getAllExportRows = async () => {
    if (rows.length >= total && rows.length > 0) {
      return rows;
    }
    const toastId = toast.loading(`Fetching all ${total.toLocaleString()} records for download...`);
    try {
      const res = await reportsAPI.run(reportId, { export: 'true' });
      const payload = res?.data || res;
      const allRows = payload?.rows || [];
      toast.dismiss(toastId);
      return allRows.length > 0 ? allRows : rows;
    } catch (e) {
      toast.dismiss(toastId);
      console.error('Failed to fetch all rows for export:', e);
      toast.error('Could not fetch all rows, exporting available records');
      return rows;
    }
  };

  // Map rows to display readable column labels as headers in export
  const formatRowsForExport = (rawRows) => {
    if (!columns || columns.length === 0) return rawRows;
    return rawRows.map((row) => {
      const mapped = {};
      columns.forEach((col) => {
        mapped[col.label || col.key] = row[col.key];
      });
      return mapped;
    });
  };

  // Exports
  const handleExportCSV = async () => {
    if (total === 0 && rows.length === 0) return toast.error('No data to export');
    setExporting(true);
    try {
      const dataToExport = await getAllExportRows();
      const formatted = formatRowsForExport(dataToExport);
      exportCSV(formatted, `${activeReport?.name || 'report'}.csv`);
      toast.success(`Exported ${dataToExport.length.toLocaleString()} records to CSV`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (total === 0 && rows.length === 0) return toast.error('No data to export');
    setExporting(true);
    try {
      const dataToExport = await getAllExportRows();
      const formatted = formatRowsForExport(dataToExport);
      exportExcel(formatted, `${activeReport?.name || 'report'}.xlsx`, activeReport?.name || 'Report');
      toast.success(`Exported ${dataToExport.length.toLocaleString()} records to Excel`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden border border-gray-200 flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <header className="p-5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{activeReport?.name || 'Report Results'}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {activeReport?.primary_module} {activeReport?.child_module ? `+ ${activeReport.child_module}` : ''}
              </span>
            </div>
            {activeReport?.description && (
              <p className="text-xs text-gray-500 mt-1">{activeReport.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(activeReport)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                <Edit size={14} />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportExcel}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition cursor-pointer ${
                exporting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportCSV}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition cursor-pointer ${
                exporting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition ml-2 cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Action / Search Bar */}
        <div className="p-3 px-5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between shrink-0">
          <div className="relative w-72">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search results..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
            <span>
              Total Records: <strong className="text-gray-900">{total.toLocaleString()}</strong>
            </span>
            {search && (
              <span>
                Filtered: <strong className="text-gray-900">{filteredRows.length.toLocaleString()}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={loadData}
              className="p-1 text-gray-400 hover:text-gray-700 transition"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left text-xs text-gray-700 border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-semibold sticky top-0 border-b border-gray-200 z-10 shadow-2xs">
              <tr>
                <th className="px-4 py-3 w-12 text-gray-400">#</th>
                {columns.map((col, idx) => (
                  <th key={`${col.key}-${idx}`} className="px-4 py-3 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={Math.max(columns.length + 1, 2)} className="py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-gray-400" />
                      <span>Executing report query...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(columns.length + 1, 2)} className="py-20 text-center text-gray-400">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{rIdx + 1}</td>
                    {columns.map((col, cIdx) => {
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

        {/* Footer */}
        <footer className="p-3 px-5 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between shrink-0">
          <span>
            Showing {filteredRows.length.toLocaleString()} of {total.toLocaleString()} records
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
