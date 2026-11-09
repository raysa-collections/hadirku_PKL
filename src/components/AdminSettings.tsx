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

interface AdminSettingsProps {
  onThemeUpdated: (newTheme: AppThemeConfig) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onThemeUpdated }) => {
  const [theme, setTheme] = useState<AppThemeConfig>(() => StorageService.getAppThemeConfig());
  const [tahunConfig, setTahunConfig] = useState<TahunAjaranConfig>(() => StorageService.getTahunAjaranConfig());
  const [newTahunInput, setNewTahunInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showVercelModal, setShowVercelModal] = useState(false);
  
  // Reset Modal state
  const [showResetModal, setShowResetModal] = useState<'all' | 'attendance' | 'students' | null>(null);
  const [confirmInputText, setConfirmInputText] = useState('');

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reload Academic Year Config
  const reloadTahunConfig = () => {
    setTahunConfig(StorageService.getTahunAjaranConfig());
  };

  // Save Theme configuration
  const handleSaveTheme = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    StorageService.saveAppThemeConfig(theme);
    onThemeUpdated(theme);
    confetti({ particleCount: 40, spread: 60 });
    showToast('Pengaturan judul, logo, dan gaya header border berhasil disimpan!');
  };

  // Reset Theme to Default
  const handleResetTheme = () => {
    if (confirm('Kembalikan pengaturan tampilan judul, logo, dan border header ke bawaan standar?')) {
      setTheme(DEFAULT_THEME_CONFIG);
      StorageService.saveAppThemeConfig(DEFAULT_THEME_CONFIG);
      onThemeUpdated(DEFAULT_THEME_CONFIG);
      showToast('Tampilan berhasil dikembalikan ke default.');
    }
  };

  // Handle Custom Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (.png, .jpg, .svg, .webp).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo terlalu besar. Maksimal 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      const updated: AppThemeConfig = {
        ...theme,
        logoUrl: dataUrl,
      };
      setTheme(updated);
      StorageService.saveAppThemeConfig(updated);
      onThemeUpdated(updated);
      showToast('Logo kustom berhasil diunggah!');
    };
    reader.readAsDataURL(file);
    if (logoFileInputRef.current) logoFileInputRef.current.value = '';
  };

  const handleRemoveCustomLogo = () => {
    const updated: AppThemeConfig = {
      ...theme,
      logoUrl: undefined,
    };
    setTheme(updated);
    StorageService.saveAppThemeConfig(updated);
    onThemeUpdated(updated);
    showToast('Logo kustom dihapus, menggunakan preset ikon.');
  };

  // =========================================================================
  // ACADEMIC YEAR MANAGEMENT (PENGGANTIAN TAHUN AJARAN)
  // =========================================================================

  const handleSelectActiveTahun = (tahun: string) => {
    StorageService.setActiveTahunAjaran(tahun);
    reloadTahunConfig();
    confetti({ particleCount: 30, spread: 50 });
    showToast(`Tahun Ajaran Aktif berhasil diubah ke: ${tahun}`);
  };

  const handleAddTahunAjaran = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTahunInput.trim();
    if (!clean) return;

    // Validate format like YYYY/YYYY (e.g. 2026/2027)
    if (!/^\d{4}\/\d{4}$/.test(clean)) {
      alert('Format Tahun Ajaran harus berformat: TTTT/TTTT (Contoh: 2026/2027)');
      return;
    }

    const added = StorageService.addTahunAjaran(clean);
    if (added) {
      StorageService.setActiveTahunAjaran(clean);
      setNewTahunInput('');
      reloadTahunConfig();
      confetti({ particleCount: 40, spread: 60 });
      showToast(`Tahun Ajaran "${clean}" berhasil ditambahkan dan dijadikan Aktif.`);
    } else {
      alert(`Tahun Ajaran "${clean}" sudah ada dalam daftar.`);
    }
  };

  const handleDeleteTahunAjaran = (tahun: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus Tahun Ajaran "${tahun}" dari opsi daftar?`)) {
      StorageService.deleteTahunAjaran(tahun);
      reloadTahunConfig();
      showToast(`Tahun Ajaran "${tahun}" berhasil dihapus.`);
    }
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
          confetti({ particleCount: 60, spread: 80 });
          showToast(result.message);
          // Reload theme & tahun
          const newTheme = StorageService.getAppThemeConfig();
          setTheme(newTheme);
          onThemeUpdated(newTheme);
          reloadTahunConfig();
        } else {
          alert('Gagal restore: ' + result.message);
        }
      } catch (err: any) {
        alert('Format file JSON tidak dapat diproses: ' + (err?.message || ''));
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

  const handleOpenResetModal = (mode: 'all' | 'attendance' | 'students') => {
    setShowResetModal(mode);
    setConfirmInputText('');
  };

  const handleExecuteReset = () => {
    if (!showResetModal) return;

    if (showResetModal === 'all' && confirmInputText.trim().toUpperCase() !== 'RESET') {
      alert('Mohon ketik kata "RESET" dengan huruf kapital untuk mengonfirmasi penghapusan total.');
      return;
    }

    const res = StorageService.resetTotalData(showResetModal);
    confetti({ particleCount: 40, spread: 60 });
    showToast(res.message);
    setShowResetModal(null);
    setConfirmInputText('');
  };

  // Auto Backup and prepare empty state for new academic period
  const handleAutoBackupAndPrepareNewPeriod = () => {
    if (confirm('Langkah ini akan mendownload Backup JSON & Master Excel secara otomatis, kemudian mengosongkan data peserta untuk tahun ajaran baru. Lanjutkan?')) {
      handleExportJsonBackup();
      setTimeout(() => {
        handleExportExcelMaster();
        setTimeout(() => {
          handleOpenResetModal('all');
        }, 1000);
      }, 800);
    }
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
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Pengaturan Sistem, Tahun Ajaran & Reset Data</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
              Periode Aktif: {tahunConfig.tahunAktif}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola Tahun Ajaran PKL, reset total data peserta, ekspor/restore backup database, serta kustomisasi logo & border header
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowVercelModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-black via-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-950/30"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Onlinekan ke Vercel.app</span>
          </button>

          <button
            onClick={handleResetTheme}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Tampilan Default</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SEKSI UTAMA: MENU PENGGANTIAN TAHUN AJARAN & METRIKS SISTEM
          ========================================================================= */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Menu Penggantian & Kelola Tahun Ajaran PKL</h3>
              <p className="text-[11px] text-slate-400">Sinkronisasi periode aktif dengan seluruh data siswa, absensi, dan laporan</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-400">Tahun Ajaran Aktif:</span>
            <span className="px-3 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-black font-mono">
              {tahunConfig.tahunAktif}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* List Pilihan Tahun Ajaran */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">Pilih / Ganti Tahun Ajaran Aktif:</span>
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
                          ? 'bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-500 text-white font-bold ring-2 ring-cyan-500/30 shadow-lg'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-mono font-bold">{t}</span>
                      {isSelected ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                          Aktif Sekarang
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 group-hover:text-slate-400">Klik untuk Aktifkan</span>
                      )}
                    </button>
                    {tahunConfig.daftarTahun.length > 1 && !isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTahunAjaran(t);
                        }}
                        title={`Hapus tahun ajaran ${t}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-200 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-md border border-slate-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Form Tambah Tahun Ajaran Baru */}
            <form onSubmit={handleAddTahunAjaran} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newTahunInput}
                onChange={(e) => setNewTahunInput(e.target.value)}
                placeholder="Tambah Periode Baru (Contoh: 2026/2027)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah & Aktifkan
              </button>
            </form>
          </div>

          {/* Action Quick Card Periode Baru */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950/40 border border-cyan-500/30 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                Transisi Periode Baru (Auto Backup)
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Akan berpindah ke periode siswa angkatan berikutnya? Sistem akan secara otomatis mengunduh file cadangan data (JSON & Excel) lalu menyiapkan database kosong untuk pendaftaran siswa baru.
              </p>
            </div>
            <button
              onClick={handleAutoBackupAndPrepareNewPeriod}
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
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
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Kustomisasi Tampilan Header & Logo</h3>
                <p className="text-[11px] text-slate-400">Ganti judul, instansi, logo, serta warna border</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveTheme} className="space-y-4 text-xs">
            {/* Input Teks Judul Aplikasi */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-cyan-400" />
                Teks Judul Aplikasi
              </label>
              <input
                type="text"
                value={theme.appTitle}
                onChange={(e) => setTheme({ ...theme, appTitle: e.target.value })}
                placeholder="Contoh: Absensi Siswa PKL / SIM-PKL TKR"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 block">Tampil pada header navigasi atas aplikasi</span>
            </div>

            {/* Input Teks Sub-Judul / Instansi */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-semibold">
                Teks Sub-Judul / Keterangan Instansi
              </label>
              <input
                type="text"
                value={theme.appSubtitle}
                onChange={(e) => setTheme({ ...theme, appSubtitle: e.target.value })}
                placeholder="Contoh: SMK Negeri 1 Tegalsari • Jurusan Teknik Kendaraan Ringan (TKR)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 block">Tampil di bawah nama pengguna dan halaman login</span>
            </div>

            {/* Logo Aplikasi: Preset or Custom Upload */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Logo Aplikasi
                </label>
                {theme.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomLogo}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus Logo Kustom
                  </button>
                )}
              </div>

              {/* Logo Preview and Upload Button */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                <div className="relative group shrink-0">
                  {theme.logoUrl ? (
                    <img 
                      src={theme.logoUrl} 
                      alt="Logo Kustom" 
                      className="w-12 h-12 rounded-2xl object-cover border border-cyan-500/40 bg-slate-900 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-cyan-600 to-blue-700 shadow-md">
                      {renderPresetIcon(theme.logoPreset)}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white">
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
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Upload Gambar Logo (.png / .jpg)
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Icon Selector if no custom logo */}
              {!theme.logoUrl && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 block">Pilih Ikon Preset Logo:</span>
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
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
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
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="block text-slate-300 font-semibold">
                Skema Warna Header & Border Aksen
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'cyan', label: 'Cyan / Biru', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-500' },
                  { id: 'emerald', label: 'Emerald', color: 'from-emerald-500 to-teal-600', border: 'border-emerald-500' },
                  { id: 'indigo', label: 'Indigo', color: 'from-indigo-500 to-purple-600', border: 'border-indigo-500' },
                  { id: 'amber', label: 'Emas/Amber', color: 'from-amber-500 to-yellow-600', border: 'border-amber-500' },
                  { id: 'rose', label: 'Crimson', color: 'from-rose-500 to-red-600', border: 'border-rose-500' },
                  { id: 'slate', label: 'Netral', color: 'from-slate-600 to-slate-800', border: 'border-slate-500' },
                ].map((c) => {
                  const isSelected = theme.headerColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, headerColor: c.id as HeaderThemeColor })}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-white text-white font-bold ring-2 ring-white/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
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
              <label className="block text-slate-300 font-semibold">
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
                          ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
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
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition cursor-pointer"
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
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Menu Backup, Restore & Reset Data</h3>
                  <p className="text-[11px] text-slate-400">Unduh cadangan data atau kosongkan database periode ini</p>
                </div>
              </div>
            </div>

            {/* KETERANGAN SAAT DATA DIBACKUP & DIRESET (INFO BOX) */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-blue-500/30 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Keterangan Penting Backup & Reset Data:</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside leading-relaxed">
                <li><strong className="text-white">Backup JSON:</strong> Memuat seluruh akun siswa, username, riwayat presensi, koordinat GPS, foto bukti, dan konfigurasi Google Apps Script.</li>
                <li><strong className="text-white">Master Excel (.xlsx):</strong> Menyediakan 2 Sheet terpisah (Sheet Data Siswa & Sheet Rekapitulasi Presensi Lengkap).</li>
                <li><strong className="text-white">Sebelum Melakukan Reset Data:</strong> Pastikan Anda telah mengunduh Backup JSON atau Master Excel terlebih dahulu agar data historis siswa & presensi periode ini tersimpan dengan aman.</li>
              </ul>
            </div>

            {/* Backup Action Cards */}
            <div className="space-y-2.5">
              
              {/* 1. Download Backup JSON Penuh */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Backup Penuh Database (.json)</h4>
                    <p className="text-[10px] text-slate-400">Unduh cadangan lengkap seluruh data sistem</p>
                  </div>
                </div>
                <button
                  onClick={handleExportJsonBackup}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
              </div>

              {/* 2. Download Master Excel (.xlsx) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Ekspor Master Excel (.xlsx)</h4>
                    <p className="text-[10px] text-slate-400">Sheet 1: Siswa • Sheet 2: Presensi Lengkap</p>
                  </div>
                </div>
                <button
                  onClick={handleExportExcelMaster}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>

              {/* 3. Restore JSON Backup */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Pulihkan / Restore Data (.json)</h4>
                    <p className="text-[10px] text-slate-400">Kembalikan data dari file backup JSON</p>
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
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
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
          <div className="pt-4 border-t border-red-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="text-xs font-bold text-rose-200">Tombol Reset Total Data Peserta</span>
                  <p className="text-[10px] text-slate-400">Kosongkan semua data siswa & presensi untuk periode/tahun ajaran baru</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {currentStudentsCount} Siswa • {currentAttendanceCount} Presensi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Reset Total */}
              <button
                type="button"
                onClick={() => handleOpenResetModal('all')}
                className="p-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer shadow-md text-center"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Reset Total (Kosongkan Semua)</span>
              </button>

              {/* Reset Presensi Only */}
              <button
                type="button"
                onClick={() => handleOpenResetModal('attendance')}
                className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer shadow-sm text-center"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Reset Presensi Saja</span>
              </button>

              {/* Reset Siswa Only */}
              <button
                type="button"
                onClick={() => handleOpenResetModal('students')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer text-center"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Konfirmasi Reset Total Data</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {showResetModal === 'all'
                ? `Anda akan MENGOSONGKAN SELURUH data siswa (${currentStudentsCount} siswa) dan riwayat presensi (${currentAttendanceCount} presensi) dalam sistem.`
                : showResetModal === 'attendance'
                ? `Anda akan MENGHAPUS SELURUH riwayat presensi (${currentAttendanceCount} catatan presensi). Data profil akun siswa tetap tersimpan.`
                : `Anda akan MENGHAPUS SELURUH profil siswa (${currentStudentsCount} siswa) dan riwayat presensinya.`}
            </p>

            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-[11px] space-y-1">
              <strong className="block text-amber-300 font-bold">⚠️ Perhatian Pengguna:</strong>
              <p>Pastikan Anda telah melakukan <strong>Backup Data (JSON / Excel)</strong> pada menu di atas jika masih membutuhkan data periode sebelumnya.</p>
              <p className="text-emerald-300 font-semibold pt-0.5">
                ✓ Akun awal Pembimbing Sekolah (<code className="font-mono bg-slate-950 px-1 rounded">admin123</code>) TIDAK akan terhapus sehingga Anda dapat tetap mengelola sistem.
              </p>
            </div>

            {showResetModal === 'all' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Ketik kata <span className="font-mono font-black text-rose-400">RESET</span> untuk mengonfirmasi:
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder="Ketik RESET"
                  className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-white font-mono text-center text-sm uppercase focus:outline-none focus:border-rose-400"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={showResetModal === 'all' && confirmInputText.trim().toUpperCase() !== 'RESET'}
                className={`px-5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer ${
                  showResetModal === 'all' && confirmInputText.trim().toUpperCase() !== 'RESET'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Data Sekarang</span>
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

