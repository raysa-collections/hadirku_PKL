import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { KeyRound, ArrowLeft, PhoneCall, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onBackToLogin }) => {
  const [nisInput, setNisInput] = useState('');
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisInput.trim()) return;

    const users = StorageService.getUsers();
    const found = users.find(u => 
      u.nis.toLowerCase() === nisInput.trim().toLowerCase() || 
      u.username.toLowerCase() === nisInput.trim().toLowerCase() ||
      (u.nip && u.nip.toLowerCase() === nisInput.trim().toLowerCase())
    );

    if (found) {
      if (found.role === 'admin') {
        setResultMessage({
          type: 'success',
          text: `Akun Guru / Pembimbing terverifikasi atas nama ${found.nama} (${found.jabatan || 'Koordinator PKL'}). Silakan hubungi koordinator PKL jika Anda memerlukan bantuan akses.`,
        });
      } else {
        setResultMessage({
          type: 'success',
          text: `Akun ditemukan atas nama "${found.nama}" (${found.jurusan}). Kredensial default siswa adalah NIS: "${found.nis}" dengan password: "siswa123". Silakan coba masuk kembali.`,
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
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Bantuan Lupa Password</h2>
            <p className="text-xs text-slate-400">Pemulihan akses akun siswa & pembimbing</p>
          </div>
        </div>
        <button
          onClick={onBackToLogin}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <p className="text-slate-300 leading-relaxed">
          Masukkan Username atau NIS Anda untuk memeriksa status akun dan petunjuk pemulihan:
        </p>

        <form onSubmit={handleLookup} className="space-y-3">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Username Siswa / Guru atau NIS</label>
            <input
              type="text"
              required
              value={nisInput}
              onChange={(e) => setNisInput(e.target.value)}
              placeholder="Masukkan Username atau NIS..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl transition shadow-md"
          >
            Cek Kredensial Akun
          </button>
        </form>

        {resultMessage && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed ${
            resultMessage.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/50 border-red-500/40 text-red-300'
          }`}>
            {resultMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            )}
            <div>{resultMessage.text}</div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 mt-4">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <PhoneCall className="w-4 h-4 text-cyan-400" />
            <span>Kontak Layanan BKK / Hubin PKL:</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Jika masih terkendala, silakan hubungi koordinator pembimbing PKL sekolah di ruang Hubin SMKN 1 Tegalsari atau via WhatsApp di nomor:
          </p>
          <div className="font-mono text-cyan-400 font-bold bg-slate-900 px-2.5 py-1 rounded-lg inline-block">
            WA: 0812-3456-7890 (Layanan BKK & Hubin PKL)
          </div>
        </div>

        <button
          onClick={onBackToLogin}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition"
        >
          Kembali ke Halaman Login
        </button>
      </div>
    </div>
  );
};
