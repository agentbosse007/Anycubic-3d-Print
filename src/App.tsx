import React, { useState, useMemo } from 'react';
import { DEFAULT_FILAMENTS, PRINTER_PROFILES } from './utils/defaultFilaments';
import { PRESET_MODELS } from './utils/presetModels';
import { analyzeMultiMaterialSlicing } from './utils/slicingEngine';
import { generateMultiColor3MF } from './utils/exportFormats';
import type { FilamentChannel, ModelDefinition, PrinterProfile, SlicingConfig } from './types';
import type { SupportedLanguage } from './utils/i18n';
import { LANGUAGES, TRANSLATIONS } from './utils/i18n';

import { ThreeViewport } from './components/ThreeViewport';
import { OllamaPromptBar } from './components/OllamaPromptBar';
import { FilamentManager } from './components/FilamentManager';
import { SlicingOptimizerPanel } from './components/SlicingOptimizerPanel';
import { BlenderBridgePanel } from './components/BlenderBridgePanel';
import { SegmentInspector } from './components/SegmentInspector';
import { AnycubicGuideModal } from './components/AnycubicGuideModal';
import { CreatorInfoModal } from './components/CreatorInfoModal';
import { ImageTo3DModal } from './components/ImageTo3DModal';

import {
  Layers,
  Palette,
  Sliders,
  Code2,
  Box,
  Download,
  Info,
  Sparkles,
  Printer,
  ChevronDown,
  Globe,
  Languages,
  Check,
  Scale,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  X,
  Image as ImageIcon
} from 'lucide-react';

export default function App() {
  // 1. Language State
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('chromaforge_lang');
      return (saved as SupportedLanguage) || 'sv';
    } catch {
      return 'sv';
    }
  });

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    try {
      localStorage.setItem('chromaforge_lang', lang);
    } catch {
      // storage unavailable
    }
  };

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.sv;
  const currentLangOption = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  // 2. Modals & UI States
  const [isCreatorInfoOpen, setIsCreatorInfoOpen] = useState<boolean>(false);
  const [isImageTo3DOpen, setIsImageTo3DOpen] = useState<boolean>(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);
  const [externalPrompt, setExternalPrompt] = useState<string>('');

  // 3. 3D Model & Printer State Management
  const [selectedPrinterKey, setSelectedPrinterKey] = useState<string>('kobra3');
  const printer: PrinterProfile = PRINTER_PROFILES[selectedPrinterKey] || PRINTER_PROFILES.kobra3;

  const [maxColors, setMaxColors] = useState<4 | 8>(8);
  const [filaments, setFilaments] = useState<FilamentChannel[]>(DEFAULT_FILAMENTS);
  const [activeFilamentSlot, setActiveFilamentSlot] = useState<number>(1);

  const [currentModel, setCurrentModel] = useState<ModelDefinition>(PRESET_MODELS[0]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const [slicingConfig, setSlicingConfig] = useState<SlicingConfig>({
    layerHeight: 0.2,
    infillDensity: 15,
    purgeIntoInfill: true,
    purgeIntoSupport: true,
    flushingMultiplier: 1.0,
    wipeTowerX: printer.wipeTower.x,
    wipeTowerY: printer.wipeTower.y,
    wipeTowerWidth: printer.wipeTower.width,
    wipeTowerEnabled: true,
  });

  const [activeTab, setActiveTab] = useState<'components' | 'filaments' | 'slicer' | 'blender'>('components');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading3mf, setIsDownloading3mf] = useState<boolean>(false);
  const [showSpoolBreakdown, setShowSpoolBreakdown] = useState<boolean>(false);

  const activeFilaments = useMemo(() => filaments.slice(0, maxColors), [filaments, maxColors]);

  // 4. Multi-Material Slicing Analysis
  const slicingAnalysis = useMemo(() => {
    return analyzeMultiMaterialSlicing(currentModel.segments, activeFilaments, slicingConfig);
  }, [currentModel, activeFilaments, slicingConfig]);

  // Selected filament channels used in the current model
  const activeSelectedChannels = useMemo(() => {
    const usedIds = new Set(currentModel.segments.map(s => s.filamentId));
    const matched = slicingAnalysis.channelConsumptions.filter(c => usedIds.has(c.channelId));
    return matched.length > 0 ? matched : slicingAnalysis.channelConsumptions.slice(0, maxColors);
  }, [slicingAnalysis.channelConsumptions, currentModel.segments, maxColors]);

  // 5. Handlers
  const handleUpdateFilament = (updated: FilamentChannel) => {
    setFilaments(prev => prev.map(f => (f.id === updated.id ? updated : f)));
  };

  const handleAssignFilamentToSegment = (segmentId: string, filamentId: number) => {
    setCurrentModel(prev => ({
      ...prev,
      segments: prev.segments.map(s => (s.id === segmentId ? { ...s, filamentId } : s)),
    }));
  };

  const handleSelectPreset = (preset: ModelDefinition) => {
    setCurrentModel(preset);
    setSelectedSegmentId(null);
  };

  const handleAutoFixBleed = () => {
    setSlicingConfig(prev => ({
      ...prev,
      flushingMultiplier: Math.max(1.25, Number((prev.flushingMultiplier + 0.2).toFixed(2))),
    }));
  };

  const handleExport3MF = async () => {
    try {
      setIsDownloading3mf(true);
      const blob = await generateMultiColor3MF(currentModel, activeFilaments, slicingConfig);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentModel.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_anycubic_kobra.3mf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export 3MF:', err);
    } finally {
      setIsDownloading3mf(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30"
      onClick={() => {
        if (isLangMenuOpen) setIsLangMenuOpen(false);
      }}
    >
      {/* 1. TOP BAR CONTRACT: Exactly 3 Zones */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-20 shrink-0">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3">
          <a href="/" className="text-base sm:text-lg font-brand font-bold text-white tracking-wider flex items-center gap-2">
            <span className="text-cyan-400">CHROMA</span>FORGE
          </a>
          <span className="hidden md:inline text-xs text-slate-500" aria-hidden="true">·</span>
          <span className="hidden md:inline text-xs text-slate-400">{t.appSubtitle}</span>
        </div>

        {/* Zone 2: 4-6 Clean text navigation links / Mode tabs */}
        <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('components')}
            className={`transition-colors whitespace-nowrap ${activeTab === 'components' ? 'text-cyan-400 font-semibold' : 'hover:text-white'}`}
          >
            {t.tabAssembly}
          </button>
          <button
            onClick={() => setActiveTab('filaments')}
            className={`transition-colors whitespace-nowrap ${activeTab === 'filaments' ? 'text-cyan-400 font-semibold' : 'hover:text-white'}`}
          >
            {t.tabFilaments} ({maxColors})
          </button>
          <button
            onClick={() => setActiveTab('slicer')}
            className={`transition-colors whitespace-nowrap ${activeTab === 'slicer' ? 'text-cyan-400 font-semibold' : 'hover:text-white'}`}
          >
            {t.tabSlicer}
          </button>
          <button
            onClick={() => setActiveTab('blender')}
            className={`transition-colors whitespace-nowrap ${activeTab === 'blender' ? 'text-cyan-400 font-semibold' : 'hover:text-white'}`}
          >
            {t.tabBlender}
          </button>
        </nav>

        {/* Zone 3: Primary Actions + Made by Bolorentzon 2026 + Språknapp */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Info Button: "Made by Bolorentzon 2026" */}
          <button
            onClick={() => setIsCreatorInfoOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-cyan-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 rounded-lg border border-cyan-500/40 hover:border-cyan-400/60 transition-colors cursor-pointer group"
            title="ChromaForge Studio Information: Made by Bolorentzon 2026"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold tracking-wide text-[11px] sm:text-xs">
              Made by Bolorentzon 2026
            </span>
          </button>

          {/* Språknapp (Language Button with dropdown for 6 most common languages) */}
          <div className="relative">
            <button
              onClick={e => {
                e.stopPropagation();
                setIsLangMenuOpen(!isLangMenuOpen);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg border border-slate-700 transition-colors white-space-nowrap cursor-pointer"
              aria-label={t.languageBtn || 'Språk'}
              title={t.selectLanguage || 'Välj språk'}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-medium text-[11px] sm:text-xs">
                {currentLangOption.flag} <span className="hidden sm:inline">{currentLangOption.name}</span>
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLangMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>{t.selectLanguage || 'Välj språk'}</span>
                  <Languages className="w-3 h-3 text-cyan-400" />
                </div>
                {LANGUAGES.map(langOpt => (
                  <button
                    key={langOpt.code}
                    onClick={() => {
                      handleLanguageChange(langOpt.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                      currentLang === langOpt.code
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{langOpt.flag}</span>
                      <span>{langOpt.name}</span>
                    </span>
                    {currentLang === langOpt.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kobra Specs Guide Button */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.btnKobraSpecs}</span>
          </button>

          {/* Bild till 3D Studio Trigger Button */}
          <button
            onClick={() => setIsImageTo3DOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 rounded-lg border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-sm whitespace-nowrap cursor-pointer group"
            title="Konvertera bild, foto eller skiss till ett fullvärdigt 3D-objekt för Anycubic Kobra 3"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold tracking-wide text-[11px] sm:text-xs">
              {t.btnImageTo3D || 'Bild till 3D'}
            </span>
          </button>

          {/* Anycubic 3MF Export Button */}
          <button
            onClick={handleExport3MF}
            disabled={isDownloading3mf}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading3mf ? t.btnExporting3MF : t.btnExport3MF}</span>
          </button>
        </div>
      </header>

      {/* 2. OLLAMA PROMPT BAR: Connects local Ollama or Gemini to 3D Generation */}
      <OllamaPromptBar
        onModelGenerated={model => {
          setCurrentModel(model);
          setSelectedSegmentId(null);
        }}
        filaments={activeFilaments}
        printerType={selectedPrinterKey as any}
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        lang={currentLang}
        externalPrompt={externalPrompt}
        onClearExternalPrompt={() => setExternalPrompt('')}
        onOpenImageTo3D={() => setIsImageTo3DOpen(true)}
      />

      {/* 3. MAIN WORKSPACE: Viewport (Left) + Engineering Slicing & Bridge Sidebar (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: 3D Three.js Viewport */}
        <div className="flex-1 flex flex-col min-h-[420px] lg:min-h-0 relative border-b lg:border-b-0 lg:border-r border-slate-800">
          {/* Subheader Bar with Preset Selector & Active Model Info */}
          <div className="h-10 bg-slate-900/60 border-b border-slate-800 px-4 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">{t.modelLabel || 'Modell:'}</span>
              <span className="font-semibold text-white truncate max-w-[180px] sm:max-w-xs">{currentModel.name}</span>
              {currentModel.sourceImageUrl && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 font-medium">
                  <ImageIcon className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Bildmodell</span>
                </span>
              )}
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-400 font-mono tabular-nums text-[11px]">
                {currentModel.segments.length} {t.partsLabel || 'delar'} ({currentModel.dimensions.x}×{currentModel.dimensions.y}×{currentModel.dimensions.z}mm)
              </span>
            </div>

            {/* Quick Model Preset Switcher */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="hidden sm:inline text-slate-500 text-[11px] shrink-0">{t.presetsLabel || 'Förval:'}</span>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-lg scrollbar-none py-0.5">
                {PRESET_MODELS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                      currentModel.id === p.id
                        ? 'bg-slate-700 text-cyan-300 font-semibold ring-1 ring-cyan-500/40'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={p.name}
                  >
                    {p.name.split(' (')[0].split(' on ')[0].split(' Mascot')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Three.js Interactive 3D Canvas */}
          <div className="flex-1 relative">
            <ThreeViewport
              model={currentModel}
              filaments={activeFilaments}
              printer={printer}
              slicingConfig={slicingConfig}
              slicingAnalysis={slicingAnalysis}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={setSelectedSegmentId}
              onAssignFilamentToSegment={handleAssignFilamentToSegment}
              onAutoFixBleed={handleAutoFixBleed}
              activeFilamentSlot={activeFilamentSlot}
              lang={currentLang}
            />
          </div>

          {/* Detailed Spool Consumption Breakdown Popover */}
          {showSpoolBreakdown && (
            <div className="absolute bottom-14 left-2 right-2 sm:left-4 sm:right-auto sm:w-[480px] z-30 bg-slate-900/98 backdrop-blur-xl border border-cyan-500/40 rounded-xl shadow-2xl p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs tracking-wide">
                        {t.spoolProgressTitle || 'Spolkapacitet & Åtgång'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {activeSelectedChannels.length} {t.activeChannelsLabel || 'valda kanaler'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {printer.name} · ACE Pro
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {slicingAnalysis.hasInsufficientSpool ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      {t.spoolStatusInsufficient || 'Kräver spolbyte!'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {t.spoolStatusSafe || 'Tillräckligt filament'}
                    </span>
                  )}
                  <button
                    onClick={() => setShowSpoolBreakdown(false)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Overall Total Consumption vs Spool Bar */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">
                    {t.usedVsCapacity || 'Förbrukning mot kvarvarande spolar'}:
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-white font-bold tabular-nums">{slicingAnalysis.totalFilamentGrams}g</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-300 tabular-nums">{slicingAnalysis.totalSpoolCapacityGrams.toLocaleString()}g</span>
                    <span className="text-cyan-400 font-semibold tabular-nums">({slicingAnalysis.spoolConsumptionPercent.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Overall Spool Bar */}
                <div className="h-3.5 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden flex relative p-0.5">
                  <div
                    className="h-full rounded-full flex overflow-hidden transition-all duration-300 shadow-sm"
                    style={{ width: `${Math.max(2, Math.min(100, slicingAnalysis.spoolConsumptionPercent))}%` }}
                  >
                    {activeSelectedChannels.map(ch => {
                      const sharePct = slicingAnalysis.totalFilamentGrams > 0
                        ? (ch.totalGrams / slicingAnalysis.totalFilamentGrams) * 100
                        : 0;
                      return (
                        <div
                          key={ch.channelId}
                          className="h-full relative group transition-all"
                          style={{
                            width: `${sharePct}%`,
                            backgroundColor: ch.color,
                            boxShadow: `0 0 6px ${ch.color}55`,
                          }}
                          title={`Kanal ${ch.channelId} (${ch.channelName}): ${ch.totalGrams}g`}
                        />
                      );
                    })}
                  </div>
                  {/* Subtle 25%, 50%, 75% marks */}
                  <div className="absolute inset-y-0 left-1/4 w-px bg-slate-800/80 pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/80 pointer-events-none" />
                  <div className="absolute inset-y-0 left-3/4 w-px bg-slate-800/80 pointer-events-none" />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Modell: {slicingAnalysis.modelFilamentGrams}g + Spill: {slicingAnalysis.purgeWasteGrams}g</span>
                  <span className="text-emerald-400">Kvar efter utskrift: {(slicingAnalysis.totalSpoolCapacityGrams - slicingAnalysis.totalFilamentGrams).toFixed(1)}g</span>
                </div>
              </div>

              {/* Per-Channel Spool List */}
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {activeSelectedChannels.map(ch => {
                  const isLow = ch.remainingAfterPrintGrams < 60 && ch.isSufficient;
                  const isCritical = !ch.isSufficient;

                  return (
                    <div
                      key={ch.channelId}
                      className={`p-2 rounded-lg border flex flex-col gap-1.5 transition-all ${
                        isCritical
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : isLow
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-slate-600 shadow-sm"
                            style={{ backgroundColor: ch.color }}
                          />
                          <span className="font-semibold text-white truncate">
                            Slot {ch.channelId}: {ch.channelName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            ({ch.material})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <span className="text-white font-bold tabular-nums">
                            {ch.totalGrams}g
                          </span>
                          <span className="text-slate-500">/</span>
                          <span className="text-slate-300 tabular-nums">
                            {ch.spoolGramsRemaining}g
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-cyan-500/15 text-cyan-300'
                          }`}>
                            {ch.percentOfSpoolUsed.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Channel progress bar */}
                      <div className="h-2 w-full bg-slate-900 rounded-full border border-slate-800/80 overflow-hidden flex relative p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCritical ? 'bg-rose-500' : ''
                          }`}
                          style={{
                            width: `${Math.max(3, Math.min(100, ch.percentOfSpoolUsed))}%`,
                            backgroundColor: isCritical ? undefined : ch.color,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">
                          Modell: {ch.modelGrams}g · Spill: {ch.purgeGrams}g
                        </span>
                        <span className={isCritical ? 'text-rose-400 font-bold' : isLow ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {isCritical
                            ? `Saknas ${(ch.totalGrams - ch.spoolGramsRemaining).toFixed(1)}g!`
                            : `${ch.remainingAfterPrintGrams}g ${t.remainingAfter || 'kvar'}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Slicing Telemetry Ribbon */}
          <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 text-xs shrink-0 relative z-20">
            {/* Left Section: Slicing stats */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
              <div className="flex items-center gap-1.5 text-white font-medium">
                <Printer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="font-mono text-white tabular-nums font-semibold">{printer.name}</span>
              </div>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

              <div className="flex items-center gap-1">
                <span>{t.totalToolSwaps || 'Verktygsväxlingar'}:</span>
                <span className="font-mono text-cyan-400 font-semibold tabular-nums">{slicingAnalysis.toolChangesCount}</span>
              </div>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

              <div className="flex items-center gap-1">
                <span>{t.totalPurgeWaste || 'Färgspill'}:</span>
                <span className="font-mono text-amber-400 font-semibold tabular-nums">{slicingAnalysis.purgeWasteGrams}g</span>
              </div>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

              <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                <span>-{slicingAnalysis.infillSavingsGrams}g saved ({t.purgeIntoInfill || 'Infill'})</span>
              </div>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="tabular-nums">{t.totalPrintTime || 'Tid'}: {Math.floor(slicingAnalysis.estimatedPrintMinutes / 60)}h {slicingAnalysis.estimatedPrintMinutes % 60}m</span>
              </div>

              {slicingAnalysis.bleedRisks.length > 0 && (
                <>
                  <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <span>⚠️ {slicingAnalysis.bleedRisks.length} {t.bleedSimulation || 'Färgblödning'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Right Section: Visual Progress Bar indicating total filament consumption vs remaining spool capacity */}
            <div className="flex items-center gap-2.5 ml-auto shrink-0">
              <button
                onClick={() => setShowSpoolBreakdown(!showSpoolBreakdown)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  showSpoolBreakdown
                    ? 'bg-slate-800 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                }`}
                title={t.toggleSpoolDetails || 'Klicka för att visa detaljerad spolkapacitet och förbrukning per kanal'}
              >
                {/* Spool status icon */}
                {slicingAnalysis.hasInsufficientSpool ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                ) : (
                  <Scale className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}

                {/* Text readouts */}
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-slate-400 font-sans hidden sm:inline">
                    {t.filamentConsumption || 'Filament'}:
                  </span>
                  <span className="font-bold text-white tabular-nums">
                    {slicingAnalysis.totalFilamentGrams}g
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-300 tabular-nums font-medium">
                    {slicingAnalysis.totalSpoolCapacityGrams.toLocaleString()}g
                  </span>
                  <span className={`font-semibold tabular-nums text-[11px] ${
                    slicingAnalysis.hasInsufficientSpool ? 'text-rose-400' : 'text-cyan-400'
                  }`}>
                    ({slicingAnalysis.spoolConsumptionPercent.toFixed(1)}%)
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-28 sm:w-36 md:w-44 lg:w-52 h-3 bg-slate-900 rounded-full border border-slate-700/80 p-0.5 overflow-hidden flex relative shadow-inner shrink-0">
                  {/* Consumed fill bar */}
                  <div
                    className="h-full rounded-full flex overflow-hidden transition-all duration-300"
                    style={{
                      width: `${Math.max(4, Math.min(100, slicingAnalysis.spoolConsumptionPercent))}%`,
                    }}
                  >
                    {activeSelectedChannels.map(ch => {
                      const sharePct = slicingAnalysis.totalFilamentGrams > 0
                        ? (ch.totalGrams / slicingAnalysis.totalFilamentGrams) * 100
                        : 0;
                      return (
                        <div
                          key={ch.channelId}
                          className="h-full"
                          style={{
                            width: `${sharePct}%`,
                            backgroundColor: ch.color,
                          }}
                          title={`Slot ${ch.channelId}: ${ch.totalGrams}g`}
                        />
                      );
                    })}
                  </div>
                  {/* Subtle capacity marks */}
                  <div className="absolute inset-y-0 left-1/4 w-px bg-slate-800/80 pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/80 pointer-events-none" />
                  <div className="absolute inset-y-0 left-3/4 w-px bg-slate-800/80 pointer-events-none" />
                </div>

                {/* Active channel color badges */}
                <div className="hidden xl:flex items-center -space-x-1 pl-1">
                  {activeSelectedChannels.map(ch => (
                    <span
                      key={ch.channelId}
                      className="w-2.5 h-2.5 rounded-full border border-slate-900 ring-1 ring-slate-700 shrink-0"
                      style={{ backgroundColor: ch.color }}
                      title={`Slot ${ch.channelId}: ${ch.channelName}`}
                    />
                  ))}
                </div>

                <ChevronUp
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    showSpoolBreakdown ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Material Engineering Sidebar */}
        <div className="w-full lg:w-[480px] xl:w-[520px] bg-slate-950 flex flex-col shrink-0">
          {/* Sidebar Navigation Tabs */}
          <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center justify-between gap-1">
            <div className="grid grid-cols-4 w-full gap-1">
              <button
                onClick={() => setActiveTab('components')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-colors truncate ${
                  activeTab === 'components'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{t.tabAssembly}</span>
              </button>

              <button
                onClick={() => setActiveTab('filaments')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-colors truncate ${
                  activeTab === 'filaments'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">ACE Pro ({maxColors})</span>
              </button>

              <button
                onClick={() => setActiveTab('slicer')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-colors truncate ${
                  activeTab === 'slicer'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{t.tabSlicer}</span>
              </button>

              <button
                onClick={() => setActiveTab('blender')}
                className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-colors truncate ${
                  activeTab === 'blender'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Blender (bpy)</span>
              </button>
            </div>
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'components' && (
              <SegmentInspector
                model={currentModel}
                filaments={filaments}
                selectedSegmentId={selectedSegmentId}
                onSelectSegment={setSelectedSegmentId}
                onAssignFilament={handleAssignFilamentToSegment}
                maxColors={maxColors}
              />
            )}

            {activeTab === 'filaments' && (
              <FilamentManager
                filaments={filaments}
                onUpdateFilament={handleUpdateFilament}
                activeSlot={activeFilamentSlot}
                onSetActiveSlot={setActiveFilamentSlot}
                maxColors={maxColors}
                onChangeMaxColors={setMaxColors}
              />
            )}

            {activeTab === 'slicer' && (
              <SlicingOptimizerPanel
                analysis={slicingAnalysis}
                filaments={filaments}
                config={slicingConfig}
                onChangeConfig={setSlicingConfig}
                maxColors={maxColors}
              />
            )}

            {activeTab === 'blender' && (
              <BlenderBridgePanel
                model={currentModel}
                filaments={activeFilaments}
                slicingConfig={slicingConfig}
                onModelImported={(importedModel) => {
                  setCurrentModel(importedModel);
                  setSelectedSegmentId(null);
                }}
                lang={currentLang}
                onSendPromptToOllama={(p) => setExternalPrompt(p)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Anycubic Specs & Guide Modal */}
      <AnycubicGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Creator Info Modal: Made by Bolorentzon 2026 */}
      <CreatorInfoModal
        isOpen={isCreatorInfoOpen}
        onClose={() => setIsCreatorInfoOpen(false)}
        lang={currentLang}
      />

      {/* Image to 3D Multi-Color Modal */}
      <ImageTo3DModal
        isOpen={isImageTo3DOpen}
        onClose={() => setIsImageTo3DOpen(false)}
        onModelGenerated={model => {
          setCurrentModel(model);
          setSelectedSegmentId(null);
        }}
        filaments={filaments.slice(0, maxColors)}
        printerType={selectedPrinterKey as any}
        lang={currentLang}
      />
    </div>
  );
}

