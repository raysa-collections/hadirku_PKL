import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download } from 'lucide-react';

interface QrShareBoxProps {
  url: string;
  title?: string;
}

export const QrShareBox: React.FC<QrShareBoxProps> = ({ url, title = 'Scan QR Code dari HP Siswa' }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!url) {
      setDataUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(url, {
      width: 220,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((resUrl) => {
        if (active) setDataUrl(resUrl);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [url]);

  if (!url || !dataUrl) return null;

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'QR_Presensi_PKL_TKR_SMKN1.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
      <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
        <img src={dataUrl} alt="QR Code Tautan Presensi PKL" className="w-28 h-28 object-contain" />
      </div>
      <div className="space-y-2 text-center sm:text-left min-w-0 flex-1">
        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-900">
          <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{title}</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Siswa cukup memindai QR Code ini dengan kamera HP untuk membuka portal presensi yang langsung terhubung ke Google Spreadsheet sekolah.
        </p>
        <button
          type="button"
          onClick={handleDownloadQr}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>Simpan Gambar QR (.png)</span>
        </button>
      </div>
    </div>
  );
};
