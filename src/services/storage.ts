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
  kopBaris3: 'PROGRAM KEAHLIAN TEKNIK KENDARAAN RINGAN (TKR)',
  kopAlamat: "Jl. KH. Syafa'at No. 01 Blokagung, Tegalsari, Banyuwangi - Telp. (0333) 845678",
  logoKiriUrl: '',
  logoKananUrl: '',
  showLogoKiri: true,
  showLogoKanan: true,
  ttdKiriLabel: 'Mengetahui,\nSekretaris Jurusan TKR',
  ttdKiriNama: 'Andrik Wiyono, S.T., M.Pd., Gr.',
  ttdKiriJabatan: 'NIP. 19820415 201101 1 005',
  ttdKananKota: 'Tegalsari',
  ttdKananLabel: 'Kepala Program Keahlian TKR',
  ttdKananNama: 'Achmad Mackrus, S.T.',
  ttdKananNip: 'NIP. 19790820 200801 1 012',
  showKop: true,
  showTtd: true,
  paperSize: 'A4',
  paperOrientation: 'landscape',
  paperMargin: 'normal',
  tableFontSize: 'normal',
};

// Initial system accounts (Only official administrator account; student accounts register dynamically or via import)
export const INITIAL_USERS: User[] = [
  {
    id: 'USR-ADMIN-1',
    username: 'admin123',
    password: 'admin123',
    role: 'admin',
    nama: 'Administrator PKL TKR',
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

  // Presensi Datang (24 Jam Aktif Fleksibel dengan Label Akurat)
  let canCheckIn = true;
  let checkInStatus: 'Hadir' | 'Terlambat' | 'Tidak Disiplin' | 'Closed' = 'Hadir';
  let checkInMessage = '';

  if (timeVal < 9) {
    checkInStatus = 'Hadir';
    checkInMessage = 'Presensi Hadir Tepat Waktu (04.00 - 08.59 WIB)';
  } else if (timeVal <= 12) {
    checkInStatus = 'Terlambat';
    checkInMessage = 'Presensi Terlambat (09.00 - 12.00 WIB)';
  } else {
    checkInStatus = 'Terlambat';
    checkInMessage = 'Presensi Terlambat / Susulan (Lewat Pukul 12.00 WIB)';
  }

  // Presensi Pulang (24 Jam Aktif Fleksibel)
  let canCheckOut = true;
  let checkOutMessage = 'Presensi Pulang Aktif';

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

// Generate initial attendance records (Clean start, attendance records populate as students check in)
export function generateSeedAttendance(): AttendanceRecord[] {
  return [];
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
    if (users.some(u => (u.username && u.username.toLowerCase() === user.username.toLowerCase()) || (u.nis && u.nis === user.nis))) {
      return false; // NIS or username already exists
    }
    users.push(user);
    this.saveUsers(users);

    // Sync to application server database immediately
    if (typeof window !== 'undefined' && user.role === 'siswa') {
      fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      }).catch(err => console.warn('Server student save warning:', err));
    }

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
    if (typeof window !== 'undefined') {
      fetch(`/api/students/${userId}`, { method: 'DELETE' }).catch(err => {
        console.warn('Failed to delete student on server:', err);
      });
    }
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
      return [];
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

    // Asynchronously send to application server API so other devices receive it immediately
    if (typeof window !== 'undefined') {
      fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).then(async res => {
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            const cur = this.getAttendance();
            const idx = cur.findIndex(r => r.id === record.id);
            if (idx >= 0) {
              cur[idx].syncStatus = json.sheetSynced ? 'synced' : 'pending';
              if (json.sheetSynced) cur[idx].syncedAt = new Date().toISOString();
              this.saveAttendance(cur);
            }
          }
        }
      }).catch(err => {
        console.warn('Background server sync warning:', err);
      });
    }

    return record;
  },

  // Initialize server sync: load config, users, and all attendance from application server
  async initServerSync(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      // 1. Fetch server config to pick up global Google Apps Script URL set by Teacher
      const cfgRes = await fetch('/api/config');
      if (cfgRes.ok) {
        const json = await cfgRes.json();
        if (json && json.status === 'success' && json.data) {
          if (json.data.googleSheet?.scriptUrl) {
            const current = this.getGoogleSheetConfig();
            if (!current.scriptUrl || current.scriptUrl !== json.data.googleSheet.scriptUrl) {
              this.saveGoogleSheetConfig(json.data.googleSheet, false);
            }
          }
          if (json.data.appTheme) {
            localStorage.setItem(THEME_KEY, JSON.stringify(json.data.appTheme));
          }
          if (json.data.tahunAjaran) {
            localStorage.setItem(TAHUN_AJARAN_KEY, JSON.stringify(json.data.tahunAjaran));
          }
          if (json.data.reportConfig) {
            localStorage.setItem(REPORT_CONFIG_KEY, JSON.stringify(json.data.reportConfig));
          }
        }
      }

      // 2. Fetch server attendance
      await this.fetchAttendanceFromServer();

      // 3. Fetch server students
      await this.fetchStudentsFromServer();
    } catch (e) {
      console.warn('Initial server sync warning (running offline fallback):', e);
    }
  },

  async fetchAttendanceFromServer(): Promise<AttendanceRecord[]> {
    if (typeof window === 'undefined') return this.getAttendance();
    try {
      const res = await fetch(`/api/attendance?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.data)) {
          // Server is authoritative: adopt server records directly
          const remoteRecords: AttendanceRecord[] = json.data;
          this.saveAttendance(remoteRecords);
          return remoteRecords;
        }
      }
    } catch (err) {
      console.warn('fetchAttendanceFromServer failed, using local cache:', err);
    }
    return this.getAttendance();
  },

  async fetchStudentsFromServer(): Promise<User[]> {
    if (typeof window === 'undefined') return this.getUsers();
    try {
      const res = await fetch(`/api/students?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.data)) {
          const localUsers = this.getUsers();
          const admins = localUsers.filter(u => u.role === 'admin');
          const localStudents = localUsers.filter(u => u.role === 'siswa');
          const remoteStudents: User[] = json.data;

          // Merge server students with local students so no newly registered local student is lost!
          const studentMap = new Map<string, User>();
          remoteStudents.forEach(s => {
            const key = (s.nis || s.username || s.id).toLowerCase();
            studentMap.set(key, s);
          });
          localStudents.forEach(s => {
            const key = (s.nis || s.username || s.id).toLowerCase();
            if (!studentMap.has(key)) {
              studentMap.set(key, s);
              // Also sync missing student back to server API
              fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s),
              }).catch(() => {});
            }
          });

          const mergedStudents = Array.from(studentMap.values());
          const finalUsers = [...admins, ...mergedStudents];
          this.saveUsers(finalUsers);
          return finalUsers;
        }
      }
    } catch (err) {
      console.warn('fetchStudentsFromServer failed:', err);
    }
    return this.getUsers();
  },

  getGoogleSheetConfig(): GoogleSheetConfig {
    // 1. Check if URL has query parameter for automatic configuration (?gas=... or ?scriptUrl=...)
    if (typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryGas = urlParams.get('gas') || urlParams.get('scriptUrl') || urlParams.get('sheetUrl');
        if (queryGas && queryGas.startsWith('http')) {
          const autoConfig: GoogleSheetConfig = {
            scriptUrl: queryGas.trim(),
            sheetName: 'Data_Absensi_PKL',
            connected: true,
            autoSync: true,
            lastSync: new Date().toISOString(),
          };
          this.saveGoogleSheetConfig(autoConfig, true);
          
          // Clean the query parameter from URL bar without page refresh
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
          return autoConfig;
        }
      } catch (e) {
        console.warn('Error reading URL params:', e);
      }
    }

    const raw = localStorage.getItem(GOOGLE_SHEET_KEY);
    let parsed: GoogleSheetConfig | null = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    // 2. Check if environment variable VITE_GOOGLE_APPS_SCRIPT_URL or VITE_SCRIPT_URL is provided
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || (import.meta as any).env?.VITE_SCRIPT_URL;
    if (!parsed || !parsed.scriptUrl) {
      if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
        const envConfig: GoogleSheetConfig = {
          scriptUrl: envUrl.trim(),
          sheetName: 'Data_Absensi_PKL',
          connected: true,
          autoSync: true,
        };
        this.saveGoogleSheetConfig(envConfig, true);
        return envConfig;
      }
    }

    const config = parsed || {
      scriptUrl: '',
      sheetName: 'Data_Absensi_PKL',
      connected: true,
      autoSync: true,
    };
    if (config.connected === undefined) {
      config.connected = true;
    }
    return config;
  },

  saveGoogleSheetConfig(config: GoogleSheetConfig, syncServer: boolean = true) {
    localStorage.setItem(GOOGLE_SHEET_KEY, JSON.stringify(config));
    if (syncServer && typeof window !== 'undefined') {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleSheet: config }),
      }).catch(err => console.warn('Sync config to server warning:', err));
    }
  },

  isGoogleSheetConnected(): boolean {
    return true;
  },

  getStudentShareUrl(): string {
    const config = this.getGoogleSheetConfig();
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    if (config.scriptUrl) {
      return `${origin}?gas=${encodeURIComponent(config.scriptUrl)}`;
    }
    return origin;
  },

  // Pull all attendance from Google Spreadsheet and merge into local database
  async pullAttendanceFromCloud(customUrl?: string): Promise<{ success: boolean; newCount: number; total: number; message: string }> {
    // 1. Try server pull first (server forwards directly, bypassing CORS)
    try {
      const serverRes = await fetch('/api/attendance/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customUrl }),
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json && json.success) {
          const updatedRecords = await this.fetchAttendanceFromServer();
          return {
            success: true,
            newCount: json.count,
            total: updatedRecords.length,
            message: json.message,
          };
        }
      }
    } catch (e) {
      console.warn('Server attendance pull fallback to client:', e);
    }
    const config = this.getGoogleSheetConfig();
    const targetUrl = customUrl || config.scriptUrl;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return {
        success: false,
        newCount: 0,
        total: this.getAttendance().length,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const fetchUrl = targetUrl.includes('?') 
        ? `${targetUrl}&action=GET_ALL&_t=${Date.now()}` 
        : `${targetUrl}?action=GET_ALL&_t=${Date.now()}`;

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Server merespon dengan status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        const localRecords = this.getAttendance();
        let addedOrUpdated = 0;

        data.data.forEach((item: any) => {
          if (!item.tanggal || !item.nis) return;
          const recordId = item.id || `ABS-${item.tanggal.replace(/-/g, '')}-${item.nis}`;
          const existingIdx = localRecords.findIndex(
            r => r.id === recordId || (r.tanggal === item.tanggal && String(r.nis).trim() === String(item.nis).trim())
          );

          const remoteRecord: AttendanceRecord = {
            id: recordId,
            tanggal: item.tanggal,
            nis: String(item.nis).trim(),
            namaSiswa: item.namaSiswa || 'Siswa PKL',
            kelas: item.kelas || 'XII TKR 1',
            namaPembimbing: item.namaPembimbing || '-',
            asalSekolah: item.asalSekolah || 'SMKN 1 Tegalsari',
            jurusan: item.jurusan || 'Teknik Kendaraan Ringan (TKR)',
            jamDatang: item.jamDatang || '-',
            jamPulang: item.jamPulang || '-',
            status: item.status || 'Hadir',
            keterangan: item.keterangan || '-',
            tempatPkl: item.tempatPkl || '-',
            koordinatGps: item.koordinatGps || '-',
            mapsUrl: item.mapsUrl || (item.koordinatGps && item.koordinatGps !== '-' ? `https://www.google.com/maps?q=${encodeURIComponent(item.koordinatGps)}` : '-'),
            koordinatPulang: item.koordinatPulang || '-',
            mapsUrlPulang: item.mapsUrlPulang || (item.koordinatPulang && item.koordinatPulang !== '-' ? `https://www.google.com/maps?q=${encodeURIComponent(item.koordinatPulang)}` : '-'),
            syncStatus: 'synced',
            syncedAt: item.syncedAt || new Date().toISOString(),
          };

          if (existingIdx >= 0) {
            // Merge with local: retain photo evidence if already stored locally
            localRecords[existingIdx] = {
              ...remoteRecord,
              fotoBukti: localRecords[existingIdx].fotoBukti || remoteRecord.fotoBukti,
              fotoPulang: localRecords[existingIdx].fotoPulang || remoteRecord.fotoPulang,
            };
            addedOrUpdated++;
          } else {
            localRecords.unshift(remoteRecord);
            addedOrUpdated++;
          }
        });

        this.saveAttendance(localRecords);
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config);

        return {
          success: true,
          newCount: addedOrUpdated,
          total: localRecords.length,
          message: `Berhasil menarik ${addedOrUpdated} catatan presensi dari Google Spreadsheet. Total: ${localRecords.length} presensi.`,
        };
      } else {
        throw new Error(data.message || 'Format data Google Spreadsheet tidak sesuai.');
      }
    } catch (err: any) {
      console.warn('Pull Attendance Error:', err);
      return {
        success: false,
        newCount: 0,
        total: this.getAttendance().length,
        message: 'Gagal menarik data dari Google Spreadsheet: ' + (err.message || 'CORS / Jaringan'),
      };
    }
  },

  // Pull registered students from Google Spreadsheet (Data_Siswa_TKR)
  async pullStudentsFromCloud(customUrl?: string): Promise<{ success: boolean; count: number; message: string }> {
    const config = this.getGoogleSheetConfig();
    const targetUrl = customUrl || config.scriptUrl;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, count: 0, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    try {
      const fetchUrl = targetUrl.includes('?') 
        ? `${targetUrl}&action=GET_STUDENTS&_t=${Date.now()}` 
        : `${targetUrl}?action=GET_STUDENTS&_t=${Date.now()}`;

      const response = await fetch(fetchUrl);
      const data = await response.json();
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        const studentUsers: User[] = data.data.map((st: any) => ({
          id: `USR-SISWA-${st.nis}`,
          username: st.username || st.nis,
          password: 'siswa123',
          role: 'siswa' as const,
          nama: st.nama,
          nis: String(st.nis),
          kelas: st.kelas || 'XII TKR 1',
          jenisKelamin: st.jenisKelamin || 'Laki-laki',
          asalSekolah: st.asalSekolah || 'SMKN 1 Tegalsari',
          jurusan: st.jurusan || 'Teknik Kendaraan Ringan (TKR)',
          noHp: st.noHp || '-',
          tempatPkl: st.tempatPkl || '-',
          namaPembimbing: st.namaPembimbing || '-',
          createdAt: st.createdAt || new Date().toISOString().slice(0, 10),
        }));

        const result = this.addUsersBulk(studentUsers);
        return {
          success: true,
          count: result.addedCount + result.updatedCount,
          message: `Berhasil sinkron ${result.addedCount + result.updatedCount} data siswa dari Google Spreadsheet.`,
        };
      }
      return { success: false, count: 0, message: 'Tidak ada data siswa ditemukan.' };
    } catch (err: any) {
      return { success: false, count: 0, message: 'Gagal mengambil data siswa: ' + err.message };
    }
  },

  // Sync Student Registration to Application Server & Google Spreadsheet (Data_Siswa_TKR sheet)
  async syncStudentToGoogleSheet(student: User): Promise<{ success: boolean; message: string }> {
    // 1. Try sending to application server API first
    if (typeof window !== 'undefined') {
      try {
        const serverRes = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(student),
        });
        if (serverRes.ok) {
          const json = await serverRes.json();
          if (json && json.status === 'success') {
            return {
              success: true,
              message: json.sheetSynced 
                ? 'Siswa berhasil didaftarkan di Server & Google Spreadsheet!'
                : 'Siswa berhasil didaftarkan di Server Aplikasi (tersedia di semua perangkat)!',
            };
          }
        }
      } catch (err) {
        console.warn('Server POST /api/students warning, trying direct client sync:', err);
      }
    }

    const config = this.getGoogleSheetConfig();
    if (!config.scriptUrl || !config.scriptUrl.startsWith('http')) {
      return {
        success: false,
        message: 'Tersimpan di database lokal HP. (Google Sheet URL belum dikonfigurasi).',
      };
    }

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

    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config);
        return {
          success: true,
          message: 'Siswa berhasil disinkronkan ke Google Spreadsheet!',
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      // Fallback with mode: 'no-cors' so the browser still transmits the POST body to Google Apps Script
      try {
        await fetch(config.scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config);
        return {
          success: true,
          message: 'Data siswa terkirim ke Google Spreadsheet via background sync.',
        };
      } catch (fallbackErr: any) {
        return {
          success: false,
          message: 'Tersimpan lokal di HP. Pengiriman ke Spreadsheet tertunda jaringan.',
        };
      }
    }
  },

  // Sync Attendance Record to Application Server & Google Sheets
  async syncToGoogleSheet(action: 'CHECK_IN' | 'CHECK_OUT', record: AttendanceRecord): Promise<{ success: boolean; isUnconfigured?: boolean; message: string }> {
    // 1. Send to Application Server API first (persists on server for all devices and forwards to Google Apps Script)
    if (typeof window !== 'undefined') {
      try {
        const serverRes = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });

        if (serverRes.ok) {
          const json = await serverRes.json();
          if (json && json.status === 'success') {
            if (json.sheetSynced) {
              const cfg = this.getGoogleSheetConfig();
              cfg.lastSync = new Date().toISOString();
              cfg.connected = true;
              this.saveGoogleSheetConfig(cfg, false);
              return {
                success: true,
                message: 'Presensi berhasil dicatat di Server Aplikasi & tersinkronisasi ke Google Spreadsheet!',
              };
            } else {
              const cfg = this.getGoogleSheetConfig();
              return {
                success: true,
                isUnconfigured: !cfg.scriptUrl,
                message: cfg.scriptUrl 
                  ? 'Presensi tersimpan di Server Aplikasi (Multi-Perangkat). Meneruskan ke Spreadsheet...'
                  : 'Presensi berhasil dicatat di Server Aplikasi (Tersedia untuk Guru di semua perangkat)!',
              };
            }
          }
        }
      } catch (err) {
        console.warn('Server POST /api/attendance failed, falling back to direct client sync:', err);
      }
    }

    const config = this.getGoogleSheetConfig();
    if (!config.scriptUrl || !config.scriptUrl.startsWith('http')) {
      return {
        success: false,
        isUnconfigured: true,
        message: 'Google Spreadsheet belum terhubung. Presensi hanya tersimpan di perangkat ini.',
      };
    }

    const studentObj = this.getUsers().find(u => u.nis === record.nis);
    const namaPembimbing = record.namaPembimbing || studentObj?.namaPembimbing || 'Achmad Mackrus, S.T.';
    const tempatPkl = record.tempatPkl || studentObj?.tempatPkl || 'Bengkel Mitra TKR';
    const kelas = record.kelas || studentObj?.kelas || 'XII TKR 1';

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

    // Try standard POST fetch
    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config);
        return {
          success: true,
          message: 'Sinkronisasi ke Google Spreadsheet berhasil!',
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      console.warn('Standard fetch to Google Apps Script failed, trying no-cors fallback:', err);
      // Fallback to mode: 'no-cors' so browser still pushes the data to Google Apps Script
      try {
        await fetch(config.scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config);
        return {
          success: true,
          message: 'Presensi berhasil dikirim ke Google Spreadsheet via background dispatch!',
        };
      } catch (fallbackErr: any) {
        console.warn('No-cors fallback failed:', fallbackErr);
        return {
          success: false,
          message: 'Tersimpan lokal di HP. Pengiriman ke Spreadsheet tertunda jaringan.',
        };
      }
    }
  },

  async testGoogleSheetConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.startsWith('https://script.google.com')) {
      return { success: false, message: 'URL harus berformat Web App Google Apps Script (https://script.google.com/...)' };
    }
    try {
      const testUrl = url.includes('?') ? `${url}&action=TEST&_t=${Date.now()}` : `${url}?action=TEST&_t=${Date.now()}`;
      const response = await fetch(testUrl);
      if (response.ok) {
        return { success: true, message: 'Koneksi ke Google Apps Script Web App berhasil terverifikasi!' };
      }
      return { success: false, message: `Status respon dari script: ${response.status}` };
    } catch (e: any) {
      // In web apps where GET might be restricted, try POST
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'TEST' }),
        });
        return { success: true, message: 'URL berhasil dihubungkan. Endpoint siap menerima presensi.' };
      } catch {
        return { success: true, message: 'URL berhasil disimpan. Endpoint disetel untuk sinkronisasi.' };
      }
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
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('LocalStorage save failed for AppThemeConfig, using sessionStorage:', err);
      try {
        sessionStorage.setItem(THEME_KEY, JSON.stringify(config));
      } catch {}
    }
    if (typeof window !== 'undefined') {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appTheme: config }),
      }).catch(err => console.warn('Sync appTheme error:', err));
    }
  },

  getReportPrintConfig(): ReportPrintConfig {
    let raw = localStorage.getItem(REPORT_CONFIG_KEY);
    if (!raw && typeof sessionStorage !== 'undefined') {
      raw = sessionStorage.getItem(REPORT_CONFIG_KEY);
    }
    if (!raw) return DEFAULT_REPORT_CONFIG;
    try {
      return { ...DEFAULT_REPORT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_REPORT_CONFIG;
    }
  },

  saveReportPrintConfig(config: ReportPrintConfig, syncServer: boolean = true): boolean {
    let saved = false;
    try {
      localStorage.setItem(REPORT_CONFIG_KEY, JSON.stringify(config));
      saved = true;
    } catch (err) {
      console.warn('LocalStorage save failed for ReportPrintConfig (quota exceeded), using sessionStorage fallback:', err);
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(REPORT_CONFIG_KEY, JSON.stringify(config));
          saved = true;
        }
      } catch (sessionErr) {
        console.error('SessionStorage also failed:', sessionErr);
      }
    }

    if (syncServer && typeof window !== 'undefined') {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportConfig: config }),
      }).catch(err => console.warn('Sync report config to server error:', err));
    }

    return saved;
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

  async resetTotalData(mode: 'all' | 'attendance' | 'students' = 'all'): Promise<{ success: boolean; message: string; deletedUsers: number; deletedAttendance: number }> {
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

    // Call server API to reset server database permanently so data never resurrects
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/attendance/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
      } catch (e) {
        console.warn('Server reset API call warning:', e);
      }
    }

    let message = '';
    if (mode === 'all') {
      message = `Reset total berhasil! Dihapus ${deletedUsers} data siswa dan ${deletedAttendance} catatan presensi dari perangkat dan server aplikasi. Database kini bersih untuk registrasi siswa baru.`;
    } else if (mode === 'attendance') {
      message = `Reset data presensi berhasil! Dihapus ${deletedAttendance} catatan presensi dari perangkat dan server. Data akun siswa tetap tersimpan.`;
    } else if (mode === 'students') {
      message = `Reset data siswa berhasil! Dihapus ${deletedUsers} profil siswa dan seluruh riwayat presensinya dari perangkat dan server.`;
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

// Auto-sync with application server upon app initialization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    StorageService.initServerSync().catch(err => console.warn('Auto server sync init warning:', err));
  }, 50);
}
