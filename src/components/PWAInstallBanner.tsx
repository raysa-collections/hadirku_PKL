import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, CheckCircle, Info, Share, PlusSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      confetti({ particleCount: 70, spread: 80 });
    }
  };

  // If already running inside standalone PWA mode on phone or desktop
  if (isInstalled) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Aplikasi sedang berjalan dalam <strong>Mode Standalone Native Android</strong>.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              Install Aplikasi ini di HP Android Anda
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PWA Aktif
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dapat langsung dipasang ke Layar Utama HP tanpa Google Play Store (Gratis, Layar Penuh, & Siap Offline).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-emerald-500/25 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Pasang ke HP Sekarang
            </button>
          ) : (
            <button
              onClick={() => setShowGuide(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              Cara Pasang di HP
            </button>
          )}
        </div>
      </div>

      {/* Installation Guide Modal for Android & iOS */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Cara Install Aplikasi di HP Android
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 block">Melalui Google Chrome di HP Android:</span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Buka link aplikasi ini di browser <strong>Chrome HP Android</strong>.</li>
                  <li>Ketuk ikon titik tiga (<strong>⋮</strong>) di pojok kanan atas browser.</li>
                  <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                  <li>Ikon aplikasi akan otomatis muncul di menu HP Anda!</li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-400 block">Khusus iPhone / iPad (Safari):</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah atas).</li>
                    <li>Geser ke bawah dan pilih <strong>"Add to Home Screen"</strong>.</li>
                  </ol>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </>
  );
};
