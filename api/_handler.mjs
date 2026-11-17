// src/server/app.ts
import express from "express";

// src/server/store.ts
import fs from "fs";
import path from "path";

// src/constants/defaults.ts
var DEFAULT_TAHUN_AJARAN_CONFIG = {
  tahunAktif: "2025/2026",
  daftarTahun: ["2024/2025", "2025/2026", "2026/2027", "2027/2028"]
};
var DEFAULT_THEME_CONFIG = {
  appTitle: "Absensi Siswa PKL",
  appSubtitle: "SMK Negeri 1 Tegalsari \u2022 Jurusan Teknik Kendaraan Ringan (TKR)",
  logoPreset: "school",
  headerColor: "cyan",
  borderStyle: "subtle"
};
var DEFAULT_REPORT_CONFIG = {
  kopBaris1: "PEMERINTAH PROVINSI JAWA TIMUR \u2022 DINAS PENDIDIKAN",
  kopBaris2: "SMK NEGERI 1 TEGALSARI \u2014 KELOMPOK TEKNOLOGI & REKAYASA",
  kopBaris3: "PROGRAM KEAHLIAN TEKNIK KENDARAAN RINGAN (TKR)",
  kopAlamat: "Jl. KH. Syafa'at No. 01 Blokagung, Tegalsari, Banyuwangi - Telp. (0333) 845678",
  logoKiriUrl: "",
  logoKananUrl: "",
  showLogoKiri: true,
  showLogoKanan: true,
  ttdKiriLabel: "Mengetahui,\nSekretaris Jurusan TKR",
  ttdKiriNama: "Andrik Wiyono, S.T., M.Pd., Gr.",
  ttdKiriJabatan: "NIP. 19820415 201101 1 005",
  ttdKananKota: "Tegalsari",
  ttdKananLabel: "Kepala Program Keahlian TKR",
  ttdKananNama: "Achmad Mackrus, S.T.",
  ttdKananNip: "NIP. 19790820 200801 1 012",
  showKop: true,
  showTtd: true,
  paperSize: "A4",
  paperOrientation: "landscape",
  paperMargin: "normal",
  tableFontSize: "normal"
};
var INITIAL_USERS = [
  {
    id: "USR-ADMIN-1",
    username: "admin123",
    password: "admin123",
    role: "admin",
    nama: "Administrator PKL TKR",
    nis: "197805122005011003",
    nip: "197805122005011003",
    jabatan: "Koordinator BKK & Hubin PKL",
    jenisKelamin: "Laki-laki",
    asalSekolah: "SMKN 1 Tegalsari",
    jurusan: "Koordinator PKL Sekolah",
    kelas: "Guru/Koordinator",
    noHp: "081234567890",
    tempatPkl: "Kantor BKK & Hubin Sekolah",
    namaPembimbing: "Kepala Sekolah SMKN 1 Tegalsari",
    createdAt: "2026-01-01"
  }
];
function generateSeedAttendance() {
  return [];
}

// src/server/store.ts
function getDbFilePath() {
  if (process.env.DATA_FILE_PATH) {
    return process.env.DATA_FILE_PATH;
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "pkl_database.json");
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      return path.join("/tmp", "pkl_database.json");
    }
  }
  return path.join(dataDir, "database.json");
}
var ServerStore = class {
  constructor() {
    this.db = null;
    this.isSaving = false;
    this.lastHydratedAt = 0;
    this.hydratePromise = null;
    this.dbPath = getDbFilePath();
    this.load();
  }
  getDefaultData() {
    const envUrl = process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL || "";
    return {
      users: [...INITIAL_USERS],
      attendance: generateSeedAttendance(),
      config: {
        googleSheet: {
          scriptUrl: envUrl,
          sheetName: "Data_Absensi_PKL",
          connected: Boolean(envUrl),
          autoSync: true,
          lastSync: (/* @__PURE__ */ new Date()).toISOString()
        },
        appTheme: { ...DEFAULT_THEME_CONFIG },
        reportConfig: { ...DEFAULT_REPORT_CONFIG },
        tahunAjaran: { ...DEFAULT_TAHUN_AJARAN_CONFIG }
      },
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  load() {
    if (this.db) return this.db;
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.attendance)) {
          const envUrl = process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
          if (envUrl && (!parsed.config?.googleSheet?.scriptUrl || !parsed.config.googleSheet.connected)) {
            parsed.config = parsed.config || {};
            parsed.config.googleSheet = {
              scriptUrl: envUrl,
              sheetName: "Data_Absensi_PKL",
              connected: true,
              autoSync: true,
              lastSync: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          this.db = parsed;
          return this.db;
        }
      }
    } catch (err) {
      console.warn("[ServerStore] Failed to read database file, initializing defaults:", err);
    }
    this.db = this.getDefaultData();
    this.saveToDisk();
    return this.db;
  }
  saveToDisk() {
    if (!this.db || this.isSaving) return;
    this.isSaving = true;
    try {
      this.db.lastModified = (/* @__PURE__ */ new Date()).toISOString();
      const raw = JSON.stringify(this.db, null, 2);
      fs.writeFileSync(this.dbPath, raw, "utf-8");
    } catch (err) {
      console.warn("[ServerStore] Error writing database to disk:", err);
    } finally {
      this.isSaving = false;
    }
  }
  // --- HELPER: SAFE GAS RESPONSE PARSING ---
  async parseGasResponse(res) {
    const rawText = await res.text();
    let json = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = null;
    }
    if (rawText.includes("accounts.google.com") || rawText.trim().startsWith("<")) {
      return {
        ok: false,
        json: null,
        message: "Google Apps Script mengembalikan halaman login Google. Pastikan saat Deploy Web App: Execute as = Me, Who has access = Anyone (Siapa saja)."
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        json,
        message: json?.message || `Google Apps Script merespon dengan status HTTP ${res.status}`
      };
    }
    if (json && json.status === "error") {
      return {
        ok: false,
        json,
        message: json.message || "Terjadi error di dalam script Google Apps Script"
      };
    }
    if (json && json.status === "success") {
      return {
        ok: true,
        json,
        message: json.message || "Berhasil sinkronisasi ke Google Spreadsheet"
      };
    }
    return {
      ok: res.ok && Boolean(json),
      json,
      message: json?.message || "Respon Google Apps Script tidak berformat JSON valid."
    };
  }
  resolveAndCacheScriptUrl(overrideScriptUrl) {
    const data = this.load();
    const candidate = (overrideScriptUrl || "").trim();
    if (candidate && candidate.startsWith("http")) {
      if (data.config.googleSheet.scriptUrl !== candidate || !data.config.googleSheet.connected) {
        data.config.googleSheet = {
          ...data.config.googleSheet,
          scriptUrl: candidate,
          connected: true
        };
        this.saveToDisk();
      }
      return candidate;
    }
    const existing = (data.config.googleSheet?.scriptUrl || "").trim();
    if (existing && existing.startsWith("http")) {
      return existing;
    }
    const envUrl = (process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL || "").trim();
    if (envUrl && envUrl.startsWith("http")) {
      data.config.googleSheet.scriptUrl = envUrl;
      data.config.googleSheet.connected = true;
      this.saveToDisk();
      return envUrl;
    }
    return "";
  }
  // --- HELPER: FETCH WITH TIMEOUT (PREVENT VERCEL 10s 504 TIMEOUTS) ---
  async fetchWithTimeout(url, options = {}, timeoutMs = 8500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }
  getDiagnostics() {
    const envUrl = (process.env.VITE_GOOGLE_APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL || "").trim();
    const data = this.load();
    const cfgUrl = (data.config.googleSheet?.scriptUrl || "").trim();
    return {
      isVercel: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
      hasEnvScriptUrl: Boolean(envUrl && envUrl.startsWith("http")),
      serverHasScriptUrl: Boolean(cfgUrl && cfgUrl.startsWith("http") || envUrl && envUrl.startsWith("http"))
    };
  }
  async hydrateFromGasIfCold(overrideScriptUrl) {
    const now = Date.now();
    if (this.lastHydratedAt > 0 && now - this.lastHydratedAt < 15e3) return;
    if (this.hydratePromise) return this.hydratePromise;
    const targetUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    if (!targetUrl) return;
    this.hydratePromise = (async () => {
      try {
        await Promise.all([
          this.pullStudentsFromGAS(targetUrl).catch(() => {
          }),
          this.pullAttendanceFromGAS(targetUrl).catch(() => {
          })
        ]);
        this.lastHydratedAt = Date.now();
      } finally {
        this.hydratePromise = null;
      }
    })();
    return this.hydratePromise;
  }
  // --- ATTENDANCE METHODS ---
  getAttendance(filterNis) {
    const data = this.load();
    if (filterNis) {
      const target = filterNis.trim().toLowerCase();
      return data.attendance.filter((r) => String(r.nis || "").trim().toLowerCase() === target);
    }
    return data.attendance;
  }
  async saveAttendanceRecord(record, overrideScriptUrl) {
    const data = this.load();
    const normNis = String(record.nis || "").trim().toLowerCase();
    const existingIdx = data.attendance.findIndex(
      (r) => r.id === record.id || r.tanggal === record.tanggal && String(r.nis || "").trim().toLowerCase() === normNis
    );
    let finalRecord = { ...record };
    if (existingIdx >= 0) {
      finalRecord = {
        ...data.attendance[existingIdx],
        ...record,
        fotoBukti: record.fotoBukti || data.attendance[existingIdx].fotoBukti,
        fotoPulang: record.fotoPulang || data.attendance[existingIdx].fotoPulang
      };
      data.attendance[existingIdx] = finalRecord;
    } else {
      data.attendance.unshift(finalRecord);
    }
    this.saveToDisk();
    let sheetSynced = false;
    let sheetError;
    let timedOut = false;
    const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    if (scriptUrl) {
      try {
        const action = finalRecord.jamPulang && finalRecord.jamPulang !== "-" ? "CHECK_OUT" : "CHECK_IN";
        const res = await this.forwardAttendanceToGAS(scriptUrl, action, finalRecord);
        if (res.success) {
          sheetSynced = true;
          finalRecord.syncStatus = "synced";
          finalRecord.syncedAt = (/* @__PURE__ */ new Date()).toISOString();
          this.saveToDisk();
        } else {
          sheetError = res.message;
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          timedOut = true;
          sheetError = "Google Apps Script lambat (>6.5 detik), browser akan melanjutkan verifikasi otomatis.";
        } else {
          sheetError = err.message || "Gagal forward ke Spreadsheet";
        }
      }
    }
    return { record: finalRecord, sheetSynced, sheetError, timedOut };
  }
  deleteAttendanceRecord(id) {
    const data = this.load();
    const prevCount = data.attendance.length;
    data.attendance = data.attendance.filter((r) => r.id !== id);
    if (data.attendance.length !== prevCount) {
      this.saveToDisk();
      return true;
    }
    return false;
  }
  resetAttendance(mode = "all") {
    const data = this.load();
    let deletedAttendance = 0;
    let deletedStudents = 0;
    if (mode === "all" || mode === "attendance") {
      deletedAttendance = data.attendance.length;
      data.attendance = [];
    }
    if (mode === "all" || mode === "students") {
      const admins = data.users.filter((u) => u.role === "admin" || u.username.toLowerCase() === "admin123");
      deletedStudents = data.users.length - admins.length;
      data.users = admins;
    }
    this.saveToDisk();
    return { deletedAttendance, deletedStudents };
  }
  // --- USERS / STUDENTS METHODS ---
  getUsers() {
    const data = this.load();
    return data.users;
  }
  getStudents() {
    const data = this.load();
    return data.users.filter((u) => u.role === "siswa");
  }
  async saveUser(user, overrideScriptUrl) {
    const data = this.load();
    const existingIdx = data.users.findIndex(
      (u) => u.id === user.id || u.nis && user.nis && u.nis.toLowerCase() === user.nis.toLowerCase() || u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase()
    );
    let savedUser = { ...user };
    if (existingIdx >= 0) {
      const existingPass = data.users[existingIdx].password;
      const incomingPass = user.password;
      const finalPass = incomingPass && incomingPass !== "siswa123" ? incomingPass : existingPass || incomingPass || "siswa123";
      savedUser = {
        ...data.users[existingIdx],
        ...user,
        password: finalPass
      };
      data.users[existingIdx] = savedUser;
    } else {
      data.users.push(savedUser);
    }
    this.saveToDisk();
    let sheetSynced = false;
    let sheetError;
    const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    if (user.role === "siswa" && scriptUrl) {
      try {
        const res = await this.forwardStudentToGAS(scriptUrl, savedUser);
        sheetSynced = res.success;
        if (!res.success) {
          sheetError = res.message;
        }
      } catch (e) {
        sheetError = e?.message || "Gagal forward data siswa ke Google Spreadsheet";
        console.warn("[ServerStore] Student GAS forward failed:", e);
      }
    }
    return { user: savedUser, sheetSynced, sheetError };
  }
  async saveUsersBulk(users, overrideScriptUrl) {
    const data = this.load();
    let addedCount = 0;
    let updatedCount = 0;
    let sheetSyncedCount = 0;
    const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
    for (const nu of users) {
      const existingIdx = data.users.findIndex(
        (u) => u.nis && nu.nis && u.nis.toLowerCase() === nu.nis.toLowerCase() || u.username && nu.username && u.username.toLowerCase() === nu.username.toLowerCase()
      );
      let savedUser = { ...nu };
      if (existingIdx >= 0) {
        const existingPass = data.users[existingIdx].password;
        const incomingPass = nu.password;
        const finalPass = existingPass && existingPass !== "siswa123" ? existingPass : incomingPass || "siswa123";
        savedUser = {
          ...data.users[existingIdx],
          ...nu,
          password: finalPass,
          id: data.users[existingIdx].id
        };
        data.users[existingIdx] = savedUser;
        updatedCount++;
      } else {
        data.users.push(savedUser);
        addedCount++;
      }
      if (savedUser.role === "siswa" && scriptUrl) {
        try {
          const res = await this.forwardStudentToGAS(scriptUrl, savedUser);
          if (res.success) sheetSyncedCount++;
        } catch (err) {
          console.warn("[ServerStore] Bulk GAS forward warning:", err);
        }
      }
    }
    this.saveToDisk();
    return { addedCount, updatedCount, sheetSyncedCount };
  }
  async deleteUser(id, overrideScriptUrl) {
    const data = this.load();
    const target = data.users.find((u) => u.id === id);
    const prevLen = data.users.length;
    data.users = data.users.filter((u) => u.id !== id);
    if (data.users.length !== prevLen) {
      this.saveToDisk();
      const scriptUrl = this.resolveAndCacheScriptUrl(overrideScriptUrl);
      if (target && target.role === "siswa" && scriptUrl) {
        try {
          await this.deleteStudentFromGAS(scriptUrl, target.nis, target.username);
        } catch (err) {
          console.warn("[ServerStore] Delete student GAS warning:", err);
        }
      }
      return true;
    }
    return false;
  }
  // --- CONFIG METHODS ---
  getConfig() {
    const data = this.load();
    return data.config;
  }
  saveConfig(partialConfig) {
    const data = this.load();
    if (partialConfig.googleSheet) {
      const nextUrl = (partialConfig.googleSheet.scriptUrl ?? data.config.googleSheet.scriptUrl ?? "").trim();
      data.config.googleSheet = {
        ...data.config.googleSheet,
        ...partialConfig.googleSheet,
        scriptUrl: nextUrl,
        connected: Boolean(nextUrl && nextUrl.startsWith("http"))
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
  async testGASConnection(url) {
    const targetUrl = (url || "").trim();
    if (!targetUrl || !targetUrl.startsWith("https://script.google.com")) {
      return { success: false, message: "URL harus berformat Web App Google Apps Script (https://script.google.com/...)" };
    }
    try {
      const testUrl = targetUrl.includes("?") ? `${targetUrl}&action=TEST&_t=${Date.now()}` : `${targetUrl}?action=TEST&_t=${Date.now()}`;
      const res = await this.fetchWithTimeout(testUrl, { redirect: "follow" }, 7500);
      const parsed = await this.parseGasResponse(res);
      if (parsed.ok) {
        return { success: true, message: parsed.message || "Koneksi ke Google Apps Script Web App berhasil terverifikasi!" };
      }
      const postRes = await this.fetchWithTimeout(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "TEST" }),
        redirect: "follow"
      }, 7500);
      const postParsed = await this.parseGasResponse(postRes);
      if (postParsed.ok) {
        return { success: true, message: postParsed.message || "Koneksi ke Google Apps Script Web App berhasil terverifikasi!" };
      }
      return { success: false, message: postParsed.message || parsed.message };
    } catch (err) {
      return { success: false, message: "Gagal terhubung ke Google Apps Script: " + (err?.message || "Jaringan error") };
    }
  }
  async forwardAttendanceToGAS(scriptUrl, action, record) {
    const payload = {
      action,
      id: record.id,
      tanggal: record.tanggal,
      nis: record.nis,
      namaSiswa: record.namaSiswa,
      kelas: record.kelas || "XII TKR 1",
      namaPembimbing: record.namaPembimbing || "-",
      asalSekolah: record.asalSekolah || "SMKN 1 Tegalsari",
      jurusan: record.jurusan || "Teknik Kendaraan Ringan (TKR)",
      tempatPkl: record.tempatPkl || "-",
      jamDatang: record.jamDatang || "-",
      jamPulang: record.jamPulang || "-",
      status: record.status || "Hadir",
      statusDatang: record.statusDatang || record.status || "Hadir",
      statusPulang: record.statusPulang || (record.jamPulang && record.jamPulang !== "-" ? "Sudah Pulang" : "Belum Pulang"),
      keterangan: record.keterangan || "-",
      koordinatGps: record.koordinatGps || "-",
      mapsUrl: record.mapsUrl || "-",
      koordinatPulang: record.koordinatPulang || "-",
      mapsUrlPulang: record.mapsUrlPulang || "-"
    };
    const res = await this.fetchWithTimeout(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    }, 6500);
    const parsed = await this.parseGasResponse(res);
    return { success: parsed.ok, message: parsed.message };
  }
  async forwardStudentToGAS(scriptUrl, student) {
    const payload = {
      action: "REGISTER_STUDENT",
      nis: student.nis,
      username: student.username || student.nis,
      nama: student.nama,
      kelas: student.kelas || "XII TKR 1",
      jenisKelamin: student.jenisKelamin,
      asalSekolah: student.asalSekolah,
      jurusan: student.jurusan,
      noHp: student.noHp || "-",
      tempatPkl: student.tempatPkl || "-",
      namaPembimbing: student.namaPembimbing || "-",
      tahunAjaran: student.tahunAjaran || "2025/2026",
      password: student.password || "siswa123"
    };
    const res = await this.fetchWithTimeout(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    }, 6500);
    const parsed = await this.parseGasResponse(res);
    return { success: parsed.ok, message: parsed.message };
  }
  async deleteStudentFromGAS(scriptUrl, nis, username) {
    const res = await this.fetchWithTimeout(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "DELETE_STUDENT", nis, username }),
      redirect: "follow"
    }, 7500);
    const parsed = await this.parseGasResponse(res);
    return { success: parsed.ok, message: parsed.message };
  }
  async pullStudentsFromGAS(customUrl) {
    const data = this.load();
    const targetUrl = this.resolveAndCacheScriptUrl(customUrl);
    if (!targetUrl) {
      return { success: false, count: 0, data: this.getStudents(), message: "URL Google Apps Script belum disetel" };
    }
    const fetchUrl = targetUrl.includes("?") ? `${targetUrl}&action=GET_STUDENTS&_t=${Date.now()}` : `${targetUrl}?action=GET_STUDENTS&_t=${Date.now()}`;
    const res = await this.fetchWithTimeout(fetchUrl, { redirect: "follow" }, 6500);
    const parsed = await this.parseGasResponse(res);
    if (!parsed.ok) {
      return { success: false, count: 0, data: this.getStudents(), message: parsed.message };
    }
    const json = parsed.json;
    if (json && json.status === "success" && Array.isArray(json.data)) {
      let updated = 0;
      const defaultTahun = data.config.tahunAjaran?.tahunAktif || "2025/2026";
      json.data.forEach((st) => {
        const cleanNis = String(st.nis || "").trim();
        const cleanNama = String(st.nama || "").trim();
        if (!cleanNis || !cleanNama) return;
        const cleanUsername = String(st.username || cleanNis).trim().toLowerCase().replace(/\s+/g, "");
        const existingIdx = data.users.findIndex(
          (u) => u.role === "siswa" && (u.nis && u.nis.toLowerCase() === cleanNis.toLowerCase() || u.username && u.username.toLowerCase() === cleanUsername)
        );
        const incomingPass = st.password ? String(st.password).trim() : "";
        const existingPass = existingIdx >= 0 ? data.users[existingIdx].password : "";
        const finalPass = incomingPass && incomingPass !== "siswa123" ? incomingPass : existingPass && existingPass !== "siswa123" ? existingPass : incomingPass || "siswa123";
        const studentObj = {
          id: existingIdx >= 0 ? data.users[existingIdx].id : `USR-SISWA-${cleanNis}`,
          username: cleanUsername,
          password: finalPass,
          role: "siswa",
          nama: cleanNama,
          nis: cleanNis,
          kelas: st.kelas || (existingIdx >= 0 ? data.users[existingIdx].kelas : "XII TKR 1"),
          jenisKelamin: st.jenisKelamin === "Perempuan" ? "Perempuan" : "Laki-laki",
          asalSekolah: st.asalSekolah || "SMKN 1 Tegalsari",
          jurusan: st.jurusan || "Teknik Kendaraan Ringan (TKR)",
          noHp: st.noHp || "-",
          tempatPkl: st.tempatPkl || "-",
          namaPembimbing: st.namaPembimbing || "-",
          tahunAjaran: st.tahunAjaran || (existingIdx >= 0 ? data.users[existingIdx].tahunAjaran : void 0) || defaultTahun,
          createdAt: st.createdAt || (existingIdx >= 0 ? data.users[existingIdx].createdAt : void 0) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
        };
        if (existingIdx >= 0) {
          data.users[existingIdx] = studentObj;
        } else {
          data.users.push(studentObj);
        }
        updated++;
      });
      data.config.googleSheet.lastSync = (/* @__PURE__ */ new Date()).toISOString();
      data.config.googleSheet.connected = true;
      this.saveToDisk();
      const students = this.getStudents();
      return {
        success: true,
        count: updated,
        data: students,
        message: `Berhasil sinkron ${updated} data siswa TKR dari Google Spreadsheet (Total: ${students.length} siswa).`
      };
    }
    return { success: false, count: 0, data: this.getStudents(), message: json?.message || "Format data siswa GAS tidak dikenali" };
  }
  async pullAttendanceFromGAS(customUrl, filterNis) {
    const data = this.load();
    const targetUrl = this.resolveAndCacheScriptUrl(customUrl);
    if (!targetUrl) {
      return { success: false, count: 0, message: "URL Google Apps Script belum disetel" };
    }
    const nisParam = filterNis ? `&nis=${encodeURIComponent(filterNis.trim())}` : "";
    const fetchUrl = targetUrl.includes("?") ? `${targetUrl}&action=GET_ALL${nisParam}&_t=${Date.now()}` : `${targetUrl}?action=GET_ALL${nisParam}&_t=${Date.now()}`;
    const res = await this.fetchWithTimeout(fetchUrl, { redirect: "follow" }, 6500);
    const parsed = await this.parseGasResponse(res);
    if (!parsed.ok) {
      return { success: false, count: 0, message: parsed.message };
    }
    const json = parsed.json;
    if (json && json.status === "success" && Array.isArray(json.data)) {
      let updated = 0;
      json.data.forEach((item) => {
        if (!item.tanggal || !item.nis) return;
        const itemNis = String(item.nis).trim();
        const id = item.id || `ABS-${String(item.tanggal).replace(/-/g, "")}-${itemNis}`;
        const existingIdx = data.attendance.findIndex(
          (r) => r.id === id || r.tanggal === item.tanggal && String(r.nis).trim().toLowerCase() === itemNis.toLowerCase()
        );
        const record = {
          id,
          tanggal: item.tanggal,
          nis: itemNis,
          namaSiswa: item.namaSiswa || "Siswa PKL",
          kelas: item.kelas || "XII TKR 1",
          namaPembimbing: item.namaPembimbing || "-",
          asalSekolah: item.asalSekolah || "SMKN 1 Tegalsari",
          jurusan: item.jurusan || "Teknik Kendaraan Ringan (TKR)",
          jamDatang: item.jamDatang || "-",
          jamPulang: item.jamPulang || "-",
          status: item.status || "Hadir",
          keterangan: item.keterangan || "-",
          tempatPkl: item.tempatPkl || "-",
          koordinatGps: item.koordinatGps || "-",
          mapsUrl: item.mapsUrl || "-",
          koordinatPulang: item.koordinatPulang || "-",
          mapsUrlPulang: item.mapsUrlPulang || "-",
          syncStatus: "synced",
          syncedAt: item.syncedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
        if (existingIdx >= 0) {
          data.attendance[existingIdx] = {
            ...record,
            fotoBukti: data.attendance[existingIdx].fotoBukti || record.fotoBukti,
            fotoPulang: data.attendance[existingIdx].fotoPulang || record.fotoPulang
          };
        } else {
          data.attendance.unshift(record);
        }
        updated++;
      });
      data.config.googleSheet.lastSync = (/* @__PURE__ */ new Date()).toISOString();
      data.config.googleSheet.connected = true;
      this.saveToDisk();
      const returnData = filterNis ? this.getAttendance(filterNis) : data.attendance;
      return {
        success: true,
        count: updated,
        data: returnData,
        message: `Berhasil sinkron ${updated} data presensi dari Google Spreadsheet. Total: ${returnData.length}.`
      };
    }
    return { success: false, count: 0, message: json?.message || "Format data GAS tidak dikenali" };
  }
};
var serverStore = new ServerStore();

// src/server/app.ts
var app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Gas-Url, x-gas-url");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  if (req.url && !req.url.startsWith("/api") && req.url !== "/") {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});
app.get("/api", (req, res) => {
  const diag = serverStore.getDiagnostics();
  res.json({
    status: "ok",
    app: "HADIRKU PKL TKR Server API",
    time: (/* @__PURE__ */ new Date()).toISOString(),
    totalAttendance: serverStore.getAttendance().length,
    totalStudents: serverStore.getStudents().length,
    ...diag
  });
});
app.get("/api/health", (req, res) => {
  const diag = serverStore.getDiagnostics();
  res.json({
    status: "ok",
    app: "HADIRKU PKL TKR Server API",
    time: (/* @__PURE__ */ new Date()).toISOString(),
    totalAttendance: serverStore.getAttendance().length,
    totalStudents: serverStore.getStudents().length,
    ...diag
  });
});
app.get("/api/config", (req, res) => {
  const headerGas = req.headers["x-gas-url"] || (typeof req.query.gas === "string" ? req.query.gas : void 0);
  if (headerGas && headerGas.trim().startsWith("http")) {
    serverStore.saveConfig({ googleSheet: { scriptUrl: headerGas.trim(), sheetName: "Data_Absensi_PKL", connected: true, autoSync: true } });
  }
  res.json({
    status: "success",
    data: serverStore.getConfig(),
    meta: serverStore.getDiagnostics()
  });
});
app.post("/api/config", (req, res) => {
  try {
    const updated = serverStore.saveConfig(req.body);
    res.json({ status: "success", message: "Konfigurasi server berhasil diperbarui", data: updated, meta: serverStore.getDiagnostics() });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message || "Gagal menyimpan konfigurasi" });
  }
});
app.get("/api/attendance", async (req, res) => {
  const nis = typeof req.query.nis === "string" ? req.query.nis : void 0;
  const overrideGas = req.headers["x-gas-url"] || (typeof req.query.scriptUrl === "string" ? req.query.scriptUrl : void 0);
  await serverStore.hydrateFromGasIfCold(overrideGas);
  const records = serverStore.getAttendance(nis);
  res.json({ status: "success", total: records.length, data: records });
});
app.post("/api/attendance", async (req, res) => {
  try {
    const { scriptUrl: bodyScriptUrl, ...record } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || req.headers["x-gas-url"];
    if (!record || !record.tanggal || !record.nis) {
      return res.status(400).json({ status: "error", message: "Data tanggal dan NIS siswa wajib diisi" });
    }
    const result = await serverStore.saveAttendanceRecord(record, overrideScriptUrl);
    res.json({
      status: "success",
      serverSaved: true,
      message: result.sheetSynced ? "Presensi berhasil dicatat di Server Aplikasi & tersinkronisasi ke Google Spreadsheet!" : "Presensi berhasil dicatat di Server Aplikasi!",
      sheetSynced: result.sheetSynced,
      sheetError: result.sheetError,
      timedOut: result.timedOut,
      data: result.record
    });
  } catch (err) {
    console.error("Error in POST /api/attendance:", err);
    res.status(500).json({ status: "error", message: err.message || "Gagal mencatat presensi di server" });
  }
});
app.put("/api/attendance/:id", async (req, res) => {
  try {
    const { scriptUrl: bodyScriptUrl, ...rest } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || req.headers["x-gas-url"];
    const record = { ...rest, id: req.params.id };
    const result = await serverStore.saveAttendanceRecord(record, overrideScriptUrl);
    res.json({
      status: "success",
      message: "Presensi berhasil diperbarui di server",
      sheetSynced: result.sheetSynced,
      sheetError: result.sheetError,
      data: result.record
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.delete("/api/attendance/:id", (req, res) => {
  try {
    const deleted = serverStore.deleteAttendanceRecord(req.params.id);
    if (deleted) {
      res.json({ status: "success", message: "Data presensi berhasil dihapus dari server" });
    } else {
      res.status(404).json({ status: "error", message: "Data presensi tidak ditemukan" });
    }
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.post("/api/attendance/pull", async (req, res) => {
  try {
    const { url, nis } = req.body || {};
    const result = await serverStore.pullAttendanceFromGAS(url, nis);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message || "Gagal sinkron dari Google Spreadsheet" });
  }
});
app.post("/api/attendance/reset", (req, res) => {
  try {
    const { mode } = req.body || { mode: "all" };
    const result = serverStore.resetAttendance(mode);
    res.json({ status: "success", message: "Reset data berhasil", ...result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.post("/api/gas/test", async (req, res) => {
  try {
    const { url } = req.body || {};
    const result = await serverStore.testGASConnection(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal menguji koneksi GAS" });
  }
});
app.get("/api/students", async (req, res) => {
  const overrideGas = req.headers["x-gas-url"] || (typeof req.query.scriptUrl === "string" ? req.query.scriptUrl : void 0);
  await serverStore.hydrateFromGasIfCold(overrideGas);
  const students = serverStore.getStudents();
  res.json({ status: "success", total: students.length, data: students });
});
app.post("/api/students", async (req, res) => {
  try {
    const { scriptUrl: bodyScriptUrl, ...student } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || req.headers["x-gas-url"];
    if (!student || !student.nis || !student.nama) {
      return res.status(400).json({ status: "error", message: "NIS dan nama siswa wajib diisi" });
    }
    const result = await serverStore.saveUser(student, overrideScriptUrl);
    res.json({
      status: "success",
      message: result.sheetSynced ? "Siswa berhasil didaftarkan di Server & Google Spreadsheet!" : "Siswa berhasil didaftarkan di server aplikasi",
      sheetSynced: result.sheetSynced,
      sheetError: result.sheetError,
      data: result.user
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.post("/api/students/bulk", async (req, res) => {
  try {
    const { students, scriptUrl: bodyScriptUrl } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || req.headers["x-gas-url"];
    if (!Array.isArray(students)) {
      return res.status(400).json({ status: "error", message: "Data students harus berupa array" });
    }
    const result = await serverStore.saveUsersBulk(students, overrideScriptUrl);
    res.json({
      status: "success",
      ...result,
      data: serverStore.getStudents()
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.post("/api/students/pull", async (req, res) => {
  try {
    const { url } = req.body || {};
    const result = await serverStore.pullStudentsFromGAS(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, count: 0, data: [], message: err.message || "Gagal sinkron data siswa dari Google Spreadsheet" });
  }
});
app.delete("/api/students/:id", async (req, res) => {
  try {
    const overrideScriptUrl = req.query.scriptUrl || req.body?.scriptUrl || req.headers["x-gas-url"];
    const deleted = await serverStore.deleteUser(req.params.id, overrideScriptUrl);
    if (deleted) {
      res.json({ status: "success", message: "Siswa berhasil dihapus dari server" });
    } else {
      res.status(404).json({ status: "error", message: "Siswa tidak ditemukan" });
    }
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.get("/api/users", (req, res) => {
  const users = serverStore.getUsers();
  res.json({ status: "success", total: users.length, data: users });
});
var app_default = app;
export {
  app_default as default
};
