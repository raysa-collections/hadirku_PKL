import React, { useState } from 'react';
import { StorageService, formatIndonesianDate, getJakartaDate } from '../services/storage';
import { 
  CODE_GS_SOURCE, 
  INDEX_HTML_SOURCE, 
  PETUNJUK_PENGGUNAAN_TEXT 
} from '../services/googleAppsScriptCode';
import { 
  FileSpreadsheet, 
  Code, 
  FileCode, 
  BookOpen, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  UploadCloud, 
  DownloadCloud, 
  Wifi, 
  MapPin, 
  UserCheck, 
  Building2, 
  Clock, 
  ShieldCheck,
  Terminal,
  HelpCircle,
  Laptop,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VercelDeployModal } from './VercelDeployModal';

export const AdminGasIntegration: React.FC = () => {
  const [showVercelModal, setShowVercelModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'code' | 'index' | 'guide'>('sync');
  const [config, setConfig] = useState(() => StorageService.getGoogleSheetConfig());
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl || '');
  const [records, setRecords] = useState(() => StorageService.getAttendance());
  const [allStudents, setAllStudents] = useState(() => StorageService.getUsers().filter(u => u.role === 'siswa'));
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Copy state
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [copiedIndexHtml, setCopiedIndexHtml] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);

  // Connection testing state
  const [testingStatus, setTestingStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  React.useEffect(() => {
    StorageService.ensureConfigSynced().then((cfg) => {
      setConfig(cfg);
      if (!scriptUrl && cfg.scriptUrl) {
        setScriptUrl(cfg.scriptUrl);
      }
      Promise.all([
        StorageService.fetchAttendanceFromServer(),
        StorageService.fetchStudentsFromServer(),
      ]).then(() => {
        setRecords(StorageService.getAttendance());
        setAllStudents(StorageService.getUsers().filter(u => u.role === 'siswa'));
      });
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveUrl = () => {
    const cleanUrl = scriptUrl.trim();
    const updated = {
      ...config,
      scriptUrl: cleanUrl,
      connected: Boolean(cleanUrl && cleanUrl.startsWith('http')),
    };
    StorageService.saveGoogleSheetConfig(updated);
    setConfig(updated);
    showToast('URL Google Apps Script berhasil disimpan!');
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
      showToast('Koneksi ke Google Spreadsheet berhasil terhubung sempurna!');
    }
  };

  const handleSyncAllStudents = async () => {
    if (!scriptUrl.trim()) {
      alert('Harap masukkan dan simpan URL Google Apps Script terlebih dahulu.');
      return;
    }
    setSyncingAll(true);

    const students = StorageService.getUsers().filter(u => u.role === 'siswa');
    let successCount = 0;

    for (const student of students) {
      const res = await StorageService.syncStudentToGoogleSheet(student);
      if (res.success && res.sheetSynced !== false) successCount++;
    }

    setSyncingAll(false);
    setAllStudents(StorageService.getUsers().filter(u => u.role === 'siswa'));
    confetti({ particleCount: 60, spread: 80 });
    showToast(`Berhasil mensinkronkan ${successCount} dari ${students.length} data siswa PKL ke sheet Data_Siswa_TKR!`);
  };

  const handleSyncAllLocal = async () => {
    if (!scriptUrl.trim()) {
      alert('Harap masukkan dan simpan URL Google Apps Script terlebih dahulu.');
      return;
    }
    setSyncingAll(true);

    const currentRecords = StorageService.getAttendance();
    let successCount = 0;

    for (const rec of currentRecords) {
      const action = rec.jamPulang && rec.jamPulang !== '-' ? 'CHECK_OUT' : 'CHECK_IN';
      const res = await StorageService.syncToGoogleSheet(action, rec);
      if (res.success) successCount++;
    }

    setSyncingAll(false);
    setRecords(StorageService.getAttendance());
    confetti({ particleCount: 60, spread: 80 });
    showToast(`Berhasil mensinkronkan ${successCount} dari ${currentRecords.length} data presensi ke Google Spreadsheet!`);
  };

  const handleFetchFromSheet = async () => {
    if (!scriptUrl.trim()) {
      alert('Harap masukkan dan simpan URL Google Apps Script terlebih dahulu.');
      return;
    }
    setSyncingAll(true);
    try {
      const res = await StorageService.pullAttendanceFromCloud(scriptUrl.trim());
      if (res.success) {
        setRecords(StorageService.getAttendance());
        confetti({ particleCount: 50, spread: 70 });
        showToast(res.message);
      } else {
        alert(res.message || 'Gagal mengambil data dari Google Spreadsheet.');
      }
    } catch (err: any) {
      alert('Gagal terhubung ke Google Spreadsheet: ' + (err?.message || err.toString()));
    } finally {
      setSyncingAll(false);
    }
  };

  const handleFetchStudentsFromSheet = async () => {
    if (!scriptUrl.trim()) {
      alert('Harap masukkan dan simpan URL Google Apps Script terlebih dahulu.');
      return;
    }
    setSyncingAll(true);
    try {
      const res = await StorageService.pullStudentsFromCloud(scriptUrl.trim());
      if (res.success) {
        setAllStudents(StorageService.getUsers().filter(u => u.role === 'siswa'));
        confetti({ particleCount: 50, spread: 70 });
        showToast(res.message);
      } else {
        alert(res.message || 'Gagal mengambil data siswa dari Google Spreadsheet.');
      }
    } catch (err: any) {
      alert('Gagal terhubung ke Google Spreadsheet: ' + (err?.message || err.toString()));
    } finally {
      setSyncingAll(false);
    }
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`File ${fileName} berhasil diunduh!`);
  };

  const copyToClipboard = (text: string, type: 'gs' | 'html' | 'guide') => {
    navigator.clipboard.writeText(text);
    if (type === 'gs') {
      setCopiedCodeGs(true);
      setTimeout(() => setCopiedCodeGs(false), 3000);
    } else if (type === 'html') {
      setCopiedIndexHtml(true);
      setTimeout(() => setCopiedIndexHtml(false), 3000);
    } else {
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 3000);
    }
    confetti({ particleCount: 30, spread: 50 });
    showToast('Kode berhasil disalin ke clipboard!');
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Integrasi Database & Google Apps Script
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border ${
              config.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <Wifi className="w-3 h-3" />
              <span>{config.connected ? 'Spreadsheet Terhubung Realtime' : 'Spreadsheet Belum Terhubung'}</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sinkronisasi Jendela Siswa PKL & Code.gs Google Spreadsheet
          </h2>

          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Halaman ini menghubungkan tampilan monitoring Administrator PKL TKR secara langsung dengan jendela presensi siswa PKL. Semua data tersimpan aman di Google Spreadsheet dan diterbitkan via Google Apps Script Web App.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleFetchFromSheet}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Tarik seluruh data absensi terkini dari sheet Data_Absensi_PKL"
          >
            <DownloadCloud className={`w-4 h-4 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>Tarik Presensi dari Sheet</span>
          </button>

          <button
            onClick={handleSyncAllStudents}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Kirim seluruh data registrasi siswa ke sheet Data_Siswa_TKR"
          >
            <UploadCloud className={`w-4 h-4 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>Push Siswa ke Sheet</span>
          </button>

          <button
            onClick={handleSyncAllLocal}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Kirim seluruh data absensi ke sheet Data_Absensi_PKL"
          >
            <UploadCloud className={`w-4 h-4 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>Push Presensi ke Sheet</span>
          </button>

          <button
            onClick={handleFetchStudentsFromSheet}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Tarik data siswa dari sheet Data_Siswa_TKR"
          >
            <DownloadCloud className="w-4 h-4 text-emerald-600" />
            <span>Tarik Siswa</span>
          </button>

          <button
            onClick={() => setShowVercelModal(true)}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Panduan & konfigurasi vercel.json untuk deployment online vercel.app"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Onlinekan Vercel.app</span>
          </button>
        </div>
      </div>

      {/* URL Config Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">URL Web App Google Apps Script</h3>
          </div>
          <span className="text-[11px] text-slate-600 font-mono">
            {config.lastSync ? `Terakhir Sync: ${formatIndonesianDate(config.lastSync.slice(0, 10))}` : 'Belum Pernah Sync'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="url"
            value={scriptUrl}
            onChange={(e) => setScriptUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className="flex-1 w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
          <button
            onClick={handleSaveUrl}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
          >
            Simpan URL
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testingStatus?.loading}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${testingStatus?.loading ? 'animate-spin' : ''}`} />
            <span>Tes Koneksi</span>
          </button>
        </div>

        {testingStatus?.message && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
            testingStatus.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {testingStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{testingStatus.message}</span>
          </div>
        )}

        {/* MULTI-USER CLOUD SHARING CARD */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Bagikan ke Siswa (Solusi Multi-User Banyak HP & Vercel)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Auto Connect
            </span>
          </div>

          <p className="text-[11px] text-slate-700 leading-relaxed">
            Sistem kini dilengkapi <strong>Server API Multi-Perangkat</strong>. Seluruh presensi yang dilakukan siswa dari berbagai HP berbeda akan <strong>otomatis ditangkap oleh Server Aplikasi</strong>, tersimpan secara terpusat, dan diteruskan langsung ke Google Spreadsheet sekolah Anda!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* OPSI 1: LINK WHATSAPP AUTO CONNECT */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-emerald-700 block text-xs">1. Sinkronisasi Otomatis Server & Link WhatsApp</span>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Saat Anda menyimpan URL di sini, server aplikasi otomatis menyimpannya untuk semua HP. Siswa dapat langsung membuka aplikasi atau melalui link WhatsApp di bawah ini:
                </p>
              </div>

              <button
                onClick={() => {
                  const shareUrl = StorageService.getStudentShareUrl();
                  const msg = `*PEMBERITAHUAN PRESENSI SISWA PKL SMKN 1 TEGALSARI*\nHalo seluruh siswa PKL, silakan catat absensi harian PKL melalui link resmi berikut:\n${shareUrl}\n\n*Catatan:* Link ini sudah otomatis terhubung ke sistem Google Spreadsheet sekolah. Pastikan izinkan Kamera & Lokasi GPS saat presensi.`;
                  navigator.clipboard.writeText(msg);
                  confetti({ particleCount: 30, spread: 50 });
                  showToast('Pesan & Link WhatsApp siap absen berhasil disalin!');
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm mt-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Pesan & Link WhatsApp</span>
              </button>
            </div>

            {/* OPSI 2: VERCEL ENVIRONMENT VARIABLE */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-blue-700 block text-xs">Cara 2: Pasang di Vercel Environment Variables (Permanen)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {(import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ? 'Env Terpasang' : 'Env Belum Diset'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Pasang variabel <code className="text-slate-900 font-mono font-bold bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">VITE_GOOGLE_APPS_SCRIPT_URL</code> (dan opsional <code className="text-slate-900 font-mono font-bold bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">GOOGLE_APPS_SCRIPT_URL</code>) di Vercel agar semua HP siswa otomatis tersambung permanen meski Server Vercel sedang cold start.
                </p>
              </div>

              <button
                onClick={() => {
                  const currentUrl = scriptUrl.trim();
                  if (!currentUrl) {
                    alert('Harap isi URL Google Apps Script terlebih dahulu di atas.');
                    return;
                  }
                  navigator.clipboard.writeText(currentUrl);
                  confetti({ particleCount: 30, spread: 50 });
                  showToast('URL Google Apps Script disalin! Tempelkan di Vercel -> Settings -> Environment Variables');
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition cursor-pointer mt-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin URL untuk Vercel Env</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'sync'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Laptop className={`w-4 h-4 ${activeTab === 'sync' ? 'text-white' : 'text-blue-600'}`} />
          <span>Monitoring Realtime (Sinkron Jendela Siswa)</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'sync' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
          }`}>
            {records.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'code'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Code className={`w-4 h-4 ${activeTab === 'code' ? 'text-white' : 'text-emerald-600'}`} />
          <span>Source Code Code.gs</span>
        </button>

        <button
          onClick={() => setActiveTab('index')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'index'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCode className={`w-4 h-4 ${activeTab === 'index' ? 'text-white' : 'text-red-600'}`} />
          <span>Source Code index.html</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${activeTab === 'guide' ? 'text-white' : 'text-amber-600'}`} />
          <span>Petunjuk Penggunaan & Setup</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MONITORING SINKRONISASI JENDELA SISWA PKL REALTIME
          ========================================================================= */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-blue-900 font-medium">
                Menampilkan data presensi harian siswa PKL TKR SMKN 1 Tegalsari yang tersambung langsung dengan Google Spreadsheet.
              </span>
            </div>
            <span className="text-blue-700 font-mono font-bold hidden sm:inline">
              Total {records.length} Record Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3.5 font-bold">Tanggal</th>
                  <th className="p-3.5 font-bold">Siswa & NIS</th>
                  <th className="p-3.5 font-bold">Pengelola / Unit PKL</th>
                  <th className="p-3.5 font-bold">Tempat PKL / Bengkel</th>
                  <th className="p-3.5 font-bold text-center">Jam Datang</th>
                  <th className="p-3.5 font-bold text-center">Jam Pulang</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                  <th className="p-3.5 font-bold text-center">Status Spreadsheet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Belum ada data presensi siswa PKL. Data akan otomatis muncul saat siswa melakukan presensi.
                    </td>
                  </tr>
                ) : (
                  records.slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal)).map((r) => {
                    const studentObj = allStudents.find(s => s.nis === r.nis);
                    return (
                      <tr key={r.id} className="hover:bg-blue-50/40 transition">
                        <td className="p-3.5 whitespace-nowrap font-mono font-semibold text-blue-700">
                          {r.tanggal}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{r.namaSiswa}</p>
                          <span className="font-mono text-[10px] text-blue-600 font-semibold">{r.nis}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{(r as any).namaPembimbing || studentObj?.namaPembimbing || 'Administrator PKL TKR'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-emerald-700 font-semibold">
                          {r.tempatPkl}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {r.jamDatang} WIB
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-blue-700 whitespace-nowrap">
                          {r.jamPulang || '-'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            r.status === 'Hadir'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.status === 'Terlambat'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.syncStatus === 'synced'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            <CheckCircle2 className={`w-3 h-3 ${r.syncStatus === 'synced' ? 'text-emerald-600' : 'text-slate-500'}`} />
                            <span>{r.syncStatus === 'synced' ? 'Tersimpan di Sheet' : 'Local'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SOURCE CODE CODE.GS
          ========================================================================= */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900">File: Code.gs (Google Apps Script API & Database Auto-Setup)</h3>
              </div>
              <p className="text-slate-600">
                Skrip ini bertindak sebagai API serverless dan secara otomatis membuat sheet <strong className="text-emerald-700">Data_Absensi_PKL</strong>, <strong className="text-emerald-700">Data_Siswa_TKR</strong>, dan <strong className="text-emerald-700">Konfigurasi_Sistem</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(CODE_GS_SOURCE, 'gs')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {copiedCodeGs ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCodeGs ? 'Tersalin!' : 'Salin Code.gs'}</span>
              </button>

              <button
                onClick={() => downloadFile(CODE_GS_SOURCE, 'Code.gs', 'text/javascript')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Unduh .gs</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-300 bg-slate-100 p-4 font-mono text-xs text-slate-900 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
            <pre>{CODE_GS_SOURCE}</pre>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SOURCE CODE INDEX.HTML
          ========================================================================= */}
      {activeTab === 'index' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-slate-900">File: index.html (Standalone Web Application Template)</h3>
              </div>
              <p className="text-slate-600">
                Template antarmuka HTML standalone untuk dipublikasikan pada Google Apps Script Web App.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(INDEX_HTML_SOURCE, 'html')}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {copiedIndexHtml ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copiedIndexHtml ? 'Tersalin!' : 'Salin index.html'}</span>
              </button>

              <button
                onClick={() => downloadFile(INDEX_HTML_SOURCE, 'index.html', 'text/html')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Unduh .html</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-300 bg-slate-100 p-4 font-mono text-xs text-slate-900 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
            <pre>{INDEX_HTML_SOURCE}</pre>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PETUNJUK PENGGUNAAN & DEPLOYMENT
          ========================================================================= */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900">Panduan Lengkap Deployment & Setup Google Apps Script</h3>
              </div>
              <p className="text-slate-600">
                Ikuti langkah mudah di bawah ini untuk mengaktifkan sinkronisasi otomatis Google Spreadsheet.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(PETUNJUK_PENGGUNAAN_TEXT, 'guide')}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {copiedGuide ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedGuide ? 'Tersalin!' : 'Salin Petunjuk'}</span>
              </button>

              <button
                onClick={() => downloadFile(PETUNJUK_PENGGUNAAN_TEXT, 'Petunjuk_Penggunaan.txt', 'text/plain')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Unduh Petunjuk.txt</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-mono">1</span>
                <span>Buat Spreadsheet & Apps Script</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">Google Sheets</a>, buat spreadsheet baru, lalu buka menu <strong>Ekstensi &gt; Apps Script</strong>. Salin kode <code className="text-emerald-700 bg-emerald-50 px-1 rounded font-mono font-bold">Code.gs</code> dan tempelkan.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-mono">2</span>
                <span>Buat File index.html</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Di Apps Script Editor, klik ikon <strong>+ &gt; HTML</strong>, beri nama file <code className="text-red-600 bg-red-50 px-1 rounded font-mono font-bold">index</code>, lalu salin dan tempelkan kode dari tab <code className="text-red-600 bg-red-50 px-1 rounded font-mono font-bold">index.html</code>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <span className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-mono">3</span>
                <span>Jalankan setupDatabase()</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Pilih fungsi <code className="text-amber-800 bg-amber-50 px-1 rounded font-mono font-bold">setupDatabase</code> di Apps Script Editor lalu klik <strong>Jalankan</strong>. Izinkan akses otorisasi Google. Sheet absensi, siswa, dan konfigurasi akan dibuat otomatis!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-red-700 font-bold">
                <span className="w-6 h-6 rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center justify-center font-mono">4</span>
                <span>Deploy as Web App (Siapa Saja)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Klik tombol <strong>Terapkan &gt; Aplikasi Web Baru</strong>. Atur <em>Execute as</em> = <strong>Me</strong> dan <em>Who has access</em> = <strong>Anyone (Siapa Saja)</strong>. Salin URL Web App dan simpan di aplikasi ini!
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-300 bg-slate-100 p-4 font-mono text-xs text-slate-900 overflow-x-auto max-h-[350px] overflow-y-auto leading-relaxed">
            <pre>{PETUNJUK_PENGGUNAAN_TEXT}</pre>
          </div>
        </div>
      )}

      {/* Vercel Deployment Modal */}
      {showVercelModal && (
        <VercelDeployModal onClose={() => setShowVercelModal(false)} />
      )}

    </div>
  );
};
