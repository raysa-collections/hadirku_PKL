import fs from 'fs';
import path from 'path';
import { User, AttendanceRecord, GoogleSheetConfig, AppThemeConfig, ReportPrintConfig, TahunAjaranConfig, DataResetState } from '../types/pkl';
import { INITIAL_USERS, generateSeedAttendance, DEFAULT_THEME_CONFIG, DEFAULT_REPORT_CONFIG, DEFAULT_TAHUN_AJARAN_CONFIG } from '../constants/defaults';
import {
  normalizeAttendanceRecord,
  normalizeDateYmd,
  parseTimestampMsSafe,
  sortAttendanceRecordsDeterministic,
} from '../utils/attendanceUtils';

interface ServerDatabase {
  users: User[];
  attendance: AttendanceRecord[];
  config: {
    googleSheet: GoogleSheetConfig;
    appTheme: AppThemeConfig;
    reportConfig: ReportPrintConfig;
    tahunAjaran: TahunAjaranConfig;
    resetState?: DataResetState;
  };
  lastModified: string;
}

// Determine best writable location
function getDbFilePath(): string {
  if (process.env.DATA_FILE_PATH) {
    return process.env.DATA_FILE_PATH;
  }
  // Vercel serverless has only /tmp writable
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'pkl_database.json');
  }
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      return path.join('/tmp', 'pkl_database.json');
    }
  }
  return path.join(dataDir, 'database.json');
}

class ServerStore {
  private dbPath: string;
  private db: ServerDatabase | null = null;
  private isSaving: boolean = false;

  constructor() {
    this.dbPath = getDbFilePath();
    this.load();
  }

  private getDefaultData(): ServerDatabase {
    const envUrl = process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL || '';
    return {
      users: [...INITIAL_USERS],
      attendance: generateSeedAttendance(),
      config: {
        googleSheet: {
          scriptUrl: envUrl,
          sheetName: 'Data_Absensi_PKL',
          connected: Boolean(envUrl),
          autoSync: true,
          lastSync: new Date().toISOString(),
        },
        appTheme: { ...DEFAULT_THEME_CONFIG },
        reportConfig: { ...DEFAULT_REPORT_CONFIG },
        tahunAjaran: { ...DEFAULT_TAHUN_AJARAN_CONFIG },
        resetState: {},
      },
      lastModified: new Date().toISOString(),
    };
  }

  private load(): ServerDatabase {
    if (this.db) return this.db;

    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.attendance)) {
          // If env has Google Apps Script URL and not configured yet, inject it
          const envUrl = process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
          if (envUrl && (!parsed.config?.googleSheet?.scriptUrl || !parsed.config.googleSheet.connected)) {
            parsed.config = parsed.config || {};
            parsed.config.googleSheet = {
              scriptUrl: envUrl,
              sheetName: 'Data_Absensi_PKL',
              connected: true,
              autoSync: true,
              lastSync: new Date().toISOString(),
            };
          }
          this.db = parsed;
          return this.db!;
        }
      }
    } catch (err) {
      console.warn('[ServerStore] Failed to read database file, initializing defaults:', err);
    }

    this.db = this.getDefaultData();
    this.saveToDisk();
    return this.db;
  }

  private saveToDisk() {
    if (!this.db || this.isSaving) return;
    this.isSaving = true;
    try {
      this.db.lastModified = new Date().toISOString();
      const raw = JSON.stringify(this.db, null, 2);
      fs.writeFileSync(this.dbPath, raw, 'utf-8');
    } catch (err) {
      console.warn('[ServerStore] Error writing database to disk:', err);
    } finally {
      this.isSaving = false;
    }
  }

  // --- HELPER: SAFE GAS RESPONSE PARSING ---
  private async parseGasResponse(res: globalThis.Response): Promise<{ ok: boolean; json: any; message: string }> {
    const rawText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = null;
    }

    if (rawText.includes('accounts.google.com') || rawText.trim().startsWith('<')) {
      return {
        ok: false,
        json: null,
        message: 'Google Apps Script mengembalikan halaman login Google. Pastikan saat Deploy Web App: Execute as = Me, Who has access = Anyone (Siapa saja).',
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        json,
        message: json?.message || `Google Apps Script merespon dengan status HTTP ${res.status}`,
      };
    }

    if (json && json.status === 'error') {
      return {
        ok: false,
        json,
        message: json.message || 'Terjadi error di dalam script Google Apps Script',
      };
    }

    if (json && json.status === 'success') {
      return {
        ok: true,
        json,
        message: json.message || 'Berhasil sinkronisasi ke Google Spreadsheet',
      };
    }

    return {
      ok: res.ok && Boolean(json),
      json,
      message: json?.message || 'Respon Google Apps Script tidak berformat JSON valid.',
    };
  }

  private resolveAndCacheScriptUrl(overrideScriptUrl?: string): string {
    const data = this.load();
    const candidate = (overrideScriptUrl || '').trim();
    if (candidate && candidate.startsWith('http')) {
      if (data.config.googleSheet.scriptUrl !== candidate || !data.config.googleSheet.connected) {
        data.config.googleSheet = {
          ...data.config.googleSheet,
          scriptUrl: candidate,
          connected: true,
        };
        this.saveToDisk();
      }
      return candidate;
    }
    const existing = (data.config.googleSheet?.scriptUrl || '').trim();
    if (existing && existing.startsWith('http')) {
      return existing;
    }
    const envUrl = (process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
    if (envUrl && envUrl.startsWith('http')) {
      data.config.googleSheet.scriptUrl = envUrl;
      data.config.googleSheet.connected = true;
      this.saveToDisk();
      return envUrl;
    }
    return '';
  }

  // --- HELPER: FETCH WITH TIMEOUT (PREVENT VERCEL 10s 504 TIMEOUTS) ---
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8500): Promise<globalThis.Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private lastHydratedAt = 0;
  private hydratePromise: Promise<void> | null = null;

  public getDiagnostics() {
    const envUrl = (process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
    const data = this.load();
    const cfgUrl = (data.config.googleSheet?.scriptUrl || '').trim();
    return {
      isVercel: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
      hasEnvScriptUrl: Boolean(envUrl && envUrl.startsWith('http')),
      serverHasScriptUrl: Boolean((cfgUrl && cfgUrl.startsWith('http')) || (envUrl && envUrl.startsWith('http'))),
    };
  }

  private applyResetState(incoming: Partial<DataResetState>) {
    const data = this.load();
    const prev = data.config.resetState || {};
    const prevAttMs = prev.attendanceResetAt ? Date.parse(prev.attendanceResetAt) : 0;
    const inAttMs = incoming.attendanceResetAt ? Date.parse(incoming.attendanceResetAt) : 0;
    const prevStuMs = prev.studentsResetAt ? Date.parse(prev.studentsResetAt) : 0;
    const inStuMs = incoming.studentsResetAt ? Date.parse(incoming.studentsResetAt) : 0;

    const merged: DataResetState = {
      attendanceResetAt: inAttMs > prevAttMs ? incoming.attendanceResetAt : prev.attendanceResetAt,
      studentsResetAt: inStuMs > prevStuMs ? incoming.studentsResetAt : prev.studentsResetAt,
      ignoredStudentKeys: Array.from(new Set([...(prev.ignoredStudentKeys || []), ...(incoming.ignoredStudentKeys || [])])).slice(-500),
      ignoredAttendanceKeys: Array.from(new Set([...(prev.ignoredAttendanceKeys || []), ...(incoming.ignoredAttendanceKeys || [])])).slice(-500),
    };
    data.config.resetState = merged;

    let changed = false;
    if (merged.studentsResetAt) {
      const before = data.users.length;
      data.users = data.users.filter(
        u =>
          u.role === 'admin' ||
          u.username.toLowerCase() === 'admin123' ||
          !this.isPreResetStudent(u.nis || '', u.username || '', u.createdAt || '', merged)
      );
      if (data.users.length !== before) changed = true;
    }
    if (merged.attendanceResetAt) {
      const before = data.attendance.length;
      data.attendance = data.attendance.filter(
        r => !this.isPreResetAttendance(r.id, r.tanggal, r.nis, r.syncedAt || '', merged, r.recordedAt)
      );
      if (data.attendance.length !== before) changed = true;
    }
    if (changed || inAttMs > prevAttMs || inStuMs > prevStuMs) {
      this.saveToDisk();
    }
  }

  private async pullConfigFromGAS(targetUrl: string): Promise<void> {
    try {
      const cfgUrl = targetUrl.includes('?')
        ? `${targetUrl}&action=GET_CONFIG&_t=${Date.now()}`
        : `${targetUrl}?action=GET_CONFIG&_t=${Date.now()}`;
      const res = await this.fetchWithTimeout(cfgUrl, { redirect: 'follow' }, 3500);
      const parsed = await this.parseGasResponse(res);
      if (!parsed.ok || !parsed.json) return;

      const data = this.load();
      const cloudTahun = String(parsed.json.tahunAktif || '').trim();
      if (cloudTahun && /^\d{4}\/\d{4}$/.test(cloudTahun)) {
        const currentTa = data.config.tahunAjaran || { ...DEFAULT_TAHUN_AJARAN_CONFIG };
        if (currentTa.tahunAktif === DEFAULT_TAHUN_AJARAN_CONFIG.tahunAktif && cloudTahun !== currentTa.tahunAktif) {
          const daftar = currentTa.daftarTahun.includes(cloudTahun)
            ? currentTa.daftarTahun
            : [...currentTa.daftarTahun, cloudTahun];
          data.config.tahunAjaran = {
            tahunAktif: cloudTahun,
            daftarTahun: daftar,
            updatedAt: new Date().toISOString(),
          };
          this.saveToDisk();
        }
      }

      if (parsed.json.resetState) {
        const rs: Partial<DataResetState> = {};
        if (parsed.json.resetState.attendanceResetAt) rs.attendanceResetAt = String(parsed.json.resetState.attendanceResetAt);
        if (parsed.json.resetState.studentsResetAt) rs.studentsResetAt = String(parsed.json.resetState.studentsResetAt);
        if (rs.attendanceResetAt || rs.studentsResetAt) {
          this.applyResetState(rs);
        }
      }
    } catch {
      // Older Code.gs without GET_CONFIG will return HTML/fail quietly
    }
  }

  public async hydrateFromGasIfCold(overrideScriptUrl?: string): Promise<void> {
    const now = Date.now();
    // Throttle automatic re-hydration to once every 15 seconds so warm lambdas stay up-to-date without spamming GAS
    if (this.lastHydratedAt > 0 && now - this.lastHydratedAt < 15000) return;
    if (this.hydratePromise) return this.hydratePromise;

    const targetUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    if (!targetUrl) return;

    this.hydratePromise = (async () => {
      try {
        await this.pullConfigFromGAS(targetUrl).catch(() => {});
        await Promise.all([
          this.pullStudentsFromGAS(targetUrl).catch(() => {}),
          this.pullAttendanceFromGAS(targetUrl).catch(() => {}),
        ]);
        this.lastHydratedAt = Date.now();
      } finally {
        this.hydratePromise = null;
      }
    })();

    return this.hydratePromise;
  }

  // --- ATTENDANCE METHODS ---
  public getAttendance(filterNis?: string): AttendanceRecord[] {
    const data = this.load();
    const defaultTahun = data.config.tahunAjaran?.tahunAktif || '2025/2026';
    const normalized = data.attendance
      .map(r => normalizeAttendanceRecord(r, data.users, defaultTahun))
      .filter((r): r is AttendanceRecord => Boolean(r));
    const sorted = sortAttendanceRecordsDeterministic(normalized);
    if (filterNis) {
      const target = filterNis.trim().toLowerCase();
      return sorted.filter(r => String(r.nis || '').trim().toLowerCase() === target);
    }
    return sorted;
  }

  private parseGasTimestampMs(raw?: string): number {
    return parseTimestampMsSafe(raw).ms;
  }

  private unignoreStudentKeys(nis?: string, username?: string) {
    const data = this.load();
    const rs = data.config.resetState;
    if (!rs || !Array.isArray(rs.ignoredStudentKeys) || rs.ignoredStudentKeys.length === 0) return;
    const n = String(nis || '').trim().toLowerCase();
    const u = String(username || '').trim().toLowerCase();
    rs.ignoredStudentKeys = rs.ignoredStudentKeys.filter(k => k !== n && k !== u);
  }

  private unignoreAttendanceKeys(id?: string, tanggal?: string, nis?: string) {
    const data = this.load();
    const rs = data.config.resetState;
    if (!rs || !Array.isArray(rs.ignoredAttendanceKeys) || rs.ignoredAttendanceKeys.length === 0) return;
    const cleanId = String(id || '').trim();
    const composite = `${tanggal || ''}::${String(nis || '').trim().toLowerCase()}`;
    rs.ignoredAttendanceKeys = rs.ignoredAttendanceKeys.filter(k => k !== cleanId && k !== composite);
  }

  private isPreResetStudent(
    nis: string,
    username: string,
    createdAt: string,
    resetState?: DataResetState
  ): boolean {
    if (!resetState?.studentsResetAt) return false;
    const resetMs = Date.parse(resetState.studentsResetAt);
    if (Number.isNaN(resetMs)) return false;

    const cleanNis = nis.trim().toLowerCase();
    const cleanUser = username.trim().toLowerCase();
    const ignored = new Set((resetState.ignoredStudentKeys || []).map(k => k.toLowerCase()));
    const createdMs = this.parseGasTimestampMs(createdAt);

    // If explicitly recorded as post-reset (> resetMs + 1s buffer) and has full timestamp, allow it
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
      // Date-only stamp from on or before the reset date -> treat as pre-reset unless explicitly re-registered
      const resetJakartaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(resetMs));
      const rowDate = String(createdAt || '').slice(0, 10);
      if (rowDate <= resetJakartaDate) return true;
    }
    return false;
  }

  private isPreResetAttendance(
    id: string,
    tanggal: string,
    nis: string,
    syncedAt: string,
    resetState?: DataResetState,
    recordedAt?: string
  ): boolean {
    if (!resetState?.attendanceResetAt) return false;
    const resetMs = Date.parse(resetState.attendanceResetAt);
    if (Number.isNaN(resetMs)) return false;

    const normTanggal = normalizeDateYmd(tanggal) || String(tanggal || '').trim();
    const composite = `${normTanggal}::${String(nis || '').trim().toLowerCase()}`;
    const ignored = new Set((resetState.ignoredAttendanceKeys || []).map(k => String(k).toLowerCase()));
    const syncedParsed = parseTimestampMsSafe(syncedAt);
    const recordedParsed = parseTimestampMsSafe(recordedAt);
    const bestMs = Math.max(syncedParsed.ms, recordedParsed.ms);
    const hasTimePrecision = syncedParsed.hasTimePrecision || recordedParsed.hasTimePrecision;

    if (hasTimePrecision && bestMs > resetMs + 1000) {
      return false;
    }
    if (ignored.has(String(id || '').toLowerCase()) || ignored.has(composite)) {
      return true;
    }
    if (hasTimePrecision && bestMs > 0 && bestMs <= resetMs) {
      return true;
    }
    if (!hasTimePrecision && normTanggal) {
      const resetJakartaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(resetMs));
      if (normTanggal <= resetJakartaDate) return true;
    }
    return false;
  }

  public async saveAttendanceRecord(
    record: AttendanceRecord,
    overrideScriptUrl?: string
  ): Promise<{ record: AttendanceRecord; sheetSynced: boolean; sheetError?: string; timedOut?: boolean }> {
    const data = this.load();
    const defaultTahun = data.config.tahunAjaran?.tahunAktif || '2025/2026';
    const normalizedInput = normalizeAttendanceRecord(record, data.users, defaultTahun) || record;

    this.unignoreAttendanceKeys(normalizedInput.id, normalizedInput.tanggal, normalizedInput.nis);
    const normNis = String(normalizedInput.nis || '').trim().toLowerCase();
    const existingIdx = data.attendance.findIndex(
      r =>
        r.id === normalizedInput.id ||
        (normalizeDateYmd(r.tanggal) === normalizedInput.tanggal &&
          String(r.nis || '').trim().toLowerCase() === normNis)
    );

    const attResetMs = data.config.resetState?.attendanceResetAt
      ? Date.parse(data.config.resetState.attendanceResetAt)
      : 0;
    const safeRecordedAt = new Date(Math.max(Date.now(), (Number.isNaN(attResetMs) ? 0 : attResetMs) + 2000)).toISOString();

    let finalRecord: AttendanceRecord = {
      ...normalizedInput,
      recordedAt: normalizedInput.recordedAt || safeRecordedAt,
    };

    if (existingIdx >= 0) {
      const existing = data.attendance[existingIdx];
      finalRecord = {
        ...existing,
        ...normalizedInput,
        recordedAt: safeRecordedAt,
        fotoBukti: normalizedInput.fotoBukti || existing.fotoBukti,
        fotoPulang: normalizedInput.fotoPulang || existing.fotoPulang,
      };
      data.attendance[existingIdx] = finalRecord;
    } else {
      data.attendance.unshift(finalRecord);
    }

    data.attendance = sortAttendanceRecordsDeterministic(data.attendance);
    this.saveToDisk();

    // Forward to Google Apps Script if configured
    let sheetSynced = false;
    let sheetError: string | undefined;
    let timedOut = false;

    const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    if (scriptUrl) {
      try {
        const action = (finalRecord.jamPulang && finalRecord.jamPulang !== '-') ? 'CHECK_OUT' : 'CHECK_IN';
        const res = await this.forwardAttendanceToGAS(scriptUrl, action, finalRecord);
        if (res.success) {
          sheetSynced = true;
          finalRecord.syncStatus = 'synced';
          finalRecord.syncedAt = new Date().toISOString();
          this.saveToDisk();
        } else {
          sheetError = res.message;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          timedOut = true;
          sheetError = 'Google Apps Script lambat (>6.5 detik), browser akan melanjutkan verifikasi otomatis.';
        } else {
          sheetError = err.message || 'Gagal forward ke Spreadsheet';
        }
      }
    }

    return { record: finalRecord, sheetSynced, sheetError, timedOut };
  }

  public deleteAttendanceRecord(id: string): boolean {
    const data = this.load();
    const prevCount = data.attendance.length;
    data.attendance = data.attendance.filter(r => r.id !== id);
    if (data.attendance.length !== prevCount) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public resetAttendance(
    mode: 'all' | 'attendance' | 'students' = 'all',
    clientResetState?: Partial<DataResetState>
  ) {
    const data = this.load();
    let deletedAttendance = 0;
    let deletedStudents = 0;
    const candidateTimes = [
      Date.now(),
      clientResetState?.attendanceResetAt ? Date.parse(clientResetState.attendanceResetAt) : 0,
      clientResetState?.studentsResetAt ? Date.parse(clientResetState.studentsResetAt) : 0,
    ].filter(n => !Number.isNaN(n) && n > 0);
    const nowIso = new Date(Math.max(...candidateTimes)).toISOString();

    const prevReset = data.config.resetState || {};
    const prevIgnoredAtt = new Set(prevReset.ignoredAttendanceKeys || []);
    const prevIgnoredStu = new Set((prevReset.ignoredStudentKeys || []).map(k => k.toLowerCase()));

    (clientResetState?.ignoredAttendanceKeys || []).forEach(k => prevIgnoredAtt.add(k));
    (clientResetState?.ignoredStudentKeys || []).forEach(k => prevIgnoredStu.add(String(k).toLowerCase()));

    const removedStudents: User[] = [];

    if (mode === 'all' || mode === 'attendance' || mode === 'students') {
      deletedAttendance = data.attendance.length;
      data.attendance.forEach(r => {
        if (r.id) prevIgnoredAtt.add(r.id);
        if (r.tanggal && r.nis) prevIgnoredAtt.add(`${r.tanggal}::${String(r.nis).trim().toLowerCase()}`);
      });
      data.attendance = [];
      prevReset.attendanceResetAt = nowIso;
      prevReset.ignoredAttendanceKeys = Array.from(prevIgnoredAtt).slice(-500);
    }

    if (mode === 'all' || mode === 'students') {
      const admins = data.users.filter(u => u.role === 'admin' || u.username.toLowerCase() === 'admin123');
      const studentsToRemove = data.users.filter(u => u.role !== 'admin' && u.username.toLowerCase() !== 'admin123');
      deletedStudents = studentsToRemove.length;
      studentsToRemove.forEach(s => {
        removedStudents.push(s);
        if (s.nis) prevIgnoredStu.add(String(s.nis).trim().toLowerCase());
        if (s.username) prevIgnoredStu.add(String(s.username).trim().toLowerCase());
      });
      data.users = admins;
      prevReset.studentsResetAt = nowIso;
      prevReset.ignoredStudentKeys = Array.from(prevIgnoredStu).slice(-500);
    }

    data.config.resetState = prevReset;
    this.lastHydratedAt = Date.now();
    this.saveToDisk();
    return { deletedAttendance, deletedStudents, resetState: prevReset, removedStudents };
  }

  public async resetAttendanceAsync(
    mode: 'all' | 'attendance' | 'students' = 'all',
    overrideScriptUrl?: string,
    clientResetState?: Partial<DataResetState>
  ) {
    const res = this.resetAttendance(mode, clientResetState);
    const data = this.load();
    const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    let sheetResetSynced = false;
    let supportsReset: boolean | null = null;
    let deletedGasStudents = 0;

    if (scriptUrl) {
      try {
        const testUrl = scriptUrl.includes('?') ? `${scriptUrl}&action=TEST&_t=${Date.now()}` : `${scriptUrl}?action=TEST&_t=${Date.now()}`;
        const testRes = await this.fetchWithTimeout(testUrl, { redirect: 'follow' }, 3500);
        const testParsed = await this.parseGasResponse(testRes);
        if (testParsed.ok && testParsed.json?.supportsReset === true) {
          supportsReset = true;
          const resetRes = await this.fetchWithTimeout(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'RESET_DATA',
              mode,
              tahunAktif: data.config.tahunAjaran?.tahunAktif || '',
            }),
            redirect: 'follow',
          }, 5500);
          const resetParsed = await this.parseGasResponse(resetRes);
          sheetResetSynced = resetParsed.ok;
        } else {
          supportsReset = false;
          // Old Code.gs fallback: discover ALL students currently stored in Data_Siswa_TKR and delete them via DELETE_STUDENT
          if (mode === 'all' || mode === 'students') {
            const targetsMap = new Map<string, { nis: string; username?: string }>();
            res.removedStudents.forEach(st => {
              const key = String(st.nis || st.username || '').trim().toLowerCase();
              if (key) targetsMap.set(key, { nis: st.nis, username: st.username });
            });
            try {
              const stuUrl = scriptUrl.includes('?')
                ? `${scriptUrl}&action=GET_STUDENTS&_t=${Date.now()}`
                : `${scriptUrl}?action=GET_STUDENTS&_t=${Date.now()}`;
              const stuRes = await this.fetchWithTimeout(stuUrl, { redirect: 'follow' }, 4000);
              const stuParsed = await this.parseGasResponse(stuRes);
              if (stuParsed.ok && Array.isArray(stuParsed.json?.data)) {
                stuParsed.json.data.forEach((st: any) => {
                  const nis = String(st?.nis || '').trim();
                  const username = String(st?.username || '').trim();
                  const key = (nis || username).toLowerCase();
                  if (key && !targetsMap.has(key)) {
                    targetsMap.set(key, { nis, username });
                  }
                });
              }
            } catch {}

            const targets = Array.from(targetsMap.values());
            for (let i = 0; i < targets.length; i += 5) {
              const batch = targets.slice(i, i + 5);
              const results = await Promise.all(
                batch.map(t => this.deleteStudentFromGAS(scriptUrl, t.nis, t.username).catch(() => ({ success: false })))
              );
              deletedGasStudents += results.filter(r => r.success).length;
            }
          }
        }
      } catch (err) {
        console.warn('[ServerStore] GAS reset cleanup warning:', err);
      }
    }

    return {
      deletedAttendance: res.deletedAttendance,
      deletedStudents: res.deletedStudents,
      resetState: res.resetState,
      sheetResetSynced,
      supportsReset,
      deletedGasStudents,
    };
  }

  // --- USERS / STUDENTS METHODS ---
  public getUsers(): User[] {
    const data = this.load();
    return data.users;
  }

  public getStudents(): User[] {
    const data = this.load();
    return data.users.filter(u => u.role === 'siswa');
  }

  public async saveUser(
    user: User,
    overrideScriptUrl?: string
  ): Promise<{ user: User; sheetSynced: boolean; sheetError?: string }> {
    const data = this.load();
    this.unignoreStudentKeys(user.nis, user.username);
    const existingIdx = data.users.findIndex(
      u =>
        u.id === user.id ||
        (u.nis && user.nis && u.nis.toLowerCase() === user.nis.toLowerCase()) ||
        (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
    );

    const stuResetMs = data.config.resetState?.studentsResetAt ? Date.parse(data.config.resetState.studentsResetAt) : 0;
    const incomingCreatedMs = user.createdAt ? this.parseGasTimestampMs(user.createdAt) : 0;
    const hasTimePrecision = /\d{2}:\d{2}/.test(String(user.createdAt || ''));
    const safeCreatedAt =
      hasTimePrecision && incomingCreatedMs > stuResetMs + 1000
        ? user.createdAt!
        : new Date(Math.max(Date.now(), stuResetMs + 2000)).toISOString();

    let savedUser: User = { ...user, createdAt: safeCreatedAt };
    if (existingIdx >= 0) {
      const existingPass = data.users[existingIdx].password;
      const incomingPass = user.password;
      const finalPass = (incomingPass && incomingPass !== 'siswa123')
        ? incomingPass
        : (existingPass || incomingPass || 'siswa123');

      savedUser = {
        ...data.users[existingIdx],
        ...user,
        createdAt: safeCreatedAt,
        password: finalPass,
      };
      data.users[existingIdx] = savedUser;
    } else {
      data.users.push(savedUser);
    }

    this.saveToDisk();

    let sheetSynced = false;
    let sheetError: string | undefined;
    const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    if (user.role === 'siswa' && scriptUrl) {
      try {
        const res = await this.forwardStudentToGAS(scriptUrl, savedUser);
        sheetSynced = res.success;
        if (!res.success) {
          sheetError = res.message;
        }
      } catch (e: any) {
        sheetError = e?.message || 'Gagal forward data siswa ke Google Spreadsheet';
        console.warn('[ServerStore] Student GAS forward failed:', e);
      }
    }

    return { user: savedUser, sheetSynced, sheetError };
  }

  public async saveUsersBulk(
    users: User[],
    overrideScriptUrl?: string
  ): Promise<{ addedCount: number; updatedCount: number; sheetSyncedCount: number }> {
    const data = this.load();
    let addedCount = 0;
    let updatedCount = 0;
    let sheetSyncedCount = 0;
    const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);

    for (const nu of users) {
      this.unignoreStudentKeys(nu.nis, nu.username);
      const existingIdx = data.users.findIndex(
        u =>
          (u.nis && nu.nis && u.nis.toLowerCase() === nu.nis.toLowerCase()) ||
          (u.username && nu.username && u.username.toLowerCase() === nu.username.toLowerCase())
      );

      let savedUser = { ...nu };
      if (existingIdx >= 0) {
        const existingPass = data.users[existingIdx].password;
        const incomingPass = nu.password;
        const finalPass = (existingPass && existingPass !== 'siswa123')
          ? existingPass
          : (incomingPass || 'siswa123');
        savedUser = {
          ...data.users[existingIdx],
          ...nu,
          password: finalPass,
          id: data.users[existingIdx].id,
        };
        data.users[existingIdx] = savedUser;
        updatedCount++;
      } else {
        data.users.push(savedUser);
        addedCount++;
      }

      if (savedUser.role === 'siswa' && scriptUrl) {
        try {
          const res = await this.forwardStudentToGAS(scriptUrl, savedUser);
          if (res.success) sheetSyncedCount++;
        } catch (err) {
          console.warn('[ServerStore] Bulk GAS forward warning:', err);
        }
      }
    }

    this.saveToDisk();
    return { addedCount, updatedCount, sheetSyncedCount };
  }

  public async deleteUser(id: string, overrideScriptUrl?: string): Promise<boolean> {
    const data = this.load();
    const target = data.users.find(u => u.id === id);
    const prevLen = data.users.length;
    data.users = data.users.filter(u => u.id !== id);
    if (data.users.length !== prevLen) {
      this.saveToDisk();
      const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
      if (target && target.role === 'siswa' && scriptUrl) {
        try {
          await this.deleteStudentFromGAS(scriptUrl, target.nis, target.username);
        } catch (err) {
          console.warn('[ServerStore] Delete student GAS warning:', err);
        }
      }
      return true;
    }
    return false;
  }

  // --- CONFIG METHODS ---
  public getConfig() {
    const data = this.load();
    return data.config;
  }

  public saveConfig(partialConfig: Partial<ServerDatabase['config']>) {
    const data = this.load();
    if (partialConfig.googleSheet) {
      const nextUrl = (partialConfig.googleSheet.scriptUrl ?? data.config.googleSheet.scriptUrl ?? '').trim();
      data.config.googleSheet = {
        ...data.config.googleSheet,
        ...partialConfig.googleSheet,
        scriptUrl: nextUrl,
        connected: Boolean(nextUrl && nextUrl.startsWith('http')),
      };
    }
    if (partialConfig.appTheme) {
      data.config.appTheme = { ...data.config.appTheme, ...partialConfig.appTheme };
    }
    if (partialConfig.reportConfig) {
      data.config.reportConfig = { ...data.config.reportConfig, ...partialConfig.reportConfig };
    }
    if (partialConfig.tahunAjaran) {
      const incoming = partialConfig.tahunAjaran;
      const existing = data.config.tahunAjaran;
      const inMs = incoming.updatedAt ? Date.parse(incoming.updatedAt) : 0;
      const exMs = existing?.updatedAt ? Date.parse(existing.updatedAt) : 0;
      if (!existing || !exMs || !inMs || inMs >= exMs) {
        data.config.tahunAjaran = {
          ...existing,
          ...incoming,
          updatedAt: incoming.updatedAt || new Date().toISOString(),
        };
      }
    }
    if (partialConfig.resetState !== undefined) {
      data.config.resetState = partialConfig.resetState;
    }
    this.saveToDisk();
    return data.config;
  }

  // --- GOOGLE APPS SCRIPT SYNC METHODS (RUN ON SERVER) ---
  public async testGASConnection(url: string): Promise<{ success: boolean; message: string }> {
    const targetUrl = (url || '').trim();
    if (!targetUrl || !targetUrl.startsWith('https://script.google.com')) {
      return { success: false, message: 'URL harus berformat Web App Google Apps Script (https://script.google.com/...)' };
    }

    try {
      const testUrl = targetUrl.includes('?') ? `${targetUrl}&action=TEST&_t=${Date.now()}` : `${targetUrl}?action=TEST&_t=${Date.now()}`;
      const res = await this.fetchWithTimeout(testUrl, { redirect: 'follow' }, 7500);
      const parsed = await this.parseGasResponse(res);
      if (parsed.ok) {
        return { success: true, message: parsed.message || 'Koneksi ke Google Apps Script Web App berhasil terverifikasi!' };
      }

      // If GET wasn't JSON (e.g., standalone HTML index served on GET without action=TEST handler), try POST TEST
      const postRes = await this.fetchWithTimeout(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'TEST' }),
        redirect: 'follow',
      }, 7500);
      const postParsed = await this.parseGasResponse(postRes);
      if (postParsed.ok) {
        return { success: true, message: postParsed.message || 'Koneksi ke Google Apps Script Web App berhasil terverifikasi!' };
      }
      return { success: false, message: postParsed.message || parsed.message };
    } catch (err: any) {
      return { success: false, message: 'Gagal terhubung ke Google Apps Script: ' + (err?.message || 'Jaringan error') };
    }
  }

  public async forwardAttendanceToGAS(scriptUrl: string, action: 'CHECK_IN' | 'CHECK_OUT', record: AttendanceRecord): Promise<{ success: boolean; message: string }> {
    const payload = {
      action,
      id: record.id,
      tanggal: record.tanggal,
      nis: record.nis,
      namaSiswa: record.namaSiswa,
      kelas: record.kelas || 'XII TKR 1',
      namaPembimbing: record.namaPembimbing || '-',
      asalSekolah: record.asalSekolah || 'SMKN 1 Tegalsari',
      jurusan: record.jurusan || 'Teknik Kendaraan Ringan (TKR)',
      tempatPkl: record.tempatPkl || '-',
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

    const res = await this.fetchWithTimeout(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    }, 6500);

    const parsed = await this.parseGasResponse(res);
    return { success: parsed.ok, message: parsed.message };
  }

  public async forwardStudentToGAS(scriptUrl: string, student: User): Promise<{ success: boolean; message: string }> {
    const data = this.load();
    const activeTahun = data.config.tahunAjaran?.tahunAktif || '2025/2026';
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
      tahunAjaran: student.tahunAjaran || activeTahun,
      password: student.password || 'siswa123',
    };

    const res = await this.fetchWithTimeout(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    }, 6500);

    const parsed = await this.parseGasResponse(res);
    return { success: parsed.ok, message: parsed.message };
  }

  public async deleteStudentFromGAS(scriptUrl: string, nis: string, username?: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithTimeout(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'DELETE_STUDENT', nis, username }),
      redirect: 'follow',
    }, 7500);
    const parsed = await this.parseGasResponse(res);
    return { success: parsed.ok, message: parsed.message };
  }

  public async pullStudentsFromGAS(customUrl?: string): Promise<{ success: boolean; count: number; data: User[]; message: string }> {
    const data = this.load();
    const targetUrl = this.resolveAndCacheScriptUrl(customUrl);
    if (!targetUrl) {
      return { success: false, count: 0, data: this.getStudents(), message: 'URL Google Apps Script belum disetel' };
    }

    const fetchUrl = targetUrl.includes('?')
      ? `${targetUrl}&action=GET_STUDENTS&_t=${Date.now()}`
      : `${targetUrl}?action=GET_STUDENTS&_t=${Date.now()}`;

    const res = await this.fetchWithTimeout(fetchUrl, { redirect: 'follow' }, 6500);
    const parsed = await this.parseGasResponse(res);
    if (!parsed.ok) {
      return { success: false, count: 0, data: this.getStudents(), message: parsed.message };
    }

    const json = parsed.json;
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      let updated = 0;
      const defaultTahun = data.config.tahunAjaran?.tahunAktif || '2025/2026';
      const resetState = data.config.resetState;

      json.data.forEach((st: any) => {
        const cleanNis = String(st.nis || '').trim();
        const cleanNama = String(st.nama || '').trim();
        if (!cleanNis || !cleanNama) return;

        const cleanUsername = String(st.username || cleanNis).trim().toLowerCase().replace(/\s+/g, '');
        if (this.isPreResetStudent(cleanNis, cleanUsername, String(st.createdAt || ''), resetState)) {
          return;
        }
        const existingIdx = data.users.findIndex(
          u =>
            u.role === 'siswa' &&
            ((u.nis && u.nis.toLowerCase() === cleanNis.toLowerCase()) ||
              (u.username && u.username.toLowerCase() === cleanUsername))
        );

        const incomingPass = st.password ? String(st.password).trim() : '';
        const existingPass = existingIdx >= 0 ? data.users[existingIdx].password : '';
        const finalPass =
          incomingPass && incomingPass !== 'siswa123'
            ? incomingPass
            : existingPass && existingPass !== 'siswa123'
            ? existingPass
            : incomingPass || 'siswa123';

        const studentObj: User = {
          id: existingIdx >= 0 ? data.users[existingIdx].id : `USR-SISWA-${cleanNis}`,
          username: cleanUsername,
          password: finalPass,
          role: 'siswa',
          nama: cleanNama,
          nis: cleanNis,
          kelas: st.kelas || (existingIdx >= 0 ? data.users[existingIdx].kelas : 'XII TKR 1'),
          jenisKelamin: (st.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki'),
          asalSekolah: st.asalSekolah || 'SMKN 1 Tegalsari',
          jurusan: st.jurusan || 'Teknik Kendaraan Ringan (TKR)',
          noHp: st.noHp || '-',
          tempatPkl: st.tempatPkl || '-',
          namaPembimbing: st.namaPembimbing || '-',
          tahunAjaran: st.tahunAjaran || (existingIdx >= 0 ? data.users[existingIdx].tahunAjaran : undefined) || defaultTahun,
          createdAt: st.createdAt || (existingIdx >= 0 ? data.users[existingIdx].createdAt : undefined) || new Date().toISOString().slice(0, 10),
        };

        if (existingIdx >= 0) {
          data.users[existingIdx] = studentObj;
        } else {
          data.users.push(studentObj);
        }
        updated++;
      });

      data.config.googleSheet.lastSync = new Date().toISOString();
      data.config.googleSheet.connected = true;
      this.saveToDisk();

      const students = this.getStudents();
      return {
        success: true,
        count: updated,
        data: students,
        message: `Berhasil sinkron ${updated} data siswa TKR dari Google Spreadsheet (Total: ${students.length} siswa).`,
      };
    }

    return { success: false, count: 0, data: this.getStudents(), message: json?.message || 'Format data siswa GAS tidak dikenali' };
  }

  public async pullAttendanceFromGAS(customUrl?: string, filterNis?: string): Promise<{ success: boolean; count: number; data?: AttendanceRecord[]; message: string }> {
    const data = this.load();
    const targetUrl = this.resolveAndCacheScriptUrl(customUrl);
    if (!targetUrl) {
      return { success: false, count: 0, message: 'URL Google Apps Script belum disetel' };
    }

    const nisParam = filterNis ? `&nis=${encodeURIComponent(filterNis.trim())}` : '';
    const fetchUrl = targetUrl.includes('?')
      ? `${targetUrl}&action=GET_ALL${nisParam}&_t=${Date.now()}`
      : `${targetUrl}?action=GET_ALL${nisParam}&_t=${Date.now()}`;

    const res = await this.fetchWithTimeout(fetchUrl, { redirect: 'follow' }, 6500);
    const parsed = await this.parseGasResponse(res);
    if (!parsed.ok) {
      return { success: false, count: 0, message: parsed.message };
    }

    const json = parsed.json;
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      let updated = 0;
      const resetState = data.config.resetState;
      const defaultTahun = data.config.tahunAjaran?.tahunAktif || '2025/2026';

      json.data.forEach((item: any) => {
        const normalized = normalizeAttendanceRecord(
          {
            ...item,
            syncStatus: 'synced',
            syncedAt: item?.syncedAt || new Date().toISOString(),
          },
          data.users,
          defaultTahun
        );
        if (!normalized) return;

        if (
          this.isPreResetAttendance(
            normalized.id,
            normalized.tanggal,
            normalized.nis,
            normalized.syncedAt || '',
            resetState,
            normalized.recordedAt
          )
        ) {
          return;
        }

        // Valid post-reset cloud record unignores any stale local/server tombstone
        this.unignoreAttendanceKeys(normalized.id, normalized.tanggal, normalized.nis);

        const normNis = normalized.nis.toLowerCase();
        const existingIdx = data.attendance.findIndex(
          r =>
            r.id === normalized.id ||
            (normalizeDateYmd(r.tanggal) === normalized.tanggal &&
              String(r.nis || '').trim().toLowerCase() === normNis)
        );

        if (existingIdx >= 0) {
          const ex = data.attendance[existingIdx];
          const remoteHasOut = normalized.jamPulang && normalized.jamPulang !== '-';
          const localHasOut = ex.jamPulang && ex.jamPulang !== '-';
          const preserveLocalOut = !remoteHasOut && localHasOut && ex.syncStatus === 'pending';

          data.attendance[existingIdx] = {
            ...ex,
            ...normalized,
            jamPulang: preserveLocalOut ? ex.jamPulang : (remoteHasOut ? normalized.jamPulang : (ex.jamPulang || '-')),
            statusPulang: preserveLocalOut ? ex.statusPulang : (remoteHasOut ? normalized.statusPulang : (ex.statusPulang || 'Belum Pulang')),
            koordinatPulang: preserveLocalOut ? ex.koordinatPulang : (normalized.koordinatPulang !== '-' ? normalized.koordinatPulang : (ex.koordinatPulang || '-')),
            mapsUrlPulang: preserveLocalOut ? ex.mapsUrlPulang : (normalized.mapsUrlPulang !== '-' ? normalized.mapsUrlPulang : (ex.mapsUrlPulang || '-')),
            fotoBukti: ex.fotoBukti || normalized.fotoBukti,
            fotoPulang: ex.fotoPulang || normalized.fotoPulang,
            tahunAjaran: ex.tahunAjaran || normalized.tahunAjaran,
            recordedAt: ex.recordedAt || normalized.recordedAt,
            syncStatus: preserveLocalOut ? 'pending' : 'synced',
          };
        } else {
          data.attendance.push(normalized);
        }
        updated++;
      });

      data.attendance = sortAttendanceRecordsDeterministic(data.attendance);
      data.config.googleSheet.lastSync = new Date().toISOString();
      data.config.googleSheet.connected = true;
      this.saveToDisk();

      const returnData = this.getAttendance(filterNis);

      return {
        success: true,
        count: updated,
        data: returnData,
        message: `Berhasil sinkron ${updated} data presensi dari Google Spreadsheet. Total: ${returnData.length}.`,
      };
    }

    return { success: false, count: 0, message: json?.message || 'Format data GAS tidak dikenali' };
  }
}

export const serverStore = new ServerStore();
