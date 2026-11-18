import React, { useState } from 'react';
import { User, AppThemeConfig } from './types/pkl';
import { StorageService, ChangeNotificationDetail } from './services/storage';
import { RoleSelectScreen } from './components/RoleSelectScreen';
import { LoginModal } from './components/LoginModal';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentHistory } from './components/StudentHistory';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminStudentManagement } from './components/AdminStudentManagement';
import { AdminAttendanceManagement } from './components/AdminAttendanceManagement';
import { AdminReports } from './components/AdminReports';
import { AdminSettings } from './components/AdminSettings';
import { AdminGasIntegration } from './components/AdminGasIntegration';
import { GoogleSheetIntegrationModal } from './components/GoogleSheetIntegrationModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { 
  School, 
  LogOut, 
  FileSpreadsheet, 
  LayoutDashboard, 
  History, 
  Users, 
  ClipboardCheck, 
  FileText,
  Sparkles,
  Settings,
  Wrench,
  Car,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  RefreshCw
} from 'lucide-react';

interface ViewErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ViewErrorBoundary extends React.Component<{ children: React.ReactNode; onReset?: () => void }, ViewErrorBoundaryState> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Terjadi kesalahan saat menampilkan data.' };
  }

  componentDidCatch(error: Error) {
    console.error('Portal view error recovered by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-sm text-center space-y-3 my-4">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Gagal Memuat Tampilan Data</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onReset?.();
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang Tampilan
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [selectedRole, setSelectedRole] = useState<'siswa' | 'guru' | null>(null);
  const [studentTab, setStudentTab] = useState<'dashboard' | 'history'>('dashboard');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'students' | 'attendance' | 'reports' | 'gas_sync' | 'settings'>('dashboard');
  const [showGoogleSheetModal, setShowGoogleSheetModal] = useState(false);
  const [themeConfig, setThemeConfig] = useState<AppThemeConfig>(() => StorageService.getAppThemeConfig());
  const [tahunAktif, setTahunAktif] = useState<string>(() => StorageService.getActiveTahunAjaran());
  const [sheetConfig, setSheetConfig] = useState(() => StorageService.getGoogleSheetConfig());
  const [pendingCount, setPendingCount] = useState(() => StorageService.getPendingSyncCount());
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [changeNotice, setChangeNotice] = useState<ChangeNotificationDetail | null>(null);

  React.useEffect(() => {
    let noticeTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshSyncBadges = () => {
      const nextCfg = StorageService.getGoogleSheetConfig();
      const nextPending = StorageService.getPendingSyncCount();
      const nextTahun = StorageService.getActiveTahunAjaran();
      const nextTheme = StorageService.getAppThemeConfig();
      setSheetConfig(prev =>
        prev.scriptUrl === nextCfg.scriptUrl &&
        prev.connected === nextCfg.connected &&
        prev.lastSync === nextCfg.lastSync
          ? prev
          : nextCfg
      );
      setPendingCount(prev => (prev === nextPending ? prev : nextPending));
      setTahunAktif(prev => (prev === nextTahun ? prev : nextTahun));
      setThemeConfig(prev => (JSON.stringify(prev) === JSON.stringify(nextTheme) ? prev : nextTheme));
    };

    const handleChangeNotification = (evt: Event) => {
      const custom = evt as CustomEvent<ChangeNotificationDetail>;
      if (!custom?.detail) return;
      setChangeNotice(custom.detail);
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => {
        setChangeNotice(null);
      }, 6500);
    };

    refreshSyncBadges();
    const config = StorageService.getGoogleSheetConfig();
    if (config.connected && config.scriptUrl) {
      if (typeof window !== 'undefined' && window.location.search.includes('gas')) {
        setCloudNotice('Tautan presensi berhasil terhubung otomatis dengan Google Spreadsheet sekolah!');
        setTimeout(() => setCloudNotice(null), 5000);
      }
    }

    window.addEventListener('pkl-sync-updated', refreshSyncBadges);
    window.addEventListener('pkl-change-notification', handleChangeNotification);

    // Also wait for server sync so Admin/Student picks up server-configured GAS URL, tahunAjaran & theme
    StorageService.initServerSync().then(() => {
      refreshSyncBadges();
    });

    return () => {
      window.removeEventListener('pkl-sync-updated', refreshSyncBadges);
      window.removeEventListener('pkl-change-notification', handleChangeNotification);
      if (noticeTimer) clearTimeout(noticeTimer);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setAdminTab('dashboard');
    } else {
      setStudentTab('dashboard');
    }
  };

  const handleLogout = () => {
    try {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } catch {}
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setSelectedRole(null);
  };

  // =========================================================================
  // VIEW 1: NOT LOGGED IN
  // Initial screen MUST show ONLY 2 choices: Sebagai Siswa / Sebagai Guru
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
        {/* Top Four-Color Institutional Accent Bar (Merah - Emas - Biru - Hijau) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600 shrink-0" />

        {/* Subtle Bright Ambient Highlights */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-100/70 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/6 w-80 h-80 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 relative z-10 w-full">
          {/* Cloud Auto-Connect Toast */}
          {cloudNotice && (
            <div className="w-full max-w-lg mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
              <span>{cloudNotice}</span>
              <button onClick={() => setCloudNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer">✕</button>
            </div>
          )}

          {/* PWA Mobile Install Banner */}
          <div className="w-full max-w-3xl mb-4">
            <PWAInstallBanner />
          </div>

          {/* 1. INITIAL LANDING: HANYA 2 PILIHAN UTAMA */}
          {!selectedRole ? (
            <RoleSelectScreen onSelectRole={(role) => setSelectedRole(role)} />
          ) : (
            /* 2. JENDELA LOGIN / REGISTRASI KHUSUS SESUAI PERAN */
            <LoginModal
              selectedRole={selectedRole}
              onLoginSuccess={handleLoginSuccess}
              onBackToRoleSelect={() => setSelectedRole(null)}
            />
          )}

          {/* Institutional Footer */}
          <footer className="mt-10 text-center text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Sistem Informasi Absensi Siswa Praktik Kerja Lapangan (PKL)</p>
            <p className="text-[11px] text-slate-500 mt-0.5">SMK Negeri 1 Tegalsari • Terintegrasi Google Spreadsheet Real-Time (WIB)</p>
          </footer>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOGGED IN PORTAL (SISWA OR GURU/PEMBIMBING)
  // Tampilan disesuaikan dengan data dan hak akses pengguna
  // =========================================================================
  const getHeaderBorderClass = () => {
    const { headerColor, borderStyle } = themeConfig;
    
    if (borderStyle === 'bold') {
      if (headerColor === 'emerald') return 'border-b-2 border-emerald-600 shadow-sm';
      if (headerColor === 'indigo') return 'border-b-2 border-blue-700 shadow-sm';
      if (headerColor === 'amber') return 'border-b-2 border-amber-500 shadow-sm';
      if (headerColor === 'rose') return 'border-b-2 border-red-600 shadow-sm';
      if (headerColor === 'slate') return 'border-b-2 border-slate-400 shadow-sm';
      return 'border-b-2 border-blue-600 shadow-sm';
    }

    if (borderStyle === 'glow') {
      if (headerColor === 'emerald') return 'border-b border-emerald-400 shadow-md shadow-emerald-500/10';
      if (headerColor === 'indigo') return 'border-b border-blue-500 shadow-md shadow-blue-500/10';
      if (headerColor === 'amber') return 'border-b border-amber-400 shadow-md shadow-amber-500/10';
      if (headerColor === 'rose') return 'border-b border-red-400 shadow-md shadow-red-500/10';
      if (headerColor === 'slate') return 'border-b border-slate-300 shadow-md shadow-slate-400/10';
      return 'border-b border-blue-400 shadow-md shadow-blue-500/10';
    }

    if (borderStyle === 'double') {
      return 'border-b-4 border-double border-blue-600';
    }

    return 'border-b border-slate-200 shadow-xs';
  };

  const renderAppLogo = () => {
    if (themeConfig.logoUrl) {
      return (
        <img 
          src={themeConfig.logoUrl} 
          alt="Logo Instansi" 
          className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-slate-200 bg-white" 
        />
      );
    }
    
    // Preset Icons with vibrant institutional colors
    const bgGradient = themeConfig.headerColor === 'emerald'
      ? 'bg-gradient-to-tr from-emerald-600 to-emerald-500 shadow-emerald-600/20'
      : themeConfig.headerColor === 'indigo'
      ? 'bg-gradient-to-tr from-blue-700 to-blue-500 shadow-blue-700/20'
      : themeConfig.headerColor === 'amber'
      ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 shadow-amber-500/20'
      : themeConfig.headerColor === 'rose'
      ? 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-600/20'
      : themeConfig.headerColor === 'slate'
      ? 'bg-gradient-to-tr from-slate-700 to-slate-600 shadow-slate-600/20'
      : 'bg-gradient-to-tr from-blue-600 to-blue-700 shadow-blue-600/20';

    return (
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${bgGradient}`}>
        {themeConfig.logoPreset === 'wrench' && <Wrench className="w-5 h-5" />}
        {themeConfig.logoPreset === 'car' && <Car className="w-5 h-5" />}
        {themeConfig.logoPreset === 'shield' && <ShieldCheck className="w-5 h-5" />}
        {themeConfig.logoPreset === 'sparkles' && <Sparkles className="w-5 h-5" />}
        {(!themeConfig.logoPreset || themeConfig.logoPreset === 'school') && <School className="w-5 h-5" />}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Navigation Bar with Dynamic Header Border Style & 4-Color Accent Strip */}
      <header className={`${getHeaderBorderClass()} bg-white/95 backdrop-blur-md sticky top-0 z-40 print:hidden transition-colors duration-200`}>
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 min-w-0">
            {renderAppLogo()}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-none truncate">
                  {themeConfig.appTitle || 'Absensi Siswa PKL'}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  currentUser.role === 'admin' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {currentUser.role === 'admin' ? 'Administrator PKL TKR' : 'Siswa PKL'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 font-mono tabular-nums">
                  TA: {tahunAktif}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate max-w-sm font-medium flex items-center gap-1">
                {currentUser.role === 'admin' ? (
                  <span className="text-blue-700 font-semibold">Administrator PKL TKR</span>
                ) : (
                  <>
                    <span className="text-emerald-700 font-bold">Siswa:</span>
                    <span className="text-slate-700">{currentUser.nama} ({currentUser.nis})</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Header Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser.role === 'siswa' && (
              <span
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${
                  sheetConfig.connected && pendingCount === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : sheetConfig.connected && pendingCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
                title={
                  sheetConfig.connected && pendingCount === 0
                    ? 'Terhubung Otomatis dengan Google Spreadsheet Sekolah'
                    : sheetConfig.connected
                    ? `${pendingCount} data menunggu konfirmasi sinkron Spreadsheet`
                    : 'Tautan Spreadsheet belum aktif di perangkat ini — buka link resmi dari grup WhatsApp sekolah'
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    sheetConfig.connected && pendingCount === 0
                      ? 'bg-emerald-500'
                      : sheetConfig.connected
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="hidden sm:inline">
                  {sheetConfig.connected && pendingCount === 0
                    ? 'Cloud Terhubung'
                    : sheetConfig.connected
                    ? `Sinkronisasi (${pendingCount})`
                    : 'Perlu Tautan Sekolah'}
                </span>
              </span>
            )}

            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowGoogleSheetModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                    sheetConfig.connected || sheetConfig.scriptUrl
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  }`}
                  title="Konfigurasi Integrasi Google Spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden md:inline">Google Spreadsheet</span>
                  <span className={`w-2 h-2 rounded-full ${sheetConfig.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </button>

                <button
                  onClick={() => setAdminTab('settings')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                    adminTab === 'settings'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 hover:border-amber-300'
                  }`}
                  title="Menu Pengaturan Sistem & Backup Data"
                >
                  <Settings className={`w-3.5 h-3.5 ${adminTab === 'settings' ? 'text-white' : 'text-amber-600'}`} />
                  <span className="hidden sm:inline">Setting</span>
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Global Change Notification Banner (Notifikasi Perubahan) */}
        {changeNotice && (
          <div
            role="status"
            aria-live="polite"
            className={`print:hidden p-4 rounded-2xl border shadow-md flex items-start justify-between gap-3 transition-all ${
              changeNotice.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : changeNotice.type === 'info'
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  changeNotice.type === 'warning'
                    ? 'bg-amber-100 border-amber-200 text-amber-700'
                    : changeNotice.type === 'info'
                    ? 'bg-blue-100 border-blue-200 text-blue-700'
                    : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                }`}
              >
                {changeNotice.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : changeNotice.type === 'info' ? (
                  <Info className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-slate-900">{changeNotice.title}</p>
                <p className="text-slate-700 leading-relaxed">{changeNotice.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChangeNotice(null)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/70 transition cursor-pointer shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* PWA Home Screen Banner */}
        <div className="print:hidden">
          <PWAInstallBanner />
        </div>

        {/* -----------------------------------------------------------------
            TAMPILAN KHUSUS SISWA
            ----------------------------------------------------------------- */}
        {currentUser.role === 'siswa' && (
          <div className="space-y-6">
            
            {/* Student Navigation Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 print:hidden">
              <button
                onClick={() => setStudentTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  studentTab === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard & Presensi Hari Ini
              </button>

              <button
                onClick={() => setStudentTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  studentTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                Riwayat Absensi Saya
              </button>
            </div>

            <ViewErrorBoundary key={`student-${studentTab}`}>
              {studentTab === 'dashboard' && (
                <StudentDashboard 
                  user={currentUser} 
                  onNavigateToHistory={() => setStudentTab('history')} 
                />
              )}

              {studentTab === 'history' && (
                <StudentHistory 
                  user={currentUser} 
                  onBackToDashboard={() => setStudentTab('dashboard')} 
                />
              )}
            </ViewErrorBoundary>

          </div>
        )}

        {/* -----------------------------------------------------------------
            TAMPILAN KHUSUS GURU / PEMBIMBING
            ----------------------------------------------------------------- */}
        {currentUser.role === 'admin' && (
          <div className="space-y-6">
            
            {/* Admin Navigation Sub-tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 print:hidden">
              <button
                onClick={() => setAdminTab('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  adminTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${adminTab === 'dashboard' ? 'text-white' : 'text-blue-600'}`} />
                Dashboard Monitoring
              </button>

              <button
                onClick={() => setAdminTab('students')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  adminTab === 'students'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200'
                }`}
              >
                <Users className={`w-4 h-4 ${adminTab === 'students' ? 'text-white' : 'text-blue-600'}`} />
                Manajemen Siswa &amp; Bengkel PKL
              </button>

              <button
                onClick={() => setAdminTab('attendance')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  adminTab === 'attendance'
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'bg-white text-slate-700 hover:text-red-700 hover:bg-red-50 border border-slate-200'
                }`}
              >
                <ClipboardCheck className={`w-4 h-4 ${adminTab === 'attendance' ? 'text-white' : 'text-red-600'}`} />
                Koreksi Data Absensi
              </button>

              <button
                onClick={() => setAdminTab('reports')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  adminTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200'
                }`}
              >
                <FileText className={`w-4 h-4 ${adminTab === 'reports' ? 'text-white' : 'text-blue-600'}`} />
                Laporan &amp; Ekspor (.xlsx / PDF)
              </button>

              <button
                onClick={() => setAdminTab('gas_sync')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  adminTab === 'gas_sync'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-white text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                <FileSpreadsheet className={`w-4 h-4 ${adminTab === 'gas_sync' ? 'text-white' : 'text-emerald-600'}`} />
                <span>Sinkron Spreadsheet &amp; Code.gs</span>
              </button>

              <button
                onClick={() => setAdminTab('settings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  adminTab === 'settings'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                    : 'bg-white text-slate-700 hover:text-amber-800 hover:bg-amber-50 border border-slate-200'
                }`}
              >
                <Settings className={`w-4 h-4 ${adminTab === 'settings' ? 'text-white' : 'text-amber-600'}`} />
                Setting &amp; Backup Data
              </button>
            </div>

            <ViewErrorBoundary key={`admin-${adminTab}`}>
              {adminTab === 'dashboard' && (
                <AdminDashboard 
                  onNavigateTab={(tab) => setAdminTab(tab)} 
                  onOpenGoogleSheetConfig={() => setShowGoogleSheetModal(true)} 
                />
              )}

              {adminTab === 'students' && (
                <AdminStudentManagement />
              )}

              {adminTab === 'attendance' && (
                <AdminAttendanceManagement />
              )}

              {adminTab === 'reports' && (
                <AdminReports />
              )}

              {adminTab === 'gas_sync' && (
                <AdminGasIntegration />
              )}

              {adminTab === 'settings' && (
                <AdminSettings
                  onThemeUpdated={(newTheme) => setThemeConfig(newTheme)}
                  onNavigateTab={(tab) => setAdminTab(tab)}
                />
              )}
            </ViewErrorBoundary>

          </div>
        )}

      </main>

      {/* Google Spreadsheet Integration Modal */}
      {showGoogleSheetModal && (
        <GoogleSheetIntegrationModal
          onClose={() => {
            setShowGoogleSheetModal(false);
            setSheetConfig(StorageService.getGoogleSheetConfig());
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 mt-12 text-center text-xs text-slate-600 print:hidden">
        <p className="font-semibold text-slate-700">
          Sistem Informasi Absensi Siswa Praktik Kerja Lapangan (PKL) • SMKN 1 Tegalsari
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Database Terintegrasi Google Spreadsheet & Apps Script Web API • Waktu Server Asia/Jakarta (WIB)
        </p>
      </footer>

    </div>
  );
}
