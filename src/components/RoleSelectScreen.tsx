import React from 'react';
import { GraduationCap, ShieldCheck, ArrowRight, School, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

interface RoleSelectScreenProps {
  onSelectRole: (role: 'siswa' | 'guru') => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onSelectRole }) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Brand Title Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-400 items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-1 border border-white/10">
          <School className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-cyan-300 border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Portal Presensi Digital PKL
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Sistem Informasi Absensi Siswa PKL TKR
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            SMK Negeri 1 Tegalsari • Silakan tentukan peran Anda untuk melanjutkan masuk ke sistem:
          </p>
        </div>
      </div>

      {/* 2 MAIN CHOICES (PERSYARATAN UTAMA: HANYA 2 PILIHAN AWAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* PILIHAN 1: SEBAGAI SISWA */}
        <button
          onClick={() => onSelectRole('siswa')}
          className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/80 text-left transition-all duration-300 group relative overflow-hidden shadow-xl hover:shadow-emerald-950/40 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition" />
          
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                <GraduationCap className="w-7 h-7 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wider">
                Siswa PKL
              </span>
            </div>

            <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
              Sebagai Siswa PKL
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              Lakukan presensi datang dan kepulangan PKL harian secara otomatis, catat aktivitas harian, serta pantau riwayat absensi mandiri.
            </p>

            <div className="mt-4 space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Presensi Datang & Pulang (WIB)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Tersimpan langsung ke Google Spreadsheet</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Akses mandiri via Smartphone & PC</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
            <span>Masuk sebagai Siswa</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* PILIHAN 2: SEBAGAI GURU / PEMBIMBING */}
        <button
          onClick={() => onSelectRole('guru')}
          className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-800/80 text-left transition-all duration-300 group relative overflow-hidden shadow-xl hover:shadow-cyan-950/40 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition" />
          
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                Guru / Admin
              </span>
            </div>

            <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors">
              Sebagai Guru / Pembimbing
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              Pantau rekap kehadiran seluruh siswa di instansi mitra, koreksi data presensi, kelola akun siswa, dan unduh laporan resmi Excel & PDF.
            </p>

            <div className="mt-4 space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Dashboard Statistik Kehadiran Siswa</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Koreksi Absensi & Manajemen Data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Cetak Rekap Laporan Excel (.xlsx) & PDF</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
            <span>Masuk sebagai Guru/Pembimbing</span>
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

      </div>

    </div>
  );
};
