import React, { useState } from 'react';
import { User, AttendanceRecord } from '../types/pkl';
import { StorageService, formatIndonesianDate } from '../services/storage';
import { Calendar, Filter, CheckCircle2, Clock, FileText, ArrowLeft, Search } from 'lucide-react';

interface StudentHistoryProps {
  user: User;
  onBackToDashboard: () => void;
}

export const StudentHistory: React.FC<StudentHistoryProps> = ({ user, onBackToDashboard }) => {
  const allRecords = StorageService.getAttendance().filter(r => r.nis === user.nis);
  
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Dashboard
          </button>
          <h2 className="text-lg font-bold text-white">Riwayat Kehadiran Siswa</h2>
          <p className="text-xs text-slate-400">
            Rekap catatan presensi PKL atas nama <span className="text-white font-semibold">{user.nama}</span> ({user.nis})
          </p>
        </div>

        {/* Quick Month Metrics */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 block">Total Hadir</span>
            <span className="text-sm font-bold text-emerald-400">{totalHadir} Hari</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 block">Terlambat</span>
            <span className="text-sm font-bold text-amber-400">{totalTerlambat}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 block">Persentase</span>
            <span className="text-sm font-bold text-cyan-400">{persentase}%</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-300">Filter Data:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Bulan:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
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
          <label className="text-slate-400">Tahun:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tanggal / status / keterangan..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
              <th className="p-3.5 font-semibold">Tanggal Presensi</th>
              <th className="p-3.5 font-semibold">Jam Datang</th>
              <th className="p-3.5 font-semibold">Jam Pulang</th>
              <th className="p-3.5 font-semibold">Status</th>
              <th className="p-3.5 font-semibold">Keterangan Aktivitas</th>
              <th className="p-3.5 font-semibold text-center">Sinkronisasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Belum ada rekaman presensi pada periode yang dipilih.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3.5 font-medium text-white whitespace-nowrap">
                    <div>{formatIndonesianDate(rec.tanggal)}</div>
                    <span className="text-[10px] font-mono text-slate-500">{rec.tanggal}</span>
                  </td>
                  <td className="p-3.5 font-mono text-emerald-400 font-bold whitespace-nowrap">
                    {rec.jamDatang} WIB
                  </td>
                  <td className="p-3.5 font-mono text-cyan-400 font-bold whitespace-nowrap">
                    {rec.jamPulang && rec.jamPulang !== '-' ? `${rec.jamPulang} WIB` : <span className="text-slate-600 font-normal">-</span>}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      rec.status === 'Hadir'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : rec.status === 'Terlambat'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : rec.status === 'Tidak Disiplin'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : rec.status === 'Alpha'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-500/20 text-cyan-300 border border-blue-500/30'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300 max-w-xs">
                    <p className="truncate" title={rec.keterangan}>{rec.keterangan || '-'}</p>
                    {rec.koordinatGps && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-cyan-400">📍 {rec.koordinatGps}</span>
                        {rec.mapsUrl && (
                          <a
                            href={rec.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-400 hover:underline inline-flex items-center"
                          >
                            Map &rarr;
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Spreadsheet
                      </span>
                      {rec.fotoBukti && (
                        <span className="text-[10px] text-cyan-400 font-medium">📷 Foto Ada</span>
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
