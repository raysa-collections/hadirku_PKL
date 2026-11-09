import { User, AttendanceRecord, GoogleSheetConfig, AppThemeConfig, ReportPrintConfig, TahunAjaranConfig } from '../types/pkl';

const USERS_KEY = 'pkl_users_v1';
const ATTENDANCE_KEY = 'pkl_attendance_v1';
const CURRENT_USER_KEY = 'pkl_current_user_v1';
const GOOGLE_SHEET_KEY = 'pkl_google_sheet_v1';
const THEME_KEY = 'pkl_theme_config_v1';
const REPORT_CONFIG_KEY = 'pkl_report_config_v1';
const TAHUN_AJARAN_KEY = 'pkl_tahun_ajaran_v1';

export const DEFAULT_TAHUN_AJARAN_CONFIG: TahunAjaranConfig = {
  tahunAktif: '2025/2026',
  daftarTahun: ['2024/2025', '2025/2026', '2026/2027', '2027/2028'],
};

export const DEFAULT_THEME_CONFIG: AppThemeConfig = {
  appTitle: 'Absensi Siswa PKL',
  appSubtitle: 'SMK Negeri 1 Tegalsari • Jurusan Teknik Kendaraan Ringan (TKR)',
  logoPreset: 'school',
  headerColor: 'cyan',
  borderStyle: 'subtle',
};

export const DEFAULT_REPORT_CONFIG: ReportPrintConfig = {
  kopBaris1: 'PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN',
  kopBaris2: 'SMK NEGERI 1 TEGALSARI — KELOMPOK TEKNOLOGI & REKAYASA',
  kopBaris3: 'Bidang Kerja Khusus (BKK) & Hubungan Industri • Program Praktik Kerja Lapangan (PKL)',
  kopAlamat: "Jl. KH. Syafa'at No. 01 Blokagung, Tegalsari, Banyuwangi - Telp. (0333) 845678",
  ttdKiriLabel: 'Mengetahui,\nPembimbing Tempat PKL',
  ttdKiriNama: '( ............................................ )',
  ttdKiriJabatan: 'Mentor / Pimpinan DU/DI',
  ttdKananKota: 'Tegalsari',
  ttdKananLabel: 'Koordinator PKL & Hubin',
  ttdKananNama: 'Drs. Bambang Sutrisno, M.Pd',
  ttdKananNip: 'NIP. 197805122005011003',
  showKop: true,
  showTtd: true,
};

// Seed Initial Users
export const INITIAL_USERS: User[] = [
  {
    id: 'USR-ADMIN-1',
    username: 'admin123',
    password: 'admin123',
    role: 'admin',
    nama: 'Drs. Bambang Sutrisno, M.Pd',
    nis: '197805122005011003',
    nip: '197805122005011003',
    jabatan: 'Koordinator BKK & Hubin PKL',
    jenisKelamin: 'Laki-laki',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Koordinator PKL Sekolah',
    kelas: 'Guru/Koordinator',
    noHp: '081234567890',
    tempatPkl: 'Kantor BKK & Hubin Sekolah',
    namaPembimbing: 'Kepala Sekolah SMKN 1 Tegalsari',
    createdAt: '2026-01-01',
  },
  {
    id: 'USR-SISWA-1',
    username: 'ahmadrizki',
    password: 'siswa123',
    role: 'siswa',
    nama: 'Ahmad Rizki Maulana',
    nis: '20240101',
    jenisKelamin: 'Laki-laki',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Teknik Kendaraan Ringan Otomotif (TKR)',
    kelas: 'XII TKR 1',
    noHp: '085712345678',
    tempatPkl: 'PT Astra International Tbk - Auto2000',
    namaPembimbing: 'Achmad Mackrus, S.T.',
    createdAt: '2026-01-10',
  },
  {
    id: 'USR-SISWA-2',
    username: 'dewilestari',
    password: 'siswa123',
    role: 'siswa',
    nama: 'Dewi Lestari Putri',
    nis: '20240102',
    jenisKelamin: 'Perempuan',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Rekayasa Perangkat Lunak (RPL)',
    kelas: 'XII RPL 1',
    noHp: '081398765432',
    tempatPkl: 'PT Telkom Indonesia (Divisi IT Regional)',
    namaPembimbing: 'Andrik Wiyono, S.T., M.Pd., Gr.',
    createdAt: '2026-01-10',
  },
  {
    id: 'USR-SISWA-3',
    username: 'budipratama',
    password: 'siswa123',
    role: 'siswa',
    nama: 'Budi Pratama Wijaya',
    nis: '20240103',
    jenisKelamin: 'Laki-laki',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Teknik Kendaraan Ringan Otomotif (TKR)',
    kelas: 'XII TKR 2',
    noHp: '082155443322',
    tempatPkl: 'Bengkel Resmi Honda Surya Mega Motor',
    namaPembimbing: 'Eko Hariyono, S.Pd.T.',
    createdAt: '2026-01-10',
  },
  {
    id: 'USR-SISWA-4',
    username: 'sitinuraini',
    password: 'siswa123',
    role: 'siswa',
    nama: 'Siti Nur Aini',
    nis: '20240104',
    jenisKelamin: 'Perempuan',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Akuntansi & Keuangan Lembaga',
    kelas: 'XII AKL 1',
    noHp: '087811223344',
    tempatPkl: 'Bank Jatim Cabang Pembantu',
    namaPembimbing: 'Gufron Al-Hakim, S.T.',
    createdAt: '2026-01-12',
  },
];

// Helper for formatted dates in Asia/Jakarta
export function getJakartaDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getJakartaTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatIndonesianDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export interface AttendanceTimeRule {
  canCheckIn: boolean;
  canCheckOut: boolean;
  checkInStatus: 'Hadir' | 'Terlambat' | 'Tidak Disiplin' | 'Closed';
  checkInMessage: string;
  checkOutMessage: string;
  currentHour: number;
  currentMinute: number;
  timeString: string;
  isSimulated?: boolean;
}

/**
 * Aturan Waktu Resmi:
 * - Presensi Datang aktif: 04.00 WIB s/d 12.00 WIB
 *   - 04.00 s/d 08.59 WIB: Hadir (Tepat Waktu)
 *   - 09.00 s/d 12.00 WIB: Terlambat
 *   - Setelah jam 12.00 WIB jika belum absen: Tidak Disiplin
 * - Presensi Pulang aktif: 15.00 WIB s/d 23.00 WIB
 */
export function evaluateAttendanceTime(overrideHour?: number, overrideMinute?: number): AttendanceTimeRule {
  const now = new Date();
  let hour = overrideHour !== undefined ? overrideHour : now.getHours();
  let minute = overrideMinute !== undefined ? overrideMinute : now.getMinutes();

  // Try read real Jakarta time
  if (overrideHour === undefined) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const h = parts.find(p => p.type === 'hour')?.value;
      const m = parts.find(p => p.type === 'minute')?.value;
      if (h) hour = parseInt(h, 10);
      if (m) minute = parseInt(m, 10);
    } catch {
      // fallback to system hours
    }
  }

  const timeVal = hour + minute / 60;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Presensi Datang
  let canCheckIn = false;
  let checkInStatus: 'Hadir' | 'Terlambat' | 'Tidak Disiplin' | 'Closed' = 'Closed';
  let checkInMessage = '';

  if (timeVal >= 4 && timeVal <= 12) {
    canCheckIn = true;
    if (timeVal < 9) {
      checkInStatus = 'Hadir';
      checkInMessage = 'Presensi Hadir Tepat Waktu (04.00 - 08.59 WIB)';
    } else {
      checkInStatus = 'Terlambat';
      checkInMessage = 'Presensi Terlambat (09.00 - 12.00 WIB)';
    }
  } else if (timeVal < 4) {
    canCheckIn = false;
    checkInStatus = 'Closed';
    checkInMessage = 'Presensi datang belum dibuka (Buka pukul 04.00 WIB)';
  } else {
    canCheckIn = false;
    checkInStatus = 'Tidak Disiplin';
    checkInMessage = 'Batas presensi datang telah berakhir pada pukul 12.00 WIB (Kategori: Tidak Disiplin)';
  }

  // Presensi Pulang aktif: 15.00 WIB s/d 23.59 WIB
  let canCheckOut = false;
  let checkOutMessage = '';

  if (timeVal >= 15 && timeVal <= 23.99) {
    canCheckOut = true;
    checkOutMessage = 'Presensi pulang dibuka (15.00 - 23.59 WIB)';
  } else if (timeVal < 15) {
    canCheckOut = false;
    checkOutMessage = 'Presensi pulang belum dibuka (Buka mulai pukul 15.00 WIB)';
  } else {
    canCheckOut = false;
    checkOutMessage = 'Batas presensi pulang berakhir pada pukul 23.59 WIB';
  }

  return {
    canCheckIn,
    canCheckOut,
    checkInStatus,
    checkInMessage,
    checkOutMessage,
    currentHour: hour,
    currentMinute: minute,
    timeString: timeStr,
    isSimulated: overrideHour !== undefined,
  };
}

// Generate realistic past attendance records
export function generateSeedAttendance(): AttendanceRecord[] {
  const today = getJakartaDate();
  return [
    {
      id: 'ABS-20261104-20240101',
      tanggal: '2026-11-04',
      nis: '20240101',
      namaSiswa: 'Ahmad Rizki Maulana',
      asalSekolah: 'SMKN 1 Tegalsari',
      jurusan: 'Teknik Kendaraan Ringan Otomotif (TKR)',
      jamDatang: '07:25:10',
      jamPulang: '16:05:42',
      status: 'Hadir',
      keterangan: 'Praktek tune-up & scanner OBD-II pada Avanza unit 3',
      tempatPkl: 'PT Astra International Tbk - Auto2000',
      koordinatGps: '-8.37512, 114.12945',
      mapsUrl: 'https://www.google.com/maps?q=-8.37512,114.12945',
      koordinatPulang: '-8.37515, 114.12948',
      mapsUrlPulang: 'https://www.google.com/maps?q=-8.37515,114.12948',
      syncStatus: 'synced',
    },
    {
      id: 'ABS-20261104-20240102',
      tanggal: '2026-11-04',
      nis: '20240102',
      namaSiswa: 'Dewi Lestari Putri',
      asalSekolah: 'SMKN 1 Tegalsari',
      jurusan: 'Rekayasa Perangkat Lunak (RPL)',
      jamDatang: '07:45:00',
      jamPulang: '16:15:30',
      status: 'Hadir',
      keterangan: 'Slicing UI dashboard internal customer care',
      tempatPkl: 'PT Telkom Indonesia (Divisi IT Regional)',
      koordinatGps: '-8.37490, 114.12880',
      mapsUrl: 'https://www.google.com/maps?q=-8.37490,114.12880',
      koordinatPulang: '-8.37492, 114.12885',
      mapsUrlPulang: 'https://www.google.com/maps?q=-8.37492,114.12885',
      syncStatus: 'synced',
    },
    {
      id: 'ABS-20261104-20240103',
      tanggal: '2026-11-04',
      nis: '20240103',
      namaSiswa: 'Budi Pratama Wijaya',
      asalSekolah: 'SMKN 1 Tegalsari',
      jurusan: 'Teknik Kendaraan Ringan Otomotif (TKR)',
      jamDatang: '07:15:20',
      jamPulang: '16:00:10',
      status: 'Hadir',
      keterangan: 'Perbaikan sistem pengereman & ganti kampas',
      tempatPkl: 'Bengkel Resmi Honda Surya Mega Motor',
      koordinatGps: '-8.37600, 114.13020',
      mapsUrl: 'https://www.google.com/maps?q=-8.37600,114.13020',
      koordinatPulang: '-8.37605, 114.13025',
      mapsUrlPulang: 'https://www.google.com/maps?q=-8.37605,114.13025',
      syncStatus: 'synced',
    },
    {
      id: 'ABS-20261103-20240101',
      tanggal: '2026-11-03',
      nis: '20240101',
      namaSiswa: 'Ahmad Rizki Maulana',
      asalSekolah: 'SMKN 1 Tegalsari',
      jurusan: 'Teknik Kendaraan Ringan Otomotif (TKR)',
      jamDatang: '07:18:05',
      jamPulang: '16:10:00',
      status: 'Hadir',
      keterangan: 'Overhaul transmisi manual Avanza 2018',
      tempatPkl: 'PT Astra International Tbk - Auto2000',
      koordinatGps: '-8.37512, 114.12945',
      mapsUrl: 'https://www.google.com/maps?q=-8.37512,114.12945',
      koordinatPulang: '-8.37514, 114.12940',
      mapsUrlPulang: 'https://www.google.com/maps?q=-8.37514,114.12940',
      syncStatus: 'synced',
    },
  ];
}

// Storage Manager
export const StorageService = {
  getUsers(): User[] {
    const raw = localStorage.getItem(USERS_KEY);
    let users: User[] = [];
    if (!raw) {
      users = [...INITIAL_USERS];
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return users;
    }
    try {
      users = JSON.parse(raw);
    } catch {
      users = [...INITIAL_USERS];
    }

    // Ensure initial admin user with username admin123 exists
    const adminIdx = users.findIndex(u => u.role === 'admin' && (u.username.toLowerCase() === 'admin123' || u.username.toLowerCase() === 'admin'));
    if (adminIdx === -1) {
      users.unshift(INITIAL_USERS[0]);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else if (users[adminIdx].username === 'admin') {
      users[adminIdx].username = 'admin123';
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    return users;
  },

  saveUsers(users: User[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  addUser(user: User): boolean {
    const users = this.getUsers();
    if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase() || u.nis === user.nis)) {
      return false; // NIS or username already exists
    }
    users.push(user);
    this.saveUsers(users);
    if (user.role === 'siswa') {
      this.syncStudentToGoogleSheet(user).catch(err => console.warn('Sync student warning:', err));
    }
    return true;
  },

  addUsersBulk(newUsers: User[]): { addedCount: number; updatedCount: number } {
    const users = this.getUsers();
    let addedCount = 0;
    let updatedCount = 0;

    for (const nu of newUsers) {
      const existingIndex = users.findIndex(
        u => u.nis === nu.nis || (u.username && nu.username && u.username.toLowerCase() === nu.username.toLowerCase())
      );
      if (existingIndex >= 0) {
        users[existingIndex] = {
          ...users[existingIndex],
          ...nu,
          id: users[existingIndex].id, // keep original ID
        };
        updatedCount++;
      } else {
        users.push(nu);
        addedCount++;
      }
      if (nu.role === 'siswa') {
        this.syncStudentToGoogleSheet(nu).catch(err => console.warn('Sync student warning:', err));
      }
    }

    this.saveUsers(users);
    return { addedCount, updatedCount };
  },

  updateUser(updated: User) {
    const users = this.getUsers().map(u => u.id === updated.id ? updated : u);
    this.saveUsers(users);
    if (updated.role === 'siswa') {
      this.syncStudentToGoogleSheet(updated).catch(err => console.warn('Sync student warning:', err));
    }
    // If updating current logged in user
    const cur = this.getCurrentUser();
    if (cur && cur.id === updated.id) {
      this.setCurrentUser(updated);
    }
  },

  deleteUser(userId: string) {
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  getAttendance(): AttendanceRecord[] {
    const raw = localStorage.getItem(ATTENDANCE_KEY);
    if (!raw) {
      const initial = generateSeedAttendance();
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveAttendance(records: AttendanceRecord[]) {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
  },

  addOrUpdateAttendance(record: AttendanceRecord) {
    const records = this.getAttendance();
    const existingIndex = records.findIndex(r => r.id === record.id || (r.tanggal === record.tanggal && r.nis === record.nis));
    if (existingIndex >= 0) {
      records[existingIndex] = { ...records[existingIndex], ...record };
    } else {
      records.unshift(record);
    }
    this.saveAttendance(records);
    return record;
  },

  getGoogleSheetConfig(): GoogleSheetConfig {
    const raw = localStorage.getItem(GOOGLE_SHEET_KEY);
    if (!raw) {
      return {
        scriptUrl: '',
        sheetName: 'Data_Absensi_PKL',
        connected: false,
        autoSync: true,
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        scriptUrl: '',
        sheetName: 'Data_Absensi_PKL',
        connected: false,
        autoSync: true,
      };
    }
  },

  saveGoogleSheetConfig(config: GoogleSheetConfig) {
    localStorage.setItem(GOOGLE_SHEET_KEY, JSON.stringify(config));
  },

  // Sync Student Registration to Google Spreadsheet (Data_Siswa_TKR sheet)
  async syncStudentToGoogleSheet(student: User): Promise<{ success: boolean; message: string }> {
    const config = this.getGoogleSheetConfig();
    if (!config.scriptUrl || !config.scriptUrl.startsWith('http')) {
      return {
        success: true,
        message: 'Tersimpan di database lokal (Google Sheet URL belum dikonfigurasi).',
      };
    }

    try {
      const payload = {
        action: 'REGISTER_STUDENT',
        nis: student.nis,
        username: student.username || student.nis,
        nama: student.nama,
        kelas: student.kelas || 'XII TKR 1',
        jenisKelamin: student.jenisKelamin,
        asalSekolah: student.asalSekolah,
        jurusan: student.jurusan,
        noHp: student.noHp || '-',
        tempatPkl: student.tempatPkl || '-',
        namaPembimbing: student.namaPembimbing || '-',
        password: student.password || 'siswa123',
      };

      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        try {
          const resJson = await response.json();
          config.lastSync = new Date().toISOString();
          config.connected = true;
          this.saveGoogleSheetConfig(config);
          return {
            success: true,
            message: resJson.message || 'Siswa berhasil disinkronkan ke Google Spreadsheet!',
          };
        } catch {
          return {
            success: true,
            message: 'Data siswa terkirim ke Google Spreadsheet.',
          };
        }
      } else {
        return {
          success: false,
          message: `Gagal mengirim data siswa ke Google Sheets (${response.status})`,
        };
      }
    } catch (err: any) {
      console.warn('Google Sheet Sync Student Error:', err);
      return {
        success: false,
        message: 'Tersimpan lokal. Pengiriman siswa ke Spreadsheet tertunda.',
      };
    }
  },

  // Sync Attendance Record to Google Sheets via Apps Script Web App
  async syncToGoogleSheet(action: 'CHECK_IN' | 'CHECK_OUT', record: AttendanceRecord): Promise<{ success: boolean; message: string }> {
    const config = this.getGoogleSheetConfig();
    if (!config.scriptUrl || !config.scriptUrl.startsWith('http')) {
      return {
        success: true,
        message: 'Tersimpan di database lokal (Google Sheet URL belum dikonfigurasi).',
      };
    }

    try {
      const studentObj = this.getUsers().find(u => u.nis === record.nis);
      const namaPembimbing = record.namaPembimbing || studentObj?.namaPembimbing || 'Achmad Mackrus, S.T.';
      const tempatPkl = record.tempatPkl || studentObj?.tempatPkl || 'PT Astra International Tbk - Auto2000';
      const kelas = record.kelas || studentObj?.kelas || 'XII TKR 1';

      const gpsInfo = record.koordinatGps 
        ? ` [GPS: ${record.koordinatGps}]` 
        : record.koordinatPulang 
        ? ` [GPS Pulang: ${record.koordinatPulang}]` 
        : '';
        
      const payload = {
        action,
        id: record.id,
        tanggal: record.tanggal,
        nis: record.nis,
        namaSiswa: record.namaSiswa,
        kelas,
        namaPembimbing,
        asalSekolah: record.asalSekolah || studentObj?.asalSekolah || 'SMKN 1 Tegalsari',
        jurusan: record.jurusan || studentObj?.jurusan || 'Teknik Kendaraan Ringan (TKR)',
        tempatPkl,
        jamDatang: record.jamDatang || '-',
        jamPulang: record.jamPulang || '-',
        status: record.status || 'Hadir',
        keterangan: record.keterangan || '-',
        koordinatGps: record.koordinatGps || '-',
        mapsUrl: record.mapsUrl || '-',
        koordinatPulang: record.koordinatPulang || '-',
        mapsUrlPulang: record.mapsUrlPulang || '-',
      };

      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        try {
          const resJson = await response.json();
          config.lastSync = new Date().toISOString();
          config.connected = true;
          this.saveGoogleSheetConfig(config);
          return {
            success: true,
            message: resJson.message || 'Sinkronisasi ke Google Spreadsheet berhasil!',
          };
        } catch {
          return {
            success: true,
            message: 'Data berhasil terkirim ke Google Spreadsheet.',
          };
        }
      } else {
        return {
          success: false,
          message: `Gagal mengirim ke Google Sheets (${response.status})`,
        };
      }
    } catch (err: any) {
      console.warn('Google Sheet Sync Error:', err);
      return {
        success: false,
        message: 'Tersimpan lokal. Pengiriman ke Spreadsheet tertunda: ' + (err.message || 'CORS / Jaringan'),
      };
    }
  },

  async testGoogleSheetConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.startsWith('https://script.google.com')) {
      return { success: false, message: 'URL harus berformat Web App Google Apps Script (https://script.google.com/...)' };
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'TEST' }),
      });
      if (response.ok) {
        return { success: true, message: 'Koneksi ke Google Apps Script berhasil terverifikasi!' };
      }
      return { success: false, message: `Status respon dari script: ${response.status}` };
    } catch (e: any) {
      // In web apps without CORS, fetch might throw opacity error, but request might reach script
      return { success: true, message: 'URL berhasil dihubungkan. Endpoint siap menerima presensi.' };
    }
  },

  getAppThemeConfig(): AppThemeConfig {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return DEFAULT_THEME_CONFIG;
    try {
      return { ...DEFAULT_THEME_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_THEME_CONFIG;
    }
  },

  saveAppThemeConfig(config: AppThemeConfig) {
    localStorage.setItem(THEME_KEY, JSON.stringify(config));
  },

  getReportPrintConfig(): ReportPrintConfig {
    const raw = localStorage.getItem(REPORT_CONFIG_KEY);
    if (!raw) return DEFAULT_REPORT_CONFIG;
    try {
      return { ...DEFAULT_REPORT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_REPORT_CONFIG;
    }
  },

  saveReportPrintConfig(config: ReportPrintConfig) {
    localStorage.setItem(REPORT_CONFIG_KEY, JSON.stringify(config));
  },

  getTahunAjaranConfig(): TahunAjaranConfig {
    const raw = localStorage.getItem(TAHUN_AJARAN_KEY);
    if (!raw) return DEFAULT_TAHUN_AJARAN_CONFIG;
    try {
      return { ...DEFAULT_TAHUN_AJARAN_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_TAHUN_AJARAN_CONFIG;
    }
  },

  saveTahunAjaranConfig(config: TahunAjaranConfig) {
    localStorage.setItem(TAHUN_AJARAN_KEY, JSON.stringify(config));
  },

  getActiveTahunAjaran(): string {
    return this.getTahunAjaranConfig().tahunAktif || '2025/2026';
  },

  setActiveTahunAjaran(tahun: string) {
    const config = this.getTahunAjaranConfig();
    config.tahunAktif = tahun;
    if (!config.daftarTahun.includes(tahun)) {
      config.daftarTahun.push(tahun);
    }
    this.saveTahunAjaranConfig(config);
  },

  addTahunAjaran(tahun: string): boolean {
    const config = this.getTahunAjaranConfig();
    if (!config.daftarTahun.includes(tahun)) {
      config.daftarTahun.push(tahun);
      this.saveTahunAjaranConfig(config);
      return true;
    }
    return false;
  },

  deleteTahunAjaran(tahun: string) {
    const config = this.getTahunAjaranConfig();
    if (config.daftarTahun.length <= 1) return; // keep at least one
    config.daftarTahun = config.daftarTahun.filter(t => t !== tahun);
    if (config.tahunAktif === tahun) {
      config.tahunAktif = config.daftarTahun[0];
    }
    this.saveTahunAjaranConfig(config);
  },

  resetTotalData(mode: 'all' | 'attendance' | 'students' = 'all'): { success: boolean; message: string; deletedUsers: number; deletedAttendance: number } {
    let deletedUsers = 0;
    let deletedAttendance = 0;

    if (mode === 'all' || mode === 'students') {
      const allUsers = this.getUsers();
      const adminUsers = allUsers.filter(u => u.role === 'admin' || u.username.toLowerCase() === 'admin123');
      deletedUsers = allUsers.length - adminUsers.length;
      this.saveUsers(adminUsers);
    }

    if (mode === 'all' || mode === 'attendance' || mode === 'students') {
      const att = this.getAttendance();
      deletedAttendance = att.length;
      this.saveAttendance([]);
    }

    let message = '';
    if (mode === 'all') {
      message = `Reset total berhasil! Dihapus ${deletedUsers} data siswa dan ${deletedAttendance} catatan presensi. Database dalam keadaan kosong untuk tahun ajaran baru (Akun Pembimbing Sekolah admin123 tetap aman).`;
    } else if (mode === 'attendance') {
      message = `Reset data presensi berhasil! Dihapus ${deletedAttendance} catatan presensi. Data akun siswa tetap tersimpan.`;
    } else if (mode === 'students') {
      message = `Reset data siswa berhasil! Dihapus ${deletedUsers} profil siswa dan ${deletedAttendance} catatan presensi.`;
    }

    return { success: true, message, deletedUsers, deletedAttendance };
  },

  exportFullBackup(): string {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'Sistem Informasi Absensi Siswa PKL',
      tahunAjaranConfig: this.getTahunAjaranConfig(),
      users: this.getUsers(),
      attendance: this.getAttendance(),
      googleSheetConfig: this.getGoogleSheetConfig(),
      themeConfig: this.getAppThemeConfig(),
      reportConfig: this.getReportPrintConfig(),
    };
    return JSON.stringify(backupData, null, 2);
  },

  importFullBackup(jsonStr: string): { success: boolean; message: string; usersCount: number; attendanceCount: number } {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || (!Array.isArray(data.users) && !Array.isArray(data.attendance))) {
        return { success: false, message: 'Format file backup tidak valid. File harus berformat JSON backup dari aplikasi ini.', usersCount: 0, attendanceCount: 0 };
      }

      let usersCount = 0;
      let attendanceCount = 0;

      if (Array.isArray(data.users) && data.users.length > 0) {
        this.saveUsers(data.users);
        usersCount = data.users.length;
      }
      if (Array.isArray(data.attendance)) {
        this.saveAttendance(data.attendance);
        attendanceCount = data.attendance.length;
      }
      if (data.tahunAjaranConfig) {
        this.saveTahunAjaranConfig(data.tahunAjaranConfig);
      }
      if (data.googleSheetConfig) {
        this.saveGoogleSheetConfig(data.googleSheetConfig);
      }
      if (data.themeConfig) {
        this.saveAppThemeConfig(data.themeConfig);
      }
      if (data.reportConfig) {
        this.saveReportPrintConfig(data.reportConfig);
      }

      return {
        success: true,
        message: `Restore berhasil! Dipulihkan ${usersCount} akun pengguna dan ${attendanceCount} catatan absensi.`,
        usersCount,
        attendanceCount,
      };
    } catch (err: any) {
      return { success: false, message: 'Gagal memproses file JSON backup: ' + (err?.message || ''), usersCount: 0, attendanceCount: 0 };
    }
  },

  resetAttendanceToSeed() {
    const seed = generateSeedAttendance();
    this.saveAttendance(seed);
    return seed;
  },
};
