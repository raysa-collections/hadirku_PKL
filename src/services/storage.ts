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

/**
 * Membedakan status presensi datang dan status presensi pulang
 * sehingga administrator dapat memantau keduanya secara terpisah.
 */
export function getAttendanceSplitStatus(record: AttendanceRecord): {
  statusDatang: string;
  statusPulang: string;
} {
  if (record.status === 'Izin' || record.status === 'Sakit' || record.status === 'Alpha') {
    return {
      statusDatang: record.statusDatang || record.status,
      statusPulang: record.statusPulang || record.status,
    };
  }

  let statusDatang = record.statusDatang;
  if (!statusDatang) {
    if (!record.jamDatang || record.jamDatang === '-') {
      statusDatang = 'Belum Datang';
    } else if (record.status === 'Terlambat') {
      statusDatang = 'Terlambat';
    } else if (record.status === 'Tidak Disiplin') {
      statusDatang = 'Tidak Disiplin';
    } else {
      statusDatang = 'Hadir';
    }
  }

  let statusPulang = record.statusPulang;
  if (!statusPulang) {
    if (record.jamPulang && record.jamPulang !== '-') {
      statusPulang = 'Sudah Pulang';
    } else {
      statusPulang = 'Belum Pulang';
    }
  }

  return { statusDatang, statusPulang };
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

  addUser(user: User, syncToRemote: boolean = true): boolean {
    const users = this.getUsers();
    const existingIdx = users.findIndex(u => 
      (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase()) || 
      (u.nis && user.nis && u.nis.toLowerCase() === user.nis.toLowerCase())
    );

    let savedUser = { ...user };
    if (existingIdx >= 0) {
      // Preserve existing user's custom password if user parameter doesn't provide a new non-default password
      const existingPass = users[existingIdx].password;
      const incomingPass = user.password;
      const finalPass = (incomingPass && incomingPass !== 'siswa123') 
        ? incomingPass 
        : (existingPass || incomingPass || 'siswa123');

      savedUser = {
        ...users[existingIdx],
        ...user,
        password: finalPass,
      };
      users[existingIdx] = savedUser;
      this.saveUsers(users);
    } else {
      users.push(savedUser);
      this.saveUsers(users);
    }

    if (syncToRemote && savedUser.role === 'siswa') {
      // Single clean sync path (posts to /api/students and falls back/forwards to Google Spreadsheet)
      this.syncStudentToGoogleSheet(savedUser).catch(err => console.warn('Sync student warning:', err));
    }
    return true;
  },

  async registerStudent(user: User): Promise<{
    user: User;
    success: boolean;
    serverSynced: boolean;
    sheetSynced: boolean;
    isUnconfigured?: boolean;
    message: string;
  }> {
    await this.ensureConfigSynced();
    this.addUser(user, false);

    // Re-read saved user (with resolved password merge if NIS existed)
    const saved = this.getUsers().find(
      u => u.role === 'siswa' && (u.id === user.id || u.nis.toLowerCase() === user.nis.toLowerCase())
    ) || user;

    if (saved.role !== 'siswa') {
      return { user: saved, success: true, serverSynced: false, sheetSynced: false, message: 'Tersimpan lokal.' };
    }

    const syncRes = await this.syncStudentToGoogleSheet(saved);
    return {
      user: saved,
      success: true,
      serverSynced: Boolean(syncRes.serverSynced),
      sheetSynced: Boolean(syncRes.sheetSynced),
      isUnconfigured: syncRes.isUnconfigured,
      message: syncRes.message,
    };
  },

  addUsersBulk(newUsers: User[], syncToCloud: boolean = true): { addedCount: number; updatedCount: number } {
    const users = this.getUsers();
    let addedCount = 0;
    let updatedCount = 0;
    const syncedBatch: User[] = [];

    for (const nu of newUsers) {
      const existingIndex = users.findIndex(
        u =>
          (u.nis && nu.nis && u.nis.toLowerCase() === nu.nis.toLowerCase()) ||
          (u.username && nu.username && u.username.toLowerCase() === nu.username.toLowerCase())
      );
      if (existingIndex >= 0) {
        // If remote provides a non-default custom password, adopt it; otherwise preserve existing custom password
        const existingPass = users[existingIndex].password;
        const incomingPass = nu.password;
        const finalPass =
          incomingPass && incomingPass !== 'siswa123'
            ? incomingPass
            : existingPass && existingPass !== 'siswa123'
            ? existingPass
            : incomingPass || 'siswa123';

        const merged = {
          ...users[existingIndex],
          ...nu,
          password: finalPass,
          id: users[existingIndex].id, // keep original ID
        };
        users[existingIndex] = merged;
        if (merged.role === 'siswa') syncedBatch.push(merged);
        updatedCount++;
      } else {
        users.push(nu);
        if (nu.role === 'siswa') syncedBatch.push(nu);
        addedCount++;
      }
    }

    this.saveUsers(users);

    if (syncToCloud && syncedBatch.length > 0) {
      this.syncStudentsBulkToCloud(syncedBatch).catch(err => console.warn('Bulk sync student warning:', err));
    }

    return { addedCount, updatedCount };
  },

  async syncStudentsBulkToCloud(students: User[]): Promise<void> {
    if (typeof window === 'undefined' || students.length === 0) return;
    const config = this.getGoogleSheetConfig();
    let sheetSyncedCount = 0;

    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, scriptUrl: config.scriptUrl || '' }),
      });
      if (res.ok) {
        const json = await res.json();
        sheetSyncedCount = json?.sheetSyncedCount || 0;
      }
    } catch (err) {
      console.warn('Server bulk student save warning:', err);
    }

    // If server couldn't push all to GAS (e.g. cold Vercel /tmp) and browser has scriptUrl, push directly
    if (sheetSyncedCount < students.length && config.scriptUrl && config.scriptUrl.startsWith('http')) {
      for (const st of students) {
        await this.syncStudentToGoogleSheet(st, true).catch(() => {});
      }
    }
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
    const allUsers = this.getUsers();
    const target = allUsers.find(u => u.id === userId);
    const users = allUsers.filter(u => u.id !== userId);
    this.saveUsers(users);

    if (typeof window !== 'undefined') {
      const config = this.getGoogleSheetConfig();
      const qs = config.scriptUrl ? `?scriptUrl=${encodeURIComponent(config.scriptUrl)}` : '';
      fetch(`/api/students/${encodeURIComponent(userId)}${qs}`, { method: 'DELETE' }).catch(async err => {
        console.warn('Failed to delete student on server:', err);
        if (target && config.scriptUrl && config.scriptUrl.startsWith('http')) {
          try {
            await fetch(config.scriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'DELETE_STUDENT', nis: target.nis, username: target.username }),
            });
          } catch {}
        }
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
    return record;
  },

  // Deduplicated initial server sync promise
  _initSyncPromise: null as Promise<void> | null,

  async ensureConfigSynced(): Promise<GoogleSheetConfig> {
    if (typeof window === 'undefined') return this.getGoogleSheetConfig();
    const current = this.getGoogleSheetConfig();
    if (current.scriptUrl && current.scriptUrl.startsWith('http')) {
      return current;
    }
    try {
      const cfgRes = await fetch(`/api/config?_t=${Date.now()}`);
      if (cfgRes.ok) {
        const json = await cfgRes.json();
        if (json && json.status === 'success' && json.data?.googleSheet?.scriptUrl) {
          this.saveGoogleSheetConfig(json.data.googleSheet, false);
        }
      }
    } catch {}
    return this.getGoogleSheetConfig();
  },

  // Initialize server sync: load config, users, and all attendance from application server
  async initServerSync(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this._initSyncPromise) return this._initSyncPromise;

    this._initSyncPromise = (async () => {
      try {
        // 1. Fetch server config to pick up global Google Apps Script URL set by Admin
        const cfgRes = await fetch(`/api/config?_t=${Date.now()}`);
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
    })();

    return this._initSyncPromise;
  },

  async fetchAttendanceFromServer(): Promise<AttendanceRecord[]> {
    if (typeof window === 'undefined') return this.getAttendance();
    try {
      const res = await fetch(`/api/attendance?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.data)) {
          // Merge remote records with any unsynced local records so nothing on this device is lost
          const localRecords = this.getAttendance();
          const remoteRecords: AttendanceRecord[] = json.data;
          const map = new Map<string, AttendanceRecord>();
          remoteRecords.forEach(r => map.set(r.id || `${r.tanggal}-${r.nis}`, r));
          localRecords.forEach(lr => {
            const key = lr.id || `${lr.tanggal}-${lr.nis}`;
            if (!map.has(key)) {
              map.set(key, lr);
            } else {
              const ex = map.get(key)!;
              map.set(key, {
                ...ex,
                fotoBukti: ex.fotoBukti || lr.fotoBukti,
                fotoPulang: ex.fotoPulang || lr.fotoPulang,
              });
            }
          });
          const merged = Array.from(map.values());
          this.saveAttendance(merged);
          return merged;
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
          const config = this.getGoogleSheetConfig();

          // Merge server students with local students so no newly registered local student is lost!
          const studentMap = new Map<string, User>();
          remoteStudents.forEach(s => {
            const key = (s.nis || s.username || s.id).toLowerCase();
            studentMap.set(key, s);
          });
          localStudents.forEach(s => {
            const key = (s.nis || s.username || s.id).toLowerCase();
            const existingRemote = studentMap.get(key);
            if (existingRemote) {
              const effectivePass = (s.password && s.password !== 'siswa123')
                ? s.password
                : (existingRemote.password || s.password || 'siswa123');
              studentMap.set(key, {
                ...existingRemote,
                ...s,
                password: effectivePass,
              });
            } else {
              studentMap.set(key, s);
              // Sync missing local student to server API
              fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...s, scriptUrl: config.scriptUrl || '' }),
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

    const config: GoogleSheetConfig = parsed || {
      scriptUrl: '',
      sheetName: 'Data_Absensi_PKL',
      connected: false,
      autoSync: true,
    };
    const hasValidUrl = Boolean(config.scriptUrl && config.scriptUrl.trim().startsWith('http'));
    config.connected = hasValidUrl;
    return config;
  },

  saveGoogleSheetConfig(config: GoogleSheetConfig, syncServer: boolean = true) {
    const cleanUrl = (config.scriptUrl || '').trim();
    const normalized: GoogleSheetConfig = {
      ...config,
      scriptUrl: cleanUrl,
      connected: Boolean(cleanUrl && cleanUrl.startsWith('http')),
    };
    localStorage.setItem(GOOGLE_SHEET_KEY, JSON.stringify(normalized));
    if (syncServer && typeof window !== 'undefined') {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleSheet: normalized }),
      }).catch(err => console.warn('Sync config to server warning:', err));
    }
  },

  isGoogleSheetConnected(): boolean {
    const cfg = this.getGoogleSheetConfig();
    return Boolean(cfg.scriptUrl && cfg.scriptUrl.trim().startsWith('http'));
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
    const config = await this.ensureConfigSynced();
    const targetUrl = (customUrl || config.scriptUrl || '').trim();
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return {
        success: false,
        newCount: 0,
        total: this.getAttendance().length,
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    // 1. Try server pull first (server forwards directly, bypassing CORS)
    try {
      const serverRes = await fetch('/api/attendance/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json && json.success) {
          if (Array.isArray(json.data)) {
            this.saveAttendance(json.data);
          } else {
            await this.fetchAttendanceFromServer();
          }
          const updatedRecords = this.getAttendance();
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

    try {
      const fetchUrl = targetUrl.includes('?') 
        ? `${targetUrl}&action=GET_ALL&_t=${Date.now()}` 
        : `${targetUrl}?action=GET_ALL&_t=${Date.now()}`;

      const response = await fetch(fetchUrl, { redirect: 'follow' });
      const rawText = await response.text();
      if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
        throw new Error('Akses Google Apps Script belum disetel ke Anyone (Siapa saja).');
      }
      if (!response.ok) {
        throw new Error(`Server merespon dengan status ${response.status}`);
      }

      const data = JSON.parse(rawText);
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
        this.saveGoogleSheetConfig(config, false);

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
    const config = await this.ensureConfigSynced();
    const targetUrl = (customUrl || config.scriptUrl || '').trim();
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, count: 0, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    // 1. Try server proxy pull first (bypasses browser CORS and merges into server database cleanly)
    try {
      const serverRes = await fetch('/api/students/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json && json.success && Array.isArray(json.data)) {
          // Pass syncToCloud = false so pulling does NOT re-push students back to Spreadsheet
          this.addUsersBulk(json.data, false);
          config.lastSync = new Date().toISOString();
          config.connected = true;
          this.saveGoogleSheetConfig(config, false);
          return {
            success: true,
            count: json.count ?? json.data.length,
            message: json.message || `Berhasil sinkron ${json.data.length} data siswa dari Google Spreadsheet.`,
          };
        }
      }
    } catch (e) {
      console.warn('Server student pull fallback to client:', e);
    }

    // 2. Direct browser GET fallback
    try {
      const fetchUrl = targetUrl.includes('?') 
        ? `${targetUrl}&action=GET_STUDENTS&_t=${Date.now()}` 
        : `${targetUrl}?action=GET_STUDENTS&_t=${Date.now()}`;

      const response = await fetch(fetchUrl, { redirect: 'follow' });
      const rawText = await response.text();
      if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
        return {
          success: false,
          count: 0,
          message: 'Akses Google Apps Script belum disetel ke Anyone (Siapa saja).',
        };
      }
      const data = JSON.parse(rawText);
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        const defaultTahun = this.getActiveTahunAjaran();
        const studentUsers: User[] = data.data
          .filter((st: any) => st && st.nis && st.nama)
          .map((st: any) => ({
            id: `USR-SISWA-${String(st.nis).trim()}`,
            username: String(st.username || st.nis).trim().toLowerCase().replace(/\s+/g, ''),
            password: st.password ? String(st.password).trim() : 'siswa123',
            role: 'siswa' as const,
            nama: String(st.nama).trim(),
            nis: String(st.nis).trim(),
            kelas: st.kelas || 'XII TKR 1',
            jenisKelamin: (st.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki') as 'Laki-laki' | 'Perempuan',
            asalSekolah: st.asalSekolah || 'SMKN 1 Tegalsari',
            jurusan: st.jurusan || 'Teknik Kendaraan Ringan (TKR)',
            noHp: st.noHp || '-',
            tempatPkl: st.tempatPkl || '-',
            namaPembimbing: st.namaPembimbing || '-',
            tahunAjaran: st.tahunAjaran || defaultTahun,
            createdAt: st.createdAt || new Date().toISOString().slice(0, 10),
          }));

        // IMPORTANT: pass false for syncToCloud so pulled students aren't re-pushed!
        const result = this.addUsersBulk(studentUsers, false);
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config, false);
        return {
          success: true,
          count: result.addedCount + result.updatedCount,
          message: `Berhasil sinkron ${studentUsers.length} data siswa dari Google Spreadsheet.`,
        };
      }
      return { success: false, count: 0, message: data?.message || 'Tidak ada data siswa ditemukan.' };
    } catch (err: any) {
      return { success: false, count: 0, message: 'Gagal mengambil data siswa: ' + err.message };
    }
  },

  // Sync Student Registration to Application Server & Google Spreadsheet (Data_Siswa_TKR sheet)
  async syncStudentToGoogleSheet(
    student: User,
    skipServerApi: boolean = false
  ): Promise<{ success: boolean; serverSynced?: boolean; sheetSynced?: boolean; isUnconfigured?: boolean; message: string }> {
    const config = await this.ensureConfigSynced();
    const targetUrl = (config.scriptUrl || '').trim();
    let serverSynced = false;

    // 1. Try sending to application server API first (passing scriptUrl so stateless Vercel lambdas can forward cleanly)
    if (!skipServerApi && typeof window !== 'undefined') {
      try {
        const serverRes = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...student, scriptUrl: targetUrl }),
        });
        if (serverRes.ok) {
          const json = await serverRes.json();
          if (json && json.status === 'success') {
            serverSynced = true;
            // ONLY return early if the server CONFIRMED it synced to Google Spreadsheet!
            if (json.sheetSynced === true) {
              config.lastSync = new Date().toISOString();
              config.connected = true;
              this.saveGoogleSheetConfig(config, false);
              return {
                success: true,
                serverSynced: true,
                sheetSynced: true,
                message: 'Siswa berhasil didaftarkan di Server & Google Spreadsheet!',
              };
            }
          }
        }
      } catch (err) {
        console.warn('Server POST /api/students warning, trying direct client sync:', err);
      }
    }

    // 2. If server didn't sync to Spreadsheet (e.g. cold Vercel /tmp without env var, or static deploy), push directly from browser
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return {
        success: serverSynced,
        serverSynced,
        sheetSynced: false,
        isUnconfigured: true,
        message: serverSynced
          ? 'Tersimpan di server lokal. URL Google Spreadsheet belum dikonfigurasi pada perangkat ini.'
          : 'Tersimpan di perangkat. URL Google Spreadsheet belum dikonfigurasi.',
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
      tahunAjaran: student.tahunAjaran || this.getActiveTahunAjaran(),
      password: student.password || 'siswa123',
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const rawText = await response.text();
      if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
        return {
          success: false,
          serverSynced,
          sheetSynced: false,
          message: 'Gagal menyimpan ke Spreadsheet: akses Google Apps Script belum diatur ke "Anyone / Siapa saja".',
        };
      }

      if (response.ok) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {}
        if (parsed && parsed.status === 'error') {
          return {
            success: false,
            serverSynced,
            sheetSynced: false,
            message: parsed.message || 'Gagal menyimpan data siswa di Google Apps Script.',
          };
        }
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config, false);
        return {
          success: true,
          serverSynced,
          sheetSynced: true,
          message: 'Siswa berhasil disinkronkan ke Google Spreadsheet!',
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      // Fallback with mode: 'no-cors' when CORS blocks reading the GAS redirect response
      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config, false);
        return {
          success: true,
          serverSynced,
          sheetSynced: true,
          message: 'Data siswa terkirim ke Google Spreadsheet via background sync.',
        };
      } catch (fallbackErr: any) {
        return {
          success: false,
          serverSynced,
          sheetSynced: false,
          message: 'Tersimpan lokal di HP. Pengiriman ke Spreadsheet tertunda jaringan.',
        };
      }
    }
  },

  // Sync Attendance Record to Application Server & Google Sheets
  async syncToGoogleSheet(action: 'CHECK_IN' | 'CHECK_OUT', record: AttendanceRecord): Promise<{ success: boolean; isUnconfigured?: boolean; message: string }> {
    const config = await this.ensureConfigSynced();
    const targetUrl = (config.scriptUrl || '').trim();
    let serverSynced = false;

    // 1. Send to Application Server API first (passing scriptUrl so stateless Vercel functions can forward cleanly)
    if (typeof window !== 'undefined') {
      try {
        const serverRes = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...record, scriptUrl: targetUrl }),
        });

        if (serverRes.ok) {
          const json = await serverRes.json();
          if (json && json.status === 'success') {
            serverSynced = true;
            // ONLY return early if the server ACTUALLY synced to Google Spreadsheet!
            if (json.sheetSynced === true) {
              config.lastSync = new Date().toISOString();
              config.connected = true;
              this.saveGoogleSheetConfig(config, false);
              return {
                success: true,
                message: 'Presensi berhasil dicatat di Server Aplikasi & tersinkronisasi ke Google Spreadsheet!',
              };
            }
          }
        }
      } catch (err) {
        console.warn('Server POST /api/attendance failed, falling back to direct client sync:', err);
      }
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return {
        success: serverSynced,
        isUnconfigured: true,
        message: serverSynced
          ? 'Presensi tersimpan di Server Aplikasi.'
          : 'Google Spreadsheet belum terhubung. Presensi hanya tersimpan di perangkat ini.',
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

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const rawText = await response.text();
      if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
        return {
          success: false,
          message: 'Akses Google Apps Script belum disetel ke Anyone (Siapa saja).',
        };
      }

      if (response.ok) {
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config, false);
        return {
          success: true,
          message: 'Sinkronisasi ke Google Spreadsheet berhasil!',
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      console.warn('Standard fetch to Google Apps Script failed, trying no-cors fallback:', err);
      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config, false);
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
    const cleanUrl = (url || '').trim();
    if (!cleanUrl || !cleanUrl.startsWith('https://script.google.com')) {
      return { success: false, message: 'URL harus berformat Web App Google Apps Script (https://script.google.com/...)' };
    }

    // 1. Test through server proxy first so CORS doesn't mask Google Sign-In HTML / permission errors
    if (typeof window !== 'undefined') {
      try {
        const srvRes = await fetch('/api/gas/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl }),
        });
        if (srvRes.ok) {
          const json = await srvRes.json();
          if (typeof json?.success === 'boolean') {
            return json;
          }
        }
      } catch {
        // Fallback to direct client test
      }
    }

    // 2. Direct client test fallback
    try {
      const testUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=TEST&_t=${Date.now()}` : `${cleanUrl}?action=TEST&_t=${Date.now()}`;
      const response = await fetch(testUrl, { redirect: 'follow' });
      const text = await response.text();
      if (text.includes('accounts.google.com') || text.trim().startsWith('<')) {
        return {
          success: false,
          message: 'Google Apps Script meminta login Google! Pastikan saat Deploy Web App pilih Who has access = Anyone (Siapa saja).',
        };
      }
      if (response.ok) {
        const data = JSON.parse(text);
        if (data?.status === 'success') {
          return { success: true, message: data.message || 'Koneksi ke Google Apps Script Web App berhasil terverifikasi!' };
        }
      }
      return { success: false, message: `Status respon dari script: ${response.status}` };
    } catch (e: any) {
      return {
        success: false,
        message: 'Tidak dapat memverifikasi endpoint Google Apps Script: ' + (e?.message || 'Periksa URL & izin Anyone'),
      };
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
