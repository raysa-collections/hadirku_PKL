export type UserRole = 'admin' | 'siswa';

export interface User {
  id: string;
  username: string; // or NIS or NIP
  password: string;
  role: UserRole;
  nama: string;
  nis: string;
  nip?: string;
  jabatan?: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  asalSekolah: string;
  jurusan: string;
  kelas?: string; // e.g. "XII TKR 1"
  noHp: string;
  tempatPkl: string;
  namaPembimbing: string;
  tahunAjaran?: string; // e.g. "2025/2026"
  createdAt: string;
}

export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Tidak Disiplin' | 'Izin' | 'Sakit' | 'Alpha';

export interface AttendanceRecord {
  id: string; // e.g. ABS-20261105-20240101
  tanggal: string; // YYYY-MM-DD
  nis: string;
  namaSiswa: string;
  kelas?: string; // e.g. "XII TKR 1"
  namaPembimbing?: string; // Guru Pembimbing Sekolah
  asalSekolah: string;
  jurusan: string;
  jamDatang: string; // HH:mm:ss
  jamPulang: string; // HH:mm:ss or '-'
  status: AttendanceStatus;
  statusDatang?: string;
  statusPulang?: string;
  keterangan: string;
  tempatPkl: string;
  koordinatGps?: string; // e.g. "-8.3752, 114.1294"
  mapsUrl?: string; // Google Maps link
  fotoBukti?: string; // base64 / image data
  koordinatPulang?: string;
  mapsUrlPulang?: string;
  fotoPulang?: string;
  tahunAjaran?: string; // e.g. "2025/2026"
  syncStatus: 'synced' | 'pending' | 'local_only';
  syncedAt?: string;
}

export interface TahunAjaranConfig {
  tahunAktif: string; // e.g. "2025/2026"
  daftarTahun: string[]; // e.g. ["2024/2025", "2025/2026", "2026/2027", "2027/2028"]
}

export interface GoogleSheetConfig {
  scriptUrl: string;
  sheetId?: string;
  sheetName: string;
  connected: boolean;
  lastSync?: string;
  autoSync: boolean;
}

export const PEMBIMBING_TKR_LIST: string[] = [
  'Achmad Mackrus, S.T.',
  'Eko Hariyono, S.Pd.T.',
  'Gufron Al-Hakim, S.T.',
  'Andrik Wiyono, S.T., M.Pd., Gr.',
  'Rayendra Sukma Atmaja, S.Pd., M.Pd., Gr.',
  'Muhammad Choirul Anam, S.Pd., M.Pd., Gr.',
  'Eko Suwartono, S.T.',
  'Grista Ary Laga, S.Pd.',
  'Rangga S.Pd.',
  'Hadi Suprapto, S.Pd.',
];

export type HeaderThemeColor = 'cyan' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';
export type HeaderBorderStyle = 'subtle' | 'bold' | 'glow' | 'double';

export interface AppThemeConfig {
  appTitle: string;
  appSubtitle: string;
  logoUrl?: string; // custom base64 or image url
  logoPreset?: 'school' | 'wrench' | 'car' | 'shield' | 'sparkles';
  headerColor: HeaderThemeColor;
  borderStyle: HeaderBorderStyle;
}

export type PaperSize = 'A4' | 'F4' | 'Legal' | 'Letter' | 'A3';
export type PaperOrientation = 'landscape' | 'portrait';
export type PaperMargin = 'compact' | 'normal' | 'spacious';
export type TableFontSize = 'compact' | 'normal' | 'large';

export interface ReportPrintConfig {
  kopBaris1: string;
  kopBaris2: string;
  kopBaris3: string;
  kopAlamat: string;
  logoKiriUrl?: string;
  logoKananUrl?: string;
  showLogoKiri?: boolean;
  showLogoKanan?: boolean;
  ttdKiriLabel: string;
  ttdKiriNama: string;
  ttdKiriJabatan: string;
  ttdKananKota: string;
  ttdKananLabel: string;
  ttdKananNama: string;
  ttdKananNip: string;
  showKop: boolean;
  showTtd: boolean;
  paperSize?: PaperSize;
  paperOrientation?: PaperOrientation;
  paperMargin?: PaperMargin;
  tableFontSize?: TableFontSize;
}
