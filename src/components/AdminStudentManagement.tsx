import React, { useState, useRef } from 'react';
import { User, PEMBIMBING_TKR_LIST } from '../types/pkl';
import { StorageService } from '../services/storage';
import * as XLSX from 'xlsx';
import { 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Briefcase, 
  School,
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  AlertTriangle,
  FolderUp,
  GraduationCap,
  Building2,
  Filter,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AdminStudentManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(StorageService.getUsers().filter(u => u.role === 'siswa'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMentor, setSelectedMentor] = useState<string>('all');
  const [selectedTahun, setSelectedTahun] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tahunConfig = StorageService.getTahunAjaranConfig();

  // Excel Import & Template state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    students: User[];
    newCount: number;
    updateCount: number;
    invalidCount: number;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    nis: '',
    nama: '',
    kelas: 'XII TKR 1',
    jenisKelamin: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Teknik Kendaraan Ringan (TKR)',
    noHp: '',
    tempatPkl: '',
    namaPembimbing: PEMBIMBING_TKR_LIST[0],
    tahunAjaran: StorageService.getActiveTahunAjaran(),
    password: 'siswa123',
  });

  const reloadUsers = () => {
    setUsers(StorageService.getUsers().filter(u => u.role === 'siswa'));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Download official Excel template for student PKL data
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NIS': '20240105',
        'Nama Lengkap': 'Rahmat Hidayat',
        'Kelas': 'XII TKR 1',
        'Jenis Kelamin': 'Laki-laki',
        'Asal Sekolah': 'SMKN 1 Tegalsari',
        'Jurusan': 'Teknik Kendaraan Ringan (TKR)',
        'Nomor HP': '081234567891',
        'Tempat PKL / Bengkel': 'Bengkel Mobil Auto Service Tegalsari',
        'Guru Pembimbing Sekolah (Dari Registrasi Siswa)': 'Achmad Mackrus, S.T.',
        'Password': 'siswa123',
      },
      {
        'NIS': '20240106',
        'Nama Lengkap': 'Fajar Prasetyo',
        'Kelas': 'XII TKR 1',
        'Jenis Kelamin': 'Laki-laki',
        'Asal Sekolah': 'SMKN 1 Tegalsari',
        'Jurusan': 'Teknik Kendaraan Ringan (TKR)',
        'Nomor HP': '085798765432',
        'Tempat PKL / Bengkel': 'PT Astra International Tbk - Auto2000',
        'Guru Pembimbing Sekolah (Dari Registrasi Siswa)': 'Eko Hariyono, S.Pd.T.',
        'Password': 'siswa123',
      },
      {
        'NIS': '20240107',
        'Nama Lengkap': 'Bayu Kurniawan',
        'Kelas': 'XII TKR 2',
        'Jenis Kelamin': 'Laki-laki',
        'Asal Sekolah': 'SMKN 1 Tegalsari',
        'Jurusan': 'Teknik Kendaraan Ringan (TKR)',
        'Nomor HP': '082133445566',
        'Tempat PKL / Bengkel': 'Bengkel Resmi Honda Surya Mega Motor',
        'Guru Pembimbing Sekolah (Dari Registrasi Siswa)': 'Gufron Al-Hakim, S.T.',
        'Password': 'siswa123',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 14 }, // NIS
      { wch: 24 }, // Nama Lengkap
      { wch: 14 }, // Kelas
      { wch: 15 }, // Jenis Kelamin
      { wch: 22 }, // Asal Sekolah
      { wch: 32 }, // Jurusan
      { wch: 16 }, // Nomor HP
      { wch: 40 }, // Tempat PKL / Bengkel
      { wch: 42 }, // Guru Pembimbing Sekolah (Dari Registrasi Siswa)
      { wch: 14 }, // Password
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Siswa_PKL');
    XLSX.writeFile(workbook, 'Template_Data_Siswa_PKL_TKR.xlsx');
  };

  // Upload & parse Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('File Excel kosong atau tidak memiliki baris data.');
          return;
        }

        const existingUsers = StorageService.getUsers();
        let newCount = 0;
        let updateCount = 0;
        let invalidCount = 0;
        const parsedStudents: User[] = [];

        rawJson.forEach((row, idx) => {
          // Normalize object keys to lowercase alphanumeric
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedRow[cleanKey] = String(row[key] ?? '').trim();
          });

          // Extract required and optional fields
          const nis = normalizedRow['nis'] || normalizedRow['nisn'] || normalizedRow['noinduk'] || normalizedRow['nomorinduk'] || '';
          const nama = normalizedRow['nama'] || normalizedRow['namalengkap'] || normalizedRow['namasiswa'] || '';

          if (!nis || !nama) {
            invalidCount++;
            return;
          }

          const rawGender = (normalizedRow['jeniskelamin'] || normalizedRow['jk'] || normalizedRow['gender'] || '').toLowerCase();
          const jenisKelamin: 'Laki-laki' | 'Perempuan' =
            rawGender.startsWith('p') || rawGender.includes('perempuan') ? 'Perempuan' : 'Laki-laki';

          const kelas = normalizedRow['kelas'] || normalizedRow['kls'] || normalizedRow['kelassiswa'] || 'XII TKR 1';
          const asalSekolah = normalizedRow['asalsekolah'] || normalizedRow['sekolah'] || 'SMKN 1 Tegalsari';
          const jurusan = normalizedRow['jurusan'] || 'Teknik Kendaraan Ringan (TKR)';
          const noHp =
            normalizedRow['nomorhp'] ||
            normalizedRow['nohp'] ||
            normalizedRow['hp'] ||
            normalizedRow['wa'] ||
            normalizedRow['telepon'] ||
            '';
          const tempatPkl =
            normalizedRow['tempatpkl'] ||
            normalizedRow['tempatpklbengkel'] ||
            normalizedRow['bengkel'] ||
            normalizedRow['namabengkel'] ||
            'Bengkel Mitra TKR';

          let namaPembimbing =
            normalizedRow['gurupembimbingsekolahdariregistrasisiswa'] ||
            normalizedRow['gurupembimbingsekolah'] ||
            normalizedRow['gurupembimbing'] ||
            normalizedRow['namapembimbingsekolah'] ||
            normalizedRow['pembimbingsekolah'] ||
            normalizedRow['namapembimbing'] ||
            normalizedRow['pembimbing'] ||
            normalizedRow['mentor'] ||
            '';
          if (!namaPembimbing || !PEMBIMBING_TKR_LIST.includes(namaPembimbing)) {
            const match = PEMBIMBING_TKR_LIST.find((p) =>
              p.toLowerCase().includes(namaPembimbing.toLowerCase())
            );
            namaPembimbing = match || PEMBIMBING_TKR_LIST[idx % PEMBIMBING_TKR_LIST.length];
          }

          const password = normalizedRow['password'] || normalizedRow['katasandi'] || 'siswa123';

          const exists = existingUsers.some(
            (u) => u.nis === nis || (u.username && u.username.toLowerCase() === nis.toLowerCase())
          );
          if (exists) {
            updateCount++;
          } else {
            newCount++;
          }

          parsedStudents.push({
            id: `USR-SISWA-${nis}-${Date.now() + idx}`,
            username: nis,
            nis: nis,
            password: password,
            role: 'siswa',
            nama: nama,
            kelas: kelas,
            jenisKelamin: jenisKelamin,
            asalSekolah: asalSekolah,
            jurusan: jurusan,
            noHp: noHp,
            tempatPkl: tempatPkl,
            namaPembimbing: namaPembimbing,
            createdAt: new Date().toISOString().slice(0, 10),
          });
        });

        if (parsedStudents.length === 0) {
          alert('Tidak ditemukan data siswa yang valid pada file Excel. Pastikan kolom "NIS" dan "Nama Lengkap" terisi.');
          return;
        }

        setImportPreview({
          fileName: file.name,
          students: parsedStudents,
          newCount,
          updateCount,
          invalidCount,
        });
      } catch (err: any) {
        alert('Gagal membaca file Excel. Pastikan format file adalah .xlsx atau .xls valid. ' + (err?.message || ''));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview || importPreview.students.length === 0) return;

    const res = StorageService.addUsersBulk(importPreview.students);
    confetti({ particleCount: 60, spread: 80 });
    showToast(`Sukses mengimpor data siswa! (+${res.addedCount} Siswa baru, ${res.updatedCount} Siswa diperbarui).`);
    setImportPreview(null);
    reloadUsers();
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      nis: '',
      nama: '',
      kelas: 'XII TKR 1',
      jenisKelamin: 'Laki-laki',
      asalSekolah: 'SMKN 1 Tegalsari',
      jurusan: 'Teknik Kendaraan Ringan (TKR)',
      noHp: '',
      tempatPkl: '',
      namaPembimbing: PEMBIMBING_TKR_LIST[0],
      tahunAjaran: StorageService.getActiveTahunAjaran(),
      password: 'siswa123',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username || user.nis,
      nis: user.nis,
      nama: user.nama,
      kelas: user.kelas || 'XII TKR 1',
      jenisKelamin: user.jenisKelamin,
      asalSekolah: user.asalSekolah,
      jurusan: user.jurusan,
      noHp: user.noHp,
      tempatPkl: user.tempatPkl,
      namaPembimbing: user.namaPembimbing,
      tahunAjaran: user.tahunAjaran || StorageService.getActiveTahunAjaran(),
      password: user.password,
    });
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = (formData.username.trim() || formData.nis.trim()).toLowerCase().replace(/\s+/g, '');
    const cleanNis = formData.nis.trim();
    const cleanNama = formData.nama.trim();

    if (!cleanNis || !cleanNama || !cleanUsername) {
      alert('Username, NIS, dan Nama Siswa wajib diisi.');
      return;
    }

    if (editingUser) {
      const updated: User = {
        ...editingUser,
        username: cleanUsername,
        nis: cleanNis,
        nama: cleanNama,
        kelas: formData.kelas.trim() || 'XII TKR 1',
        jenisKelamin: formData.jenisKelamin,
        asalSekolah: formData.asalSekolah.trim(),
        jurusan: formData.jurusan.trim(),
        noHp: formData.noHp.trim(),
        tempatPkl: formData.tempatPkl.trim(),
        namaPembimbing: formData.namaPembimbing.trim(),
        tahunAjaran: formData.tahunAjaran,
        password: formData.password || editingUser.password,
      };
      StorageService.updateUser(updated);
      showToast(`Data siswa "${updated.nama}" berhasil diperbarui.`);
    } else {
      const newUser: User = {
        id: `USR-SISWA-${Date.now()}`,
        username: cleanUsername,
        nis: cleanNis,
        password: formData.password || 'siswa123',
        role: 'siswa',
        nama: cleanNama,
        kelas: formData.kelas.trim() || 'XII TKR 1',
        jenisKelamin: formData.jenisKelamin,
        asalSekolah: formData.asalSekolah.trim() || 'SMKN 1 Tegalsari',
        jurusan: formData.jurusan.trim(),
        noHp: formData.noHp.trim(),
        tempatPkl: formData.tempatPkl.trim() || 'Instansi PKL Mitra',
        namaPembimbing: formData.namaPembimbing.trim() || 'Pembimbing Lapangan',
        tahunAjaran: formData.tahunAjaran || StorageService.getActiveTahunAjaran(),
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const added = StorageService.addUser(newUser);
      if (!added) {
        alert('NIS atau Username tersebut sudah ada dalam sistem.');
        return;
      }
      confetti({ particleCount: 40, spread: 60 });
      showToast(`Siswa "${newUser.nama}" berhasil ditambahkan.`);
    }

    setShowAddModal(false);
    reloadUsers();
  };

  const handleDelete = (user: User) => {
    if (confirm(`Apakah Anda yakin ingin menghapus siswa "${user.nama}" (${user.nis})?`)) {
      StorageService.deleteUser(user.id);
      showToast(`Siswa "${user.nama}" telah dihapus.`);
      reloadUsers();
    }
  };

  const handleResetPassword = (user: User) => {
    const updated: User = { ...user, password: 'siswa123' };
    StorageService.updateUser(updated);
    showToast(`Password siswa "${user.nama}" berhasil direset ke: siswa123`);
    reloadUsers();
  };

  const uniqueWorkshops = Array.from(new Set(users.map(u => u.tempatPkl).filter(Boolean)));

  const filtered = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.nama.toLowerCase().includes(q) ||
      u.nis.toLowerCase().includes(q) ||
      (u.kelas && u.kelas.toLowerCase().includes(q)) ||
      u.jurusan.toLowerCase().includes(q) ||
      u.tempatPkl.toLowerCase().includes(q) ||
      u.asalSekolah.toLowerCase().includes(q) ||
      (u.namaPembimbing && u.namaPembimbing.toLowerCase().includes(q));

    const matchMentor =
      selectedMentor === 'all' ||
      u.namaPembimbing === selectedMentor;

    const matchTahun =
      selectedTahun === 'all' ||
      (u.tahunAjaran || tahunConfig.tahunAktif) === selectedTahun;

    return matchSearch && matchMentor && matchTahun;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Excel Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls, .csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Manajemen Siswa PKL & Bengkel Mitra</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
              Format Excel TKR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola data siswa, penempatan bengkel mitra, data nama pembimbing sekolah (dari registrasi siswa), dan import massal via file Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Download Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer shadow-sm"
            title="Unduh format file Excel (.xlsx) dengan kolom yang sesuai untuk import data siswa"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Format Template (.xlsx)</span>
          </button>

          {/* Upload Excel Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/30 cursor-pointer"
            title="Upload file Excel (.xlsx / .xls) data siswa PKL"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Upload Data Siswa Excel</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Siswa Manual</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Total Siswa PKL (TKR)</span>
            <span className="text-lg font-black text-white">{users.length} Siswa</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Tempat PKL / Bengkel Mitra</span>
            <span className="text-lg font-black text-emerald-300">{uniqueWorkshops.length} Bengkel Aktif</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium block">Guru Pembimbing Sekolah</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">Registrasi Siswa</span>
            </div>
            <span className="text-lg font-black text-indigo-300">10 Guru TKR</span>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Siswa, NIS, Pembimbing Sekolah, atau Bengkel..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by Tahun Ajaran */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium shrink-0">Tahun Ajaran:</span>
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
              className="bg-transparent text-xs text-white font-mono font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">Semua Periode</option>
              {tahunConfig.daftarTahun.map((t) => (
                <option key={t} value={t} className="bg-slate-900 text-white">
                  {t} {t === tahunConfig.tahunAktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Guru Pembimbing Sekolah Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400 font-medium shrink-0">Pembimbing:</span>
            <select
              value={selectedMentor}
              onChange={(e) => setSelectedMentor(e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all" className="bg-slate-900 text-white">
                Semua Pembimbing
              </option>
              {PEMBIMBING_TKR_LIST.map((mentor) => {
                const count = users.filter(u => u.namaPembimbing === mentor).length;
                return (
                  <option key={mentor} value={mentor} className="bg-slate-900 text-white">
                    {mentor} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {(searchQuery || selectedMentor !== 'all' || selectedTahun !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedMentor('all');
                setSelectedTahun('all');
              }}
              title="Reset Filter & Pencarian"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Indicator */}
      {selectedMentor !== 'all' && (
        <div className="px-3 py-2 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Menampilkan siswa bimbingan dari: <strong className="text-white">{selectedMentor}</strong> (Data dari formulir registrasi siswa)
            </span>
          </div>
          <button
            onClick={() => setSelectedMentor('all')}
            className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
          >
            Tampilkan Semua
          </button>
        </div>
      )}

      {/* Student Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
              <th className="p-3.5 font-semibold">NIS & Nama Siswa</th>
              <th className="p-3.5 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bengkel Mitra / Tempat PKL</span>
                </div>
              </th>
              <th className="p-3.5 font-semibold">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Guru Pembimbing Sekolah</span>
                </div>
                <span className="text-[10px] text-cyan-400/80 font-normal block">(Dari Registrasi Siswa)</span>
              </th>
              <th className="p-3.5 font-semibold">Jurusan & Sekolah</th>
              <th className="p-3.5 font-semibold">Kontak HP</th>
              <th className="p-3.5 font-semibold text-right">Aksi & Kredensial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Tidak ditemukan siswa yang cocok dengan kriteria pencarian atau filter pembimbing.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  {/* NIS & Nama Siswa */}
                  <td className="p-3.5">
                    <p className="font-bold text-white text-xs">{u.nama}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-cyan-400 font-semibold">{u.nis}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {u.kelas || 'XII TKR 1'}
                      </span>
                      <span className="font-mono text-[10px] text-indigo-300 font-medium bg-indigo-500/10 px-1 rounded border border-indigo-500/20">
                        @{u.username || u.nis}
                      </span>
                      <span className="text-slate-500 text-[10px]">({u.jenisKelamin})</span>
                    </div>
                  </td>

                  {/* Bengkel Mitra / Tempat PKL */}
                  <td className="p-3.5">
                    <div className="flex items-start gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-emerald-300 font-semibold text-xs leading-tight">
                          {u.tempatPkl || 'Belum Ditentukan'}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Tempat PKL Industri</span>
                      </div>
                    </div>
                  </td>

                  {/* Guru Pembimbing Sekolah (Dari Registrasi Siswa) */}
                  <td className="p-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-white font-bold text-xs">
                          {u.namaPembimbing || 'Belum Memilih'}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-500/30">
                        <GraduationCap className="w-3 h-3 text-indigo-400" />
                        <span>Dari Registrasi Siswa</span>
                      </div>
                    </div>
                  </td>

                  {/* Jurusan & Asal Sekolah */}
                  <td className="p-3.5">
                    <p className="text-slate-200">{u.jurusan}</p>
                    <p className="text-[10px] text-slate-500">{u.asalSekolah}</p>
                  </td>

                  {/* Kontak HP */}
                  <td className="p-3.5 font-mono text-slate-300">
                    {u.noHp || '-'}
                  </td>

                  {/* Aksi & Kredensial */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleResetPassword(u)}
                        title="Reset Password ke: siswa123"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit Data Siswa & Pembimbing"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        title="Hapus Siswa"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                {editingUser ? 'Edit Data Siswa PKL' : 'Tambah Siswa PKL Baru'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                    <span>Username Siswa *</span>
                    <span className="text-[10px] text-cyan-400">Untuk Login</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="Contoh: ahmad_rizki"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">NIS / NISN *</label>
                  <input
                    type="text"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: 20240105"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Nama lengkap siswa"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kelas *</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="XII TKR 1">XII TKR 1</option>
                    <option value="XII TKR 2">XII TKR 2</option>
                    <option value="XII TKR 3">XII TKR 3</option>
                    <option value="XII RPL 1">XII RPL 1</option>
                    <option value="XII AKL 1">XII AKL 1</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenisKelamin}
                    onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.noHp}
                    onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Asal Sekolah</label>
                  <input
                    type="text"
                    value={formData.asalSekolah}
                    onChange={(e) => setFormData({ ...formData, asalSekolah: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jurusan</label>
                  <input
                    type="text"
                    value={formData.jurusan}
                    onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tempat PKL / Bengkel Mitra</label>
                  <input
                    type="text"
                    value={formData.tempatPkl}
                    onChange={(e) => setFormData({ ...formData, tempatPkl: e.target.value })}
                    placeholder="Nama bengkel / PT"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Guru Pembimbing Sekolah *
                  </label>
                  <span className="text-[10px] text-cyan-400 block -mt-0.5 mb-1">
                    (Data sesuai yang dipilih siswa saat registrasi)
                  </span>
                  <select
                    required
                    value={formData.namaPembimbing}
                    onChange={(e) => setFormData({ ...formData, namaPembimbing: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {PEMBIMBING_TKR_LIST.map((mentor) => (
                      <option key={mentor} value={mentor}>
                        {mentor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Password Akun Siswa</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Default: siswa123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Preview & Confirmation Modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Preview Import Data Siswa PKL</h3>
                  <p className="text-xs text-slate-400">File: <span className="font-mono text-cyan-300">{importPreview.fileName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setImportPreview(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Total Siswa Terbaca</span>
                <span className="text-base font-bold font-mono text-white">{importPreview.students.length} Siswa</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                <span className="text-emerald-400/80 text-[10px] block">Siswa Baru</span>
                <span className="text-base font-bold font-mono">+{importPreview.newCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300">
                <span className="text-amber-400/80 text-[10px] block">Siswa Update</span>
                <span className="text-base font-bold font-mono">{importPreview.updateCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                <span className="text-slate-500 text-[10px] block">Baris Kosong/Lewat</span>
                <span className="text-base font-bold font-mono text-slate-300">{importPreview.invalidCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2 shrink-0">
              Berikut daftar siswa yang akan ditambahkan ke sistem. Siswa dengan NIS yang sudah ada akan diperbarui datanya.
            </p>

            {/* Table Preview */}
            <div className="overflow-y-auto flex-1 rounded-2xl border border-slate-800 bg-slate-950 min-h-[200px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-300">
                  <tr>
                    <th className="p-2.5 font-semibold">NIS</th>
                    <th className="p-2.5 font-semibold">Nama Siswa</th>
                    <th className="p-2.5 font-semibold">Gender</th>
                    <th className="p-2.5 font-semibold">Tempat PKL / Bengkel</th>
                    <th className="p-2.5 font-semibold">Guru Pembimbing Sekolah</th>
                    <th className="p-2.5 font-semibold">No HP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {importPreview.students.map((st, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-2.5 font-mono text-cyan-400 font-bold whitespace-nowrap">{st.nis}</td>
                      <td className="p-2.5 font-medium text-white whitespace-nowrap">{st.nama}</td>
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">{st.jenisKelamin}</td>
                      <td className="p-2.5 text-emerald-300">{st.tempatPkl}</td>
                      <td className="p-2.5">
                        <span className="font-semibold text-indigo-300 block">{st.namaPembimbing}</span>
                        <span className="text-[10px] text-slate-400">Dari Registrasi</span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-400">{st.noHp || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400">
                Format jurusan default: <strong className="text-white">Teknik Kendaraan Ringan (TKR)</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan & Import ke Database</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
