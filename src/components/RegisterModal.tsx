import React, { useState } from 'react';
import { User, PEMBIMBING_TKR_LIST } from '../types/pkl';
import { StorageService } from '../services/storage';
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RegisterModalProps {
  onSuccess: (user: User) => void;
  onBackToLogin: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ onSuccess, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    nis: '',
    nama: '',
    kelas: 'XII TKR 1',
    jenisKelamin: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Teknik Kendaraan Ringan (TKR)',
    noHp: '',
    tempatPkl: '',
    namaPembimbing: PEMBIMBING_TKR_LIST[0],
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanNis = formData.nis.trim();
    const cleanNama = formData.nama.trim();

    if (!cleanUsername || !cleanNis || !cleanNama || !formData.password.trim()) {
      setError('Mohon lengkapi Username, NIS, Nama Siswa, dan Password.');
      return;
    }

    if (cleanUsername.length < 3) {
      setError('Username minimal 3 karakter untuk login.');
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

    // Fetch fresh user list from server to ensure reset status is 100% accurate
    let existingUsers: User[] = [];
    try {
      existingUsers = await StorageService.fetchStudentsFromServer();
    } catch {
      existingUsers = StorageService.getUsers();
    }

    if (existingUsers.some(u => u.username && u.username.toLowerCase() === cleanUsername)) {
      setError(`Username "${cleanUsername}" sudah digunakan akun lain. Silakan pilih username lain.`);
      return;
    }

    if (existingUsers.some(u => u.nis && u.nis.toLowerCase() === cleanNis.toLowerCase())) {
      setError(`NIS "${cleanNis}" sudah terdaftar dalam sistem.`);
      return;
    }

    const newUser: User = {
      id: `USR-SISWA-${Date.now()}`,
      username: cleanUsername,
      password: formData.password,
      role: 'siswa',
      nama: cleanNama,
      nis: cleanNis,
      kelas: formData.kelas.trim() || 'XII TKR 1',
      jenisKelamin: formData.jenisKelamin,
      asalSekolah: formData.asalSekolah.trim() || 'SMKN 1 Tegalsari',
      jurusan: formData.jurusan.trim(),
      noHp: formData.noHp.trim(),
      tempatPkl: formData.tempatPkl.trim() || 'Instansi PKL Mitra',
      namaPembimbing: formData.namaPembimbing.trim() || 'Pembimbing Lapangan',
      tahunAjaran: StorageService.getActiveTahunAjaran(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const added = StorageService.addUser(newUser);
    if (!added) {
      setError('Akun dengan NIS atau Username tersebut sudah ada.');
      return;
    }

    // Automatically sync registered student to Google Spreadsheet Data_Siswa_TKR sheet
    StorageService.syncStudentToGoogleSheet(newUser);

    StorageService.setCurrentUser(newUser);
    confetti({ particleCount: 60, spread: 70 });
    onSuccess(newUser);
  };

  return (
    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Registrasi Siswa PKL</h2>
            <p className="text-xs text-slate-400">Pendaftaran akun absensi mandiri siswa</p>
          </div>
        </div>
        <button
          onClick={onBackToLogin}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Username Akun Siswa *</span>
              <span className="text-[10px] text-cyan-400">Untuk Login Aplikasi</span>
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
              placeholder="Contoh: ahmad_rizki"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">NIS / NISN Siswa *</label>
            <input
              type="text"
              required
              value={formData.nis}
              onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
              placeholder="Contoh: 20240105"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-medium mb-1">Nama Lengkap Siswa *</label>
            <input
              type="text"
              required
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Nama lengkap sesuai absen sekolah"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Kelas *</label>
            <select
              value={formData.kelas}
              onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="XII TKR 1">XII TKR 1</option>
              <option value="XII TKR 2">XII TKR 2</option>
              <option value="XII TKR 3">XII TKR 3</option>
              <option value="XII RPL 1">XII RPL 1</option>
              <option value="XII AKL 1">XII AKL 1</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Jenis Kelamin</label>
            <select
              value={formData.jenisKelamin}
              onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">No. WhatsApp / HP</label>
            <input
              type="tel"
              value={formData.noHp}
              onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Asal Sekolah</label>
            <input
              type="text"
              value={formData.asalSekolah}
              onChange={(e) => setFormData({ ...formData, asalSekolah: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Jurusan / Kompetensi Keahlian</label>
            <select
              value={formData.jurusan}
              onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="Teknik Kendaraan Ringan (TKR)">Teknik Kendaraan Ringan (TKR)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Nama Tempat / Perusahaan PKL</label>
            <input
              type="text"
              value={formData.tempatPkl}
              onChange={(e) => setFormData({ ...formData, tempatPkl: e.target.value })}
              placeholder="Contoh: PT Auto2000 / Bengkel Jaya"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Nama Pembimbing / Mentor Sekolah *
            </label>
            <select
              required
              value={formData.namaPembimbing}
              onChange={(e) => setFormData({ ...formData, namaPembimbing: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-medium"
            >
              {PEMBIMBING_TKR_LIST.map((mentor) => (
                <option key={mentor} value={mentor}>
                  {mentor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Buat Password Baru *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimal 5 karakter"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Konfirmasi Password *</label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Ketik ulang password"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30 transition text-xs"
          >
            Daftarkan Akun & Masuk Sekarang
          </button>
        </div>
      </form>
    </div>
  );
};
