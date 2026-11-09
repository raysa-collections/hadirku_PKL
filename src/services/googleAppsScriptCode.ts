/**
 * =========================================================================
 * GOOGLE APPS SCRIPT SOURCE CODE & WEB APP TEMPLATES
 * SISTEM INFORMASI ABSENSI SISWA PKL - SMKN 1 TEGALSARI (TKR)
 * =========================================================================
 */

export const CODE_GS_SOURCE = `/**
 * =========================================================================
 * CODE.GS - GOOGLE APPS SCRIPT API & DATABASE AUTO-SETUP
 * Aplikasi Absensi Siswa PKL SMKN 1 Tegalsari (Teknik Kendaraan Ringan)
 * =========================================================================
 * Zona Waktu: Asia/Jakarta (WIB)
 * 
 * Fungsi Utama:
 * 1. setupDatabase() - Membuat sheet 'Data_Absensi_PKL', 'Data_Siswa_TKR', 
 *    dan 'Konfigurasi_Sistem' secara otomatis dengan header berwarna & rapi.
 * 2. doPost(e) - Menerima presensi Datang & Pulang, update GPS & foto lokasi.
 * 3. doGet(e) - Menyajikan data presensi & siswa ke aplikasi web / HTML UI.
 * =========================================================================
 */

const SHEET_ABSENSI = "Data_Absensi_PKL";
const SHEET_SISWA = "Data_Siswa_TKR";
const SHEET_CONFIG = "Konfigurasi_Sistem";
const TIMEZONE = "Asia/Jakarta";

/**
 * MENGELOLA SETUP DATABASE SPREADSHEET OTOMATIS
 * Jalankan fungsi ini satu kali di editor Google Apps Script!
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. SETUP SHEET DATA ABSENSI
  let sheetAbsensi = ss.getSheetByName(SHEET_ABSENSI);
  if (!sheetAbsensi) {
    sheetAbsensi = ss.insertSheet(SHEET_ABSENSI);
  }
  
  const headersAbsensi = [
    "ID Absensi",
    "Tanggal (WIB)",
    "NIS / NISN",
    "Nama Lengkap Siswa",
    "Kelas",
    "Guru Pembimbing Sekolah",
    "Asal Sekolah",
    "Jurusan",
    "Tempat PKL / Bengkel",
    "Jam Datang",
    "Jam Pulang",
    "Status Kehadiran",
    "Keterangan / Aktivitas",
    "Titik GPS Datang",
    "Link Map Google",
    "Titik GPS Pulang",
    "Link Map Pulang",
    "Waktu Sinkronisasi"
  ];
  
  if (sheetAbsensi.getLastRow() === 0) {
    sheetAbsensi.appendRow(headersAbsensi);
    const headerRange = sheetAbsensi.getRange(1, 1, 1, headersAbsensi.length);
    headerRange.setBackground("#1e3a8a"); // Navy Blue
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheetAbsensi.setRowHeight(1, 35);
    sheetAbsensi.setFrozenRows(1);
    sheetAbsensi.autoResizeColumns(1, headersAbsensi.length);
  }
  
  // 2. SETUP SHEET DATA SISWA
  let sheetSiswa = ss.getSheetByName(SHEET_SISWA);
  if (!sheetSiswa) {
    sheetSiswa = ss.insertSheet(SHEET_SISWA);
  }
  
  const headersSiswa = [
    "NIS",
    "Username Login",
    "Nama Lengkap Siswa",
    "Kelas",
    "Jenis Kelamin",
    "Asal Sekolah",
    "Jurusan",
    "No. WhatsApp / HP",
    "Tempat PKL / Bengkel",
    "Guru Pembimbing Sekolah",
    "Tanggal Dibuat"
  ];
  
  if (sheetSiswa.getLastRow() === 0) {
    sheetSiswa.appendRow(headersSiswa);
    const headerRange = sheetSiswa.getRange(1, 1, 1, headersSiswa.length);
    headerRange.setBackground("#065f46"); // Emerald Green
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheetSiswa.setRowHeight(1, 35);
    sheetSiswa.setFrozenRows(1);
    sheetSiswa.autoResizeColumns(1, headersSiswa.length);
    
    // Seed Sample Data Siswa TKR
    sheetSiswa.appendRow([
      "20240101", "ahmadrizki", "Ahmad Rizki Maulana", "XII TKR 1", "Laki-laki", "SMKN 1 Tegalsari", 
      "Teknik Kendaraan Ringan Otomotif (TKR)", "085712345678", "PT Astra International Tbk - Auto2000", 
      "Achmad Mackrus, S.T.", "2026-01-10"
    ]);
  }
  
  // 3. SETUP SHEET KONFIGURASI SISTEM
  let sheetConfig = ss.getSheetByName(SHEET_CONFIG);
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet(SHEET_CONFIG);
  }
  
  if (sheetConfig.getLastRow() === 0) {
    sheetConfig.appendRow(["Kunci Parameter", "Nilai Parameter", "Keterangan"]);
    const headerRange = sheetConfig.getRange(1, 1, 1, 3);
    headerRange.setBackground("#312e81"); // Indigo
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheetConfig.setFrozenRows(1);
    
    sheetConfig.appendRow(["NAMA_APLIKASI", "Absensi Siswa PKL TKR SMKN 1 Tegalsari", "Judul Aplikasi Web"]);
    sheetConfig.appendRow(["JAM_MASUK_MULAI", "04:00", "Batas Buka Absen Datang"]);
    sheetConfig.appendRow(["JAM_TERLAMBAT_MULAI", "09:00", "Batas Kategori Terlambat"]);
    sheetConfig.appendRow(["JAM_MASUK_SELESAI", "12:00", "Batas Tutup Absen Datang"]);
    sheetConfig.appendRow(["JAM_PULANG_MULAI", "15:00", "Batas Buka Absen Pulang"]);
    sheetConfig.appendRow(["JAM_PULANG_SELESAI", "23:59", "Batas Tutup Absen Pulang"]);
  }

  // Hapus Sheet Default 'Sheet1' jika ada sheet lain
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch(e) {}
  }
  
  Logger.log("SUCCESS: Database Google Spreadsheet Absensi PKL berhasil dikonfigurasi secara otomatis!");
  return "Database Google Spreadsheet Absensi PKL berhasil disiapkan!";
}

/**
 * SERVING STANDALONE WEB APP HTML
 */
function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : "";
  
  // Jika dipanggil via API JSON
  if (action === "GET_ALL" || action === "GET_ATTENDANCE") {
    return handleGetAttendance();
  }
  if (action === "GET_STUDENTS") {
    return handleGetStudents();
  }
  
  // Serve tampilan HTML standalone index.html jika diakses via browser
  try {
    return HtmlService.createTemplateFromFile("index")
      .evaluate()
      .setTitle("Absensi Siswa PKL - SMKN 1 Tegalsari")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    // Fallback JSON jika file index.html belum dibuat
    return handleGetAttendance();
  }
}

/**
 * API POST: MENERIMA RECORD ABSENSI & REGISTRASI SISWA DARI APLIKASI WEB
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    let data;
    
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      throw new Error("Tidak ada data payload yang dikirimkan.");
    }
    
    const action = data.action; // 'REGISTER_STUDENT', 'CHECK_IN', 'CHECK_OUT', 'TEST'
    
    if (action === "TEST") {
      return createJsonResponse({
        status: "success",
        message: "Koneksi Google Apps Script Web App Aktif & Terhubung Sempurna!",
        timestamp: new Date().toISOString()
      });
    }

    // --- PROSES REGISTRASI SISWA PKL ---
    if (action === "REGISTER_STUDENT" || action === "SYNC_STUDENT") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheetSiswa = ss.getSheetByName(SHEET_SISWA);
      if (!sheetSiswa) {
        setupDatabase();
        sheetSiswa = ss.getSheetByName(SHEET_SISWA);
      }
      
      const nisReg = String(data.nis || "").trim();
      const usernameReg = String(data.username || nisReg).trim();
      const namaReg = data.nama || data.namaSiswa || "-";
      const kelasReg = data.kelas || "XII TKR 1";
      const genderReg = data.jenisKelamin || "Laki-laki";
      const sekolahReg = data.asalSekolah || "SMKN 1 Tegalsari";
      const jurusanReg = data.jurusan || "Teknik Kendaraan Ringan Otomotif (TKR)";
      const hpReg = String(data.noHp || "-");
      const pklReg = data.tempatPkl || "-";
      const pembimbingReg = data.namaPembimbing || "-";
      const nowReg = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

      const lastRowSiswa = sheetSiswa.getLastRow();
      let existingSiswaRow = -1;

      if (lastRowSiswa > 1) {
        const nisValues = sheetSiswa.getRange(2, 1, lastRowSiswa - 1, 1).getValues();
        for (let i = 0; i < nisValues.length; i++) {
          if (String(nisValues[i][0]).trim().toLowerCase() === nisReg.toLowerCase()) {
            existingSiswaRow = i + 2;
            break;
          }
        }
      }

      if (existingSiswaRow !== -1) {
        // Update baris siswa yang sudah ada
        sheetSiswa.getRange(existingSiswaRow, 1, 1, 10).setValues([[
          nisReg, usernameReg, namaReg, kelasReg, genderReg, sekolahReg, jurusanReg, hpReg, pklReg, pembimbingReg
        ]]);
        return createJsonResponse({
          status: "success",
          message: "Data registrasi siswa berhasil diperbarui di Google Spreadsheet!",
          nis: nisReg,
          nama: namaReg
        });
      } else {
        // Append baris siswa baru
        sheetSiswa.appendRow([
          nisReg, usernameReg, namaReg, kelasReg, genderReg, sekolahReg, jurusanReg, hpReg, pklReg, pembimbingReg, nowReg
        ]);
        return createJsonResponse({
          status: "success",
          message: "Registrasi siswa baru berhasil tersimpan ke Google Spreadsheet!",
          nis: nisReg,
          nama: namaReg
        });
      }
    }
    
    // --- PROSES ABSENSI DATANG / PULANG / KOREKSI ---
    const sheet = setupSheetAbsensi();
    const id = data.id || "ABS-" + Utilities.formatDate(new Date(), TIMEZONE, "yyyyMMdd-HHmmss");
    const tanggal = data.tanggal || Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
    const nis = String(data.nis || "").trim();
    const namaSiswa = data.namaSiswa || "-";
    const kelas = data.kelas || "XII TKR 1";
    const namaPembimbing = data.namaPembimbing || "-";
    const asalSekolah = data.asalSekolah || "SMKN 1 Tegalsari";
    const jurusan = data.jurusan || "Teknik Kendaraan Ringan (TKR)";
    const tempatPkl = data.tempatPkl || "-";
    const jamDatang = data.jamDatang || "-";
    const jamPulang = data.jamPulang || "-";
    const status = data.status || "Hadir";
    const keterangan = data.keterangan || "-";
    const koordinatGps = data.koordinatGps || "-";
    const mapsUrl = data.mapsUrl || "-";
    const koordinatPulang = data.koordinatPulang || "-";
    const mapsUrlPulang = data.mapsUrlPulang || "-";
    const nowWib = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss") + " WIB";
    
    const lastRow = sheet.getLastRow();
    let existingRowIndex = -1;
    
    if (lastRow > 1) {
      const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
      for (let i = 0; i < rows.length; i++) {
        const rowDate = Utilities.formatDate(new Date(rows[i][1]), TIMEZONE, "yyyy-MM-dd");
        const rowNis = String(rows[i][2]).trim();
        if (rowDate === tanggal && rowNis === nis) {
          existingRowIndex = i + 2;
          break;
        }
      }
    }
    
    if (existingRowIndex !== -1) {
      // PERBARUI BARIS ABSENSI YANG SUDAH ADA (PENYESUAIAN 18 KOLOM PRESISI)
      const current = sheet.getRange(existingRowIndex, 1, 1, 18).getValues()[0];
      
      const mergedJamDatang = (jamDatang && jamDatang !== "-") ? jamDatang : (current[9] || "-");
      const mergedJamPulang = (jamPulang && jamPulang !== "-") ? jamPulang : (current[10] || "-");
      const mergedKet = (keterangan && keterangan !== "-") ? keterangan : (current[12] || "-");
      const mergedGpsDatang = (koordinatGps && koordinatGps !== "-") ? koordinatGps : (current[13] || "-");
      const mergedMapDatang = (mapsUrl && mapsUrl !== "-") ? mapsUrl : (current[14] || "-");
      const mergedGpsPulang = (koordinatPulang && koordinatPulang !== "-") ? koordinatPulang : (current[15] || "-");
      const mergedMapPulang = (mapsUrlPulang && mapsUrlPulang !== "-") ? mapsUrlPulang : (current[16] || "-");

      sheet.getRange(existingRowIndex, 1, 1, 18).setValues([[
        id || current[0],
        tanggal || current[1],
        nis || current[2],
        namaSiswa || current[3],
        kelas || current[4],
        namaPembimbing || current[5],
        asalSekolah || current[6],
        jurusan || current[7],
        tempatPkl || current[8],
        mergedJamDatang,
        mergedJamPulang,
        status || current[11],
        mergedKet,
        mergedGpsDatang,
        mergedMapDatang,
        mergedGpsPulang,
        mergedMapPulang,
        nowWib
      ]]);

      return createJsonResponse({
        status: "success",
        message: "Data presensi & lokasi GPS berhasil diperbarui pada Google Spreadsheet!",
        id: id,
        rowIndex: existingRowIndex
      });
    } else {
      // TAMBAH BARIS ABSENSI BARU (18 KOLOM MATCHING HEADERS)
      sheet.appendRow([
        id,
        tanggal,
        nis,
        namaSiswa,
        kelas,
        namaPembimbing,
        asalSekolah,
        jurusan,
        tempatPkl,
        jamDatang,
        jamPulang,
        status,
        keterangan,
        koordinatGps,
        mapsUrl,
        koordinatPulang,
        mapsUrlPulang,
        nowWib
      ]);

      return createJsonResponse({
        status: "success",
        message: "Presensi baru & lokasi GPS berhasil dicatat ke Google Spreadsheet!",
        id: id
      });
    }
    
    throw new Error("Action tidak valid: " + action);
    
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function handleGetAttendance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ABSENSI) || setupSheetAbsensi();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return createJsonResponse({ status: "success", total: 0, data: [] });
  }
  
  const rows = sheet.getRange(2, 1, lastRow - 1, 18).getValues();
  const results = rows.map(r => ({
    id: r[0],
    tanggal: Utilities.formatDate(new Date(r[1]), TIMEZONE, "yyyy-MM-dd"),
    nis: String(r[2]),
    namaSiswa: r[3],
    kelas: r[4],
    namaPembimbing: r[5],
    asalSekolah: r[6],
    jurusan: r[7],
    tempatPkl: r[8],
    jamDatang: r[9],
    jamPulang: r[10],
    status: r[11],
    keterangan: r[12],
    koordinatGps: r[13],
    mapsUrl: r[14],
    koordinatPulang: r[15],
    mapsUrlPulang: r[16],
    syncedAt: r[17]
  }));
  
  return createJsonResponse({ status: "success", total: results.length, data: results });
}

function handleGetStudents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SISWA);
  if (!sheet || sheet.getLastRow() <= 1) {
    return createJsonResponse({ status: "success", total: 0, data: [] });
  }
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
  const results = rows.map(r => ({
    nis: String(r[0]),
    username: String(r[1]),
    nama: r[2],
    kelas: r[3],
    jenisKelamin: r[4],
    asalSekolah: r[5],
    jurusan: r[6],
    noHp: String(r[7]),
    tempatPkl: r[8],
    namaPembimbing: r[9]
  }));
  return createJsonResponse({ status: "success", total: results.length, data: results });
}

function setupSheetAbsensi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ABSENSI);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEET_ABSENSI);
  }
  return sheet;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const GOOGLE_APPS_SCRIPT_SOURCE = CODE_GS_SOURCE;

export const INDEX_HTML_SOURCE = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Absensi Siswa PKL TKR - SMKN 1 Tegalsari</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
  
  <!-- Header Bar -->
  <header class="bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-30">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
          ⚙️
        </div>
        <div>
          <h1 class="font-bold text-sm sm:text-base text-white">Absensi Siswa PKL TKR</h1>
          <p class="text-[11px] text-slate-400">SMK Negeri 1 Tegalsari • Synchronized Web App</p>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        ● Live Spreadsheet Sync
      </span>
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
    
    <!-- Time & Status Banner -->
    <div class="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider block">Waktu Server (WIB)</span>
        <h2 id="clockDisplay" class="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">00:00:00 WIB</h2>
        <p id="dateDisplay" class="text-xs text-slate-400 mt-1">Memuat tanggal hari ini...</p>
      </div>
      <div class="text-right">
        <span class="text-xs text-slate-400 block">Status Presensi Datang</span>
        <span id="checkInBadge" class="inline-block mt-1 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Mulai Pukul 04.00 - 12.00 WIB
        </span>
      </div>
    </div>

    <!-- Presensi Form Card -->
    <div class="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>📝</span> Form Presensi Kehadiran Siswa PKL
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label class="block text-slate-300 font-medium mb-1">Username Login Siswa *</label>
          <input type="text" id="inputUsername" placeholder="Contoh: ahmadrizki" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-500">
        </div>
        <div>
          <label class="block text-slate-300 font-medium mb-1">NIS / NISN Siswa *</label>
          <input type="text" id="inputNis" placeholder="Contoh: 20240101" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-500">
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label class="block text-slate-300 font-medium mb-1">Nama Lengkap Siswa *</label>
          <input type="text" id="inputNama" placeholder="Nama lengkap siswa" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500">
        </div>
        <div>
          <label class="block text-slate-300 font-medium mb-1">Tempat PKL / Nama Bengkel *</label>
          <input type="text" id="inputTempatPkl" placeholder="Contoh: Auto2000 Tegalsari" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500">
        </div>
      </div>

      <div class="text-xs">
        <label class="block text-slate-300 font-medium mb-1">Guru Pembimbing Sekolah *</label>
        <select id="selectPembimbing" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500">
          <option value="Achmad Mackrus, S.T.">Achmad Mackrus, S.T.</option>
          <option value="Eko Hariyono, S.Pd.T.">Eko Hariyono, S.Pd.T.</option>
          <option value="Gufron Al-Hakim, S.T.">Gufron Al-Hakim, S.T.</option>
          <option value="Andrik Wiyono, S.T., M.Pd., Gr.">Andrik Wiyono, S.T., M.Pd., Gr.</option>
          <option value="Rayendra Sukma Atmaja, S.Pd., M.Pd., Gr.">Rayendra Sukma Atmaja, S.Pd., M.Pd., Gr.</option>
          <option value="Muhammad Choirul Anam, S.Pd., M.Pd., Gr.">Muhammad Choirul Anam, S.Pd., M.Pd., Gr.</option>
          <option value="Eko Suwartono, S.T.">Eko Suwartono, S.T.</option>
          <option value="Grista Ary Laga, S.Pd.">Grista Ary Laga, S.Pd.</option>
          <option value="Rangga S.Pd.">Rangga S.Pd.</option>
          <option value="Hadi Suprapto, S.Pd.">Hadi Suprapto, S.Pd.</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3 pt-2">
        <button onclick="submitPresence('CHECK_IN')" class="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition">
          <span>☀️</span> Presensi Datang (04.00 - 12.00)
        </button>
        <button onclick="submitPresence('CHECK_OUT')" class="py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition">
          <span>🌙</span> Presensi Pulang (15.00 - 23.59)
        </button>
      </div>
    </div>

    <!-- Live History Table -->
    <div class="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span>📊</span> Data Presensi Terkini di Google Spreadsheet
        </h3>
        <button onclick="fetchHistory()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold">
          🔄 Refresh
        </button>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-900 text-slate-300 border-b border-slate-800">
              <th class="p-3">Tanggal</th>
              <th class="p-3">Siswa</th>
              <th class="p-3">Tempat PKL</th>
              <th class="p-3">Pembimbing</th>
              <th class="p-3 text-center">Datang</th>
              <th class="p-3 text-center">Pulang</th>
              <th class="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody id="tableBody" class="divide-y divide-slate-800/80 text-slate-300">
            <tr>
              <td colSpan="7" class="p-6 text-center text-slate-500">Memuat data dari Google Spreadsheet...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </main>

  <script>
    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
      const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('clockDisplay').textContent = timeStr;
      document.getElementById('dateDisplay').textContent = dateStr;
    }
    setInterval(updateClock, 1000);
    updateClock();

    function fetchHistory() {
      google.script.run
        .withSuccessHandler(function(res) {
          const tbody = document.getElementById('tableBody');
          if (!res || !res.data || res.data.length === 0) {
            tbody.innerHTML = '<tr><td colSpan="7" class="p-6 text-center text-slate-500">Belum ada data presensi terdaftar.</td></tr>';
            return;
          }
          let html = '';
          res.data.forEach(function(row) {
            html += '<tr class="hover:bg-slate-900/50">' +
              '<td class="p-3 font-mono text-cyan-300">' + row.tanggal + '</td>' +
              '<td class="p-3"><strong class="text-white">' + row.namaSiswa + '</strong><br><span class="text-[10px] text-slate-400 font-mono">' + row.nis + '</span></td>' +
              '<td class="p-3 text-emerald-300">' + row.tempatPkl + '</td>' +
              '<td class="p-3 text-indigo-300">' + row.namaPembimbing + '</td>' +
              '<td class="p-3 text-center font-mono font-bold text-emerald-400">' + row.jamDatang + '</td>' +
              '<td class="p-3 text-center font-mono font-bold text-cyan-400">' + (row.jamPulang || '-') + '</td>' +
              '<td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">' + row.status + '</span></td>' +
              '</tr>';
          });
          tbody.innerHTML = html;
        })
        .handleGetAttendance();
    }
    window.onload = fetchHistory;
  </script>
</body>
</html>`;

export const PETUNJUK_PENGGUNAAN_TEXT = `=========================================================================
PETUNJUK DEPLOYMENT & INTEGRASI GOOGLE SPREADSHEET (CODE.GS & INDEX.HTML)
SISTEM INFORMASI ABSENSI SISWA PKL - SMKN 1 TEGALSARI (TKR)
=========================================================================

Gunakan panduan step-by-step berikut untuk mempublikasikan Google Apps Script
dan menghubungkannya dengan Aplikasi Web AI Studio agar seluruh data presensi
siswa PKL tersinkronisasi secara real-time dua arah.

-------------------------------------------------------------------------
LANGKAH 1: MEMBUAT GOOGLE SPREADSHEET BARU
-------------------------------------------------------------------------
1. Buka browser dan masuk ke akun Google Anda.
2. Akses Google Sheets (https://sheets.google.com) dan buat Spreadsheet Baru.
3. Beri nama Spreadsheet, contohnya: "Database_Absensi_PKL_TKR_SMKN1Tegalsari".

-------------------------------------------------------------------------
LANGKAH 2: MEMBUAT & MENEMPELKAN CODE.GS
-------------------------------------------------------------------------
1. Di halaman Google Spreadsheet Anda, klik menu atas:
   "Ekstensi" (Extensions) > "Apps Script".
2. Di dalam editor Apps Script, hapus seluruh isi file default "Code.gs".
3. Salin seluruh isi skrip "Code.gs" dari tab "Source Code Code.gs" pada aplikasi.
4. Tempelkan (Paste) skrip tersebut ke dalam editor "Code.gs".
5. Klik ikon Disket / tombol "Simpan Project" (Ctrl + S).

-------------------------------------------------------------------------
LANGKAH 3: MEMBUAT FILE INDEX.HTML (UNTUK APPS SCRIPT WEB APP)
-------------------------------------------------------------------------
1. Di bilah samping kiri Apps Script Editor, klik ikon tanda tambah (+) di samping "File".
2. Pilih "HTML", lalu beri nama file: "index" (tanpa ekstensi .html).
3. Salin seluruh isi dari tab "Source Code index.html" pada aplikasi.
4. Tempelkan (Paste) ke dalam file "index.html" di Apps Script Editor.
5. Simpan project (Ctrl + S).

-------------------------------------------------------------------------
LANGKAH 4: MENJALANKAN SETUP DATABASE OTOMATIS
-------------------------------------------------------------------------
1. Di bagian atas Apps Script Editor, pilih fungsi: "setupDatabase".
2. Klik tombol "Jalankan" (Run).
3. Jika muncul jendela otorisasi "Authorization Required":
   a. Klik "Tinjau Izin" (Review Permissions).
   b. Pilih akun Google Anda.
   c. Klik "Lanjutan" (Advanced) > "Buka Project (tidak aman)" / "Go to Project".
   d. Klik "Izinkan" (Allow).
4. Kembali ke Google Spreadsheet Anda. Anda akan melihat 3 sheet dibuat otomatis:
   - "Data_Absensi_PKL" (Header Navy Blue)
   - "Data_Siswa_TKR" (Header Emerald Green)
   - "Konfigurasi_Sistem" (Header Indigo)

-------------------------------------------------------------------------
LANGKAH 5: MEMPUBLIKASIKAN SEBAGAI APLIKASI WEB (DEPLOY AS WEB APP)
-------------------------------------------------------------------------
1. Di sudut kanan atas Apps Script Editor, klik tombol biru:
   "Terapkan" (Deploy) > "Terapkan sebagai Aplikasi Web" (New Deployment).
2. Isikan pengaturan berikut:
   - Jenis Deployment: Klik ikon roda gigi > pilih "Aplikasi Web" (Web app).
   - Deskripsi: "API Absensi PKL SMKN 1 Tegalsari v1.0"
   - Jalankan sebagai (Execute as): "Saya" (Me - email akun Anda)
   - Siapa yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> SANGAT PENTING!
3. Klik tombol "Terapkan" (Deploy).
4. Salin "URL Aplikasi Web" (Web App URL) yang dihasilkan (berawalan https://script.google.com/macros/s/.../exec).

-------------------------------------------------------------------------
LANGKAH 6: MENGHUBUNGKAN URL KE APLIKASI WEB AI STUDIO
-------------------------------------------------------------------------
1. Kembali ke Aplikasi AI Studio ini pada menu "Sinkronisasi Spreadsheet & Code.gs" milik Pembimbing.
2. Tempelkan Web App URL yang disalin tadi pada kolom "URL Web App Google Apps Script".
3. Klik tombol "Simpan & Tes Koneksi".
4. Jika koneksi berhasil, status akan berubah menjadi "Terhubung Sempurna" dan seluruh presensi siswa PKL akan tersinkronisasi otomatis secara real-time ke Google Spreadsheet!

=========================================================================
Sistem Siap Digunakan & Terhubung Realtime 2 Arah!
=========================================================================`;

