import React, { useState, useEffect, useRef } from 'react';
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
  const [isConnected, setIsConnected] = useState(() => StorageService.isGoogleSheetConnected());
  const [pendingSyncCount, setPendingSyncCount] = useState(() => StorageService.getPendingSyncCount());

  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const isMountedRef = useRef(true);

  // Load today's attendance record (case-insensitive NIS match)
  const refreshAttendance = () => {
    if (!isMountedRef.current) return;
    const allRecords = StorageService.getAttendance();
    const currDate = getJakartaDate();
    const normNis = String(user.nis || '').trim().toLowerCase();
    setTodayDate(currDate);
    const existing = allRecords.find(
      r => r.tanggal === currDate && String(r.nis || '').trim().toLowerCase() === normNis
    );
    setTodayRecord(existing || null);
    setIsConnected(StorageService.isGoogleSheetConnected());
    setPendingSyncCount(StorageService.getPendingSyncCount());
  };

  const syncWithCloud = async (showToastOnResult = false) => {
    if (!isMountedRef.current) return;
    setIsCloudSyncing(true);
    try {
      await StorageService.ensureConfigSynced();
      if (!isMountedRef.current) return;
      const connectedNow = StorageService.isGoogleSheetConnected();
      setIsConnected(connectedNow);

      // Flush any offline/pending student or attendance outbox items first
      const flushRes = await StorageService.flushPendingSyncQueue();
      await StorageService.fetchAttendanceFromServer(user.nis);

      if (StorageService.isGoogleSheetConnected()) {
        await StorageService.pullAttendanceFromCloud(undefined, user.nis);
      }

      if (!isMountedRef.current) return;
      refreshAttendance();

      if (showToastOnResult) {
        const nowConnected = StorageService.isGoogleSheetConnected();
        const remaining = StorageService.getPendingSyncCount();
        if (nowConnected && remaining === 0) {
          setFeedbackToast({
            type: 'success',
            title: 'Koneksi Cloud & Spreadsheet Terverifikasi',
            message: flushRes.flushed > 0
              ? `${flushRes.flushed} data antrean berhasil dikirim dan seluruh presensi tersinkron ke Spreadsheet.`
              : 'Sistem absensi terhubung lancar dengan server & spreadsheet utama sekolah.',
          });
        } else if (nowConnected && remaining > 0) {
          setFeedbackToast({
            type: 'warning',
            title: 'Sebagian Data Masih Dalam Antrean',
            message: `${remaining} data presensi/akun masih menunggu jaringan stabil untuk tersinkron ke Spreadsheet.`,
          });
        } else {
          setFeedbackToast({
            type: 'warning',
            title: 'Tautan Spreadsheet Belum Aktif di Perangkat Ini',
            message: 'Presensi tetap tersimpan di HP & antrean kirim. Pastikan Anda membuka link resmi dari grup WhatsApp sekolah agar otomatis terhubung.',
          });
        }
      }
    } catch (err) {
      console.warn('Background pull error:', err);
      refreshAttendance();
    } finally {
      if (isMountedRef.current) {
        setIsCloudSyncing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const onSyncUpdate = () => refreshAttendance();
    window.addEventListener('pkl-sync-updated', onSyncUpdate);

    refreshAttendance();
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setDigitalTime(getJakartaTime());
      }
    }, 1000);

    // Initial scoped sync & outbox flush
    syncWithCloud(false);

    // Retry pending outbox automatically every 25 seconds when there are queued items
    const queueRetryTimer = setInterval(() => {
      if (StorageService.getPendingSyncCount() > 0) {
        StorageService.flushPendingSyncQueue()
          .then(() => refreshAttendance())
          .catch(() => {});
      }
    }, 25000);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('pkl-sync-updated', onSyncUpdate);
      clearInterval(timer);
      clearInterval(queueRetryTimer);
    };
  }, [user.nis]);

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
    if (isSubmitting) return;
    setIsSubmitting(true);
    const timeNow = digitalTime;
    const dateNow = todayDate;
    const action = activeModalAction;
    setActiveModalAction(null);

    const safeConfetti = (count: number, spread: number) => {
      try {
        confetti({ particleCount: count, spread, disableForReducedMotion: true });
      } catch {}
    };

    try {
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
        if (isMountedRef.current) setTodayRecord(newRecord);

        // Sync to Server & Google Spreadsheet
        const syncRes = await StorageService.syncToGoogleSheet('CHECK_IN', newRecord);
        const isSheetSynced = Boolean(syncRes.sheetSynced);
        if (isSheetSynced) {
          newRecord.syncStatus = 'synced';
          newRecord.syncedAt = new Date().toISOString();
          StorageService.addOrUpdateAttendance(newRecord);
          if (isMountedRef.current) {
            setTodayRecord({ ...newRecord });
            safeConfetti(70, 80);
            setFeedbackToast({
              type: 'success',
              title: 'Presensi Datang Berhasil Terkirim!',
              message: `Waktu: ${timeNow} WIB (${status}). Bukti foto bengkel & titik GPS native terverifikasi berhasil disimpan dan terkirim langsung ke Google Spreadsheet!`,
            });
          }
        } else {
          newRecord.syncStatus = 'pending';
          StorageService.addOrUpdateAttendance(newRecord);
          if (isMountedRef.current) {
            setTodayRecord({ ...newRecord });
            setFeedbackToast({
              type: 'warning',
              title: syncRes.isUnconfigured
                ? 'Belum Terhubung ke Tautan Sekolah (Masuk Antrean HP)'
                : syncRes.serverSynced
                ? 'Tersimpan di Server (Menunggu Konfirmasi Spreadsheet)'
                : 'Gagal Mengirim ke Server Admin — Masuk Antrean HP',
              message: syncRes.isUnconfigured
                ? 'Perangkat Anda belum memiliki tautan Spreadsheet sekolah. Buka kembali Link Presensi resmi (?gas=...) atau scan QR Code dari Pembimbing PKL agar presensi ini otomatis terkirim ke server Administrator.'
                : (syncRes.message || 'Presensi tersimpan di antrean HP. Klik "Kirim & Cek Status" saat internet stabil agar masuk ke data Administrator.'),
            });
          }
        }
        refreshAttendance();
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
        if (isMountedRef.current) setTodayRecord(updatedRecord);

        const syncRes = await StorageService.syncToGoogleSheet('CHECK_OUT', updatedRecord);
        const isSheetSynced = Boolean(syncRes.sheetSynced);
        if (isSheetSynced) {
          updatedRecord.syncStatus = 'synced';
          updatedRecord.syncedAt = new Date().toISOString();
          StorageService.addOrUpdateAttendance(updatedRecord);
          if (isMountedRef.current) {
            setTodayRecord({ ...updatedRecord });
            safeConfetti(80, 90);
            setFeedbackToast({
              type: 'success',
              title: 'Presensi Pulang Berhasil Terkirim!',
              message: `Waktu kepulangan tercatat: ${timeNow} WIB. Bukti foto & GPS kepulangan berhasil diperbarui di Google Spreadsheet!`,
            });
          }
        } else {
          updatedRecord.syncStatus = 'pending';
          StorageService.addOrUpdateAttendance(updatedRecord);
          if (isMountedRef.current) {
            setTodayRecord({ ...updatedRecord });
            setFeedbackToast({
              type: 'warning',
              title: syncRes.isUnconfigured
                ? 'Belum Terhubung ke Tautan Sekolah (Masuk Antrean HP)'
                : syncRes.serverSynced
                ? 'Tersimpan di Server (Menunggu Konfirmasi Spreadsheet)'
                : 'Gagal Mengirim ke Server Admin — Masuk Antrean HP',
              message: syncRes.isUnconfigured
                ? 'Perangkat Anda belum memiliki tautan Spreadsheet sekolah. Buka kembali Link Presensi resmi (?gas=...) atau scan QR Code dari Pembimbing PKL agar presensi pulang ini otomatis terkirim ke Administrator.'
                : (syncRes.message || 'Presensi pulang tersimpan di antrean HP. Klik "Kirim & Cek Status" saat internet stabil.'),
            });
          }
        }
        refreshAttendance();
      }
    } catch (err: any) {
      console.error('Attendance confirm error:', err);
      if (isMountedRef.current) {
        setFeedbackToast({
          type: 'warning',
          title: 'Presensi Disimpan di Perangkat',
          message: 'Terjadi gangguan jaringan saat mengirim presensi (' + (err?.message || 'Coba kirim ulang') + '). Data Anda aman di antrean perangkat.',
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
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
        <div className={`p-4 rounded-2xl border shadow-sm flex items-start justify-between gap-3 animate-in slide-in-from-top-3 ${
          feedbackToast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : feedbackToast.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-start gap-3">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedbackToast.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold">{feedbackToast.title}</p>
              <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{feedbackToast.message}</p>
            </div>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-slate-500 hover:text-slate-900 text-xs px-2 py-1 rounded-lg hover:bg-white/60 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* CLOUD REAL-TIME SPREADSHEET AUTOMATIC CONNECTION CARD */}
      <div className={`p-4 rounded-2xl bg-white border text-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm relative overflow-hidden ${
        isConnected && pendingSyncCount === 0 ? 'border-emerald-200' : 'border-amber-200'
      }`}>
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isConnected && pendingSyncCount === 0
            ? 'bg-gradient-to-r from-emerald-500 via-blue-600 to-amber-500'
            : 'bg-gradient-to-r from-amber-500 via-red-500 to-blue-600'
        }`} />
        <div className="flex items-center gap-3 pt-0.5">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
            isConnected && pendingSyncCount === 0
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            {isConnected && pendingSyncCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>
                {isConnected && pendingSyncCount === 0
                  ? 'Sistem Absensi Terhubung Otomatis ke Cloud & Spreadsheet Sekolah'
                  : isConnected && pendingSyncCount > 0
                  ? `${pendingSyncCount} Data Menunggu Pengiriman Ulang ke Spreadsheet`
                  : 'Menghubungkan Otomatis ke Tautan Cloud Sekolah'}
              </span>
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {isConnected && pendingSyncCount === 0
                ? 'Presensi Anda langsung tersimpan dan terekap otomatis ke server utama & rekapan sekolah tanpa perlu input URL manual.'
                : isConnected && pendingSyncCount > 0
                ? 'Presensi aman tersimpan di perangkat ini dan akan otomatis terkirim begitu sinyal internet stabil.'
                : 'Pastikan Anda membuka link presensi resmi dari grup WhatsApp PKL sekolah agar data otomatis masuk ke Spreadsheet Administrator.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold ${
            isConnected && pendingSyncCount === 0
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-amber-800 bg-amber-50 border-amber-200'
          }`}>
            {isConnected && pendingSyncCount === 0
              ? 'Terhubung Otomatis'
              : isConnected && pendingSyncCount > 0
              ? `Antrean: ${pendingSyncCount}`
              : 'Mode Antrean Lokal'}
          </span>
          <button
            onClick={() => syncWithCloud(true)}
            disabled={isCloudSyncing}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-semibold border border-blue-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span className={isCloudSyncing ? 'animate-spin inline-block' : ''}>🔄</span>
            <span>{isCloudSyncing ? 'Menyinkronkan...' : pendingSyncCount > 0 ? 'Kirim & Cek Status' : 'Cek Status Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Greeting & Identity Hero Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Siswa Praktik Kerja Lapangan (TKR Semakasari)
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Selamat Datang, {user.nama}
            </h2>
            <p className="text-xs text-slate-600 flex items-center gap-2 flex-wrap mt-1">
              <span>NIS: <strong className="font-mono text-slate-900">{user.nis}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Kelas: {user.kelas || 'XII TKR 1'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-700">{user.jurusan}</span>
            </p>
          </div>

          {/* Real-time Clock Widget */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center md:text-right shrink-0">
            <div className="flex items-center justify-center md:justify-end gap-1.5 text-blue-700 text-xs font-semibold mb-0.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Zona Waktu Asia/Jakarta (WIB)</span>
            </div>
            <div className="text-3xl font-black font-mono tabular-nums text-slate-900 tracking-wider">
              {digitalTime}
            </div>
            <div className="text-xs text-slate-600 mt-1 flex items-center justify-center md:justify-end gap-1">
              <Calendar className="w-3 h-3 text-amber-600" />
              {formatIndonesianDate(todayDate)}
            </div>
          </div>
        </div>

        {/* Detailed Identity Badges */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <School className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 font-medium block">Asal Sekolah</span>
              <p className="font-semibold text-slate-900 truncate">{user.asalSekolah}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 font-medium block">Tempat PKL</span>
              <p className="font-semibold text-slate-900 truncate">{user.tempatPkl}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 font-medium block">Guru Pembimbing</span>
              <p className="font-semibold text-slate-900 truncate">{user.namaPembimbing}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATURAN JADWAL OPERASIONAL PRESENSI INFO BAR */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Aturan Jam Presensi Resmi Siswa PKL (WIB):
          </span>
          <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg font-mono tabular-nums font-semibold">
            Sekarang: {digitalTime} WIB
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
          <div className={`p-3 rounded-xl border ${
            timeRule.currentHour >= 4 && timeRule.currentHour < 9 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="font-bold block text-slate-900">1. Presensi Datang (Tepat Waktu)</span>
            <span>Pukul 04.00 – 08.59 WIB &bull; Status: <strong className="text-emerald-700">Hadir</strong></span>
          </div>

          <div className={`p-3 rounded-xl border ${
            timeRule.currentHour >= 9 && timeRule.currentHour < 12 
              ? 'bg-amber-50 border-amber-300 text-amber-900' 
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="font-bold block text-slate-900">2. Presensi Datang (Terlambat)</span>
            <span>Pukul 09.00 – 12.00 WIB &bull; Status: <strong className="text-amber-700">Terlambat</strong></span>
          </div>

          <div className={`p-3 rounded-xl border ${
            timeRule.currentHour >= 15 && timeRule.currentHour <= 23 
              ? 'bg-blue-50 border-blue-300 text-blue-900' 
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="font-bold block text-slate-900">3. Presensi Pulang</span>
            <span>Pukul 15.00 – 23.00 WIB &bull; Wajib foto & GPS</span>
          </div>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE STATUS CARD */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Status Presensi Hari Ini ({todayDate})
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
            hasCheckedOut 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : hasCheckedIn 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : timeRule.currentHour >= 12
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {getTodayStatusLabel()}
          </span>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Card Datang */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                hasCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/80 text-slate-500'
              }`}>
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Jam Masuk (Datang)</p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {hasCheckedIn ? `${todayRecord?.jamDatang} WIB` : '--:--:--'}
                </p>
                {todayRecord?.koordinatGps && (
                  <p className="text-[10px] text-blue-700 font-mono mt-0.5">
                    📍 {todayRecord.koordinatGps}
                  </p>
                )}
              </div>
            </div>
            {hasCheckedIn && (
              <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${
                todayRecord?.status === 'Hadir' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {todayRecord?.status}
              </span>
            )}
          </div>

          {/* Card Pulang */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                hasCheckedOut ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-500'
              }`}>
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Jam Kepulangan (Pulang)</p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {hasCheckedOut ? `${todayRecord?.jamPulang} WIB` : '--:--:--'}
                </p>
                {todayRecord?.koordinatPulang && (
                  <p className="text-[10px] text-blue-700 font-mono mt-0.5">
                    📍 {todayRecord.koordinatPulang}
                  </p>
                )}
              </div>
            </div>
            {hasCheckedOut && (
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Selesai
              </span>
            )}
          </div>

        </div>

        {/* Bukti Foto & Titik Koordinat Preview (Jika Sudah Diambil) */}
        {todayRecord?.fotoBukti && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <img 
                src={todayRecord.fotoBukti} 
                alt="Bukti Kehadiran Bengkel" 
                className="w-16 h-12 object-cover rounded-lg border border-slate-300 shrink-0" 
              />
              <div>
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  Foto Bukti Kehadiran di Bengkel Tersimpan
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Titik GPS: <span className="font-mono text-blue-700 font-semibold">{todayRecord.koordinatGps || '-'}</span>
                </p>
              </div>
            </div>

            {todayRecord.mapsUrl && (
              <a
                href={todayRecord.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition self-end sm:self-auto"
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
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Tombol Tindakan Utama Presensi
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* TOMBOL PRESENSI DATANG */}
          <button
            onClick={handleOpenCheckInModal}
            disabled={hasCheckedIn || isSubmitting || !timeRule.canCheckIn}
            className={`p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden group text-left ${
              hasCheckedIn
                ? 'bg-emerald-50/70 border border-emerald-200 cursor-not-allowed'
                : !timeRule.canCheckIn
                ? 'bg-slate-100 border border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-emerald-500'
            }`}
          >
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                hasCheckedIn 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : !timeRule.canCheckIn
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-white/20 text-white backdrop-blur-md'
              }`}>
                <LogIn className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                hasCheckedIn 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : !timeRule.canCheckIn
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
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
              <h4 className={`text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 ${
                hasCheckedIn || !timeRule.canCheckIn ? 'text-slate-800' : 'text-white'
              }`}>
                PRESENSI DATANG
              </h4>
              <p className={`text-xs leading-relaxed ${
                hasCheckedIn || !timeRule.canCheckIn ? 'text-slate-600' : 'text-emerald-50'
              }`}>
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
                ? 'bg-blue-50/70 border border-blue-200 cursor-not-allowed'
                : !timeRule.canCheckOut
                ? 'bg-slate-100 border border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-blue-500'
            }`}
          >
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                hasCheckedOut 
                  ? 'bg-blue-100 text-blue-700' 
                  : !timeRule.canCheckOut
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-white/20 text-white backdrop-blur-md'
              }`}>
                <LogOut className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                hasCheckedOut
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : !timeRule.canCheckOut
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
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
              <h4 className={`text-lg sm:text-xl font-black tracking-tight flex items-center gap-2 ${
                hasCheckedOut || !timeRule.canCheckOut ? 'text-slate-800' : 'text-white'
              }`}>
                PRESENSI PULANG
              </h4>
              <p className={`text-xs leading-relaxed ${
                hasCheckedOut || !timeRule.canCheckOut ? 'text-slate-600' : 'text-blue-50'
              }`}>
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
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-900">Riwayat Kehadiran Lengkap Anda</p>
          <p className="text-[11px] text-slate-600">Lihat rekap presensi per bulan, jam kedatangan, foto bukti, dan koordinat GPS.</p>
        </div>
        <button
          onClick={onNavigateToHistory}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 shadow-sm"
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

    </div>
  );
};
