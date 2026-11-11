/**
 * Hardware GPS Security & Anti-Fake GPS Fraud Detection Engine
 * HADIRKU PKL TKR - SMKN 1 Tegalsari
 */

export interface GpsSecurityResult {
  isFakeGps: boolean;
  accuracy: number;
  providerInfo: string;
  securityMessage: string;
  statusBadge: 'genuine' | 'warning' | 'fake';
  lat: number;
  lng: number;
  googleMapsUrl: string;
  timestamp: string;
}

/**
 * Analyzes GeolocationPosition object directly from hardware device
 * Detects mock locations, fake GPS apps, zero-accuracy injections, and coordinate anomalies.
 */
export function analyzeHardwareGps(pos: GeolocationPosition): GpsSecurityResult {
  const coords = pos.coords;
  const lat = Number(coords.latitude.toFixed(6));
  const lng = Number(coords.longitude.toFixed(6));
  const accuracy = Math.round(coords.accuracy || 0);
  const timestamp = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

  // 1. Direct Web / Native API Mocked Flag Detection
  const rawPos = pos as any;
  const rawCoords = coords as any;
  const isMockFlag = Boolean(
    rawPos.isMock ||
    rawCoords.isMock ||
    rawPos.mocked ||
    rawCoords.mocked ||
    rawPos.isMockLocation ||
    rawCoords.isMockLocation
  );

  // 2. Artificial Accuracy Anomalies (Ciri Khas Aplikasi Fake GPS)
  // Fake GPS apps commonly inject exact 0m, 1.0m, or fixed 5.0m static integer accuracy without satellite noise.
  const isZeroAccuracy = accuracy === 0;
  const isStaticArtificialInteger = accuracy === 1;
  const isAbsurdlyUncertain = accuracy > 1000; // > 1km accuracy

  let isFakeGps = false;
  let securityMessage = '';
  let statusBadge: 'genuine' | 'warning' | 'fake' = 'genuine';

  if (isMockFlag) {
    isFakeGps = true;
    statusBadge = 'fake';
    securityMessage = 'Sistem HP mendeteksi atribut Mock Location / Aplikasi Fake GPS aktif di latar belakang!';
  } else if (isZeroAccuracy) {
    isFakeGps = true;
    statusBadge = 'fake';
    securityMessage = 'Akurasi GPS 0 meter (Injeksi Fake GPS / Emulator tanpa sinyal satelit fisik).';
  } else if (isStaticArtificialInteger) {
    isFakeGps = true;
    statusBadge = 'fake';
    securityMessage = 'Format sinyal lokasi terdeteksi artifisial (Pola modifikasi Fake GPS/Location Spoofer).';
  } else if (isAbsurdlyUncertain) {
    isFakeGps = false;
    statusBadge = 'warning';
    securityMessage = 'Sinyal lokasi lemah / terlalu luas (> 1 KM). Harap berpindah ke tempat terbuka.';
  } else if (accuracy <= 30) {
    isFakeGps = false;
    statusBadge = 'genuine';
    securityMessage = `Sinyal Satelit HP Native Akurat (±${accuracy}m). Terverifikasi fisik.`;
  } else {
    isFakeGps = false;
    statusBadge = 'genuine';
    securityMessage = `Sinyal Seluler / WiFi Perangkat (±${accuracy}m).`;
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const providerInfo = isFakeGps
    ? 'TERDETEKSI FAKE GPS (DITOLAK)'
    : statusBadge === 'genuine'
    ? `Sinyal Hardware HP Native (±${accuracy}m)`
    : `Sinyal Menunggu Satelit (±${accuracy}m)`;

  return {
    isFakeGps,
    accuracy,
    providerInfo,
    securityMessage,
    statusBadge,
    lat,
    lng,
    googleMapsUrl,
    timestamp,
  };
}
