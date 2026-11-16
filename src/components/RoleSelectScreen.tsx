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
        <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-blue-700 to-emerald-600 items-center justify-center text-white shadow-lg shadow-blue-600/20 mb-1 border-2 border-amber-300">
          <School className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Portal Presensi Digital PKL
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              Jurusan TKR
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sistem Informasi Absensi Siswa PKL TKR
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            SMK Negeri 1 Tegalsari • Silakan tentukan peran Anda untuk melanjutkan masuk ke sistem:
          </p>
        </div>
      </div>

      {/* 2 MAIN CHOICES (PERSYARATAN UTAMA: HANYA 2 PILIHAN AWAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* PILIHAN 1: SEBAGAI SISWA (HIJAU & EMAS) */}
        <button
          onClick={() => onSelectRole('siswa')}
          className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200 hover:border-emerald-500 text-left transition-all duration-300 group relative overflow-hidden shadow-md hover:shadow-xl hover:shadow-emerald-600/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-amber-400 absolute top-0 left-0 right-0" />
          
          <div>
            <div className="flex items-center justify-between mb-6 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                Siswa PKL
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
              Sebagai Siswa PKL
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Lakukan presensi datang dan kepulangan PKL harian secara otomatis, catat aktivitas harian, serta pantau riwayat absensi mandiri.
            </p>

            <div className="mt-4 space-y-1.5 text-[11px] text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Presensi Datang & Pulang (WIB)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tersimpan langsung ke Google Spreadsheet</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Akses mandiri via Smartphone & PC</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Masuk sebagai Siswa</span>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-sm">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* PILIHAN 2: SEBAGAI GURU / PEMBIMBING (BIRU & MERAH/EMAS) */}
        <button
          onClick={() => onSelectRole('guru')}
          className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200 hover:border-blue-600 text-left transition-all duration-300 group relative overflow-hidden shadow-md hover:shadow-xl hover:shadow-blue-600/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-red-600 absolute top-0 left-0 right-0" />
          
          <div>
            <div className="flex items-center justify-between mb-6 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                Administrator / Guru
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
              Sebagai Guru / Pembimbing
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Pantau rekap kehadiran seluruh siswa di instansi mitra, koreksi data presensi, kelola akun siswa, dan unduh laporan resmi Excel & PDF.
            </p>

            <div className="mt-4 space-y-1.5 text-[11px] text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Dashboard Statistik Kehadiran Siswa</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Koreksi Absensi & Manajemen Data</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Cetak Rekap Laporan Excel (.xlsx) & PDF</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
            <span>Masuk sebagai Guru/Pembimbing</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-sm">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

      </div>

    </div>
  );
};
