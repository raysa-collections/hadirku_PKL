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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'HADIRKU PKL TKR Server API',
    time: new Date().toISOString(),
    totalAttendance: serverStore.getAttendance().length,
    totalStudents: serverStore.getStudents().length,
  });
});

// --- CONFIG API ---
app.get('/api/config', (req: Request, res: Response) => {
  res.json({ status: 'success', data: serverStore.getConfig() });
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    const updated = serverStore.saveConfig(req.body);
    res.json({ status: 'success', message: 'Konfigurasi server berhasil diperbarui', data: updated });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message || 'Gagal menyimpan konfigurasi' });
  }
});

// --- ATTENDANCE API ---
// GET all attendance records from server
app.get('/api/attendance', (req: Request, res: Response) => {
  const records = serverStore.getAttendance();
  res.json({ status: 'success', total: records.length, data: records });
});

// POST attendance record (Check-In or Check-Out) from student phone
app.post('/api/attendance', async (req: Request, res: Response) => {
  try {
    const record = req.body;
    if (!record || !record.tanggal || !record.nis) {
      return res.status(400).json({ status: 'error', message: 'Data tanggal dan NIS siswa wajib diisi' });
    }

    const result = await serverStore.saveAttendanceRecord(record);
    res.json({
      status: 'success',
      message: result.sheetSynced
        ? 'Presensi berhasil dicatat di Server Aplikasi & tersinkronisasi ke Google Spreadsheet!'
        : 'Presensi berhasil dicatat di Server Aplikasi!',
      sheetSynced: result.sheetSynced,
      sheetError: result.sheetError,
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
    const record = { ...req.body, id: req.params.id };
    const result = await serverStore.saveAttendanceRecord(record);
    res.json({
      status: 'success',
      message: 'Presensi berhasil diperbarui di server',
      sheetSynced: result.sheetSynced,
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

// Trigger pull from Google Spreadsheet
app.post('/api/attendance/pull', async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    const result = await serverStore.pullAttendanceFromGAS(url);
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

// --- STUDENTS / USERS API ---
app.get('/api/students', (req: Request, res: Response) => {
  const students = serverStore.getStudents();
  res.json({ status: 'success', total: students.length, data: students });
});

app.post('/api/students', async (req: Request, res: Response) => {
  try {
    const student = req.body;
    if (!student || !student.nis || !student.nama) {
      return res.status(400).json({ status: 'error', message: 'NIS dan nama siswa wajib diisi' });
    }
    const result = await serverStore.saveUser(student);
    res.json({
      status: 'success',
      message: 'Siswa berhasil didaftarkan di server dan disinkronkan',
      sheetSynced: result.sheetSynced,
      data: result.user,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.delete('/api/students/:id', (req: Request, res: Response) => {
  try {
    const deleted = serverStore.deleteUser(req.params.id);
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
