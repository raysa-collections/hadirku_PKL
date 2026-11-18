import { AttendanceRecord, AttendanceStatus, User } from '../types/pkl';

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'Hadir',
  'Terlambat',
  'Tidak Disiplin',
  'Izin',
  'Sakit',
  'Alpha',
]);

/**
 * Normalizes any date string / Date / number from localStorage, Server JSON, or Google Sheets
 * into canonical YYYY-MM-DD (Asia/Jakarta). Returns '' if blank/unparseable.
 */
export function normalizeDateYmd(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(raw);
    } catch {
      return raw.toISOString().slice(0, 10);
    }
  }

  const s = String(raw).trim();
  if (!s || s === '-' || s === 'null' || s === 'undefined') return '';

  // Direct YYYY-MM-DD or YYYY-MM-DDTHH:mm... or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    // If string contains full ISO timestamp with Z/offset (e.g. 2026-11-16T17:00:00.000Z), convert to Jakarta date!
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s))) {
      const parsed = Date.parse(s);
      if (!Number.isNaN(parsed)) {
        try {
          return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(parsed));
        } catch {
          return `${yyyy}-${mm}-${dd}`;
        }
      }
    }
    return `${yyyy}-${mm}-${dd}`;
  }

  // Indonesian DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const p1 = Number(dmyMatch[1]);
    const p2 = Number(dmyMatch[2]);
    const yyyy = dmyMatch[3];
    // Assume DD/MM/YYYY unless middle > 12 (MM/DD/YYYY)
    let day = p1;
    let month = p2;
    if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Fallback JS Date string (e.g. "Mon Nov 17 2026 ...")
  const parsedMs = Date.parse(s);
  if (!Number.isNaN(parsedMs)) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(parsedMs));
    } catch {
      return new Date(parsedMs).toISOString().slice(0, 10);
    }
  }

  return '';
}

/**
 * Normalizes a time value into HH:mm:ss or '-'.
 */
export function normalizeTimeHms(raw: unknown): string {
  if (raw === null || raw === undefined) return '-';
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return '-';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(raw);
    } catch {
      return '-';
    }
  }
  const s = String(raw).replace(/\s*WIB\s*$/i, '').trim();
  if (!s || s === '-' || s === 'null' || s === 'undefined') return '-';

  // ISO time from spreadsheet e.g. 1899-12-30T01:15:00.000Z
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const ms = Date.parse(s);
    if (!Number.isNaN(ms)) {
      try {
        return new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date(ms));
      } catch {}
    }
  }

  const m = s.match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);
  if (m) {
    const hh = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const ss = (m[3] || '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return s;
}

/**
 * Parses timestamps in ISO, "YYYY-MM-DD HH:mm:ss WIB", "YYYY-MM-DD HH.mm.ss", or "DD/MM/YYYY HH:mm:ss" formats.
 */
export function parseTimestampMsSafe(raw?: unknown): { ms: number; hasTimePrecision: boolean } {
  if (!raw) return { ms: 0, hasTimePrecision: false };
  const str = String(raw).replace(/\s*WIB\s*$/i, '').trim();
  if (!str) return { ms: 0, hasTimePrecision: false };

  const hasTimePrecision = /\d{1,2}[:.]\d{2}/.test(str);

  // YYYY-MM-DD HH:mm(:ss) or YYYY-MM-DD HH.mm(.ss)
  const ymdTime = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/);
  if (ymdTime) {
    const iso = `${ymdTime[1]}-${ymdTime[2]}-${ymdTime[3]}T${ymdTime[4].padStart(2, '0')}:${ymdTime[5]}:${(ymdTime[6] || '00').padStart(2, '0')}+07:00`;
    const ms = Date.parse(iso);
    return { ms: Number.isNaN(ms) ? 0 : ms, hasTimePrecision: true };
  }

  // DD/MM/YYYY HH:mm(:ss) or DD/MM/YYYY HH.mm(.ss)
  const dmyTime = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/);
  if (dmyTime) {
    const iso = `${dmyTime[3]}-${dmyTime[2].padStart(2, '0')}-${dmyTime[1].padStart(2, '0')}T${dmyTime[4].padStart(2, '0')}:${dmyTime[5]}:${(dmyTime[6] || '00').padStart(2, '0')}+07:00`;
    const ms = Date.parse(iso);
    return { ms: Number.isNaN(ms) ? 0 : ms, hasTimePrecision: true };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const ms = Date.parse(`${str}T00:00:00+07:00`);
    return { ms: Number.isNaN(ms) ? 0 : ms, hasTimePrecision: false };
  }

  const ms = Date.parse(str);
  return { ms: Number.isNaN(ms) ? 0 : ms, hasTimePrecision };
}

/**
 * Coerces and enriches an AttendanceRecord safely so no field is undefined, null, or numeric.
 */
export function normalizeAttendanceRecord(
  raw: any,
  students?: User[],
  defaultTahunAjaran?: string
): AttendanceRecord | null {
  if (!raw || typeof raw !== 'object') return null;

  const tanggal = normalizeDateYmd(raw.tanggal) || String(raw.tanggal ?? '').trim().slice(0, 10);
  const nis = String(raw.nis ?? '').trim();
  if (!tanggal || !nis) return null;

  const normNis = nis.toLowerCase();
  const matchedStudent = Array.isArray(students)
    ? students.find(s => s && s.role === 'siswa' && String(s.nis || '').trim().toLowerCase() === normNis)
    : undefined;

  const rawNama = String(raw.namaSiswa ?? raw.nama ?? '').trim();
  const namaSiswa =
    rawNama && rawNama !== '-' && rawNama !== 'Siswa PKL'
      ? rawNama
      : matchedStudent?.nama || (rawNama || 'Siswa PKL');

  const rawTempat = String(raw.tempatPkl ?? '').trim();
  const tempatPkl =
    rawTempat && rawTempat !== '-'
      ? rawTempat
      : matchedStudent?.tempatPkl || '-';

  const rawKelas = String(raw.kelas ?? '').trim();
  const kelas = rawKelas && rawKelas !== '-' ? rawKelas : matchedStudent?.kelas || 'XII TKR 1';

  const rawPembimbing = String(raw.namaPembimbing ?? '').trim();
  const namaPembimbing =
    rawPembimbing && rawPembimbing !== '-'
      ? rawPembimbing
      : matchedStudent?.namaPembimbing || '-';

  const rawSekolah = String(raw.asalSekolah ?? '').trim();
  const asalSekolah =
    rawSekolah && rawSekolah !== '-'
      ? rawSekolah
      : matchedStudent?.asalSekolah || 'SMKN 1 Tegalsari';

  const rawJurusan = String(raw.jurusan ?? '').trim();
  const jurusan =
    rawJurusan && rawJurusan !== '-'
      ? rawJurusan
      : matchedStudent?.jurusan || 'Teknik Kendaraan Ringan (TKR)';

  const jamDatang = normalizeTimeHms(raw.jamDatang);
  const jamPulang = normalizeTimeHms(raw.jamPulang);

  const rawStatus = String(raw.status ?? 'Hadir').trim();
  const status: AttendanceStatus = VALID_STATUSES.has(rawStatus)
    ? (rawStatus as AttendanceStatus)
    : 'Hadir';

  const statusDatang = String(raw.statusDatang ?? '').trim() || (jamDatang === '-' && status === 'Hadir' ? 'Belum Datang' : status);
  const statusPulang =
    String(raw.statusPulang ?? '').trim() ||
    (status === 'Izin' || status === 'Sakit' || status === 'Alpha'
      ? status
      : jamPulang !== '-'
      ? 'Sudah Pulang'
      : 'Belum Pulang');

  const koordinatGps = String(raw.koordinatGps ?? '-').trim() || '-';
  const mapsUrl =
    String(raw.mapsUrl ?? '').trim() && String(raw.mapsUrl ?? '').trim() !== '-'
      ? String(raw.mapsUrl).trim()
      : koordinatGps !== '-'
      ? `https://www.google.com/maps?q=${encodeURIComponent(koordinatGps)}`
      : '-';

  const koordinatPulang = String(raw.koordinatPulang ?? '-').trim() || '-';
  const mapsUrlPulang =
    String(raw.mapsUrlPulang ?? '').trim() && String(raw.mapsUrlPulang ?? '').trim() !== '-'
      ? String(raw.mapsUrlPulang).trim()
      : koordinatPulang !== '-'
      ? `https://www.google.com/maps?q=${encodeURIComponent(koordinatPulang)}`
      : '-';

  const rawId = String(raw.id ?? '').trim();
  const id = rawId || `ABS-${tanggal.replace(/-/g, '')}-${nis}`;

  const rawSyncStatus = raw.syncStatus;
  const syncStatus: AttendanceRecord['syncStatus'] =
    rawSyncStatus === 'pending' || rawSyncStatus === 'local_only' || rawSyncStatus === 'synced'
      ? rawSyncStatus
      : 'synced';

  const tahunAjaran = String(raw.tahunAjaran ?? '').trim() || matchedStudent?.tahunAjaran || defaultTahunAjaran;

  return {
    id,
    tanggal,
    nis,
    namaSiswa,
    kelas,
    namaPembimbing,
    asalSekolah,
    jurusan,
    jamDatang,
    jamPulang,
    status,
    statusDatang,
    statusPulang,
    keterangan: String(raw.keterangan ?? '-').trim() || '-',
    tempatPkl,
    koordinatGps,
    mapsUrl,
    fotoBukti: typeof raw.fotoBukti === 'string' && raw.fotoBukti.length > 0 ? raw.fotoBukti : undefined,
    koordinatPulang,
    mapsUrlPulang,
    fotoPulang: typeof raw.fotoPulang === 'string' && raw.fotoPulang.length > 0 ? raw.fotoPulang : undefined,
    tahunAjaran,
    syncStatus,
    syncedAt: raw.syncedAt ? String(raw.syncedAt).trim() : undefined,
    recordedAt: raw.recordedAt ? String(raw.recordedAt).trim() : undefined,
  };
}

/**
 * Stable, multi-key deterministic sort so rows NEVER shuffle order between background polls.
 */
export function sortAttendanceRecordsDeterministic(records: AttendanceRecord[]): AttendanceRecord[] {
  return [...records].sort((a, b) => {
    const aTgl = String(a?.tanggal || '');
    const bTgl = String(b?.tanggal || '');
    const tglDiff = bTgl.localeCompare(aTgl);
    if (tglDiff !== 0) return tglDiff;

    const aIn = a?.jamDatang && a.jamDatang !== '-' ? String(a.jamDatang) : '00:00:00';
    const bIn = b?.jamDatang && b.jamDatang !== '-' ? String(b.jamDatang) : '00:00:00';
    const inDiff = bIn.localeCompare(aIn);
    if (inDiff !== 0) return inDiff;

    const aNama = String(a?.namaSiswa || '');
    const bNama = String(b?.namaSiswa || '');
    const namaDiff = aNama.localeCompare(bNama);
    if (namaDiff !== 0) return namaDiff;

    const aNis = String(a?.nis || '');
    const bNis = String(b?.nis || '');
    const nisDiff = aNis.localeCompare(bNis);
    if (nisDiff !== 0) return nisDiff;

    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

/**
 * Generates a compact fingerprint of attendance records so UI components can skip redundant state updates.
 */
export function getAttendanceSignature(records: AttendanceRecord[]): string {
  const sorted = sortAttendanceRecordsDeterministic(records);
  return sorted
    .map(r =>
      [
        r.id,
        r.tanggal,
        r.nis,
        r.namaSiswa,
        r.kelas || '',
        r.tempatPkl,
        r.jamDatang,
        r.jamPulang,
        r.status,
        r.statusDatang || '',
        r.statusPulang || '',
        r.keterangan,
        r.koordinatGps || '',
        r.koordinatPulang || '',
        r.tahunAjaran || '',
        r.syncStatus,
        r.fotoBukti ? '1' : '0',
        r.fotoPulang ? '1' : '0',
      ].join('|')
    )
    .join('\n');
}
