import fs from 'fs';
import path from 'path';
import { User, AttendanceRecord, GoogleSheetConfig, AppThemeConfig, ReportPrintConfig, TahunAjaranConfig } from '../types/pkl';
import { INITIAL_USERS, generateSeedAttendance, DEFAULT_THEME_CONFIG, DEFAULT_REPORT_CONFIG, DEFAULT_TAHUN_AJARAN_CONFIG } from '../services/storage';

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

  // --- ATTENDANCE METHODS ---
  public getAttendance(): AttendanceRecord[] {
    const data = this.load();
    return data.attendance;
  }

  public async saveAttendanceRecord(record: AttendanceRecord): Promise<{ record: AttendanceRecord; sheetSynced: boolean; sheetError?: string }> {
    const data = this.load();
    const existingIdx = data.attendance.findIndex(
      r => r.id === record.id || (r.tanggal === record.tanggal && r.nis === record.nis)
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

    const scriptUrl = data.config.googleSheet?.scriptUrl;
    if (scriptUrl && scriptUrl.startsWith('http')) {
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
        sheetError = err.message || 'Gagal forward ke Spreadsheet';
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

  public async saveUser(user: User): Promise<{ user: User; sheetSynced: boolean }> {
    const data = this.load();
    const existingIdx = data.users.findIndex(
      u => u.id === user.id || u.nis === user.nis || (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
    );

    let savedUser = { ...user };
    if (existingIdx >= 0) {
      savedUser = { ...data.users[existingIdx], ...user };
      data.users[existingIdx] = savedUser;
    } else {
      data.users.push(savedUser);
    }

    this.saveToDisk();

    let sheetSynced = false;
    const scriptUrl = data.config.googleSheet?.scriptUrl;
    if (user.role === 'siswa' && scriptUrl && scriptUrl.startsWith('http')) {
      try {
        const res = await this.forwardStudentToGAS(scriptUrl, savedUser);
        sheetSynced = res.success;
      } catch (e) {
        console.warn('[ServerStore] Student GAS forward failed:', e);
      }
    }

    return { user: savedUser, sheetSynced };
  }

  public deleteUser(id: string): boolean {
    const data = this.load();
    const prevLen = data.users.length;
    data.users = data.users.filter(u => u.id !== id);
    if (data.users.length !== prevLen) {
      this.saveToDisk();
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
      data.config.googleSheet = { ...data.config.googleSheet, ...partialConfig.googleSheet };
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

    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, message: 'Berhasil dikirim ke Google Spreadsheet' };
    }
    return { success: false, message: `Status respon GAS: ${res.status}` };
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
    };

    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, message: 'Data siswa tersinkron ke Spreadsheet' };
    }
    return { success: false, message: `Status respon GAS: ${res.status}` };
  }

  public async pullAttendanceFromGAS(customUrl?: string): Promise<{ success: boolean; count: number; message: string }> {
    const data = this.load();
    const targetUrl = customUrl || data.config.googleSheet?.scriptUrl;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, count: 0, message: 'URL Google Apps Script belum disetel' };
    }

    const fetchUrl = targetUrl.includes('?') 
      ? `${targetUrl}&action=GET_ALL&_t=${Date.now()}` 
      : `${targetUrl}?action=GET_ALL&_t=${Date.now()}`;

    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Google Apps Script merespon dengan status ${res.status}`);

    const json = await res.json();
    if (json && json.status === 'success' && Array.isArray(json.data)) {
      let updated = 0;
      json.data.forEach((item: any) => {
        if (!item.tanggal || !item.nis) return;
        const id = item.id || `ABS-${String(item.tanggal).replace(/-/g, '')}-${item.nis}`;
        const existingIdx = data.attendance.findIndex(
          r => r.id === id || (r.tanggal === item.tanggal && String(r.nis).trim() === String(item.nis).trim())
        );

        const record: AttendanceRecord = {
          id,
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

      return {
        success: true,
        count: updated,
        message: `Berhasil sinkron ${updated} data presensi dari Google Spreadsheet. Total: ${data.attendance.length}.`,
      };
    }

    return { success: false, count: 0, message: json.message || 'Format data GAS tidak dikenali' };
  }
}

export const serverStore = new ServerStore();
