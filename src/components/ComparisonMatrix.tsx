import React from 'react';
import { Check, X, Smartphone, Globe, Sparkles, HelpCircle } from 'lucide-react';

export const ComparisonMatrix: React.FC = () => {
  const comparisons = [
    {
      feature: 'Bisa Diinstall di Layar Utama HP Android',
      pwa: true,
      pwaNote: 'Bisa via Chrome / Browser',
      capacitor: true,
      capacitorNote: 'File .APK atau Play Store',
      native: true,
      nativeNote: 'File .APK atau Play Store',
    },
    {
      feature: 'Tampilan Full-Screen Tanpa Address Bar',
      pwa: true,
      pwaNote: 'Standalone Mode',
      capacitor: true,
      capacitorNote: 'Native Window',
      native: true,
      nativeNote: 'Native Activity',
    },
    {
      feature: 'Bekerja Tanpa Internet (Offline Cache)',
      pwa: true,
      pwaNote: 'Service Worker & Cache',
      capacitor: true,
      capacitorNote: 'Aset lokal di dalam APK',
      native: true,
      nativeNote: 'Aset lokal di dalam APK',
    },
    {
      feature: 'Akses Hardware (Kamera, GPS, Getar, Notifikasi)',
      pwa: true,
      pwaNote: 'Web APIs modern',
      capacitor: true,
      capacitorNote: 'Plugin Native + Web APIs',
      native: true,
      nativeNote: 'Akses 100% langsung OS',
    },
    {
      feature: 'Biaya Publikasi / Pembuatan',
      pwa: true,
      pwaNote: 'GRATIS (Rp 0)',
      capacitor: true,
      capacitorNote: 'Gratis APK, $25 Play Store (opsional)',
      native: false,
      nativeNote: '$25 akun Google Play + IDE kompleks',
    },
    {
      feature: 'Kemudahan Update Versi Baru',
      pwa: true,
      pwaNote: 'Instan otomatis saat buka web',
      capacitor: true,
      capacitorNote: 'Bisa Live Update / Play Store',
      native: false,
      nativeNote: 'User harus download ulang APK baru',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Perbandingan 3 Metode Membuat Aplikasi Android
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih metode yang paling cocok dengan kebutuhan sekolah, bengkel, atau bisnis Anda
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
              <th className="p-3.5 font-semibold">Fitur / Kemampuan</th>
              <th className="p-3.5 font-semibold text-emerald-400">
                1. PWA (Web to Android)
                <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Metode Tercepat</span>
              </th>
              <th className="p-3.5 font-semibold text-cyan-400">
                2. Capacitor (.APK)
                <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Untuk Play Store</span>
              </th>
              <th className="p-3.5 font-semibold text-purple-400">
                3. Native Kotlin
                <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Android Studio Murni</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {comparisons.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition">
                <td className="p-3.5 font-medium text-white">{item.feature}</td>
                <td className="p-3.5">
                  <div className="flex items-start gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] text-emerald-300 font-medium">Bisa</span>
                      <p className="text-[10px] text-slate-400">{item.pwaNote}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="flex items-start gap-1.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] text-cyan-300 font-medium">Bisa</span>
                      <p className="text-[10px] text-slate-400">{item.capacitorNote}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3.5">
                  <div className="flex items-start gap-1.5">
                    {item.native ? (
                      <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-[11px] text-purple-300 font-medium">{item.native ? 'Bisa' : 'Lebih Rumit'}</span>
                      <p className="text-[10px] text-slate-400">{item.nativeNote}</p>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5">
        <p className="font-semibold text-white flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          Rekomendasi Kami:
        </p>
        <p className="text-slate-400 leading-relaxed">
          Gunakan <strong>Metode PWA + Capacitor</strong> (seperti di app ini). Anda bisa langsung membagikan link ke siswa/karyawan untuk di-install gratis dalam 5 detik, dan jika nanti ingin dipajang di Google Play Store, tinggal jalankan perintah Capacitor untuk menghasilkan file APK resminya!
        </p>
      </div>
    </div>
  );
};
