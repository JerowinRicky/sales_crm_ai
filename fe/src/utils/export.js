import XLSXLib from 'xlsx-js-style';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Resolve CJS vs ESM export wrapping
const XLSX = XLSXLib?.utils ? XLSXLib : (XLSXLib?.default || XLSXLib);

// Human-readable date-time formatter for exports
export function formatExportValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';

  if (typeof val === 'string') {
    const isIsoOrDate = /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(val) || /^\d{4}-\d{2}-\d{2}$/.test(val);
    if (isIsoOrDate) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();

        const hasTime = (val.includes('T') && !val.endsWith('T00:00:00.000Z') && !val.endsWith('T00:00:00Z')) ||
                        (val.includes(' ') && !val.endsWith('00:00:00'));

        if (hasTime) {
          let hours = d.getHours();
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const formattedHours = String(hours).padStart(2, '0');
          return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
        } else {
          return `${day}-${month}-${year}`;
        }
      }
    }
    return val;
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

// Flatten data so nested objects/arrays don't break exports and format dates
function clean(data) {
  return data.map(row => {
    const out = {};
    Object.entries(row).forEach(([k, v]) => {
      out[k] = formatExportValue(v);
    });
    return out;
  });
}

export function exportCSV(data, filename = 'export.csv') {
  if (!data?.length) return;
  const rows = clean(data);
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  download(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportExcel(data, filename = 'export.xlsx', sheetName = 'Sheet1') {
  if (!data?.length) return;
  const rows = clean(data);
  const ws = XLSX.utils.json_to_sheet(rows);

  const headers = Object.keys(rows[0]);

  // Clean, professional corporate header styling
  const headerStyle = {
    fill: { fgColor: { rgb: '1E3A8A' } }, // Deep Corporate Navy Blue
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  };

  const cellStyle = {
    font: { name: 'Calibri', sz: 10, color: { rgb: '1E293B' } },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  };

  const cellStyleZebra = {
    ...cellStyle,
    fill: { fgColor: { rgb: 'F8FAFC' } }
  };

  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);

    // Set auto column widths with padding
    const colWidths = headers.map((h) => {
      let maxLen = h.length;
      for (let r = 0; r < Math.min(rows.length, 100); r++) {
        const valStr = String(rows[r][h] || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      }
      return { wch: Math.min(Math.max(maxLen + 4, 15), 50) };
    });
    ws['!cols'] = colWidths;
    ws['!rows'] = [{ hpt: 26 }]; // Header row height

    // Apply header styles to Row 0
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[cellAddress]) ws[cellAddress].s = headerStyle;
    }

    // Apply data row styles with light zebra striping
    for (let R = 1; R <= range.e.r; ++R) {
      const isEven = R % 2 === 0;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cellAddress]) {
          ws[cellAddress].s = isEven ? cellStyleZebra : cellStyle;
        }
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportMultiSheetExcel(sheets, filename = 'export.xlsx') {
  if (!sheets || !sheets.length) return;
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    if (data?.length) {
      const rows = clean(data);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, (name || 'Sheet').slice(0, 31));
    } else {
      const ws = XLSX.utils.json_to_sheet([{ Note: 'No records found for this period' }]);
      XLSX.utils.book_append_sheet(wb, ws, (name || 'Sheet').slice(0, 31));
    }
  });
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportPDF(data, filename = 'export.pdf', title = 'Report') {
  if (!data?.length) return;
  const rows = clean(data);
  const headers = Object.keys(rows[0]);
  const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 14, 20);
  doc.autoTable({
    startY: 26,
    head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
    body: rows.map(r => headers.map(h => String(r[h] ?? ''))),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
