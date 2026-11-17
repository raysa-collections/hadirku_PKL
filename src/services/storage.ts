import { User, AttendanceRecord, GoogleSheetConfig, AppThemeConfig, ReportPrintConfig, TahunAjaranConfig, DataResetState } from '../types/pkl';
import {
  DEFAULT_TAHUN_AJARAN_CONFIG,
  DEFAULT_THEME_CONFIG,
  DEFAULT_REPORT_CONFIG,
  INITIAL_USERS,
  generateSeedAttendance,
} from '../constants/defaults';

export {
  DEFAULT_TAHUN_AJARAN_CONFIG,
  DEFAULT_THEME_CONFIG,
  DEFAULT_REPORT_CONFIG,
  INITIAL_USERS,
  generateSeedAttendance,
};

const USERS_KEY = 'pkl_users_v1';
const ATTENDANCE_KEY = 'pkl_attendance_v1';
const CURRENT_USER_KEY = 'pkl_current_user_v1';
const GOOGLE_SHEET_KEY = 'pkl_google_sheet_v1';
const THEME_KEY = 'pkl_theme_config_v1';
const REPORT_CONFIG_KEY = 'pkl_report_config_v1';
const TAHUN_AJARAN_KEY = 'pkl_tahun_ajaran_v1';
const RESET_STATE_KEY = 'pkl_reset_state_v1';
const SYNC_QUEUE_KEY = 'pkl_sync_queue_v1';
const GAS_COOKIE_NAME = 'pkl_gas_url';
const TAHUN_COOKIE_NAME = 'pkl_tahun_ajaran';
const RESET_COOKIE_NAME = 'pkl_reset_state';

export interface ChangeNotificationDetail {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: string;
}

interface SyncQueueItem {
  type: 'STUDENT' | 'ATTENDANCE';
  key: string;
  action?: 'CHECK_IN' | 'CHECK_OUT';
  queuedAt: string;
}

function getCookieValue(name: string): string {
  if (typeof document === 'undefined') return '';
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

function setCookieValue(name: string, value: string, maxAgeSeconds: number = 31536000) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
  } catch {}
}

const GAS_CACHE_NAME = 'pkl-cloud-config-v1';
const GAS_CACHE_KEY = '/__pkl_gas_config.json';

async function saveGasUrlToCache(scriptUrl: string): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(GAS_CACHE_NAME);
    if (scriptUrl && scriptUrl.startsWith('http')) {
      const res = new Response(JSON.stringify({ scriptUrl }), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(GAS_CACHE_KEY, res);
    } else {
      await cache.delete(GAS_CACHE_KEY);
    }
  } catch {}
}

async function readGasUrlFromCache(): Promise<string> {
  if (typeof window === 'undefined' || !('caches' in window)) return '';
  try {
    const cache = await caches.open(GAS_CACHE_NAME);
    const match = await cache.match(GAS_CACHE_KEY);
    if (!match) return '';
    const json = await match.json();
    const url = typeof json?.scriptUrl === 'string' ? json.scriptUrl.trim() : '';
    return url.startsWith('http') ? url : '';
  } catch {
    return '';
  }
}

function writeServerMeta(patch: Record<string, any>) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const raw = sessionStorage.getItem('pkl_server_meta_v1');
    const prev = raw ? JSON.parse(raw) : {};
    sessionStorage.setItem('pkl_server_meta_v1', JSON.stringify({ ...prev, ...patch }));
  } catch {}
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

let _notifySyncTimer: ReturnType<typeof setTimeout> | null = null;
let _lastServerSyncedGasUrl = '';

function notifySyncUpdate() {
  if (typeof window === 'undefined') return;
  if (_notifySyncTimer !== null) return;
  _notifySyncTimer = setTimeout(() => {
    _notifySyncTimer = null;
    try {
      window.dispatchEvent(new CustomEvent('pkl-sync-updated'));
    } catch {}
  }, 0);
}

function dispatchChangeNotification(
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' = 'success'
) {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    try {
      const detail: ChangeNotificationDetail = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
      };
      window.dispatchEvent(new CustomEvent('pkl-change-notification', { detail }));
    } catch {}
  }, 0);
}

function parseGasTimestampMs(raw?: string): number {
  if (!raw) return 0;
  const str = String(raw).replace(/\s*WIB\s*$/i, '').trim();
  if (!str) return 0;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    const iso = str.replace(/\s+/, 'T') + (str.length <= 16 ? ':00' : '') + '+07:00';
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const ms = Date.parse(`${str}T00:00:00+07:00`);
    return Number.isNaN(ms) ? 0 : ms;
  }
  const ms = Date.parse(str);
  return Number.isNaN(ms) ? 0 : ms;
}

function mergeResetStates(a: DataResetState = {}, b: DataResetState = {}): DataResetState {
  const aStuMs = a.studentsResetAt ? Date.parse(a.studentsResetAt) : 0;
  const bStuMs = b.studentsResetAt ? Date.parse(b.studentsResetAt) : 0;
  const aAttMs = a.attendanceResetAt ? Date.parse(a.attendanceResetAt) : 0;
  const bAttMs = b.attendanceResetAt ? Date.parse(b.attendanceResetAt) : 0;

  const stuSet = new Set<string>();
  (a.ignoredStudentKeys || []).forEach(k => stuSet.add(String(k).toLowerCase()));
  (b.ignoredStudentKeys || []).forEach(k => stuSet.add(String(k).toLowerCase()));

  const attSet = new Set<string>();
  (a.ignoredAttendanceKeys || []).forEach(k => attSet.add(String(k)));
  (b.ignoredAttendanceKeys || []).forEach(k => attSet.add(String(k)));

  return {
    studentsResetAt: bStuMs >= aStuMs ? (b.studentsResetAt || a.studentsResetAt) : a.studentsResetAt,
    attendanceResetAt: bAttMs >= aAttMs ? (b.attendanceResetAt || a.attendanceResetAt) : a.attendanceResetAt,
    ignoredStudentKeys: Array.from(stuSet).slice(-500),
    ignoredAttendanceKeys: Array.from(attSet).slice(-500),
  };
}

async function verifyGasRecordExists(
  targetUrl: string,
  type: 'STUDENT' | 'ATTENDANCE',
  identifier: string,
  tanggal?: string,
  action?: 'CHECK_IN' | 'CHECK_OUT'
): Promise<{ verified: boolean; permissionError?: boolean }> {
  try {
    const query =
      type === 'STUDENT'
        ? `action=GET_STUDENTS&_t=${Date.now()}`
        : `action=GET_ALL&nis=${encodeURIComponent(identifier)}&_t=${Date.now()}`;
    const checkUrl = targetUrl.includes('?') ? `${targetUrl}&${query}` : `${targetUrl}?${query}`;
    const res = await fetchWithTimeout(checkUrl, { redirect: 'follow' }, 15000);
    const txt = await res.text();
    if (txt.includes('accounts.google.com') || txt.trim().startsWith('<')) {
      return { verified: false, permissionError: true };
    }
    const json = JSON.parse(txt);
    if (!json || json.status !== 'success' || !Array.isArray(json.data)) {
      return { verified: false };
    }
    const normId = identifier.trim().toLowerCase();
    if (type === 'STUDENT') {
      const found = json.data.some(
        (st: any) =>
          (st.nis && String(st.nis).trim().toLowerCase() === normId) ||
          (st.username && String(st.username).trim().toLowerCase() === normId)
      );
      return { verified: found };
    }
    const found = json.data.some((att: any) => {
      const sameNis = att.nis && String(att.nis).trim().toLowerCase() === normId;
      const sameDate = !tanggal || att.tanggal === tanggal;
      if (!sameNis || !sameDate) return false;
      if (action === 'CHECK_OUT') {
        return Boolean(att.jamPulang && att.jamPulang !== '-');
      }
      return true;
    });
    return { verified: found };
  } catch {
    return { verified: false };
  }
}

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

    if (syncToRemote) {
      this.unignoreStudentKeys(savedUser.nis, savedUser.username);
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
    await this.syncConfigFromServer();
    const rs = this.getResetState();
    const stuResetMs = rs.studentsResetAt ? Date.parse(rs.studentsResetAt) : 0;
    const nowIso = new Date(Math.max(Date.now(), stuResetMs + 2000)).toISOString();
    const stampedUser: User = {
      ...user,
      createdAt: user.createdAt && /\d{2}:\d{2}/.test(user.createdAt) ? user.createdAt : nowIso,
    };

    this.unignoreStudentKeys(stampedUser.nis, stampedUser.username);
    this.addUser(stampedUser, false);

    // Re-read saved user (with resolved password merge if NIS existed)
    const saved = this.getUsers().find(
      u => u.role === 'siswa' && (u.id === stampedUser.id || u.nis.toLowerCase() === stampedUser.nis.toLowerCase())
    ) || stampedUser;

    if (saved.role !== 'siswa') {
      return { user: saved, success: true, serverSynced: false, sheetSynced: false, message: 'Tersimpan lokal.' };
    }

    const syncRes = await this.syncStudentToGoogleSheet(saved);
    const syncedUser = syncRes.user || saved;
    if (syncRes.user) {
      this.addUser(syncRes.user, false);
    }
    return {
      user: syncedUser,
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
      if (syncToCloud) {
        this.unignoreStudentKeys(nu.nis, nu.username);
      }
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.scriptUrl && config.scriptUrl.startsWith('http')) {
        headers['x-gas-url'] = config.scriptUrl;
      }
      const res = await fetchWithTimeout('/api/students/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ students, scriptUrl: config.scriptUrl || '' }),
      }, 15000);
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
    try {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
    } catch (err) {
      // QuotaExceededError recovery: strip heavy base64 photos from older already-synced records
      console.warn('localStorage quota reached in saveAttendance, compacting older photos:', err);
      const compacted = records.map((r, idx) => {
        if (idx >= 8 && r.syncStatus === 'synced') {
          const { fotoBukti, fotoPulang, ...rest } = r;
          return rest;
        }
        return r;
      });
      try {
        localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(compacted));
      } catch {
        // Last resort: strip photos on all synced records
        const stripped = records.map((r) => {
          if (r.syncStatus === 'synced') {
            const { fotoBukti, fotoPulang, ...rest } = r;
            return rest;
          }
          return r;
        });
        try {
          localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(stripped));
        } catch {}
      }
    }
  },

  addOrUpdateAttendance(record: AttendanceRecord) {
    this.unignoreAttendanceKeys(record.id, record.tanggal, record.nis);
    const records = this.getAttendance();
    const normNis = String(record.nis || '').trim().toLowerCase();
    const existingIndex = records.findIndex(
      r => r.id === record.id || (r.tanggal === record.tanggal && String(r.nis || '').trim().toLowerCase() === normNis)
    );
    if (existingIndex >= 0) {
      records[existingIndex] = { ...records[existingIndex], ...record };
    } else {
      records.unshift(record);
    }
    this.saveAttendance(records);
    notifySyncUpdate();
    return record;
  },

  // --- OUTBOX / PENDING SYNC QUEUE ---
  getSyncQueue(): SyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveSyncQueue(queue: SyncQueueItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch {}
    notifySyncUpdate();
  },

  enqueuePendingSync(item: Omit<SyncQueueItem, 'queuedAt'>) {
    const queue = this.getSyncQueue();
    const existsIdx = queue.findIndex(q => q.type === item.type && q.key.toLowerCase() === item.key.toLowerCase());
    if (existsIdx >= 0 && queue[existsIdx].action === item.action) {
      return;
    }
    const entry: SyncQueueItem = { ...item, queuedAt: new Date().toISOString() };
    if (existsIdx >= 0) {
      queue[existsIdx] = entry;
    } else {
      queue.push(entry);
    }
    this.saveSyncQueue(queue);
  },

  dequeuePendingSync(type: 'STUDENT' | 'ATTENDANCE', key: string) {
    const queue = this.getSyncQueue();
    const nextQueue = queue.filter(
      q => !(q.type === type && q.key.toLowerCase() === key.toLowerCase())
    );
    if (nextQueue.length !== queue.length) {
      this.saveSyncQueue(nextQueue);
    }
  },

  getPendingSyncCount(): number {
    const qCount = this.getSyncQueue().length;
    const pendingAtt = this.getAttendance().filter(r => r.syncStatus === 'pending').length;
    return Math.max(qCount, pendingAtt);
  },

  getServerDiagnostics(): {
    isVercel: boolean;
    hasEnvScriptUrl: boolean;
    serverReachable: boolean | null;
    serverHasScriptUrl: boolean;
    serverError?: string;
  } {
    if (typeof window === 'undefined') {
      return { isVercel: false, hasEnvScriptUrl: false, serverReachable: null, serverHasScriptUrl: false };
    }
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || (import.meta as any).env?.VITE_SCRIPT_URL;
    let storedMeta: any = null;
    try {
      const raw = sessionStorage.getItem('pkl_server_meta_v1');
      if (raw) storedMeta = JSON.parse(raw);
    } catch {}
    return {
      isVercel: Boolean(storedMeta?.isVercel || window.location.hostname.includes('vercel.app')),
      hasEnvScriptUrl: Boolean((envUrl && String(envUrl).startsWith('http')) || storedMeta?.hasEnvScriptUrl),
      serverReachable: typeof storedMeta?.serverReachable === 'boolean' ? storedMeta.serverReachable : null,
      serverHasScriptUrl: Boolean(storedMeta?.serverHasScriptUrl),
      serverError: storedMeta?.serverError,
    };
  },

  async pingServerHealth(): Promise<{
    ok: boolean;
    isVercel: boolean;
    hasEnvScriptUrl: boolean;
    serverHasScriptUrl: boolean;
    totalAttendance: number;
    totalStudents: number;
    error?: string;
  }> {
    if (typeof window === 'undefined') {
      return { ok: false, isVercel: false, hasEnvScriptUrl: false, serverHasScriptUrl: false, totalAttendance: 0, totalStudents: 0 };
    }
    try {
      const res = await fetchWithTimeout(`/api/health?_t=${Date.now()}`, {}, 7000);
      if (!res.ok) {
        const errMsg = `HTTP ${res.status}`;
        writeServerMeta({ serverReachable: false, serverError: errMsg });
        notifySyncUpdate();
        return {
          ok: false,
          isVercel: window.location.hostname.includes('vercel.app'),
          hasEnvScriptUrl: false,
          serverHasScriptUrl: false,
          totalAttendance: 0,
          totalStudents: 0,
          error: errMsg,
        };
      }
      const json = await res.json();
      if (json && json.status === 'ok') {
        writeServerMeta({
          isVercel: Boolean(json.isVercel || window.location.hostname.includes('vercel.app')),
          hasEnvScriptUrl: Boolean(json.hasEnvScriptUrl),
          serverHasScriptUrl: Boolean(json.serverHasScriptUrl),
          serverReachable: true,
          serverError: undefined,
        });
        notifySyncUpdate();
        return {
          ok: true,
          isVercel: Boolean(json.isVercel || window.location.hostname.includes('vercel.app')),
          hasEnvScriptUrl: Boolean(json.hasEnvScriptUrl),
          serverHasScriptUrl: Boolean(json.serverHasScriptUrl),
          totalAttendance: Number(json.totalAttendance || 0),
          totalStudents: Number(json.totalStudents || 0),
        };
      }
      throw new Error('Respon server tidak valid');
    } catch (err: any) {
      const errMsg = err?.message || 'Tidak dapat menghubungi /api/health';
      writeServerMeta({ serverReachable: false, serverError: errMsg });
      notifySyncUpdate();
      return {
        ok: false,
        isVercel: window.location.hostname.includes('vercel.app'),
        hasEnvScriptUrl: false,
        serverHasScriptUrl: false,
        totalAttendance: 0,
        totalStudents: 0,
        error: errMsg,
      };
    }
  },

  _flushPromise: null as Promise<{ flushed: number; remaining: number }> | null,

  async flushPendingSyncQueue(): Promise<{ flushed: number; remaining: number }> {
    if (typeof window === 'undefined') return { flushed: 0, remaining: 0 };
    if (this._flushPromise) return this._flushPromise;

    this._flushPromise = (async () => {
      let flushed = 0;
      try {
        await this.ensureConfigSynced();
        const queue = this.getSyncQueue();
        const users = this.getUsers();
        const attendance = this.getAttendance();

        // Also include any attendance record marked syncStatus === 'pending' even if not in queue
        const attendanceIdsInQueue = new Set(queue.filter(q => q.type === 'ATTENDANCE').map(q => q.key));
        const extraPending = attendance
          .filter(r => r.syncStatus === 'pending' && !attendanceIdsInQueue.has(r.id))
          .map(r => ({
            type: 'ATTENDANCE' as const,
            key: r.id,
            action: (r.jamPulang && r.jamPulang !== '-' ? 'CHECK_OUT' : 'CHECK_IN') as 'CHECK_IN' | 'CHECK_OUT',
            queuedAt: new Date().toISOString(),
          }));

        const resetState = this.getResetState();
        const allItems = [...queue, ...extraPending];
        for (const item of allItems) {
          if (item.type === 'STUDENT') {
            const student = users.find(
              u => u.role === 'siswa' && (u.nis.toLowerCase() === item.key.toLowerCase() || u.id === item.key)
            );
            if (!student || this.isPreResetStudent(student.nis || '', student.username || '', student.createdAt || '', resetState)) {
              this.dequeuePendingSync('STUDENT', item.key);
              continue;
            }
            const res = await this.syncStudentToGoogleSheet(student, false, true);
            if (res.sheetSynced) {
              this.dequeuePendingSync('STUDENT', item.key);
              flushed++;
            }
          } else if (item.type === 'ATTENDANCE') {
            const rec = attendance.find(r => r.id === item.key);
            if (!rec || this.isPreResetAttendance(rec.id, rec.tanggal, rec.nis, rec.syncedAt || '', resetState)) {
              this.dequeuePendingSync('ATTENDANCE', item.key);
              continue;
            }
            const action = item.action || (rec.jamPulang && rec.jamPulang !== '-' ? 'CHECK_OUT' : 'CHECK_IN');
            const res = await this.syncToGoogleSheet(action, rec, true);
            if (res.sheetSynced) {
              rec.syncStatus = 'synced';
              rec.syncedAt = new Date().toISOString();
              this.addOrUpdateAttendance(rec);
              this.dequeuePendingSync('ATTENDANCE', item.key);
              flushed++;
            }
          }
        }
      } catch (err) {
        console.warn('flushPendingSyncQueue warning:', err);
      } finally {
        this._flushPromise = null;
      }
      return { flushed, remaining: this.getPendingSyncCount() };
    })();

    return this._flushPromise;
  },

  // Deduplicated initial server sync promise
  _initSyncPromise: null as Promise<void> | null,

  _syncConfigPromise: null as Promise<GoogleSheetConfig> | null,

  async syncConfigFromServer(): Promise<GoogleSheetConfig> {
    if (typeof window === 'undefined') return this.getGoogleSheetConfig();
    if (this._syncConfigPromise) return this._syncConfigPromise;

    this._syncConfigPromise = (async () => {
      try {
        let localConfig = this.getGoogleSheetConfig();
        if (!localConfig.scriptUrl) {
          const cachedUrl = await readGasUrlFromCache();
          if (cachedUrl && cachedUrl.startsWith('http')) {
            localConfig = {
              scriptUrl: cachedUrl,
              sheetName: 'Data_Absensi_PKL',
              connected: true,
              autoSync: true,
            };
            this.saveGoogleSheetConfig(localConfig, false, false);
          }
        }

        const cfgHeaders: Record<string, string> = {};
        if (localConfig.scriptUrl && localConfig.scriptUrl.startsWith('http')) {
          cfgHeaders['x-gas-url'] = localConfig.scriptUrl;
        }
        const cfgRes = await fetchWithTimeout(`/api/config?_t=${Date.now()}`, { headers: cfgHeaders }, 5500);
        if (cfgRes.ok) {
          const json = await cfgRes.json();
          writeServerMeta({
            ...(json?.meta || {}),
            serverReachable: true,
            serverError: undefined,
          });
          if (json && json.status === 'success' && json.data) {
            if (json.data.googleSheet?.scriptUrl) {
              if (!localConfig.scriptUrl || localConfig.scriptUrl !== json.data.googleSheet.scriptUrl) {
                this.saveGoogleSheetConfig(json.data.googleSheet, false);
              }
            }
            if (json.data.appTheme) {
              try {
                localStorage.setItem(THEME_KEY, JSON.stringify(json.data.appTheme));
              } catch {}
            }
            if (json.data.tahunAjaran) {
              const serverTa: TahunAjaranConfig = { ...DEFAULT_TAHUN_AJARAN_CONFIG, ...json.data.tahunAjaran };
              const localTa = this.getTahunAjaranConfig();
              const serverMs = serverTa.updatedAt ? Date.parse(serverTa.updatedAt) : 0;
              const localMs = localTa.updatedAt ? Date.parse(localTa.updatedAt) : 0;
              if (
                localMs > serverMs ||
                (localMs === serverMs &&
                  localTa.tahunAktif !== DEFAULT_TAHUN_AJARAN_CONFIG.tahunAktif &&
                  serverTa.tahunAktif === DEFAULT_TAHUN_AJARAN_CONFIG.tahunAktif)
              ) {
                this.syncTahunAjaranToServer(localTa).catch(() => {});
              } else {
                this.saveTahunAjaranConfig(serverTa, false, false);
              }
            }
            if (json.data.resetState) {
              const localRs = this.getResetState();
              const mergedRs = mergeResetStates(localRs, json.data.resetState as DataResetState);
              this.saveResetState(mergedRs);
              this.purgePreResetLocalData(mergedRs);
            }
            if (json.data.reportConfig) {
              this.saveReportPrintConfig(json.data.reportConfig, false);
            }
          }
        }
      } catch {
        // Offline / network fallback keeps existing local config
      } finally {
        this._syncConfigPromise = null;
      }
      return this.getGoogleSheetConfig();
    })();

    return this._syncConfigPromise;
  },

  async ensureConfigSynced(): Promise<GoogleSheetConfig> {
    if (typeof window === 'undefined') return this.getGoogleSheetConfig();
    const current = this.getGoogleSheetConfig();
    if (current.scriptUrl && current.scriptUrl.startsWith('http')) {
      saveGasUrlToCache(current.scriptUrl).catch(() => {});
      return current;
    }

    // Check shared PWA CacheStorage before hitting server (handles standalone WebAPK launches where ?gas= was stripped)
    const cachedUrl = await readGasUrlFromCache();
    if (cachedUrl && cachedUrl.startsWith('http')) {
      const restored: GoogleSheetConfig = {
        scriptUrl: cachedUrl,
        sheetName: 'Data_Absensi_PKL',
        connected: true,
        autoSync: true,
      };
      this.saveGoogleSheetConfig(restored, true);
      return this.getGoogleSheetConfig();
    }

    try {
      const cfgRes = await fetchWithTimeout(`/api/config?_t=${Date.now()}`, {}, 7000);
      if (cfgRes.ok) {
        const json = await cfgRes.json();
        writeServerMeta({
          ...(json?.meta || {}),
          serverReachable: true,
          serverError: undefined,
        });
        if (json && json.status === 'success' && json.data?.googleSheet?.scriptUrl) {
          this.saveGoogleSheetConfig(json.data.googleSheet, false);
        }
        if (json?.data?.resetState) {
          const mergedRs = mergeResetStates(this.getResetState(), json.data.resetState as DataResetState);
          this.saveResetState(mergedRs);
          this.purgePreResetLocalData(mergedRs);
        }
      } else {
        writeServerMeta({ serverReachable: false, serverError: `HTTP ${cfgRes.status}` });
      }
    } catch (err: any) {
      writeServerMeta({ serverReachable: false, serverError: err?.message || 'Koneksi server gagal' });
    }
    return this.getGoogleSheetConfig();
  },

  // Initialize server sync: load config, users, and all attendance from application server
  async initServerSync(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this._initSyncPromise) return this._initSyncPromise;

    this._initSyncPromise = (async () => {
      try {
        let localConfig = this.getGoogleSheetConfig();
        if (!localConfig.scriptUrl) {
          const cachedUrl = await readGasUrlFromCache();
          if (cachedUrl) {
            localConfig = {
              scriptUrl: cachedUrl,
              sheetName: 'Data_Absensi_PKL',
              connected: true,
              autoSync: true,
            };
            this.saveGoogleSheetConfig(localConfig, false);
          }
        }

        // 1. Fetch server config to pick up global Google Apps Script URL set by Admin
        const cfgHeaders: Record<string, string> = {};
        if (localConfig.scriptUrl && localConfig.scriptUrl.startsWith('http')) {
          cfgHeaders['x-gas-url'] = localConfig.scriptUrl;
        }
        const cfgRes = await fetchWithTimeout(`/api/config?_t=${Date.now()}`, { headers: cfgHeaders }, 7000);
        if (cfgRes.ok) {
          const json = await cfgRes.json();
          writeServerMeta({
            ...(json?.meta || {}),
            serverReachable: true,
            serverError: undefined,
          });
          if (json && json.status === 'success' && json.data) {
            if (json.data.googleSheet?.scriptUrl) {
              if (!localConfig.scriptUrl || localConfig.scriptUrl !== json.data.googleSheet.scriptUrl) {
                this.saveGoogleSheetConfig(json.data.googleSheet, false);
              }
            } else if (localConfig.scriptUrl && localConfig.scriptUrl.startsWith('http')) {
              // Warm a cold server instance with our valid scriptUrl
              this.saveGoogleSheetConfig(localConfig, true);
            }
            if (json.data.appTheme) {
              localStorage.setItem(THEME_KEY, JSON.stringify(json.data.appTheme));
            }
            if (json.data.tahunAjaran) {
              const serverTa: TahunAjaranConfig = { ...DEFAULT_TAHUN_AJARAN_CONFIG, ...json.data.tahunAjaran };
              const localTa = this.getTahunAjaranConfig();
              const serverMs = serverTa.updatedAt ? Date.parse(serverTa.updatedAt) : 0;
              const localMs = localTa.updatedAt ? Date.parse(localTa.updatedAt) : 0;
              if (
                localMs > serverMs ||
                (localMs === serverMs &&
                  localTa.tahunAktif !== DEFAULT_TAHUN_AJARAN_CONFIG.tahunAktif &&
                  serverTa.tahunAktif === DEFAULT_TAHUN_AJARAN_CONFIG.tahunAktif)
              ) {
                this.syncTahunAjaranToServer(localTa).catch(() => {});
              } else {
                this.saveTahunAjaranConfig(serverTa, false, false);
              }
            }
            if (json.data.resetState) {
              const localRs = this.getResetState();
              const serverRs: DataResetState = json.data.resetState;
              const mergedRs = mergeResetStates(localRs, serverRs);
              this.saveResetState(mergedRs);
              this.purgePreResetLocalData(mergedRs);

              const localAttMs = localRs.attendanceResetAt ? Date.parse(localRs.attendanceResetAt) : 0;
              const serverAttMs = serverRs.attendanceResetAt ? Date.parse(serverRs.attendanceResetAt) : 0;
              const localStuMs = localRs.studentsResetAt ? Date.parse(localRs.studentsResetAt) : 0;
              const serverStuMs = serverRs.studentsResetAt ? Date.parse(serverRs.studentsResetAt) : 0;
              if (localAttMs > serverAttMs || localStuMs > serverStuMs) {
                fetch('/api/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ resetState: mergedRs }),
                }).catch(() => {});
              }
            }
            if (json.data.reportConfig) {
              this.saveReportPrintConfig(json.data.reportConfig, false);
            }
          }
        } else {
          writeServerMeta({ serverReachable: false, serverError: `HTTP ${cfgRes.status}` });
        }

        // Purge any pre-reset items locally before flushing/fetching
        this.purgePreResetLocalData(this.getResetState());

        // 2. Flush any pending student/attendance records from prior offline session
        await this.flushPendingSyncQueue();

        // 3. Fetch server attendance & students (scoped to current user if student is logged in)
        const curUser = this.getCurrentUser();
        const scopeNis = curUser && curUser.role === 'siswa' ? curUser.nis : undefined;
        await this.fetchAttendanceFromServer(scopeNis);
        await this.fetchStudentsFromServer();
        notifySyncUpdate();
      } catch (e) {
        console.warn('Initial server sync warning (running offline fallback):', e);
      }
    })();

    return this._initSyncPromise;
  },

  async fetchAttendanceFromServer(filterNis?: string): Promise<AttendanceRecord[]> {
    if (typeof window === 'undefined') return this.getAttendance();
    try {
      const cfg = this.getGoogleSheetConfig();
      const nisQuery = filterNis ? `&nis=${encodeURIComponent(filterNis.trim())}` : '';
      const headers: Record<string, string> = {};
      if (cfg.scriptUrl && cfg.scriptUrl.startsWith('http')) {
        headers['x-gas-url'] = cfg.scriptUrl;
      }
      const res = await fetchWithTimeout(`/api/attendance?_t=${Date.now()}${nisQuery}`, { headers }, 12000);
      if (res.ok) {
        writeServerMeta({ serverReachable: true, serverError: undefined });
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.data)) {
          let resetState = this.getResetState();
          if (json.resetState) {
            resetState = mergeResetStates(resetState, json.resetState as DataResetState);
            this.saveResetState(resetState);
            this.purgePreResetLocalData(resetState);
          }
          // Merge remote records with any post-reset unsynced local records
          const localRecords = this.getAttendance().filter(
            lr => !this.isPreResetAttendance(lr.id, lr.tanggal, lr.nis, lr.syncedAt || '', resetState)
          );
          const remoteRecords: AttendanceRecord[] = (json.data as AttendanceRecord[]).filter(
            r => r && !this.isPreResetAttendance(r.id, r.tanggal, r.nis, r.syncedAt || '', resetState)
          );
          const map = new Map<string, AttendanceRecord>();
          const remoteKeys = new Set<string>();

          remoteRecords.forEach(r => {
            const key = `${r.tanggal}::${String(r.nis || '').trim().toLowerCase()}`;
            remoteKeys.add(key);
            map.set(key, r);
          });

          localRecords.forEach(lr => {
            const key = `${lr.tanggal}::${String(lr.nis || '').trim().toLowerCase()}`;
            const ex = map.get(key);
            if (!ex) {
              map.set(key, lr);
              if (lr.syncStatus === 'pending') {
                this.enqueuePendingSync({
                  type: 'ATTENDANCE',
                  key: lr.id,
                  action: lr.jamPulang && lr.jamPulang !== '-' ? 'CHECK_OUT' : 'CHECK_IN',
                });
              }
            } else {
              // Preserve local newer Jam Pulang if remote doesn't have it yet
              const localHasPulang = lr.jamPulang && lr.jamPulang !== '-';
              const remoteHasPulang = ex.jamPulang && ex.jamPulang !== '-';
              map.set(key, {
                ...ex,
                jamPulang: remoteHasPulang ? ex.jamPulang : (lr.jamPulang || '-'),
                statusPulang: remoteHasPulang ? ex.statusPulang : (lr.statusPulang || ex.statusPulang),
                koordinatPulang: ex.koordinatPulang && ex.koordinatPulang !== '-' ? ex.koordinatPulang : lr.koordinatPulang,
                mapsUrlPulang: ex.mapsUrlPulang && ex.mapsUrlPulang !== '-' ? ex.mapsUrlPulang : lr.mapsUrlPulang,
                fotoBukti: ex.fotoBukti || lr.fotoBukti,
                fotoPulang: ex.fotoPulang || lr.fotoPulang,
                syncStatus: localHasPulang && !remoteHasPulang ? 'pending' : ex.syncStatus,
              });
            }
          });

          const merged = Array.from(map.values());
          this.saveAttendance(merged);
          return filterNis
            ? merged.filter(r => String(r.nis || '').trim().toLowerCase() === filterNis.trim().toLowerCase())
            : merged;
        }
      }
    } catch (err) {
      console.warn('fetchAttendanceFromServer failed, using local cache:', err);
    }
    const local = this.getAttendance();
    return filterNis
      ? local.filter(r => String(r.nis || '').trim().toLowerCase() === filterNis.trim().toLowerCase())
      : local;
  },

  async fetchStudentsFromServer(): Promise<User[]> {
    if (typeof window === 'undefined') return this.getUsers();
    try {
      const cfg = this.getGoogleSheetConfig();
      const headers: Record<string, string> = {};
      if (cfg.scriptUrl && cfg.scriptUrl.startsWith('http')) {
        headers['x-gas-url'] = cfg.scriptUrl;
      }
      const res = await fetchWithTimeout(`/api/students?_t=${Date.now()}`, { headers }, 12000);
      if (res.ok) {
        writeServerMeta({ serverReachable: true, serverError: undefined });
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.data)) {
          let resetState = this.getResetState();
          if (json.resetState) {
            resetState = mergeResetStates(resetState, json.resetState as DataResetState);
            this.saveResetState(resetState);
            this.purgePreResetLocalData(resetState);
          }
          if (json.tahunAjaran) {
            const serverTa: TahunAjaranConfig = { ...DEFAULT_TAHUN_AJARAN_CONFIG, ...json.tahunAjaran };
            const localTa = this.getTahunAjaranConfig();
            const serverMs = serverTa.updatedAt ? Date.parse(serverTa.updatedAt) : 0;
            const localMs = localTa.updatedAt ? Date.parse(localTa.updatedAt) : 0;
            if (serverMs > localMs) {
              this.saveTahunAjaranConfig(serverTa, false, false);
            }
          }

          const localUsers = this.getUsers();
          const admins = localUsers.filter(u => u.role === 'admin');
          const localStudents = localUsers.filter(
            u => u.role === 'siswa' && !this.isPreResetStudent(u.nis || '', u.username || '', u.createdAt || '', resetState)
          );
          const remoteStudents: User[] = (json.data as User[]).filter(
            s => s && !this.isPreResetStudent(s.nis || '', s.username || '', s.createdAt || '', resetState)
          );
          const config = this.getGoogleSheetConfig();

          // Merge server students with local students so no newly registered local student is lost!
          const studentMap = new Map<string, User>();
          remoteStudents.forEach(s => {
            const key = (s.nis || s.username || s.id).trim().toLowerCase();
            studentMap.set(key, s);
          });
          localStudents.forEach(s => {
            const key = (s.nis || s.username || s.id).trim().toLowerCase();
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
              // Only re-upload local-only student if no reset happened OR it has an explicit post-reset timestamp
              const stuResetMs = resetState.studentsResetAt ? Date.parse(resetState.studentsResetAt) : 0;
              const sCreatedMs = s.createdAt ? parseGasTimestampMs(s.createdAt) : 0;
              const hasTimePrecision = /\d{2}:\d{2}/.test(String(s.createdAt || ''));
              const isConfirmedPostReset = !stuResetMs || (hasTimePrecision && sCreatedMs > stuResetMs + 1000);
              if (isConfirmedPostReset) {
                studentMap.set(key, s);
                fetch('/api/students', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...s, scriptUrl: config.scriptUrl || '' }),
                }).catch(() => {});
              }
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
    let raw: string | null = null;
    try {
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(GOOGLE_SHEET_KEY) : null;
    } catch {}

    let parsed: GoogleSheetConfig | null = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    // 1. Check URL query parameter or hash fragment (?gas=... / ?scriptUrl=... / #gas=...)
    if (typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashStr = window.location.hash || '';
        const hashParams = new URLSearchParams(hashStr.startsWith('#') ? hashStr.slice(1) : hashStr);
        const queryGas =
          urlParams.get('gas') ||
          urlParams.get('scriptUrl') ||
          urlParams.get('sheetUrl') ||
          hashParams.get('gas') ||
          hashParams.get('scriptUrl');

        if (queryGas && queryGas.trim().startsWith('http')) {
          const cleanGas = queryGas.trim();
          const autoConfig: GoogleSheetConfig = {
            scriptUrl: cleanGas,
            sheetName: parsed?.sheetName || 'Data_Absensi_PKL',
            connected: true,
            autoSync: true,
            lastSync: parsed?.lastSync || new Date().toISOString(),
          };
          const alreadyStoredSame = Boolean(parsed?.scriptUrl && parsed.scriptUrl.trim() === cleanGas && parsed.connected);
          const shouldWarmServer = _lastServerSyncedGasUrl !== cleanGas;
          if (!alreadyStoredSame || shouldWarmServer) {
            // Never emit pkl-sync-updated from inside a getter! Only persist/warm once per URL.
            this.saveGoogleSheetConfig(autoConfig, shouldWarmServer, false);
          }
          // Do NOT strip ?gas= from URL bar so PWA install, bookmarks, and "Open in Chrome" keep the auto-connect link!
          return autoConfig;
        }
      } catch (e) {
        console.warn('Error reading URL params:', e);
      }
    }

    // 2. Fallback to Cookie (helps survive isolated WebView / tab resets)
    if (!parsed || !parsed.scriptUrl) {
      const cookieUrl = getCookieValue(GAS_COOKIE_NAME);
      if (cookieUrl && cookieUrl.startsWith('http')) {
        const cleanCookie = cookieUrl.trim();
        const cookieConfig: GoogleSheetConfig = {
          scriptUrl: cleanCookie,
          sheetName: 'Data_Absensi_PKL',
          connected: true,
          autoSync: true,
        };
        this.saveGoogleSheetConfig(cookieConfig, false, false);
        return cookieConfig;
      }
    }

    // 3. Fallback to build-time environment variable VITE_GOOGLE_APPS_SCRIPT_URL or VITE_SCRIPT_URL
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || (import.meta as any).env?.VITE_SCRIPT_URL;
    if (!parsed || !parsed.scriptUrl) {
      if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
        const cleanEnv = envUrl.trim();
        const envConfig: GoogleSheetConfig = {
          scriptUrl: cleanEnv,
          sheetName: 'Data_Absensi_PKL',
          connected: true,
          autoSync: true,
        };
        this.saveGoogleSheetConfig(envConfig, _lastServerSyncedGasUrl !== cleanEnv, false);
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

  saveGoogleSheetConfig(config: GoogleSheetConfig, syncServer: boolean = true, emitEvent: boolean = true) {
    const cleanUrl = (config.scriptUrl || '').trim();
    const normalized: GoogleSheetConfig = {
      ...config,
      scriptUrl: cleanUrl,
      connected: Boolean(cleanUrl && cleanUrl.startsWith('http')),
    };
    try {
      localStorage.setItem(GOOGLE_SHEET_KEY, JSON.stringify(normalized));
    } catch {}
    if (normalized.connected) {
      setCookieValue(GAS_COOKIE_NAME, cleanUrl);
      saveGasUrlToCache(cleanUrl).catch(() => {});
    } else {
      setCookieValue(GAS_COOKIE_NAME, '', 0);
      saveGasUrlToCache('').catch(() => {});
    }
    if (syncServer && typeof window !== 'undefined') {
      if (normalized.connected) {
        _lastServerSyncedGasUrl = cleanUrl;
      } else {
        _lastServerSyncedGasUrl = '';
      }
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleSheet: normalized }),
      }).catch(err => console.warn('Sync config to server warning:', err));
    }
    if (emitEvent) {
      notifySyncUpdate();
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

  // Pull attendance from Google Spreadsheet and merge into local database (preserves pending & photos)
  async pullAttendanceFromCloud(
    customUrl?: string,
    filterNis?: string
  ): Promise<{ success: boolean; newCount: number; total: number; message: string }> {
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

    const mergeRemoteRecords = (remoteList: AttendanceRecord[]): number => {
      const resetState = this.getResetState();
      const localRecords = this.getAttendance().filter(
        lr => !this.isPreResetAttendance(lr.id, lr.tanggal, lr.nis, lr.syncedAt || '', resetState)
      );
      const map = new Map<string, AttendanceRecord>();
      let changedCount = 0;

      localRecords.forEach(lr => {
        const key = `${lr.tanggal}::${String(lr.nis || '').trim().toLowerCase()}`;
        map.set(key, lr);
      });

      remoteList.forEach(rem => {
        if (!rem || !rem.tanggal || !rem.nis) return;
        if (this.isPreResetAttendance(rem.id, rem.tanggal, rem.nis, rem.syncedAt || '', resetState)) {
          return;
        }
        const normNis = String(rem.nis).trim().toLowerCase();
        const key = `${rem.tanggal}::${normNis}`;
        const existing = map.get(key);

        if (!existing) {
          map.set(key, { ...rem, syncStatus: 'synced' });
          changedCount++;
        } else {
          const localHasPulang = Boolean(existing.jamPulang && existing.jamPulang !== '-');
          const remoteHasPulang = Boolean(rem.jamPulang && rem.jamPulang !== '-');
          const isLocalPending = existing.syncStatus === 'pending' && localHasPulang && !remoteHasPulang;

          map.set(key, {
            ...rem,
            jamDatang: (rem.jamDatang && rem.jamDatang !== '-') ? rem.jamDatang : (existing.jamDatang || '-'),
            jamPulang: remoteHasPulang ? rem.jamPulang : (existing.jamPulang || '-'),
            statusDatang: rem.statusDatang || existing.statusDatang || rem.status,
            statusPulang: remoteHasPulang
              ? (rem.statusPulang || 'Sudah Pulang')
              : (existing.statusPulang || 'Belum Pulang'),
            koordinatGps: (rem.koordinatGps && rem.koordinatGps !== '-') ? rem.koordinatGps : (existing.koordinatGps || '-'),
            mapsUrl: (rem.mapsUrl && rem.mapsUrl !== '-') ? rem.mapsUrl : (existing.mapsUrl || '-'),
            koordinatPulang: (rem.koordinatPulang && rem.koordinatPulang !== '-') ? rem.koordinatPulang : (existing.koordinatPulang || '-'),
            mapsUrlPulang: (rem.mapsUrlPulang && rem.mapsUrlPulang !== '-') ? rem.mapsUrlPulang : (existing.mapsUrlPulang || '-'),
            fotoBukti: existing.fotoBukti || rem.fotoBukti,
            fotoPulang: existing.fotoPulang || rem.fotoPulang,
            syncStatus: isLocalPending ? 'pending' : 'synced',
          });
          changedCount++;
        }
      });

      const merged = Array.from(map.values());
      this.saveAttendance(merged);
      return changedCount;
    };

    // 1. Try server pull first (server forwards directly, bypassing CORS)
    try {
      const serverRes = await fetchWithTimeout('/api/attendance/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gas-url': targetUrl },
        body: JSON.stringify({ url: targetUrl, nis: filterNis ? filterNis.trim() : undefined }),
      }, 14000);
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json && json.success) {
          let changed = json.count || 0;
          if (Array.isArray(json.data)) {
            changed = mergeRemoteRecords(json.data);
          } else {
            await this.fetchAttendanceFromServer(filterNis);
          }
          config.lastSync = new Date().toISOString();
          config.connected = true;
          this.saveGoogleSheetConfig(config, false);
          const updatedRecords = this.getAttendance();
          return {
            success: true,
            newCount: changed,
            total: updatedRecords.length,
            message: json.message || `Berhasil sinkron ${changed} presensi dari Google Spreadsheet.`,
          };
        }
      }
    } catch (e) {
      console.warn('Server attendance pull fallback to client:', e);
    }

    // 2. Direct browser GET fallback
    try {
      const nisParam = filterNis ? `&nis=${encodeURIComponent(filterNis.trim())}` : '';
      const fetchUrl = targetUrl.includes('?')
        ? `${targetUrl}&action=GET_ALL${nisParam}&_t=${Date.now()}`
        : `${targetUrl}?action=GET_ALL${nisParam}&_t=${Date.now()}`;

      const response = await fetchWithTimeout(fetchUrl, { redirect: 'follow' }, 20000);
      const rawText = await response.text();
      if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
        throw new Error('Akses Google Apps Script belum disetel ke Anyone (Siapa saja).');
      }
      if (!response.ok) {
        throw new Error(`Server merespon dengan status ${response.status}`);
      }

      const data = JSON.parse(rawText);
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        const mapped: AttendanceRecord[] = data.data
          .filter((item: any) => item && item.tanggal && item.nis)
          .map((item: any) => {
            const cleanNis = String(item.nis).trim();
            const recordId = item.id || `ABS-${String(item.tanggal).replace(/-/g, '')}-${cleanNis}`;
            const hasOut = Boolean(item.jamPulang && item.jamPulang !== '-');
            return {
              id: recordId,
              tanggal: item.tanggal,
              nis: cleanNis,
              namaSiswa: item.namaSiswa || 'Siswa PKL',
              kelas: item.kelas || 'XII TKR 1',
              namaPembimbing: item.namaPembimbing || '-',
              asalSekolah: item.asalSekolah || 'SMKN 1 Tegalsari',
              jurusan: item.jurusan || 'Teknik Kendaraan Ringan (TKR)',
              jamDatang: item.jamDatang || '-',
              jamPulang: item.jamPulang || '-',
              status: item.status || 'Hadir',
              statusDatang: item.statusDatang || item.status || 'Hadir',
              statusPulang: item.statusPulang || (hasOut ? 'Sudah Pulang' : 'Belum Pulang'),
              keterangan: item.keterangan || '-',
              tempatPkl: item.tempatPkl || '-',
              koordinatGps: item.koordinatGps || '-',
              mapsUrl: item.mapsUrl || (item.koordinatGps && item.koordinatGps !== '-' ? `https://www.google.com/maps?q=${encodeURIComponent(item.koordinatGps)}` : '-'),
              koordinatPulang: item.koordinatPulang || '-',
              mapsUrlPulang: item.mapsUrlPulang || (item.koordinatPulang && item.koordinatPulang !== '-' ? `https://www.google.com/maps?q=${encodeURIComponent(item.koordinatPulang)}` : '-'),
              syncStatus: 'synced' as const,
              syncedAt: item.syncedAt || new Date().toISOString(),
            };
          });

        const addedOrUpdated = mergeRemoteRecords(mapped);
        const total = this.getAttendance().length;
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config, false);

        return {
          success: true,
          newCount: addedOrUpdated,
          total,
          message: `Berhasil menarik ${addedOrUpdated} catatan presensi dari Google Spreadsheet. Total: ${total} presensi.`,
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
      const serverRes = await fetchWithTimeout('/api/students/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gas-url': targetUrl },
        body: JSON.stringify({ url: targetUrl }),
      }, 14000);
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json && json.success && Array.isArray(json.data)) {
          const resetState = this.getResetState();
          this.purgePreResetLocalData(resetState);
          const filteredRemote = (json.data as User[]).filter(
            st => st && !this.isPreResetStudent(st.nis || '', st.username || '', st.createdAt || '', resetState)
          );
          // Pass syncToCloud = false so pulling does NOT re-push students back to Spreadsheet
          this.addUsersBulk(filteredRemote, false);
          config.lastSync = new Date().toISOString();
          config.connected = true;
          this.saveGoogleSheetConfig(config, false);
          return {
            success: true,
            count: filteredRemote.length,
            message: json.message || `Berhasil sinkron ${filteredRemote.length} data siswa dari Google Spreadsheet.`,
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
        const resetState = this.getResetState();
        this.purgePreResetLocalData(resetState);
        const defaultTahun = this.getActiveTahunAjaran();
        const studentUsers: User[] = data.data
          .filter((st: any) => st && st.nis && st.nama)
          .filter((st: any) => !this.isPreResetStudent(String(st.nis || ''), String(st.username || st.nis || ''), String(st.createdAt || ''), resetState))
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
    skipServerApi: boolean = false,
    _isRetry: boolean = false
  ): Promise<{ success: boolean; user?: User; serverSynced?: boolean; sheetSynced?: boolean; isUnconfigured?: boolean; message: string }> {
    const config = await this.ensureConfigSynced();
    const targetUrl = (config.scriptUrl || '').trim();
    const queueKey = student.nis || student.id;
    let serverSynced = false;
    let updatedUser: User = student;

    // 1. Try sending to application server API first (passing scriptUrl so stateless Vercel lambdas can forward cleanly)
    if (!skipServerApi && typeof window !== 'undefined') {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (targetUrl) headers['x-gas-url'] = targetUrl;
        const serverRes = await fetchWithTimeout('/api/students', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...student, scriptUrl: targetUrl }),
        }, 15000);
        if (serverRes.ok) {
          writeServerMeta({ serverReachable: true, serverError: undefined });
          const json = await serverRes.json();
          if (json && json.status === 'success') {
            serverSynced = true;
            if (json.data) {
              updatedUser = json.data as User;
            }
            if (json.sheetSynced === true) {
              this.dequeuePendingSync('STUDENT', queueKey);
              config.lastSync = new Date().toISOString();
              config.connected = true;
              this.saveGoogleSheetConfig(config, false);
              return {
                success: true,
                user: updatedUser,
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

    // 2. If server didn't sync to Spreadsheet, push directly from browser
    if (!targetUrl || !targetUrl.startsWith('http')) {
      this.enqueuePendingSync({ type: 'STUDENT', key: queueKey });
      return {
        success: serverSynced,
        serverSynced,
        sheetSynced: false,
        isUnconfigured: true,
        message: serverSynced
          ? 'Tersimpan di server aplikasi & masuk antrean sinkronisasi Spreadsheet.'
          : 'Tersimpan di HP & masuk antrean sinkronisasi saat koneksi/tautan sekolah aktif.',
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
      const response = await fetchWithTimeout(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      }, 20000);

      const rawText = await response.text();
      if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
        this.enqueuePendingSync({ type: 'STUDENT', key: queueKey });
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
          this.enqueuePendingSync({ type: 'STUDENT', key: queueKey });
          return {
            success: false,
            serverSynced,
            sheetSynced: false,
            message: parsed.message || 'Gagal menyimpan data siswa di Google Apps Script.',
          };
        }
        this.dequeuePendingSync('STUDENT', queueKey);
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
      // Fallback with mode: 'no-cors' when CORS blocks reading the GAS redirect response,
      // followed by strict GET verification so we NEVER silently lose failed syncs!
      try {
        await fetchWithTimeout(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        }, 18000);

        await new Promise(resolve => setTimeout(resolve, 1200));
        const verify = await verifyGasRecordExists(targetUrl, 'STUDENT', student.nis || student.username);
        if (verify.permissionError) {
          this.enqueuePendingSync({ type: 'STUDENT', key: queueKey });
          return {
            success: false,
            serverSynced,
            sheetSynced: false,
            message: 'Gagal menyimpan ke Spreadsheet: akses Google Apps Script belum diatur ke "Anyone / Siapa saja".',
          };
        }
        if (verify.verified) {
          this.dequeuePendingSync('STUDENT', queueKey);
          config.lastSync = new Date().toISOString();
          config.connected = true;
          this.saveGoogleSheetConfig(config, false);
          return {
            success: true,
            serverSynced,
            sheetSynced: true,
            message: 'Siswa berhasil terverifikasi masuk ke Google Spreadsheet!',
          };
        }
      } catch {}

      this.enqueuePendingSync({ type: 'STUDENT', key: queueKey });
      return {
        success: false,
        serverSynced,
        sheetSynced: false,
        message: 'Tersimpan lokal & masuk antrean kirim ulang ke Google Spreadsheet (sedang menunggu konfirmasi server).',
      };
    }
  },

  // Sync Attendance Record to Application Server & Google Sheets
  async syncToGoogleSheet(
    action: 'CHECK_IN' | 'CHECK_OUT',
    record: AttendanceRecord,
    _isRetry: boolean = false
  ): Promise<{ success: boolean; serverSynced?: boolean; sheetSynced?: boolean; isUnconfigured?: boolean; message: string }> {
    const config = await this.ensureConfigSynced();
    const targetUrl = (config.scriptUrl || '').trim();
    let serverSynced = false;

    // 1. Send to Application Server API first (passing scriptUrl so stateless Vercel functions can forward cleanly)
    if (typeof window !== 'undefined') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (targetUrl) headers['x-gas-url'] = targetUrl;

      const tryServerPost = async (payloadObj: Record<string, any>) => {
        const res = await fetchWithTimeout('/api/attendance', {
          method: 'POST',
          headers,
          body: JSON.stringify(payloadObj),
        }, 15000);
        return res;
      };

      try {
        let serverRes = await tryServerPost({ ...record, scriptUrl: targetUrl });
        // If payload rejected as 413 (large camera image), immediately retry metadata + GPS without base64 photos
        if (serverRes.status === 413) {
          const { fotoBukti: _f1, fotoPulang: _f2, ...lightRecord } = record;
          serverRes = await tryServerPost({ ...lightRecord, scriptUrl: targetUrl });
        }

        if (serverRes.ok) {
          writeServerMeta({ serverReachable: true, serverError: undefined });
          const json = await serverRes.json();
          if (json && json.status === 'success') {
            serverSynced = true;
            if (json.sheetSynced === true) {
              this.dequeuePendingSync('ATTENDANCE', record.id);
              config.lastSync = new Date().toISOString();
              config.connected = true;
              this.saveGoogleSheetConfig(config, false);
              return {
                success: true,
                serverSynced: true,
                sheetSynced: true,
                message: 'Presensi berhasil dicatat di Server Aplikasi & tersinkronisasi ke Google Spreadsheet!',
              };
            }
          }
        } else {
          writeServerMeta({ serverReachable: false, serverError: `HTTP ${serverRes.status}` });
        }
      } catch (err: any) {
        writeServerMeta({ serverReachable: false, serverError: err?.message || 'Koneksi server timeout/error' });
        console.warn('Server POST /api/attendance failed, falling back to direct client sync:', err);
      }
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      this.enqueuePendingSync({ type: 'ATTENDANCE', key: record.id, action });
      return {
        success: serverSynced,
        serverSynced,
        sheetSynced: false,
        isUnconfigured: true,
        message: serverSynced
          ? 'Presensi tersimpan di Server Aplikasi & menunggu tautan Spreadsheet sekolah.'
          : 'Tersimpan di HP & masuk antrean kirim otomatis saat perangkat terhubung.',
      };
    }

    const studentObj = this.getUsers().find(
      u => u.nis && record.nis && u.nis.trim().toLowerCase() === record.nis.trim().toLowerCase()
    );
    const namaPembimbing = record.namaPembimbing || studentObj?.namaPembimbing || '-';
    const tempatPkl = record.tempatPkl || studentObj?.tempatPkl || 'Bengkel Mitra TKR';
    const kelas = record.kelas || studentObj?.kelas || 'XII TKR 1';

    // Strip base64 photos for GAS payload (GAS only records metadata & GPS Maps links)
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
      statusDatang: record.statusDatang || record.status || 'Hadir',
      statusPulang: record.statusPulang || (record.jamPulang && record.jamPulang !== '-' ? 'Sudah Pulang' : 'Belum Pulang'),
      keterangan: record.keterangan || '-',
      koordinatGps: record.koordinatGps || '-',
      mapsUrl: record.mapsUrl || '-',
      koordinatPulang: record.koordinatPulang || '-',
      mapsUrlPulang: record.mapsUrlPulang || '-',
    };

    try {
      const response = await fetchWithTimeout(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      }, 20000);

      const rawText = await response.text();
      if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
        this.enqueuePendingSync({ type: 'ATTENDANCE', key: record.id, action });
        return {
          success: false,
          serverSynced,
          sheetSynced: false,
          message: 'Akses Google Apps Script belum disetel ke Anyone (Siapa saja).',
        };
      }

      if (response.ok) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawText);
        } catch {}
        if (parsed && parsed.status === 'error') {
          this.enqueuePendingSync({ type: 'ATTENDANCE', key: record.id, action });
          return {
            success: false,
            serverSynced,
            sheetSynced: false,
            message: parsed.message || 'Gagal mencatat presensi di Google Apps Script.',
          };
        }
        this.dequeuePendingSync('ATTENDANCE', record.id);
        config.lastSync = new Date().toISOString();
        config.connected = true;
        this.saveGoogleSheetConfig(config, false);
        return {
          success: true,
          serverSynced,
          sheetSynced: true,
          message: 'Sinkronisasi ke Google Spreadsheet berhasil!',
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      console.warn('Standard fetch to Google Apps Script failed, trying verified no-cors fallback:', err);
      try {
        await fetchWithTimeout(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        }, 18000);

        await new Promise(resolve => setTimeout(resolve, 1200));
        const verify = await verifyGasRecordExists(targetUrl, 'ATTENDANCE', record.nis, record.tanggal, action);
        if (verify.permissionError) {
          this.enqueuePendingSync({ type: 'ATTENDANCE', key: record.id, action });
          return {
            success: false,
            serverSynced,
            sheetSynced: false,
            message: 'Akses Google Apps Script belum disetel ke Anyone (Siapa saja).',
          };
        }
        if (verify.verified) {
          this.dequeuePendingSync('ATTENDANCE', record.id);
          config.lastSync = new Date().toISOString();
          config.connected = true;
          this.saveGoogleSheetConfig(config, false);
          return {
            success: true,
            serverSynced,
            sheetSynced: true,
            message: 'Presensi berhasil terverifikasi masuk ke Google Spreadsheet!',
          };
        }
      } catch (fallbackErr: any) {
        console.warn('No-cors fallback failed:', fallbackErr);
      }

      this.enqueuePendingSync({ type: 'ATTENDANCE', key: record.id, action });
      return {
        success: false,
        serverSynced,
        sheetSynced: false,
        message: 'Tersimpan lokal di HP & masuk antrean kirim otomatis saat konfirmasi Spreadsheet siap.',
      };
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

  emitChangeNotification(title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') {
    dispatchChangeNotification(title, message, type);
  },

  getResetState(): DataResetState {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(RESET_STATE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const fromCookie = getCookieValue(RESET_COOKIE_NAME);
    if (fromCookie) {
      try {
        const parsed = JSON.parse(fromCookie);
        localStorage.setItem(RESET_STATE_KEY, JSON.stringify(parsed));
        return parsed;
      } catch {}
    }
    return {};
  },

  saveResetState(state: DataResetState) {
    if (typeof window === 'undefined') return;
    const compact: DataResetState = {
      attendanceResetAt: state.attendanceResetAt,
      studentsResetAt: state.studentsResetAt,
      ignoredStudentKeys: (state.ignoredStudentKeys || []).slice(-500),
      ignoredAttendanceKeys: (state.ignoredAttendanceKeys || []).slice(-500),
    };
    try {
      localStorage.setItem(RESET_STATE_KEY, JSON.stringify(compact));
    } catch {}
    // Keep cookie compact (timestamps + small ignored list within ~2KB cookie limit)
    const cookieCompact: DataResetState = {
      attendanceResetAt: compact.attendanceResetAt,
      studentsResetAt: compact.studentsResetAt,
      ignoredStudentKeys: (compact.ignoredStudentKeys || []).slice(-40),
      ignoredAttendanceKeys: (compact.ignoredAttendanceKeys || []).slice(-40),
    };
    if (cookieCompact.attendanceResetAt || cookieCompact.studentsResetAt) {
      setCookieValue(RESET_COOKIE_NAME, JSON.stringify(cookieCompact));
    } else {
      setCookieValue(RESET_COOKIE_NAME, '', 0);
    }
  },

  unignoreStudentKeys(nis?: string, username?: string) {
    const rs = this.getResetState();
    if (!rs.ignoredStudentKeys || rs.ignoredStudentKeys.length === 0) return;
    const n = String(nis || '').trim().toLowerCase();
    const u = String(username || '').trim().toLowerCase();
    const filtered = rs.ignoredStudentKeys.filter(k => k !== n && k !== u);
    if (filtered.length !== rs.ignoredStudentKeys.length) {
      this.saveResetState({ ...rs, ignoredStudentKeys: filtered });
    }
  },

  unignoreAttendanceKeys(id?: string, tanggal?: string, nis?: string) {
    const rs = this.getResetState();
    if (!rs.ignoredAttendanceKeys || rs.ignoredAttendanceKeys.length === 0) return;
    const cleanId = String(id || '').trim();
    const composite = `${tanggal || ''}::${String(nis || '').trim().toLowerCase()}`;
    const filtered = rs.ignoredAttendanceKeys.filter(k => k !== cleanId && k !== composite);
    if (filtered.length !== rs.ignoredAttendanceKeys.length) {
      this.saveResetState({ ...rs, ignoredAttendanceKeys: filtered });
    }
  },

  isPreResetStudent(nis: string, username: string, createdAt: string, resetState?: DataResetState): boolean {
    const rs = resetState || this.getResetState();
    if (!rs.studentsResetAt) return false;
    const resetMs = Date.parse(rs.studentsResetAt);
    if (Number.isNaN(resetMs)) return false;

    const cleanNis = String(nis || '').trim().toLowerCase();
    const cleanUser = String(username || '').trim().toLowerCase();
    const ignored = new Set((rs.ignoredStudentKeys || []).map(k => k.toLowerCase()));
    const createdMs = parseGasTimestampMs(createdAt);
    const hasTimePrecision = /\d{2}:\d{2}/.test(String(createdAt || ''));

    if (hasTimePrecision && createdMs > resetMs + 1000) {
      return false;
    }
    if (ignored.has(cleanNis) || (cleanUser && ignored.has(cleanUser))) {
      return true;
    }
    if (hasTimePrecision && createdMs > 0 && createdMs <= resetMs) {
      return true;
    }
    if (!hasTimePrecision && createdMs > 0) {
      const resetJakartaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(resetMs));
      const rowDate = String(createdAt || '').slice(0, 10);
      if (rowDate <= resetJakartaDate) return true;
    }
    return false;
  },

  isPreResetAttendance(id: string, tanggal: string, nis: string, syncedAt: string, resetState?: DataResetState): boolean {
    const rs = resetState || this.getResetState();
    if (!rs.attendanceResetAt) return false;
    const resetMs = Date.parse(rs.attendanceResetAt);
    if (Number.isNaN(resetMs)) return false;

    const composite = `${tanggal}::${String(nis || '').trim().toLowerCase()}`;
    const ignored = new Set(rs.ignoredAttendanceKeys || []);
    const syncedMs = parseGasTimestampMs(syncedAt);
    const hasTimePrecision = /\d{2}:\d{2}/.test(String(syncedAt || ''));

    if (hasTimePrecision && syncedMs > resetMs + 1000) {
      return false;
    }
    if (ignored.has(id) || ignored.has(composite)) {
      return true;
    }
    if (hasTimePrecision && syncedMs > 0 && syncedMs <= resetMs) {
      return true;
    }
    if (!hasTimePrecision && tanggal) {
      const resetJakartaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(resetMs));
      if (tanggal <= resetJakartaDate) return true;
    }
    return false;
  },

  purgePreResetLocalData(resetState?: DataResetState) {
    if (typeof window === 'undefined') return;
    const rs = resetState || this.getResetState();
    if (!rs.studentsResetAt && !rs.attendanceResetAt) return;

    if (rs.studentsResetAt) {
      const users = this.getUsers();
      const filteredUsers = users.filter(u =>
        u.role === 'admin' ||
        u.username.toLowerCase() === 'admin123' ||
        !this.isPreResetStudent(u.nis || '', u.username || '', u.createdAt || '', rs)
      );
      if (filteredUsers.length !== users.length) {
        this.saveUsers(filteredUsers);
      }
    }

    if (rs.attendanceResetAt) {
      const records = this.getAttendance();
      const filteredRecords = records.filter(
        r => !this.isPreResetAttendance(r.id, r.tanggal, r.nis, r.syncedAt || '', rs)
      );
      if (filteredRecords.length !== records.length) {
        this.saveAttendance(filteredRecords);
      }
    }
  },

  getTahunAjaranConfig(): TahunAjaranConfig {
    let raw: string | null = null;
    try {
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(TAHUN_AJARAN_KEY) : null;
    } catch {}
    if (!raw && typeof document !== 'undefined') {
      raw = getCookieValue(TAHUN_COOKIE_NAME) || null;
      if (raw) {
        try { localStorage.setItem(TAHUN_AJARAN_KEY, raw); } catch {}
      }
    }
    if (!raw) return DEFAULT_TAHUN_AJARAN_CONFIG;
    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TAHUN_AJARAN_CONFIG,
        ...parsed,
        daftarTahun: Array.isArray(parsed?.daftarTahun) && parsed.daftarTahun.length > 0
          ? parsed.daftarTahun
          : DEFAULT_TAHUN_AJARAN_CONFIG.daftarTahun,
      };
    } catch {
      return DEFAULT_TAHUN_AJARAN_CONFIG;
    }
  },

  async syncTahunAjaranToServer(config: TahunAjaranConfig): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahunAjaran: config }),
      });
    } catch (err) {
      console.warn('Sync tahunAjaran to server warning:', err);
    }

    // Also notify GAS if scriptUrl supports v2.1 action=SET_TAHUN_AJARAN
    try {
      const sheetCfg = this.getGoogleSheetConfig();
      const targetUrl = (sheetCfg.scriptUrl || '').trim();
      if (targetUrl && targetUrl.startsWith('http')) {
        const testUrl = targetUrl.includes('?') ? `${targetUrl}&action=TEST&_t=${Date.now()}` : `${targetUrl}?action=TEST&_t=${Date.now()}`;
        const testRes = await fetchWithTimeout(testUrl, { redirect: 'follow' }, 4500);
        const txt = await testRes.text();
        if (!txt.includes('<') && txt.includes('supportsReset')) {
          const parsed = JSON.parse(txt);
          if (parsed?.supportsReset === true) {
            fetch(targetUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'SET_TAHUN_AJARAN', tahunAjaran: config }),
            }).catch(() => {});
          }
        }
      }
    } catch {}
  },

  saveTahunAjaranConfig(config: TahunAjaranConfig, syncServer: boolean = true, emitEvent: boolean = true) {
    const normalized: TahunAjaranConfig = {
      tahunAktif: config.tahunAktif || DEFAULT_TAHUN_AJARAN_CONFIG.tahunAktif,
      daftarTahun: Array.isArray(config.daftarTahun) && config.daftarTahun.length > 0
        ? Array.from(new Set(config.daftarTahun))
        : [...DEFAULT_TAHUN_AJARAN_CONFIG.daftarTahun],
      updatedAt: config.updatedAt || new Date().toISOString(),
    };
    if (!normalized.daftarTahun.includes(normalized.tahunAktif)) {
      normalized.daftarTahun.push(normalized.tahunAktif);
    }
    const serialized = JSON.stringify(normalized);
    try {
      localStorage.setItem(TAHUN_AJARAN_KEY, serialized);
    } catch {}
    setCookieValue(TAHUN_COOKIE_NAME, serialized);

    if (syncServer && typeof window !== 'undefined') {
      this.syncTahunAjaranToServer(normalized).catch(() => {});
    }
    if (emitEvent) {
      notifySyncUpdate();
    }
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
    config.updatedAt = new Date().toISOString();
    this.saveTahunAjaranConfig(config, true, true);
  },

  addTahunAjaran(tahun: string): boolean {
    const config = this.getTahunAjaranConfig();
    if (!config.daftarTahun.includes(tahun)) {
      config.daftarTahun.push(tahun);
      config.updatedAt = new Date().toISOString();
      this.saveTahunAjaranConfig(config, true, true);
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
    config.updatedAt = new Date().toISOString();
    this.saveTahunAjaranConfig(config, true, true);
  },

  async resetTotalData(mode: 'all' | 'attendance' | 'students' = 'all'): Promise<{
    success: boolean;
    message: string;
    deletedUsers: number;
    deletedAttendance: number;
    sheetResetSynced?: boolean;
    supportsReset?: boolean | null;
    studentsClearedInSheet?: number;
    needsCodeGsUpdate?: boolean;
  }> {
    let deletedUsers = 0;
    let deletedAttendance = 0;
    const nowIso = new Date().toISOString();
    const prevReset = this.getResetState();
    const ignoredStu = new Set((prevReset.ignoredStudentKeys || []).map(k => k.toLowerCase()));
    const ignoredAtt = new Set(prevReset.ignoredAttendanceKeys || []);
    const removedLocalStudents: User[] = [];

    if (mode === 'all' || mode === 'students') {
      const allUsers = this.getUsers();
      const adminUsers = allUsers.filter(u => u.role === 'admin' || u.username.toLowerCase() === 'admin123');
      const students = allUsers.filter(u => u.role !== 'admin' && u.username.toLowerCase() !== 'admin123');
      deletedUsers = students.length;
      students.forEach(s => {
        removedLocalStudents.push(s);
        if (s.nis) ignoredStu.add(String(s.nis).trim().toLowerCase());
        if (s.username) ignoredStu.add(String(s.username).trim().toLowerCase());
      });
      this.saveUsers(adminUsers);
      prevReset.studentsResetAt = nowIso;
      prevReset.ignoredStudentKeys = Array.from(ignoredStu).slice(-500);

      // Ensure if a student is somehow cached as active user on this browser, clear it (keep Admin logged in)
      const cur = this.getCurrentUser();
      if (cur && cur.role === 'siswa') {
        this.setCurrentUser(null);
      }
    }

    if (mode === 'all' || mode === 'attendance' || mode === 'students') {
      const att = this.getAttendance();
      deletedAttendance = att.length;
      att.forEach(r => {
        if (r.id) ignoredAtt.add(r.id);
        if (r.tanggal && r.nis) ignoredAtt.add(`${r.tanggal}::${String(r.nis).trim().toLowerCase()}`);
      });
      this.saveAttendance([]);
      prevReset.attendanceResetAt = nowIso;
      prevReset.ignoredAttendanceKeys = Array.from(ignoredAtt).slice(-500);
    }

    // Clear pending outbox items so pre-reset items are never re-uploaded
    try {
      if (mode === 'all' || mode === 'students') {
        localStorage.removeItem(SYNC_QUEUE_KEY);
      } else if (mode === 'attendance') {
        const remainingQueue = this.getSyncQueue().filter(q => q.type !== 'ATTENDANCE');
        this.saveSyncQueue(remainingQueue);
      }
    } catch {}

    this.saveResetState(prevReset);

    // Ensure current Tahun Ajaran is preserved and pushed to server alongside reset
    const currentTa = this.getTahunAjaranConfig();
    const sheetConfig = this.getGoogleSheetConfig();
    let sheetResetSynced = false;
    let supportsReset: boolean | null = null;
    let studentsClearedInSheet = 0;

    if (typeof window !== 'undefined') {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (sheetConfig.scriptUrl && sheetConfig.scriptUrl.startsWith('http')) {
          headers['x-gas-url'] = sheetConfig.scriptUrl;
        }
        const resetRes = await fetchWithTimeout('/api/attendance/reset', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode,
            scriptUrl: sheetConfig.scriptUrl || '',
            resetAt: nowIso,
            ignoredStudentKeys: prevReset.ignoredStudentKeys || [],
            ignoredAttendanceKeys: prevReset.ignoredAttendanceKeys || [],
          }),
        }, 14000);
        if (resetRes.ok) {
          const json = await resetRes.json();
          sheetResetSynced = Boolean(json?.sheetResetSynced);
          if (typeof json?.supportsReset === 'boolean') {
            supportsReset = json.supportsReset;
          }
          studentsClearedInSheet = Number(json?.deletedGasStudents || 0);
          if (json?.resetState) {
            this.saveResetState(mergeResetStates(prevReset, json.resetState));
          }
        }
        // Re-affirm active Tahun Ajaran on server
        await this.syncTahunAjaranToServer(currentTa);
      } catch (e) {
        console.warn('Server reset API call warning:', e);
      }

      // Direct browser fallback to GAS if server didn't complete sheet wipe
      if (!sheetResetSynced && sheetConfig.scriptUrl && sheetConfig.scriptUrl.startsWith('http')) {
        const targetUrl = sheetConfig.scriptUrl.trim();
        try {
          if (supportsReset === null) {
            const testUrl = targetUrl.includes('?')
              ? `${targetUrl}&action=TEST&_t=${Date.now()}`
              : `${targetUrl}?action=TEST&_t=${Date.now()}`;
            const testRes = await fetchWithTimeout(testUrl, { redirect: 'follow' }, 4500);
            const testTxt = await testRes.text();
            if (!testTxt.includes('<') && testTxt.includes('supportsReset')) {
              const parsed = JSON.parse(testTxt);
              supportsReset = parsed?.supportsReset === true;
            } else {
              supportsReset = false;
            }
          }

          if (supportsReset === true) {
            try {
              const postRes = await fetchWithTimeout(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'RESET_DATA', mode, tahunAktif: currentTa.tahunAktif }),
                redirect: 'follow',
              }, 8000);
              const postTxt = await postRes.text();
              const postJson = JSON.parse(postTxt);
              if (postJson?.status === 'success') {
                sheetResetSynced = true;
              }
            } catch {
              await fetchWithTimeout(targetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'RESET_DATA', mode, tahunAktif: currentTa.tahunAktif }),
              }, 8000).catch(() => {});
              await new Promise(resolve => setTimeout(resolve, 900));
              sheetResetSynced = true;
            }
          } else if (supportsReset === false && (mode === 'all' || mode === 'students')) {
            // Old Code.gs still deployed: wipe Data_Siswa_TKR rows via GET_STUDENTS + DELETE_STUDENT directly from browser
            const targetsMap = new Map<string, { nis: string; username?: string }>();
            removedLocalStudents.forEach(st => {
              const key = String(st.nis || st.username || '').trim().toLowerCase();
              if (key) targetsMap.set(key, { nis: st.nis, username: st.username });
            });
            try {
              const stuUrl = targetUrl.includes('?')
                ? `${targetUrl}&action=GET_STUDENTS&_t=${Date.now()}`
                : `${targetUrl}?action=GET_STUDENTS&_t=${Date.now()}`;
              const stuRes = await fetchWithTimeout(stuUrl, { redirect: 'follow' }, 6000);
              const stuTxt = await stuRes.text();
              if (!stuTxt.includes('<')) {
                const stuJson = JSON.parse(stuTxt);
                if (stuJson?.status === 'success' && Array.isArray(stuJson.data)) {
                  stuJson.data.forEach((st: any) => {
                    const nis = String(st?.nis || '').trim();
                    const username = String(st?.username || '').trim();
                    const key = (nis || username).toLowerCase();
                    if (key && !targetsMap.has(key)) {
                      targetsMap.set(key, { nis, username });
                    }
                  });
                }
              }
            } catch {}

            const targets = Array.from(targetsMap.values());
            for (let i = 0; i < targets.length; i += 4) {
              const batch = targets.slice(i, i + 4);
              await Promise.all(
                batch.map(t =>
                  fetchWithTimeout(targetUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'DELETE_STUDENT', nis: t.nis, username: t.username }),
                  }, 6000).catch(() => {})
                )
              );
              studentsClearedInSheet += batch.length;
            }
          }
        } catch {}
      }
    }

    const needsCodeGsUpdate = Boolean(
      sheetConfig.scriptUrl &&
      sheetConfig.scriptUrl.startsWith('http') &&
      supportsReset === false
    );

    notifySyncUpdate();

    let message = '';
    if (mode === 'all') {
      message = sheetResetSynced
        ? `Reset total berhasil! Dihapus ${deletedUsers} data siswa dan ${deletedAttendance} catatan presensi dari aplikasi, server, dan Google Spreadsheet. Tahun Ajaran aktif tetap "${currentTa.tahunAktif}".`
        : needsCodeGsUpdate
        ? `Reset total selesai di aplikasi & server (${deletedUsers} siswa, ${deletedAttendance} presensi) serta daftar siswa di Spreadsheet dikosongkan. Untuk mengosongkan riwayat sheet Data_Absensi_PKL otomatis di Spreadsheet, perbarui & deploy ulang Code.gs terbaru.`
        : `Reset total berhasil! Dihapus ${deletedUsers} data siswa dan ${deletedAttendance} catatan presensi. Semua data kini kosong permanen dan Tahun Ajaran aktif tetap "${currentTa.tahunAktif}".`;
    } else if (mode === 'attendance') {
      message = sheetResetSynced
        ? `Reset data presensi berhasil di aplikasi, server, dan Google Spreadsheet! Dihapus ${deletedAttendance} catatan presensi.`
        : needsCodeGsUpdate
        ? `Reset presensi selesai di aplikasi & server (${deletedAttendance} catatan). Untuk mengosongkan sheet Data_Absensi_PKL otomatis di Spreadsheet, perbarui & deploy ulang Code.gs terbaru.`
        : `Reset data presensi berhasil! Dihapus ${deletedAttendance} catatan presensi. Data akun siswa dan Tahun Ajaran "${currentTa.tahunAktif}" tetap tersimpan.`;
    } else if (mode === 'students') {
      message = `Reset data siswa berhasil! Dihapus ${deletedUsers} profil siswa dan seluruh riwayat presensinya.${sheetResetSynced ? ' Google Spreadsheet ikut dikosongkan.' : ''}`;
    }

    return {
      success: true,
      message,
      deletedUsers,
      deletedAttendance,
      sheetResetSynced,
      supportsReset,
      studentsClearedInSheet,
      needsCodeGsUpdate,
    };
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

      // Clear prior reset tombstones so restored backup data is NOT blocked
      this.saveResetState({});

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
        this.saveTahunAjaranConfig(
          { ...data.tahunAjaranConfig, updatedAt: new Date().toISOString() },
          true,
          false
        );
      }
      if (data.googleSheetConfig) {
        this.saveGoogleSheetConfig(data.googleSheetConfig, true, false);
      }
      if (data.themeConfig) {
        this.saveAppThemeConfig(data.themeConfig);
      }
      if (data.reportConfig) {
        this.saveReportPrintConfig(data.reportConfig);
      }

      if (typeof window !== 'undefined') {
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resetState: {} }),
        }).catch(() => {});

        const restoredStudents = (Array.isArray(data.users) ? data.users : []).filter((u: User) => u.role === 'siswa');
        if (restoredStudents.length > 0) {
          this.syncStudentsBulkToCloud(restoredStudents).catch(() => {});
        }
      }

      notifySyncUpdate();

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

// Auto-sync with application server upon app initialization and when device regains network
if (typeof window !== 'undefined') {
  setTimeout(() => {
    StorageService.initServerSync().catch(err => console.warn('Auto server sync init warning:', err));
  }, 50);

  window.addEventListener('online', () => {
    StorageService.flushPendingSyncQueue().catch(err => console.warn('Online outbox flush warning:', err));
  });
}
