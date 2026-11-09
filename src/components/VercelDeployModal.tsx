import React, { useState } from 'react';
import { 
  Globe, 
  Terminal, 
  Github, 
  Copy, 
  Check, 
  Download, 
  X, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  FileCode,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VercelDeployModalProps {
  onClose: () => void;
}

export const VercelDeployModal: React.FC<VercelDeployModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'cli' | 'github' | 'config'>('cli');
  const [copiedVercelJson, setCopiedVercelJson] = useState(false);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const vercelJsonContent = JSON.stringify({
    "version": 2,
    "framework": "vite",
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }, null, 2);

  const cliCommandContent = `npx vercel`;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const copyToClipboard = (text: string, type: 'json' | 'cli') => {
    navigator.clipboard.writeText(text);
    if (type === 'json') {
      setCopiedVercelJson(true);
      setTimeout(() => setCopiedVercelJson(false), 3000);
    } else {
      setCopiedCliCommand(true);
      setTimeout(() => setCopiedCliCommand(false), 3000);
    }
    confetti({ particleCount: 30, spread: 50 });
    showToast('Teks berhasil disalin ke clipboard!');
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`File ${fileName} berhasil diunduh!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[92vh] flex flex-col">
        
        {/* Toast */}
        {toastMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-black via-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center text-white shadow-md">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Panduan Deployment ke Vercel (vercel.app)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Ready for Production
                </span>
              </div>
              <p className="text-xs text-slate-400">Konfigurasi otomatis & langkah mempublikasikan aplikasi secara online secara gratis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'cli'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-300" />
            <span>Cara 1: Vercel CLI (Cepat)</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'github'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Github className="w-3.5 h-3.5 text-purple-300" />
            <span>Cara 2: via GitHub</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-300" />
            <span>File vercel.json</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto flex-1 space-y-4 text-xs pr-1">

          {/* TAB 1: VERCEL CLI */}
          {activeTab === 'cli' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Deployment Langsung melalui Vercel CLI (Metode Tercepat)
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Anda dapat mempublikasikan aplikasi ini ke URL domain gratis <strong className="text-white">nama-app.vercel.app</strong> langsung dari terminal komputer Anda hanya dengan satu perintah.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <span className="font-bold text-white block">Langkah 1: Jalankan Perintah Deploy Vercel</span>
                  <p className="text-slate-400">Buka terminal di folder project aplikasi, lalu jalankan perintah berikut:</p>
                  
                  <div className="p-3 rounded-xl bg-black border border-slate-800 font-mono text-cyan-300 flex items-center justify-between">
                    <code>npx vercel</code>
                    <button
                      onClick={() => copyToClipboard(cliCommandContent, 'cli')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-sans flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedCliCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCliCommand ? 'Tersalin' : 'Salin Perintah'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300 leading-relaxed">
                  <span className="font-bold text-white block">Langkah 2: Konfirmasi Pertanyaan Vercel CLI</span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                    <li>Tekan <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">Enter</kbd> untuk mengonfirmasi Set up and deploy.</li>
                    <li>Pilih akun Vercel Anda.</li>
                    <li>Link to existing project? ketik <code className="font-mono text-cyan-300">N</code>.</li>
                    <li>Project name? Masukkan nama aplikasi Anda (contoh: <code className="font-mono text-cyan-300">absensi-pkl-smkn1tegalsari</code>).</li>
                    <li>In which directory is your code located? tekan <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">Enter</kbd> (folder default <code className="font-mono text-white">./</code>).</li>
                    <li>Want to modify these settings? ketik <code className="font-mono text-cyan-300">N</code> (karena file <code className="font-mono text-emerald-300">vercel.json</code> sudah terkonfigurasi otomatis).</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white block">Langkah 3: Untuk Deployment Production Resmi</span>
                  <p className="text-slate-400">Jalankan perintah berikut untuk mempublikasikan langsung ke domain production utama:</p>
                  <div className="p-3 rounded-xl bg-black border border-slate-800 font-mono text-emerald-400">
                    npx vercel --prod
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB INTEGRATION */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-purple-400" />
                  Deployment Otomatis via Repositori GitHub
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Dengan menghubungkan repositori GitHub Anda ke Vercel, setiap perubahan kode yang Anda push akan secara otomatis dideploy ke domain vercel.app.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white block">1. Push Kode ke GitHub</span>
                  <p className="text-slate-400">Upload folder project ini ke repositori baru di akun GitHub Anda.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white block">2. Buka Vercel Dashboard</span>
                  <p className="text-slate-400">
                    Akses <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold flex items-center gap-1 inline-flex">vercel.com/new <ExternalLink className="w-3 h-3" /></a> lalu klik <strong>Import GitHub Repository</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white block">3. Pengaturan Build & Deploy</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>Framework Preset: <strong className="text-white font-mono">Vite</strong></li>
                    <li>Build Command: <strong className="text-white font-mono">npm run build</strong></li>
                    <li>Output Directory: <strong className="text-white font-mono">dist</strong></li>
                  </ul>
                  <p className="text-[11px] text-emerald-400 pt-1">
                    ✓ File <code className="font-mono">vercel.json</code> yang sudah disediakan di akar folder project akan menangani routing SPA (Single Page Application) secara otomatis di Vercel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURATION FILE VERCEL.JSON */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">File Konfigurasi: vercel.json</h4>
                  <p className="text-slate-400 text-[11px]">Telah dibuat di folder akar project untuk mendukung routing Vite SPA</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(vercelJsonContent, 'json')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedVercelJson ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedVercelJson ? 'Tersalin' : 'Salin JSON'}</span>
                  </button>

                  <button
                    onClick={() => downloadFile(vercelJsonContent, 'vercel.json', 'application/json')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Unduh</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed">
                <pre>{vercelJsonContent}</pre>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-950/50 border border-blue-500/30 text-slate-300 text-xs space-y-1.5">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" /> Catatan Penting Setelah Deploy di Vercel:
                </span>
                <p>
                  Setelah domain <strong className="text-white">https://nama-aplikasi.vercel.app</strong> Anda aktif, masuk ke menu Pembimbing di aplikasi lalu pastikan URL Web App Google Apps Script (<code className="font-mono text-cyan-300">https://script.google.com/.../exec</code>) sudah tersimpan agar sinkronisasi Google Spreadsheet tetap berjalan 100% online!
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>Buka situs Vercel.com</span>
            <ExternalLink className="w-3 h-3 text-cyan-400" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>

      </div>
    </div>
  );
};
