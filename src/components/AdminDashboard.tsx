import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '../types/pkl';
import { StorageService, getJakartaDate, formatIndonesianDate, getAttendanceSplitStatus } from '../services/storage';
import { 
  Users, 
  UserCheck, 
  UserX, 
  LogOut, 
  Percent, 
  Calendar, 
  ArrowRight, 
  FileSpreadsheet, 
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Share2,
  Copy,
  Check,
  Send,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QrShareBox } from './QrShareBox';

interface AdminDashboardProps {
  onNavigateTab: (tab: 'dashboard' | 'students' | 'attendance' | 'reports' | 'gas_sync') => void;
  onOpenGoogleSheetConfig: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab, onOpenGoogleSheetConfig }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => StorageService.getUsers().filter(u => u.role === 'siswa'));
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrShare, setShowQrShare] = useState(false);
  const [diagnostics, setDiagnostics] = useState(() => StorageService.getServerDiagnostics());

  const todayDate = getJakartaDate();
  const sheetConfig = StorageService.getGoogleSheetConfig();
  const isConnected = StorageService.isGoogleSheetConnected();
  const studentShareUrl = StorageService.getStudentShareUrl();
  const isDevPreviewHost = typeof window !== 'undefined' && window.location.hostname.includes('ais-dev');

  const handleCloudSync = async (notify = true) => {
    setIsSyncing(true);
    try {
      await StorageService.pingServerHealth();
      setDiagnostics(StorageService.getServerDiagnostics());

      // 1. Fetch latest from Application Server
      const serverRecords = await StorageService.fetchAttendanceFromServer();
      const serverStudents = await StorageService.fetchStudentsFromServer();
      setAllAttendance(serverRecords);
      setAllUsers(serverStudents.filter(u => u.role === 'siswa'));

      // 2. If Google Spreadsheet is connected, also pull from cloud
      if (StorageService.isGoogleSheetConnected()) {
        const attRes = await StorageService.pullAttendanceFromCloud();
        await StorageService.pullStudentsFromCloud();
        setAllAttendance(StorageService.getAttendance());
        setAllUsers(StorageService.getUsers().filter(u => u.role === 'siswa'));
        if (notify) {
          setSyncToast(attRes.message || 'Sinkronisasi berhasil!');
          confetti({ particleCount: 40, spread: 60 });
          setTimeout(() => setSyncToast(null), 4000);
        }
      } else if (notify) {
        setSyncToast(`Data diperbarui dari Server Aplikasi. Total: ${serverRecords.length} presensi.`);
        setTimeout(() => setSyncToast(null), 3000);
      }
    } catch (e: any) {
      if (notify) alert('Gagal sinkron: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const onSyncUpdate = () => {
      setAllAttendance(StorageService.getAttendance());
      setAllUsers(StorageService.getUsers().filter(u => u.role === 'siswa'));
      setDiagnostics(StorageService.getServerDiagnostics());
    };
    window.addEventListener('pkl-sync-updated', onSyncUpdate);

    // 1. Immediate fetch from server & Google Spreadsheet
    handleCloudSync(false);

    // 2. Real-time background polling every 12 seconds:
    // Captures student registrations and attendance submitted from different phones via Server & Google Spreadsheet
    const interval = setInterval(() => {
      handleCloudSync(false);
    }, 12000);

    return () => {
      window.removeEventListener('pkl-sync-updated', onSyncUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleCopyWhatsAppText = () => {
    if (!isConnected) {
      alert('Harap hubungkan & simpan URL Web App Google Apps Script terlebih dahulu di menu Google Spreadsheet agar link WhatsApp siswa otomatis tersinkron.');
      onOpenGoogleSheetConfig();
      return;
    }
    const text = `*PEMBERITAHUAN PRESENSI PKL SMKN 1 TEGALSARI*\nHalo seluruh siswa PKL, silakan catat absensi harian PKL (Datang 04.00-12.00 WIB & Pulang 15.00-23.59 WIB) melalui link resmi berikut:\n${studentShareUrl}\n\n*Catatan:* Tautan di atas sudah otomatis terhubung ke sistem rekap kehadiran Google Spreadsheet sekolah. Pastikan aktifkan izin Kamera & Lokasi GPS di HP Anda saat presensi.`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    confetti({ particleCount: 30, spread: 50 });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Metrics for today
  const todayRecords = allAttendance.filter(r => r.tanggal === todayDate);
  const totalStudents = allUsers.length;
  const hadirHariIni = todayRecords.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length;
  const sudahPulang = todayRecords.filter(r => r.jamPulang && r.jamPulang !== '-').length;
  const belumPresensi = Math.max(0, totalStudents - hadirHariIni);
  const persentaseKehadiran = totalStudents > 0 ? Math.round((hadirHariIni / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {syncToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-slate-500 hover:text-slate-900 text-xs px-1.5 py-0.5 rounded cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Panel Pengawas & Koordinator PKL
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Administrator PKL TKR</span>
            </span>
            <span className="text-xs text-slate-600 font-mono font-medium">
              {formatIndonesianDate(todayDate)}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Monitoring Kehadiran Siswa PKL Hari Ini (Real-Time Cloud)
          </h2>

          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Data presensi dari seluruh siswa di berbagai bengkel & instansi PKL disinkronisasikan otomatis via Google Spreadsheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleCloudSync(true)}
            disabled={isSyncing}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Tarik data presensi terbaru yang baru saja dikirim siswa dari HP mereka"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Tarik Data Terbaru'}</span>
          </button>

          <button
            onClick={onOpenGoogleSheetConfig}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
              sheetConfig.connected || sheetConfig.scriptUrl
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Spreadsheet</span>
            <span className={`w-2 h-2 rounded-full ${sheetConfig.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </button>
        </div>
      </div>

      {/* WHATSAPP SHARE CARD FOR STUDENTS (AUTO-CONNECT MULTI-USER) */}
      <div className={`p-4 sm:p-5 rounded-3xl bg-white border shadow-sm space-y-3 ${
        isConnected && !isDevPreviewHost ? 'border-emerald-200' : 'border-amber-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs ${
                isConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}>
                <Share2 className="w-4 h-4" />
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Tautan Presensi Siswa ({isConnected ? 'Otomatis Terhubung Google Spreadsheet' : 'Spreadsheet Belum Terpasang'})
              </h3>
            </div>
            <p className="text-[11px] text-slate-600 max-w-2xl leading-relaxed">
              Kirimkan tautan ini ke grup WhatsApp siswa PKL. Siswa yang membuka tautan ini di HP mereka akan <strong className="text-slate-900">langsung terhubung ke Google Spreadsheet sekolah tanpa perlu pengaturan apa pun</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isConnected && (
              <button
                type="button"
                onClick={() => setShowQrShare(prev => !prev)}
                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>{showQrShare ? 'Tutup QR' : 'Tampilkan QR Siswa'}</span>
              </button>
            )}
            <button
              onClick={handleCopyWhatsAppText}
              className={`px-4 py-2.5 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0 ${
                isConnected ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-100" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Tersalin untuk WhatsApp!' : isConnected ? 'Salin Pesan & Link WhatsApp' : 'Hubungkan Spreadsheet Dulu'}</span>
            </button>
          </div>
        </div>

        {showQrShare && isConnected && (
          <QrShareBox url={studentShareUrl} />
        )}

        {diagnostics.serverReachable === false && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-[11px] text-red-950 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>
              <strong>Server API (`/api`) Tidak Merespons{diagnostics.serverError ? ` (${diagnostics.serverError})` : ''}:</strong> Pastikan serverless API sudah aktif pada deployment terbaru. Saat server API terputus, pengiriman data siswa tetap diteruskan langsung melalui tautan Google Spreadsheet (<code className="font-mono font-bold">?gas=</code>) atau QR Code di atas.
            </span>
          </div>
        )}

        {diagnostics.isVercel && !diagnostics.hasEnvScriptUrl && !isDevPreviewHost && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Penting untuk Multi-Perangkat di Vercel:</strong> Variabel <code className="font-mono font-bold bg-white px-1 rounded border border-amber-200">VITE_GOOGLE_APPS_SCRIPT_URL</code> &amp; <code className="font-mono font-bold bg-white px-1 rounded border border-amber-200">GOOGLE_APPS_SCRIPT_URL</code> belum disetel di Vercel Settings. Tanpa variabel tersebut, HP siswa yang membuka link polos (tanpa <code className="font-mono font-bold">?gas=</code>) tidak akan tahu alamat Spreadsheet Anda! Wajib bagikan <strong>Link WhatsApp / QR Code</strong> di atas ke siswa, ATAU pasang kedua variabel tersebut di <strong>Vercel &gt; Settings &gt; Environment Variables</strong> lalu Redeploy.
            </span>
          </div>
        )}

        {isDevPreviewHost && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Perhatian Host Developer:</strong> Anda sedang membuka URL pratinjau developer (<code className="font-mono font-bold">ais-dev</code>). Jangan bagikan link ini ke siswa karena siswa akan diminta login akun Google Developer Anda. Salin tautan siswa dari alamat publik <strong>Vercel (.vercel.app)</strong> atau <strong>Shared App URL</strong>.
            </span>
          </div>
        )}
      </div>

      {/* 5 Main Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Total Siswa PKL</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">{totalStudents}</div>
          <p className="text-[10px] text-slate-500">Terdaftar di database</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Sudah Hadir</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">{hadirHariIni}</div>
          <p className="text-[10px] text-emerald-700 font-medium">Tercatat datang hari ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Belum Presensi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600">{belumPresensi}</div>
          <p className="text-[10px] text-amber-700 font-medium">Menunggu presensi datang</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-red-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Sudah Pulang</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-red-600">{sudahPulang}</div>
          <p className="text-[10px] text-red-700 font-medium">Presensi pulang selesai</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Tingkat Kehadiran</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">{persentaseKehadiran}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all" 
              style={{ width: `${persentaseKehadiran}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Real-time Today Attendance Activity Feed */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Presensi Siswa Hari Ini ({todayRecords.length} Catatan)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Urutan presensi terbaru yang tercatat di instansi/perusahaan tempat PKL
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('attendance')}
            className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            Semua Data Absensi &rarr;
          </button>
        </div>

        {todayRecords.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
            Belum ada siswa yang melakukan presensi hari ini.
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayRecords.map((item) => {
              const { statusDatang, statusPulang } = getAttendanceSplitStatus(item);
              return (
              <div 
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    statusDatang === 'Hadir' ? 'bg-emerald-600' : statusDatang === 'Terlambat' ? 'bg-amber-500' : 'bg-red-600'
                  }`}>
                    {item.namaSiswa.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 text-xs truncate">{item.namaSiswa}</p>
                      <span className="text-[10px] font-mono text-slate-500">({item.nis})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {item.kelas || 'XII TKR 1'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {item.jurusan} • <span className="text-slate-800 font-medium">{item.tempatPkl}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Jam Masuk</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700">{item.jamDatang} WIB</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Jam Pulang</span>
                    <span className="font-mono tabular-nums font-bold text-blue-700">
                      {item.jamPulang && item.jamPulang !== '-' ? `${item.jamPulang} WIB` : '-'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                      statusDatang === 'Hadir' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : statusDatang === 'Terlambat'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      Datang: {statusDatang}
                    </span>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                      statusPulang === 'Sudah Pulang'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      Pulang: {statusPulang}
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
