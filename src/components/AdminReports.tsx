import React, { useState, useRef, useEffect } from 'react';
import { 
  AttendanceRecord, 
  ReportPrintConfig, 
  PaperSize, 
  PaperOrientation, 
  PaperMargin, 
  TableFontSize 
} from '../types/pkl';
import { StorageService, formatIndonesianDate, getJakartaDate, DEFAULT_REPORT_CONFIG } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  Users, 
  School, 
  CheckCircle2, 
  FileText, 
  Search, 
  Settings2, 
  X, 
  Check, 
  RotateCcw, 
  Image as ImageIcon, 
  Upload,
  SlidersHorizontal,
  Layout,
  Maximize2,
  Layers,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Paper size options & specifications
interface PaperOptionDetail {
  id: PaperSize;
  name: string;
  code: string;
  dimensions: string;
  desc: string;
  tag?: string;
  schoolStandard?: boolean;
}

const PAPER_OPTIONS: PaperOptionDetail[] = [
  {
    id: 'A4',
    name: 'A4 (Standar Internasional)',
    code: 'A4',
    dimensions: '210 × 297 mm',
    desc: 'Format dokumen resmi standar internasional & printer kantor.',
    tag: 'Standar Umum',
  },
  {
    id: 'F4',
    name: 'F4 / Folio (HVS Sekolah)',
    code: 'F4 / Folio',
    dimensions: '215 × 330 mm',
    desc: 'Standar map ijazah & arsip dinas SMK di Jawa Timur & Indonesia.',
    tag: 'Rekomendasi SMK',
    schoolStandard: true,
  },
  {
    id: 'Legal',
    name: 'Legal (Panjang)',
    code: 'Legal',
    dimensions: '216 × 356 mm',
    desc: 'Kertas panjang US Legal (35,6 cm), muat baris catatan panjang.',
    tag: 'Ekstra Panjang',
  },
  {
    id: 'Letter',
    name: 'Letter / Kuarto',
    code: 'Letter',
    dimensions: '216 × 279 mm',
    desc: 'Ukuran kuarto (21,6 × 27,9 cm), lebih pendek sedikit dari A4.',
  },
  {
    id: 'A3',
    name: 'A3 (Format Lebar)',
    code: 'A3',
    dimensions: '297 × 420 mm',
    desc: 'Ukuran kertas besar, cocok untuk rekap menyeluruh banyak kolom.',
    tag: 'Format Besar',
  },
];

const getPaperCssSize = (size: PaperSize, orientation: PaperOrientation): string => {
  if (size === 'A4') {
    return orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  }
  if (size === 'A3') {
    return orientation === 'landscape' ? 'A3 landscape' : 'A3 portrait';
  }
  if (size === 'Letter') {
    return orientation === 'landscape' ? 'letter landscape' : 'letter portrait';
  }
  if (size === 'Legal') {
    return orientation === 'landscape' ? '356mm 216mm' : '216mm 356mm';
  }
  if (size === 'F4') {
    // Indonesian Folio / F4 standard is 215mm x 330mm
    return orientation === 'landscape' ? '330mm 215mm' : '215mm 330mm';
  }
  return 'A4 landscape';
};

const getPaperMarginCss = (margin: PaperMargin): string => {
  switch (margin) {
    case 'compact':
      return '5mm 6mm';
    case 'spacious':
      return '15mm 15mm';
    case 'normal':
    default:
      return '8mm 10mm';
  }
};

const getTableFontCss = (fontSize: TableFontSize) => {
  switch (fontSize) {
    case 'compact':
      return {
        tableClass: 'text-[10px]',
        cellPadding: 'p-1 sm:p-1.5',
        headText: 'text-[9.5px]',
        bodyFont: '7.5pt',
        tablePaddingIframe: '3px 4px',
      };
    case 'large':
      return {
        tableClass: 'text-xs',
        cellPadding: 'p-2.5 sm:p-3',
        headText: 'text-xs',
        bodyFont: '9.5pt',
        tablePaddingIframe: '5px 6px',
      };
    case 'normal':
    default:
      return {
        tableClass: 'text-[11px]',
        cellPadding: 'p-1.5 sm:p-2',
        headText: 'text-[10.5px]',
        bodyFont: '8.5pt',
        tablePaddingIframe: '4px 5px',
      };
  }
};

const getPreviewMaxWidth = (size: PaperSize, orientation: PaperOrientation): string => {
  if (orientation === 'portrait') {
    switch (size) {
      case 'A3': return 'max-w-4xl';
      case 'F4': return 'max-w-3xl';
      case 'Legal': return 'max-w-3xl';
      default: return 'max-w-2xl';
    }
  }
  // Landscape
  switch (size) {
    case 'A3': return 'max-w-7xl';
    case 'F4': return 'max-w-6xl';
    case 'Legal': return 'max-w-6xl';
    case 'Letter': return 'max-w-5xl';
    case 'A4':
    default: return 'max-w-6xl';
  }
};

export const AdminReports: React.FC = () => {
  const allRecords = StorageService.getAttendance();
  const allStudents = StorageService.getUsers().filter(u => u.role === 'siswa');

  const [reportType, setReportType] = useState<'harian' | 'mingguan' | 'bulanan' | 'siswa' | 'sekolah'>('bulanan');
  const [selectedDate, setSelectedDate] = useState<string>(getJakartaDate());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTahun, setSelectedTahun] = useState<string>('all');
  const [selectedStudentNis, setSelectedStudentNis] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  const tahunConfig = StorageService.getTahunAjaranConfig();

  const getMonthName = (m: string) => {
    const monthMap: Record<string, string> = {
      '01': 'Januari', '1': 'Januari',
      '02': 'Februari', '2': 'Februari',
      '03': 'Maret', '3': 'Maret',
      '04': 'April', '4': 'April',
      '05': 'Mei', '5': 'Mei',
      '06': 'Juni', '6': 'Juni',
      '07': 'Juli', '7': 'Juli',
      '08': 'Agustus', '8': 'Agustus',
      '09': 'September', '9': 'September',
      '10': 'Oktober',
      '11': 'November',
      '12': 'Desember'
    };
    return monthMap[m] || 'Semua Bulan';
  };

  // Kop & Signature Customization State
  const [kopConfig, setKopConfig] = useState<ReportPrintConfig>(() => StorageService.getReportPrintConfig());
  const [showKopModal, setShowKopModal] = useState(false);
  const [tempKopConfig, setTempKopConfig] = useState<ReportPrintConfig>(kopConfig);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Synchronized Paper Size & Print Configuration State
  const [paperSize, setPaperSize] = useState<PaperSize>(() => kopConfig.paperSize || 'A4');
  const [paperOrientation, setPaperOrientation] = useState<PaperOrientation>(() => kopConfig.paperOrientation || 'landscape');
  const [paperMargin, setPaperMargin] = useState<PaperMargin>(() => kopConfig.paperMargin || 'normal');
  const [tableFontSize, setTableFontSize] = useState<TableFontSize>(() => kopConfig.tableFontSize || 'normal');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Synchronize @page in document.head so even native browser Ctrl+P adheres strictly to chosen paper size
  useEffect(() => {
    let styleEl = document.getElementById('dynamic-print-paper-css') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-paper-css';
      document.head.appendChild(styleEl);
    }
    const cssSize = getPaperCssSize(paperSize, paperOrientation);
    const marginCss = getPaperMarginCss(paperMargin);
    const fontConfig = getTableFontCss(tableFontSize);
    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${cssSize} !important;
          margin: ${marginCss} !important;
        }
        .a4-print-table {
          font-size: ${fontConfig.bodyFont} !important;
        }
        .a4-print-table th, .a4-print-table td {
          padding: ${fontConfig.tablePaddingIframe} !important;
        }
      }
    `;
  }, [paperSize, paperOrientation, paperMargin, tableFontSize]);

  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);

  const handleUploadLogoKiri = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setTempKopConfig(prev => ({ ...prev, logoKiriUrl: base64, showLogoKiri: true }));
    };
    reader.readAsDataURL(file);
    if (fileInputKiriRef.current) fileInputKiriRef.current.value = '';
  };

  const handleUploadLogoKanan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setTempKopConfig(prev => ({ ...prev, logoKananUrl: base64, showLogoKanan: true }));
    };
    reader.readAsDataURL(file);
    if (fileInputKananRef.current) fileInputKananRef.current.value = '';
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveKopConfig = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveReportPrintConfig(tempKopConfig);
    setKopConfig(tempKopConfig);
    if (tempKopConfig.paperSize) setPaperSize(tempKopConfig.paperSize);
    if (tempKopConfig.paperOrientation) setPaperOrientation(tempKopConfig.paperOrientation);
    if (tempKopConfig.paperMargin) setPaperMargin(tempKopConfig.paperMargin);
    if (tempKopConfig.tableFontSize) setTableFontSize(tempKopConfig.tableFontSize);
    setShowKopModal(false);
    confetti({ particleCount: 35, spread: 60 });
    showToast('Teks kop laporan & nama penandatangan berhasil diperbarui!');
  };

  const handleResetKopDefault = () => {
    setTempKopConfig(DEFAULT_REPORT_CONFIG);
  };

  // Filter logic based on report type & academic year
  const filteredData = allRecords.filter(r => {
    const matchTahun = selectedTahun === 'all' || (r.tahunAjaran || tahunConfig.tahunAktif) === selectedTahun;
    if (!matchTahun) return false;

    if (reportType === 'harian') {
      return r.tanggal === selectedDate;
    }
    if (reportType === 'mingguan') {
      // Last 7 days from selectedDate
      const targetTime = new Date(selectedDate).getTime();
      const recTime = new Date(r.tanggal).getTime();
      const diffDays = (targetTime - recTime) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (reportType === 'bulanan') {
      const parts = r.tanggal.split('-');
      if (parts.length >= 2) {
        const [y, m] = parts;
        const matchYear = selectedYear === 'all' || y === selectedYear;
        const matchMonth = selectedMonth === 'all' || String(parseInt(m, 10)).padStart(2, '0') === String(parseInt(selectedMonth, 10)).padStart(2, '0');
        return matchYear && matchMonth;
      }
    }
    if (reportType === 'siswa') {
      return selectedStudentNis === 'all' || r.nis === selectedStudentNis;
    }
    if (reportType === 'sekolah') {
      return selectedSchool === 'all' || r.asalSekolah.toLowerCase() === selectedSchool.toLowerCase();
    }
    return true;
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  // Export to Excel (.xlsx) using xlsx library
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data pada filter ini untuk diekspor.');
      return;
    }

    const excelRows = filteredData.map((r, index) => {
      const student = allStudents.find(s => s.nis === r.nis);
      return {
        'No': index + 1,
        'ID Absensi': r.id,
        'Tanggal': r.tanggal,
        'NIS/NISN': r.nis,
        'Nama Siswa': r.namaSiswa,
        'Kelas': r.kelas || student?.kelas || 'XII TKR 1',
        'Guru Pembimbing Sekolah': r.namaPembimbing || student?.namaPembimbing || '-',
        'Asal Sekolah': r.asalSekolah,
        'Jurusan': r.jurusan,
        'Tempat PKL / Bengkel': r.tempatPkl,
        'Jam Datang': r.jamDatang,
        'Jam Pulang': r.jamPulang || '-',
        'Status Kehadiran': r.status,
        'Titik Koordinat GPS': r.koordinatGps || r.koordinatPulang || '-',
        'Link Map Google': r.mapsUrl || r.mapsUrlPulang || '-',
        'Keterangan / Aktivitas': r.keterangan || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan_Absensi_PKL');

    // Auto column widths
    const max_width = excelRows.reduce((w, r) => Math.max(w, r['Nama Siswa'].length), 10);
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 22 }, // ID
      { wch: 12 }, // Tanggal
      { wch: 12 }, // NIS
      { wch: max_width + 4 }, // Nama
      { wch: 14 }, // Kelas
      { wch: 30 }, // Guru Pembimbing Sekolah
      { wch: 18 }, // Sekolah
      { wch: 25 }, // Jurusan
      { wch: 25 }, // Tempat PKL
      { wch: 12 }, // Datang
      { wch: 12 }, // Pulang
      { wch: 16 }, // Status
      { wch: 22 }, // GPS
      { wch: 30 }, // Link Map
      { wch: 35 }, // Keterangan
    ];

    const fileName = `Laporan_Absensi_PKL_${reportType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    confetti({ particleCount: 50, spread: 70 });
  };

  // Synchronized Print execution with precise paper size & pure white page output
  const handlePrintPDF = (
    targetSize: PaperSize = paperSize,
    targetOrientation: PaperOrientation = paperOrientation,
    targetMargin: PaperMargin = paperMargin,
    targetFont: TableFontSize = tableFontSize
  ) => {
    // Persist active settings to storage
    const updatedConfig: ReportPrintConfig = {
      ...kopConfig,
      paperSize: targetSize,
      paperOrientation: targetOrientation,
      paperMargin: targetMargin,
      tableFontSize: targetFont,
    };
    StorageService.saveReportPrintConfig(updatedConfig);
    setKopConfig(updatedConfig);
    setPaperSize(targetSize);
    setPaperOrientation(targetOrientation);
    setPaperMargin(targetMargin);
    setTableFontSize(targetFont);

    const printDoc = document.getElementById('printable-a4-document');
    if (!printDoc) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const cssSize = getPaperCssSize(targetSize, targetOrientation);
    const marginCss = getPaperMarginCss(targetMargin);
    const fontConfig = getTableFontCss(targetFont);

    const docHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan_Presensi_PKL_${targetSize}_${targetOrientation.toUpperCase()}_SMKN1_Tegalsari</title>
        <style>
          @page {
            size: ${cssSize} !important;
            margin: ${marginCss} !important;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${fontConfig.bodyFont};
            padding: 4px;
            width: 100%;
          }
          .kop-surat-border {
            border-bottom: 3px double #000000;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .a4-print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 12px;
            font-size: ${fontConfig.bodyFont} !important;
          }
          .a4-print-table th, .a4-print-table td {
            border: 1px solid #000000 !important;
            padding: ${fontConfig.tablePaddingIframe} !important;
            text-align: left;
            vertical-align: middle;
            color: #000000 !important;
            background-color: #ffffff !important;
          }
          .a4-print-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            font-size: calc(${fontConfig.bodyFont} - 0.5pt);
          }
          .a4-signature-block {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: calc(${fontConfig.bodyFont} + 0.5pt);
          }
          .text-center { text-align: center; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .uppercase { text-transform: uppercase; }
          .underline { text-decoration: underline; }
          .italic { font-style: italic; }
          .font-mono { font-family: monospace; }
          .w-20 { width: 75px; }
          .h-20 { height: 75px; }
          .object-contain { object-fit: contain; }
          .shrink-0 { flex-shrink: 0; }
          .flex-1 { flex: 1; }
          .space-y-0.5 > * + * { margin-top: 2px; }
          .border-t-2 { border-top: 2px solid #000000; }
        </style>
      </head>
      <body>
        ${printDoc.outerHTML}
      </body>
      </html>
    `;

    doc.open();
    doc.write(docHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 1000);
    }, 250);
  };

  // Distinct schools
  const distinctSchools = Array.from(new Set(allStudents.map(s => s.asalSekolah)));

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-white">Laporan & Rekapitulasi Presensi PKL</h2>
          <p className="text-xs text-slate-400">
            Ekspor rekap kehadiran siswa dalam format Excel (.xlsx) atau Cetak / Simpan PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Custom Kop & TTD Button */}
          <button
            onClick={() => {
              setTempKopConfig(kopConfig);
              setShowKopModal(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
            title="Ubah teks kop surat laporan dan nama penandatangan"
          >
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <span>Atur Kop & TTD</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel (.xlsx)
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition cursor-pointer"
            title="Buka menu pengaturan ukuran kertas & cetak dokumen PDF"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs (Hidden on Print) */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-cyan-400" />
            Pilih Tipe Laporan:
          </span>
          <span className="text-xs text-slate-400">
            Ditemukan <strong className="text-white">{filteredData.length}</strong> catatan
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button
            onClick={() => setReportType('bulanan')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'bulanan'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Laporan Bulanan
          </button>
          <button
            onClick={() => setReportType('harian')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'harian'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Laporan Harian
          </button>
          <button
            onClick={() => setReportType('mingguan')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'mingguan'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Laporan Mingguan
          </button>
          <button
            onClick={() => setReportType('siswa')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'siswa'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Per Siswa
          </button>
          <button
            onClick={() => setReportType('sekolah')}
            className={`py-2 px-3 rounded-xl font-semibold transition col-span-2 sm:col-span-1 ${
              reportType === 'sekolah'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Per Sekolah
          </button>
        </div>

        {/* Dynamic Context Filter Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Tahun Ajaran:</label>
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Semua Periode</option>
              {tahunConfig.daftarTahun.map((t) => (
                <option key={t} value={t}>
                  {t} {t === tahunConfig.tahunAktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {(reportType === 'bulanan') && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-slate-400">Bulan:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Semua Bulan</option>
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-slate-400">Tahun:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </>
          )}

          {(reportType === 'harian' || reportType === 'mingguan') && (
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Pilih Tanggal:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {(reportType === 'siswa') && (
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Pilih Siswa:</label>
              <select
                value={selectedStudentNis}
                onChange={(e) => setSelectedStudentNis(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Siswa PKL</option>
                {allStudents.map(s => (
                  <option key={s.id} value={s.nis}>{s.nama} ({s.nis})</option>
                ))}
              </select>
            </div>
          )}

          {(reportType === 'sekolah') && (
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Asal Sekolah:</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Sekolah Mitra</option>
                {distinctSchools.map(sch => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* QUICK PAPER CONTROL & PRINT BAR */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs print:hidden shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-sm">Ukuran Kertas Cetak:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40 font-mono text-xs">
                {paperSize} ({PAPER_OPTIONS.find(p => p.id === paperSize)?.dimensions})
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 font-semibold text-xs capitalize">
                {paperOrientation === 'landscape' ? 'Mendatar (Landscape)' : 'Tegak (Portrait)'}
              </span>
              {paperSize === 'F4' && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40 text-[10px]">
                  Standar Map & Ijazah SMK
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Pratinjau layar & format cetak PDF otomatis sinkron dengan ukuran kertas terpilih.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Paper Size Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            {PAPER_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPaperSize(opt.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  paperSize === opt.id
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`${opt.name} - ${opt.dimensions}`}
              >
                {opt.code}
              </button>
            ))}
          </div>

          {/* Quick Orientation Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => setPaperOrientation('landscape')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                paperOrientation === 'landscape'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Posisi Kertas Mendatar (Landscape)"
            >
              Landscape
            </button>
            <button
              type="button"
              onClick={() => setPaperOrientation('portrait')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                paperOrientation === 'portrait'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Posisi Kertas Tegak (Portrait)"
            >
              Portrait
            </button>
          </div>

          {/* Open Full Print Setup Menu Modal */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Menu Ukuran & Cetak PDF
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT PREVIEW CONTAINER (FORMAT DOKUMEN RESMI KERTAS - PURE WHITE) */}
      <div className="w-full overflow-x-auto pb-4">
        <div 
          id="printable-a4-document"
          className={`bg-white text-slate-950 border border-slate-200 rounded-2xl mx-auto shadow-2xl transition-all duration-300 print:bg-white print:text-black print:border-none print:p-0 print:m-0 print:shadow-none ${getPreviewMaxWidth(paperSize, paperOrientation)} ${
            paperMargin === 'compact' ? 'p-4 sm:p-6 space-y-4' : paperMargin === 'spacious' ? 'p-8 sm:p-12 space-y-8' : 'p-6 sm:p-10 space-y-6'
          }`}
        >
          
          {/* Kop Surat Resmi SMKN 1 Tegalsari (Pojok Kiri Logo, Teks Tengah, Pojok Kanan Logo) */}
          {kopConfig.showKop && (
            <div className="kop-surat-border pb-3 mb-4 flex items-center justify-between gap-4">
              {/* Logo Pojok Kiri */}
              {kopConfig.showLogoKiri !== false && kopConfig.logoKiriUrl ? (
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  <img src={kopConfig.logoKiriUrl} alt="Logo Kiri Kop" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 shrink-0" />
              )}

              {/* Teks Tengah Kop Surat */}
              <div className="flex-1 text-center space-y-0.5">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                  {kopConfig.kopBaris1}
                </h2>
                <h1 className="text-base sm:text-xl font-black uppercase text-slate-950 tracking-wide">
                  {kopConfig.kopBaris2}
                </h1>
                <h3 className="text-xs sm:text-sm font-bold text-cyan-800">
                  {kopConfig.kopBaris3}
                </h3>
                {kopConfig.kopAlamat && (
                  <p className="text-[11px] text-slate-600 italic">
                    {kopConfig.kopAlamat}
                  </p>
                )}
                <div className="pt-2 pb-0.5 border-t-2 border-slate-950 mt-1.5">
                  <h4 className="text-xs sm:text-sm font-extrabold uppercase text-slate-950 tracking-wide">
                    REKAPITULASI LAPORAN PRESENSI SISWA PRAKTIK KERJA LAPANGAN (PKL)
                  </h4>
                  <p className="text-[11px] text-slate-800 font-semibold">
                    Kompetensi Keahlian: Teknik Kendaraan Ringan (TKR) • Periode: {reportType.toUpperCase()} ({selectedTahun === 'all' ? 'Semua Tahun' : selectedTahun}) • Format Kertas: {paperSize} {paperOrientation.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Logo Pojok Kanan */}
              {kopConfig.showLogoKanan !== false && kopConfig.logoKananUrl ? (
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  <img src={kopConfig.logoKananUrl} alt="Logo Kanan Kop" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 shrink-0" />
              )}
            </div>
          )}

          {/* Report Table - Format Cetak Bergaris Hitam Tegas & Skala Huruf Dinamis */}
          <div className="overflow-x-auto">
            <table className={`w-full text-left border-collapse a4-print-table ${getTableFontCss(tableFontSize).tableClass}`}>
              <thead>
                <tr className="border border-slate-950 bg-slate-100 text-slate-950 font-bold">
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center w-8 border border-slate-950`}>No</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Tanggal</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>NIS</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold border border-slate-950`}>Nama Siswa</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Kelas</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold border border-slate-950`}>Guru Pembimbing</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold border border-slate-950`}>Tempat PKL / Bengkel</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Datang</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Pulang</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Status</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Titik GPS</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold border border-slate-950`}>Catatan / Aktivitas PKL</th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500 border border-slate-950">
                      Tidak ada rekaman presensi pada filter laporan ini.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 print:hover:bg-transparent border border-slate-950">
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center font-mono text-slate-700 border border-slate-950`}>{idx + 1}</td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center whitespace-nowrap font-mono border border-slate-950`}>{row.tanggal}</td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center font-mono text-slate-900 font-semibold border border-slate-950`}>{row.nis}</td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-slate-950 border border-slate-950`}>{row.namaSiswa}</td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center font-semibold text-slate-900 border border-slate-950`}>
                        {row.kelas || allStudents.find(s => s.nis === row.nis)?.kelas || 'XII TKR'}
                      </td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-slate-900 font-medium border border-slate-950`}>
                        {row.namaPembimbing || allStudents.find(s => s.nis === row.nis)?.namaPembimbing || '-'}
                      </td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-slate-900 font-medium border border-slate-950`}>{row.tempatPkl}</td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} font-mono text-slate-950 font-bold text-center border border-slate-950`}>{row.jamDatang}</td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} font-mono text-slate-950 font-bold text-center border border-slate-950`}>{row.jamPulang || '-'}</td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center border border-slate-950`}>
                        <span className="font-semibold text-slate-950">
                          {row.status}
                        </span>
                      </td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} font-mono text-slate-800 text-center whitespace-nowrap border border-slate-950`}>
                        {row.koordinatGps ? row.koordinatGps.split(',')[0].trim().slice(0, 8) + '...' : '-'}
                      </td>
                      <td className={`${getTableFontCss(tableFontSize).cellPadding} text-slate-900 border border-slate-950`} title={row.keterangan}>
                        {row.keterangan || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Pengesahan (Sekretaris Jurusan TKR & Kepala Program Keahlian TKR) */}
          {kopConfig.showTtd && (
            <div className="a4-signature-block pt-6 border-t-2 border-slate-950 flex justify-between items-start text-xs text-slate-950">
              {/* Tanda Tangan Kiri: Sekretaris Jurusan TKR */}
              <div className="text-center min-w-[240px]">
                <p className="text-slate-900 whitespace-pre-line leading-relaxed font-semibold">
                  {kopConfig.ttdKiriLabel}
                </p>
                <div className="h-16 print:h-20" /> {/* Area Tanda Tangan Fisik */}
                <div>
                  <p className="font-bold underline text-slate-950 text-sm">{kopConfig.ttdKiriNama}</p>
                  <p className="text-[11px] text-slate-800 font-mono font-medium">{kopConfig.ttdKiriJabatan}</p>
                </div>
              </div>

              {/* Tanda Tangan Kanan: Kepala Program Keahlian TKR */}
              <div className="text-center min-w-[240px]">
                <p className="text-slate-900 leading-relaxed font-semibold">
                  {kopConfig.ttdKananKota}, {formatIndonesianDate(getJakartaDate())}<br />
                  {kopConfig.ttdKananLabel}
                </p>
                <div className="h-16 print:h-20" /> {/* Area Tanda Tangan Fisik */}
                <div>
                  <p className="font-bold underline text-slate-950 text-sm">{kopConfig.ttdKananNama}</p>
                  <p className="text-[11px] text-slate-800 font-mono font-medium">{kopConfig.ttdKananNip}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL PENGATURAN KOP LAPORAN & TANDA TANGAN */}
      {showKopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Atur Kop Laporan & Tanda Tangan Cetak</h3>
                  <p className="text-xs text-slate-400">Sesuaikan kop resmi instansi dan nama penandatangan laporan PDF</p>
                </div>
              </div>
              <button
                onClick={() => setShowKopModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKopConfig} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              
              {/* Seksi Kop Surat */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <School className="w-4 h-4 text-cyan-400" />
                    Teks Kop Surat Instansi
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={tempKopConfig.showKop}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, showKop: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    Tampilkan Kop
                  </label>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kop Baris 1 (Pemerintah / Yayasan / Dinas)</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopBaris1}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopBaris1: e.target.value })}
                      placeholder="Contoh: PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kop Baris 2 (Nama Sekolah / Satuan Pendidikan)</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopBaris2}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopBaris2: e.target.value })}
                      placeholder="Contoh: SMK NEGERI 1 TEGALSARI — KELOMPOK TEKNOLOGI & REKAYASA"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kop Baris 3 (Unit Kerja / Program Keahlian)</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopBaris3}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopBaris3: e.target.value })}
                      placeholder="Contoh: Bidang Kerja Khusus (BKK) & Hubin • Program PKL Jurusan TKR"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Alamat / Nomor Telepon Kop Surat</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopAlamat}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopAlamat: e.target.value })}
                      placeholder="Contoh: Jl. KH. Syafa'at No. 01 Blokagung, Tegalsari, Banyuwangi"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi Logo Kop Surat (Pojok Kiri & Pojok Kanan) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  Logo Kop Surat (Pojok Kiri & Pojok Kanan)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  
                  {/* LOGO POJOK KIRI */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Logo Pojok Kiri</span>
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={tempKopConfig.showLogoKiri !== false}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, showLogoKiri: e.target.checked })}
                          className="rounded bg-slate-950 border-slate-700 text-cyan-500"
                        />
                        Tampilkan
                      </label>
                    </div>

                    {tempKopConfig.logoKiriUrl ? (
                      <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <img src={tempKopConfig.logoKiriUrl} alt="Logo Kiri" className="w-12 h-12 object-contain bg-white rounded p-1" />
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-emerald-400 block font-semibold">Logo Kiri Terpasang</span>
                          <button
                            type="button"
                            onClick={() => setTempKopConfig({ ...tempKopConfig, logoKiriUrl: '' })}
                            className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
                          >
                            Hapus Logo Kiri
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={fileInputKiriRef}
                          accept="image/*"
                          onChange={handleUploadLogoKiri}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputKiriRef.current?.click()}
                          className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-cyan-400" />
                          Upload Logo Kiri (PNG/JPG)
                        </button>
                        <input
                          type="text"
                          value={tempKopConfig.logoKiriUrl || ''}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, logoKiriUrl: e.target.value })}
                          placeholder="Atau masukan URL logo..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[10px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* LOGO POJOK KANAN */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Logo Pojok Kanan</span>
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={tempKopConfig.showLogoKanan !== false}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, showLogoKanan: e.target.checked })}
                          className="rounded bg-slate-950 border-slate-700 text-cyan-500"
                        />
                        Tampilkan
                      </label>
                    </div>

                    {tempKopConfig.logoKananUrl ? (
                      <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <img src={tempKopConfig.logoKananUrl} alt="Logo Kanan" className="w-12 h-12 object-contain bg-white rounded p-1" />
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-emerald-400 block font-semibold">Logo Kanan Terpasang</span>
                          <button
                            type="button"
                            onClick={() => setTempKopConfig({ ...tempKopConfig, logoKananUrl: '' })}
                            className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
                          >
                            Hapus Logo Kanan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={fileInputKananRef}
                          accept="image/*"
                          onChange={handleUploadLogoKanan}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputKananRef.current?.click()}
                          className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-cyan-400" />
                          Upload Logo Kanan (PNG/JPG)
                        </button>
                        <input
                          type="text"
                          value={tempKopConfig.logoKananUrl || ''}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, logoKananUrl: e.target.value })}
                          placeholder="Atau masukan URL logo..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[10px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Seksi Tanda Tangan */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Nama & Jabatan Penandatangan (TTD)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={tempKopConfig.showTtd}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, showTtd: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    Tampilkan TTD
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  
                  {/* TTD Kiri (Sekretaris Jurusan TKR) */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-cyan-300 block">Tanda Tangan Kiri (Sekretaris Jurusan TKR)</span>
                    
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Label Pengesahan</label>
                      <textarea
                        rows={2}
                        value={tempKopConfig.ttdKiriLabel}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKiriLabel: e.target.value })}
                        placeholder="Mengetahui,&#10;Sekretaris Jurusan TKR"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKiriNama}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKiriNama: e.target.value })}
                        placeholder="Andrik Wiyono, S.T., M.Pd., Gr."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">NIP / NUPTK</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKiriJabatan}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKiriJabatan: e.target.value })}
                        placeholder="NIP. 19820415 201101 1 005"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* TTD Kanan (Kepala Program Keahlian TKR) */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-cyan-300 block">Tanda Tangan Kanan (Kepala Program Keahlian TKR)</span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Kota</label>
                        <input
                          type="text"
                          value={tempKopConfig.ttdKananKota}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananKota: e.target.value })}
                          placeholder="Tegalsari"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Jabatan</label>
                        <input
                          type="text"
                          value={tempKopConfig.ttdKananLabel}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananLabel: e.target.value })}
                          placeholder="Kepala Program Keahlian TKR"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKananNama}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananNama: e.target.value })}
                        placeholder="Achmad Mackrus, S.T."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">NIP / NUPTK</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKananNip}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananNip: e.target.value })}
                        placeholder="NIP. 19790820 200801 1 012"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Seksi Format Kertas Bawaan */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                  <Layout className="w-4 h-4 text-cyan-400" />
                  Format Ukuran Kertas Bawaan Laporan
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Ukuran Kertas Utama</label>
                    <select
                      value={tempKopConfig.paperSize || 'A4'}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, paperSize: e.target.value as PaperSize })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                    >
                      {PAPER_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.dimensions})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Orientasi Kertas</label>
                    <select
                      value={tempKopConfig.paperOrientation || 'landscape'}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, paperOrientation: e.target.value as PaperOrientation })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                    >
                      <option value="landscape">Landscape (Mendatar - Rekomendasi Presensi)</option>
                      <option value="portrait">Portrait (Tegak)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetKopDefault}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Gunakan Bawaan Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKopModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Pengaturan Kop
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL PENGATURAN UKURAN KERTAS & CETAK DOKUMEN PDF */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Menu Ukuran Kertas & Cetak PDF
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                      Sinkron Otomatis
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pilih ukuran lembar kertas dan tata letak untuk dokumen presensi PKL resmi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              
              {/* 1. Pemilihan Ukuran Kertas */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <Layout className="w-4 h-4 text-cyan-400" />
                    1. Pilih Ukuran Kertas (Paper Size):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Aktif: <strong className="text-cyan-400">{paperSize}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PAPER_OPTIONS.map((item) => {
                    const isSelected = paperSize === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setPaperSize(item.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border-cyan-500 text-white shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-white flex items-center gap-1.5">
                              {item.name}
                            </span>
                            {item.tag && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                item.schoolStandard
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}>
                                {item.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-cyan-400 font-semibold mb-1">
                            Dimensi: {item.dimensions}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="mt-2 pt-2 border-t border-cyan-500/30 flex items-center gap-1 text-[11px] text-cyan-300 font-bold">
                            <Check className="w-3.5 h-3.5" />
                            Ukuran Kertas Ini Dipilih
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Orientasi Halaman */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                  2. Orientasi Halaman (Page Orientation):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaperOrientation('landscape')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      paperOrientation === 'landscape'
                        ? 'bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border-cyan-500 text-white shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">Landscape (Mendatar)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Disarankan untuk PKL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ideal untuk rekap presensi karena memuat 12 kolom (Tanggal, NIS, Siswa, Bengkel, Datang, Pulang, GPS, Catatan) secara rapi & lapang.
                    </p>
                  </div>

                  <div
                    onClick={() => setPaperOrientation('portrait')}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      paperOrientation === 'portrait'
                        ? 'bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border-cyan-500 text-white shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">Portrait (Tegak)</span>
                      <span className="text-[10px] text-slate-400">Format vertikal</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tata letak tegak vertikal standar dokumen teks atau lembar pengantar.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Margin Kertas & Skala Ukuran Teks */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  3. Batas Margin & Skala Huruf Tabel:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Margin Kertas */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Batas Margin Kertas:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['compact', 'normal', 'spacious'] as PaperMargin[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaperMargin(m)}
                          className={`py-2 px-2 rounded-xl text-[11px] font-bold capitalize transition cursor-pointer border ${
                            paperMargin === m
                              ? 'bg-cyan-600 border-cyan-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m === 'compact' ? 'Rapat (5mm)' : m === 'normal' ? 'Normal (8mm)' : 'Lapang (15mm)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skala Ukuran Huruf Tabel */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Ukuran Teks Isi Tabel:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['compact', 'normal', 'large'] as TableFontSize[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTableFontSize(f)}
                          className={`py-2 px-2 rounded-xl text-[11px] font-bold capitalize transition cursor-pointer border ${
                            tableFontSize === f
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {f === 'compact' ? 'Kecil (7.5pt)' : f === 'normal' ? 'Normal (8.5pt)' : 'Besar (9.5pt)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Sinkronisasi */}
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-cyan-200 font-bold text-xs">
                    Format Siap Cetak: Kertas {paperSize} ({PAPER_OPTIONS.find(p => p.id === paperSize)?.dimensions}) • Posisi {paperOrientation.toUpperCase()}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Output cetak PDF bebas dari frame screenshot hitam dan berlatar belakang 100% kertas putih murni dengan garis border tabel presisi.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Tutup & Terapkan di Layar Saja
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPrintModal(false);
                  handlePrintPDF(paperSize, paperOrientation, paperMargin, tableFontSize);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak / Simpan PDF Sekarang ({paperSize})
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
