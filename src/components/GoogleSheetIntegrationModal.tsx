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
    const cleanUrl = scriptUrl.trim();
    const updated = {
      ...config,
      scriptUrl: cleanUrl,
      connected: cleanUrl.startsWith('http'),
    };
    StorageService.saveGoogleSheetConfig(updated);
    setConfig(updated);
    setTestingStatus({
      loading: false,
      success: cleanUrl.startsWith('http'),
      message: cleanUrl.startsWith('http')
        ? 'URL Google Apps Script berhasil disimpan & disinkronkan ke server.'
        : 'URL dikosongkan. Koneksi Google Spreadsheet dinonaktifkan.'
    });
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
      if (res.sheetSynced) {
        rec.syncStatus = 'synced';
        rec.syncedAt = new Date().toISOString();
        StorageService.addOrUpdateAttendance(rec);
        successCount++;
      }
    }

    setSyncingAll(false);
    setSyncResult(`Berhasil mensinkronisasikan ${successCount} dari ${records.length} rekaman presensi ke Google Spreadsheet.`);
    confetti({ particleCount: 60, spread: 80 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-900 my-8 max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Integrasi Database Google Spreadsheet & Apps Script
              </h2>
              <p className="text-xs text-slate-600">
                Penyimpanan real-time presensi datang dan pulang ke sheet milik Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between mb-5 ${
          config.connected && config.scriptUrl
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${config.connected && config.scriptUrl ? 'bg-emerald-600' : 'bg-amber-500'}`} />
            <div>
              <p className="text-xs font-bold">
                {config.connected && config.scriptUrl
                  ? 'Status: Terhubung dengan Google Spreadsheet'
                  : 'Status: Belum Terhubung (Data disimpan di database lokal)'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {config.lastSync ? `Sinkronisasi terakhir: ${new Date(config.lastSync).toLocaleString('id-ID')}` : 'Hubungkan Google Apps Script untuk sinkronisasi otomatis'}
              </p>
            </div>
          </div>

          {config.connected && (
            <button
              onClick={handleSyncAllLocal}
              disabled={syncingAll}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {syncingAll ? 'Menyinkronkan...' : 'Kirim Semua Data'}
            </button>
          )}
        </div>

        {syncResult && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{syncResult}</span>
          </div>
        )}

        {/* Script URL Input & Test */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mb-6">
          <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            URL Web App Google Apps Script
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveUrl}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Simpan
              </button>
              <button
                onClick={handleTestConnection}
                disabled={testingStatus?.loading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {testingStatus?.loading ? 'Menguji...' : 'Tes Koneksi'}
              </button>
            </div>
          </div>

          {testingStatus && !testingStatus.loading && (
            <div className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              testingStatus.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {testingStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{testingStatus.message}</span>
            </div>
          )}
        </div>

        {/* 5-Step Instructions */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            Panduan 5 Langkah Menghubungkan Google Spreadsheet:
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">1. Buat Spreadsheet Baru di Google Drive</p>
              <p className="text-slate-600">Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a> dan beri nama sheet, misalnya <code className="bg-white border border-slate-200 px-1 rounded text-slate-800">Data Absensi PKL SMKN 1</code>.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">2. Salin Kode Google Apps Script (Code.gs)</p>
                <button
                  onClick={handleCopyScript}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? 'Tersalin!' : 'Salin Kode Script'}
                </button>
              </div>
              <p className="text-slate-600">
                Di Google Spreadsheet Anda, klik menu <strong>Ekstensi &gt; Apps Script</strong>. Hapus isi file bawaan, lalu tempelkan (<em>paste</em>) seluruh kode script di bawah ini.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">3. Terapkan sebagai Aplikasi Web (Deploy as Web App)</p>
              <p className="text-slate-600">
                Di layar Apps Script, klik tombol biru <strong>"Terapkan" (Deploy) &gt; "Penerapan baru" (New deployment)</strong>.
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5 mt-1 pl-1">
                <li>Pilih jenis: <strong>Aplikasi Web</strong></li>
                <li>Jalankan sebagai: <strong>Saya (email Anda)</strong></li>
                <li>Siapa yang memiliki akses: <strong>Siapa saja (Anyone)</strong> *(wajib agar siswa dapat mengirim absen dari HP)*</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">4. Salin URL Aplikasi Web & Simpan di Sini</p>
              <p className="text-slate-600">
                Salin tautan yang berawalan <code className="bg-white border border-slate-200 px-1 rounded text-slate-800">https://script.google.com/macros/s/.../exec</code> lalu tempelkan pada kolom URL di atas, kemudian klik <strong>"Simpan"</strong> dan <strong>"Tes Koneksi"</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <p className="font-bold text-emerald-800">5. Selesai! Otomatis 12 Kolom Lengkap dengan Titik GPS</p>
              <p className="text-emerald-700">
                Sheet akan otomatis membuat kolom: <code className="bg-white border border-emerald-200 px-1 rounded text-emerald-900">ID, Tanggal, NIS/NISN, Nama Siswa, Asal Sekolah, Jurusan, Jam Datang, Jam Pulang, Status, Keterangan, Titik Koordinat GPS, Link Map HP</code>. Presensi pulang akan memperbarui kolom Jam Pulang dan GPS pada baris yang sama tanpa duplikasi data!
              </p>
            </div>
          </div>
        </div>

        {/* Script Code Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Pratinjau Kode Google Apps Script:</span>
            <button
              onClick={handleCopyScript}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" /> Salin Kode Lengkap
            </button>
          </div>
          <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 font-mono text-[11px] text-slate-900 max-h-48 overflow-y-auto">
            <pre className="whitespace-pre">{GOOGLE_APPS_SCRIPT_SOURCE}</pre>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
