import React, { useState, useRef, useMemo, useCallback } from 'react';
import { AttendanceRecord, AttendanceStatus, TahunAjaranConfig } from '../types/pkl';
import { StorageService, formatIndonesianDate, getAttendanceSplitStatus } from '../services/storage';
import { sortAttendanceRecordsDeterministic, getAttendanceSignature } from '../utils/attendanceUtils';
import {
  Search,
  Edit,
  CheckCircle2,
  X,
  MapPin,
  ExternalLink,
  Camera,
  Eye,
  Compass,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

export const AdminAttendanceManagement: React.FC = () => {
  const initialRecords = useMemo(() => sortAttendanceRecordsDeterministic(StorageService.getAttendance()), []);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTahun, setSelectedTahun] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [tahunConfig, setTahunConfig] = useState<TahunAjaranConfig>(() => StorageService.getTahunAjaranConfig());
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    mapsUrl?: string;
    coords?: string;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const recordsSigRef = useRef<string>(getAttendanceSignature(initialRecords));
  const tahunSigRef = useRef<string>(JSON.stringify(tahunConfig));
  const pullingRef = useRef<boolean>(false);
  const modalOpenRef = useRef<boolean>(false);
  modalOpenRef.current = showEditModal || Boolean(previewPhotoModal);

  const reloadData = useCallback(() => {
    const nextRecords = sortAttendanceRecordsDeterministic(StorageService.getAttendance());
    const nextSig = getAttendanceSignature(nextRecords);
    if (nextSig !== recordsSigRef.current) {
      recordsSigRef.current = nextSig;
      setRecords(nextRecords);
    }

    const nextTahun = StorageService.getTahunAjaranConfig();
    const nextTahunSig = JSON.stringify(nextTahun);
    if (nextTahunSig !== tahunSigRef.current) {
      tahunSigRef.current = nextTahunSig;
      setTahunConfig(nextTahun);
    }
  }, []);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const handleCloudPull = useCallback(async (silent = false) => {
    if (pullingRef.current) return;
    pullingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      await StorageService.ensureConfigSynced();
      const serverRecords = await StorageService.fetchAttendanceFromServer();

      if (StorageService.isGoogleSheetConnected()) {
        const res = await StorageService.pullAttendanceFromCloud();
        reloadData();
        if (!silent) showToast(res.message);
      } else {
        reloadData();
        if (!silent) {
          showToast(`Sinkronisasi server selesai. Total: ${serverRecords.length} data.`);
        }
      }
    } catch (e: any) {
      if (!silent) showToast('Gagal menarik data: ' + (e?.message || 'Jaringan error'));
    } finally {
      pullingRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  }, [reloadData, showToast]);

  // Auto-sync on mount and poll calmly every 12s (paused when modal open or tab hidden)
  React.useEffect(() => {
    const onSyncUpdate = () => reloadData();
    window.addEventListener('pkl-sync-updated', onSyncUpdate);

    handleCloudPull(true);

    const interval = setInterval(() => {
      if (modalOpenRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      handleCloudPull(true);
    }, 12000);

    return () => {
      window.removeEventListener('pkl-sync-updated', onSyncUpdate);
      clearInterval(interval);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [handleCloudPull, reloadData]);

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecord({ ...record });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const nowIso = new Date().toISOString();
    const toSave: AttendanceRecord = {
      ...editingRecord,
      recordedAt: nowIso,
      syncedAt: nowIso,
    };
    if (toSave.koordinatGps && toSave.koordinatGps !== '-') {
      toSave.mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(String(toSave.koordinatGps).trim())}`;
    }
    if (toSave.koordinatPulang && toSave.koordinatPulang !== '-') {
      toSave.mapsUrlPulang = `https://www.google.com/maps?q=${encodeURIComponent(String(toSave.koordinatPulang).trim())}`;
    }

    StorageService.addOrUpdateAttendance(toSave);
    showToast(`Presensi atas nama ${toSave.namaSiswa || 'Siswa'} berhasil dikoreksi.`);
    setShowEditModal(false);
    reloadData();

    // Sync edited record to Server API & Google Spreadsheet
    const action = toSave.jamPulang && toSave.jamPulang !== '-' ? 'CHECK_OUT' : 'CHECK_IN';
    StorageService.syncToGoogleSheet(action, toSave).catch(err => console.warn('Edit sync error:', err));
  };

  const hasActiveFilter = Boolean(searchQuery || selectedStatus !== 'all' || selectedTahun !== 'all' || selectedDate);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedTahun('all');
    setSelectedDate('');
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = records.filter(r => {
      if (!r) return false;
      const nama = String(r.namaSiswa ?? '').toLowerCase();
      const nis = String(r.nis ?? '').toLowerCase();
      const tempat = String(r.tempatPkl ?? '').toLowerCase();
      const matchesQuery = !q || nama.includes(q) || nis.includes(q) || tempat.includes(q);

      const { statusDatang, statusPulang } = getAttendanceSplitStatus(r);
      const matchesStatus =
        selectedStatus === 'all' ||
        r.status === selectedStatus ||
        statusDatang === selectedStatus ||
        statusPulang === selectedStatus;
      const matchesDate = !selectedDate || String(r.tanggal || '') === selectedDate;
      const matchesTahun =
        selectedTahun === 'all' ||
        (String(r.tahunAjaran || '').trim() || tahunConfig.tahunAktif) === selectedTahun;

      return matchesQuery && matchesStatus && matchesDate && matchesTahun;
    });
    return sortAttendanceRecordsDeterministic(list);
  }, [records, searchQuery, selectedStatus, selectedDate, selectedTahun, tahunConfig.tahunAktif]);

  return (
    <div className="space-y-5">
      {/* Floating Non-Shifting Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-md p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2.5 shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium leading-snug">{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded cursor-pointer shrink-0"
            aria-label="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">Manajemen & Koreksi Data Absensi Siswa</h2>
          <p className="text-xs text-slate-600">
            Koreksi jam kedatangan, kepulangan, penyesuaian status datang/pulang, izin/sakit, dan koordinat GPS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCloudPull(false)}
            disabled={isSyncing}
            className="w-[172px] justify-center px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60 whitespace-nowrap"
            title="Tarik data presensi langsung dari Google Spreadsheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Tarik Data Terbaru'}</span>
          </button>
          <span className="min-w-[132px] text-center text-xs text-slate-600 font-mono bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm whitespace-nowrap tabular-nums">
            Total: <strong className="text-slate-900">{records.length}</strong> Presensi
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Siswa, NIS, atau Tempat PKL..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-slate-600 font-medium">Tanggal:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-slate-600 font-medium">Tahun Ajaran:</label>
          <select
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
          >
            <option value="all">Semua Periode</option>
            {tahunConfig.daftarTahun.map((t) => (
              <option key={t} value={t}>
                {t} {t === tahunConfig.tahunAktif ? '(Aktif)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-slate-600 font-medium">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
          >
            <option value="all">Semua Status</option>
            <option value="Hadir">Datang: Hadir (Tepat Waktu)</option>
            <option value="Terlambat">Datang: Terlambat</option>
            <option value="Tidak Disiplin">Datang: Tidak Disiplin</option>
            <option value="Belum Datang">Datang: Belum Datang</option>
            <option value="Sudah Pulang">Pulang: Sudah Pulang</option>
            <option value="Belum Pulang">Pulang: Belum Pulang</option>
            <option value="Alpha">Alpha (Tanpa Keterangan)</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
          </select>
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {/* Records Table with Fixed Column Proportions (Prevents Horizontal Column Shifting) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1080px] table-fixed text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <th className="p-3.5 font-semibold w-[120px]">Tanggal</th>
              <th className="p-3.5 font-semibold w-[185px]">Siswa / NIS</th>
              <th className="p-3.5 font-semibold w-[185px]">Tempat PKL &amp; Jurusan</th>
              <th className="p-3.5 font-semibold w-[165px]">Jam Datang &amp; Peta</th>
              <th className="p-3.5 font-semibold w-[115px]">Status Datang</th>
              <th className="p-3.5 font-semibold w-[165px]">Jam Pulang &amp; Peta</th>
              <th className="p-3.5 font-semibold w-[120px]">Status Pulang</th>
              <th className="p-3.5 font-semibold w-[155px]">Keterangan</th>
              <th className="p-3.5 font-semibold w-[125px] text-right">Koreksi Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  {records.length === 0 ? (
                    <div className="space-y-2">
                      <p className="font-medium text-slate-700">Belum ada catatan presensi siswa yang tersimpan.</p>
                      <button
                        type="button"
                        onClick={() => handleCloudPull(false)}
                        disabled={isSyncing}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold cursor-pointer"
                      >
                        Tarik Data dari Server &amp; Spreadsheet
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium text-slate-700">
                        Tidak ada catatan presensi yang cocok dengan filter ({records.length} data tersimpan di periode lain/filter berbeda).
                      </p>
                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold cursor-pointer"
                        >
                          Tampilkan Semua ({records.length}) Data
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const { statusDatang, statusPulang } = getAttendanceSplitStatus(r);
                const formattedDay = String(formatIndonesianDate(r.tanggal) || '-').split(',')[0] || '-';
                const safeNama = String(r.namaSiswa || 'Siswa PKL');
                const safeNis = String(r.nis || '-');
                const safeTempat = String(r.tempatPkl || '-');
                const safeJurusan = String(r.jurusan || 'Teknik Kendaraan Ringan (TKR)');
                const safeJamDatang = String(r.jamDatang || '-');
                const safeJamPulang = String(r.jamPulang || '-');
                const safeKet = String(r.keterangan || '-');

                return (
                  <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3.5 align-top">
                      <span className="font-semibold text-slate-900 font-mono block truncate">{r.tanggal || '-'}</span>
                      <p className="text-[10px] text-slate-500 truncate">{formattedDay}</p>
                    </td>
                    <td className="p-3.5 align-top">
                      <p className="font-bold text-slate-900 text-xs truncate" title={safeNama}>{safeNama}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <span className="font-mono text-[10px] text-blue-700 font-semibold truncate">{safeNis}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          {r.kelas || 'XII TKR 1'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 align-top">
                      <p className="text-slate-800 font-medium truncate" title={safeTempat}>{safeTempat}</p>
                      <p className="text-[10px] text-slate-500 truncate" title={safeJurusan}>{safeJurusan}</p>
                    </td>

                    {/* Jam Datang + Koordinat Map */}
                    <td className="p-3.5 align-top">
                      <span className="font-mono tabular-nums text-emerald-700 font-bold block truncate">
                        {safeJamDatang !== '-' ? `${safeJamDatang} WIB` : '-'}
                      </span>
                      {r.koordinatGps && r.koordinatGps !== '-' ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <a
                            href={r.mapsUrl && r.mapsUrl !== '-' ? r.mapsUrl : `https://www.google.com/maps?q=${encodeURIComponent(r.koordinatGps)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 hover:text-emerald-800 hover:underline bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 max-w-[125px]"
                            title="Buka titik koordinat presensi datang di Google Maps"
                          >
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{r.koordinatGps}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
                          </a>
                          {r.fotoBukti && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoModal({
                                url: r.fotoBukti!,
                                title: `Foto Presensi Datang: ${safeNama}`,
                                subtitle: `Pukul ${safeJamDatang} WIB • ${safeTempat}`,
                                mapsUrl: r.mapsUrl,
                                coords: r.koordinatGps,
                              })}
                              className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                              title="Lihat foto bukti datang"
                            >
                              <Camera className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 block mt-0.5">Tanpa koordinat</span>
                      )}
                    </td>

                    {/* Status Datang */}
                    <td className="p-3.5 align-top">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap ${
                        statusDatang === 'Hadir'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : statusDatang === 'Terlambat'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : statusDatang === 'Tidak Disiplin' || statusDatang === 'Belum Datang' || statusDatang === 'Alpha'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {statusDatang}
                      </span>
                    </td>

                    {/* Jam Pulang + Koordinat Map */}
                    <td className="p-3.5 align-top">
                      <span className="font-mono tabular-nums text-blue-700 font-bold block truncate">
                        {safeJamPulang !== '-' ? `${safeJamPulang} WIB` : '-'}
                      </span>
                      {r.koordinatPulang && r.koordinatPulang !== '-' ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <a
                            href={r.mapsUrlPulang && r.mapsUrlPulang !== '-' ? r.mapsUrlPulang : `https://www.google.com/maps?q=${encodeURIComponent(r.koordinatPulang)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-700 hover:text-blue-800 hover:underline bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 max-w-[125px]"
                            title="Buka titik koordinat presensi pulang di Google Maps"
                          >
                            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="truncate">{r.koordinatPulang}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
                          </a>
                          {r.fotoPulang && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoModal({
                                url: r.fotoPulang!,
                                title: `Foto Presensi Pulang: ${safeNama}`,
                                subtitle: `Pukul ${safeJamPulang} WIB • ${safeTempat}`,
                                mapsUrl: r.mapsUrlPulang,
                                coords: r.koordinatPulang,
                              })}
                              className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer shrink-0"
                              title="Lihat foto bukti pulang"
                            >
                              <Camera className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {safeJamPulang !== '-' ? 'Tanpa koordinat' : 'Belum pulang'}
                        </span>
                      )}
                    </td>

                    {/* Status Pulang */}
                    <td className="p-3.5 align-top">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap ${
                        statusPulang === 'Sudah Pulang'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : statusPulang === 'Belum Pulang'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : statusPulang === 'Alpha'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {statusPulang}
                      </span>
                    </td>

                    <td className="p-3.5 align-top text-slate-600">
                      <p className="truncate" title={safeKet}>{safeKet}</p>
                    </td>

                    <td className="p-3.5 align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleEditClick(r)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-sm"
                      >
                        <Edit className="w-3 h-3 text-blue-600" />
                        <span>Koreksi &amp; Map</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Attendance Record Modal with GPS MAPS & PHOTO EVIDENCE */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-slate-700 my-6 max-h-[92vh] flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />

            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 pt-1 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Koreksi Data Absensi &amp; Koordinat Map</h3>
                  <p className="text-xs text-slate-500">Verifikasi jam hadir, pulang, dan titik koordinat Google Maps</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Student Identity Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{editingRecord.namaSiswa}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    NIS: <span className="font-mono text-blue-700 font-bold">{editingRecord.nis}</span> • {editingRecord.jurusan}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    Tempat PKL: {editingRecord.tempatPkl}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">Tanggal Presensi</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
                    {editingRecord.tanggal}
                  </span>
                </div>
              </div>

              {/* SEKSI KOORDINAT MAP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Compass className="w-4 h-4 text-blue-600" />
                    Hasil Data Koordinat Map HP &amp; Bukti Foto Bengkel:
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Terekam via GPS Otomatis</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 1. HASIL KOORDINAT DATANG */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        Koordinat Presensi Datang
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {editingRecord.jamDatang} WIB
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-600 block">Titik Koordinat GPS:</span>
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-blue-700 flex items-center justify-between">
                        <span className="truncate">{editingRecord.koordinatGps || 'Belum ada data koordinat'}</span>
                        {editingRecord.koordinatGps && editingRecord.koordinatGps !== '-' && (
                          <a
                            href={editingRecord.mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(editingRecord.koordinatGps)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0 ml-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Peta Map
                          </a>
                        )}
                      </div>
                    </div>

                    {editingRecord.fotoBukti ? (
                      <div className="flex items-center gap-2.5 pt-1 border-t border-emerald-200">
                        <img
                          src={editingRecord.fotoBukti}
                          alt="Foto Datang"
                          className="w-12 h-10 object-cover rounded-lg border border-slate-300 shrink-0 cursor-pointer hover:opacity-90"
                          onClick={() => setPreviewPhotoModal({
                            url: editingRecord.fotoBukti!,
                            title: `Foto Presensi Datang: ${editingRecord.namaSiswa}`,
                            subtitle: `Pukul ${editingRecord.jamDatang} WIB • ${editingRecord.tempatPkl}`,
                            mapsUrl: editingRecord.mapsUrl,
                            coords: editingRecord.koordinatGps,
                          })}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-900 font-semibold flex items-center gap-1">
                            <Camera className="w-3 h-3 text-emerald-600" /> Foto Bengkel Datang
                          </p>
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoModal({
                              url: editingRecord.fotoBukti!,
                              title: `Foto Presensi Datang: ${editingRecord.namaSiswa}`,
                              subtitle: `Pukul ${editingRecord.jamDatang} WIB • ${editingRecord.tempatPkl}`,
                              mapsUrl: editingRecord.mapsUrl,
                              coords: editingRecord.koordinatGps,
                            })}
                            className="text-[10px] text-blue-700 font-semibold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Perbesar Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic pt-1 border-t border-emerald-200">
                        Tidak ada bukti foto kedatangan
                      </p>
                    )}

                    <div className="pt-1">
                      <label className="block text-[10px] text-slate-600 mb-1">
                        Koreksi Koordinat Datang (Opsional):
                      </label>
                      <input
                        type="text"
                        value={editingRecord.koordinatGps || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, koordinatGps: e.target.value })}
                        placeholder="Contoh: -8.37512, 114.12945"
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono text-[11px] focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* 2. HASIL KOORDINAT PULANG */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-800 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        Koordinat Presensi Pulang
                      </span>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {editingRecord.jamPulang && editingRecord.jamPulang !== '-' ? `${editingRecord.jamPulang} WIB` : 'Belum Pulang'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-600 block">Titik Koordinat GPS:</span>
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-blue-700 flex items-center justify-between">
                        <span className="truncate">{editingRecord.koordinatPulang || 'Belum ada data koordinat'}</span>
                        {editingRecord.koordinatPulang && editingRecord.koordinatPulang !== '-' && (
                          <a
                            href={editingRecord.mapsUrlPulang || `https://www.google.com/maps?q=${encodeURIComponent(editingRecord.koordinatPulang)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 shrink-0 ml-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Peta Map
                          </a>
                        )}
                      </div>
                    </div>

                    {editingRecord.fotoPulang ? (
                      <div className="flex items-center gap-2.5 pt-1 border-t border-blue-200">
                        <img
                          src={editingRecord.fotoPulang}
                          alt="Foto Pulang"
                          className="w-12 h-10 object-cover rounded-lg border border-slate-300 shrink-0 cursor-pointer hover:opacity-90"
                          onClick={() => setPreviewPhotoModal({
                            url: editingRecord.fotoPulang!,
                            title: `Foto Presensi Pulang: ${editingRecord.namaSiswa}`,
                            subtitle: `Pukul ${editingRecord.jamPulang} WIB • ${editingRecord.tempatPkl}`,
                            mapsUrl: editingRecord.mapsUrlPulang,
                            coords: editingRecord.koordinatPulang,
                          })}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-900 font-semibold flex items-center gap-1">
                            <Camera className="w-3 h-3 text-blue-600" /> Foto Bengkel Pulang
                          </p>
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoModal({
                              url: editingRecord.fotoPulang!,
                              title: `Foto Presensi Pulang: ${editingRecord.namaSiswa}`,
                              subtitle: `Pukul ${editingRecord.jamPulang} WIB • ${editingRecord.tempatPkl}`,
                              mapsUrl: editingRecord.mapsUrlPulang,
                              coords: editingRecord.koordinatPulang,
                            })}
                            className="text-[10px] text-blue-700 font-semibold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Perbesar Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic pt-1 border-t border-blue-200">
                        Tidak ada bukti foto kepulangan
                      </p>
                    )}

                    <div className="pt-1">
                      <label className="block text-[10px] text-slate-600 mb-1">
                        Koreksi Koordinat Pulang (Opsional):
                      </label>
                      <input
                        type="text"
                        value={editingRecord.koordinatPulang || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, koordinatPulang: e.target.value })}
                        placeholder="Contoh: -8.37515, 114.12948"
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-mono text-[11px] focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Jam Datang (WIB)</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.jamDatang}
                    onChange={(e) => setEditingRecord({ ...editingRecord, jamDatang: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Jam Pulang (WIB)</label>
                  <input
                    type="text"
                    value={editingRecord.jamPulang}
                    onChange={(e) => setEditingRecord({ ...editingRecord, jamPulang: e.target.value })}
                    placeholder="Contoh: 16:00:00 atau -"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Status Absen Datang</label>
                  <select
                    value={editingRecord.status}
                    onChange={(e) => {
                      const val = e.target.value as AttendanceStatus;
                      setEditingRecord({
                        ...editingRecord,
                        status: val,
                        statusDatang: val,
                        ...(val === 'Izin' || val === 'Sakit' || val === 'Alpha' ? { statusPulang: val } : {}),
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Hadir">Hadir (Tepat Waktu)</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Tidak Disiplin">Tidak Disiplin</option>
                    <option value="Alpha">Alpha (Tanpa Keterangan)</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Status Absen Pulang</label>
                  <select
                    value={getAttendanceSplitStatus(editingRecord).statusPulang}
                    onChange={(e) => setEditingRecord({ ...editingRecord, statusPulang: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Sudah Pulang">Sudah Pulang</option>
                    <option value="Belum Pulang">Belum Pulang</option>
                    <option value="Pulang Awal">Pulang Awal</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Alpha">Alpha</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Keterangan / Catatan Koreksi</label>
                <textarea
                  rows={2}
                  value={editingRecord.keterangan}
                  onChange={(e) => setEditingRecord({ ...editingRecord, keterangan: e.target.value })}
                  placeholder="Tambahkan catatan koreksi atau penyesuaian..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Koreksi &amp; Koordinat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo & GPS Lightbox Modal */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl relative text-slate-700 space-y-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 pt-1">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{previewPhotoModal.title}</h4>
                {previewPhotoModal.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5">{previewPhotoModal.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-[380px]">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="w-full h-auto max-h-[380px] object-contain"
              />
            </div>

            {previewPhotoModal.coords && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Titik Koordinat Map:</span>
                  <p className="font-mono text-blue-700 font-bold">{previewPhotoModal.coords}</p>
                </div>
                <a
                  href={previewPhotoModal.mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(previewPhotoModal.coords)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Buka di Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
