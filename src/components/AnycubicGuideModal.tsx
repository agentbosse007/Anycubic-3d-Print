import React from 'react';
import { X, CheckCircle, Zap, Shield, Sparkles, Layers } from 'lucide-react';

interface AnycubicGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnycubicGuideModal: React.FC<AnycubicGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Anycubic Kobra 3 & ACE Pro Multi-Color Guide
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High-speed multi-material 3D printing architecture (up to 8 colors)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs text-slate-300">
          {/* Printer Hero Image */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src="/src/assets/images/kobra_ace_pro_printer_1790694397542.jpg"
              alt="Anycubic Kobra 3 with ACE Pro 8-Color System"
              referrerPolicy="no-referrer"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex items-end p-4">
              <div>
                <span className="font-brand font-bold text-white text-base">Anycubic Kobra 3 Combo</span>
                <span className="text-cyan-400 text-xs block font-mono">600 mm/s · 20,000 mm/s² Acceleration · ACE Pro 8-Color Daisy Chain</span>
              </div>
            </div>
          </div>

          {/* Key Architectural Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Zap className="w-4 h-4" />
                <span>Anycubic Color Engine Pro (ACE Pro)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Connects up to two ACE Pro units via serial bus to switch seamlessly between 8 filament colors. Built-in active dual PTC heating elements dry filament while printing.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Layers className="w-4 h-4" />
                <span>Flushing & Purge Optimization</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                ChromaForge pre-computes pigment transition thresholds. By purging into infill and supports, color-change waste is reduced by up to 55%.
              </p>
            </div>
          </div>

          {/* Slicing Step-by-Step */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-2">
            <span className="font-semibold text-white">How to Print on Your Anycubic Kobra:</span>
            <div className="space-y-2 text-slate-400 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-900/60 text-cyan-400 flex items-center justify-center shrink-0 font-mono font-bold text-[10px]">1</span>
                <span>Generate your 3D model with Ollama or select a high-fidelity preset.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-900/60 text-cyan-400 flex items-center justify-center shrink-0 font-mono font-bold text-[10px]">2</span>
                <span>Click <strong>"Export Anycubic .3MF"</strong> to download a production file with pre-assigned material IDs.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-900/60 text-cyan-400 flex items-center justify-center shrink-0 font-mono font-bold text-[10px]">3</span>
                <span>Open in Anycubic Slicer Next or OrcaSlicer, verify toolhead clearance, and send to your Kobra 3 or Kobra X!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Got it, Back to Studio
          </button>
        </div>
      </div>
    </div>
  );
};
