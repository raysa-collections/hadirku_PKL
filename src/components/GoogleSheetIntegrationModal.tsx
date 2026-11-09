import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { GOOGLE_APPS_SCRIPT_SOURCE } from '../services/googleAppsScriptCode';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Terminal, 
  UploadCloud, 
  HelpCircle,
  Sparkles,
  Link2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoogleSheetIntegrationModalProps {
  onClose: () => void;
}

export const GoogleSheetIntegrationModal: React.FC<GoogleSheetIntegrationModalProps> = ({ onClose }) => {
  const [config, setConfig] = useState(StorageService.getGoogleSheetConfig());
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl || '');
  const [copiedScript, setCopiedScript] = useState(false);
  const [testingStatus, setTestingStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SOURCE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
    confetti({ particleCount: 40, spread: 60 });
  };

  const handleSaveUrl = () => {
    const updated = {
      ...config,
      scriptUrl: scriptUrl.trim(),
      connected: !!scriptUrl.trim(),
    };
    StorageService.saveGoogleSheetConfig(updated);
    setConfig(updated);
    alert('URL Google Apps Script berhasil disimpan!');
  };

  const handleTestConnection = async () => {
    if (!scriptUrl.trim()) {
      alert('Harap masukkan URL Web App Google Apps Script terlebih dahulu.');
      return;
    }
    setTestingStatus({ loading: true });
    const res = await StorageService.testGoogleSheetConnection(scriptUrl.trim());
    setTestingStatus({ loading: false, success: res.success, message: res.message });
    if (res.success) {
      const updated = { ...config, scriptUrl: scriptUrl.trim(), connected: true, lastSync: new Date().toISOString() };
      StorageService.saveGoogleSheetConfig(updated);
      setConfig(updated);
      confetti({ particleCount: 50, spread: 70 });
    }
  };

  const handleSyncAllLocal = async () => {
    if (!scriptUrl.trim()) {
      alert('Masukkan dan simpan URL Google Apps Script terlebih dahulu.');
      return;
    }
    setSyncingAll(true);
    setSyncResult(null);

    const records = StorageService.getAttendance();
    let successCount = 0;

    for (const rec of records) {
      const action = rec.jamPulang && rec.jamPulang !== '-' ? 'CHECK_OUT' : 'CHECK_IN';
      const res = await StorageService.syncToGoogleSheet(action, rec);
      if (res.success) successCount++;
    }

    setSyncingAll(false);
    setSyncResult(`Berhasil mensinkronisasikan ${successCount} dari ${records.length} rekaman presensi ke Google Spreadsheet.`);
    confetti({ particleCount: 60, spread: 80 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-200 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Integrasi Database Google Spreadsheet & Apps Script
              </h2>
              <p className="text-xs text-slate-400">
                Penyimpanan real-time presensi datang dan pulang ke sheet milik Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between mb-5 ${
          config.connected && config.scriptUrl
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${config.connected && config.scriptUrl ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <p className="text-xs font-bold">
                {config.connected && config.scriptUrl
                  ? 'Status: Terhubung dengan Google Spreadsheet'
                  : 'Status: Belum Terhubung (Data disimpan di database lokal)'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {config.lastSync ? `Sinkronisasi terakhir: ${new Date(config.lastSync).toLocaleString('id-ID')}` : 'Hubungkan Google Apps Script untuk sinkronisasi otomatis'}
              </p>
            </div>
          </div>

          {config.connected && (
            <button
              onClick={handleSyncAllLocal}
              disabled={syncingAll}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {syncingAll ? 'Menyinkronkan...' : 'Kirim Semua Data'}
            </button>
          )}
        </div>

        {syncResult && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{syncResult}</span>
          </div>
        )}

        {/* Script URL Input & Test */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 mb-6">
          <label className="block text-xs font-bold text-white flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            URL Web App Google Apps Script
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveUrl}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Simpan
              </button>
              <button
                onClick={handleTestConnection}
                disabled={testingStatus?.loading}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {testingStatus?.loading ? 'Menguji...' : 'Tes Koneksi'}
              </button>
            </div>
          </div>

          {testingStatus && !testingStatus.loading && (
            <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              testingStatus.success
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}>
              {testingStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testingStatus.message}</span>
            </div>
          )}
        </div>

        {/* 5-Step Instructions */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            Panduan 5 Langkah Menghubungkan Google Spreadsheet:
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <p className="font-bold text-white">1. Buat Spreadsheet Baru di Google Drive</p>
              <p className="text-slate-400">Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a> dan beri nama sheet, misalnya <code>Data Absensi PKL SMKN 1</code>.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">2. Salin Kode Google Apps Script (Code.gs)</p>
                <button
                  onClick={handleCopyScript}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? 'Tersalin!' : 'Salin Kode Script'}
                </button>
              </div>
              <p className="text-slate-400">
                Di Google Spreadsheet Anda, klik menu <strong>Ekstensi &gt; Apps Script</strong>. Hapus isi file bawaan, lalu tempelkan (*paste*) seluruh kode script di bawah ini.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <p className="font-bold text-white">3. Terapkan sebagai Aplikasi Web (Deploy as Web App)</p>
              <p className="text-slate-400">
                Di layar Apps Script, klik tombol biru <strong>"Terapkan" (Deploy) &gt; "Penerapan baru" (New deployment)</strong>.
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-0.5 mt-1 pl-1">
                <li>Pilih jenis: <strong>Aplikasi Web</strong></li>
                <li>Jalankan sebagai: <strong>Saya (email Anda)</strong></li>
                <li>Siapa yang memiliki akses: <strong>Siapa saja (Anyone)</strong> *(wajib agar siswa dapat mengirim absen dari HP)*</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <p className="font-bold text-white">4. Salin URL Aplikasi Web & Simpan di Sini</p>
              <p className="text-slate-400">
                Salin tautan yang berawalan <code>https://script.google.com/macros/s/.../exec</code> lalu tempelkan pada kolom URL di atas, kemudian klik <strong>"Simpan"</strong> dan <strong>"Tes Koneksi"</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <p className="font-bold text-emerald-400">5. Selesai! Otomatis 12 Kolom Lengkap dengan Titik GPS</p>
              <p className="text-slate-400">
                Sheet akan otomatis membuat kolom: <code>ID, Tanggal, NIS/NISN, Nama Siswa, Asal Sekolah, Jurusan, Jam Datang, Jam Pulang, Status, Keterangan, Titik Koordinat GPS, Link Map HP</code>. Presensi pulang akan memperbarui kolom Jam Pulang dan GPS pada baris yang sama tanpa duplikasi data!
              </p>
            </div>
          </div>
        </div>

        {/* Script Code Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Pratinjau Kode Google Apps Script:</span>
            <button
              onClick={handleCopyScript}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Salin Kode Lengkap
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto">
            <pre className="whitespace-pre">{GOOGLE_APPS_SCRIPT_SOURCE}</pre>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
