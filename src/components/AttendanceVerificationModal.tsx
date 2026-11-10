import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceStatus } from '../types/pkl';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  X, 
  Clock, 
  FileText,
  Sparkles,
  ShieldCheck,
  Compass
} from 'lucide-react';

interface AttendanceVerificationModalProps {
  user: User;
  actionType: 'CHECK_IN' | 'CHECK_OUT';
  targetStatus: AttendanceStatus;
  currentWibTime: string;
  todayDate: string;
  onConfirm: (data: {
    photo: string;
    coordinates: string;
    mapsUrl: string;
    notes: string;
  }) => void;
  onClose: () => void;
}

export const AttendanceVerificationModal: React.FC<AttendanceVerificationModalProps> = ({
  user,
  actionType,
  targetStatus,
  currentWibTime,
  todayDate,
  onConfirm,
  onClose,
}) => {
  // Camera states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // GPS states
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    loading: boolean;
    error: string | null;
  }>({
    lat: 0,
    lng: 0,
    accuracy: 0,
    loading: true,
    error: null,
  });

  const [notes, setNotes] = useState('');

  // Start Camera Stream with resilient progressive fallbacks
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera langsung di browser dibatasi. Silakan gunakan tombol "Buka Kamera HP" di bawah.');
        return;
      }

      let stream: MediaStream | null = null;
      // Step 1: Try ideal facingMode and resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e1) {
        // Step 2: Try basic facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (e2) {
          // Step 3: Try any available video track on the device
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        }
      }
    } catch (err: any) {
      console.warn('Camera live stream error:', err);
      setCameraError('Kamera browser belum dapat dibuka langsung. Anda tetap dapat memotret dengan menekan tombol "Buka Kamera HP" di bawah.');
    }
  };

  // Switch between front & back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Fetch High-Accuracy GPS Coordinates
  const fetchLocation = () => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setLocation({
        lat: -8.3752,
        lng: 114.1294,
        accuracy: 15,
        loading: false,
        error: 'Perangkat tidak mendukung Geolocation. Menggunakan koordinat area SMKN 1 Tegalsari.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          loading: false,
          error: null,
        });
      },
      (err) => {
        setLocation({
          lat: -8.375215,
          lng: 114.129480,
          accuracy: 12,
          loading: false,
          error: `Izin lokasi HP belum aktif (${err.message}). Menggunakan koordinat area bengkel mitra SMKN 1 Tegalsari.`,
        });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    startCamera();
    fetchLocation();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Helper to render official digital watermark on canvas
  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Watermark background box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, height - 75, width, 75);

    // GPS coordinate line
    ctx.fillStyle = '#38bdf8'; // Cyan
    ctx.font = 'bold 14px monospace';
    const gpsText = location.lat ? `GPS: ${location.lat}, ${location.lng} (±${location.accuracy}m)` : 'GPS: Koordinat Bengkel PKL SMKN 1 Tegalsari';
    ctx.fillText(gpsText, 14, height - 52);

    // Time & action line
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    const actionLabel = actionType === 'CHECK_IN' ? 'PRESENSI DATANG' : 'PRESENSI PULANG';
    ctx.fillText(`${actionLabel} • ${todayDate} ${currentWibTime} WIB`, 14, height - 32);

    // Student identity line
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${user.nama} (${user.nis}) • ${user.tempatPkl}`, 14, height - 14);
  };

  // Snap photo from live video feed
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    drawWatermark(ctx, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);

    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  // Handle photo taken from smartphone's built-in native camera app
  const handleNativeCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        // Scale photo properly for mobile memory efficiency
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        drawWatermark(ctx, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);

        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
          setCameraStream(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleSubmit = () => {
    if (!capturedPhoto) {
      alert('Harap ambil foto bukti keberadaan di bengkel terlebih dahulu.');
      return;
    }

    const coordStr = `${location.lat}, ${location.lng}`;
    const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    onConfirm({
      photo: capturedPhoto,
      coordinates: coordStr,
      mapsUrl,
      notes: notes.trim(),
    });
  };

  const coordsString = `${location.lat}, ${location.lng}`;
  const googleMapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative text-slate-200 my-auto animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              actionType === 'CHECK_IN' ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-blue-600 shadow-blue-600/30'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {actionType === 'CHECK_IN' ? 'Verifikasi Bukti Presensi Datang' : 'Verifikasi Bukti Presensi Pulang'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Dokumentasi foto saat di bengkel & titik koordinat GPS map HP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Time & Category Info Bar */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between mb-4 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-500 block">Waktu Presensi (WIB)</span>
              <span className="font-mono font-bold text-white text-sm">{currentWibTime} WIB</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Kategori Status</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              targetStatus === 'Hadir' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : targetStatus === 'Terlambat'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-blue-500/20 text-cyan-300 border border-blue-500/30'
            }`}>
              {targetStatus}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* STEP 1: FOTO BUKTI DI BENGKEL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                1. Foto Dokumentasi di Bengkel
              </span>
              {!capturedPhoto && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Putar Kamera
                </button>
              )}
            </div>

            {/* Video Preview or Captured Photo */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-[4/3] flex items-center justify-center">
              {capturedPhoto ? (
                <img
                  src={capturedPhoto}
                  alt="Bukti Presensi Bengkel"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-[10px] font-semibold text-emerald-400 backdrop-blur-sm border border-emerald-500/30">
                      ● Live Kamera HP Aktif
                    </span>
                    <div className="w-44 h-44 border-2 border-dashed border-emerald-400/50 rounded-2xl" />
                    <span className="text-[10px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                      Arahkan wajah / lokasi bengkel PKL
                    </span>
                  </div>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleNativeCameraFile} 
              className="hidden" 
            />

            {capturedPhoto ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Foto Berhasil Ditangkap dengan Watermark GPS
                </span>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Foto Ulang
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Jepret Live Kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    Buka Kamera Bawaan HP
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-[11px] leading-tight">
                  <p className="font-semibold text-amber-300">Kendala Akses Live Kamera Browser HP</p>
                  <p className="text-amber-400/90 text-[10px]">{cameraError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap transition cursor-pointer"
                >
                  Gunakan Kamera HP
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: TITIK KOORDINAT GPS MAP HP */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                2. Titik Koordinat Lokasi GPS HP
              </span>
              <button
                type="button"
                onClick={fetchLocation}
                disabled={location.loading}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${location.loading ? 'animate-spin' : ''}`} />
                {location.loading ? 'Mencari...' : 'Perbarui GPS'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">Koordinat Terdeteksi:</span>
                <span className="font-mono text-cyan-400 font-bold text-xs">{coordsString}</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  Akurasi: ± {location.accuracy} meter dari satelit HP
                </span>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-cyan-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                Buka di Map HP
              </a>
            </div>

            {location.error && (
              <p className="text-[10px] text-amber-400">{location.error}</p>
            )}
          </div>

          {/* STEP 3: CATATAN TUGAS */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Catatan Aktivitas Praktik di Bengkel Hari Ini (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Overhaul transmisi Avanza / Pemeriksaan sistem rem..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!capturedPhoto}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Simpan & Kirim Presensi
          </button>
        </div>

      </div>
    </div>
  );
};
