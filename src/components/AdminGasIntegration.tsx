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
  const [config, setConfig] = useState(StorageService.getGoogleSheetConfig());
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl || '');
  const [records, setRecords] = useState(StorageService.getAttendance());
  const [allStudents] = useState(StorageService.getUsers().filter(u => u.role === 'siswa'));
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Copy state
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);
  const [copiedIndexHtml, setCopiedIndexHtml] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);

  // Connection testing state
  const [testingStatus, setTestingStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveUrl = () => {
    const updated = {
      ...config,
      scriptUrl: scriptUrl.trim(),
      connected: !!scriptUrl.trim(),
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
      if (res.success) successCount++;
    }

    setSyncingAll(false);
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
      const response = await fetch(`${scriptUrl.trim()}?action=GET_ALL`);
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        let pullCount = 0;
        data.data.forEach((item: any) => {
          if (item.nis && item.tanggal) {
            StorageService.addOrUpdateAttendance({
              id: item.id || `ABS-${item.tanggal}-${item.nis}`,
              tanggal: item.tanggal,
              nis: item.nis,
              namaSiswa: item.namaSiswa || 'Siswa PKL',
              asalSekolah: item.asalSekolah || 'SMKN 1 Tegalsari',
              jurusan: item.jurusan || 'Teknik Kendaraan Ringan (TKR)',
              jamDatang: item.jamDatang || '07:00:00',
              jamPulang: item.jamPulang || '-',
              status: item.status || 'Hadir',
              keterangan: item.keterangan || '-',
              tempatPkl: item.tempatPkl || 'Bengkel Mitra TKR',
              koordinatGps: item.koordinatGps || '-',
              mapsUrl: item.mapsUrl || '-',
              syncStatus: 'synced',
              syncedAt: new Date().toISOString(),
            });
            pullCount++;
          }
        });
        setRecords(StorageService.getAttendance());
        confetti({ particleCount: 50, spread: 70 });
        showToast(`Berhasil menarik ${pullCount} data presensi terkini dari Google Spreadsheet!`);
      } else {
        alert(data.message || 'Gagal mengambil data dari Google Spreadsheet.');
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
      const response = await fetch(`${scriptUrl.trim()}?action=GET_STUDENTS`);
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        let pullCount = 0;
        const newStudents = data.data.map((st: any) => ({
          id: `USR-SISWA-${st.nis}`,
          username: st.username || st.nis,
          password: 'siswa123',
          role: 'siswa' as const,
          nama: st.nama,
          nis: st.nis,
          kelas: st.kelas || 'XII TKR 1',
          jenisKelamin: st.jenisKelamin || 'Laki-laki',
          asalSekolah: st.asalSekolah || 'SMKN 1 Tegalsari',
          jurusan: st.jurusan || 'Teknik Kendaraan Ringan (TKR)',
          noHp: st.noHp || '-',
          tempatPkl: st.tempatPkl || 'Bengkel Mitra',
          namaPembimbing: st.namaPembimbing || 'Achmad Mackrus, S.T.',
          createdAt: st.createdAt || new Date().toISOString().slice(0, 10),
        }));
        
        const res = StorageService.addUsersBulk(newStudents);
        pullCount = res.addedCount + res.updatedCount;
        confetti({ particleCount: 50, spread: 70 });
        showToast(`Berhasil menarik ${pullCount} data siswa TKR dari sheet Data_Siswa_TKR!`);
      } else {
        alert(data.message || 'Gagal mengambil data siswa dari Google Spreadsheet.');
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
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
              Integrasi Database & Google Apps Script
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border ${
              config.connected
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <Wifi className="w-3 h-3" />
              <span>{config.connected ? 'Spreadsheet Terhubung Realtime' : 'Spreadsheet Belum Terhubung'}</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Sinkronisasi Jendela Siswa PKL & Code.gs Google Spreadsheet
          </h2>

          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Halaman ini menghubungkan tampilan monitoring pembimbing secara langsung dengan jendela presensi siswa PKL. Semua data tersimpan aman di Google Spreadsheet dan diterbitkan via Google Apps Script Web App.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleFetchFromSheet}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition cursor-pointer disabled:opacity-50"
            title="Tarik seluruh data absensi terkini dari sheet Data_Absensi_PKL"
          >
            <DownloadCloud className={`w-4 h-4 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>Tarik Presensi dari Sheet</span>
          </button>

          <button
            onClick={handleSyncAllStudents}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition cursor-pointer disabled:opacity-50"
            title="Kirim seluruh data registrasi siswa ke sheet Data_Siswa_TKR"
          >
            <UploadCloud className={`w-4 h-4 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>Push Siswa ke Sheet</span>
          </button>

          <button
            onClick={handleSyncAllLocal}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50"
            title="Kirim seluruh data absensi ke sheet Data_Absensi_PKL"
          >
            <UploadCloud className={`w-4 h-4 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>Push Presensi ke Sheet</span>
          </button>

          <button
            onClick={handleFetchStudentsFromSheet}
            disabled={syncingAll}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Tarik data siswa dari sheet Data_Siswa_TKR"
          >
            <DownloadCloud className="w-4 h-4 text-emerald-400" />
            <span>Tarik Siswa</span>
          </button>

          <button
            onClick={() => setShowVercelModal(true)}
            className="px-3.5 py-2.5 bg-gradient-to-r from-black via-slate-800 to-slate-950 hover:from-slate-900 hover:to-black text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-950/30"
            title="Panduan & konfigurasi vercel.json untuk deployment online vercel.app"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Onlinekan Vercel.app</span>
          </button>
        </div>
      </div>

      {/* URL Config Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">URL Web App Google Apps Script</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {config.lastSync ? `Terakhir Sync: ${formatIndonesianDate(config.lastSync.slice(0, 10))}` : 'Belum Pernah Sync'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="url"
            value={scriptUrl}
            onChange={(e) => setScriptUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
            className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSaveUrl}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Simpan URL
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testingStatus?.loading}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${testingStatus?.loading ? 'animate-spin' : ''}`} />
            <span>Tes Koneksi</span>
          </button>
        </div>

        {testingStatus?.message && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            testingStatus.success
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}>
            {testingStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testingStatus.message}</span>
          </div>
        )}

        {/* MULTI-USER CLOUD SHARING CARD */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Bagikan ke Siswa (Solusi Multi-User Banyak HP & Vercel)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Auto Connect
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Agar hasil presensi seluruh siswa di HP masing-masing <strong>langsung terdata di aplikasi dan masuk ke Google Spreadsheet sekolah Anda</strong>, gunakan salah satu cara berikut:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* OPSI 1: LINK WHATSAPP AUTO CONNECT */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-emerald-400 block text-xs">Cara 1: Kirim Tautan Otomatis ke Grup WA Siswa</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Tautan ini berisi kode penyambung otomatis. Ketika siswa membukanya di HP mereka, HP mereka akan langsung terhubung ke Google Spreadsheet Anda tanpa perlu setting apa pun.
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
                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md mt-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Pesan & Link WhatsApp</span>
              </button>
            </div>

            {/* OPSI 2: VERCEL ENVIRONMENT VARIABLE */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-cyan-400 block text-xs">Cara 2: Pasang di Vercel Environment Variables (Permanen)</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Pasang variabel <code className="text-white font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">VITE_GOOGLE_APPS_SCRIPT_URL</code> di Vercel. SEMUA pengunjung domain vercel.app Anda akan langsung terhubung tanpa parameter apa pun!
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
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer mt-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin URL untuk Vercel Env</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'sync'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4 text-cyan-400" />
          <span>Monitoring Realtime (Sinkron Jendela Siswa)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
            {records.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'code'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Code className="w-4 h-4 text-emerald-400" />
          <span>Source Code Code.gs</span>
        </button>

        <button
          onClick={() => setActiveTab('index')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'index'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4 text-purple-400" />
          <span>Source Code index.html</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Petunjuk Penggunaan & Setup</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MONITORING SINKRONISASI JENDELA SISWA PKL REALTIME
          ========================================================================= */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-200">
                Menampilkan data presensi harian siswa PKL TKR SMKN 1 Tegalsari yang tersambung langsung dengan Google Spreadsheet.
              </span>
            </div>
            <span className="text-slate-400 font-mono hidden sm:inline">
              Total {records.length} Record Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                  <th className="p-3.5 font-semibold">Tanggal</th>
                  <th className="p-3.5 font-semibold">Siswa & NIS</th>
                  <th className="p-3.5 font-semibold">Guru Pembimbing Sekolah</th>
                  <th className="p-3.5 font-semibold">Tempat PKL / Bengkel</th>
                  <th className="p-3.5 font-semibold text-center">Jam Datang</th>
                  <th className="p-3.5 font-semibold text-center">Jam Pulang</th>
                  <th className="p-3.5 font-semibold text-center">Status</th>
                  <th className="p-3.5 font-semibold text-center">Status Spreadsheet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
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
                      <tr key={r.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 whitespace-nowrap font-mono text-cyan-300">
                          {r.tanggal}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-white">{r.namaSiswa}</p>
                          <span className="font-mono text-[10px] text-cyan-400 font-semibold">{r.nis}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{(r as any).namaPembimbing || studentObj?.namaPembimbing || '-'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-emerald-300 font-medium">
                          {r.tempatPkl}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {r.jamDatang} WIB
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-cyan-400 whitespace-nowrap">
                          {r.jamPulang || '-'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            r.status === 'Hadir'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : r.status === 'Terlambat'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            r.syncStatus === 'synced'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white">File: Code.gs (Google Apps Script API & Database Auto-Setup)</h3>
              </div>
              <p className="text-slate-400">
                Skrip ini bertindak sebagai API serverless dan secara otomatis membuat sheet <strong className="text-emerald-300">Data_Absensi_PKL</strong>, <strong className="text-emerald-300">Data_Siswa_TKR</strong>, dan <strong className="text-emerald-300">Konfigurasi_Sistem</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(CODE_GS_SOURCE, 'gs')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedCodeGs ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCodeGs ? 'Tersalin!' : 'Salin Code.gs'}</span>
              </button>

              <button
                onClick={() => downloadFile(CODE_GS_SOURCE, 'Code.gs', 'text/javascript')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Unduh .gs</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
            <pre>{CODE_GS_SOURCE}</pre>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SOURCE CODE INDEX.HTML
          ========================================================================= */}
      {activeTab === 'index' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white">File: index.html (Standalone Web Application Template)</h3>
              </div>
              <p className="text-slate-400">
                Template antarmuka HTML standalone untuk dipublikasikan pada Google Apps Script Web App.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(INDEX_HTML_SOURCE, 'html')}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedIndexHtml ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedIndexHtml ? 'Tersalin!' : 'Salin index.html'}</span>
              </button>

              <button
                onClick={() => downloadFile(INDEX_HTML_SOURCE, 'index.html', 'text/html')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Unduh .html</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
            <pre>{INDEX_HTML_SOURCE}</pre>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PETUNJUK PENGGUNAAN & DEPLOYMENT
          ========================================================================= */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white">Panduan Lengkap Deployment & Setup Google Apps Script</h3>
              </div>
              <p className="text-slate-400">
                Ikuti langkah mudah di bawah ini untuk mengaktifkan sinkronisasi otomatis Google Spreadsheet.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(PETUNJUK_PENGGUNAAN_TEXT, 'guide')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedGuide ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedGuide ? 'Tersalin!' : 'Salin Petunjuk'}</span>
              </button>

              <button
                onClick={() => downloadFile(PETUNJUK_PENGGUNAAN_TEXT, 'Petunjuk_Penggunaan.txt', 'text/plain')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Unduh Petunjuk.txt</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono">1</span>
                <span>Buat Spreadsheet & Apps Script</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Google Sheets</a>, buat spreadsheet baru, lalu buka menu <strong>Ekstensi &gt; Apps Script</strong>. Salin kode <code className="text-emerald-300 font-mono">Code.gs</code> dan tempelkan.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono">2</span>
                <span>Buat File index.html</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Di Apps Script Editor, klik ikon <strong>+ &gt; HTML</strong>, beri nama file <code className="text-purple-300 font-mono">index</code>, lalu salin dan tempelkan kode dari tab <code className="text-purple-300 font-mono">index.html</code>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono">3</span>
                <span>Jalankan setupDatabase()</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Pilih fungsi <code className="text-amber-300 font-mono">setupDatabase</code> di Apps Script Editor lalu klik <strong>Jalankan</strong>. Izinkan akses otorisasi Google. Sheet absensi, siswa, dan konfigurasi akan dibuat otomatis!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono">4</span>
                <span>Deploy as Web App (Siapa Saja)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Klik tombol <strong>Terapkan &gt; Aplikasi Web Baru</strong>. Atur <em>Execute as</em> = <strong>Me</strong> dan <em>Who has access</em> = <strong>Anyone (Siapa Saja)</strong>. Salin URL Web App dan simpan di aplikasi ini!
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[350px] overflow-y-auto leading-relaxed">
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
