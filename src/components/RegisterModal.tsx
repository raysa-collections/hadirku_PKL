import React, { useState, useEffect } from 'react';
import { User, PEMBIMBING_TKR_LIST } from '../types/pkl';
import { StorageService } from '../services/storage';
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloudReady, setIsCloudReady] = useState(() => StorageService.isGoogleSheetConnected());

  useEffect(() => {
    StorageService.ensureConfigSynced()
      .then(() => {
        setIsCloudReady(StorageService.isGoogleSheetConnected());
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanNis = formData.nis.trim();
    const cleanNama = formData.nama.trim();

    if (!cleanUsername || !cleanNis || !cleanNama || !formData.password.trim()) {
      setError('Mohon lengkapi Username, NIS, Nama Siswa, dan Password.');
      return;
    }

    const cleanPassword = formData.password.trim();

    if (cleanUsername.length < 3) {
      setError('Username minimal 3 karakter untuk login.');
      return;
    }

    if (cleanPassword.length < 5) {
      setError('Password minimal 5 karakter untuk keamanan.');
      return;
    }

    if (cleanPassword !== formData.confirmPassword.trim()) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsSubmitting(true);

    try {
      await StorageService.ensureConfigSynced();

      // Fetch fresh user list from server & Google Spreadsheet to ensure duplicate checks are accurate
      let existingUsers: User[] = [];
      try {
        existingUsers = await StorageService.fetchStudentsFromServer();
        if (StorageService.isGoogleSheetConnected()) {
          await StorageService.pullStudentsFromCloud();
          existingUsers = StorageService.getUsers();
        }
      } catch {
        existingUsers = StorageService.getUsers();
      }

      const existingWithSameUsername = existingUsers.find(
        u => u.username && u.username.toLowerCase() === cleanUsername
      );
      const existingWithSameNis = existingUsers.find(
        u => u.nis && u.nis.toLowerCase() === cleanNis.toLowerCase()
      );

      if (existingWithSameUsername && existingWithSameUsername.nis !== cleanNis) {
        setError(`Username "${cleanUsername}" sudah digunakan akun lain. Silakan pilih username lain.`);
        setIsSubmitting(false);
        return;
      }

      if (existingWithSameNis && existingWithSameNis.password && existingWithSameNis.password !== 'siswa123' && existingWithSameNis.username !== cleanUsername) {
        setError(`NIS "${cleanNis}" sudah terdaftar dengan username "${existingWithSameNis.username}". Silakan masuk menggunakan password Anda.`);
        setIsSubmitting(false);
        return;
      }

      const newUser: User = {
        id: existingWithSameNis?.id || `USR-SISWA-${Date.now()}`,
        username: cleanUsername,
        password: cleanPassword,
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

      // Await single atomic registration + Server & Google Spreadsheet sync BEFORE navigating
      const regRes = await StorageService.registerStudent(newUser);
      if (!regRes.isUnconfigured && !regRes.sheetSynced && regRes.message.toLowerCase().includes('anyone')) {
        setError(regRes.message);
        setIsSubmitting(false);
        return;
      }

      StorageService.setCurrentUser(regRes.user);
      try {
        confetti({ particleCount: 60, spread: 70, disableForReducedMotion: true });
      } catch {}
      onSuccess(regRes.user);
    } catch (err: any) {
      setError('Terjadi kendala saat menyimpan pendaftaran: ' + (err?.message || 'Silakan coba lagi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative text-slate-800 overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-blue-600 absolute top-0 left-0 right-0" />
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Registrasi Siswa PKL</h2>
            <p className="text-xs text-slate-600">Pendaftaran akun absensi mandiri siswa</p>
          </div>
        </div>
        <button
          onClick={onBackToLogin}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
      </div>

      {!isCloudReady && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            Agar data registrasi Anda langsung masuk ke Spreadsheet Administrator sekolah, pastikan Anda membuka tautan resmi dari grup WhatsApp PKL sekolah. Pendaftaran di sini tetap tersimpan aman dalam antrean sinkronisasi.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
              <span>Username Akun Siswa *</span>
              <span className="text-[10px] text-blue-600 font-semibold">Untuk Login</span>
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
              placeholder="Contoh: ahmad_rizki"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">NIS / NISN Siswa *</label>
            <input
              type="text"
              required
              value={formData.nis}
              onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
              placeholder="Contoh: 20240105"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap Siswa *</label>
            <input
              type="text"
              required
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Nama lengkap sesuai absen sekolah"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Kelas *</label>
            <select
              value={formData.kelas}
              onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
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
            <label className="block text-slate-700 font-semibold mb-1">Jenis Kelamin</label>
            <select
              value={formData.jenisKelamin}
              onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as any })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">No. WhatsApp / HP</label>
            <input
              type="tel"
              value={formData.noHp}
              onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Asal Sekolah</label>
            <input
              type="text"
              value={formData.asalSekolah}
              onChange={(e) => setFormData({ ...formData, asalSekolah: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Jurusan / Kompetensi Keahlian</label>
            <select
              value={formData.jurusan}
              onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="Teknik Kendaraan Ringan (TKR)">Teknik Kendaraan Ringan (TKR)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Tempat / Perusahaan PKL</label>
            <input
              type="text"
              value={formData.tempatPkl}
              onChange={(e) => setFormData({ ...formData, tempatPkl: e.target.value })}
              placeholder="Contoh: PT Auto2000 / Bengkel Jaya"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Nama Pembimbing / Mentor Sekolah *
            </label>
            <select
              required
              value={formData.namaPembimbing}
              onChange={(e) => setFormData({ ...formData, namaPembimbing: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              {PEMBIMBING_TKR_LIST.map((mentor) => (
                <option key={mentor} value={mentor}>
                  {mentor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Buat Password Baru *</label>
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
            disabled={isSubmitting}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition text-xs cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftarkan &amp; Menyinkronkan ke Spreadsheet...</span>
              </>
            ) : (
              <span>Daftarkan Akun &amp; Masuk Sekarang</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
