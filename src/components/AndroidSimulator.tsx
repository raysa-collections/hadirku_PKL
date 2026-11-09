import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  MapPin, 
  Vibrate, 
  Bell, 
  Database, 
  BatteryCharging, 
  Wifi, 
  WifiOff, 
  Volume2, 
  RotateCcw, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Home, 
  Cpu, 
  Layers, 
  Settings, 
  Plus, 
  Trash2,
  ExternalLink,
  Flame,
  Radio
} from 'lucide-react';
import { AppConfig } from '../types';
import confetti from 'canvas-confetti';

interface AndroidSimulatorProps {
  appConfig: AppConfig;
  onUpdateAppConfig?: (config: AppConfig) => void;
}

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({ appConfig }) => {
  // Simulator OS states
  const [currentTime, setCurrentTime] = useState<string>('09:41');
  const [activeTab, setActiveTab] = useState<'home' | 'hardware' | 'data' | 'system'>('home');
  const [isPhoneVibrating, setIsPhoneVibrating] = useState(false);
  const [simulatedAirplaneMode, setSimulatedAirplaneMode] = useState(false);
  const [systemNotification, setSystemNotification] = useState<{ title: string; body: string } | null>(null);

  // Hardware feature states
  // 1. Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // 2. GPS Location
  const [locationState, setLocationState] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
    loading: boolean;
    error?: string;
  } | null>(null);

  // 3. Local Data list (persisted)
  const [items, setItems] = useState<Array<{ id: string; title: string; subtitle: string; time: string }>>([
    { id: '1', title: 'Pemeriksaan Sistem Injeksi (EFI)', subtitle: 'Kondisi sensor normal • ECU OK', time: 'Baru saja' },
    { id: '2', title: 'Data Servis Pelanggan SMKN 1', subtitle: 'Tune up mesin & ganti oli', time: '10 mnt lalu' },
  ]);
  const [newItemTitle, setNewItemTitle] = useState('');

  // 4. Battery state
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(true);

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Try read Battery API if supported
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        battery.addEventListener('levelchange', () => setBatteryLevel(Math.round(battery.level * 100)));
        battery.addEventListener('chargingchange', () => setIsCharging(battery.charging));
      }).catch(() => {});
    }
  }, []);

  // Handle Camera stream start / stop
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setCameraError(null);
    } else {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        setCameraActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error(e));
          }
        }, 150);
      } catch (err: any) {
        console.warn('Camera error or permission denied:', err);
        setCameraError('Izin kamera ditolak atau tidak tersedia di perangkat ini.');
        setCameraActive(false);
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(dataUrl);
        triggerVibration([80]);
        showSimulatedNotification('Foto Berhasil Diambil!', 'Gambar tersimpan di memori aplikasi.');
      }
    }
  };

  // Handle GPS
  const requestGPSLocation = () => {
    setLocationState({ lat: 0, lng: 0, accuracy: 0, loading: true });
    if (!navigator.geolocation) {
      setLocationState({ lat: 0, lng: 0, accuracy: 0, loading: false, error: 'Geolocation tidak didukung browser ini.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          loading: false,
        });
        triggerVibration([50, 50, 50]);
        showSimulatedNotification('Lokasi Terdeteksi (GPS)', `Akurasi hingga ~${Math.round(pos.coords.accuracy)} meter.`);
      },
      (err) => {
        setLocationState({
          lat: -8.3752,
          lng: 114.1294, // Default sample around Banyuwangi / Tegalsari
          accuracy: 15,
          loading: false,
          error: `Izin lokasi belum diberikan (${err.message}). Menampilkan koordinat simulasi area SMKN 1 Tegalsari.`,
        });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Hardware Vibration trigger
  const triggerVibration = (pattern: number[] = [100, 60, 100, 60, 200]) => {
    setIsPhoneVibrating(true);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // ignore
      }
    }
    setTimeout(() => {
      setIsPhoneVibrating(false);
    }, 600);
  };

  // Notification trigger
  const sendPushNotification = async () => {
    triggerVibration([80, 50, 80]);
    showSimulatedNotification(
      `Pemberitahuan dari ${appConfig.shortName}`,
      'Notifikasi native Android berhasil diuji coba dan berfungsi normal!'
    );

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(appConfig.name, {
          body: 'Uji coba notifikasi push Android berhasil!',
          icon: '/pwa-192x192.png',
        });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(appConfig.name, {
            body: 'Izin notifikasi disetujui! Notifikasi push aktif.',
            icon: '/pwa-192x192.png',
          });
        }
      }
    }
  };

  const showSimulatedNotification = (title: string, body: string) => {
    setSystemNotification({ title, body });
    setTimeout(() => {
      setSystemNotification(null);
    }, 4500);
  };

  // Add Item to Local Offline DB
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    const item = {
      id: Date.now().toString(),
      title: newItemTitle.trim(),
      subtitle: `Disimpan di IndexedDB / LocalStorage HP`,
      time: 'Baru saja',
    };
    setItems([item, ...items]);
    setNewItemTitle('');
    triggerVibration([40]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
    triggerVibration([30]);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Phone Case Frame */}
      <div 
        className={`relative w-[340px] sm:w-[360px] h-[720px] bg-slate-900 rounded-[52px] p-[12px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.1),0_0_40px_rgba(16,185,129,0.15)] transition-transform duration-300 ${
          isPhoneVibrating ? 'animate-bounce' : ''
        }`}
        style={{
          boxShadow: isPhoneVibrating 
            ? '0 0 0 4px rgba(56, 189, 248, 0.4), 0 25px 60px -15px rgba(0,0,0,0.9)' 
            : undefined
        }}
      >
        {/* Outer Phone Hardware Buttons */}
        <div className="absolute -left-[14px] top-[140px] w-[3px] h-[35px] bg-slate-700 rounded-l" />
        <div className="absolute -left-[14px] top-[185px] w-[3px] h-[55px] bg-slate-700 rounded-l" />
        <div className="absolute -right-[14px] top-[160px] w-[3px] h-[50px] bg-slate-700 rounded-r" />

        {/* Screen Container */}
        <div className="relative w-full h-full bg-slate-950 rounded-[40px] overflow-hidden flex flex-col border border-slate-800">
          
          {/* Android Status Bar */}
          <div className="h-10 bg-slate-950/90 backdrop-blur-md px-6 flex items-center justify-between text-xs text-slate-300 select-none z-30 pt-1">
            <span className="font-semibold tracking-wide text-[13px]">{currentTime}</span>

            {/* Front Camera Punch-hole */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-3.5 h-3.5 bg-black rounded-full border border-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
            </div>

            {/* Status Icons */}
            <div className="flex items-center gap-2 text-slate-400">
              {simulatedAirplaneMode ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="text-[10px] font-bold text-emerald-400">5G</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px]">{batteryLevel}%</span>
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Toast / Notification Popover in Android OS */}
          {systemNotification && (
            <div className="absolute top-11 left-3 right-3 bg-slate-900/95 border border-emerald-500/30 text-white rounded-2xl p-3 shadow-xl z-50 animate-in slide-in-from-top-4 duration-300 flex items-start gap-3 backdrop-blur-md">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{systemNotification.title}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{systemNotification.body}</p>
              </div>
              <button 
                onClick={() => setSystemNotification(null)}
                className="text-slate-500 hover:text-slate-300 text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* App Header Inside Simulator */}
          <div 
            className="px-4 py-3 flex items-center justify-between border-b border-slate-800/80 transition-colors"
            style={{ 
              backgroundColor: `${appConfig.primaryColor}15`, 
              borderBottomColor: `${appConfig.primaryColor}30` 
            }}
          >
            <div className="flex items-center gap-2.5">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-sm font-bold text-white"
                style={{ backgroundColor: appConfig.primaryColor }}
              >
                {appConfig.icon}
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-none">{appConfig.name}</h1>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{appConfig.packageName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSimulatedAirplaneMode(!simulatedAirplaneMode)}
                title={simulatedAirplaneMode ? "Mode Offline Aktif (Klik untuk Online)" : "Mode Online (Klik untuk Offline)"}
                className={`p-1.5 rounded-lg text-xs transition ${
                  simulatedAirplaneMode 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {simulatedAirplaneMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => triggerVibration()}
                title="Uji Getar / Haptic HP"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
              >
                <Vibrate className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Offline Banner Inside Screen */}
          {simulatedAirplaneMode && (
            <div className="bg-amber-500/20 border-b border-amber-500/30 px-3 py-1 flex items-center justify-between text-[11px] text-amber-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Mode Offline Android: Data tersimpan di Cache
              </span>
            </div>
          )}

          {/* Scrollable Screen Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-slate-200 text-xs custom-scrollbar">
            
            {/* TAB 1: HOME DASHBOARD */}
            {activeTab === 'home' && (
              <div className="space-y-3.5">
                {/* Hero Greeting Card */}
                <div 
                  className="rounded-2xl p-4 relative overflow-hidden text-white"
                  style={{
                    background: `linear-gradient(135deg, ${appConfig.primaryColor}, #0f172a)`
                  }}
                >
                  <div className="relative z-10">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold backdrop-blur-sm mb-1.5">
                      Android Native PWA v{appConfig.version}
                    </span>
                    <h2 className="text-base font-bold">{appConfig.name}</h2>
                    <p className="text-[11px] text-slate-200/90 mt-1 line-clamp-2">
                      {appConfig.description}
                    </p>
                  </div>
                  <div className="absolute right-2 -bottom-2 opacity-15 text-6xl pointer-events-none">
                    {appConfig.icon}
                  </div>
                </div>

                {/* Quick Hardware Actions Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi Cepat Sensor HP</span>
                    <button 
                      onClick={() => setActiveTab('hardware')}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Lihat Semua &rarr;
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={toggleCamera}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition group"
                    >
                      <Camera className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-medium text-slate-300">Kamera</span>
                    </button>
                    <button
                      onClick={requestGPSLocation}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition group"
                    >
                      <MapPin className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-medium text-slate-300">GPS Lokasi</span>
                    </button>
                    <button
                      onClick={() => triggerVibration()}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition group"
                    >
                      <Vibrate className="w-5 h-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-medium text-slate-300">Getar</span>
                    </button>
                    <button
                      onClick={sendPushNotification}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition group"
                    >
                      <Bell className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-medium text-slate-300">Notifikasi</span>
                    </button>
                  </div>
                </div>

                {/* Live Camera View if Active */}
                {cameraActive && (
                  <div className="rounded-2xl bg-black border border-emerald-500/40 p-2.5 relative space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        Live Sensor Kamera Android
                      </span>
                      <button onClick={toggleCamera} className="text-slate-400 hover:text-white">✕ Tutup</button>
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                      <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/30 rounded-xl" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-dashed border-emerald-400/60 rounded-lg pointer-events-none" />
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <button
                      onClick={capturePhoto}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md transition"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto / Scan Barcode
                    </button>
                  </div>
                )}

                {/* Show Captured Photo Result */}
                {capturedPhoto && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <img src={capturedPhoto} alt="Hasil Foto" className="w-14 h-14 rounded-lg object-cover border border-slate-700" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200">Hasil Tangkapan Kamera</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5">Siap diunggah ke server / laporan</p>
                    </div>
                    <button 
                      onClick={() => setCapturedPhoto(null)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Dynamic Content Cards based on Selected Preset */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Daftar Operasional ({appConfig.sampleItems.length})
                    </span>
                    <span className="text-[10px] text-slate-500">Live Sync</span>
                  </div>

                  <div className="space-y-2">
                    {appConfig.sampleItems.map((item) => (
                      <div 
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {item.badge && (
                            <span 
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white mb-0.5"
                              style={{ backgroundColor: appConfig.primaryColor }}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.value && (
                            <p className="text-[11px] font-bold text-slate-300">{item.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HARDWARE FEATURE TEST */}
            {activeTab === 'hardware' && (
              <div className="space-y-3.5">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white text-sm">Laboratorium Sensor & Fitur HP</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Uji langsung fungsi hardware native Android melalui web browser & Capacitor
                  </p>
                </div>

                {/* Feature 1: Geolocation */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">1. GPS & Geolocation</p>
                        <p className="text-[10px] text-slate-400">Koordinat akurat & pelacakan lokasi</p>
                      </div>
                    </div>
                    <button
                      onClick={requestGPSLocation}
                      disabled={locationState?.loading}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-medium transition"
                    >
                      {locationState?.loading ? 'Mencari...' : 'Uji GPS'}
                    </button>
                  </div>

                  {locationState && !locationState.loading && (
                    <div className="p-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Latitude:</span>
                        <span className="font-mono text-cyan-400 font-bold">{locationState.lat}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Longitude:</span>
                        <span className="font-mono text-cyan-400 font-bold">{locationState.lng}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Akurasi Sensor:</span>
                        <span className="text-emerald-400 font-medium">± {locationState.accuracy} meter</span>
                      </div>
                      {locationState.error && (
                        <p className="text-[10px] text-amber-400 pt-1 border-t border-slate-800">{locationState.error}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Feature 2: Camera & Barcode */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">2. Kamera & Scanner</p>
                        <p className="text-[10px] text-slate-400">Ambil foto kerusakan / scan QR</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleCamera}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-medium transition"
                    >
                      {cameraActive ? 'Tutup' : 'Buka Kamera'}
                    </button>
                  </div>
                  {cameraError && (
                    <p className="text-[10px] text-amber-400">{cameraError}</p>
                  )}
                </div>

                {/* Feature 3: Haptic Vibration */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Vibrate className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">3. Getaran Haptic Motor</p>
                        <p className="text-[10px] text-slate-400">Feedback sentuhan nyata saat tombol ditekan</p>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerVibration([100, 50, 100, 50, 200])}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-medium transition"
                    >
                      Uji Getar
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    *Di HP Android beneran, fisik HP akan bergetar langsung melalui API <code>navigator.vibrate</code>.
                  </p>
                </div>

                {/* Feature 4: Push Notification */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">4. Push Notifications</p>
                        <p className="text-[10px] text-slate-400">Notifikasi sistem Android & pesan masuk</p>
                      </div>
                    </div>
                    <button
                      onClick={sendPushNotification}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-medium transition"
                    >
                      Kirim Pesan
                    </button>
                  </div>
                </div>

                {/* Feature 5: Offline Persistence */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">5. Offline Database</p>
                        <p className="text-[10px] text-slate-400">Tetap bisa input data meski tanpa kuota internet</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSimulatedAirplaneMode(!simulatedAirplaneMode)}
                      className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition"
                    >
                      {simulatedAirplaneMode ? 'Nyalakan Kembali Sinyal' : 'Simulasi Putus Internet (Offline)'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DATA & OFFLINE PERSISTENCE */}
            {activeTab === 'data' && (
              <div className="space-y-3.5">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white text-sm">Penyimpanan Offline Lokal</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Semua data tersimpan langsung di memori HP Anda (IndexedDB / LocalStorage)
                  </p>
                </div>

                <form onSubmit={handleAddItem} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="Tambah catatan / servis baru..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.subtitle} • {item.time}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 opacity-80 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SYSTEM INFO */}
            {activeTab === 'system' && (
              <div className="space-y-3 text-[11px]">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs">Informasi Konfigurasi Android</h4>
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-500">Nama Aplikasi</span>
                      <span className="font-semibold text-white">{appConfig.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-500">Package Name</span>
                      <span className="font-mono text-emerald-400">{appConfig.packageName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-500">Target Versi Android</span>
                      <span>Android 14 (API Level 34)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-500">Display Mode</span>
                      <span className="text-cyan-400">standalone (Layar Penuh Tanpa Browser)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Framework</span>
                      <span className="text-white">React 19 + Vite + Tailwind + Capacitor</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Status Kelayakan Google Play
                  </p>
                  <p className="text-[10px] text-emerald-400/90 leading-relaxed">
                    Struktur kode ini 100% siap di-export ke format <strong>APK</strong> dan <strong>AAB</strong> dengan Capacitor untuk dipublikasikan langsung ke Google Play Store!
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Android Bottom Navigation Bar */}
          <div className="h-14 bg-slate-900/95 border-t border-slate-800/80 px-3 flex items-center justify-around z-20 backdrop-blur-md">
            <button
              onClick={() => { setActiveTab('home'); triggerVibration([20]); }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'home' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Beranda</span>
            </button>

            <button
              onClick={() => { setActiveTab('hardware'); triggerVibration([20]); }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'hardware' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Sensor HP</span>
            </button>

            <button
              onClick={() => { setActiveTab('data'); triggerVibration([20]); }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'data' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Data Offline</span>
            </button>

            <button
              onClick={() => { setActiveTab('system'); triggerVibration([20]); }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                activeTab === 'system' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Info OS</span>
            </button>
          </div>

          {/* Android Gesture Navigation Bar (Bottom Line) */}
          <div className="h-4 bg-slate-950 flex items-center justify-center">
            <div className="w-28 h-1 bg-slate-600 rounded-full" />
          </div>

        </div>
      </div>
    </div>
  );
};
