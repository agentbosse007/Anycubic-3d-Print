import React, { useState, useRef, useEffect } from 'react';
import type { FilamentChannel, ModelDefinition } from '../types';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Wand2,
  Sliders,
  Check,
  RefreshCw,
  Box,
  Palette,
  AlertCircle,
  Eye,
  FileImage,
  ArrowRight
} from 'lucide-react';
import {
  PRESET_IMAGES,
  prepareImageBase64,
  generateReliefModelFromImage,
  generate360WatertightModelFromImage,
  analyzeImageProceduralFallback,
  findNearestFilament,
  type PresetImageItem,
  type ImageTo3DOptions
} from '../utils/imageTo3D';
import { normalizeModelDefinition } from '../utils/aiModelParser';
import { TRANSLATIONS, type SupportedLanguage } from '../utils/i18n';
import { TEXTURE_PRESETS, ProceduralTextureType } from '../utils/proceduralTextures';

interface ImageTo3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelGenerated: (model: ModelDefinition) => void;
  filaments: FilamentChannel[];
  printerType: 'kobra3' | 'kobra_x';
  lang?: SupportedLanguage;
}

export const ImageTo3DModal: React.FC<ImageTo3DModalProps> = ({
  isOpen,
  onClose,
  onModelGenerated,
  filaments,
  printerType,
  lang = 'sv',
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.sv;

  // Selected Image state
  const [selectedImage, setSelectedImage] = useState<string>(PRESET_IMAGES[0].dataUrl);
  const [selectedImageName, setSelectedImageName] = useState<string>(PRESET_IMAGES[0].name);
  const [selectedSideImage, setSelectedSideImage] = useState<string | null>(null);
  const [selectedBackImage, setSelectedBackImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workflow Mode: 2.5D relief, 360 solid sculpture, multi-angle reconstruction, or AI vision
  const [workflowMode, setWorkflowMode] = useState<'360_watertight' | 'relief' | 'multi_angle' | 'ai'>('360_watertight');

  // Surface Micro-Texture selection
  const [proceduralTexture, setProceduralTexture] = useState<ProceduralTextureType>('none');

  // AI Guidance Prompt
  const [promptGuidance, setPromptGuidance] = useState<string>('Skapa som naturtrogen 3D-modell med distinkta färgskikt');

  // Relief Settings
  const [widthMm, setWidthMm] = useState<number>(110);
  const [heightMm, setHeightMm] = useState<number>(110);
  const [maxDepthMm, setMaxDepthMm] = useState<number>(14);
  const [baseThicknessMm, setBaseThicknessMm] = useState<number>(3);
  const [invertHeight, setInvertHeight] = useState<boolean>(false);
  const [smoothFilter, setSmoothFilter] = useState<boolean>(true);
  const [colorClustering, setColorClustering] = useState<boolean>(true);

  // Generation status
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Detected Palette
  const [detectedSlots, setDetectedSlots] = useState<{ fil: FilamentChannel; count: number }[]>([]);

  // Analyze image colors whenever selectedImage changes
  useEffect(() => {
    if (!selectedImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;

        const countMap = new Map<number, number>();
        for (let i = 0; i < data.length; i += 8) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const nearest = findNearestFilament(r, g, b, filaments);
          countMap.set(nearest.id, (countMap.get(nearest.id) || 0) + 1);
        }

        const sorted = Array.from(countMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({
            fil: filaments.find(f => f.id === id) || filaments[0],
            count,
          }));

        setDetectedSlots(sorted);
      } catch (e) {
        // canvas CORS fallback
      }
    };
    img.src = selectedImage;
  }, [selectedImage, filaments]);

  if (!isOpen) return null;

  // Handle local file selection
  const handleFileChange = async (file: File) => {
    setErrorText(null);
    try {
      const { dataUrl } = await prepareImageBase64(file, 768);
      setSelectedImage(dataUrl);
      setSelectedImageName(file.name.replace(/\.[^/.]+$/, ''));
    } catch (err: any) {
      setErrorText(`Kunde inte läsa in bilden: ${err.message}`);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Execute Generation
  const handleGenerate = async () => {
    if (!selectedImage || isProcessing) return;

    setIsProcessing(true);
    setErrorText(null);
    setStatusText('Initierar bildbearbetning...');

    try {
      if (workflowMode === '360_watertight' || workflowMode === 'multi_angle') {
        setStatusText('Konstruerar sluten 360° volymetrisk skulptur och mappar ACE Pro-färger...');
        const solidModel = await generate360WatertightModelFromImage(selectedImage, filaments, {
          widthMm,
          heightMm,
          depthMm: maxDepthMm > 35 ? maxDepthMm : 75,
          prompt: `${promptGuidance || '360° Skulptur'} (${selectedImageName})`,
          proceduralTexture,
          sideImage: selectedSideImage || undefined,
          backImage: selectedBackImage || undefined,
        });
        solidModel.sourceImageUrl = selectedImage;
        solidModel.multiAngleViews = {
          front: selectedImage,
          side: selectedSideImage || undefined,
          back: selectedBackImage || undefined,
        };
        setStatusText('360° skulptur validerad och exporterad!');
        onModelGenerated(solidModel);
        onClose();
        return;
      } else if (workflowMode === 'ai') {
        setStatusText('Analyserar bild med Multimodal AI Vision (Gemini 3.8 Flash)...');
        const { base64, mimeType } = await prepareImageBase64(selectedImage, 768);

        try {
          const res = await fetch('/api/ai/image-to-3d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType,
              prompt: `${promptGuidance} (${selectedImageName})`,
              filamentSlots: filaments,
              printerType,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
              const normalized = normalizeModelDefinition(data, promptGuidance, 'gemini');
              normalized.sourceImageUrl = selectedImage;
              normalized.generatedBy = 'image_to_3d';
              normalized.globalProceduralTexture = proceduralTexture;
              setStatusText('3D-modell genererad framgångsrikt!');
              onModelGenerated(normalized);
              onClose();
              return;
            }
          }
        } catch (apiErr) {
          console.warn('Multimodal server endpoint error, switching to procedural vision fallback:', apiErr);
        }

        // Procedural biological/anatomical fallback if server was offline or failed
        setStatusText('Skapar naturtrogen anatomisk 3D-modell via procedurmotor...');
        const fallbackModel = await analyzeImageProceduralFallback(
          selectedImage,
          filaments,
          `${promptGuidance} ${selectedImageName}`
        );
        fallbackModel.sourceImageUrl = selectedImage;
        fallbackModel.globalProceduralTexture = proceduralTexture;
        onModelGenerated(fallbackModel);
        onClose();
      } else {
        // Volumetric 3D Relief & Lithophane Mode
        setStatusText('Beräknar höjdkarta, färgskikt och fasad sockel...');
        const reliefModel = await generateReliefModelFromImage(selectedImage, filaments, {
          widthMm,
          heightMm,
          maxDepthMm,
          basePlateThicknessMm: baseThicknessMm,
          invert: invertHeight,
          smoothFilter,
          colorClustering,
          prompt: `${promptGuidance || '3D Relief'} (${selectedImageName})`,
        });
        reliefModel.sourceImageUrl = selectedImage;
        reliefModel.globalProceduralTexture = proceduralTexture;
        setStatusText('3D-relief skapad och validerad för utskrift!');
        onModelGenerated(reliefModel);
        onClose();
      }
    } catch (err: any) {
      console.error('Image to 3D error:', err);
      setErrorText(err.message || 'Fel vid generering från bild.');
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {t.imageTo3DTitle || 'Bild till 3D-Objekt'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Anycubic ACE Pro Multi-Color
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.imageTo3DSubtitle || 'Konvertera foton, illustrationer eller skisser till fullvärdiga flerfärgade 3D-modeller för Anycubic Kobra 3 och Blender.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Stäng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6">
          {/* Top: Image Source Selection */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Drag & Drop Upload Zone + Preview */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileImage className="w-3.5 h-3.5 text-cyan-400" />
                <span>Källbild</span>
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all overflow-hidden group ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950'
                }`}
              >
                {selectedImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={selectedImage}
                      alt={selectedImageName}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                    />
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <Upload className="w-6 h-6 text-cyan-400" />
                      <span className="text-xs font-medium text-white">Byt bild eller släpp ny fil här</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG, WEBP, SVG</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 text-slate-400">
                    <Upload className="w-8 h-8 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-medium text-slate-200">
                      {t.uploadImagePrompt || 'Släpp bild här eller klicka för att bläddra'}
                    </span>
                    <span className="text-[10px] text-slate-500">PNG, JPEG, WEBP, SVG upp till 15MB</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={e => e.target.files && e.target.files[0] && handleFileChange(e.target.files[0])}
                  className="hidden"
                />
              </div>

              {/* Detected Palette matching ACE Pro */}
              {detectedSlots.length > 0 && (
                <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span>Identifierade ACE Pro-färger:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {detectedSlots.map(({ fil }) => (
                      <div
                        key={fil.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px]"
                        title={`Slot ${fil.id}: ${fil.name}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-xs shrink-0"
                          style={{ backgroundColor: fil.color }}
                        />
                        <span className="font-mono text-slate-200">Slot {fil.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Presets & Mode Configuration */}
            <div className="md:col-span-7 flex flex-col gap-4">
              {/* Presets Gallery */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.selectPresetImage || 'Eller välj ett naturtroget bildförval:'}</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_IMAGES.map((preset: PresetImageItem) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedImage(preset.dataUrl);
                        setSelectedImageName(preset.name);
                      }}
                      className={`relative aspect-square rounded-xl p-1 border flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
                        selectedImageName === preset.name
                          ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-slate-800'
                          : 'border-slate-800 bg-slate-850 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                      title={`${preset.name}: ${preset.description}`}
                    >
                      <img
                        src={preset.dataUrl}
                        alt={preset.name}
                        className="w-full h-full object-contain rounded"
                      />
                      {selectedImageName === preset.name && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>3D-Rekonstruktionsläge</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Anycubic Kobra 3 Redo</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setWorkflowMode('360_watertight')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      workflowMode === '360_watertight'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>360° Skulptur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowMode('multi_angle')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      workflowMode === 'multi_angle'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Multivinkel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowMode('relief')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      workflowMode === 'relief'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>2.5D Relief</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowMode('ai')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      workflowMode === 'ai'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>AI-Vision</span>
                  </button>
                </div>
              </div>

              {/* Surface Micro-Texture Selector */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Proceduriell Ytstruktur (Displacement / Bump)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Blender Shaders</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {TEXTURE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setProceduralTexture(preset.id)}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        proceduralTexture === preset.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-medium truncate">{preset.nameSv}</div>
                      <div className="text-[9px] text-slate-400 truncate">{preset.category}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Angle Image Dropzones (Only in multi_angle mode) */}
              {workflowMode === 'multi_angle' && (
                <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Multivinkel Vy-inmatning (Syntetiserar komplett 360° sluten mesh)</span>
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center text-center">
                      <span className="text-[10px] font-semibold text-slate-300 mb-1">Framifrån</span>
                      <img src={selectedImage} alt="Front" className="w-14 h-14 object-cover rounded border border-slate-700" />
                      <span className="text-[9px] text-emerald-400 mt-1">Aktiv Källbild</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center text-center">
                      <span className="text-[10px] font-semibold text-slate-300 mb-1">Sida / Profil</span>
                      {selectedSideImage ? (
                        <div className="relative">
                          <img src={selectedSideImage} alt="Side" className="w-14 h-14 object-cover rounded border border-slate-700" />
                          <button
                            type="button"
                            onClick={() => setSelectedSideImage(null)}
                            className="absolute -top-1 -right-1 bg-rose-600 rounded-full w-3.5 h-3.5 text-white flex items-center justify-center text-[8px]"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="w-14 h-14 border border-dashed border-slate-700 rounded flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[8px] text-slate-500 mt-0.5">Ladda upp</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = ev => setSelectedSideImage(ev.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                      <span className="text-[9px] text-slate-400 mt-1">{selectedSideImage ? 'Laddad' : 'Valfri'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center text-center">
                      <span className="text-[10px] font-semibold text-slate-300 mb-1">Baksida</span>
                      {selectedBackImage ? (
                        <div className="relative">
                          <img src={selectedBackImage} alt="Back" className="w-14 h-14 object-cover rounded border border-slate-700" />
                          <button
                            type="button"
                            onClick={() => setSelectedBackImage(null)}
                            className="absolute -top-1 -right-1 bg-rose-600 rounded-full w-3.5 h-3.5 text-white flex items-center justify-center text-[8px]"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="w-14 h-14 border border-dashed border-slate-700 rounded flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500">
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[8px] text-slate-500 mt-0.5">Ladda upp</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = ev => setSelectedBackImage(ev.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                      <span className="text-[9px] text-slate-400 mt-1">{selectedBackImage ? 'Laddad' : 'Valfri'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Specific Settings */}
              {workflowMode === '360_watertight' || workflowMode === 'multi_angle' ? (
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-cyan-400" />
                      <span>360° Sluten Solid Skulptur (Watertight Manifold)</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ACE Pro 4-Färg
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Genererar en fullständigt sluten 360-graders volymetrisk mesh (dorsalt skal + ventral buksida + kronaccenter) med en integrerad fasad sockel för 100% bäddadhesion på Kobra 3.
                  </p>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Bredd (X):</span>
                        <span className="text-white font-mono">{widthMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="180"
                        step="5"
                        value={widthMm}
                        onChange={e => setWidthMm(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Höjd (Y):</span>
                        <span className="text-white font-mono">{heightMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="200"
                        step="5"
                        value={heightMm}
                        onChange={e => setHeightMm(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Djup (Z):</span>
                        <span className="text-white font-mono">{maxDepthMm > 35 ? maxDepthMm : 75} mm</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="160"
                        step="5"
                        value={maxDepthMm > 35 ? maxDepthMm : 75}
                        onChange={e => setMaxDepthMm(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ) : workflowMode === 'ai' ? (
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Gemini 3.8 Flash Vision + Procedurmotor</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Biologisk CAD-syntes
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Analyserar bildens motiv och dekonstruerar det till fysiska, anatomiskt naturtrogna 3D-delar (kropp, vingar, skal, ögon, sockel) anpassade till dina aktiva Anycubic ACE Pro-filament.
                  </p>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 mb-1 block">
                      Valfri instruktion / stilvägledning:
                    </label>
                    <input
                      type="text"
                      value={promptGuidance}
                      onChange={e => setPromptGuidance(e.target.value)}
                      placeholder='T.ex. "Skapa som naturtrogen figurin på sockel med klara färger"'
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Höjdkarta & Parametriska Litofandimensioner</span>
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      100% Manifold 3D
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Bredd & Djup:</span>
                        <span className="text-white font-mono">{widthMm}×{heightMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="180"
                        step="5"
                        value={widthMm}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setWidthMm(val);
                          setHeightMm(val);
                        }}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>{t.reliefDepth || 'Reliefhöjd (Z)'}:</span>
                        <span className="text-white font-mono">{maxDepthMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="30"
                        step="1"
                        value={maxDepthMm}
                        onChange={e => setMaxDepthMm(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>{t.baseThickness || 'Sockeltjocklek'}:</span>
                        <span className="text-white font-mono">{baseThicknessMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="1.5"
                        max="6"
                        step="0.5"
                        value={baseThicknessMm}
                        onChange={e => setBaseThicknessMm(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    <div className="flex flex-col justify-center gap-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={invertHeight}
                          onChange={e => setInvertHeight(e.target.checked)}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <span>{t.invertHeight || 'Invertera höjdkarta'}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={smoothFilter}
                          onChange={e => setSmoothFilter(e.target.checked)}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <span>{t.smoothFilter || 'Mjuka upp konturer'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback and Errors */}
          {errorText && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {isProcessing && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center gap-2.5 text-xs text-cyan-300 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-cyan-400" />
              <span className="font-medium">{statusText || t.generatingFromImage || 'Bearbetar och genererar 3D-objekt...'}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mål: Anycubic Kobra 3 ({filaments.length} färger)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {t.closeBtn || 'Avbryt'}
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedImage || isProcessing}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.generatingFromImage || 'Genererar 3D...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.generateFromImage || 'Generera 3D-modell från bild'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
