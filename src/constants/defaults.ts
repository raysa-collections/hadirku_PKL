import { User, AttendanceRecord, AppThemeConfig, ReportPrintConfig, TahunAjaranConfig } from '../types/pkl';

export const DEFAULT_TAHUN_AJARAN_CONFIG: TahunAjaranConfig = {
  tahunAktif: '2025/2026',
  daftarTahun: ['2024/2025', '2025/2026', '2026/2027', '2027/2028'],
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export const DEFAULT_THEME_CONFIG: AppThemeConfig = {
  appTitle: 'Absensi Siswa PKL',
  appSubtitle: 'SMK Negeri 1 Tegalsari • Jurusan Teknik Kendaraan Ringan (TKR)',
  logoPreset: 'school',
  headerColor: 'cyan',
  borderStyle: 'subtle',
};

export const DEFAULT_REPORT_CONFIG: ReportPrintConfig = {
  kopBaris1: 'PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN',
  kopBaris2: 'SMK NEGERI 1 TEGALSARI — KELOMPOK TEKNOLOGI & REKAYASA',
  kopBaris3: 'PROGRAM KEAHLIAN TEKNIK KENDARAAN RINGAN (TKR)',
  kopAlamat: "Jl. KH. Syafa'at No. 01 Blokagung, Tegalsari, Banyuwangi - Telp. (0333) 845678",
  logoKiriUrl: '',
  logoKananUrl: '',
  showLogoKiri: true,
  showLogoKanan: true,
  ttdKiriLabel: 'Mengetahui,\nSekretaris Jurusan TKR',
  ttdKiriNama: 'Andrik Wiyono, S.T., M.Pd., Gr.',
  ttdKiriJabatan: 'NIP. 19820415 201101 1 005',
  ttdKananKota: 'Tegalsari',
  ttdKananLabel: 'Kepala Program Keahlian TKR',
  ttdKananNama: 'Achmad Mackrus, S.T.',
  ttdKananNip: 'NIP. 19790820 200801 1 012',
  showKop: true,
  showTtd: true,
  paperSize: 'A4',
  paperOrientation: 'landscape',
  paperMargin: 'normal',
  tableFontSize: 'normal',
};

// Initial system accounts (Only official administrator account; student accounts register dynamically or via import)
export const INITIAL_USERS: User[] = [
  {
    id: 'USR-ADMIN-1',
    username: 'admin123',
    password: 'admin123',
    role: 'admin',
    nama: 'Administrator PKL TKR',
    nis: '197805122005011003',
    nip: '197805122005011003',
    jabatan: 'Koordinator BKK & Hubin PKL',
    jenisKelamin: 'Laki-laki',
    asalSekolah: 'SMKN 1 Tegalsari',
    jurusan: 'Koordinator PKL Sekolah',
    kelas: 'Guru/Koordinator',
    noHp: '081234567890',
    tempatPkl: 'Kantor BKK & Hubin Sekolah',
    namaPembimbing: 'Kepala Sekolah SMKN 1 Tegalsari',
    createdAt: '2026-01-01',
  },
];

export function generateSeedAttendance(): AttendanceRecord[] {
  return [];
}
