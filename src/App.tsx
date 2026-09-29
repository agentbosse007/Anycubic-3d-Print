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
  Check
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

  // 4. Multi-Material Slicing Analysis
  const slicingAnalysis = useMemo(() => {
    return analyzeMultiMaterialSlicing(currentModel.segments, filaments.slice(0, maxColors), slicingConfig);
  }, [currentModel, filaments, maxColors, slicingConfig]);

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
      const blob = await generateMultiColor3MF(currentModel, filaments.slice(0, maxColors), slicingConfig);
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-cyan-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 rounded-lg border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-sm whitespace-nowrap cursor-pointer group"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-lg border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.btnKobraSpecs}</span>
          </button>

          {/* Anycubic 3MF Export Button */}
          <button
            onClick={handleExport3MF}
            disabled={isDownloading3mf}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
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
        filaments={filaments.slice(0, maxColors)}
        printerType={selectedPrinterKey as any}
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        lang={currentLang}
        externalPrompt={externalPrompt}
        onClearExternalPrompt={() => setExternalPrompt('')}
      />

      {/* 3. MAIN WORKSPACE: Viewport (Left) + Engineering Slicing & Bridge Sidebar (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: 3D Three.js Viewport */}
        <div className="flex-1 flex flex-col min-h-[420px] lg:min-h-0 relative border-b lg:border-b-0 lg:border-r border-slate-800">
          {/* Subheader Bar with Preset Selector & Active Model Info */}
          <div className="h-10 bg-slate-900/60 border-b border-slate-800 px-4 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">{t.modelLabel || 'Modell:'}</span>
              <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{currentModel.name}</span>
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
              filaments={filaments.slice(0, maxColors)}
              printer={printer}
              slicingConfig={slicingConfig}
              slicingAnalysis={slicingAnalysis}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={setSelectedSegmentId}
              onAssignFilamentToSegment={handleAssignFilamentToSegment}
              onAutoFixBleed={handleAutoFixBleed}
              activeFilamentSlot={activeFilamentSlot}
            />
          </div>

          {/* Bottom Slicing Telemetry Ribbon */}
          <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-slate-400">
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-white tabular-nums">{printer.name}</span>
              </div>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <div className="flex items-center gap-1 text-slate-400">
                <span>{t.totalToolSwaps || 'Verktygsväxlingar'}:</span>
                <span className="font-mono text-cyan-400 font-semibold tabular-nums">{slicingAnalysis.toolChangesCount}</span>
              </div>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <div className="flex items-center gap-1 text-slate-400">
                <span>{t.totalPurgeWaste || 'Färgspill'}:</span>
                <span className="font-mono text-amber-400 font-semibold tabular-nums">{slicingAnalysis.purgeWasteGrams}g</span>
              </div>
              {slicingAnalysis.bleedRisks.length > 0 && (
                <>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <span>⚠️ {slicingAnalysis.bleedRisks.length} {t.bleedSimulation || 'Färgblödning'}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-400">-{slicingAnalysis.infillSavingsGrams}g saved ({t.purgeIntoInfill || 'Infill'})</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-300 tabular-nums">{t.totalPrintTime || 'Tid'}: {Math.floor(slicingAnalysis.estimatedPrintMinutes / 60)}h {slicingAnalysis.estimatedPrintMinutes % 60}m</span>
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
                filaments={filaments.slice(0, maxColors)}
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
    </div>
  );
}
