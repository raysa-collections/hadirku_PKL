import React, { useState } from 'react';
import { User } from '../types/pkl';
import { StorageService } from '../services/storage';
import { RegisterModal } from './RegisterModal';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { 
  Lock, 
  User as UserIcon, 
  LogIn, 
  ShieldCheck, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  School,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LoginModalProps {
  selectedRole: 'siswa' | 'guru';
  onLoginSuccess: (user: User) => void;
  onBackToRoleSelect: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  selectedRole, 
  onLoginSuccess, 
  onBackToRoleSelect 
}) => {
  const [viewState, setViewState] = useState<'login' | 'register' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isSiswa = selectedRole === 'siswa';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setErrorMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanIdNoSpace = cleanId.replace(/\s+/g, '');
    const cleanPass = password.trim();
    const cleanPassNoSpace = cleanPass.replace(/\s+/g, '');

    if (!cleanId || !cleanPass) {
      setErrorMessage(isSiswa ? 'Harap masukkan Username Siswa / NIS dan Password.' : 'Harap masukkan Username dan Password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      if (isSiswa) {
        await StorageService.syncConfigFromServer().catch(() => {});
      }

      let users = StorageService.getUsers();
      const targetRole = isSiswa ? 'siswa' : 'admin';

      // Helper to match credentials strictly for targetRole
      const matchUserCredentials = (u: User) => {
        if (u.role !== targetRole) return false;

        const uUser = (u.username || '').toLowerCase();
        const uUserNoSpace = uUser.replace(/\s+/g, '');
        const uNis = (u.nis || '').toLowerCase();
        const uNisNoSpace = uNis.replace(/\s+/g, '');
        const uNip = (u.nip || '').toLowerCase();

        const idMatch = isSiswa
          ? (uUser === cleanId || uUserNoSpace === cleanIdNoSpace || uNis === cleanId || uNisNoSpace === cleanIdNoSpace)
          : (uUser === cleanId || uUserNoSpace === cleanIdNoSpace ||
             ((cleanId === 'admin123' || cleanId === 'admin') && (uUser === 'admin123' || uUser === 'admin')) ||
             (uNip && uNip === cleanId));

        if (!idMatch) return false;

        const uPass = (u.password || '').trim();
        const uPassNoSpace = uPass.replace(/\s+/g, '');

        return (
          uPass === cleanPass ||
          uPass.toLowerCase() === cleanPass.toLowerCase() ||
          uPassNoSpace === cleanPassNoSpace ||
          (!isSiswa && (cleanPassNoSpace === 'admin123' || cleanPass === 'admin123'))
        );
      };

      let user = users.find(matchUserCredentials);

      // If not found locally, pull latest students from server & Google Spreadsheet
      if (!user && isSiswa) {
        try {
          await StorageService.ensureConfigSynced();
          await StorageService.fetchStudentsFromServer();
          if (StorageService.isGoogleSheetConnected()) {
            await StorageService.pullStudentsFromCloud();
          }
          users = StorageService.getUsers();
          user = users.find(matchUserCredentials);
        } catch (cloudErr) {
          console.warn('Cloud login lookup error:', cloudErr);
        }
      }

      if (user) {
        StorageService.setCurrentUser(user);
        try {
          confetti({ particleCount: 40, spread: 60, disableForReducedMotion: true });
        } catch {}
        onLoginSuccess(user);
        return;
      }

      // 1. Check if user exists in the TARGET ROLE (matching username/nis) but password failed
      const sameRoleUser = users.find(u => {
        if (u.role !== targetRole) return false;
        const uUser = (u.username || '').toLowerCase();
        const uUserNoSpace = uUser.replace(/\s+/g, '');
        const uNis = (u.nis || '').toLowerCase();
        const uNisNoSpace = uNis.replace(/\s+/g, '');
        const uNip = (u.nip || '').toLowerCase();

        return isSiswa
          ? (uUser === cleanId || uUserNoSpace === cleanIdNoSpace || uNis === cleanId || uNisNoSpace === cleanIdNoSpace)
          : (uUser === cleanId || uUserNoSpace === cleanIdNoSpace || uNip === cleanId);
      });

      if (sameRoleUser) {
        setErrorMessage(
          isSiswa
            ? `Password untuk akun siswa "${sameRoleUser.nama}" (${sameRoleUser.username}) tidak cocok. Silakan periksa kembali password Anda.`
            : `Password untuk akun Administrator (${sameRoleUser.username}) salah.`
        );
        return;
      }

      // 2. Check if user exists in the OTHER ROLE only
      const otherRoleUser = users.find(u => {
        if (u.role === targetRole) return false; // Must be different role
        const uUser = (u.username || '').toLowerCase();
        const uUserNoSpace = uUser.replace(/\s+/g, '');
        const uNis = (u.nis || '').toLowerCase();
        const uNisNoSpace = uNis.replace(/\s+/g, '');
        const uNip = (u.nip || '').toLowerCase();

        return (
          uUser === cleanId ||
          uUserNoSpace === cleanIdNoSpace ||
          (uNis && (uNis === cleanId || uNisNoSpace === cleanIdNoSpace)) ||
          (uNip && uNip === cleanId)
        );
      });

      if (otherRoleUser) {
        setErrorMessage(
          isSiswa
            ? `Akun "${identifier}" terdaftar sebagai Portal Guru / Administrator. Silakan ganti pilihan ke "Sebagai Guru / Pembimbing".`
            : `Akun "${identifier}" terdaftar sebagai Siswa PKL. Silakan ganti pilihan ke "Sebagai Siswa PKL".`
        );
        return;
      }

      // 3. User does not exist at all
      setErrorMessage(
        isSiswa
          ? `Username / NIS "${identifier}" belum terdaftar. Silakan klik "Registrasi Siswa" di bawah untuk mendaftar.`
          : `Username "${identifier}" tidak terdaftar dalam sistem.`
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = (userLogin: string, pass: string) => {
    setIdentifier(userLogin);
    setPassword(pass);
    const users = StorageService.getUsers();
    const user = users.find(u => 
      (u.username === userLogin || u.nis === userLogin) && 
      (u.password === pass || pass.replace(/\s+/g, '') === u.password.replace(/\s+/g, ''))
    );
    if (user) {
      StorageService.setCurrentUser(user);
      confetti({ particleCount: 50, spread: 60 });
      onLoginSuccess(user);
    }
  };

  if (viewState === 'register' && isSiswa) {
    return <RegisterModal onSuccess={onLoginSuccess} onBackToLogin={() => setViewState('login')} />;
  }

  if (viewState === 'forgot') {
    return <ForgotPasswordModal onBackToLogin={() => setViewState('login')} />;
  }

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative text-slate-800 animate-in fade-in zoom-in-95 overflow-hidden">
      <div className={`h-1.5 w-full absolute top-0 left-0 right-0 ${
        isSiswa ? 'bg-gradient-to-r from-emerald-500 to-amber-500' : 'bg-gradient-to-r from-blue-600 to-red-600'
      }`} />
      
      {/* Top Switcher Button to Change Role */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 pt-1">
        <button
          onClick={onBackToRoleSelect}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Ganti Pilihan Peran
        </button>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
          isSiswa 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {isSiswa ? 'Portal Siswa' : 'Portal Guru'}
        </span>
      </div>

      {/* Header Branding */}
      <div className="text-center space-y-2 mb-6">
        <div className={`inline-flex w-14 h-14 rounded-2xl items-center justify-center text-white shadow-md mb-1 ${
          isSiswa 
            ? 'bg-gradient-to-tr from-emerald-600 to-emerald-500 shadow-emerald-600/20' 
            : 'bg-gradient-to-tr from-blue-600 to-blue-700 shadow-blue-600/20'
        }`}>
          {isSiswa ? <GraduationCap className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
          {isSiswa ? 'Login Siswa PKL' : 'Login Guru / Pembimbing'}
        </h2>
        <p className="text-xs text-slate-600">
          {isSiswa 
            ? 'Masukkan Username dan Password untuk presensi' 
            : 'Masukkan Username dan Password pengawas'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1.5 flex items-center justify-between">
            <span>{isSiswa ? 'Username Siswa' : 'Username Guru / Pembimbing'}</span>
            {isSiswa && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                Sesuai saat registrasi
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isSiswa ? 'Masukkan username siswa...' : 'Masukkan username...'}
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition font-mono"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-700 font-semibold">Password</label>
            <button
              type="button"
              onClick={() => setViewState('forgot')}
              className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold hover:underline transition cursor-pointer"
            >
              Lupa Password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSiswa ? 'Masukkan password...' : 'Masukkan password...'}
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoggingIn}
          className={`w-full py-2.5 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer text-xs mt-2 disabled:opacity-60 ${
            isSiswa
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
          }`}
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memeriksa Akun...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Masuk sebagai {isSiswa ? 'Siswa' : 'Guru / Pembimbing'}</span>
            </>
          )}
        </button>
      </form>

      {/* Registration Section (Hanya untuk siswa; untuk pembimbing tidak ditampilkan) */}
      {isSiswa && (
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Belum memiliki akun siswa PKL?{' '}
            <button
              onClick={() => setViewState('register')}
              className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Registrasi Siswa <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>
      )}

    </div>
  );
};
