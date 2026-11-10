import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '../types/pkl';
import { StorageService, getJakartaDate, formatIndonesianDate } from '../services/storage';
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
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminDashboardProps {
  onNavigateTab: (tab: 'dashboard' | 'students' | 'attendance' | 'reports' | 'gas_sync') => void;
  onOpenGoogleSheetConfig: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab, onOpenGoogleSheetConfig }) => {
  const currentUser = StorageService.getCurrentUser();
  const [allUsers, setAllUsers] = useState<User[]>(() => StorageService.getUsers().filter(u => u.role === 'siswa'));
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const todayDate = getJakartaDate();
  const sheetConfig = StorageService.getGoogleSheetConfig();
  const isConnected = StorageService.isGoogleSheetConnected();
  const studentShareUrl = StorageService.getStudentShareUrl();

  const handleCloudSync = async (notify = true) => {
    setIsSyncing(true);
    try {
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
    // 1. Immediate fetch from server
    handleCloudSync(false);

    // 2. Real-time background polling every 8 seconds:
    // Captures attendance submitted by students from different phones automatically
    const interval = setInterval(() => {
      StorageService.fetchAttendanceFromServer().then(recs => setAllAttendance(recs));
      StorageService.fetchStudentsFromServer().then(users => setAllUsers(users.filter(u => u.role === 'siswa')));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleCopyWhatsAppText = () => {
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
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
              Panel Pengawas & Koordinator PKL
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Pembimbing: <strong className="text-white">{currentUser?.nama || 'Drs. Bambang Sutrisno, M.Pd'}</strong></span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {formatIndonesianDate(todayDate)}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Monitoring Kehadiran Siswa PKL Hari Ini (Real-Time Cloud)
          </h2>

          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Data presensi dari seluruh siswa di berbagai bengkel & instansi PKL disinkronisasikan otomatis via Google Spreadsheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleCloudSync(true)}
            disabled={isSyncing}
            className="px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
            title="Tarik data presensi terbaru yang baru saja dikirim siswa dari HP mereka"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Tarik Data Terbaru'}</span>
          </button>

          <button
            onClick={onOpenGoogleSheetConfig}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
              sheetConfig.connected || sheetConfig.scriptUrl
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Google Spreadsheet</span>
            <span className={`w-2 h-2 rounded-full ${sheetConfig.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>
        </div>
      </div>

      {/* WHATSAPP SHARE CARD FOR STUDENTS (AUTO-CONNECT MULTI-USER) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <Share2 className="w-4 h-4" />
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              Tautan Presensi Siswa (Sudah Otomatis Terhubung Google Spreadsheet)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed">
            Kirimkan tautan ini ke grup WhatsApp siswa PKL. Siswa yang membuka tautan ini di HP mereka akan <strong>langsung terhubung ke Google Spreadsheet sekolah tanpa perlu pengaturan apa pun</strong>.
          </p>
        </div>

        <button
          onClick={handleCopyWhatsAppText}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer shrink-0"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
          <span>{copiedLink ? 'Tersalin untuk WhatsApp!' : 'Salin Pesan & Link WhatsApp'}</span>
        </button>
      </div>

      {/* 5 Main Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Siswa PKL</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalStudents}</div>
          <p className="text-[10px] text-slate-500">Terdaftar di database</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Sudah Hadir</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{hadirHariIni}</div>
          <p className="text-[10px] text-emerald-500/90 font-medium">Tercatat datang hari ini</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Belum Presensi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{belumPresensi}</div>
          <p className="text-[10px] text-amber-500/90 font-medium">Menunggu presensi datang</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Sudah Pulang</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">{sudahPulang}</div>
          <p className="text-[10px] text-purple-500/90 font-medium">Presensi pulang selesai</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tingkat Kehadiran</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">{persentaseKehadiran}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-cyan-400 h-full rounded-full transition-all" 
              style={{ width: `${persentaseKehadiran}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Real-time Today Attendance Activity Feed */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Presensi Siswa Hari Ini ({todayRecords.length} Catatan)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Urutan presensi terbaru yang tercatat di instansi/perusahaan tempat PKL
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('attendance')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
          >
            Semua Data Absensi &rarr;
          </button>
        </div>

        {todayRecords.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800/80 text-slate-500 text-xs">
            Belum ada siswa yang melakukan presensi hari ini.
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayRecords.map((item) => (
              <div 
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    item.status === 'Hadir' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    {item.namaSiswa.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-xs truncate">{item.namaSiswa}</p>
                      <span className="text-[10px] font-mono text-slate-400">({item.nis})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {item.kelas || 'XII TKR 1'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.jurusan} • <span className="text-slate-300 font-medium">{item.tempatPkl}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Jam Masuk</span>
                    <span className="font-mono font-bold text-emerald-400">{item.jamDatang} WIB</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Jam Pulang</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {item.jamPulang && item.jamPulang !== '-' ? `${item.jamPulang} WIB` : '-'}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    item.status === 'Hadir' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
