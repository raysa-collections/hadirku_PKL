import React from 'react';
import { AppConfig, PRESET_APPS } from '../types';
import { Sparkles, Palette, Wrench, ShoppingBag, GraduationCap, Check, Layers, Sliders, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AndroidBuilderProps {
  appConfig: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
}

export const AndroidBuilder: React.FC<AndroidBuilderProps> = ({ appConfig, onUpdateConfig }) => {
  const handleSelectPreset = (presetId: string) => {
    const selected = PRESET_APPS.find(p => p.id === presetId);
    if (selected) {
      onUpdateConfig({ ...selected.config });
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  const handleColorChange = (color: string) => {
    onUpdateConfig({
      ...appConfig,
      primaryColor: color,
    });
  };

  const handleIconChange = (icon: string) => {
    onUpdateConfig({
      ...appConfig,
      icon,
    });
  };

  const colorPalettes = [
    { label: 'Otomotif Blue', hex: '#0284c7' },
    { label: 'Android Green', hex: '#10b981' },
    { label: 'Purple Pro', hex: '#7c3aed' },
    { label: 'Amber Racing', hex: '#f59e0b' },
    { label: 'Crimson Power', hex: '#e11d48' },
    { label: 'Dark Cyan', hex: '#0891b2' },
  ];

  const iconOptions = ['🔧', '🚗', '⚡', '💳', '🎓', '📦', '📊', '🛡️', '⚙️', '📱'];

  return (
    <div className="space-y-6">
      {/* Preset Quick Chooser */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Pilih Konsep Aplikasi Siap Pakai
            </h3>
          </div>
          <span className="text-xs text-slate-400">3 Preset Populer</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_APPS.map((preset) => {
            const isSelected = appConfig.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-3.5 rounded-2xl text-left border transition relative flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-slate-800/90 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
                <div className="flex items-center gap-2.5 mb-2">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
                    style={{ backgroundColor: `${preset.config.primaryColor}25`, border: `1px solid ${preset.config.primaryColor}50` }}
                  >
                    {preset.config.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{preset.title}</h4>
                    <span className="text-[10px] font-mono text-slate-400">{preset.config.shortName}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {preset.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customizer Settings Form */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Sesuaikan Identitas Aplikasi Android Anda</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nama Lengkap Aplikasi (Display Title)
            </label>
            <input
              type="text"
              value={appConfig.name}
              onChange={(e) => onUpdateConfig({ ...appConfig, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
              placeholder="Contoh: Bengkel TKR AutoPro"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Package Name Android (ID Unik Play Store)
            </label>
            <input
              type="text"
              value={appConfig.packageName}
              onChange={(e) => onUpdateConfig({ ...appConfig, packageName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
              placeholder="com.smkn1tegalsari.app"
            />
          </div>
        </div>

        {/* Color & Icon Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              Tema Warna Material You Android
            </label>
            <div className="flex flex-wrap gap-2">
              {colorPalettes.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => handleColorChange(c.hex)}
                  className={`w-7 h-7 rounded-full transition flex items-center justify-center ${
                    appConfig.primaryColor === c.hex 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' 
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {appConfig.primaryColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              Ikon Logo Aplikasi
            </label>
            <div className="flex flex-wrap gap-1.5">
              {iconOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleIconChange(emoji)}
                  className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition ${
                    appConfig.icon === emoji
                      ? 'bg-slate-700 border-2 border-emerald-400 scale-110 shadow-sm'
                      : 'bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
