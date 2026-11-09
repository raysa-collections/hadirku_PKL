export interface AppConfig {
  id: string;
  name: string;
  shortName: string;
  packageName: string;
  version: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  category: 'automotive' | 'business' | 'education' | 'utility';
  icon: string;
  features: {
    camera: boolean;
    gps: boolean;
    vibration: boolean;
    notifications: boolean;
    offlineDb: boolean;
    batteryStatus: boolean;
  };
  sampleItems: {
    id: string;
    title: string;
    subtitle: string;
    badge?: string;
    value?: string;
  }[];
}

export interface PresetApp {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  config: AppConfig;
}

export const PRESET_APPS: PresetApp[] = [
  {
    id: 'tkr-workshop',
    title: 'Bengkel TKR AutoPro',
    subtitle: 'Sistem manajemen servis, diagnosa & sparepart bengkel otomotif SMK',
    iconName: 'Wrench',
    config: {
      id: 'tkr-workshop',
      name: 'Bengkel TKR AutoPro',
      shortName: 'TKR Auto',
      packageName: 'com.smkn1tegalsari.tkrauto',
      version: '1.0.0',
      description: 'Aplikasi servis kendaraan, diagnosa mesin, checklist perbaikan dan inventaris bengkel.',
      primaryColor: '#0284c7', // Sky / Cyan
      accentColor: '#38bdf8',
      category: 'automotive',
      icon: '🔧',
      features: {
        camera: true,
        gps: true,
        vibration: true,
        notifications: true,
        offlineDb: true,
        batteryStatus: true,
      },
      sampleItems: [
        { id: '1', title: 'Tune-up Mesin 4-Tak Avanza', subtitle: 'Mekanik: Siswa Kelompok A • Unit #03', badge: 'Proses', value: '75%' },
        { id: '2', title: 'Ganti Oli & Filter Transmisi', subtitle: 'Pelanggan: Guru SMKN 1 • Plat P 1234 XX', badge: 'Selesai', value: 'Rp 280rb' },
        { id: '3', title: 'Overhaul Sistem Rem Cakram', subtitle: 'Praktek Siswa Kelas XII TKR 2', badge: 'Menunggu', value: 'Slot #2' },
        { id: '4', title: 'Pemeriksaan Sistem Injeksi EFI', subtitle: 'Scanner OBD-II terhubung • Tidak ada DTC error', badge: 'Normal', value: '14.2V' },
      ],
    },
  },
  {
    id: 'smart-pos',
    title: 'Kasir Pintar UMKM',
    subtitle: 'Point of Sale modern untuk toko, warung & usaha sekolah',
    iconName: 'ShoppingBag',
    config: {
      id: 'smart-pos',
      name: 'Kasir Pintar Mobile',
      shortName: 'KasirKu',
      packageName: 'com.umkm.kasirpintar',
      version: '1.2.0',
      description: 'Pencatatan transaksi kasir, barcode scanner, nota cetak dan rekap harian.',
      primaryColor: '#059669', // Emerald
      accentColor: '#34d399',
      category: 'business',
      icon: '💳',
      features: {
        camera: true,
        gps: false,
        vibration: true,
        notifications: true,
        offlineDb: true,
        batteryStatus: true,
      },
      sampleItems: [
        { id: '1', title: 'Kopi Susu Gula Aren (x2)', subtitle: 'Meja 04 • Tunai', badge: 'Lunas', value: 'Rp 36.000' },
        { id: '2', title: 'Paket Snack Box Workshop', subtitle: 'Pesanan Ruang Pertemuan TKR', badge: 'Lunas', value: 'Rp 150.000' },
        { id: '3', title: 'Air Mineral Botol 600ml (x5)', subtitle: 'Take-away', badge: 'Lunas', value: 'Rp 20.000' },
      ],
    },
  },
  {
    id: 'school-presence',
    title: 'Absensi & Nilai Siswa',
    subtitle: 'Presensi harian digital berbasis GPS & kamera selfie',
    iconName: 'GraduationCap',
    config: {
      id: 'school-presence',
      name: 'Presensi Siswa SMK',
      shortName: 'PresensiSMK',
      packageName: 'com.smkn1tegalsari.presensi',
      version: '1.1.0',
      description: 'Presensi kelas, geofencing lokasi sekolah, dan rekap penilaian harian.',
      primaryColor: '#7c3aed', // Violet
      accentColor: '#a78bfa',
      category: 'education',
      icon: '🎓',
      features: {
        camera: true,
        gps: true,
        vibration: true,
        notifications: true,
        offlineDb: true,
        batteryStatus: true,
      },
      sampleItems: [
        { id: '1', title: 'Ahmad Fauzi (XII TKR 1)', subtitle: 'Hadir 06:45 WIB • Radius 12m dari Bengkel', badge: 'Tepat Waktu', value: '100%' },
        { id: '2', title: 'Budi Santoso (XII TKR 1)', subtitle: 'Hadir 06:58 WIB • Radius 8m dari Lab', badge: 'Tepat Waktu', value: '100%' },
        { id: '3', title: 'Dimas Pratama (XII TKR 2)', subtitle: 'Izin Sakit (Surat Dokter Terlampir)', badge: 'Izin', value: 'Surat' },
      ],
    },
  },
];
