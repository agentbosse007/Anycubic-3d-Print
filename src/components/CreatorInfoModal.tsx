import React from 'react';
import { X, Sparkles, Shield, Cpu, Layers, ExternalLink, Heart, Box } from 'lucide-react';
import type { SupportedLanguage } from '../utils/i18n';
import { TRANSLATIONS } from '../utils/i18n';

interface CreatorInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
}

export const CreatorInfoModal: React.FC<CreatorInfoModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[lang] || TRANSLATIONS.sv;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient badge */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 text-xs font-bold font-mono tracking-wider rounded-full border border-cyan-500/40 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.madeBy}</span>
            </span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-mono rounded border border-slate-700">
              v2.4.0
            </span>
          </div>

          <h2 className="text-xl font-bold font-brand tracking-wide text-white flex items-center gap-2">
            <span className="text-cyan-400">CHROMA</span>FORGE STUDIO
          </h2>
          <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
            {t.creatorDesc}
          </p>
        </div>

        {/* System Architecture Specifications */}
        <div className="p-6 flex flex-col gap-4 text-xs text-slate-300">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>{t.creatorSpecsTitle}</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <Box className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-200">Anycubic Kobra 3 & ACE Pro:</span>{' '}
                <span className="text-slate-400">{t.spec1}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-200">Ollama & Gemini AI Engine:</span>{' '}
                <span className="text-slate-400">{t.spec2}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-200">Blender 3.6 – 4.3 (bpy):</span>{' '}
                <span className="text-slate-400">{t.spec3}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-200">Slicing & Purge Waste Optimization:</span>{' '}
                <span className="text-slate-400">{t.spec4}</span>
              </div>
            </div>
          </div>

          {/* Author Callout Banner */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold font-mono text-xs shadow-md">
                BR
              </div>
              <div>
                <span className="font-bold text-white block">Bolorentzon</span>
                <span className="text-slate-400 text-[10px]">Creator & Software Architect · 2026</span>
              </div>
            </div>

            <span className="font-mono text-cyan-300 font-semibold text-xs px-2.5 py-1 bg-slate-900 rounded-md border border-cyan-500/40">
              Made by Bolorentzon 2026
            </span>
          </div>

          <p className="text-[10px] text-slate-500 text-center pt-1 font-mono">
            {t.creatorCopyright}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
