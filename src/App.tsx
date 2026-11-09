import React, { useState } from 'react';
import { User, AppThemeConfig } from './types/pkl';
import { StorageService } from './services/storage';
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
  ShieldCheck
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [selectedRole, setSelectedRole] = useState<'siswa' | 'guru' | null>(null);
  const [studentTab, setStudentTab] = useState<'dashboard' | 'history'>('dashboard');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'students' | 'attendance' | 'reports' | 'gas_sync' | 'settings'>('dashboard');
  const [showGoogleSheetModal, setShowGoogleSheetModal] = useState(false);
  const [themeConfig, setThemeConfig] = useState<AppThemeConfig>(() => StorageService.getAppThemeConfig());
  const sheetConfig = StorageService.getGoogleSheetConfig();

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setAdminTab('dashboard');
    } else {
      setStudentTab('dashboard');
    }
  };

  const handleLogout = () => {
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
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden">
        {/* Subtle background ambient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

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
        <footer className="mt-10 text-center text-xs text-slate-500">
          <p>Sistem Informasi Absensi Siswa Praktik Kerja Lapangan (PKL)</p>
          <p className="text-[11px] text-slate-600 mt-0.5">SMK Negeri 1 Tegalsari • Terintegrasi Google Spreadsheet Real-Time (WIB)</p>
        </footer>
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
      if (headerColor === 'emerald') return 'border-b-2 border-emerald-500 shadow-md shadow-emerald-950/20';
      if (headerColor === 'indigo') return 'border-b-2 border-indigo-500 shadow-md shadow-indigo-950/20';
      if (headerColor === 'amber') return 'border-b-2 border-amber-500 shadow-md shadow-amber-950/20';
      if (headerColor === 'rose') return 'border-b-2 border-rose-500 shadow-md shadow-rose-950/20';
      if (headerColor === 'slate') return 'border-b-2 border-slate-600';
      return 'border-b-2 border-cyan-500 shadow-md shadow-cyan-950/20';
    }

    if (borderStyle === 'glow') {
      if (headerColor === 'emerald') return 'border-b border-emerald-500/70 shadow-lg shadow-emerald-500/20';
      if (headerColor === 'indigo') return 'border-b border-indigo-500/70 shadow-lg shadow-indigo-500/20';
      if (headerColor === 'amber') return 'border-b border-amber-500/70 shadow-lg shadow-amber-500/20';
      if (headerColor === 'rose') return 'border-b border-rose-500/70 shadow-lg shadow-rose-500/20';
      if (headerColor === 'slate') return 'border-b border-slate-500/70 shadow-lg shadow-slate-500/20';
      return 'border-b border-cyan-500/70 shadow-lg shadow-cyan-500/20';
    }

    if (borderStyle === 'double') {
      return 'border-b-4 border-double border-cyan-500/70';
    }

    return 'border-b border-slate-800';
  };

  const renderAppLogo = () => {
    if (themeConfig.logoUrl) {
      return (
        <img 
          src={themeConfig.logoUrl} 
          alt="Logo Instansi" 
          className="w-10 h-10 rounded-2xl object-cover shadow-md border border-white/10" 
        />
      );
    }
    
    // Preset Icons with gradient
    const bgGradient = themeConfig.headerColor === 'emerald'
      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/20'
      : themeConfig.headerColor === 'indigo'
      ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-600/20'
      : themeConfig.headerColor === 'amber'
      ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-amber-600/20'
      : themeConfig.headerColor === 'rose'
      ? 'bg-gradient-to-tr from-rose-600 to-red-600 shadow-rose-600/20'
      : themeConfig.headerColor === 'slate'
      ? 'bg-gradient-to-tr from-slate-700 to-slate-900 shadow-slate-700/20'
      : 'bg-gradient-to-tr from-cyan-600 to-blue-700 shadow-blue-700/20';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Navigation Bar with Dynamic Header Border Style */}
      <header className={`${getHeaderBorderClass()} bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 print:hidden transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            {renderAppLogo()}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-white tracking-tight leading-none">
                  {themeConfig.appTitle || 'Absensi Siswa PKL'}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  currentUser.role === 'admin' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {currentUser.role === 'admin' ? 'Guru / Pembimbing' : 'Siswa PKL'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  TA: {StorageService.getActiveTahunAjaran()}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate max-w-sm font-medium flex items-center gap-1">
                {currentUser.role === 'admin' ? (
                  <>
                    <span className="text-cyan-400 font-bold">Pembimbing:</span>
                    <span className="text-white font-semibold">{currentUser.nama}</span>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-400 font-bold">Siswa:</span>
                    <span>{currentUser.nama} ({currentUser.nis})</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Header Menu */}
          <div className="flex items-center gap-2">
            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setShowGoogleSheetModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                    sheetConfig.connected || sheetConfig.scriptUrl
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="Konfigurasi Integrasi Google Spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Google Spreadsheet</span>
                  <span className={`w-2 h-2 rounded-full ${sheetConfig.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                </button>

                <button
                  onClick={() => setAdminTab('settings')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                    adminTab === 'settings'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title="Menu Pengaturan Sistem & Backup Data"
                >
                  <Settings className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Setting</span>
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 print:hidden">
              <button
                onClick={() => setStudentTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  studentTab === 'dashboard'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard & Presensi Hari Ini
              </button>

              <button
                onClick={() => setStudentTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  studentTab === 'history'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Riwayat Absensi Saya
              </button>
            </div>

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

          </div>
        )}

        {/* -----------------------------------------------------------------
            TAMPILAN KHUSUS GURU / PEMBIMBING
            ----------------------------------------------------------------- */}
        {currentUser.role === 'admin' && (
          <div className="space-y-6">
            
            {/* Admin Navigation Sub-tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 print:hidden">
              <button
                onClick={() => setAdminTab('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'dashboard'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard Monitoring
              </button>

              <button
                onClick={() => setAdminTab('students')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'students'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                Manajemen Siswa & Bengkel PKL
              </button>

              <button
                onClick={() => setAdminTab('attendance')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'attendance'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                Koreksi Data Absensi
              </button>

              <button
                onClick={() => setAdminTab('reports')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'reports'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                Laporan & Ekspor (.xlsx / PDF)
              </button>

              <button
                onClick={() => setAdminTab('gas_sync')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'gas_sync'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Sinkron Spreadsheet & Code.gs</span>
              </button>

              <button
                onClick={() => setAdminTab('settings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  adminTab === 'settings'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                Setting & Backup Data
              </button>
            </div>

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
              <AdminSettings onThemeUpdated={(newTheme) => setThemeConfig(newTheme)} />
            )}

          </div>
        )}

      </main>

      {/* Google Spreadsheet Integration Modal */}
      {showGoogleSheetModal && (
        <GoogleSheetIntegrationModal onClose={() => setShowGoogleSheetModal(false)} />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 px-4 mt-12 text-center text-xs text-slate-500 print:hidden">
        <p>
          Sistem Informasi Absensi Siswa Praktik Kerja Lapangan (PKL) • SMKN 1 Tegalsari
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Database Terintegrasi Google Spreadsheet & Apps Script Web API • Waktu Server Asia/Jakarta (WIB)
        </p>
      </footer>

    </div>
  );
}
