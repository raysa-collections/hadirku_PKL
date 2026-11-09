import React, { useState } from 'react';
import { AppConfig } from '../types';
import { 
  Download, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  FolderDown, 
  Code2, 
  Smartphone, 
  Layers, 
  ShieldCheck,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExportAPKGuideProps {
  appConfig: AppConfig;
}

export const ExportAPKGuide: React.FC<ExportAPKGuideProps> = ({ appConfig }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const capacitorConfig = `{
  "appId": "${appConfig.packageName}",
  "appName": "${appConfig.name}",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#0f172a"
    }
  }
}`;

  const steps = [
    {
      title: 'Langkah 1: Build file aset produksi web',
      cmd: 'npm run build',
      desc: 'Perintah ini akan mengompilasi seluruh file React & Tailwind menjadi folder /dist yang siap dijalankan di Android.',
    },
    {
      title: 'Langkah 2: Tambahkan Capacitor Android',
      cmd: 'npm install @capacitor/core @capacitor/cli @capacitor/android',
      desc: 'Capacitor adalah teknologi resmi dari Ionic untuk mengubah web app modern menjadi APK Android native.',
    },
    {
      title: 'Langkah 3: Inisialisasi Proyek Android',
      cmd: `npx cap init "${appConfig.name}" "${appConfig.packageName}" --web-dir dist`,
      desc: 'Membuat konfigurasi dasar dengan nama dan package ID aplikasi Anda.',
    },
    {
      title: 'Langkah 4: Generate Proyek Android Studio',
      cmd: 'npx cap add android',
      desc: 'Membuat folder asli /android lengkap dengan Gradle, AndroidManifest.xml, dan resource native.',
    },
    {
      title: 'Langkah 5: Buka di Android Studio & Buat APK',
      cmd: 'npx cap open android',
      desc: 'Android Studio akan terbuka otomatis. Cukup klik menu "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"!',
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleDownloadCapacitorConfig = () => {
    const blob = new Blob([capacitorConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capacitor.config.json';
    a.click();
    URL.revokeObjectURL(url);
    confetti({ particleCount: 30, spread: 50 });
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">
            Cara Membuat File APK Android dari Proyek Ini
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Semua kode di aplikasi ini dirancang modular sehingga 100% kompatibel dengan <strong>Capacitor</strong>. Anda dapat meng-export proyek ini dan langsung mengompilasinya menjadi file <strong>.APK</strong> siap instal di HP Android manapun.
        </p>
      </div>

      {/* Step by step terminal commands */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          5 Langkah Mudah Menghasilkan APK Android
        </h4>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{step.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  Step {idx + 1}/5
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{step.desc}</p>
              
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2">
                <code className="text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre">
                  {step.cmd}
                </code>
                <button
                  onClick={() => handleCopy(step.cmd, idx)}
                  className="ml-2 p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                  title="Salin Perintah"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capacitor Config File Generator */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-white">File <code>capacitor.config.json</code> Otomatis</span>
          </div>
          <button
            onClick={handleDownloadCapacitorConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Config
          </button>
        </div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
          <pre>{capacitorConfig}</pre>
        </div>
      </div>
    </div>
  );
};
