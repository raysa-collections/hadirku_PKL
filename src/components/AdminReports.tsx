import React, { useState, useRef } from 'react';
import { AttendanceRecord, ReportPrintConfig } from '../types/pkl';
import { StorageService, formatIndonesianDate, getJakartaDate, DEFAULT_REPORT_CONFIG } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  Users, 
  School, 
  CheckCircle2, 
  FileText,
  Search,
  Settings2,
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AdminReports: React.FC = () => {
  const allRecords = StorageService.getAttendance();
  const allStudents = StorageService.getUsers().filter(u => u.role === 'siswa');

  const [reportType, setReportType] = useState<'harian' | 'mingguan' | 'bulanan' | 'siswa' | 'sekolah'>('bulanan');
  const [selectedDate, setSelectedDate] = useState<string>(getJakartaDate());
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedTahun, setSelectedTahun] = useState<string>('all');
  const [selectedStudentNis, setSelectedStudentNis] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  const tahunConfig = StorageService.getTahunAjaranConfig();

  // Kop & Signature Customization State
  const [kopConfig, setKopConfig] = useState<ReportPrintConfig>(() => StorageService.getReportPrintConfig());
  const [showKopModal, setShowKopModal] = useState(false);
  const [tempKopConfig, setTempKopConfig] = useState<ReportPrintConfig>(kopConfig);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveKopConfig = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveReportPrintConfig(tempKopConfig);
    setKopConfig(tempKopConfig);
    setShowKopModal(false);
    confetti({ particleCount: 35, spread: 60 });
    showToast('Teks kop laporan & nama penandatangan berhasil diperbarui!');
  };

  const handleResetKopDefault = () => {
    setTempKopConfig(DEFAULT_REPORT_CONFIG);
  };

  // Filter logic based on report type & academic year
  const filteredData = allRecords.filter(r => {
    const matchTahun = selectedTahun === 'all' || (r.tahunAjaran || tahunConfig.tahunAktif) === selectedTahun;
    if (!matchTahun) return false;

    if (reportType === 'harian') {
      return r.tanggal === selectedDate;
    }
    if (reportType === 'mingguan') {
      // Last 7 days from selectedDate
      const targetTime = new Date(selectedDate).getTime();
      const recTime = new Date(r.tanggal).getTime();
      const diffDays = (targetTime - recTime) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (reportType === 'bulanan') {
      const [y, m] = r.tanggal.split('-');
      return y === selectedYear && (selectedMonth === 'all' || m === selectedMonth);
    }
    if (reportType === 'siswa') {
      return selectedStudentNis === 'all' || r.nis === selectedStudentNis;
    }
    if (reportType === 'sekolah') {
      return selectedSchool === 'all' || r.asalSekolah.toLowerCase() === selectedSchool.toLowerCase();
    }
    return true;
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  // Export to Excel (.xlsx) using xlsx library
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data pada filter ini untuk diekspor.');
      return;
    }

    const excelRows = filteredData.map((r, index) => {
      const student = allStudents.find(s => s.nis === r.nis);
      return {
        'No': index + 1,
        'ID Absensi': r.id,
        'Tanggal': r.tanggal,
        'NIS/NISN': r.nis,
        'Nama Siswa': r.namaSiswa,
        'Kelas': r.kelas || student?.kelas || 'XII TKR 1',
        'Guru Pembimbing Sekolah': r.namaPembimbing || student?.namaPembimbing || '-',
        'Asal Sekolah': r.asalSekolah,
        'Jurusan': r.jurusan,
        'Tempat PKL / Bengkel': r.tempatPkl,
        'Jam Datang': r.jamDatang,
        'Jam Pulang': r.jamPulang || '-',
        'Status Kehadiran': r.status,
        'Titik Koordinat GPS': r.koordinatGps || r.koordinatPulang || '-',
        'Link Map Google': r.mapsUrl || r.mapsUrlPulang || '-',
        'Keterangan / Aktivitas': r.keterangan || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan_Absensi_PKL');

    // Auto column widths
    const max_width = excelRows.reduce((w, r) => Math.max(w, r['Nama Siswa'].length), 10);
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 22 }, // ID
      { wch: 12 }, // Tanggal
      { wch: 12 }, // NIS
      { wch: max_width + 4 }, // Nama
      { wch: 14 }, // Kelas
      { wch: 30 }, // Guru Pembimbing Sekolah
      { wch: 18 }, // Sekolah
      { wch: 25 }, // Jurusan
      { wch: 25 }, // Tempat PKL
      { wch: 12 }, // Datang
      { wch: 12 }, // Pulang
      { wch: 16 }, // Status
      { wch: 22 }, // GPS
      { wch: 30 }, // Link Map
      { wch: 35 }, // Keterangan
    ];

    const fileName = `Laporan_Absensi_PKL_${reportType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    confetti({ particleCount: 50, spread: 70 });
  };

  // Export to PDF / Print view
  const handlePrintPDF = () => {
    window.print();
  };

  // Distinct schools
  const distinctSchools = Array.from(new Set(allStudents.map(s => s.asalSekolah)));

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-white">Laporan & Rekapitulasi Presensi PKL</h2>
          <p className="text-xs text-slate-400">
            Ekspor rekap kehadiran siswa dalam format Excel (.xlsx) atau Cetak / Simpan PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Custom Kop & TTD Button */}
          <button
            onClick={() => {
              setTempKopConfig(kopConfig);
              setShowKopModal(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
            title="Ubah teks kop surat laporan dan nama penandatangan"
          >
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <span>Atur Kop & TTD</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel (.xlsx)
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs (Hidden on Print) */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-cyan-400" />
            Pilih Tipe Laporan:
          </span>
          <span className="text-xs text-slate-400">
            Ditemukan <strong className="text-white">{filteredData.length}</strong> catatan
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <button
            onClick={() => setReportType('bulanan')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'bulanan'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Laporan Bulanan
          </button>
          <button
            onClick={() => setReportType('harian')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'harian'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Laporan Harian
          </button>
          <button
            onClick={() => setReportType('mingguan')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'mingguan'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Laporan Mingguan
          </button>
          <button
            onClick={() => setReportType('siswa')}
            className={`py-2 px-3 rounded-xl font-semibold transition ${
              reportType === 'siswa'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Per Siswa
          </button>
          <button
            onClick={() => setReportType('sekolah')}
            className={`py-2 px-3 rounded-xl font-semibold transition col-span-2 sm:col-span-1 ${
              reportType === 'sekolah'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Per Sekolah
          </button>
        </div>

        {/* Dynamic Context Filter Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs border-t border-slate-800/80">
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

          {(reportType === 'bulanan') && (
            <>
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
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </>
          )}

          {(reportType === 'harian' || reportType === 'mingguan') && (
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Pilih Tanggal:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {(reportType === 'siswa') && (
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Pilih Siswa:</label>
              <select
                value={selectedStudentNis}
                onChange={(e) => setSelectedStudentNis(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Siswa PKL</option>
                {allStudents.map(s => (
                  <option key={s.id} value={s.nis}>{s.nama} ({s.nis})</option>
                ))}
              </select>
            </div>
          )}

          {(reportType === 'sekolah') && (
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Asal Sekolah:</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Semua Sekolah Mitra</option>
                {distinctSchools.map(sch => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* PRINTABLE REPORT PREVIEW CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl print:bg-white print:text-black print:border-none print:p-0 print:m-0">
        
        {/* Kop Surat Sekolah / Instansi (Tampil di Print dan Preview) */}
        {kopConfig.showKop && (
          <div className="border-b-2 border-slate-700 pb-4 text-center space-y-1 print:border-black">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white print:text-black">
              {kopConfig.kopBaris1}
            </h2>
            <h3 className="text-sm font-bold text-cyan-400 print:text-black">
              {kopConfig.kopBaris2}
            </h3>
            <p className="text-[11px] text-slate-400 print:text-gray-600">
              {kopConfig.kopBaris3}
            </p>
            {kopConfig.kopAlamat && (
              <p className="text-[10px] text-slate-500 print:text-gray-500 italic">
                {kopConfig.kopAlamat}
              </p>
            )}
            <div className="pt-2 text-xs font-bold text-white uppercase print:text-black">
              REKAPITULASI LAPORAN PRESENSI SISWA PKL ({reportType.toUpperCase()})
            </div>
          </div>
        )}

        {/* Report Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse print:text-[10px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-300 print:bg-gray-100 print:text-black print:border-gray-400">
                <th className="p-2.5 font-semibold text-center w-10">No</th>
                <th className="p-2.5 font-semibold">Tanggal</th>
                <th className="p-2.5 font-semibold">NIS</th>
                <th className="p-2.5 font-semibold">Nama Siswa</th>
                <th className="p-2.5 font-semibold">Kelas</th>
                <th className="p-2.5 font-semibold">Guru Pembimbing Sekolah</th>
                <th className="p-2.5 font-semibold">Jurusan</th>
                <th className="p-2.5 font-semibold">Tempat PKL</th>
                <th className="p-2.5 font-semibold text-center">Datang</th>
                <th className="p-2.5 font-semibold text-center">Pulang</th>
                <th className="p-2.5 font-semibold text-center">Status</th>
                <th className="p-2.5 font-semibold">Catatan / Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 print:divide-gray-300 print:text-black">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500 print:text-gray-500">
                    Tidak ada rekaman presensi pada filter laporan ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                    <td className="p-2.5 text-center font-mono text-slate-500 print:text-black">{idx + 1}</td>
                    <td className="p-2.5 whitespace-nowrap font-mono">{row.tanggal}</td>
                    <td className="p-2.5 font-mono text-cyan-400 print:text-black">{row.nis}</td>
                    <td className="p-2.5 font-bold text-white print:text-black">{row.namaSiswa}</td>
                    <td className="p-2.5 font-semibold text-cyan-300 print:text-black">{row.kelas || allStudents.find(s => s.nis === row.nis)?.kelas || 'XII TKR 1'}</td>
                    <td className="p-2.5 text-indigo-300 print:text-black font-medium text-[11px]">
                      {row.namaPembimbing || allStudents.find(s => s.nis === row.nis)?.namaPembimbing || '-'}
                    </td>
                    <td className="p-2.5 text-slate-400 print:text-black">{row.jurusan.split('(')[0]}</td>
                    <td className="p-2.5 text-slate-300 print:text-black">{row.tempatPkl}</td>
                    <td className="p-2.5 font-mono text-emerald-400 font-bold text-center print:text-black">{row.jamDatang}</td>
                    <td className="p-2.5 font-mono text-cyan-400 font-bold text-center print:text-black">{row.jamPulang || '-'}</td>
                    <td className="p-2.5 text-center">
                      <span className="font-semibold">{row.status}</span>
                    </td>
                    <td className="p-2.5 max-w-xs truncate text-slate-400 print:text-black" title={row.keterangan}>
                      {row.keterangan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan Pengesahan (Signature Block for Formal School PDF) */}
        {kopConfig.showTtd && (
          <div className="pt-8 border-t border-slate-800 flex justify-between items-start text-xs print:text-[10px] print:border-black print:pt-6">
            <div className="text-center space-y-12 min-w-[200px]">
              <p className="text-slate-400 print:text-black whitespace-pre-line leading-relaxed">
                {kopConfig.ttdKiriLabel}
              </p>
              <div>
                <p className="font-bold underline text-white print:text-black">{kopConfig.ttdKiriNama}</p>
                <p className="text-[10px] text-slate-500 print:text-gray-600">{kopConfig.ttdKiriJabatan}</p>
              </div>
            </div>

            <div className="text-center space-y-12 min-w-[200px]">
              <p className="text-slate-400 print:text-black leading-relaxed">
                {kopConfig.ttdKananKota}, {formatIndonesianDate(getJakartaDate())}<br />
                {kopConfig.ttdKananLabel}
              </p>
              <div>
                <p className="font-bold underline text-white print:text-black">{kopConfig.ttdKananNama}</p>
                <p className="text-[10px] text-slate-500 print:text-gray-600">{kopConfig.ttdKananNip}</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL PENGATURAN KOP LAPORAN & TANDA TANGAN */}
      {showKopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Atur Kop Laporan & Tanda Tangan Cetak</h3>
                  <p className="text-xs text-slate-400">Sesuaikan kop resmi instansi dan nama penandatangan laporan PDF</p>
                </div>
              </div>
              <button
                onClick={() => setShowKopModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKopConfig} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              
              {/* Seksi Kop Surat */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <School className="w-4 h-4 text-cyan-400" />
                    Teks Kop Surat Instansi
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={tempKopConfig.showKop}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, showKop: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    Tampilkan Kop
                  </label>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kop Baris 1 (Pemerintah / Yayasan / Dinas)</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopBaris1}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopBaris1: e.target.value })}
                      placeholder="Contoh: PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kop Baris 2 (Nama Sekolah / Satuan Pendidikan)</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopBaris2}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopBaris2: e.target.value })}
                      placeholder="Contoh: SMK NEGERI 1 TEGALSARI — KELOMPOK TEKNOLOGI & REKAYASA"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Kop Baris 3 (Unit Kerja / Program Keahlian)</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopBaris3}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopBaris3: e.target.value })}
                      placeholder="Contoh: Bidang Kerja Khusus (BKK) & Hubin • Program PKL Jurusan TKR"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Alamat / Nomor Telepon Kop Surat</label>
                    <input
                      type="text"
                      value={tempKopConfig.kopAlamat}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, kopAlamat: e.target.value })}
                      placeholder="Contoh: Jl. KH. Syafa'at No. 01 Blokagung, Tegalsari, Banyuwangi"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi Tanda Tangan */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Nama & Jabatan Penandatangan (TTD)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={tempKopConfig.showTtd}
                      onChange={(e) => setTempKopConfig({ ...tempKopConfig, showTtd: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                    />
                    Tampilkan TTD
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  
                  {/* TTD Kiri (Pembimbing Bengkel DU/DI) */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">Tanda Tangan Kiri (Pihak DU/DI / Pembimbing)</span>
                    
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Label Pengesahan</label>
                      <textarea
                        rows={2}
                        value={tempKopConfig.ttdKiriLabel}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKiriLabel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Nama Penandatangan</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKiriNama}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKiriNama: e.target.value })}
                        placeholder="Contoh: ( ............................................ )"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Keterangan / Jabatan</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKiriJabatan}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKiriJabatan: e.target.value })}
                        placeholder="Contoh: Mentor / Pimpinan Bengkel DU/DI"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* TTD Kanan (Pihak Sekolah) */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">Tanda Tangan Kanan (Pihak Sekolah)</span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Kota</label>
                        <input
                          type="text"
                          value={tempKopConfig.ttdKananKota}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananKota: e.target.value })}
                          placeholder="Tegalsari"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Jabatan</label>
                        <input
                          type="text"
                          value={tempKopConfig.ttdKananLabel}
                          onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananLabel: e.target.value })}
                          placeholder="Koordinator PKL & Hubin"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKananNama}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananNama: e.target.value })}
                        placeholder="Drs. Bambang Sutrisno, M.Pd"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">NIP / NUPTK</label>
                      <input
                        type="text"
                        value={tempKopConfig.ttdKananNip}
                        onChange={(e) => setTempKopConfig({ ...tempKopConfig, ttdKananNip: e.target.value })}
                        placeholder="NIP. 197805122005011003"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px] focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetKopDefault}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Gunakan Bawaan Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKopModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Simpan Pengaturan Kop
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
