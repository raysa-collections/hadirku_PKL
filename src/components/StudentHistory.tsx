import React, { useState } from 'react';
import { User, AttendanceRecord } from '../types/pkl';
import { StorageService, formatIndonesianDate } from '../services/storage';
import { Calendar, Filter, CheckCircle2, Clock, FileText, ArrowLeft, Search } from 'lucide-react';

interface StudentHistoryProps {
  user: User;
  onBackToDashboard: () => void;
}

export const StudentHistory: React.FC<StudentHistoryProps> = ({ user, onBackToDashboard }) => {
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>(() => 
    StorageService.getAttendance().filter(r => r.nis === user.nis)
  );
  
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reloadData = () => {
    setAllRecords(StorageService.getAttendance().filter(r => r.nis === user.nis));
  };

  React.useEffect(() => {
    setIsRefreshing(true);
    StorageService.fetchAttendanceFromServer()
      .then(() => {
        reloadData();
        if (StorageService.isGoogleSheetConnected()) {
          return StorageService.pullAttendanceFromCloud();
        }
      })
      .then(reloadData)
      .catch(err => console.warn('History pull error:', err))
      .finally(() => setIsRefreshing(false));
  }, [user.nis]);

  // Filter records
  const filteredRecords = allRecords.filter(record => {
    const [y, m] = record.tanggal.split('-');
    const matchesMonth = selectedMonth === 'all' || m === selectedMonth;
    const matchesYear = selectedYear === 'all' || y === selectedYear;
    const matchesQuery = !searchQuery || 
      record.tanggal.includes(searchQuery) || 
      record.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMonth && matchesYear && matchesQuery;
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const totalHadir = filteredRecords.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length;
  const totalTerlambat = filteredRecords.filter(r => r.status === 'Terlambat').length;
  const totalHariKerja = filteredRecords.length;
  const persentase = totalHariKerja > 0 ? Math.round((totalHadir / totalHariKerja) * 100) : 100;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1.5 transition mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Dashboard
          </button>
          <h2 className="text-lg font-bold text-slate-900">Riwayat Kehadiran Siswa</h2>
          <p className="text-xs text-slate-600">
            Rekap catatan presensi PKL atas nama <span className="text-slate-900 font-semibold">{user.nama}</span> ({user.nis})
          </p>
        </div>

        {/* Quick Month Metrics */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-700 font-medium block">Total Hadir</span>
            <span className="text-sm font-bold text-emerald-700 tabular-nums">{totalHadir} Hari</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] text-amber-800 font-medium block">Terlambat</span>
            <span className="text-sm font-bold text-amber-700 tabular-nums">{totalTerlambat}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <span className="text-[10px] text-blue-700 font-medium block">Persentase</span>
            <span className="text-sm font-bold text-blue-700 tabular-nums">{persentase}%</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900">Filter Data:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-600 font-medium">Bulan:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
          >
            <option value="all">Semua Bulan</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-600 font-medium">Tahun:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
          >
            <option value="all">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tanggal / status / keterangan..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
              <th className="p-3.5 font-semibold">Tanggal Presensi</th>
              <th className="p-3.5 font-semibold">Jam Datang</th>
              <th className="p-3.5 font-semibold">Jam Pulang</th>
              <th className="p-3.5 font-semibold">Status</th>
              <th className="p-3.5 font-semibold">Keterangan Aktivitas</th>
              <th className="p-3.5 font-semibold text-center">Sinkronisasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Belum ada rekaman presensi pada periode yang dipilih.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-blue-50/40 transition">
                  <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">
                    <div>{formatIndonesianDate(rec.tanggal)}</div>
                    <span className="text-[10px] font-mono text-slate-500">{rec.tanggal}</span>
                  </td>
                  <td className="p-3.5 font-mono tabular-nums text-emerald-700 font-bold whitespace-nowrap">
                    {rec.jamDatang} WIB
                  </td>
                  <td className="p-3.5 font-mono tabular-nums text-blue-700 font-bold whitespace-nowrap">
                    {rec.jamPulang && rec.jamPulang !== '-' ? `${rec.jamPulang} WIB` : <span className="text-slate-400 font-normal">-</span>}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border ${
                      rec.status === 'Hadir'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : rec.status === 'Terlambat'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : rec.status === 'Tidak Disiplin'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : rec.status === 'Alpha'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-700 max-w-xs">
                    <p className="truncate" title={rec.keterangan}>{rec.keterangan || '-'}</p>
                    {rec.koordinatGps && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-blue-700">📍 {rec.koordinatGps}</span>
                        {rec.mapsUrl && (
                          <a
                            href={rec.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 font-semibold hover:underline inline-flex items-center"
                          >
                            Map &rarr;
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Spreadsheet
                      </span>
                      {rec.fotoBukti && (
                        <span className="text-[10px] text-blue-700 font-medium">📷 Foto Ada</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
