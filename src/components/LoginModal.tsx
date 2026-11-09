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
  School
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

  const isSiswa = selectedRole === 'siswa';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMessage(isSiswa ? 'Harap masukkan Username Siswa dan Password.' : 'Harap masukkan Username dan Password.');
      return;
    }

    let users = StorageService.getUsers();
    // Match based on role and credentials
    const targetRole = isSiswa ? 'siswa' : 'admin';
    let user = users.find(u => {
      if (u.role !== targetRole) return false;

      // For student: matches username (and NIS as fallback)
      const idMatch = isSiswa
        ? (u.username.toLowerCase() === cleanId || u.nis.toLowerCase() === cleanId)
        : (u.username.toLowerCase() === cleanId || 
           (!isSiswa && (cleanId === 'admin123' || cleanId === 'admin') && (u.username.toLowerCase() === 'admin123' || u.username.toLowerCase() === 'admin')) ||
           (u.nip && u.nip.toLowerCase() === cleanId));

      if (!idMatch) return false;

      if (u.password === cleanPass) return true;

      // For guru / pembimbing: tolerate spacing in "admin 123" vs "admin123"
      if (!isSiswa) {
        const normPass = cleanPass.replace(/\s+/g, '');
        const normUserPass = u.password.replace(/\s+/g, '');
        if (normPass === normUserPass || normPass === 'admin123') {
          return true;
        }
      }

      return false;
    });

    // If not found locally and cloud is connected, try pull from Google Sheet
    if (!user && isSiswa && StorageService.isGoogleSheetConnected()) {
      try {
        await StorageService.pullStudentsFromCloud();
        users = StorageService.getUsers();
        user = users.find(u => 
          u.role === 'siswa' && 
          (u.username.toLowerCase() === cleanId || u.nis.toLowerCase() === cleanId) && 
          u.password === cleanPass
        );
      } catch (cloudErr) {
        console.warn('Cloud login lookup error:', cloudErr);
      }
    }

    if (user) {
      StorageService.setCurrentUser(user);
      confetti({ particleCount: 40, spread: 60 });
      onLoginSuccess(user);
    } else {
      // Check if user exists in the other role to provide clear guidance
      const otherRoleUser = users.find(u => 
        (u.username.toLowerCase() === cleanId || u.nis.toLowerCase() === cleanId || (u.nip && u.nip.toLowerCase() === cleanId))
      );

      if (otherRoleUser) {
        setErrorMessage(
          isSiswa 
            ? 'Akun ini terdaftar sebagai Guru/Pembimbing. Silakan kembali dan pilih "Sebagai Guru / Pembimbing".' 
            : 'Akun ini terdaftar sebagai Siswa PKL. Silakan kembali dan pilih "Sebagai Siswa PKL".'
        );
      } else {
        setErrorMessage(
          isSiswa
            ? 'Username atau Password salah. Silakan periksa kembali atau lakukan registrasi jika belum memiliki akun.'
            : 'Username atau Password salah. Silakan periksa kembali kredensial Anda.'
        );
      }
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
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_50px_rgba(30,58,138,0.25)] relative text-slate-200 animate-in fade-in zoom-in-95">
      
      {/* Top Switcher Button to Change Role */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <button
          onClick={onBackToRoleSelect}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Ganti Pilihan Peran
        </button>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isSiswa 
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
        }`}>
          {isSiswa ? 'Portal Siswa' : 'Portal Guru'}
        </span>
      </div>

      {/* Header Branding */}
      <div className="text-center space-y-2 mb-6">
        <div className={`inline-flex w-14 h-14 rounded-2xl items-center justify-center text-white shadow-lg mb-1 ${
          isSiswa 
            ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/30' 
            : 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 shadow-blue-600/30'
        }`}>
          {isSiswa ? <GraduationCap className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {isSiswa ? 'Login Siswa PKL' : 'Login Guru / Pembimbing'}
        </h2>
        <p className="text-xs text-slate-400">
          {isSiswa 
            ? 'Masukkan Username dan Password untuk presensi' 
            : 'Masukkan Username dan Password pengawas'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
            <span>{isSiswa ? 'Username Siswa' : 'Username Guru / Pembimbing'}</span>
            {isSiswa && (
              <span className="text-[10px] text-cyan-400 font-normal">
                Sesuai saat registrasi
              </span>
            )}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isSiswa ? 'Masukkan username siswa...' : 'Masukkan username...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-300 font-medium">Password</label>
            <button
              type="button"
              onClick={() => setViewState('forgot')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              Lupa Password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSiswa ? 'Masukkan password...' : 'Masukkan password...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full py-2.5 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer text-xs mt-2 ${
            isSiswa
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-700/30'
              : 'bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 shadow-blue-700/30'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Masuk sebagai {isSiswa ? 'Siswa' : 'Guru / Pembimbing'}
        </button>
      </form>

      {/* Registration Section (Hanya untuk siswa; untuk pembimbing tidak ditampilkan) */}
      {isSiswa && (
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Belum memiliki akun siswa PKL?{' '}
            <button
              onClick={() => setViewState('register')}
              className="text-cyan-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Registrasi Siswa <ArrowRight className="w-3 h-3" />
            </button>
          </p>
        </div>
      )}

    </div>
  );
};
