import fs from 'fs';
import path from 'path';
import { User, AttendanceRecord, GoogleSheetConfig, AppThemeConfig, ReportPrintConfig, TahunAjaranConfig } from '../types/pkl';
import { INITIAL_USERS, generateSeedAttendance, DEFAULT_THEME_CONFIG, DEFAULT_REPORT_CONFIG, DEFAULT_TAHUN_AJARAN_CONFIG } from '../constants/defaults';

interface ServerDatabase {
  users: User[];
  attendance: AttendanceRecord[];
  config: {
    googleSheet: GoogleSheetConfig;
    appTheme: AppThemeConfig;
    reportConfig: ReportPrintConfig;
    tahunAjaran: TahunAjaranConfig;
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
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 7500): Promise<globalThis.Response> {
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

  // --- ATTENDANCE METHODS ---
  public getAttendance(filterNis?: string): AttendanceRecord[] {
    const data = this.load();
    if (filterNis) {
      const target = filterNis.trim().toLowerCase();
      return data.attendance.filter(r => String(r.nis || '').trim().toLowerCase() === target);
    }
    return data.attendance;
  }

  public async saveAttendanceRecord(
    record: AttendanceRecord,
    overrideScriptUrl?: string
  ): Promise<{ record: AttendanceRecord; sheetSynced: boolean; sheetError?: string }> {
    const data = this.load();
    const normNis = String(record.nis || '').trim().toLowerCase();
    const existingIdx = data.attendance.findIndex(
      r => r.id === record.id || (r.tanggal === record.tanggal && String(r.nis || '').trim().toLowerCase() === normNis)
    );

    let finalRecord: AttendanceRecord = { ...record };

    if (existingIdx >= 0) {
      finalRecord = {
        ...data.attendance[existingIdx],
        ...record,
        fotoBukti: record.fotoBukti || data.attendance[existingIdx].fotoBukti,
        fotoPulang: record.fotoPulang || data.attendance[existingIdx].fotoPulang,
      };
      data.attendance[existingIdx] = finalRecord;
    } else {
      data.attendance.unshift(finalRecord);
    }

    this.saveToDisk();

    // Forward to Google Apps Script if configured
    let sheetSynced = false;
    let sheetError: string | undefined;

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
        sheetError = err?.name === 'AbortError'
          ? 'Google Apps Script sedang sibuk/lambat, dilanjutkan sinkronisasi latar belakang.'
          : (err.message || 'Gagal forward ke Spreadsheet');
      }
    }

    return { record: finalRecord, sheetSynced, sheetError };
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

  public resetAttendance(mode: 'all' | 'attendance' | 'students' = 'all') {
    const data = this.load();
    let deletedAttendance = 0;
    let deletedStudents = 0;

    if (mode === 'all' || mode === 'attendance') {
      deletedAttendance = data.attendance.length;
      data.attendance = [];
    }

    if (mode === 'all' || mode === 'students') {
      const admins = data.users.filter(u => u.role === 'admin' || u.username.toLowerCase() === 'admin123');
      deletedStudents = data.users.length - admins.length;
      data.users = admins;
    }

    this.saveToDisk();
    return { deletedAttendance, deletedStudents };
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
    const existingIdx = data.users.findIndex(
      u =>
        u.id === user.id ||
        (u.nis && user.nis && u.nis.toLowerCase() === user.nis.toLowerCase()) ||
        (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
    );

    let savedUser = { ...user };
    if (existingIdx >= 0) {
      const existingPass = data.users[existingIdx].password;
      const incomingPass = user.password;
      const finalPass = (incomingPass && incomingPass !== 'siswa123')
        ? incomingPass
        : (existingPass || incomingPass || 'siswa123');

      savedUser = {
        ...data.users[existingIdx],
        ...user,
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
      data.config.tahunAjaran = { ...data.config.tahunAjaran, ...partialConfig.tahunAjaran };
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
    }, 7500);

    const parsed = await this.parseGasResponse(res);
    return { success: parsed.ok, message: parsed.message };
  }

  public async forwardStudentToGAS(scriptUrl: string, student: User): Promise<{ success: boolean; message: string }> {
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
      tahunAjaran: student.tahunAjaran || '2025/2026',
      password: student.password || 'siswa123',
    };

    const res = await this.fetchWithTimeout(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    }, 7500);

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

    const res = await this.fetchWithTimeout(fetchUrl, { redirect: 'follow' }, 8000);
    const parsed = await this.parseGasResponse(res);
    if (!parsed.ok) {
      return { success: false, count: 0, data: this.getStudents(), message: parsed.message };
    }

    const json = parsed.json;
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      let updated = 0;
      const defaultTahun = data.config.tahunAjaran?.tahunAktif || '2025/2026';

      json.data.forEach((st: any) => {
        const cleanNis = String(st.nis || '').trim();
        const cleanNama = String(st.nama || '').trim();
        if (!cleanNis || !cleanNama) return;

        const cleanUsername = String(st.username || cleanNis).trim().toLowerCase().replace(/\s+/g, '');
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

    const res = await this.fetchWithTimeout(fetchUrl, { redirect: 'follow' }, 8000);
    const parsed = await this.parseGasResponse(res);
    if (!parsed.ok) {
      return { success: false, count: 0, message: parsed.message };
    }

    const json = parsed.json;
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      let updated = 0;
      json.data.forEach((item: any) => {
        if (!item.tanggal || !item.nis) return;
        const itemNis = String(item.nis).trim();
        const id = item.id || `ABS-${String(item.tanggal).replace(/-/g, '')}-${itemNis}`;
        const existingIdx = data.attendance.findIndex(
          r => r.id === id || (r.tanggal === item.tanggal && String(r.nis).trim().toLowerCase() === itemNis.toLowerCase())
        );

        const record: AttendanceRecord = {
          id,
          tanggal: item.tanggal,
          nis: itemNis,
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
          mapsUrl: item.mapsUrl || '-',
          koordinatPulang: item.koordinatPulang || '-',
          mapsUrlPulang: item.mapsUrlPulang || '-',
          syncStatus: 'synced',
          syncedAt: item.syncedAt || new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          data.attendance[existingIdx] = {
            ...record,
            fotoBukti: data.attendance[existingIdx].fotoBukti || record.fotoBukti,
            fotoPulang: data.attendance[existingIdx].fotoPulang || record.fotoPulang,
          };
        } else {
          data.attendance.unshift(record);
        }
        updated++;
      });

      data.config.googleSheet.lastSync = new Date().toISOString();
      data.config.googleSheet.connected = true;
      this.saveToDisk();

      const returnData = filterNis ? this.getAttendance(filterNis) : data.attendance;

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
