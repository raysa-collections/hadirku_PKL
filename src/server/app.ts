import express, { Request, Response } from 'express';
import { serverStore } from './store';

const app = express();

// Increase JSON limit so photos taken by students on mobile devices can be safely transmitted
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS & Headers Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Gas-Url, x-gas-url');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/api', (req: Request, res: Response) => {
  const diag = serverStore.getDiagnostics();
  res.json({
    status: 'ok',
    app: 'HADIRKU PKL TKR Server API',
    time: new Date().toISOString(),
    totalAttendance: serverStore.getAttendance().length,
    totalStudents: serverStore.getStudents().length,
    ...diag,
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  const diag = serverStore.getDiagnostics();
  res.json({
    status: 'ok',
    app: 'HADIRKU PKL TKR Server API',
    time: new Date().toISOString(),
    totalAttendance: serverStore.getAttendance().length,
    totalStudents: serverStore.getStudents().length,
    ...diag,
  });
});

// --- CONFIG API ---
app.get('/api/config', (req: Request, res: Response) => {
  const headerGas = (req.headers['x-gas-url'] as string | undefined) || (typeof req.query.gas === 'string' ? req.query.gas : undefined);
  if (headerGas && headerGas.trim().startsWith('http')) {
    serverStore.saveConfig({ googleSheet: { scriptUrl: headerGas.trim(), sheetName: 'Data_Absensi_PKL', connected: true, autoSync: true } });
  }
  res.json({
    status: 'success',
    data: serverStore.getConfig(),
    meta: serverStore.getDiagnostics(),
  });
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    const updated = serverStore.saveConfig(req.body);
    res.json({ status: 'success', message: 'Konfigurasi server berhasil diperbarui', data: updated, meta: serverStore.getDiagnostics() });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message || 'Gagal menyimpan konfigurasi' });
  }
});

// --- ATTENDANCE API ---
// GET all attendance records from server (optionally filtered by ?nis=)
app.get('/api/attendance', async (req: Request, res: Response) => {
  const nis = typeof req.query.nis === 'string' ? req.query.nis : undefined;
  const overrideGas = (req.headers['x-gas-url'] as string | undefined) || (typeof req.query.scriptUrl === 'string' ? req.query.scriptUrl : undefined);
  await serverStore.hydrateFromGasIfCold(overrideGas);
  const records = serverStore.getAttendance(nis);
  res.json({ status: 'success', total: records.length, data: records });
});

// POST attendance record (Check-In or Check-Out) from student phone
app.post('/api/attendance', async (req: Request, res: Response) => {
  try {
    const { scriptUrl: bodyScriptUrl, ...record } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || (req.headers['x-gas-url'] as string | undefined);
    if (!record || !record.tanggal || !record.nis) {
      return res.status(400).json({ status: 'error', message: 'Data tanggal dan NIS siswa wajib diisi' });
    }

    const result = await serverStore.saveAttendanceRecord(record, overrideScriptUrl);
    res.json({
      status: 'success',
      serverSaved: true,
      message: result.sheetSynced
        ? 'Presensi berhasil dicatat di Server Aplikasi & tersinkronisasi ke Google Spreadsheet!'
        : 'Presensi berhasil dicatat di Server Aplikasi!',
      sheetSynced: result.sheetSynced,
      sheetError: result.sheetError,
      timedOut: result.timedOut,
      data: result.record,
    });
  } catch (err: any) {
    console.error('Error in POST /api/attendance:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Gagal mencatat presensi di server' });
  }
});

// PUT update attendance record (e.g. teacher manual edit/approval)
app.put('/api/attendance/:id', async (req: Request, res: Response) => {
  try {
    const { scriptUrl: bodyScriptUrl, ...rest } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || (req.headers['x-gas-url'] as string | undefined);
    const record = { ...rest, id: req.params.id };
    const result = await serverStore.saveAttendanceRecord(record, overrideScriptUrl);
    res.json({
      status: 'success',
      message: 'Presensi berhasil diperbarui di server',
      sheetSynced: result.sheetSynced,
      sheetError: result.sheetError,
      data: result.record,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE attendance record
app.delete('/api/attendance/:id', (req: Request, res: Response) => {
  try {
    const deleted = serverStore.deleteAttendanceRecord(req.params.id);
    if (deleted) {
      res.json({ status: 'success', message: 'Data presensi berhasil dihapus dari server' });
    } else {
      res.status(404).json({ status: 'error', message: 'Data presensi tidak ditemukan' });
    }
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Trigger pull attendance from Google Spreadsheet
app.post('/api/attendance/pull', async (req: Request, res: Response) => {
  try {
    const { url, nis } = req.body || {};
    const result = await serverStore.pullAttendanceFromGAS(url, nis);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message || 'Gagal sinkron dari Google Spreadsheet' });
  }
});

// Reset attendance data
app.post('/api/attendance/reset', (req: Request, res: Response) => {
  try {
    const { mode } = req.body || { mode: 'all' };
    const result = serverStore.resetAttendance(mode);
    res.json({ status: 'success', message: 'Reset data berhasil', ...result });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Test Google Apps Script Web App connection via server (bypasses browser CORS)
app.post('/api/gas/test', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    const result = await serverStore.testGASConnection(url);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Gagal menguji koneksi GAS' });
  }
});

// --- STUDENTS / USERS API ---
app.get('/api/students', async (req: Request, res: Response) => {
  const overrideGas = (req.headers['x-gas-url'] as string | undefined) || (typeof req.query.scriptUrl === 'string' ? req.query.scriptUrl : undefined);
  await serverStore.hydrateFromGasIfCold(overrideGas);
  const students = serverStore.getStudents();
  res.json({ status: 'success', total: students.length, data: students });
});

app.post('/api/students', async (req: Request, res: Response) => {
  try {
    const { scriptUrl: bodyScriptUrl, ...student } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || (req.headers['x-gas-url'] as string | undefined);
    if (!student || !student.nis || !student.nama) {
      return res.status(400).json({ status: 'error', message: 'NIS dan nama siswa wajib diisi' });
    }
    const result = await serverStore.saveUser(student, overrideScriptUrl);
    res.json({
      status: 'success',
      message: result.sheetSynced
        ? 'Siswa berhasil didaftarkan di Server & Google Spreadsheet!'
        : 'Siswa berhasil didaftarkan di server aplikasi',
      sheetSynced: result.sheetSynced,
      sheetError: result.sheetError,
      data: result.user,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/students/bulk', async (req: Request, res: Response) => {
  try {
    const { students, scriptUrl: bodyScriptUrl } = req.body || {};
    const overrideScriptUrl = bodyScriptUrl || (req.headers['x-gas-url'] as string | undefined);
    if (!Array.isArray(students)) {
      return res.status(400).json({ status: 'error', message: 'Data students harus berupa array' });
    }
    const result = await serverStore.saveUsersBulk(students, overrideScriptUrl);
    res.json({
      status: 'success',
      ...result,
      data: serverStore.getStudents(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/students/pull', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    const result = await serverStore.pullStudentsFromGAS(url);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, count: 0, data: [], message: err.message || 'Gagal sinkron data siswa dari Google Spreadsheet' });
  }
});

app.delete('/api/students/:id', async (req: Request, res: Response) => {
  try {
    const overrideScriptUrl = (req.query.scriptUrl as string | undefined) || req.body?.scriptUrl || (req.headers['x-gas-url'] as string | undefined);
    const deleted = await serverStore.deleteUser(req.params.id, overrideScriptUrl);
    if (deleted) {
      res.json({ status: 'success', message: 'Siswa berhasil dihapus dari server' });
    } else {
      res.status(404).json({ status: 'error', message: 'Siswa tidak ditemukan' });
    }
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = serverStore.getUsers();
  res.json({ status: 'success', total: users.length, data: users });
});

export default app;
