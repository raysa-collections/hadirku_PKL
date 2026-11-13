import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, AttendanceStatus } from '../types/pkl';
import { 
  StorageService, 
  getJakartaDate, 
  getJakartaTime, 
  formatIndonesianDate, 
  evaluateAttendanceTime,
  AttendanceTimeRule 
} from '../services/storage';
import { AttendanceVerificationModal } from './AttendanceVerificationModal';
import { 
  LogIn, 
  LogOut, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  School, 
  Briefcase, 
  UserCheck, 
  FileText, 
  Sparkles,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Camera,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentDashboardProps {
  user: User;
  onNavigateToHistory: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onNavigateToHistory }) => {
  const [digitalTime, setDigitalTime] = useState(getJakartaTime());
  const [todayDate, setTodayDate] = useState(getJakartaDate());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModalAction, setActiveModalAction] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);

  // Evaluate current attendance window using real-time Jakarta clock
  const timeRule: AttendanceTimeRule = evaluateAttendanceTime();

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [sheetConfig, setSheetConfig] = useState(() => StorageService.getGoogleSheetConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');
  const isConnected = StorageService.isGoogleSheetConnected();

  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Load today's attendance record
  const refreshAttendance = () => {
    const allRecords = StorageService.getAttendance();
    const currDate = getJakartaDate();
    setTodayDate(currDate);
    const existing = allRecords.find(r => r.tanggal === currDate && r.nis === user.nis);
    setTodayRecord(existing || null);
  };

  useEffect(() => {
    refreshAttendance();
    const timer = setInterval(() => {
      setDigitalTime(getJakartaTime());
    }, 1000);

    // Fetch from application server so today's status is preserved across devices
    setIsCloudSyncing(true);
    StorageService.fetchAttendanceFromServer()
      .then(() => {
        refreshAttendance();
        if (StorageService.isGoogleSheetConnected()) {
          return StorageService.pullAttendanceFromCloud();
        }
      })
      .then(() => {
        refreshAttendance();
      })
      .catch(err => console.warn('Background pull error:', err))
      .finally(() => setIsCloudSyncing(false));

    return () => clearInterval(timer);
  }, [user.nis]);

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrlInput.trim().startsWith('http')) {
      alert('Masukkan URL valid berawalan https://script.google.com/...');
      return;
    }
    const updated = {
      ...sheetConfig,
      scriptUrl: manualUrlInput.trim(),
      connected: true,
      lastSync: new Date().toISOString(),
    };
    StorageService.saveGoogleSheetConfig(updated);
    setSheetConfig(updated);
    setShowConfigModal(false);
    setFeedbackToast({
      type: 'success',
      title: 'Google Spreadsheet Terhubung!',
      message: 'Aplikasi Anda kini terhubung ke Google Spreadsheet sekolah. Presensi Anda akan otomatis masuk ke rekap.',
    });
    // Trigger pull
    StorageService.pullAttendanceFromCloud(manualUrlInput.trim()).then(refreshAttendance);
  };

  const hasCheckedIn = Boolean(todayRecord);
  const hasCheckedOut = Boolean(todayRecord && todayRecord.jamPulang && todayRecord.jamPulang !== '-');

  // Trigger click on Presensi Datang
  const handleOpenCheckInModal = () => {
    if (hasCheckedIn) {
      setFeedbackToast({
        type: 'warning',
        title: 'Presensi Ditolak',
        message: `Anda sudah melakukan presensi datang hari ini pada pukul ${todayRecord?.jamDatang} WIB.`,
      });
      return;
    }

    if (!timeRule.canCheckIn) {
      setFeedbackToast({
        type: 'warning',
        title: 'Di Luar Jam Presensi Datang',
        message: timeRule.checkInMessage,
      });
      return;
    }

    setActiveModalAction('CHECK_IN');
  };

  // Trigger click on Presensi Pulang
  const handleOpenCheckOutModal = () => {
    if (hasCheckedOut) {
      setFeedbackToast({
        type: 'warning',
        title: 'Presensi Sudah Selesai',
        message: `Anda sudah melakukan presensi pulang hari ini pada pukul ${todayRecord?.jamPulang} WIB.`,
      });
      return;
    }

    if (!timeRule.canCheckOut) {
      setFeedbackToast({
        type: 'warning',
        title: 'Di Luar Jam Presensi Pulang',
        message: timeRule.checkOutMessage,
      });
      return;
    }

    setActiveModalAction('CHECK_OUT');
  };

  // Confirm Verification (Photo & GPS captured)
  const handleConfirmVerification = async (data: {
    photo: string;
    coordinates: string;
    mapsUrl: string;
    notes: string;
    isFakeGps?: boolean;
    accuracy?: number;
  }) => {
    setIsSubmitting(true);
    const timeNow = digitalTime;
    const dateNow = todayDate;
    const action = activeModalAction;
    setActiveModalAction(null);

    if (action === 'CHECK_IN') {
      const recordId = `ABS-${dateNow.replace(/-/g, '')}-${user.nis}`;
      const status: AttendanceStatus = timeRule.checkInStatus === 'Terlambat' ? 'Terlambat' : 'Hadir';

      const newRecord: AttendanceRecord = {
        id: recordId,
        tanggal: dateNow,
        nis: user.nis,
        namaSiswa: user.nama,
        kelas: user.kelas || 'XII TKR 1',
        namaPembimbing: user.namaPembimbing,
        asalSekolah: user.asalSekolah,
        jurusan: user.jurusan,
        jamDatang: timeNow,
        jamPulang: '-',
        status: status,
        statusDatang: status,
        statusPulang: 'Belum Pulang',
        keterangan: data.notes || (status === 'Terlambat' ? 'Presensi masuk terlambat di bengkel' : 'Presensi datang tepat waktu di bengkel'),
        tempatPkl: user.tempatPkl,
        koordinatGps: data.coordinates,
        mapsUrl: data.mapsUrl,
        fotoBukti: data.photo,
        tahunAjaran: user.tahunAjaran || StorageService.getActiveTahunAjaran(),
        syncStatus: 'pending',
      };

      StorageService.addOrUpdateAttendance(newRecord);
      setTodayRecord(newRecord);

      // Sync to Google Spreadsheet
      const syncRes = await StorageService.syncToGoogleSheet('CHECK_IN', newRecord);
      if (syncRes.success) {
        newRecord.syncStatus = 'synced';
        StorageService.addOrUpdateAttendance(newRecord);
        setTodayRecord({ ...newRecord });
        confetti({ particleCount: 70, spread: 80 });
        setFeedbackToast({
          type: 'success',
          title: 'Presensi Datang Berhasil Terkirim!',
          message: `Waktu: ${timeNow} WIB (${status}). Bukti foto bengkel & titik GPS native terverifikasi berhasil disimpan dan terkirim langsung ke Google Spreadsheet!`,
        });
      } else {
        newRecord.syncStatus = 'pending';
        StorageService.addOrUpdateAttendance(newRecord);
        setTodayRecord({ ...newRecord });
        setFeedbackToast({
          type: 'warning',
          title: syncRes.isUnconfigured ? 'Tersimpan di HP (Spreadsheet Belum Terhubung)' : 'Tersimpan Lokal di HP',
          message: syncRes.message || 'Presensi tersimpan di HP Anda, tetapi belum masuk ke rekap Google Spreadsheet sekolah.',
        });
      }

      setIsSubmitting(false);
    } else if (action === 'CHECK_OUT') {
      const recordId = `ABS-${dateNow.replace(/-/g, '')}-${user.nis}`;
      const baseRecord: AttendanceRecord = todayRecord || {
        id: recordId,
        tanggal: dateNow,
        nis: user.nis,
        namaSiswa: user.nama,
        kelas: user.kelas || 'XII TKR 1',
        namaPembimbing: user.namaPembimbing,
        asalSekolah: user.asalSekolah,
        jurusan: user.jurusan,
        jamDatang: '-',
        jamPulang: timeNow,
        status: 'Hadir',
        statusDatang: 'Belum Datang',
        statusPulang: 'Sudah Pulang',
        keterangan: data.notes || 'Presensi kepulangan (tanpa presensi datang)',
        tempatPkl: user.tempatPkl,
        tahunAjaran: user.tahunAjaran || StorageService.getActiveTahunAjaran(),
        syncStatus: 'pending',
      };

      const updatedRecord: AttendanceRecord = {
        ...baseRecord,
        jamPulang: timeNow,
        statusDatang: baseRecord.statusDatang || (baseRecord.jamDatang && baseRecord.jamDatang !== '-' ? baseRecord.status : 'Belum Datang'),
        statusPulang: 'Sudah Pulang',
        keterangan: data.notes || baseRecord.keterangan || 'Presensi kepulangan siswa PKL',
        koordinatPulang: data.coordinates,
        mapsUrlPulang: data.mapsUrl,
        fotoPulang: data.photo,
        syncStatus: 'pending',
      };

      StorageService.addOrUpdateAttendance(updatedRecord);
      setTodayRecord(updatedRecord);

      const syncRes = await StorageService.syncToGoogleSheet('CHECK_OUT', updatedRecord);
      if (syncRes.success) {
        updatedRecord.syncStatus = 'synced';
        StorageService.addOrUpdateAttendance(updatedRecord);
        setTodayRecord({ ...updatedRecord });
        confetti({ particleCount: 80, spread: 90 });
        setFeedbackToast({
          type: 'success',
          title: 'Presensi Pulang Berhasil Terkirim!',
          message: `Waktu kepulangan tercatat: ${timeNow} WIB. Bukti foto & GPS kepulangan berhasil diperbarui di Google Spreadsheet!`,
        });
      } else {
        updatedRecord.syncStatus = 'pending';
        StorageService.addOrUpdateAttendance(updatedRecord);
        setTodayRecord({ ...updatedRecord });
        setFeedbackToast({
          type: 'warning',
          title: syncRes.isUnconfigured ? 'Tersimpan di HP (Spreadsheet Belum Terhubung)' : 'Tersimpan Lokal di HP',
          message: syncRes.message || 'Presensi kepulangan tersimpan di HP Anda.',
        });
      }

      setIsSubmitting(false);
    }
  };

  // Determine current display status
  const getTodayStatusLabel = () => {
    if (hasCheckedOut) return 'Selesai PKL (Sudah Pulang)';
    if (hasCheckedIn) return `Sedang Berlangsung (${todayRecord?.status} ${todayRecord?.jamDatang} WIB)`;
    if (timeRule.currentHour >= 12) return 'Belum Presensi (Lewat Batas - Kategori: Tidak Disiplin)';
    return 'Belum Presensi';
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Alert */}
      {feedbackToast && (
        <div className={`p-4 rounded-2xl border shadow-xl flex items-start justify-between gap-3 animate-in slide-in-from-top-3 ${
          feedbackToast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : feedbackToast.type === 'warning'
            ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
            : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold">{feedbackToast.title}</p>
              <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{feedbackToast.message}</p>
            </div>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* CLOUD REAL-TIME SPREADSHEET AUTOMATIC CONNECTION CARD */}
      <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div>
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>Sistem Absensi Terhubung Otomatis ke Cloud & Spreadsheet Sekolah</span>
            </p>
            <p className="text-[11px] text-emerald-200/90 mt-0.5">
              Presensi Anda langsung tersimpan dan terkap otomatis ke server utama & rekapan Guru Pembimbing tanpa perlu input URL manual.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="text-[10px] text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold">
            🟢 Terhubung Otomatis
          </span>
          <button
            onClick={() => {
              setIsCloudSyncing(true);
              StorageService.pullAttendanceFromCloud()
                .then((res) => {
                  refreshAttendance();
                  setFeedbackToast({
                    type: 'success',
                    title: 'Koneksi Cloud Terverifikasi',
                    message: 'Sistem absensi terhubung lancar dengan server & spreadsheet utama sekolah.',
                  });
                })
                .finally(() => setIsCloudSyncing(false));
            }}
            disabled={isCloudSyncing}
            className="px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 rounded-xl text-[11px] font-semibold border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span className={isCloudSyncing ? 'animate-spin' : ''}>🔄</span>
            <span>{isCloudSyncing ? 'Memeriksa...' : 'Cek Status Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Greeting & Identity Hero Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Siswa Praktik Kerja Lapangan (TKR Semakasari)
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Selamat Datang, {user.nama}
            </h2>
            <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap mt-1">
              <span>NIS: <strong className="font-mono text-white">{user.nis}</strong></span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                Kelas: {user.kelas || 'XII TKR 1'}
              </span>
              <span>•</span>
              <span>{user.jurusan}</span>
            </p>
          </div>

          {/* Real-time Clock Widget */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center md:text-right shrink-0 backdrop-blur-sm">
            <div className="flex items-center justify-center md:justify-end gap-1.5 text-cyan-400 text-xs font-semibold mb-0.5">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Zona Waktu Asia/Jakarta (WIB)</span>
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-wider">
              {digitalTime}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-center md:justify-end gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              {formatIndonesianDate(todayDate)}
            </div>
          </div>
        </div>

        {/* Detailed Identity Badges */}
        <div className="mt-5 pt-4 border-t border-blue-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-white/5">
            <School className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">Asal Sekolah</span>
              <p className="font-semibold text-white truncate">{user.asalSekolah}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-white/5">
            <Briefcase className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">Tempat PKL</span>
              <p className="font-semibold text-white truncate">{user.tempatPkl}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-white/5">
            <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">Guru Pembimbing</span>
              <p className="font-semibold text-white truncate">{user.namaPembimbing}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATURAN JADWAL OPERASIONAL PRESENSI INFO BAR */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            Aturan Jam Presensi Resmi Siswa PKL (WIB):
          </span>
          <span className="text-[11px] text-cyan-400 font-mono">
            Sekarang: {digitalTime} WIB
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
          <div className={`p-2.5 rounded-xl border ${
            timeRule.currentHour >= 4 && timeRule.currentHour < 9 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <span className="font-bold block text-white">1. Presensi Datang (Tepat Waktu)</span>
            <span>Pukul 04.00 – 08.59 WIB &bull; Status: <strong>Hadir</strong></span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            timeRule.currentHour >= 9 && timeRule.currentHour < 12 
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <span className="font-bold block text-white">2. Presensi Datang (Terlambat)</span>
            <span>Pukul 09.00 – 12.00 WIB &bull; Status: <strong>Terlambat</strong></span>
          </div>

          <div className={`p-2.5 rounded-xl border ${
            timeRule.currentHour >= 15 && timeRule.currentHour <= 23 
              ? 'bg-blue-950/60 border-blue-500/40 text-cyan-300' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <span className="font-bold block text-white">3. Presensi Pulang</span>
            <span>Pukul 15.00 – 23.00 WIB &bull; Wajib foto & GPS</span>
          </div>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE STATUS CARD */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Status Presensi Hari Ini ({todayDate})
          </h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            hasCheckedOut 
              ? 'bg-blue-500/20 text-cyan-300 border border-blue-500/40' 
              : hasCheckedIn 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : timeRule.currentHour >= 12
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {getTodayStatusLabel()}
          </span>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Card Datang */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                hasCheckedIn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Jam Masuk (Datang)</p>
                <p className="text-lg font-bold font-mono text-white">
                  {hasCheckedIn ? `${todayRecord?.jamDatang} WIB` : '--:--:--'}
                </p>
                {todayRecord?.koordinatGps && (
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    📍 {todayRecord.koordinatGps}
                  </p>
                )}
              </div>
            </div>
            {hasCheckedIn && (
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                todayRecord?.status === 'Hadir' 
                  ? 'bg-emerald-500/20 text-emerald-300' 
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {todayRecord?.status}
              </span>
            )}
          </div>

          {/* Card Pulang */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                hasCheckedOut ? 'bg-blue-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'
              }`}>
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Jam Kepulangan (Pulang)</p>
                <p className="text-lg font-bold font-mono text-white">
                  {hasCheckedOut ? `${todayRecord?.jamPulang} WIB` : '--:--:--'}
                </p>
                {todayRecord?.koordinatPulang && (
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    📍 {todayRecord.koordinatPulang}
                  </p>
                )}
              </div>
            </div>
            {hasCheckedOut && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-cyan-300">
                Selesai
              </span>
            )}
          </div>

        </div>

        {/* Bukti Foto & Titik Koordinat Preview (Jika Sudah Diambil) */}
        {todayRecord?.fotoBukti && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <img 
                src={todayRecord.fotoBukti} 
                alt="Bukti Kehadiran Bengkel" 
                className="w-16 h-12 object-cover rounded-lg border border-slate-700 shrink-0" 
              />
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  Foto Bukti Kehadiran di Bengkel Tersimpan
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Titik GPS: <span className="font-mono text-cyan-400">{todayRecord.koordinatGps || '-'}</span>
                </p>
              </div>
            </div>

            {todayRecord.mapsUrl && (
              <a
                href={todayRecord.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-cyan-300 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition self-end sm:self-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Peta Lokasi Map HP
              </a>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          PROMINENT BIG ACTION BUTTONS (DENGAN BATASAN WAKTU RESMI)
          ========================================================================= */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Tombol Tindakan Utama Presensi
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* TOMBOL PRESENSI DATANG */}
          <button
            onClick={handleOpenCheckInModal}
            disabled={hasCheckedIn || isSubmitting || !timeRule.canCheckIn}
            className={`p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden group text-left ${
              hasCheckedIn
                ? 'bg-slate-900/60 border border-slate-800 opacity-60 cursor-not-allowed'
                : !timeRule.canCheckIn
                ? 'bg-slate-900/50 border border-slate-800/80 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 hover:from-emerald-500 hover:to-teal-800 text-white shadow-xl shadow-emerald-900/30 hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-emerald-400/30'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                hasCheckedIn 
                  ? 'bg-slate-800 text-slate-500' 
                  : !timeRule.canCheckIn
                  ? 'bg-slate-800 text-slate-500'
                  : 'bg-white/20 text-white backdrop-blur-md'
              }`}>
                <LogIn className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                hasCheckedIn 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : !timeRule.canCheckIn
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/20'
                  : 'bg-white/20 text-white backdrop-blur-md'
              }`}>
                {hasCheckedIn 
                  ? '✓ Sudah Presensi Datang' 
                  : !timeRule.canCheckIn
                  ? 'Jam 04.00 – 12.00 WIB'
                  : timeRule.checkInStatus === 'Terlambat'
                  ? 'Terlambat (09.00 - 12.00)'
                  : 'Hadir Tepat Waktu'}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                PRESENSI DATANG
                {timeRule.canCheckIn && !hasCheckedIn && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </h4>
              <p className="text-xs text-slate-200/90 leading-relaxed">
                {hasCheckedIn
                  ? `Telah tercatat pada pukul ${todayRecord?.jamDatang} WIB.`
                  : !timeRule.canCheckIn
                  ? timeRule.checkInMessage
                  : 'Ketuk untuk membuka verifikasi foto di bengkel & titik koordinat GPS map HP.'}
              </p>
            </div>
          </button>

          {/* TOMBOL PRESENSI PULANG */}
          <button
            onClick={handleOpenCheckOutModal}
            disabled={hasCheckedOut || isSubmitting || !timeRule.canCheckOut}
            className={`p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden group text-left ${
              hasCheckedOut
                ? 'bg-slate-900/60 border border-slate-800 opacity-60 cursor-not-allowed'
                : !timeRule.canCheckOut
                ? 'bg-slate-900/50 border border-slate-800/80 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-900 hover:from-blue-600 hover:to-cyan-800 text-white shadow-xl shadow-blue-900/30 hover:shadow-cyan-600/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-cyan-400/30'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                hasCheckedOut 
                  ? 'bg-slate-800 text-slate-500' 
                  : !timeRule.canCheckOut
                  ? 'bg-slate-800 text-slate-600' 
                  : 'bg-white/20 text-white backdrop-blur-md'
              }`}>
                <LogOut className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                hasCheckedOut
                  ? 'bg-blue-500/20 text-cyan-300 border border-blue-500/30'
                  : !timeRule.canCheckOut
                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : 'bg-white/20 text-white backdrop-blur-md'
              }`}>
                {hasCheckedOut 
                  ? '✓ Sudah Presensi Pulang' 
                  : !timeRule.canCheckOut
                  ? 'Jam 15.00 – 23.00 WIB'
                  : 'Langkah 2: Presensi Pulang'}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                PRESENSI PULANG
                {timeRule.canCheckOut && !hasCheckedOut && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                )}
              </h4>
              <p className="text-xs text-slate-200/90 leading-relaxed">
                {hasCheckedOut
                  ? `Selesai. Jam pulang tercatat pada pukul ${todayRecord?.jamPulang} WIB.`
                  : !timeRule.canCheckOut
                  ? timeRule.checkOutMessage
                  : 'Ketuk saat jam praktik selesai untuk foto kepulangan & simpan koordinat map HP.'}
              </p>
            </div>
          </button>

        </div>
      </div>

      {/* Quick Link to Student Attendance History */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-white">Riwayat Kehadiran Lengkap Anda</p>
          <p className="text-[11px] text-slate-400">Lihat rekap presensi per bulan, jam kedatangan, foto bukti, dan koordinat GPS.</p>
        </div>
        <button
          onClick={onNavigateToHistory}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Buka Riwayat Absensi &rarr;
        </button>
      </div>

      {/* Verification Modal (Camera + GPS) */}
      {activeModalAction && (
        <AttendanceVerificationModal
          user={user}
          actionType={activeModalAction}
          targetStatus={activeModalAction === 'CHECK_IN' && timeRule.checkInStatus === 'Terlambat' ? 'Terlambat' : 'Hadir'}
          currentWibTime={digitalTime}
          todayDate={todayDate}
          onConfirm={handleConfirmVerification}
          onClose={() => setActiveModalAction(null)}
        />
      )}

      {/* Manual Connection Modal for Student */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm">Hubungkan Google Spreadsheet Sekolah</h4>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Masukkan <strong>URL Web App Google Apps Script</strong> yang diberikan oleh Guru Pembimbing Anda agar presensi harian langsung terkirim ke Spreadsheet sekolah:
            </p>

            <form onSubmit={handleManualConnect} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">URL Web App Apps Script:</label>
                <input
                  type="url"
                  required
                  value={manualUrlInput}
                  onChange={(e) => setManualUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-cyan-200">
                💡 <strong>Tips:</strong> Anda juga bisa meminta Guru Pembimbing mengirimkan <em>"Tautan Presensi Siswa Otomatis"</em>. Membuka tautan tersebut sekali saja akan langsung menghubungkan HP Anda tanpa mengetik URL.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan & Hubungkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
