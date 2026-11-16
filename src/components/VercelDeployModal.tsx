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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-slate-900 my-6 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 via-blue-600 to-emerald-600" />
        
        {/* Toast */}
        {toastMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 mb-3 mt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 shrink-0 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">Panduan Deployment ke Vercel (vercel.app)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready for Production
                </span>
              </div>
              <p className="text-xs text-slate-600">Konfigurasi otomatis & langkah mempublikasikan aplikasi secara online secara gratis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'cli'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Terminal className={`w-3.5 h-3.5 ${activeTab === 'cli' ? 'text-white' : 'text-blue-600'}`} />
            <span>Cara 1: Vercel CLI (Cepat)</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'github'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Github className={`w-3.5 h-3.5 ${activeTab === 'github' ? 'text-white' : 'text-amber-600'}`} />
            <span>Cara 2: via GitHub</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'config'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileCode className={`w-3.5 h-3.5 ${activeTab === 'config' ? 'text-white' : 'text-emerald-600'}`} />
            <span>File vercel.json</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto flex-1 space-y-4 text-xs pr-1">

          {/* TAB 1: VERCEL CLI */}
          {activeTab === 'cli' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Deployment Langsung melalui Vercel CLI (Metode Tercepat)
                </span>
                <p className="text-blue-900 leading-relaxed">
                  Anda dapat mempublikasikan aplikasi ini ke URL domain gratis <strong className="text-slate-900">hadirku-pkl-tkr-smkn1.vercel.app</strong> langsung dari terminal komputer Anda hanya dengan satu perintah.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="font-bold text-slate-900 block">Langkah 1: Jalankan Perintah Deploy Vercel</span>
                  <p className="text-slate-600">Buka terminal di folder project aplikasi, lalu jalankan perintah berikut:</p>
                  
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 font-mono text-blue-700 font-bold flex items-center justify-between">
                    <code>npx vercel</code>
                    <button
                      onClick={() => copyToClipboard(cliCommandContent, 'cli')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-sans font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      {copiedCliCommand ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCliCommand ? 'Tersalin' : 'Salin Perintah'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900 block">Langkah 2: Konfirmasi Pertanyaan Vercel CLI</span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                    <li>Tekan <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-900">Enter</kbd> untuk mengonfirmasi Set up and deploy.</li>
                    <li>Pilih akun Vercel Anda.</li>
                    <li>Link to existing project? ketik <code className="font-mono text-blue-700 font-bold">N</code>.</li>
                    <li>Project name? Masukkan nama aplikasi Anda (contoh: <code className="font-mono text-blue-700 font-bold">hadirku-pkl-tkr-smkn1</code>).</li>
                    <li>In which directory is your code located? tekan <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-900">Enter</kbd> (folder default <code className="font-mono text-slate-900">./</code>).</li>
                    <li>Want to modify these settings? ketik <code className="font-mono text-blue-700 font-bold">N</code> (karena file <code className="font-mono text-emerald-700 font-bold">vercel.json</code> sudah terkonfigurasi otomatis).</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block">Langkah 3: Untuk Deployment Production Resmi</span>
                  <p className="text-slate-600">Jalankan perintah berikut untuk mempublikasikan langsung ke domain production utama:</p>
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 font-mono text-emerald-700 font-bold">
                    npx vercel --prod
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB INTEGRATION */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-amber-600" />
                  Deployment Otomatis via Repositori GitHub
                </span>
                <p className="text-amber-900 leading-relaxed">
                  Dengan menghubungkan repositori GitHub Anda ke Vercel, setiap perubahan kode yang Anda push akan secara otomatis dideploy ke domain vercel.app.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block">1. Push Kode ke GitHub</span>
                  <p className="text-slate-600">Upload folder project ini ke repositori baru di akun GitHub Anda.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block">2. Buka Vercel Dashboard</span>
                  <p className="text-slate-600">
                    Akses <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold inline-flex items-center gap-1">vercel.com/new <ExternalLink className="w-3 h-3" /></a> lalu klik <strong>Import GitHub Repository</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block">3. Pengaturan Build & Deploy</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>Framework Preset: <strong className="text-slate-900 font-mono">Vite</strong></li>
                    <li>Build Command: <strong className="text-slate-900 font-mono">npm run build</strong></li>
                    <li>Output Directory: <strong className="text-slate-900 font-mono">dist</strong></li>
                  </ul>
                  <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                    ✓ File <code className="font-mono">vercel.json</code> yang sudah disediakan di akar folder project akan menangani routing SPA (Single Page Application) secara otomatis di Vercel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURATION FILE VERCEL.JSON */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-slate-900">File Konfigurasi: vercel.json</h4>
                  <p className="text-slate-600 text-[11px]">Telah dibuat di folder akar project untuk mendukung routing Vite SPA</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(vercelJsonContent, 'json')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    {copiedVercelJson ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedVercelJson ? 'Tersalin' : 'Salin JSON'}</span>
                  </button>

                  <button
                    onClick={() => downloadFile(vercelJsonContent, 'vercel.json', 'application/json')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Unduh</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 font-mono text-xs text-slate-900 overflow-x-auto leading-relaxed">
                <pre>{vercelJsonContent}</pre>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-3">
                <span className="font-bold text-blue-800 flex items-center gap-1.5 text-xs">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  KUNCI MULTI-USER: Cara Agar Presensi Seluruh Siswa Otomatis Terdata
                </span>
                <p className="leading-relaxed text-[11px]">
                  Saat di-onlinekan di Vercel, penyimpanan lokal browser (localStorage) di HP siswa terpisah dari laptop admin. Agar presensi yang dilakukan siswa dari HP masing-masing <strong>langsung masuk ke aplikasi dan Google Spreadsheet</strong>:
                </p>
                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-blue-200">
                    <strong className="text-emerald-700 block mb-0.5">Opsi 1 (Sangat Mudah via WhatsApp):</strong>
                    Buka tab <em>"Sinkron Jendela Siswa & Code.gs"</em> &gt; klik <em>"Salin Pesan & Link WhatsApp"</em>. Kirimkan ke grup siswa. Ketika siswa membukanya, HP mereka otomatis terhubung 100%!
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-blue-200">
                    <strong className="text-blue-700 block mb-0.5">Opsi 2 (Permanen di Vercel):</strong>
                    Buka proyek Anda di <strong className="text-slate-900">vercel.com</strong> &gt; menu <strong>Settings</strong> &gt; <strong>Environment Variables</strong>. Tambahkan variabel:
                    <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1 font-mono text-[10px]">
                      <li>Key: <span className="text-emerald-700 font-bold">VITE_GOOGLE_APPS_SCRIPT_URL</span></li>
                      <li>Value: <span className="text-blue-700 font-bold">URL Web App Google Apps Script Anda</span></li>
                    </ul>
                    Lalu klik <strong>Deployments &gt; Redeploy</strong>. Dengan cara ini, semua siswa yang mengakses domain vercel.app akan otomatis tersambung tanpa perlu link khusus!
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-3 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-600 hover:text-blue-600 font-semibold flex items-center gap-1 transition"
          >
            <span>Buka situs Vercel.com</span>
            <ExternalLink className="w-3 h-3 text-blue-600" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>

      </div>
    </div>
  );
};
