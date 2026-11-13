import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus } from '../types/pkl';
import { StorageService, formatIndonesianDate, getJakartaDate, getAttendanceSplitStatus } from '../services/storage';
import { 
  Search, 
  Filter, 
  Edit, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  X,
  Plus,
  MapPin,
  ExternalLink,
  Camera,
  Navigation,
  Eye,
  ShieldCheck,
  Compass
} from 'lucide-react';

export const AdminAttendanceManagement: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(StorageService.getAttendance());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTahun, setSelectedTahun] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const tahunConfig = StorageService.getTahunAjaranConfig();
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    mapsUrl?: string;
    coords?: string;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const isConnected = StorageService.isGoogleSheetConnected();

  const reloadData = () => {
    setRecords(StorageService.getAttendance());
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCloudPull = async () => {
    setIsSyncing(true);
    try {
      const serverRecords = await StorageService.fetchAttendanceFromServer();
      setRecords(serverRecords);

      if (StorageService.isGoogleSheetConnected()) {
        const res = await StorageService.pullAttendanceFromCloud();
        reloadData();
        showToast(res.message);
      } else {
        showToast(`Sinkronisasi server selesai. Total: ${serverRecords.length} data.`);
      }
    } catch (e: any) {
      showToast('Gagal menarik data: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync on mount and poll server every 8s for live attendance from student mobile phones
  React.useEffect(() => {
    handleCloudPull();

    const interval = setInterval(() => {
      StorageService.fetchAttendanceFromServer().then(recs => setRecords(recs));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecord({ ...record });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const toSave: AttendanceRecord = { ...editingRecord };
    if (toSave.koordinatGps && toSave.koordinatGps !== '-') {
      toSave.mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(toSave.koordinatGps.trim())}`;
    }
    if (toSave.koordinatPulang && toSave.koordinatPulang !== '-') {
      toSave.mapsUrlPulang = `https://www.google.com/maps?q=${encodeURIComponent(toSave.koordinatPulang.trim())}`;
    }

    StorageService.addOrUpdateAttendance(toSave);
    showToast(`Presensi atas nama ${toSave.namaSiswa} berhasil dikoreksi.`);
    setShowEditModal(false);
    reloadData();

    // Sync edited record to Google Spreadsheet
    if (StorageService.isGoogleSheetConnected()) {
      const action = toSave.jamPulang && toSave.jamPulang !== '-' ? 'CHECK_OUT' : 'CHECK_IN';
      StorageService.syncToGoogleSheet(action, toSave).catch(err => console.warn('Edit sync error:', err));
    }
  };

  const filtered = records.filter(r => {
    const matchesQuery = !searchQuery || 
      r.namaSiswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tempatPkl.toLowerCase().includes(searchQuery.toLowerCase());

    const { statusDatang, statusPulang } = getAttendanceSplitStatus(r);
    const matchesStatus =
      selectedStatus === 'all' ||
      r.status === selectedStatus ||
      statusDatang === selectedStatus ||
      statusPulang === selectedStatus;
    const matchesDate = !selectedDate || r.tanggal === selectedDate;
    const matchesTahun = selectedTahun === 'all' || (r.tahunAjaran || tahunConfig.tahunAktif) === selectedTahun;

    return matchesQuery && matchesStatus && matchesDate && matchesTahun;
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Manajemen & Koreksi Data Absensi Siswa</h2>
          <p className="text-xs text-slate-400">
            Koreksi jam kedatangan, kepulangan, penyesuaian status izin/sakit, dan catatan pembimbing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCloudPull}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            title="Tarik data presensi langsung dari Google Spreadsheet"
          >
            <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
            <span>{isSyncing ? 'Menarik...' : 'Tarik Data Terbaru'}</span>
          </button>
          <span className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            Total: <strong className="text-white">{records.length}</strong> Presensi
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Siswa, NIS, atau Tempat PKL..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Tanggal:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate('')}
              className="text-slate-500 hover:text-white text-[11px]"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Tahun Ajaran:</label>
          <select
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Periode</option>
            {tahunConfig.daftarTahun.map((t) => (
              <option key={t} value={t}>
                {t} {t === tahunConfig.tahunAktif ? '(Aktif)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
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
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
              <th className="p-3.5 font-semibold">Tanggal</th>
              <th className="p-3.5 font-semibold">Siswa / NIS</th>
              <th className="p-3.5 font-semibold">Tempat PKL & Jurusan</th>
              <th className="p-3.5 font-semibold">Jam Datang & Peta</th>
              <th className="p-3.5 font-semibold">Status Datang</th>
              <th className="p-3.5 font-semibold">Jam Pulang & Peta</th>
              <th className="p-3.5 font-semibold">Status Pulang</th>
              <th className="p-3.5 font-semibold">Keterangan</th>
              <th className="p-3.5 font-semibold text-right">Koreksi Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  Tidak ada catatan presensi yang cocok dengan filter yang dipilih.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const { statusDatang, statusPulang } = getAttendanceSplitStatus(r);
                return (
                <tr key={r.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="font-medium text-white">{r.tanggal}</span>
                    <p className="text-[10px] text-slate-500">{formatIndonesianDate(r.tanggal).split(',')[0]}</p>
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-white text-xs">{r.namaSiswa}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-cyan-400 font-semibold">{r.nis}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {r.kelas || 'XII TKR 1'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <p className="text-slate-200 font-medium">{r.tempatPkl}</p>
                    <p className="text-[10px] text-slate-500">{r.jurusan}</p>
                  </td>
                  
                  {/* Jam Datang + Koordinat Map */}
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="font-mono text-emerald-400 font-bold block">{r.jamDatang} WIB</span>
                    {r.koordinatGps && r.koordinatGps !== '-' ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <a
                          href={r.mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(r.koordinatGps)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 hover:underline bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/50"
                          title="Buka titik koordinat presensi datang di Google Maps"
                        >
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[100px]">{r.koordinatGps}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                        {r.fotoBukti && (
                          <button
                            onClick={() => setPreviewPhotoModal({
                              url: r.fotoBukti!,
                              title: `Foto Presensi Datang: ${r.namaSiswa}`,
                              subtitle: `Pukul ${r.jamDatang} WIB • ${r.tempatPkl}`,
                              mapsUrl: r.mapsUrl,
                              coords: r.koordinatGps,
                            })}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 transition"
                            title="Lihat foto bukti datang"
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 block mt-0.5">Tanpa koordinat</span>
                    )}
                  </td>

                  {/* Status Datang */}
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      statusDatang === 'Hadir' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : statusDatang === 'Terlambat' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : statusDatang === 'Tidak Disiplin' || statusDatang === 'Belum Datang'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : statusDatang === 'Alpha'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-500/20 text-cyan-300 border border-blue-500/30'
                    }`}>
                      {statusDatang}
                    </span>
                  </td>

                  {/* Jam Pulang + Koordinat Map */}
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="font-mono text-cyan-400 font-bold block">
                      {r.jamPulang && r.jamPulang !== '-' ? `${r.jamPulang} WIB` : '-'}
                    </span>
                    {r.koordinatPulang && r.koordinatPulang !== '-' ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <a
                          href={r.mapsUrlPulang || `https://www.google.com/maps?q=${encodeURIComponent(r.koordinatPulang)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/50"
                          title="Buka titik koordinat presensi pulang di Google Maps"
                        >
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[100px]">{r.koordinatPulang}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                        {r.fotoPulang && (
                          <button
                            onClick={() => setPreviewPhotoModal({
                              url: r.fotoPulang!,
                              title: `Foto Presensi Pulang: ${r.namaSiswa}`,
                              subtitle: `Pukul ${r.jamPulang} WIB • ${r.tempatPkl}`,
                              mapsUrl: r.mapsUrlPulang,
                              coords: r.koordinatPulang,
                            })}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
                            title="Lihat foto bukti pulang"
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {r.jamPulang && r.jamPulang !== '-' ? 'Tanpa koordinat' : 'Belum pulang'}
                      </span>
                    )}
                  </td>

                  {/* Status Pulang */}
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      statusPulang === 'Sudah Pulang'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : statusPulang === 'Belum Pulang'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : statusPulang === 'Alpha'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-500/20 text-cyan-300 border border-blue-500/30'
                    }`}>
                      {statusPulang}
                    </span>
                  </td>

                  <td className="p-3.5 text-slate-300 max-w-xs">
                    <p className="truncate" title={r.keterangan}>{r.keterangan || '-'}</p>
                  </td>

                  <td className="p-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEditClick(r)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl text-[11px] font-semibold transition inline-flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm"
                    >
                      <Edit className="w-3 h-3 text-cyan-400" />
                      <span>Koreksi & Map</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[92vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Koreksi Data Absensi & Koordinat Map</h3>
                  <p className="text-xs text-slate-400">Verifikasi jam hadir, pulang, dan titik koordinat Google Maps</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Student Identity Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white text-sm">{editingRecord.namaSiswa}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    NIS: <span className="font-mono text-cyan-300 font-bold">{editingRecord.nis}</span> • {editingRecord.jurusan}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                    Tempat PKL: {editingRecord.tempatPkl}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">Tanggal Presensi</span>
                  <span className="text-xs font-mono font-bold text-white bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    {editingRecord.tanggal}
                  </span>
                </div>
              </div>

              {/* =========================================================================
                  SEKSI KHUSUS: HASIL DATA KOORDINAT MAP HASIL DARI ABSENSI DATANG & PULANG
                  ========================================================================= */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    Hasil Data Koordinat Map HP & Bukti Foto Bengkel:
                  </span>
                  <span className="text-[10px] text-slate-400">Terekam via GPS Otomatis</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* 1. HASIL KOORDINAT DATANG */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        Koordinat Presensi Datang
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                        {editingRecord.jamDatang} WIB
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">Titik Koordinat GPS:</span>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                        <span className="truncate">{editingRecord.koordinatGps || 'Belum ada data koordinat'}</span>
                        {editingRecord.koordinatGps && (
                          <a
                            href={editingRecord.mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(editingRecord.koordinatGps)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0 ml-1 border border-emerald-500/40"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Peta Map
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Bukti Foto Datang */}
                    {editingRecord.fotoBukti ? (
                      <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800">
                        <img
                          src={editingRecord.fotoBukti}
                          alt="Foto Datang"
                          className="w-12 h-10 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer hover:opacity-90"
                          onClick={() => setPreviewPhotoModal({
                            url: editingRecord.fotoBukti!,
                            title: `Foto Presensi Datang: ${editingRecord.namaSiswa}`,
                            subtitle: `Pukul ${editingRecord.jamDatang} WIB • ${editingRecord.tempatPkl}`,
                            mapsUrl: editingRecord.mapsUrl,
                            coords: editingRecord.koordinatGps,
                          })}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-white font-medium flex items-center gap-1">
                            <Camera className="w-3 h-3 text-emerald-400" /> Foto Bengkel Datang
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
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Eye className="w-3 h-3" /> Perbesar Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
                        Tidak ada bukti foto kedatangan
                      </p>
                    )}

                    {/* Input Penyesuaian Koordinat Datang */}
                    <div className="pt-1">
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Koreksi Koordinat Datang (Opsional):
                      </label>
                      <input
                        type="text"
                        value={editingRecord.koordinatGps || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, koordinatGps: e.target.value })}
                        placeholder="Contoh: -8.37512, 114.12945"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* 2. HASIL KOORDINAT PULANG */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-cyan-400" />
                        Koordinat Presensi Pulang
                      </span>
                      <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                        {editingRecord.jamPulang && editingRecord.jamPulang !== '-' ? `${editingRecord.jamPulang} WIB` : 'Belum Pulang'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">Titik Koordinat GPS:</span>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                        <span className="truncate">{editingRecord.koordinatPulang || 'Belum ada data koordinat'}</span>
                        {editingRecord.koordinatPulang && (
                          <a
                            href={editingRecord.mapsUrlPulang || `https://www.google.com/maps?q=${encodeURIComponent(editingRecord.koordinatPulang)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 text-[10px] font-bold flex items-center gap-1 shrink-0 ml-1 border border-blue-500/40"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Peta Map
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Bukti Foto Pulang */}
                    {editingRecord.fotoPulang ? (
                      <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800">
                        <img
                          src={editingRecord.fotoPulang}
                          alt="Foto Pulang"
                          className="w-12 h-10 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer hover:opacity-90"
                          onClick={() => setPreviewPhotoModal({
                            url: editingRecord.fotoPulang!,
                            title: `Foto Presensi Pulang: ${editingRecord.namaSiswa}`,
                            subtitle: `Pukul ${editingRecord.jamPulang} WIB • ${editingRecord.tempatPkl}`,
                            mapsUrl: editingRecord.mapsUrlPulang,
                            coords: editingRecord.koordinatPulang,
                          })}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-white font-medium flex items-center gap-1">
                            <Camera className="w-3 h-3 text-cyan-400" /> Foto Bengkel Pulang
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
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Eye className="w-3 h-3" /> Perbesar Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
                        Tidak ada bukti foto kepulangan
                      </p>
                    )}

                    {/* Input Penyesuaian Koordinat Pulang */}
                    <div className="pt-1">
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Koreksi Koordinat Pulang (Opsional):
                      </label>
                      <input
                        type="text"
                        value={editingRecord.koordinatPulang || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, koordinatPulang: e.target.value })}
                        placeholder="Contoh: -8.37515, 114.12948"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jam Datang (WIB)</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.jamDatang}
                    onChange={(e) => setEditingRecord({ ...editingRecord, jamDatang: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jam Pulang (WIB)</label>
                  <input
                    type="text"
                    value={editingRecord.jamPulang}
                    onChange={(e) => setEditingRecord({ ...editingRecord, jamPulang: e.target.value })}
                    placeholder="Contoh: 16:00:00 atau -"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status Absen Datang</label>
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
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
                  <label className="block text-slate-300 font-medium mb-1">Status Absen Pulang</label>
                  <select
                    value={getAttendanceSplitStatus(editingRecord).statusPulang}
                    onChange={(e) => setEditingRecord({ ...editingRecord, statusPulang: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
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
                <label className="block text-slate-300 font-medium mb-1">Keterangan / Catatan Koreksi Pembimbing</label>
                <textarea
                  rows={2}
                  value={editingRecord.keterangan}
                  onChange={(e) => setEditingRecord({ ...editingRecord, keterangan: e.target.value })}
                  placeholder="Tambahkan catatan koreksi atau penyesuaian..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Koreksi & Koordinat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo & GPS Lightbox Modal */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h4 className="font-bold text-white text-sm">{previewPhotoModal.title}</h4>
                {previewPhotoModal.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{previewPhotoModal.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewPhotoModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-[380px]">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="w-full h-auto max-h-[380px] object-contain"
              />
            </div>

            {previewPhotoModal.coords && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Titik Koordinat Map:</span>
                  <p className="font-mono text-cyan-300 font-bold">📍 {previewPhotoModal.coords}</p>
                </div>
                <a
                  href={previewPhotoModal.mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(previewPhotoModal.coords)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
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
