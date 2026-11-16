import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { KeyRound, ArrowLeft, PhoneCall, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onBackToLogin }) => {
  const [nisInput, setNisInput] = useState('');
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisInput.trim() || isLookingUp) return;

    const cleanTarget = nisInput.trim().toLowerCase();
    const matchFn = (u: any) =>
      (u.nis && u.nis.toLowerCase() === cleanTarget) ||
      (u.username && u.username.toLowerCase() === cleanTarget) ||
      (u.nip && u.nip.toLowerCase() === cleanTarget);

    let users = StorageService.getUsers();
    let found = users.find(matchFn);

    if (!found) {
      setIsLookingUp(true);
      try {
        await StorageService.ensureConfigSynced();
        await StorageService.fetchStudentsFromServer();
        if (StorageService.isGoogleSheetConnected()) {
          await StorageService.pullStudentsFromCloud();
        }
        users = StorageService.getUsers();
        found = users.find(matchFn);
      } catch {
      } finally {
        setIsLookingUp(false);
      }
    }

    if (found) {
      if (found.role === 'admin') {
        setResultMessage({
          type: 'success',
          text: `Akun Guru / Pembimbing terverifikasi atas nama ${found.nama} (${found.jabatan || 'Koordinator PKL'}). Silakan hubungi koordinator PKL jika Anda memerlukan bantuan akses.`,
        });
      } else {
        setResultMessage({
          type: 'success',
          text: `Akun ditemukan atas nama "${found.nama}" (${found.jurusan}) dengan Username: "${found.username}" dan NIS: "${found.nis}". Jika lupa password pribadi, hubungi Administrator PKL untuk reset.`,
        });
      }
    } else {
      setResultMessage({
        type: 'error',
        text: `Data dengan NIS/NIP/Username "${nisInput}" tidak ditemukan dalam database. Silakan periksa kembali atau hubungi koordinator PKL.`,
      });
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative text-slate-800 overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-red-600 to-blue-600 absolute top-0 left-0 right-0" />
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Bantuan Lupa Password</h2>
            <p className="text-xs text-slate-600">Pemulihan akses akun siswa & pembimbing</p>
          </div>
        </div>
        <button
          onClick={onBackToLogin}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <p className="text-slate-600 leading-relaxed">
          Masukkan Username atau NIS Anda untuk memeriksa status akun dan petunjuk pemulihan:
        </p>

        <form onSubmit={handleLookup} className="space-y-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Username Siswa / Guru atau NIS</label>
            <input
              type="text"
              required
              value={nisInput}
              onChange={(e) => setNisInput(e.target.value)}
              placeholder="Masukkan Username atau NIS..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-md shadow-amber-500/20 cursor-pointer"
          >
            Cek Kredensial Akun
          </button>
        </form>

        {resultMessage && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed font-medium ${
            resultMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {resultMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <div>{resultMessage.text}</div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 mt-4">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <span>Kontak Layanan BKK / Hubin PKL:</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Jika masih terkendala, silakan hubungi koordinator pembimbing PKL sekolah di ruang Hubin SMKN 1 Tegalsari atau via WhatsApp di nomor:
          </p>
          <div className="font-mono text-blue-800 font-bold bg-white border border-blue-200 px-2.5 py-1 rounded-lg inline-block">
            WA: 0812-3456-7890 (Layanan BKK & Hubin PKL)
          </div>
        </div>

        <button
          onClick={onBackToLogin}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Kembali ke Halaman Login
        </button>
      </div>
    </div>
  );
};
