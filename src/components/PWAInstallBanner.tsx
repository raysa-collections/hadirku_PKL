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
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 shadow-xs">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Aplikasi sedang berjalan dalam <strong>Mode Standalone Native Android</strong>.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              Install Aplikasi ini di HP Android Anda
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                PWA Aktif
              </span>
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Dapat langsung dipasang ke Layar Utama HP tanpa Google Play Store (Gratis, Layar Penuh, & Siap Offline).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Pasang ke HP Sekarang
            </button>
          ) : (
            <button
              onClick={() => setShowGuide(true)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-blue-600" />
              Cara Pasang di HP
            </button>
          )}
        </div>
      </div>

      {/* Installation Guide Modal for Android & iOS */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Cara Install Aplikasi di HP Android
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <span className="font-bold text-emerald-800 block">Melalui Google Chrome di HP Android:</span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                  <li>Buka link aplikasi ini di browser <strong>Chrome HP Android</strong>.</li>
                  <li>Ketuk ikon titik tiga (<strong>⋮</strong>) di pojok kanan atas browser.</li>
                  <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                  <li>Ikon aplikasi akan otomatis muncul di menu HP Anda!</li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <span className="font-bold text-blue-800 block">Khusus iPhone / iPad (Safari):</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    <li>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah atas).</li>
                    <li>Geser ke bawah dan pilih <strong>"Add to Home Screen"</strong>.</li>
                  </ol>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </>
  );
};
