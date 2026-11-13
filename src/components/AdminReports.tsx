import React, { useState, useRef, useEffect } from 'react';
import { 
  AttendanceRecord, 
  ReportPrintConfig, 
  PaperSize, 
  PaperOrientation, 
  PaperMargin, 
  TableFontSize 
} from '../types/pkl';
import { StorageService, formatIndonesianDate, getJakartaDate, DEFAULT_REPORT_CONFIG, getAttendanceSplitStatus } from '../services/storage';
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
  Sparkles,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { optimizeLogoImage, KOP_LOGO_PRESETS } from '../utils/imageOptimizer';

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

  const getOffsetDate = (baseDateStr: string, offsetDays: number): string => {
    try {
      const [y, m, d] = baseDateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + offsetDays);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    } catch {
      return baseDateStr;
    }
  };

  const [reportType, setReportType] = useState<'harian' | 'mingguan' | 'bulanan' | 'siswa' | 'sekolah'>('bulanan');
  const [selectedDate, setSelectedDate] = useState<string>(getJakartaDate());
  const [weekStartDate, setWeekStartDate] = useState<string>(() => getOffsetDate(getJakartaDate(), -6));
  const [weekEndDate, setWeekEndDate] = useState<string>(() => getJakartaDate());
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
        .a4-signature-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
        }
        .ttd-signature-space {
          height: 90px !important;
          min-height: 90px !important;
          line-height: 90px !important;
          display: block !important;
          width: 100% !important;
        }
      }
    `;
  }, [paperSize, paperOrientation, paperMargin, tableFontSize]);

  // Keep kopConfig and print layout synchronized with latest saved configurations
  useEffect(() => {
    const saved = StorageService.getReportPrintConfig();
    if (saved) {
      setKopConfig(saved);
      if (saved.paperSize) setPaperSize(saved.paperSize);
      if (saved.paperOrientation) setPaperOrientation(saved.paperOrientation);
      if (saved.paperMargin) setPaperMargin(saved.paperMargin);
      if (saved.tableFontSize) setTableFontSize(saved.tableFontSize);
    }
  }, []);

  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);

  const [isUploadingLogoKiri, setIsUploadingLogoKiri] = useState(false);
  const [isUploadingLogoKanan, setIsUploadingLogoKanan] = useState(false);
  const [isSavingKop, setIsSavingKop] = useState(false);

  const handleUploadLogoKiri = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogoKiri(true);
      const optimizedBase64 = await optimizeLogoImage(file, 240);
      if (optimizedBase64) {
        setTempKopConfig(prev => ({ ...prev, logoKiriUrl: optimizedBase64, showLogoKiri: true }));
        showToast('Logo kiri berhasil diunggah & dioptimalkan!');
      }
    } catch (err: any) {
      console.error('Error upload logo kiri:', err);
      alert(err.message || 'Gagal memproses file gambar logo kiri.');
    } finally {
      setIsUploadingLogoKiri(false);
      if (fileInputKiriRef.current) fileInputKiriRef.current.value = '';
    }
  };

  const handleUploadLogoKanan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogoKanan(true);
      const optimizedBase64 = await optimizeLogoImage(file, 240);
      if (optimizedBase64) {
        setTempKopConfig(prev => ({ ...prev, logoKananUrl: optimizedBase64, showLogoKanan: true }));
        showToast('Logo kanan berhasil diunggah & dioptimalkan!');
      }
    } catch (err: any) {
      console.error('Error upload logo kanan:', err);
      alert(err.message || 'Gagal memproses file gambar logo kanan.');
    } finally {
      setIsUploadingLogoKanan(false);
      if (fileInputKananRef.current) fileInputKananRef.current.value = '';
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveKopConfig = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    try {
      setIsSavingKop(true);

      // 1. Immediately apply to active React state so screen updates instantly
      const updatedConfig: ReportPrintConfig = { ...tempKopConfig };
      setKopConfig(updatedConfig);
      if (updatedConfig.paperSize) setPaperSize(updatedConfig.paperSize);
      if (updatedConfig.paperOrientation) setPaperOrientation(updatedConfig.paperOrientation);
      if (updatedConfig.paperMargin) setPaperMargin(updatedConfig.paperMargin);
      if (updatedConfig.tableFontSize) setTableFontSize(updatedConfig.tableFontSize);

      // 2. Immediately close the modal so screen returns to the report page
      setShowKopModal(false);

      // 3. Persist to storage & backend asynchronously
      StorageService.saveReportPrintConfig(updatedConfig, true);

      // 4. Success feedback
      showToast('Pengaturan kop laporan, logo & penandatangan berhasil disimpan!');
      try {
        confetti({ particleCount: 35, spread: 60 });
      } catch {}
    } catch (err: any) {
      console.error('Error saat menyimpan kop config:', err);
      // Fallback: still close modal and apply in-memory
      setShowKopModal(false);
      showToast('Pengaturan diterapkan di tampilan layar.');
    } finally {
      setIsSavingKop(false);
    }
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
      const start = weekStartDate <= weekEndDate ? weekStartDate : weekEndDate;
      const end = weekStartDate <= weekEndDate ? weekEndDate : weekStartDate;
      return r.tanggal >= start && r.tanggal <= end;
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
      const { statusDatang, statusPulang } = getAttendanceSplitStatus(r);
      return {
        'No': index + 1,
        'ID Absensi': r.id,
        'Tanggal': r.tanggal,
        'NIS/NISN': r.nis,
        'Nama Siswa': r.namaSiswa,
        'Kelas': r.kelas || student?.kelas || 'XII TKR 1',
        'Asal Sekolah': r.asalSekolah,
        'Jurusan': r.jurusan,
        'Tempat PKL / Bengkel': r.tempatPkl,
        'Jam Datang': r.jamDatang,
        'Status Datang': statusDatang,
        'Jam Pulang': r.jamPulang || '-',
        'Status Pulang': statusPulang,
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
      { wch: 18 }, // Sekolah
      { wch: 25 }, // Jurusan
      { wch: 25 }, // Tempat PKL
      { wch: 12 }, // Jam Datang
      { wch: 16 }, // Status Datang
      { wch: 12 }, // Jam Pulang
      { wch: 16 }, // Status Pulang
      { wch: 22 }, // GPS
      { wch: 30 }, // Link Map
      { wch: 35 }, // Keterangan
    ];

    const periodeSuffix = reportType === 'mingguan'
      ? `${weekStartDate <= weekEndDate ? weekStartDate : weekEndDate}_sd_${weekStartDate <= weekEndDate ? weekEndDate : weekStartDate}`
      : new Date().toISOString().slice(0, 10);
    const fileName = `Laporan_Absensi_PKL_${reportType.toUpperCase()}_${periodeSuffix}.xlsx`;
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

    // Collect active page CSS rules (compiled Tailwind + index.css) so print layout matches screen preview identically
    let collectedCss = '';
    const externalLinks: string[] = [];
    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        const ownerNode = sheet.ownerNode as HTMLElement | null;
        if (ownerNode && ownerNode.id === 'dynamic-print-paper-css') return;
        try {
          const rules = sheet.cssRules;
          if (rules && rules.length > 0) {
            collectedCss += Array.from(rules).map((r) => r.cssText).join('\n') + '\n';
          }
        } catch {
          if (sheet.href) {
            externalLinks.push(`<link rel="stylesheet" href="${sheet.href}">`);
          }
        }
      });
    } catch (e) {
      console.warn('Could not serialize stylesheets for print:', e);
    }

    const docHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan_Presensi_PKL_${targetSize}_${targetOrientation.toUpperCase()}_SMKN1_Tegalsari</title>
        ${externalLinks.join('\n')}
        <style>
          ${collectedCss}
        </style>
        <style>
          @page {
            size: ${cssSize} !important;
            margin: ${marginCss} !important;
          }
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #printable-a4-document {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4px 6px !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #printable-a4-document * {
            box-shadow: none !important;
            color: #000000 !important;
          }
          .kop-surat-border {
            border-bottom: 3px double #000000 !important;
            padding-bottom: 10px !important;
            margin-bottom: 14px !important;
          }
          .a4-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 8px !important;
            margin-bottom: 14px !important;
            font-size: ${fontConfig.bodyFont} !important;
          }
          .a4-print-table th, .a4-print-table td {
            border: 1px solid #000000 !important;
            padding: ${fontConfig.tablePaddingIframe} !important;
            vertical-align: middle !important;
            color: #000000 !important;
            background-color: #ffffff !important;
          }
          .a4-print-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
            text-align: center !important;
            text-transform: uppercase !important;
          }
          .a4-print-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .a4-print-table thead {
            display: table-header-group !important;
          }
          .a4-signature-block {
            margin-top: 24px !important;
            padding-top: 18px !important;
            border-top: 2px solid #000000 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            font-size: calc(${fontConfig.bodyFont} + 0.5pt) !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .ttd-col {
            text-align: center !important;
            min-width: 240px !important;
            padding: 0 12px !important;
          }
          .ttd-label {
            white-space: pre-line !important;
            line-height: 1.5 !important;
            font-weight: 600 !important;
          }
          .ttd-signature-space {
            display: block !important;
            height: 90px !important;
            min-height: 90px !important;
            line-height: 90px !important;
            width: 100% !important;
          }
          .ttd-name {
            font-weight: bold !important;
            text-decoration: underline !important;
            font-size: calc(${fontConfig.bodyFont} + 1.5pt) !important;
          }
          .ttd-nip {
            font-family: monospace !important;
            font-size: calc(${fontConfig.bodyFont} - 0.5pt) !important;
            font-weight: 500 !important;
            margin-top: 2px !important;
          }
        </style>
      </head>
      <body>
        ${printDoc.outerHTML}
      </body>
      </html>
    `;

    let hasTriggeredPrint = false;
    const triggerIframePrint = () => {
      if (hasTriggeredPrint) return;
      hasTriggeredPrint = true;
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch {}
        }, 1500);
      }, 150);
    };

    iframe.onload = triggerIframePrint;

    doc.open();
    doc.write(docHtml);
    doc.close();

    // Fallback in case onload does not fire in certain environments
    setTimeout(triggerIframePrint, 500);
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
            type="button"
            onClick={() => {
              const current = StorageService.getReportPrintConfig();
              setTempKopConfig({ ...DEFAULT_REPORT_CONFIG, ...current, ...kopConfig });
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

          {(reportType === 'harian') && (
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

          {(reportType === 'mingguan') && (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <label className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Periode Tanggal:
                </label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                  title="Tanggal awal periode mingguan"
                />
              </div>
              <span className="text-slate-400 font-semibold">s/d</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                  title="Tanggal akhir periode mingguan"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const today = getJakartaDate();
                  setWeekStartDate(getOffsetDate(today, -6));
                  setWeekEndDate(today);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-[11px] font-semibold transition cursor-pointer"
                title="Setel otomatis 7 hari terakhir hingga hari ini"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = getJakartaDate();
                  const [y, m, d] = today.split('-').map(Number);
                  const dt = new Date(y, m - 1, d);
                  const dayOfWeek = dt.getDay(); // 0=Sun, 1=Mon...
                  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                  const monday = getOffsetDate(today, diffToMonday);
                  const saturday = getOffsetDate(monday, 5);
                  setWeekStartDate(monday);
                  setWeekEndDate(saturday);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-[11px] font-semibold transition cursor-pointer"
                title="Setel otomatis Senin sampai Sabtu minggu ini"
              >
                Minggu Ini (Sen–Sab)
              </button>
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
                    Kompetensi Keahlian: Teknik Kendaraan Ringan (TKR) • Periode:{' '}
                    {reportType === 'mingguan'
                      ? `MINGGUAN (${formatIndonesianDate(weekStartDate <= weekEndDate ? weekStartDate : weekEndDate)} s/d ${formatIndonesianDate(weekStartDate <= weekEndDate ? weekEndDate : weekStartDate)})`
                      : reportType === 'harian'
                      ? `HARIAN (${formatIndonesianDate(selectedDate)})`
                      : reportType === 'bulanan'
                      ? `BULANAN (${selectedMonth === 'all' ? 'Semua Bulan' : getMonthName(selectedMonth)} ${selectedYear === 'all' ? '' : selectedYear})`
                      : reportType.toUpperCase()}{' '}
                    ({selectedTahun === 'all' ? 'Semua Tahun Ajaran' : `TA ${selectedTahun}`}) • Format Kertas: {paperSize} {paperOrientation.toUpperCase()}
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
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold border border-slate-950`}>Tempat PKL / Bengkel</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Jam Datang</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Status Datang</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Jam Pulang</th>
                  <th className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-center border border-slate-950`}>Status Pulang</th>
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
                  filteredData.map((row, idx) => {
                    const { statusDatang, statusPulang } = getAttendanceSplitStatus(row);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50 print:hover:bg-transparent border border-slate-950">
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center font-mono text-slate-700 border border-slate-950`}>{idx + 1}</td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center whitespace-nowrap font-mono border border-slate-950`}>{row.tanggal}</td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center font-mono text-slate-900 font-semibold border border-slate-950`}>{row.nis}</td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} font-bold text-slate-950 border border-slate-950`}>{row.namaSiswa}</td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center font-semibold text-slate-900 border border-slate-950`}>
                          {row.kelas || allStudents.find(s => s.nis === row.nis)?.kelas || 'XII TKR'}
                        </td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-slate-900 font-medium border border-slate-950`}>{row.tempatPkl}</td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} font-mono text-slate-950 font-bold text-center border border-slate-950`}>{row.jamDatang}</td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center border border-slate-950`}>
                          <span className="font-semibold text-slate-950">
                            {statusDatang}
                          </span>
                        </td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} font-mono text-slate-950 font-bold text-center border border-slate-950`}>{row.jamPulang || '-'}</td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-center border border-slate-950`}>
                          <span className="font-semibold text-slate-950">
                            {statusPulang}
                          </span>
                        </td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} font-mono text-slate-800 text-center whitespace-nowrap border border-slate-950`}>
                          {row.koordinatGps ? row.koordinatGps.split(',')[0].trim().slice(0, 8) + '...' : '-'}
                        </td>
                        <td className={`${getTableFontCss(tableFontSize).cellPadding} text-slate-900 border border-slate-950`} title={row.keterangan}>
                          {row.keterangan || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Pengesahan (Sekretaris Jurusan TKR & Kepala Program Keahlian TKR) */}
          {kopConfig.showTtd && (
            <div className="a4-signature-block pt-6 border-t-2 border-slate-950 flex justify-between items-start text-xs text-slate-950">
              {/* Tanda Tangan Kiri: Sekretaris Jurusan TKR */}
              <div className="ttd-col text-center min-w-[240px]">
                <p className="ttd-label text-slate-900 whitespace-pre-line leading-relaxed font-semibold">
                  {kopConfig.ttdKiriLabel}
                </p>
                <div className="ttd-signature-space h-24 print:h-24 select-none" aria-hidden="true">
                  &nbsp;
                </div>
                <div>
                  <p className="ttd-name font-bold underline text-slate-950 text-sm">{kopConfig.ttdKiriNama}</p>
                  <p className="ttd-nip text-[11px] text-slate-800 font-mono font-medium">{kopConfig.ttdKiriJabatan}</p>
                </div>
              </div>

              {/* Tanda Tangan Kanan: Kepala Program Keahlian TKR */}
              <div className="ttd-col text-center min-w-[240px]">
                <p className="ttd-label text-slate-900 leading-relaxed font-semibold">
                  {kopConfig.ttdKananKota}, {formatIndonesianDate(getJakartaDate())}<br />
                  {kopConfig.ttdKananLabel}
                </p>
                <div className="ttd-signature-space h-24 print:h-24 select-none" aria-hidden="true">
                  &nbsp;
                </div>
                <div>
                  <p className="ttd-name font-bold underline text-slate-950 text-sm">{kopConfig.ttdKananNama}</p>
                  <p className="ttd-nip text-[11px] text-slate-800 font-mono font-medium">{kopConfig.ttdKananNip}</p>
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

            <form noValidate onSubmit={handleSaveKopConfig} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              
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
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    Logo Kop Surat (Pojok Kiri & Pojok Kanan)
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Kompresi Canvas ~25KB (Aman Vercel)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  
                  {/* LOGO POJOK KIRI */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200">Logo Pojok Kiri</span>
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

                    {/* Unconditionally mounted hidden file input so ref is never null */}
                    <input
                      type="file"
                      ref={fileInputKiriRef}
                      accept="image/*"
                      onChange={handleUploadLogoKiri}
                      className="hidden"
                    />

                    {isUploadingLogoKiri ? (
                      <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col items-center justify-center gap-2 text-cyan-300">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span className="text-[11px] font-medium">Mengompres & memproses logo...</span>
                      </div>
                    ) : tempKopConfig.logoKiriUrl ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <div className="w-14 h-14 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-slate-700 shadow-inner">
                            <img src={tempKopConfig.logoKiriUrl} alt="Logo Kiri" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <span className="text-[11px] text-emerald-400 block font-bold truncate">Logo Kiri Terpasang</span>
                            <span className="text-[10px] text-slate-400 block">Tersimpan optimal untuk cetak</span>
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => fileInputKiriRef.current?.click()}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-semibold cursor-pointer"
                              >
                                Ganti Gambar
                              </button>
                              <span className="text-slate-600">•</span>
                              <button
                                type="button"
                                onClick={() => setTempKopConfig({ ...tempKopConfig, logoKiriUrl: '' })}
                                className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Hapus
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Presets and URL input */}
                        <div className="pt-0.5">
                          <span className="text-[10px] text-slate-400 block mb-1">Ganti dengan Preset Logo Resmi:</span>
                          <div className="flex flex-wrap gap-1">
                            {KOP_LOGO_PRESETS.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setTempKopConfig({ ...tempKopConfig, logoKiriUrl: p.svg, showLogoKiri: true })}
                                className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 text-[10px] text-cyan-300 border border-slate-700 transition cursor-pointer"
                                title={p.name}
                              >
                                {p.shortName}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => fileInputKiriRef.current?.click()}
                          className="w-full py-2.5 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <Upload className="w-4 h-4 text-cyan-400" />
                          Pilih / Upload Logo Kiri (PNG/JPG)
                        </button>

                        {/* Presets */}
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-400 block mb-1">Gunakan Preset Logo Resmi:</span>
                          <div className="flex flex-wrap gap-1">
                            {KOP_LOGO_PRESETS.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setTempKopConfig({ ...tempKopConfig, logoKiriUrl: p.svg, showLogoKiri: true })}
                                className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 text-[10px] text-cyan-300 border border-slate-700 transition cursor-pointer"
                                title={p.name}
                              >
                                {p.shortName}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={tempKopConfig.logoKiriUrl || ''}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, logoKiriUrl: e.target.value })}
                          placeholder="Atau tempel URL gambar logo..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[10px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* LOGO POJOK KANAN */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200">Logo Pojok Kanan</span>
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

                    {/* Unconditionally mounted hidden file input so ref is never null */}
                    <input
                      type="file"
                      ref={fileInputKananRef}
                      accept="image/*"
                      onChange={handleUploadLogoKanan}
                      className="hidden"
                    />

                    {isUploadingLogoKanan ? (
                      <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col items-center justify-center gap-2 text-cyan-300">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span className="text-[11px] font-medium">Mengompres & memproses logo...</span>
                      </div>
                    ) : tempKopConfig.logoKananUrl ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <div className="w-14 h-14 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-slate-700 shadow-inner">
                            <img src={tempKopConfig.logoKananUrl} alt="Logo Kanan" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <span className="text-[11px] text-emerald-400 block font-bold truncate">Logo Kanan Terpasang</span>
                            <span className="text-[10px] text-slate-400 block">Tersimpan optimal untuk cetak</span>
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => fileInputKananRef.current?.click()}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-semibold cursor-pointer"
                              >
                                Ganti Gambar
                              </button>
                              <span className="text-slate-600">•</span>
                              <button
                                type="button"
                                onClick={() => setTempKopConfig({ ...tempKopConfig, logoKananUrl: '' })}
                                className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Hapus
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Presets and URL input */}
                        <div className="pt-0.5">
                          <span className="text-[10px] text-slate-400 block mb-1">Ganti dengan Preset Logo Resmi:</span>
                          <div className="flex flex-wrap gap-1">
                            {KOP_LOGO_PRESETS.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setTempKopConfig({ ...tempKopConfig, logoKananUrl: p.svg, showLogoKanan: true })}
                                className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 text-[10px] text-cyan-300 border border-slate-700 transition cursor-pointer"
                                title={p.name}
                              >
                                {p.shortName}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => fileInputKananRef.current?.click()}
                          className="w-full py-2.5 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                        >
                          <Upload className="w-4 h-4 text-cyan-400" />
                          Pilih / Upload Logo Kanan (PNG/JPG)
                        </button>

                        {/* Presets */}
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-400 block mb-1">Gunakan Preset Logo Resmi:</span>
                          <div className="flex flex-wrap gap-1">
                            {KOP_LOGO_PRESETS.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setTempKopConfig({ ...tempKopConfig, logoKananUrl: p.svg, showLogoKanan: true })}
                                className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 text-[10px] text-cyan-300 border border-slate-700 transition cursor-pointer"
                                title={p.name}
                              >
                                {p.shortName}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={tempKopConfig.logoKananUrl || ''}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, logoKananUrl: e.target.value })}
                          placeholder="Atau tempel URL gambar logo..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[10px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Helpful Optimization Notice */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Setiap gambar logo yang diunggah otomatis dikompres ke resolusi optimal (~25 KB) dengan ketajaman tinggi, sehingga tidak akan membebani kuota penyimpanan browser dan tidak akan stag/macet saat disimpan di Vercel.
                  </span>
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
                    type="button"
                    onClick={handleSaveKopConfig}
                    disabled={isSavingKop}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                  >
                    {isSavingKop ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Simpan Pengaturan Kop</span>
                      </>
                    )}
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
