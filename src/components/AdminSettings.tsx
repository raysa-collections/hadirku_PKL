import React, { useState, useRef } from 'react';
import { AppThemeConfig, HeaderThemeColor, HeaderBorderStyle, TahunAjaranConfig } from '../types/pkl';
import { StorageService, DEFAULT_THEME_CONFIG, getJakartaDate } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
  Settings, 
  Database, 
  Download, 
  Upload, 
  Palette, 
  Type, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  FileSpreadsheet, 
  FileJson, 
  School, 
  Wrench, 
  Car, 
  ShieldCheck, 
  Sparkles,
  Check,
  Eye,
  Trash2,
  Calendar,
  Plus,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldAlert,
  Info,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VercelDeployModal } from './VercelDeployModal';
import { optimizeLogoImage } from '../utils/imageOptimizer';

interface AdminSettingsProps {
  onThemeUpdated: (newTheme: AppThemeConfig) => void;
  onNavigateTab?: (tab: 'dashboard' | 'students' | 'attendance' | 'reports' | 'gas_sync' | 'settings') => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onThemeUpdated, onNavigateTab }) => {
  const [theme, setTheme] = useState<AppThemeConfig>(() => StorageService.getAppThemeConfig());
  const [tahunConfig, setTahunConfig] = useState<TahunAjaranConfig>(() => StorageService.getTahunAjaranConfig());
  const [newTahunInput, setNewTahunInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsCodeGsNotice, setNeedsCodeGsNotice] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showVercelModal, setShowVercelModal] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);

  // Reset & Auto-Backup Modal states
  const [showResetModal, setShowResetModal] = useState<'all' | 'attendance' | 'students' | null>(null);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [resetNextTahun, setResetNextTahun] = useState<string>(() => StorageService.getActiveTahunAjaran());
  const [resetModalError, setResetModalError] = useState<string | null>(null);
  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [autoBackupNextTahun, setAutoBackupNextTahun] = useState('');
  const [confirmResetTheme, setConfirmResetTheme] = useState(false);
  const [pendingDeleteTahun, setPendingDeleteTahun] = useState<string | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const syncState = () => {
      setTahunConfig(StorageService.getTahunAjaranConfig());
      setTheme(StorageService.getAppThemeConfig());
      setDataRevision(prev => prev + 1);
    };
    window.addEventListener('pkl-sync-updated', syncState);
    return () => window.removeEventListener('pkl-sync-updated', syncState);
  }, []);

  const showToast = (msg: string) => {
    setErrorMessage(null);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const showError = (msg: string) => {
    setToastMessage(null);
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const computeSuggestedNextTahun = (current: string): string => {
    const m = /^(\d{4})\/(\d{4})$/.exec((current || '').trim());
    if (m) {
      return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
    }
    return '2026/2027';
  };

  // Reload Academic Year Config
  const reloadTahunConfig = () => {
    setTahunConfig(StorageService.getTahunAjaranConfig());
    setDataRevision(prev => prev + 1);
  };

  // Save Theme configuration
  const handleSaveTheme = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    StorageService.saveAppThemeConfig(theme);
    onThemeUpdated(theme);
    try { confetti({ particleCount: 40, spread: 60 }); } catch {}
    const msg = 'Pengaturan judul, logo, dan gaya header border berhasil disimpan.';
    showToast(msg);
    StorageService.emitChangeNotification('Perubahan Tampilan Disimpan', msg, 'success');
  };

  // Reset Theme to Default
  const handleResetTheme = () => {
    setConfirmResetTheme(false);
    setTheme(DEFAULT_THEME_CONFIG);
    StorageService.saveAppThemeConfig(DEFAULT_THEME_CONFIG);
    onThemeUpdated(DEFAULT_THEME_CONFIG);
    const msg = 'Tampilan judul, logo, dan header dikembalikan ke pengaturan default.';
    showToast(msg);
    StorageService.emitChangeNotification('Tampilan Direset ke Default', msg, 'info');
  };

  // Handle Custom Logo Upload with Automatic Canvas Downscaling
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Mohon pilih file gambar (.png, .jpg, .svg, .webp).');
      return;
    }

    try {
      const dataUrl = await optimizeLogoImage(file, 300);
      const updated: AppThemeConfig = {
        ...theme,
        logoUrl: dataUrl,
      };
      setTheme(updated);
      StorageService.saveAppThemeConfig(updated);
      onThemeUpdated(updated);
      const msg = 'Logo kustom berhasil diunggah & dioptimalkan!';
      showToast(msg);
      StorageService.emitChangeNotification('Logo Aplikasi Diperbarui', msg, 'success');
    } catch (err: any) {
      showError(err.message || 'Gagal memproses file logo.');
    } finally {
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleRemoveCustomLogo = () => {
    const updated: AppThemeConfig = {
      ...theme,
      logoUrl: undefined,
    };
    setTheme(updated);
    StorageService.saveAppThemeConfig(updated);
    onThemeUpdated(updated);
    const msg = 'Logo kustom dihapus, menggunakan preset ikon standar.';
    showToast(msg);
    StorageService.emitChangeNotification('Logo Kustom Dihapus', msg, 'info');
  };

  // =========================================================================
  // ACADEMIC YEAR MANAGEMENT (PENGGANTIAN TAHUN AJARAN)
  // =========================================================================

  const handleSelectActiveTahun = (tahun: string) => {
    const prevTahun = tahunConfig.tahunAktif;
    StorageService.setActiveTahunAjaran(tahun);
    reloadTahunConfig();
    try { confetti({ particleCount: 30, spread: 50 }); } catch {}
    const msg = `Tahun Ajaran Aktif berhasil diubah dari ${prevTahun} menjadi ${tahun} dan disinkronkan ke seluruh sistem.`;
    showToast(msg);
    StorageService.emitChangeNotification(`Perubahan Tahun Ajaran: ${tahun}`, msg, 'success');
  };

  const handleAddTahunAjaran = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTahunInput.trim();
    if (!clean) return;

    // Validate format like YYYY/YYYY (e.g. 2026/2027)
    if (!/^\d{4}\/\d{4}$/.test(clean)) {
      showError('Format Tahun Ajaran harus berformat: TTTT/TTTT (Contoh: 2026/2027)');
      return;
    }

    const added = StorageService.addTahunAjaran(clean);
    StorageService.setActiveTahunAjaran(clean);
    setNewTahunInput('');
    reloadTahunConfig();
    try { confetti({ particleCount: 40, spread: 60 }); } catch {}
    const msg = added
      ? `Tahun Ajaran "${clean}" berhasil ditambahkan, diaktifkan di seluruh aplikasi, dan disimpan ke server.`
      : `Tahun Ajaran "${clean}" sudah ada dan langsung diaktifkan sebagai periode berjalan.`;
    showToast(msg);
    StorageService.emitChangeNotification(`Tahun Ajaran ${clean} Aktif`, msg, 'success');
  };

  const handleDeleteTahunAjaran = (tahun: string) => {
    setPendingDeleteTahun(null);
    StorageService.deleteTahunAjaran(tahun);
    reloadTahunConfig();
    const msg = `Tahun Ajaran "${tahun}" telah dihapus dari daftar periode.`;
    showToast(msg);
    StorageService.emitChangeNotification('Tahun Ajaran Dihapus', msg, 'info');
  };

  // =========================================================================
  // BACKUP DATA METHODS
  // =========================================================================

  // Export JSON Backup
  const handleExportJsonBackup = () => {
    const jsonStr = StorageService.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Absensi_PKL_${tahunConfig.tahunAktif.replace('/', '_')}_${getJakartaDate()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    confetti({ particleCount: 30, spread: 50 });
    showToast('File backup database (.json) berhasil diunduh.');
  };

  // Export Full Master Excel (.xlsx)
  const handleExportExcelMaster = () => {
    const users = StorageService.getUsers().filter(u => u.role === 'siswa');
    const attendance = StorageService.getAttendance();

    // Sheet 1: Siswa
    const studentData = users.map((u, i) => ({
      'No': i + 1,
      'Tahun Ajaran': u.tahunAjaran || tahunConfig.tahunAktif,
      'NIS': u.nis,
      'Username': u.username || u.nis,
      'Nama Siswa': u.nama,
      'Jenis Kelamin': u.jenisKelamin,
      'Asal Sekolah': u.asalSekolah,
      'Jurusan': u.jurusan,
      'Tempat PKL / Bengkel': u.tempatPkl,
      'Guru Pembimbing Sekolah': u.namaPembimbing,
      'No WhatsApp / HP': u.noHp || '-',
    }));

    // Sheet 2: Absensi
    const attendanceData = attendance.map((a, i) => ({
      'No': i + 1,
      'Tahun Ajaran': a.tahunAjaran || tahunConfig.tahunAktif,
      'Tanggal': a.tanggal,
      'NIS': a.nis,
      'Nama Siswa': a.namaSiswa,
      'Jurusan': a.jurusan,
      'Tempat PKL': a.tempatPkl,
      'Jam Datang (WIB)': a.jamDatang,
      'Jam Pulang (WIB)': a.jamPulang || '-',
      'Status': a.status,
      'Koordinat Datang': a.koordinatGps || '-',
      'Koordinat Pulang': a.koordinatPulang || '-',
      'Link Google Maps': a.mapsUrl || '-',
      'Keterangan': a.keterangan || '-',
    }));

    const workbook = XLSX.utils.book_new();
    const wsStudents = XLSX.utils.json_to_sheet(studentData);
    const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);

    wsStudents['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 15 }, { wch: 22 }, { wch: 30 }, { wch: 35 }, { wch: 32 }, { wch: 16 }];
    wsAttendance['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 25 }, { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 35 }, { wch: 30 }];

    XLSX.utils.book_append_sheet(workbook, wsStudents, 'Daftar_Siswa_PKL');
    XLSX.utils.book_append_sheet(workbook, wsAttendance, 'Riwayat_Presensi');

    XLSX.writeFile(workbook, `Master_Database_Absensi_PKL_${tahunConfig.tahunAktif.replace('/', '_')}_${getJakartaDate()}.xlsx`);
    confetti({ particleCount: 30, spread: 50 });
    showToast('Database Master Excel (.xlsx) berhasil diunduh.');
  };

  // Restore JSON Backup
  const handleRestoreJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        setIsRestoring(true);

        const result = StorageService.importFullBackup(text);
        if (result.success) {
          try { confetti({ particleCount: 60, spread: 80 }); } catch {}
          showToast(result.message);
          StorageService.emitChangeNotification('Restore Database Berhasil', result.message, 'success');
          // Reload theme & tahun
          const newTheme = StorageService.getAppThemeConfig();
          setTheme(newTheme);
          onThemeUpdated(newTheme);
          reloadTahunConfig();
        } else {
          showError('Gagal restore: ' + result.message);
        }
      } catch (err: any) {
        showError('Format file JSON tidak dapat diproses: ' + (err?.message || ''));
      } finally {
        setIsRestoring(false);
        if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // =========================================================================
  // RESET DATA METHODS
  // =========================================================================

  const handleOpenResetModal = (mode: 'all' | 'attendance' | 'students', suggestedTahun?: string) => {
    setShowResetModal(mode);
    setConfirmInputText('');
    setResetModalError(null);
    setResetNextTahun(suggestedTahun || StorageService.getActiveTahunAjaran());
  };

  const handleExecuteReset = async () => {
    if (!showResetModal || isResetting) return;

    if (showResetModal === 'all' && confirmInputText.trim().toUpperCase() !== 'RESET') {
      setResetModalError('Mohon ketik kata "RESET" dengan huruf kapital untuk mengonfirmasi penghapusan total.');
      return;
    }

    const chosenTahun = resetNextTahun.trim();
    if (showResetModal === 'all' && chosenTahun && !/^\d{4}\/\d{4}$/.test(chosenTahun)) {
      setResetModalError('Format Tahun Ajaran baru harus TTTT/TTTT (Contoh: 2026/2027).');
      return;
    }

    setResetModalError(null);
    setIsResetting(true);
    try {
      if (showResetModal === 'all' && chosenTahun) {
        StorageService.setActiveTahunAjaran(chosenTahun);
      }

      const activeMode = showResetModal;
      const res = await StorageService.resetTotalData(activeMode);
      setNeedsCodeGsNotice(Boolean(res.needsCodeGsUpdate));
      reloadTahunConfig();
      try { confetti({ particleCount: 40, spread: 60 }); } catch {}
      showToast(res.message);
      StorageService.emitChangeNotification(
        activeMode === 'all'
          ? 'Reset Total & Pembaruan Periode Selesai'
          : activeMode === 'attendance'
          ? 'Reset Data Presensi Selesai'
          : 'Reset Data Siswa Selesai',
        res.message,
        res.needsCodeGsUpdate ? 'warning' : 'success'
      );
      setShowResetModal(null);
      setConfirmInputText('');
    } finally {
      setIsResetting(false);
    }
  };

  // Auto Backup and prepare empty state for new academic period
  const handleAutoBackupAndPrepareNewPeriod = () => {
    setAutoBackupNextTahun(computeSuggestedNextTahun(tahunConfig.tahunAktif));
    setShowAutoBackupModal(true);
  };

  const handleConfirmAutoBackup = () => {
    const cleanNext = autoBackupNextTahun.trim();
    if (cleanNext && !/^\d{4}\/\d{4}$/.test(cleanNext)) {
      showError('Format Tahun Ajaran baru harus TTTT/TTTT (Contoh: 2026/2027)');
      return;
    }

    handleExportJsonBackup();
    setTimeout(() => {
      handleExportExcelMaster();
    }, 350);

    setShowAutoBackupModal(false);
    StorageService.emitChangeNotification(
      'Backup JSON & Excel Diunduh',
      `Cadangan data periode ${tahunConfig.tahunAktif} telah diunduh. Konfirmasikan Reset Total untuk memulai Tahun Ajaran ${cleanNext || tahunConfig.tahunAktif}.`,
      'info'
    );
    setTimeout(() => {
      handleOpenResetModal('all', cleanNext || tahunConfig.tahunAktif);
    }, 600);
  };

  // Render Preset Icon Component
  const renderPresetIcon = (preset?: string) => {
    switch (preset) {
      case 'wrench': return <Wrench className="w-5 h-5 text-white" />;
      case 'car': return <Car className="w-5 h-5 text-white" />;
      case 'shield': return <ShieldCheck className="w-5 h-5 text-white" />;
      case 'sparkles': return <Sparkles className="w-5 h-5 text-white" />;
      case 'school':
      default:
        return <School className="w-5 h-5 text-white" />;
    }
  };

  const currentStudentsCount = StorageService.getUsers().filter(u => u.role === 'siswa').length;
  const currentAttendanceCount = StorageService.getAttendance().length;

  return (
    <div className="space-y-6" data-revision={dataRevision}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-950 font-bold cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Code.gs Update Notice after Reset when Spreadsheet still uses older Code.gs */}
      {needsCodeGsNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900">Perbarui Code.gs untuk Hapus Otomatis Sheet Data_Absensi_PKL</p>
              <p className="text-amber-900 leading-relaxed">
                Data siswa &amp; presensi di aplikasi serta server sudah kosong bersih (daftar siswa di sheet <code className="font-mono font-bold">Data_Siswa_TKR</code> juga sudah dibersihkan). Agar baris lama di sheet <code className="font-mono font-bold">Data_Absensi_PKL</code> ikut terhapus otomatis dari aplikasi saat Reset, salin &amp; deploy ulang <strong>Code.gs v2.2</strong> di menu Sinkron Spreadsheet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('gas_sync')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-sm"
              >
                Salin Code.gs Terbaru
              </button>
            )}
            <button
              type="button"
              onClick={() => setNeedsCodeGsNotice(false)}
              className="p-1.5 rounded-lg text-amber-700 hover:text-amber-950 cursor-pointer"
              aria-label="Tutup pemberitahuan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Inline Theme Reset Confirmation */}
      {confirmResetTheme && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">Kembalikan pengaturan tampilan judul, logo, dan border header ke bawaan standar?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmResetTheme(false)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleResetTheme}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              Ya, Kembalikan Default
            </button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Pengaturan Sistem, Tahun Ajaran & Reset Data</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Periode Aktif: {tahunConfig.tahunAktif}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Kelola Tahun Ajaran PKL, reset total data peserta, ekspor/restore backup database, serta kustomisasi logo & border header
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowVercelModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Onlinekan ke Vercel.app</span>
          </button>

          <button
            onClick={() => setConfirmResetTheme(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Tampilan Default</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SEKSI UTAMA: MENU PENGGANTIAN TAHUN AJARAN & METRIKS SISTEM
          ========================================================================= */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Menu Penggantian & Kelola Tahun Ajaran PKL</h3>
              <p className="text-[11px] text-slate-600">Sinkronisasi periode aktif dengan seluruh data siswa, absensi, dan laporan</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-600 font-medium">Tahun Ajaran Aktif:</span>
            <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black font-mono">
              {tahunConfig.tahunAktif}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* List Pilihan Tahun Ajaran */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Pilih / Ganti Tahun Ajaran Aktif:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tahunConfig.daftarTahun.map((t) => {
                const isSelected = tahunConfig.tahunAktif === t;
                return (
                  <div key={t} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleSelectActiveTahun(t)}
                      className={`w-full p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-blue-300'
                      }`}
                    >
                      <span className="text-xs font-mono font-bold">{t}</span>
                      {isSelected ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold border border-white/30">
                          Aktif Sekarang
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">Klik untuk Aktifkan</span>
                      )}
                    </button>
                    {tahunConfig.daftarTahun.length > 1 && !isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteTahun(t);
                        }}
                        title={`Hapus tahun ajaran ${t}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white hover:bg-red-600 text-slate-500 hover:text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-sm border border-slate-300 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {pendingDeleteTahun && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs flex items-center justify-between gap-2">
                <span className="text-red-900 font-medium">
                  Hapus Tahun Ajaran <strong className="font-mono">{pendingDeleteTahun}</strong> dari daftar opsi?
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteTahun(null)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTahunAjaran(pendingDeleteTahun)}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}

            {/* Form Tambah Tahun Ajaran Baru */}
            <form onSubmit={handleAddTahunAjaran} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newTahunInput}
                onChange={(e) => setNewTahunInput(e.target.value)}
                placeholder="Tambah Periode Baru (Contoh: 2026/2027)"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah & Aktifkan
              </button>
            </form>
          </div>

          {/* Action Quick Card Periode Baru */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                Transisi Periode Baru (Auto Backup)
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Akan berpindah ke periode siswa angkatan berikutnya? Sistem akan secara otomatis mengunduh file cadangan data (JSON & Excel) lalu menyiapkan database kosong untuk pendaftaran siswa baru.
              </p>
            </div>
            <button
              onClick={handleAutoBackupAndPrepareNewPeriod}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Buka Periode Baru (Auto Backup & Reset)
            </button>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* =========================================================================
            BAGIAN 1: PENGATURAN TEKS JUDUL, LOGO, DAN BORDER HEADER
            ========================================================================= */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kustomisasi Tampilan Header & Logo</h3>
                <p className="text-[11px] text-slate-600">Ganti judul, instansi, logo, serta warna border</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveTheme} className="space-y-4 text-xs">
            {/* Input Teks Judul Aplikasi */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-blue-600" />
                Teks Judul Aplikasi
              </label>
              <input
                type="text"
                value={theme.appTitle}
                onChange={(e) => setTheme({ ...theme, appTitle: e.target.value })}
                placeholder="Contoh: Absensi Siswa PKL / SIM-PKL TKR"
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
              <span className="text-[10px] text-slate-500 block">Tampil pada header navigasi atas aplikasi</span>
            </div>

            {/* Input Teks Sub-Judul / Instansi */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-bold">
                Teks Sub-Judul / Keterangan Instansi
              </label>
              <input
                type="text"
                value={theme.appSubtitle}
                onChange={(e) => setTheme({ ...theme, appSubtitle: e.target.value })}
                placeholder="Contoh: SMK Negeri 1 Tegalsari • Jurusan Teknik Kendaraan Ringan (TKR)"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
              <span className="text-[10px] text-slate-500 block">Tampil di bawah nama pengguna dan halaman login</span>
            </div>

            {/* Logo Aplikasi: Preset or Custom Upload */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block text-slate-700 font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  Logo Aplikasi
                </label>
                {theme.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomLogo}
                    className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus Logo Kustom
                  </button>
                )}
              </div>

              {/* Logo Preview and Upload Button */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                <div className="relative group shrink-0">
                  {theme.logoUrl ? (
                    <img 
                      src={theme.logoUrl} 
                      alt="Logo Kustom" 
                      className="w-12 h-12 rounded-2xl object-cover border border-blue-200 bg-white shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-600 shadow-sm">
                      {renderPresetIcon(theme.logoPreset)}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">
                    {theme.logoUrl ? 'Menggunakan Logo Gambar Kustom' : 'Menggunakan Ikon Preset'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-blue-200 cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3 h-3" /> Upload Gambar Logo (.png / .jpg)
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Icon Selector if no custom logo */}
              {!theme.logoUrl && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-600 font-medium block">Pilih Ikon Preset Logo:</span>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'school', label: 'Sekolah', icon: School },
                      { id: 'wrench', label: 'Bengkel', icon: Wrench },
                      { id: 'car', label: 'Otomotif', icon: Car },
                      { id: 'shield', label: 'Perisai', icon: ShieldCheck },
                      { id: 'sparkles', label: 'Modern', icon: Sparkles },
                    ].map((item) => {
                      const IconComp = item.icon;
                      const isSelected = (theme.logoPreset || 'school') === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTheme({ ...theme, logoPreset: item.id as any })}
                          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition text-center cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span className="text-[10px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Warna Skema Border & Header Theme */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="block text-slate-700 font-bold">
                Skema Warna Header & Border Aksen
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'cyan', label: 'Biru Utama', color: 'from-blue-600 to-blue-700', border: 'border-blue-600' },
                  { id: 'emerald', label: 'Hijau', color: 'from-emerald-500 to-emerald-600', border: 'border-emerald-600' },
                  { id: 'indigo', label: 'Indigo', color: 'from-blue-700 to-indigo-700', border: 'border-blue-700' },
                  { id: 'amber', label: 'Emas/Gold', color: 'from-amber-400 to-amber-600', border: 'border-amber-500' },
                  { id: 'rose', label: 'Merah', color: 'from-red-500 to-red-600', border: 'border-red-600' },
                  { id: 'slate', label: 'Netral', color: 'from-slate-500 to-slate-700', border: 'border-slate-500' },
                ].map((c) => {
                  const isSelected = theme.headerColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, headerColor: c.id as HeaderThemeColor })}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-600 text-slate-900 font-bold ring-2 ring-blue-600/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${c.color}`} />
                      <span className="text-[10px]">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gaya Ketebalan Border Header */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold">
                Gaya Garis Border Header
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'subtle', label: 'Standar Halus' },
                  { id: 'bold', label: 'Border Tegas' },
                  { id: 'glow', label: 'Efek Glow' },
                  { id: 'double', label: 'Border Ganda' },
                ].map((s) => {
                  const isSelected = theme.borderStyle === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, borderStyle: s.id as HeaderBorderStyle })}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer text-[11px] ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Simpan Perubahan Judul, Logo & Header
              </button>
            </div>
          </form>
        </div>

        {/* =========================================================================
            BAGIAN 2: MENU BACKUP & RESET TOTAL DATA SISWA
            ========================================================================= */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Menu Backup, Restore & Reset Data</h3>
                  <p className="text-[11px] text-slate-600">Unduh cadangan data atau kosongkan database periode ini</p>
                </div>
              </div>
            </div>

            {/* KETERANGAN SAAT DATA DIBACKUP & DIRESET (INFO BOX) */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Keterangan Penting Backup & Reset Data:</span>
              </div>
              <ul className="text-[11px] text-blue-900 space-y-1 list-disc list-inside leading-relaxed">
                <li><strong className="text-slate-900">Backup JSON:</strong> Memuat seluruh akun siswa, username, riwayat presensi, koordinat GPS, foto bukti, dan konfigurasi Google Apps Script.</li>
                <li><strong className="text-slate-900">Master Excel (.xlsx):</strong> Menyediakan 2 Sheet terpisah (Sheet Data Siswa & Sheet Rekapitulasi Presensi Lengkap).</li>
                <li><strong className="text-slate-900">Sebelum Melakukan Reset Data:</strong> Pastikan Anda telah mengunduh Backup JSON atau Master Excel terlebih dahulu agar data historis siswa & presensi periode ini tersimpan dengan aman.</li>
              </ul>
            </div>

            {/* Backup Action Cards */}
            <div className="space-y-2.5">
              
              {/* 1. Download Backup JSON Penuh */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Backup Penuh Database (.json)</h4>
                    <p className="text-[10px] text-slate-600">Unduh cadangan lengkap seluruh data sistem</p>
                  </div>
                </div>
                <button
                  onClick={handleExportJsonBackup}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
              </div>

              {/* 2. Download Master Excel (.xlsx) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Ekspor Master Excel (.xlsx)</h4>
                    <p className="text-[10px] text-slate-600">Sheet 1: Siswa • Sheet 2: Presensi Lengkap</p>
                  </div>
                </div>
                <button
                  onClick={handleExportExcelMaster}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>

              {/* 3. Restore JSON Backup */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-300 transition flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Pulihkan / Restore Data (.json)</h4>
                    <p className="text-[10px] text-slate-600">Kembalikan data dari file backup JSON</p>
                  </div>
                </div>
                <input
                  type="file"
                  ref={jsonFileInputRef}
                  accept=".json"
                  onChange={handleRestoreJsonFile}
                  className="hidden"
                />
                <button
                  onClick={() => jsonFileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isRestoring ? 'Memproses...' : 'Restore'}
                </button>
              </div>

            </div>
          </div>

          {/* =========================================================================
              SEKSI KHUSUS: TOMBOL RESET TOTAL DATA PESERTA (CLEAR ALL DATA)
              ========================================================================= */}
          <div className="pt-4 border-t border-red-200 bg-red-50/70 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <div>
                  <span className="text-xs font-bold text-red-800">Tombol Reset Total Data Peserta</span>
                  <p className="text-[10px] text-red-700">Kosongkan semua data siswa & presensi untuk periode/tahun ajaran baru</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-800 bg-white px-2 py-0.5 rounded border border-red-200">
                {currentStudentsCount} Siswa • {currentAttendanceCount} Presensi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Reset Total */}
              <button
                type="button"
                onClick={() => handleOpenResetModal('all')}
                className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer shadow-sm text-center"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>Reset Total (Kosongkan Semua)</span>
              </button>

              {/* Reset Presensi Only */}
              <button
                type="button"
                onClick={() => handleOpenResetModal('attendance')}
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer shadow-sm text-center"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Reset Presensi Saja</span>
              </button>

              {/* Reset Siswa Only */}
              <button
                type="button"
                onClick={() => handleOpenResetModal('students')}
                className="p-2.5 rounded-xl bg-white hover:bg-red-50 border border-red-300 text-red-700 text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer shadow-sm text-center"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Reset Siswa Saja</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================================
          MODAL KONFIRMASI KESELAMATAN RESET DATA
          ========================================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-red-200 rounded-3xl p-6 shadow-2xl relative text-slate-900 space-y-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
            
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3 pt-1">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Reset Total Data</h3>
                <p className="text-xs text-red-600 font-semibold">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {showResetModal === 'all'
                ? `Anda akan MENGOSONGKAN SELURUH data siswa (${currentStudentsCount} siswa) dan riwayat presensi (${currentAttendanceCount} presensi) dalam sistem.`
                : showResetModal === 'attendance'
                ? `Anda akan MENGHAPUS SELURUH riwayat presensi (${currentAttendanceCount} catatan presensi). Data profil akun siswa tetap tersimpan.`
                : `Anda akan MENGHAPUS SELURUH profil siswa (${currentStudentsCount} siswa) dan riwayat presensinya.`}
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
              <strong className="block text-amber-800 font-bold">⚠️ Perhatian Pengguna:</strong>
              <p>Pastikan Anda telah melakukan <strong>Backup Data (JSON / Excel)</strong> pada menu di atas jika masih membutuhkan data periode sebelumnya.</p>
              <p className="text-emerald-700 font-semibold pt-0.5">
                ✓ Akun awal Administrator PKL TKR (<code className="font-mono bg-white border border-emerald-200 px-1 rounded">admin123</code>) TIDAK akan terhapus sehingga Anda dapat tetap mengelola sistem.
              </p>
            </div>

            {showResetModal === 'all' && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Tahun Ajaran Aktif Setelah Reset:
                  </label>
                  <input
                    type="text"
                    value={resetNextTahun}
                    onChange={(e) => setResetNextTahun(e.target.value)}
                    placeholder="Contoh: 2026/2027"
                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-center text-xs font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                  <p className="text-[10px] text-slate-500">
                    Tahun ajaran ini akan otomatis diaktifkan ke seluruh aplikasi dan tidak akan kembali ke periode sebelumnya.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Ketik kata <span className="font-mono font-black text-red-600">RESET</span> untuk mengonfirmasi:
                  </label>
                  <input
                    type="text"
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    placeholder="Ketik RESET"
                    className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-center text-sm uppercase focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                  />
                </div>
              </div>
            )}

            {resetModalError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{resetModalError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowResetModal(null)}
                disabled={isResetting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting || (showResetModal === 'all' && confirmInputText.trim().toUpperCase() !== 'RESET')}
                className={`px-5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition ${
                  isResetting || (showResetModal === 'all' && confirmInputText.trim().toUpperCase() !== 'RESET')
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isResetting ? 'Mengosongkan Data...' : 'Ya, Kosongkan Data Sekarang'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Auto-Backup & Transisi Periode Baru */}
      {showAutoBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-amber-200 rounded-3xl p-6 shadow-2xl relative text-slate-900 space-y-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-blue-600 to-emerald-600" />

            <div className="flex items-center gap-3 border-b border-slate-200 pb-3 pt-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Transisi Periode Tahun Ajaran Baru</h3>
                <p className="text-xs text-slate-600">Backup Otomatis (JSON & Excel) lalu Reset Data Kosong</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Sistem akan mengunduh <strong>Backup Database (.json)</strong> dan <strong>Master Excel (.xlsx)</strong> untuk periode <strong className="font-mono">{tahunConfig.tahunAktif}</strong>, lalu membuka konfirmasi pengosongan data peserta & presensi ke tahun ajaran baru.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Tahun Ajaran Baru yang Akan Diaktifkan:
              </label>
              <input
                type="text"
                value={autoBackupNextTahun}
                onChange={(e) => setAutoBackupNextTahun(e.target.value)}
                placeholder="Contoh: 2026/2027"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-center text-sm font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAutoBackupModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAutoBackup}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Backup & Lanjut Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vercel Deployment Modal */}
      {showVercelModal && (
        <VercelDeployModal onClose={() => setShowVercelModal(false)} />
      )}

    </div>
  );
};

