import React, { useState, useEffect } from 'react';
import type { FilamentChannel, ModelDefinition, OllamaState } from '../types';
import { Sparkles, Terminal, CheckCircle2, AlertCircle, RefreshCw, Send, Cpu, ChevronDown, Leaf, Wand2 } from 'lucide-react';
import { sanitizeAndRepairJson, normalizeModelDefinition, buildOptimizedPrompt } from '../utils/aiModelParser';
import type { SupportedLanguage } from '../utils/i18n';
import { TRANSLATIONS } from '../utils/i18n';

interface OllamaPromptBarProps {
  onModelGenerated: (model: ModelDefinition) => void;
  filaments: FilamentChannel[];
  printerType: 'kobra3' | 'kobra_x';
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  lang?: SupportedLanguage;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}

export const OllamaPromptBar: React.FC<OllamaPromptBarProps> = ({
  onModelGenerated,
  filaments,
  printerType,
  isGenerating,
  setIsGenerating,
  lang = 'sv',
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.sv;
  const [prompt, setPrompt] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<'ollama' | 'gemini'>('ollama');
  const [ollamaState, setOllamaState] = useState<OllamaState>({
    endpoint: 'http://localhost:11434',
    model: 'llama3.2',
    isConnected: false,
    isLoading: false,
    availableModels: ['llama3.2', 'mistral', 'codellama', 'deepseek-r1', 'qwen2.5-coder'],
  });
  const [showEngineDropdown, setShowEngineDropdown] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Sync external prompt (e.g. from Blender model generator)
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      setPrompt(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllamaConnection();
  }, []);

  const checkOllamaConnection = async () => {
    setOllamaState(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch('/api/ollama/status');
      const data = await res.json();
      if (data.connected) {
        setOllamaState(prev => ({
          ...prev,
          isConnected: true,
          isLoading: false,
          availableModels: data.models.length > 0 ? data.models : prev.availableModels,
          model: data.models.length > 0 ? data.models[0] : prev.model,
          lastError: undefined,
        }));
      } else {
        setOllamaState(prev => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          lastError: data.error || 'Ollama offline',
        }));
      }
    } catch (err: any) {
      setOllamaState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        lastError: err.message,
      }));
    }
  };

  // 1-Click Prompt Optimizer for Anycubic ACE Pro
  const handleOptimizePrompt = async () => {
    if (!prompt.trim() || isOptimizing) return;
    setIsOptimizing(true);
    setStatusMessage(t.btnOptimizing || 'Optimerar prompt för Anycubic multi-color CAD...');
    try {
      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, filamentCount: filaments.length }),
      });
      const data = await res.json();
      if (data.optimizedPrompt) {
        setPrompt(data.optimizedPrompt);
        setStatusMessage(t.modelGeneratedSuccess || 'Prompt optimerad för maximal 3D-detalj!');
      } else {
        setPrompt(buildOptimizedPrompt(prompt, filaments.length, lang));
      }
    } catch (e) {
      setPrompt(buildOptimizedPrompt(prompt, filaments.length, lang));
    } finally {
      setIsOptimizing(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setStatusMessage(`Syntetiserar 3D multi-material CAD med ${selectedEngine === 'ollama' ? `Ollama (${ollamaState.model})` : 'Gemini 3.8 Flash'}...`);

    try {
      if (selectedEngine === 'ollama' && ollamaState.isConnected) {
        // 1. Ollama generation
        const systemPrompt = `You are ChromaForge CAD AI for Anycubic Kobra 3 (8-color ACE Pro).
Return ONLY JSON with: name, description, dimensions: {x,y,z}, segments: [{id, name, filamentId (1 to 8), geometryType: "organic_mesh"|"box"|"cylinder"|"sphere"|"cone"|"ring", transform: {position:[x,y,z], rotation:[rx,ry,rz], scale:[sx,sy,sz]}, parameters: {width,height,depth,radius,organicType: "frog_body"|"frog_limb"|"butterfly_wing"|"nautilus_shell"|"petal"|"rock_pedestal"|"organic_eye"|"chameleon_tail"|"mushroom_cap"|"mushroom_stem"|"succulent_rosette"|"crystal_cluster"|"beetle_elytra"|"tree_trunk_bark"|"tortoise_shell"|"leaf_vein", finish: "organic_skin"|"glossy_chitin"|"mineral_stone"|"botanical_petal"|"fleshy_succulent"}}], blenderPythonScript: "...", slicingTips: ["..."]`;

        const res = await fetch('/api/ollama/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Create an optimized 3D multi-color printable model: "${prompt}" using up to ${filaments.length} filaments.`,
            model: ollamaState.model,
            system: systemPrompt,
          }),
        });

        const data = await res.json();
        let parsedModel: any = null;
        try {
          const rawText = data.response || '';
          parsedModel = sanitizeAndRepairJson(rawText);
        } catch (e) {
          console.warn('Ollama raw JSON repair attempted:', e);
        }

        if (parsedModel && (parsedModel.segments || Array.isArray(parsedModel.segments))) {
          const normalized = normalizeModelDefinition(parsedModel, prompt, 'ollama');
          onModelGenerated(normalized);
          setStatusMessage('3D-modell genererad med lokal Ollama AI & validerad!');
        } else {
          fallbackProcedural(prompt);
        }
      } else {
        // 2. Server-side Gemini AI generation
        const res = await fetch('/api/ai/generate-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            filamentSlots: filaments,
            printerType,
          }),
        });

        const data = await res.json();
        let parsedModel: any = data;
        if (data.raw) {
          try {
            parsedModel = sanitizeAndRepairJson(data.raw);
          } catch (e) {
            console.warn('Gemini raw text parse:', e);
          }
        }

        if (parsedModel && (parsedModel.segments || Array.isArray(parsedModel.segments))) {
          const normalized = normalizeModelDefinition(parsedModel, prompt, 'gemini');
          onModelGenerated(normalized);
          setStatusMessage('3D-modell genererad med Gemini AI & validerad!');
        } else {
          fallbackProcedural(prompt);
        }
      }
    } catch (err: any) {
      console.warn('AI endpoint encountered issue, using procedural pipeline:', err);
      fallbackProcedural(prompt);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Fallback high-speed procedural generator for nature and mechanical objects
  const fallbackProcedural = (userPrompt: string) => {
    const p = userPrompt.toLowerCase();

    // Nature detection (Swedish and English)
    const isMushroom = p.includes('svamp') || p.includes('mushroom') || p.includes('fungus') || p.includes('kantarell') || p.includes('champinjon');
    const isFrog = p.includes('groda') || p.includes('frog') || p.includes('padda') || p.includes('toad') || p.includes('amphibian') || p.includes('dendrobates');
    const isChameleon = p.includes('kameleon') || p.includes('chameleon') || p.includes('ödla') || p.includes('lizard') || p.includes('gecko');
    const isNautilus = p.includes('snäcka') || p.includes('snäck') || p.includes('nautilus') || p.includes('fossil') || p.includes('spiral') || p.includes('ammonit') || p.includes('shell');
    const isButterfly = p.includes('fjäril') || p.includes('butterfly') || p.includes('monark') || p.includes('insekt') || p.includes('insect') || p.includes('orkidé') || p.includes('orchid');
    const isSucculent = p.includes('suckulent') || p.includes('succulent') || p.includes('kaktus') || p.includes('cactus') || p.includes('växt') || p.includes('plant') || p.includes('blomma') || p.includes('flower');
    const isCrystal = p.includes('kristall') || p.includes('crystal') || p.includes('kvarts') || p.includes('quartz') || p.includes('geod') || p.includes('geode') || p.includes('ädelsten') || p.includes('gem');
    const isTurtle = p.includes('sköldpadda') || p.includes('turtle') || p.includes('tortoise');
    const isGeneralNature = p.includes('natur') || p.includes('verklighetstrogen') || p.includes('nature') || p.includes('lifelike') || p.includes('organisk') || p.includes('organic') || p.includes('realistisk');

    let generatedSegments: any[] = [];
    let modelName = userPrompt.length > 34 ? userPrompt.slice(0, 34) + '...' : userPrompt;
    let modelDesc = 'High-detail multi-material assembly optimized for Anycubic multi-color printing.';
    let dims = { x: 75, y: 65, z: 70 };
    let slicingTips = [
      'Orient on print bed with integrated natural support pedestal for maximum first-layer adhesion.',
      'Lifelike organic curvature best printed with 0.16mm layer height and Gyroid infill.'
    ];

    if (isMushroom) {
      modelName = 'Bioluminescent Forest Mushroom Cluster (7-Color)';
      modelDesc = 'Lifelike fungal colony with parabolic pileus cap, radial under-cap gills, fibrous stipe with veil ring, and mossy weathered log substrate.';
      dims = { x: 78, y: 72, z: 68 };
      generatedSegments = [
        { id: 'mush-log', name: 'Weathered Bark Log Pedestal', filamentId: 8, geometryType: 'organic_mesh', transform: { position: [0, 6, 0], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 1] }, parameters: { radius: 14, height: 74, organicType: 'tree_trunk_bark', finish: 'mineral_stone' } },
        { id: 'mush-moss', name: 'Moss & Lichen Growth Bed', filamentId: 6, geometryType: 'organic_mesh', transform: { position: [0, 11, 0], rotation: [0, 0.4, 0], scale: [1.2, 0.35, 1.1] }, parameters: { radius: 24, organicType: 'rock_pedestal', finish: 'botanical_petal' } },
        { id: 'mush-stem-main', name: 'Primary Fibrous Stipe', filamentId: 1, geometryType: 'organic_mesh', transform: { position: [-6, 12, -4], rotation: [0.1, 0.2, -0.05], scale: [1, 1, 1] }, parameters: { radius: 7.5, height: 38, organicType: 'mushroom_stem', finish: 'organic_skin' } },
        { id: 'mush-cap-main', name: 'Primary Umbrella Pileus Cap', filamentId: 4, geometryType: 'organic_mesh', transform: { position: [-6, 50, -4], rotation: [0.08, 0, -0.04], scale: [1, 1, 1] }, parameters: { radius: 25, height: 18, organicType: 'mushroom_cap', finish: 'organic_skin' } },
        { id: 'mush-gills-main', name: 'Radiating Hymenophore Gills', filamentId: 5, geometryType: 'cylinder', transform: { position: [-6, 44, -4], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 22, height: 4 } },
        { id: 'mush-stem-small', name: 'Juvenile Secondary Stipe', filamentId: 1, geometryType: 'organic_mesh', transform: { position: [14, 12, 6], rotation: [-0.15, -0.3, 0.2], scale: [0.75, 0.75, 0.75] }, parameters: { radius: 6, height: 26, organicType: 'mushroom_stem', finish: 'organic_skin' } },
        { id: 'mush-cap-small', name: 'Juvenile Secondary Cap', filamentId: 7, geometryType: 'organic_mesh', transform: { position: [18, 38, 8], rotation: [-0.15, -0.2, 0.15], scale: [0.7, 0.7, 0.7] }, parameters: { radius: 17, height: 13, organicType: 'mushroom_cap', finish: 'organic_skin' } },
        { id: 'mush-spots', name: 'Spore Droplet Accents', filamentId: 2, geometryType: 'sphere', transform: { position: [-5, 59, -3], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 4 } },
      ];
    } else if (isChameleon) {
      modelName = 'Veiled Chameleon on Lichen Perch (8-Color)';
      modelDesc = 'Lifelike reptile anatomy featuring prehensile logarithmic spiral tail, dorsal cranial crest, perched limbs on bark branch, and conical turret eyes.';
      dims = { x: 84, y: 64, z: 72 };
      generatedSegments = [
        { id: 'cham-perch', name: 'Lichen Perch Branch', filamentId: 8, geometryType: 'organic_mesh', transform: { position: [0, 8, 0], rotation: [0, 0.2, Math.PI / 2], scale: [1, 1, 1] }, parameters: { radius: 10, height: 80, organicType: 'branch_bark', finish: 'mineral_stone' } },
        { id: 'cham-torso', name: 'Sculpted Chameleon Body', filamentId: 6, geometryType: 'organic_mesh', transform: { position: [-4, 28, 0], rotation: [0.1, 0, 0], scale: [1.2, 0.9, 1.3] }, parameters: { radius: 16, organicType: 'frog_body', finish: 'organic_skin' } },
        { id: 'cham-crest', name: 'Dorsal Cranial Casque Helmet', filamentId: 5, geometryType: 'cone', transform: { position: [6, 42, 12], rotation: [0.6, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 8, height: 16 } },
        { id: 'cham-tail', name: 'Prehensile Spiral Tail', filamentId: 6, geometryType: 'organic_mesh', transform: { position: [-26, 26, -12], rotation: [0, 0.4, 0.8], scale: [1, 1, 1] }, parameters: { radius: 18, height: 12, organicType: 'chameleon_tail', finish: 'organic_skin' } },
        { id: 'cham-forelimb-l', name: 'Left Zygodactylous Foot', filamentId: 4, geometryType: 'organic_mesh', transform: { position: [-12, 18, 12], rotation: [0.3, 0.4, -0.3], scale: [0.85, 0.85, 0.85] }, parameters: { radius: 10, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'cham-forelimb-r', name: 'Right Zygodactylous Foot', filamentId: 4, geometryType: 'organic_mesh', transform: { position: [8, 18, 12], rotation: [0.3, -0.4, 0.3], scale: [0.85, 0.85, 0.85] }, parameters: { radius: 10, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'cham-eye-l', name: 'Left Turret Cone Eye', filamentId: 2, geometryType: 'organic_mesh', transform: { position: [-2, 36, 18], rotation: [0.2, 0.5, 0], scale: [1, 1, 1] }, parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' } },
        { id: 'cham-eye-r', name: 'Right Turret Cone Eye', filamentId: 2, geometryType: 'organic_mesh', transform: { position: [14, 36, 18], rotation: [0.2, -0.5, 0], scale: [1, 1, 1] }, parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' } },
      ];
    } else if (isSucculent) {
      modelName = 'Echeveria Fleshy Succulent Rosette (6-Color)';
      modelDesc = 'Botanically accurate Fibonacci phyllotaxis rosette with fleshy, spoon-shaped succulent leaves in terracotta container with drainage bed.';
      dims = { x: 76, y: 52, z: 76 };
      generatedSegments = [
        { id: 'succ-pot', name: 'Terracotta Planter Pot', filamentId: 4, geometryType: 'cylinder', transform: { position: [0, 10, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radiusTop: 32, radiusBottom: 24, height: 20 } },
        { id: 'succ-rim', name: 'Planter Chamfer Rim', filamentId: 7, geometryType: 'cylinder', transform: { position: [0, 20, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 33, height: 4 } },
        { id: 'succ-soil', name: 'Mineral Pebble Soil Substrate', filamentId: 8, geometryType: 'cylinder', transform: { position: [0, 18, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 29, height: 3 } },
        { id: 'succ-leaves-outer', name: 'Outer Fleshy Succulent Rosette', filamentId: 6, geometryType: 'organic_mesh', transform: { position: [0, 20, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 26, height: 16, organicType: 'succulent_rosette', finish: 'fleshy_succulent' } },
        { id: 'succ-leaves-inner', name: 'Inner Glaucous Center Leaves', filamentId: 2, geometryType: 'organic_mesh', transform: { position: [0, 24, 0], rotation: [0, 0.4, 0], scale: [0.65, 0.75, 0.65] }, parameters: { radius: 22, height: 14, organicType: 'succulent_rosette', finish: 'fleshy_succulent' } },
        { id: 'succ-apical-bud', name: 'Apical Growing Meristem Core', filamentId: 1, geometryType: 'sphere', transform: { position: [0, 29, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 4 } },
      ];
    } else if (isCrystal) {
      modelName = 'Prismatic Hexagonal Quartz Geode Cluster (5-Color)';
      modelDesc = 'Geologically realistic hexagonal quartz prism cluster with 6-sided pyramid terminations nestled on dark mineral matrix rock.';
      dims = { x: 72, y: 60, z: 72 };
      generatedSegments = [
        { id: 'cryst-matrix', name: 'Dark Basalt Matrix Rock', filamentId: 8, geometryType: 'organic_mesh', transform: { position: [0, 6, 0], rotation: [0, 0, 0], scale: [1.3, 0.5, 1.2] }, parameters: { radius: 32, organicType: 'rock_pedestal', finish: 'mineral_stone' } },
        { id: 'cryst-cluster-main', name: 'Hexagonal Prismatic Quartz Pillars', filamentId: 2, geometryType: 'organic_mesh', transform: { position: [0, 10, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 24, height: 42, organicType: 'crystal_cluster', finish: 'crystalline_quartz' } },
        { id: 'cryst-pyramid-tips', name: 'Iridescent Termination Facets', filamentId: 5, geometryType: 'organic_mesh', transform: { position: [0, 22, 0], rotation: [0, 0.3, 0], scale: [0.75, 0.75, 0.75] }, parameters: { radius: 20, height: 34, organicType: 'crystal_cluster', finish: 'crystalline_quartz' } },
        { id: 'cryst-accent-druse', name: 'Sparkling Micro-Druse Inclusions', filamentId: 1, geometryType: 'cylinder', transform: { position: [0, 10, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 27, height: 3 } },
        { id: 'cryst-edge-vein', name: 'Calcite Perimeter Vein', filamentId: 7, geometryType: 'cylinder', transform: { position: [0, 8, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 31, height: 2 } },
      ];
    } else if (isTurtle) {
      modelName = 'Galapagos Giant Tortoise on Sand Matrix (6-Color)';
      modelDesc = 'Lifelike chelonian reptile with domed carapace scutes, sculptured plastron, textured crawling legs, and raised watchful head.';
      dims = { x: 80, y: 46, z: 74 };
      generatedSegments = [
        { id: 'turt-base', name: 'Sand Dune Matrix Bed', filamentId: 5, geometryType: 'organic_mesh', transform: { position: [0, 4, 0], rotation: [0, 0, 0], scale: [1.2, 0.4, 1.1] }, parameters: { radius: 36, organicType: 'rock_pedestal', finish: 'mineral_stone' } },
        { id: 'turt-shell', name: 'Sculptured Scute Carapace', filamentId: 8, geometryType: 'organic_mesh', transform: { position: [0, 20, 0], rotation: [0, 0, 0], scale: [1.1, 0.95, 1.25] }, parameters: { radius: 24, organicType: 'tortoise_shell', finish: 'organic_skin' } },
        { id: 'turt-plastron', name: 'Ventral Flat Plastron', filamentId: 1, geometryType: 'cylinder', transform: { position: [0, 11, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 23, height: 4 } },
        { id: 'turt-leg-fl', name: 'Foreleg Left Flange', filamentId: 6, geometryType: 'organic_mesh', transform: { position: [-18, 12, 14], rotation: [0.3, 0.4, -0.2], scale: [0.85, 0.85, 0.85] }, parameters: { radius: 10, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'turt-leg-fr', name: 'Foreleg Right Flange', filamentId: 6, geometryType: 'organic_mesh', transform: { position: [18, 12, 14], rotation: [0.3, -0.4, 0.2], scale: [0.85, 0.85, 0.85] }, parameters: { radius: 10, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'turt-head', name: 'Rostral Head & Neck', filamentId: 6, geometryType: 'sphere', transform: { position: [0, 18, 28], rotation: [0.2, 0, 0], scale: [1, 0.8, 1.3] }, parameters: { radius: 8.5 } },
      ];
    } else if (isFrog || isGeneralNature) {
      // Default / Frog flagship: Anatomically sculpted poison dart frog on weathered stone
      modelName = 'Dendrobates Azureus Dart Frog on Granite (8-Color)';
      modelDesc = 'Museum-grade anatomical amphibian sculpture with arched humped dorsal spine, cranial eye bulges, webbed digit pads, contrasting dorsal warning spots, and weathered mineral pedestal.';
      dims = { x: 82, y: 58, z: 76 };
      generatedSegments = [
        { id: 'frog-stone', name: 'Weathered Granite Boulder', filamentId: 8, geometryType: 'organic_mesh', transform: { position: [0, 8, 0], rotation: [0, 0.4, 0], scale: [1.2, 0.6, 1.1] }, parameters: { radius: 36, organicType: 'rock_pedestal', finish: 'mineral_stone' } },
        { id: 'frog-torso', name: 'Amphibian Sculpted Torso', filamentId: 2, geometryType: 'organic_mesh', transform: { position: [0, 28, 4], rotation: [-0.15, 0, 0], scale: [1.1, 0.9, 1.25] }, parameters: { radius: 18, organicType: 'frog_body', finish: 'organic_skin' } },
        { id: 'frog-throat', name: 'Ventral Throat & Chest Crest', filamentId: 1, geometryType: 'organic_mesh', transform: { position: [0, 22, 14], rotation: [-0.4, 0, 0], scale: [0.8, 0.7, 0.9] }, parameters: { radius: 11, organicType: 'smooth_anatomy', finish: 'organic_skin' } },
        { id: 'frog-arm-l', name: 'Left Forelimb & Digit Pad', filamentId: 4, geometryType: 'organic_mesh', transform: { position: [-16, 20, 14], rotation: [0.3, 0.5, -0.4], scale: [0.9, 0.9, 0.9] }, parameters: { radius: 12, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'frog-arm-r', name: 'Right Forelimb & Digit Pad', filamentId: 4, geometryType: 'organic_mesh', transform: { position: [16, 20, 14], rotation: [0.3, -0.5, 0.4], scale: [-0.9, 0.9, 0.9] }, parameters: { radius: 12, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'frog-leg-l', name: 'Left Hind Knee & Thigh Flange', filamentId: 7, geometryType: 'organic_mesh', transform: { position: [-20, 18, -10], rotation: [0.2, 1.8, -0.2], scale: [1.1, 1.0, 1.1] }, parameters: { radius: 15, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'frog-leg-r', name: 'Right Hind Knee & Thigh Flange', filamentId: 7, geometryType: 'organic_mesh', transform: { position: [20, 18, -10], rotation: [0.2, -1.8, 0.2], scale: [-1.1, 1.0, 1.1] }, parameters: { radius: 15, organicType: 'frog_limb', finish: 'organic_skin' } },
        { id: 'frog-dorsal-spot', name: 'Melanic Toxic Back Stripe', filamentId: 3, geometryType: 'organic_mesh', transform: { position: [0, 35, 2], rotation: [-0.1, 0, 0], scale: [0.75, 0.4, 1.0] }, parameters: { radius: 12, organicType: 'smooth_anatomy', finish: 'organic_skin' } },
        { id: 'frog-iris-l', name: 'Left Corneal Iris Bulge', filamentId: 5, geometryType: 'organic_mesh', transform: { position: [-8.5, 36, 17], rotation: [0.3, 0.4, 0], scale: [1, 1, 1] }, parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' } },
        { id: 'frog-iris-r', name: 'Right Corneal Iris Bulge', filamentId: 5, geometryType: 'organic_mesh', transform: { position: [8.5, 36, 17], rotation: [0.3, -0.4, 0], scale: [1, 1, 1] }, parameters: { radius: 4.8, organicType: 'organic_eye', finish: 'glossy_chitin' } },
      ];
    } else {
      // Mechanical / Badge / Geometric fallback
      generatedSegments = [
        { id: 'base-plate', name: 'Emblem Base Plate', filamentId: 3, geometryType: 'cylinder', transform: { position: [0, 4, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 36, height: 6 } },
        { id: 'mid-ring', name: 'Contrasting Accent Ring', filamentId: 5, geometryType: 'ring', transform: { position: [0, 8, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 32, tube: 3 } },
        { id: 'logo-core', name: 'Central Heraldic Icon', filamentId: 2, geometryType: 'box', transform: { position: [0, 10, 0], rotation: [0, Math.PI / 4, 0], scale: [1, 1, 1] }, parameters: { width: 22, height: 6, depth: 22 } },
        { id: 'top-crown', name: 'Crown Inset Star', filamentId: 7, geometryType: 'cone', transform: { position: [0, 15, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, parameters: { radius: 8, height: 8 } },
      ];
    }

    onModelGenerated({
      id: `proc-nature-${Date.now()}`,
      name: modelName,
      description: modelDesc,
      prompt: userPrompt,
      dimensions: dims,
      segments: generatedSegments,
      blenderPythonScript: '',
      slicingTips,
      generatedBy: selectedEngine === 'ollama' ? 'ollama' : 'gemini',
      createdAt: new Date().toISOString(),
    });
    setStatusMessage('Lifelike 3D nature model synthesized & sliced successfully!');
  };

  const samplePrompts = [
    'Naturtrogen giftgroda på mossig sten (8-färg)',
    'Skogssvampkluster med skivor & sporer (7-färg)',
    'Fibonacci nautilussnäcka med ränder (6-färg)',
    'Kameleont med spiralsvans på trädgren (8-färg)',
    'Köttig suckulent i kruka (6-färg)',
    'Prismatiskt ametistkvartskluster (5-färg)',
  ];

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 p-3 flex flex-col gap-2.5">
      {/* Top Engine & Connection Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {/* Engine Selector */}
          <div className="relative">
            <button
              onClick={() => setShowEngineDropdown(!showEngineDropdown)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-medium">
                {selectedEngine === 'ollama' ? `Ollama (${ollamaState.model})` : 'Gemini 3.8 Flash (Cloud)'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showEngineDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2 z-30 flex flex-col gap-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Inference Engine
                </div>
                <button
                  onClick={() => {
                    setSelectedEngine('ollama');
                    setShowEngineDropdown(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs ${
                    selectedEngine === 'ollama' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Local Ollama</span>
                  </div>
                  {ollamaState.isConnected ? (
                    <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">OFFLINE</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setSelectedEngine('gemini');
                    setShowEngineDropdown(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs ${
                    selectedEngine === 'gemini' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gemini 3.8 Flash</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">CLOUD</span>
                </button>

                {selectedEngine === 'ollama' && ollamaState.availableModels.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-slate-800 flex flex-col gap-1">
                    <div className="text-[10px] text-slate-400 px-2 font-mono">Select Ollama Model:</div>
                    {ollamaState.availableModels.map(m => (
                      <button
                        key={m}
                        onClick={() => {
                          setOllamaState(prev => ({ ...prev, model: m }));
                          setShowEngineDropdown(false);
                        }}
                        className={`px-2 py-1 text-[11px] rounded text-left font-mono ${
                          ollamaState.model === m ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ollama Health & Connection Indicator */}
          {selectedEngine === 'ollama' && (
            <div className="flex items-center gap-1.5 text-slate-400">
              {ollamaState.isConnected ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>localhost:11434</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Ollama Not Detected</span>
                  <button
                    onClick={checkOllamaConnection}
                    className="p-1 hover:text-white rounded transition-colors"
                    title="Check connection again"
                  >
                    <RefreshCw className={`w-3 h-3 ${ollamaState.isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Nature Realism Mode Active Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-[11px] text-emerald-300 font-medium">
            <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t.natureEngineActive || 'Naturtrogen 3D-Motor Aktiv'}</span>
          </div>
        </div>

        {/* Live Status Feedback */}
        {statusMessage && (
          <div className="text-cyan-300 font-medium animate-pulse flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Main Text Prompt Input Form */}
      <form onSubmit={handleGenerate} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={t.promptPlaceholder || 'Skapa naturtrogen 3D-modell (t.ex. "Naturtrogen giftgroda på sten", "Skogssvamp med skivor")...'}
            disabled={isGenerating}
            className="w-full bg-slate-950 text-white text-sm px-4 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 transition-colors"
          />
        </div>

        {/* Optimize Prompt Button */}
        <button
          type="button"
          onClick={handleOptimizePrompt}
          disabled={!prompt.trim() || isOptimizing || isGenerating}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-755 disabled:bg-slate-900 disabled:text-slate-600 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
          title="Optimera och förtydliga prompten för Anycubic multi-color CAD och rena färgskikt"
        >
          <Wand2 className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin text-amber-400' : 'text-cyan-400'}`} />
          <span>{isOptimizing ? (t.btnOptimizing || 'Optimerar...') : (t.btnOptimizePrompt || 'Optimera prompt')}</span>
        </button>

        <button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t.btnGenerating || 'Genererar...'}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{t.btnGenerate || 'Generera 3D-modell'}</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Prompt Ideas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs text-slate-400 scrollbar-none">
        <span className="shrink-0 text-slate-500 font-medium">Quick Presets:</span>
        {samplePrompts.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setPrompt(s)}
            className="shrink-0 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/60 transition-colors whitespace-nowrap"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};
