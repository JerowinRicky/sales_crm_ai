import React from 'react';
import { exportCSV, exportExcel, exportPDF, exportMultiSheetExcel } from '../../utils/export';
import { FileText, FileSpreadsheet, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExportButtons({ data, filename = 'export', title = 'Report', sheets, onExportExcel }) {
  const guard = fn => () => {
    if (fn === 'excel_custom' && onExportExcel) {
      onExportExcel();
      return;
    }
    const hasData = (Array.isArray(data) && data.length > 0) || (Array.isArray(sheets) && sheets.some(s => s.data?.length > 0));
    if (!hasData) { toast.error('No data to export'); return; }

    if (fn === exportExcel && sheets && sheets.length > 0) {
      exportMultiSheetExcel(sheets, `${filename}.xlsx`);
    } else if (typeof fn === 'function') {
      fn(data, filename, title);
    }
  };
  return (
    <div style={{ display:'flex', gap:6 }}>
      <button className="btn btn-ghost btn-sm" onClick={guard((d,f)=>exportCSV(d, `${f}.csv`))} title="Export CSV">
        <FileText size={13}/> CSV
      </button>
      <button className="btn btn-ghost btn-sm" onClick={guard(onExportExcel ? 'excel_custom' : exportExcel)} title="Export Excel">
        <FileSpreadsheet size={13}/> Excel
      </button>
      <button className="btn btn-ghost btn-sm" onClick={guard((d,f,t)=>exportPDF(d, `${f}.pdf`, t))} title="Export PDF">
        <FileDown size={13}/> PDF
      </button>
    </div>
  );
}
