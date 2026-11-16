import React, { useState } from 'react';
import { User } from '../types/pkl';
import { StorageService } from '../services/storage';
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RegisterGuruModalProps {
  onSuccess: (user: User) => void;
  onBackToLogin: () => void;
}

export const RegisterGuruModal: React.FC<RegisterGuruModalProps> = ({ onSuccess, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    jabatan: 'Guru Pembimbing PKL',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nama.trim() || !formData.nip.trim() || !formData.jabatan.trim() || !formData.username.trim() || !formData.password.trim()) {
      setError('Mohon lengkapi seluruh kolom yang tersedia.');
      return;
    }

    if (formData.password.length < 5) {
      setError('Password minimal 5 karakter untuk keamanan.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase();
    const cleanNip = formData.nip.trim();

    const newUser: User = {
      id: `USR-GURU-${Date.now()}`,
      username: cleanUsername,
      password: formData.password,
      role: 'admin',
      nama: formData.nama.trim(),
      nis: cleanNip, // Store NIP in nis for unified index
      nip: cleanNip,
      jabatan: formData.jabatan.trim(),
      jenisKelamin: 'Laki-laki',
      asalSekolah: 'SMKN 1 Tegalsari',
      jurusan: formData.jabatan.trim(),
      noHp: '-',
      tempatPkl: 'Sekolah / Instansi PKL',
      namaPembimbing: 'Kepala Sekolah',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const added = StorageService.addUser(newUser);
    if (!added) {
      setError('Username atau NIP ini sudah terdaftar dalam sistem.');
      return;
    }

    StorageService.setCurrentUser(newUser);
    confetti({ particleCount: 60, spread: 70 });
    onSuccess(newUser);
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative text-slate-800 overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-red-600 to-amber-500 absolute top-0 left-0 right-0" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Registrasi Guru / Pembimbing</h2>
            <p className="text-xs text-slate-600">Pendaftaran akun pembimbing PKL sekolah</p>
          </div>
        </div>
        <button
          onClick={onBackToLogin}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Kolom Spesifik Permintaan User: Nama Lengkap, NIP, Jabatan, Username, Password */}
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap & Gelar *</label>
          <input
            type="text"
            required
            value={formData.nama}
            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            placeholder="Contoh: Drs. Bambang Sutrisno, M.Pd"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Nomor Induk Pegawai (NIP) *</label>
          <input
            type="text"
            required
            value={formData.nip}
            onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
            placeholder="Contoh: 197805122005011003 atau NIP/NUPTK"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Jabatan / Peran di Sekolah *</label>
          <input
            type="text"
            required
            value={formData.jabatan}
            onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
            placeholder="Contoh: Koordinator PKL / Guru Pembimbing TKR"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
            <span>Username Akun *</span>
            <span className="text-[10px] text-slate-500">Huruf kecil & angka</span>
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Contoh: bambang.pkl"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimal 5 karakter"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Konfirmasi Password *</label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Ketik ulang password"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition text-xs cursor-pointer"
          >
            Daftarkan Guru / Pembimbing & Masuk
          </button>
        </div>
      </form>

    </div>
  );
};
