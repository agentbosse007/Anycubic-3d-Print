export type SupportedLanguage = 'sv' | 'en' | 'de' | 'fr' | 'es' | 'zh';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '简体中文', flag: '🇨🇳' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  sv: {
    // Top Bar
    appTitle: 'CHROMAFORGE',
    appSubtitle: 'Blender & Ollama Multi-Color Studio',
    madeBy: 'Made by Bolorentzon 2026',
    tabAssembly: '3D-Montering',
    tabFilaments: 'ACE Pro Filament',
    tabSlicer: 'Skivningsoptimerare',
    tabBlender: 'Blender-brygga (bpy)',
    btnKobraSpecs: 'Kobra-specifikationer',
    btnExport3MF: 'Exportera Anycubic .3MF',
    btnExporting3MF: 'Packar 3MF...',
    btnStlArchive: 'STL-arkiv (.zip)',
    btnCreatorInfo: 'Made by Bolorentzon 2026',
    languageBtn: 'Språk',
    selectLanguage: 'Välj språk',
    validateScriptBtn: 'Validera & Optimera skript',
    generatePromptBtn: 'Skapa Ollama-prompt från Blender',
    copiedPrompt: 'Prompt kopierad och skickad till Ollama!',

    // Creator Modal
    creatorTitle: 'ChromaForge Studio Information',
    creatorBadge: 'Made by Bolorentzon 2026',
    creatorDesc: 'Professionellt AI-assisterat 3D-modelleringssystem som förenar Blender, lokal Ollama AI och Anycubic Kobra 3 ACE Pro för 8-färgers 3D-utskrift med minimalt färgspill.',
    creatorSpecsTitle: 'Systemarkitektur & Kompatibilitet',
    spec1: 'Optimerad för Anycubic Kobra 3 Combo (Dubbla ACE Pro för upp till 8 färger) & Kobra X.',
    spec2: 'Lokal Ollama AI (llama3.2, deepseek-r1, qwen2.5-coder) + Google Gemini molnmotor.',
    spec3: 'Tvåvägs Python-brygga till Blender 3.6 – 4.3 med automatisk Subsurface & PBR-material.',
    spec4: 'Avancerad spolkalkylator med färgövergångsmatris och förhandsvisning av färgblödning.',
    creatorCopyright: '© 2026 Bolorentzon. All rights reserved. Byggd med modern WebGL och AI.',
    closeBtn: 'Stäng',

    // Prompt Bar
    promptPlaceholder: 'Skapa naturtrogen 3D-modell (t.ex. "Naturtrogen giftgroda på sten", "Skogssvamp med skivor", "Kameleont med spiralsvans")...',
    btnGenerate: 'Generera 3D-modell',
    btnGenerating: 'Genererar...',
    btnOptimizePrompt: 'Optimera prompt',
    btnOptimizing: 'Optimerar...',
    natureEngineActive: 'Naturtrogen 3D-Motor Aktiv',
    quickPresets: 'Snabba förslag:',
    inferenceEngine: 'Inferensmotor',
    localOllama: 'Lokal Ollama',
    geminiCloud: 'Gemini 3.8 Flash',
    ollamaOffline: 'Ollama Ej Detekterad',
    synthesizingMsg: 'Syntetiserar 3D multi-material CAD...',
    modelGeneratedSuccess: '3D-modell genererad och validerad för utskrift!',

    // Viewport
    activeSlots: 'Aktiva kanaler',
    bleedSimulation: 'Färgblödning',
    naturePbr: 'Natur PBR',
    wasteBox: 'Spillbox',
    paintTool: 'Måla',
    wireframe: 'Trådmodell',
    slicePlane: 'Skivningsplan',
    resetCamera: 'Återställ vy',
    naturePbrTitle: 'Naturtrogen PBR-Rendering',
    naturePbrSubtitle: 'Micro-bump texturer, klar-lack & biologisk subsurface',
    wasteEnvelope: 'Spillvolym-kuvert:',
    flushScaling: 'Spolskalning',
    paintActiveBanner: 'Klicka på valfri del i 3D-vyn för att måla med Slot',
    modelLabel: 'Modell:',
    partsLabel: 'delar',
    presetsLabel: 'Förval:',

    // Bleed simulation HUD
    bleedTitle: 'Simulering av färgövergång & spolspill',
    bleedSubtitle: 'Simulerar smältzonskontaminering i Anycubic ACE Pro under verktygsväxlingar',
    btnAutoFixBleed: 'Autokorrigera blödning',
    simulatedPurgeRatio: 'Simulerad spolfaktor:',
    underPurged: '(Underspolad / Risk för färgblödning)',
    borderlineClean: '(Gränsfall ren färg)',
    fullClean: '(Helt ren övergång)',
    noBleedDetected: 'Ingen färgblödning detekterad. Nuvarande spolmängder ger skarpa färgkontraster.',
    neededExtra: 'behövs extra',

    // Filament Manager
    filamentManagerTitle: 'Anycubic ACE Pro Filamenthanterare',
    filamentManagerSubtitle: 'Hantera upp till 8 spolar via sammankopplade ACE Pro-enheter med automatisk torkning och RFID',
    unit1Title: 'ACE Pro Enhet 1 (Spole 1-4)',
    unit2Title: 'ACE Pro Enhet 2 (Spole 5-8)',
    activeFilament: 'Aktivt filament för målning:',
    tempNozzle: 'Munstyckstemp',
    tempBed: 'Bäddtemp',
    material: 'Material',

    // Slicing Optimizer
    slicerTitle: 'Anycubic Multi-Material Skivningsoptimerare',
    slicerSubtitle: 'Minska spolspill med intelligent infill-spolning och anpassad färgövergångsmatris',
    totalPrintTime: 'Beräknad utskriftstid',
    totalPurgeWaste: 'Totalt färgspill',
    infillSavings: 'Besparing via Infill-spolning',
    totalToolSwaps: 'Verktygsväxlingar',
    flushMatrixTitle: 'Spolmängdsmatris (mm³ per färgväxling)',
    flushMultiplier: 'Global spolmultiplikator',
    purgeIntoInfill: 'Spola färgspill i fyllning (Infill)',
    purgeIntoSupport: 'Spola färgspill i stödstrukturer',
    wipeTowerConfig: 'Spoltorn / Wipe Tower',

    // Blender Bridge
    blenderTitle: 'Blender Bridge & Anycubic Exporter',
    blenderSubtitle: 'Överför text och geometri till och från Blender (bpy) med automatisk validering och multi-material 3MF / STL.',
    tabTextToBlender: 'Text till Blender',
    tabTextFromBlender: 'Text från Blender',
    tabLiveBridge: 'Live-brygga (Port 8008)',
    blenderStatus: 'Blender-status:',
    connected: 'ANSLUTEN',
    notConnected: 'Ej ansluten till port 8008',
    btnRunInBlender: 'Kör i Blender (1-Klick)',
    copyCode: 'Kopiera kod',
    copied: 'Kopierat!',
    downloadPy: 'Ladda ner .py',
    importFromBlender: 'Importera & Synka från Blender:',
    parseAndSync: 'Tolka & Synka till 3D-visaren',
  },

  en: {
    // Top Bar
    appTitle: 'CHROMAFORGE',
    appSubtitle: 'Blender & Ollama Multi-Color Studio',
    madeBy: 'Made by Bolorentzon 2026',
    tabAssembly: '3D Assembly',
    tabFilaments: 'ACE Pro Filaments',
    tabSlicer: 'Slicing Optimizer',
    tabBlender: 'Blender Bridge (bpy)',
    btnKobraSpecs: 'Kobra Specs',
    btnExport3MF: 'Export Anycubic .3MF',
    btnExporting3MF: 'Packing 3MF...',
    btnStlArchive: 'STL Archive (.zip)',
    btnCreatorInfo: 'Made by Bolorentzon 2026',
    languageBtn: 'Language',
    selectLanguage: 'Select Language',
    validateScriptBtn: 'Validate & Optimize Script',
    generatePromptBtn: 'Generate Ollama Prompt from Blender',
    copiedPrompt: 'Prompt copied & sent to Ollama bar!',

    // Creator Modal
    creatorTitle: 'ChromaForge Studio Information',
    creatorBadge: 'Made by Bolorentzon 2026',
    creatorDesc: 'Professional AI-assisted 3D modeling and multi-material slicing system bridging Blender, local Ollama AI, and Anycubic Kobra 3 ACE Pro for 8-color 3D printing with minimal purge waste.',
    creatorSpecsTitle: 'System Architecture & Compatibility',
    spec1: 'Optimized for Anycubic Kobra 3 Combo (Dual ACE Pro up to 8 colors) & Kobra X.',
    spec2: 'Local Ollama AI (llama3.2, deepseek-r1, qwen2.5-coder) + Google Gemini cloud engine.',
    spec3: 'Two-way Python bridge for Blender 3.6 – 4.3 with automated Subsurface & PBR materials.',
    spec4: 'Advanced purge calculator with transition matrix and purge color bleeding simulation.',
    creatorCopyright: '© 2026 Bolorentzon. All rights reserved. Built with modern WebGL and AI.',
    closeBtn: 'Close',

    // Prompt Bar
    promptPlaceholder: 'Prompt realistic 3D model (e.g. "Lifelike poison dart frog on stone", "Forest mushroom with gills", "Chameleon with spiral tail")...',
    btnGenerate: 'Generate 3D Model',
    btnGenerating: 'Generating...',
    btnOptimizePrompt: 'Optimize Prompt',
    btnOptimizing: 'Optimizing...',
    natureEngineActive: 'Lifelike 3D Engine Active',
    quickPresets: 'Quick Presets:',
    inferenceEngine: 'Inference Engine',
    localOllama: 'Local Ollama',
    geminiCloud: 'Gemini 3.8 Flash',
    ollamaOffline: 'Ollama Offline',
    synthesizingMsg: 'Synthesizing 3D multi-material CAD...',
    modelGeneratedSuccess: '3D model generated and validated for printing!',

    // Viewport
    activeSlots: 'Active Channels',
    bleedSimulation: 'Bleed Sim',
    naturePbr: 'Nature PBR',
    wasteBox: 'Waste Box',
    paintTool: 'Paint',
    wireframe: 'Wireframe',
    slicePlane: 'Slice Plane',
    resetCamera: 'Reset View',
    naturePbrTitle: 'Photorealistic Nature PBR',
    naturePbrSubtitle: 'Micro-bump textures, clearcoat & biological subsurface',
    wasteEnvelope: 'Purge Waste Envelope:',
    flushScaling: 'Flush Scaling',
    paintActiveBanner: 'Click any 3D segment to paint with Slot',
    modelLabel: 'Model:',
    partsLabel: 'parts',
    presetsLabel: 'Presets:',

    // Bleed simulation HUD
    bleedTitle: 'Purge Transition & Bleeding Simulation',
    bleedSubtitle: 'Simulating hotend residual pigment melt zone during Anycubic ACE Pro tool changes',
    btnAutoFixBleed: 'Auto-Resolve Bleed',
    simulatedPurgeRatio: 'Simulated Purge Factor:',
    underPurged: '(Under-Purged / Severe Bleed Risk)',
    borderlineClean: '(Borderline Clean)',
    fullClean: '(Full Clean Transition)',
    noBleedDetected: 'No bleeding detected. Current purge volumes provide crisp color transitions.',
    neededExtra: 'extra needed',

    // Filament Manager
    filamentManagerTitle: 'Anycubic ACE Pro Filament Manager',
    filamentManagerSubtitle: 'Manage up to 8 spools via daisy-chained ACE Pro units with active heated drying and RFID',
    unit1Title: 'ACE Pro Unit 1 (Slots 1-4)',
    unit2Title: 'ACE Pro Unit 2 (Slots 5-8)',
    activeFilament: 'Active Paint Filament:',
    tempNozzle: 'Nozzle Temp',
    tempBed: 'Bed Temp',
    material: 'Material',

    // Slicing Optimizer
    slicerTitle: 'Anycubic Multi-Material Slicing Optimizer',
    slicerSubtitle: 'Minimize purge waste with intelligent infill flushing and custom transition matrices',
    totalPrintTime: 'Estimated Print Time',
    totalPurgeWaste: 'Total Purge Waste',
    infillSavings: 'Savings via Infill Purge',
    totalToolSwaps: 'Tool Changes',
    flushMatrixTitle: 'Flushing Volume Matrix (mm³ per swap)',
    flushMultiplier: 'Global Flush Multiplier',
    purgeIntoInfill: 'Purge waste into model infill',
    purgeIntoSupport: 'Purge waste into support structures',
    wipeTowerConfig: 'Wipe Tower Configuration',

    // Blender Bridge
    blenderTitle: 'Blender Bridge & Anycubic Exporter',
    blenderSubtitle: 'Transfer text and geometry to and from Blender (bpy) with automatic validation and multi-material 3MF / STL.',
    tabTextToBlender: 'Text to Blender',
    tabTextFromBlender: 'Text from Blender',
    tabLiveBridge: 'Live Bridge (Port 8008)',
    blenderStatus: 'Blender Status:',
    connected: 'CONNECTED',
    notConnected: 'Not connected to port 8008',
    btnRunInBlender: 'Run in Blender (1-Click)',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    downloadPy: 'Download .py',
    importFromBlender: 'Import & Sync from Blender:',
    parseAndSync: 'Parse & Sync to 3D Viewport',
  },

  de: {
    // Top Bar
    appTitle: 'CHROMAFORGE',
    appSubtitle: 'Blender & Ollama Multi-Color Studio',
    madeBy: 'Made by Bolorentzon 2026',
    tabAssembly: '3D-Baugruppe',
    tabFilaments: 'ACE Pro Filamente',
    tabSlicer: 'Slicing-Optimierer',
    tabBlender: 'Blender-Brücke (bpy)',
    btnKobraSpecs: 'Kobra Spezifikationen',
    btnExport3MF: 'Anycubic .3MF Exportieren',
    btnExporting3MF: 'Packe 3MF...',
    btnStlArchive: 'STL-Archiv (.zip)',
    btnCreatorInfo: 'Made by Bolorentzon 2026',
    languageBtn: 'Sprache',
    selectLanguage: 'Sprache wählen',
    validateScriptBtn: 'Skript prüfen & optimieren',
    generatePromptBtn: 'Ollama-Prompt aus Blender erstellen',
    copiedPrompt: 'Prompt kopiert & an Ollama gesendet!',

    // Creator Modal
    creatorTitle: 'ChromaForge Studio Information',
    creatorBadge: 'Made by Bolorentzon 2026',
    creatorDesc: 'Professionelles KI-gestütztes 3D-Modellierungssystem, das Blender, lokale Ollama-KI und Anycubic Kobra 3 ACE Pro für den 8-Farben-Druck mit minimalem Spülverlust verbindet.',
    creatorSpecsTitle: 'Systemarchitektur & Kompatibilität',
    spec1: 'Optimiert für Anycubic Kobra 3 Combo (Duale ACE Pro bis zu 8 Farben) & Kobra X.',
    spec2: 'Lokale Ollama-KI (llama3.2, deepseek-r1) + Google Gemini Cloud-Engine.',
    spec3: 'Zwei-Wege-Python-Brücke für Blender 3.6 – 4.3 mit automatischer Subsurface & PBR.',
    spec4: 'Erweiterter Spülrechner mit Übergangsmatrix und Farbblutungssimulation.',
    creatorCopyright: '© 2026 Bolorentzon. Alle Rechte vorbehalten. Entwickelt mit WebGL und KI.',
    closeBtn: 'Schließen',

    // Prompt Bar
    promptPlaceholder: 'Realistisches 3D-Modell anfordern (z.B. "Pfeilgiftfrosch auf Stein", "Waldpilz mit Lamellen")...',
    btnGenerate: '3D-Modell generieren',
    btnGenerating: 'Generiere...',
    btnOptimizePrompt: 'Prompt optimieren',
    btnOptimizing: 'Optimiere...',
    natureEngineActive: 'Naturgetreue 3D-Engine Aktiv',
    quickPresets: 'Schnellvorlagen:',
    inferenceEngine: 'Inferenz-Engine',
    localOllama: 'Lokale Ollama',
    geminiCloud: 'Gemini 3.8 Flash',
    ollamaOffline: 'Ollama Offline',
    synthesizingMsg: 'Synthetisiere 3D-Multimaterial-CAD...',
    modelGeneratedSuccess: '3D-Modell erfolgreich generiert und validiert!',

    // Viewport
    activeSlots: 'Aktive Kanäle',
    bleedSimulation: 'Farbblutung',
    naturePbr: 'Natur PBR',
    wasteBox: 'Müllbox',
    paintTool: 'Malen',
    wireframe: 'Drahtgitter',
    slicePlane: 'Schnittebene',
    resetCamera: 'Kamera zurücksetzen',
    naturePbrTitle: 'Fotorealistisches Natur-PBR',
    naturePbrSubtitle: 'Mikro-Bump-Texturen, Klarlack & biologische Streuung',
    wasteEnvelope: 'Spülvolumen-Hülle:',
    flushScaling: 'Spülskalierung',
    paintActiveBanner: 'Klicken Sie auf ein 3D-Teil, um es mit Slot zu bemalen',
    modelLabel: 'Modell:',
    partsLabel: 'Teile',
    presetsLabel: 'Vorlagen:',

    // Bleed simulation HUD
    bleedTitle: 'Spülübergangs- & Farbblutungssimulation',
    bleedSubtitle: 'Simulation der Pigmentrückstände im Hotend während Anycubic ACE Pro Werkzeugwechseln',
    btnAutoFixBleed: 'Blutung automatisch beheben',
    simulatedPurgeRatio: 'Simulierter Spülfaktor:',
    underPurged: '(Unterspült / Hohes Blutungsrisiko)',
    borderlineClean: '(Grenzwertig sauber)',
    fullClean: '(Vollständig saubere Trennung)',
    noBleedDetected: 'Keine Farbblutung erkannt. Aktuelle Spülvolumina gewährleisten scharfe Kontraste.',
    neededExtra: 'zusätzlich benötigt',

    // Filament Manager
    filamentManagerTitle: 'Anycubic ACE Pro Filament-Manager',
    filamentManagerSubtitle: 'Verwalten Sie bis zu 8 Spulen über gekoppelte ACE Pro-Einheiten mit aktiver Trocknung und RFID',
    unit1Title: 'ACE Pro Einheit 1 (Slots 1-4)',
    unit2Title: 'ACE Pro Einheit 2 (Slots 5-8)',
    activeFilament: 'Aktives Mal-Filament:',
    tempNozzle: 'Düsentemperatur',
    tempBed: 'Betttemperatur',
    material: 'Material',

    // Slicing Optimizer
    slicerTitle: 'Anycubic Multi-Material Slicing-Optimierer',
    slicerSubtitle: 'Minimieren Sie Spülverlust durch intelligentes Infill-Spülen und Übergangsmatrizen',
    totalPrintTime: 'Geschätzte Druckzeit',
    totalPurgeWaste: 'Gesamter Spülverlust',
    infillSavings: 'Einsparung durch Infill-Spülung',
    totalToolSwaps: 'Werkzeugwechsel',
    flushMatrixTitle: 'Spülvolumen-Matrix (mm³ pro Wechsel)',
    flushMultiplier: 'Globaler Spülmultiplikator',
    purgeIntoInfill: 'In Bauteil-Infill spülen',
    purgeIntoSupport: 'In Stützstrukturen spülen',
    wipeTowerConfig: 'Spülturm-Konfiguration',

    // Blender Bridge
    blenderTitle: 'Blender-Brücke & Anycubic Exporter',
    blenderSubtitle: 'Text und Geometrie von und nach Blender (bpy) mit automatischer Validierung übertragen.',
    tabTextToBlender: 'Text nach Blender',
    tabTextFromBlender: 'Text von Blender',
    tabLiveBridge: 'Live-Brücke (Port 8008)',
    blenderStatus: 'Blender-Status:',
    connected: 'VERBUNDEN',
    notConnected: 'Nicht verbunden mit Port 8008',
    btnRunInBlender: 'In Blender ausführen (1-Klick)',
    copyCode: 'Code kopieren',
    copied: 'Kopiert!',
    downloadPy: '.py herunterladen',
    importFromBlender: 'Aus Blender importieren & synchronisieren:',
    parseAndSync: 'Analysieren & in 3D synchronisieren',
  },

  fr: {
    // Top Bar
    appTitle: 'CHROMAFORGE',
    appSubtitle: 'Blender & Ollama Multi-Color Studio',
    madeBy: 'Made by Bolorentzon 2026',
    tabAssembly: 'Assemblage 3D',
    tabFilaments: 'Filaments ACE Pro',
    tabSlicer: 'Optimiseur de découpage',
    tabBlender: 'Pont Blender (bpy)',
    btnKobraSpecs: 'Spécifications Kobra',
    btnExport3MF: 'Exporter Anycubic .3MF',
    btnExporting3MF: 'Compression 3MF...',
    btnStlArchive: 'Archive STL (.zip)',
    btnCreatorInfo: 'Made by Bolorentzon 2026',
    languageBtn: 'Langue',
    selectLanguage: 'Choisir la langue',
    validateScriptBtn: 'Valider et optimiser le script',
    generatePromptBtn: 'Générer prompt Ollama depuis Blender',
    copiedPrompt: 'Prompt copié et transmis à Ollama !',

    // Creator Modal
    creatorTitle: 'Informations ChromaForge Studio',
    creatorBadge: 'Made by Bolorentzon 2026',
    creatorDesc: 'Système professionnel de modélisation 3D assisté par IA reliant Blender, Ollama local et Anycubic Kobra 3 ACE Pro pour l’impression 3D en 8 couleurs avec un gaspillage minimal de purge.',
    creatorSpecsTitle: 'Architecture du système & Compatibilité',
    spec1: 'Optimisé pour Anycubic Kobra 3 Combo (Double ACE Pro jusqu’à 8 couleurs) et Kobra X.',
    spec2: 'IA locale Ollama (llama3.2, deepseek-r1) + moteur cloud Google Gemini.',
    spec3: 'Pont Python bidirectionnel pour Blender 3.6 – 4.3 avec Subsurface & matériaux PBR.',
    spec4: 'Calculateur avancé de purge avec matrice de transition et simulation de contamination.',
    creatorCopyright: '© 2026 Bolorentzon. Tous droits réservés. Conçu avec WebGL et IA.',
    closeBtn: 'Fermer',

    // Prompt Bar
    promptPlaceholder: 'Demandez un modèle 3D réaliste (ex: "Grenouille dendrobate sur roche", "Champignon de forêt")...',
    btnGenerate: 'Générer le modèle 3D',
    btnGenerating: 'Génération...',
    btnOptimizePrompt: 'Optimiser le prompt',
    btnOptimizing: 'Optimisation...',
    natureEngineActive: 'Moteur 3D Réaliste Actif',
    quickPresets: 'Suggestions rapides :',
    inferenceEngine: 'Moteur d’inférence',
    localOllama: 'Ollama local',
    geminiCloud: 'Gemini 3.8 Flash',
    ollamaOffline: 'Ollama hors ligne',
    synthesizingMsg: 'Synthèse CAO 3D multi-matériaux...',
    modelGeneratedSuccess: 'Modèle 3D généré et validé pour impression !',

    // Viewport
    activeSlots: 'Canaux actifs',
    bleedSimulation: 'Contamination',
    naturePbr: 'Nature PBR',
    wasteBox: 'Volume purge',
    paintTool: 'Peindre',
    wireframe: 'Filaire',
    slicePlane: 'Plan de coupe',
    resetCamera: 'Réinitialiser vue',
    naturePbrTitle: 'Rendu PBR Naturel Photoréaliste',
    naturePbrSubtitle: 'Textures micro-relief, vernis brillant & dispersion biologique',
    wasteEnvelope: 'Enveloppe de déchets de purge :',
    flushScaling: 'Facteur de purge',
    paintActiveBanner: 'Cliquez sur une pièce 3D pour peindre avec le Slot',
    modelLabel: 'Modèle :',
    partsLabel: 'pièces',
    presetsLabel: 'Préréglages :',

    // Bleed simulation HUD
    bleedTitle: 'Simulation de transition de purge & contamination',
    bleedSubtitle: 'Simule la zone de fusion des pigments résiduels lors des changements d’outils Anycubic ACE Pro',
    btnAutoFixBleed: 'Corriger automatiquement la contamination',
    simulatedPurgeRatio: 'Facteur de purge simulé :',
    underPurged: '(Sous-purgé / Risque élevé de bavure)',
    borderlineClean: '(Limite acceptable)',
    fullClean: '(Transition nette et propre)',
    noBleedDetected: 'Aucune bavure détectée. Les volumes de purge actuels assurent des séparations nettes.',
    neededExtra: 'nécessaire en plus',

    // Filament Manager
    filamentManagerTitle: 'Gestionnaire de filaments Anycubic ACE Pro',
    filamentManagerSubtitle: 'Gérez jusqu’à 8 bobines via des unités ACE Pro chaînées avec séchage actif et RFID',
    unit1Title: 'ACE Pro Unité 1 (Slots 1-4)',
    unit2Title: 'ACE Pro Unité 2 (Slots 5-8)',
    activeFilament: 'Filament actif pour peindre :',
    tempNozzle: 'Temp. Buse',
    tempBed: 'Temp. Plateau',
    material: 'Matériau',

    // Slicing Optimizer
    slicerTitle: 'Optimiseur de découpage multi-matériaux Anycubic',
    slicerSubtitle: 'Minimisez le gaspillage de purge avec la purge dans le remplissage et la matrice personnalisée',
    totalPrintTime: 'Temps d’impression estimé',
    totalPurgeWaste: 'Gaspillage total de purge',
    infillSavings: 'Économie via purge dans remplissage',
    totalToolSwaps: 'Changements d’outils',
    flushMatrixTitle: 'Matrice de volume de purge (mm³ par changement)',
    flushMultiplier: 'Multiplicateur global de purge',
    purgeIntoInfill: 'Purger dans le remplissage interne',
    purgeIntoSupport: 'Purger dans les supports',
    wipeTowerConfig: 'Configuration de la tour de purge',

    // Blender Bridge
    blenderTitle: 'Pont Blender & Exportateur Anycubic',
    blenderSubtitle: 'Transférez du texte et de la géométrie vers et depuis Blender (bpy) avec validation automatique.',
    tabTextToBlender: 'Texte vers Blender',
    tabTextFromBlender: 'Texte depuis Blender',
    tabLiveBridge: 'Pont en direct (Port 8008)',
    blenderStatus: 'Statut Blender :',
    connected: 'CONNECTÉ',
    notConnected: 'Non connecté au port 8008',
    btnRunInBlender: 'Exécuter dans Blender (1-Clic)',
    copyCode: 'Copier le code',
    copied: 'Copié !',
    downloadPy: 'Télécharger .py',
    importFromBlender: 'Importer & Synchroniser depuis Blender :',
    parseAndSync: 'Analyser & Synchroniser vers la 3D',
  },

  es: {
    // Top Bar
    appTitle: 'CHROMAFORGE',
    appSubtitle: 'Blender & Ollama Multi-Color Studio',
    madeBy: 'Made by Bolorentzon 2026',
    tabAssembly: 'Ensamblaje 3D',
    tabFilaments: 'Filamentos ACE Pro',
    tabSlicer: 'Optimizador de corte',
    tabBlender: 'Puente Blender (bpy)',
    btnKobraSpecs: 'Especificaciones Kobra',
    btnExport3MF: 'Exportar Anycubic .3MF',
    btnExporting3MF: 'Empaquetando 3MF...',
    btnStlArchive: 'Archivo STL (.zip)',
    btnCreatorInfo: 'Made by Bolorentzon 2026',
    languageBtn: 'Idioma',
    selectLanguage: 'Seleccionar idioma',
    validateScriptBtn: 'Validar y optimizar script',
    generatePromptBtn: 'Generar prompt Ollama desde Blender',
    copiedPrompt: '¡Prompt copiado y transferido a Ollama!',

    // Creator Modal
    creatorTitle: 'Información de ChromaForge Studio',
    creatorBadge: 'Made by Bolorentzon 2026',
    creatorDesc: 'Sistema profesional de modelado 3D asistido por IA que une Blender, Ollama local y Anycubic Kobra 3 ACE Pro para impresión 3D a 8 colores con mínimo desperdicio de purga.',
    creatorSpecsTitle: 'Arquitectura del sistema & Compatibilidad',
    spec1: 'Optimizado para Anycubic Kobra 3 Combo (Doble ACE Pro hasta 8 colores) y Kobra X.',
    spec2: 'IA local Ollama (llama3.2, deepseek-r1) + motor en la nube Google Gemini.',
    spec3: 'Puente bidireccional Python para Blender 3.6 – 4.3 con Subsurface y materiales PBR.',
    spec4: 'Calculadora avanzada de purga con matriz de transición y simulación de sangrado.',
    creatorCopyright: '© 2026 Bolorentzon. Todos los derechos reservados. Creado con WebGL e IA.',
    closeBtn: 'Cerrar',

    // Prompt Bar
    promptPlaceholder: 'Solicite un modelo 3D realista (ej: "Rana dardo en roca", "Hongo de bosque con branquias")...',
    btnGenerate: 'Generar modelo 3D',
    btnGenerating: 'Generando...',
    btnOptimizePrompt: 'Optimizar prompt',
    btnOptimizing: 'Optimizando...',
    natureEngineActive: 'Motor 3D Realista Activo',
    quickPresets: 'Sugerencias rápidas:',
    inferenceEngine: 'Motor de inferencia',
    localOllama: 'Ollama local',
    geminiCloud: 'Gemini 3.8 Flash',
    ollamaOffline: 'Ollama desconectado',
    synthesizingMsg: 'Sintetizando CAD 3D multimaterial...',
    modelGeneratedSuccess: '¡Modelo 3D generado y validado para impresión!',

    // Viewport
    activeSlots: 'Canales activos',
    bleedSimulation: 'Sangrado',
    naturePbr: 'Naturaleza PBR',
    wasteBox: 'Caja desperdicio',
    paintTool: 'Pintar',
    wireframe: 'Malla alambre',
    slicePlane: 'Plano de corte',
    resetCamera: 'Restablecer vista',
    naturePbrTitle: 'Renderizado PBR Natural Fotorrealista',
    naturePbrSubtitle: 'Texturas micro-relieve, laca brillante y dispersión biológica',
    wasteEnvelope: 'Envoltura de residuo de purga:',
    flushScaling: 'Escala de purga',
    paintActiveBanner: 'Haga clic en cualquier pieza 3D para pintar con el Slot',
    modelLabel: 'Modelo:',
    partsLabel: 'piezas',
    presetsLabel: 'Ajustes:',

    // Bleed simulation HUD
    bleedTitle: 'Simulación de transición de purga y sangrado',
    bleedSubtitle: 'Simulando zona de fusión de pigmento residual durante cambios de herramienta en Anycubic ACE Pro',
    btnAutoFixBleed: 'Autocorregir sangrado',
    simulatedPurgeRatio: 'Factor de purga simulado:',
    underPurged: '(Purga insuficiente / Riesgo alto de mancha)',
    borderlineClean: '(Límite aceptable)',
    fullClean: '(Transición completamente limpia)',
    noBleedDetected: 'No se detectó sangrado. Los volúmenes actuales proporcionan transiciones nítidas.',
    neededExtra: 'adicional necesario',

    // Filament Manager
    filamentManagerTitle: 'Gestor de filamentos Anycubic ACE Pro',
    filamentManagerSubtitle: 'Administre hasta 8 bobinas mediante unidades ACE Pro encadenadas con secado activo y RFID',
    unit1Title: 'ACE Pro Unidad 1 (Slots 1-4)',
    unit2Title: 'ACE Pro Unidad 2 (Slots 5-8)',
    activeFilament: 'Filamento activo para pintar:',
    tempNozzle: 'Temp. Boquilla',
    tempBed: 'Temp. Cama',
    material: 'Material',

    // Slicing Optimizer
    slicerTitle: 'Optimizador de laminado multimaterial Anycubic',
    slicerSubtitle: 'Minimice el desperdicio de purga con purga en relleno y matrices de transición',
    totalPrintTime: 'Tiempo estimado de impresión',
    totalPurgeWaste: 'Desperdicio total de purga',
    infillSavings: 'Ahorro mediante purga en relleno',
    totalToolSwaps: 'Cambios de herramienta',
    flushMatrixTitle: 'Matriz de volumen de purga (mm³ por cambio)',
    flushMultiplier: 'Multiplicador global de purga',
    purgeIntoInfill: 'Purgar residuo en relleno interno',
    purgeIntoSupport: 'Purgar residuo en soportes',
    wipeTowerConfig: 'Configuración de torre de purga',

    // Blender Bridge
    blenderTitle: 'Puente Blender & Exportador Anycubic',
    blenderSubtitle: 'Transfiera texto y geometría hacia y desde Blender (bpy) con validación automática.',
    tabTextToBlender: 'Texto a Blender',
    tabTextFromBlender: 'Texto desde Blender',
    tabLiveBridge: 'Puente en vivo (Puerto 8008)',
    blenderStatus: 'Estado de Blender:',
    connected: 'CONECTADO',
    notConnected: 'No conectado al puerto 8008',
    btnRunInBlender: 'Ejecutar en Blender (1-Clic)',
    copyCode: 'Copiar código',
    copied: '¡Copiado!',
    downloadPy: 'Descargar .py',
    importFromBlender: 'Importar y sincronizar desde Blender:',
    parseAndSync: 'Analizar y sincronizar a 3D',
  },

  zh: {
    // Top Bar
    appTitle: 'CHROMAFORGE',
    appSubtitle: 'Blender 与 Ollama 多色 3D 打印工作室',
    madeBy: 'Made by Bolorentzon 2026',
    tabAssembly: '3D 装配体',
    tabFilaments: 'ACE Pro 耗材管理',
    tabSlicer: '切片冲刷优化',
    tabBlender: 'Blender 脚本桥接 (bpy)',
    btnKobraSpecs: 'Kobra 规格参数',
    btnExport3MF: '导出 Anycubic .3MF',
    btnExporting3MF: '打包 3MF 中...',
    btnStlArchive: 'STL 分体归档 (.zip)',
    btnCreatorInfo: 'Made by Bolorentzon 2026',
    languageBtn: '语言',
    selectLanguage: '选择语言',
    validateScriptBtn: '验证并优化脚本',
    generatePromptBtn: '从 Blender 生成 Ollama 提示词',
    copiedPrompt: '提示词已复制并填入 Ollama 输入框！',

    // Creator Modal
    creatorTitle: 'ChromaForge 创作者与系统信息',
    creatorBadge: 'Made by Bolorentzon 2026',
    creatorDesc: '专业级 AI 辅助 3D 建模与多色切片系统，无缝连接 Blender、本地 Ollama AI 与 Anycubic Kobra 3 ACE Pro，支持高达 8 色多材质且冲刷废料最小化。',
    creatorSpecsTitle: '系统架构与技术兼容性',
    spec1: '针对 Anycubic Kobra 3 Combo (双 ACE Pro 串联达 8 色) 与 Kobra X 深度定制优化。',
    spec2: '本地 Ollama AI (llama3.2, deepseek-r1) 与 Google Gemini 云端计算双引擎。',
    spec3: 'Blender 3.6 – 4.3 双向 Python 桥接，具备自动次表面散射 (SSS) 与物理 PBR 材质。',
    spec4: '智能冲刷排废矩阵算法，提供实时色彩渗色模拟与填充冲刷优化。',
    creatorCopyright: '© 2026 Bolorentzon. 保留所有权利。基于现代化 WebGL 与人工智能驱动。',
    closeBtn: '关闭',

    // Prompt Bar
    promptPlaceholder: '输入提示词生成逼真 3D 模型 (例如: "逼真的岩石箭毒蛙", "带菌褶的森林蘑菇群", "螺旋尾变色龙")...',
    btnGenerate: '生成 3D 模型',
    btnGenerating: '正在生成...',
    btnOptimizePrompt: '优化提示词',
    btnOptimizing: '正在优化...',
    natureEngineActive: '自然生物 3D 引擎已就绪',
    quickPresets: '快捷预设:',
    inferenceEngine: 'AI 推理引擎',
    localOllama: '本地 Ollama',
    geminiCloud: 'Gemini 3.8 Flash',
    ollamaOffline: 'Ollama 离线',
    synthesizingMsg: '正在合成 3D 多材质几何体...',
    modelGeneratedSuccess: '3D 模型生成成功，已针对 Anycubic 验证！',

    // Viewport
    activeSlots: '个活跃通道',
    bleedSimulation: '渗色模拟',
    naturePbr: '自然 PBR',
    wasteBox: '废料包络',
    paintTool: '上色',
    wireframe: '线框',
    slicePlane: '切片剖面',
    resetCamera: '重置视角',
    naturePbrTitle: '真实生物级 PBR 渲染',
    naturePbrSubtitle: '微表面凹凸纹理、透明清漆与生物次表面散射',
    wasteEnvelope: '冲刷废料体积包络:',
    flushScaling: '冲刷倍率',
    paintActiveBanner: '点击 3D 零件即可使用当前通道上色: Slot',
    modelLabel: '当前模型:',
    partsLabel: '个组件',
    presetsLabel: '快速预设:',

    // Bleed simulation HUD
    bleedTitle: '冲刷过渡与混色渗漏模拟',
    bleedSubtitle: '模拟 Anycubic ACE Pro 喷嘴熔池在换料时的残余颜料渗色风险',
    btnAutoFixBleed: '一键自动解决渗色',
    simulatedPurgeRatio: '模拟冲刷系数:',
    underPurged: '(冲刷不足 / 渗色高危)',
    borderlineClean: '(临界纯净)',
    fullClean: '(完全纯净过渡)',
    noBleedDetected: '未检测到渗色风险。当前冲刷体积可确保色彩边界清晰。',
    neededExtra: '需额外冲刷',

    // Filament Manager
    filamentManagerTitle: 'Anycubic ACE Pro 耗材管理盒',
    filamentManagerSubtitle: '通过串联双 ACE Pro 管理多达 8 卷耗材，支持加热干燥与 RFID 自动识别',
    unit1Title: 'ACE Pro 1 号机 (通道 1-4)',
    unit2Title: 'ACE Pro 2 号机 (通道 5-8)',
    activeFilament: '当前画笔耗材:',
    tempNozzle: '喷嘴温度',
    tempBed: '热床温度',
    material: '材质类型',

    // Slicing Optimizer
    slicerTitle: 'Anycubic 多材质切片冲刷优化器',
    slicerSubtitle: '通过填充冲刷与自定义色彩转移矩阵大幅减少废料',
    totalPrintTime: '预计打印时间',
    totalPurgeWaste: '总冲刷废料',
    infillSavings: '填充冲刷节省',
    totalToolSwaps: '换刀次数',
    flushMatrixTitle: '色彩冲刷量矩阵 (每次换色 mm³)',
    flushMultiplier: '全局冲刷倍率',
    purgeIntoInfill: '废料冲刷到内部填充 (Infill)',
    purgeIntoSupport: '废料冲刷到支撑结构',
    wipeTowerConfig: '擦拭塔 / 冲刷塔设置',

    // Blender Bridge
    blenderTitle: 'Blender 桥接与 Anycubic 导出器',
    blenderSubtitle: '在网页与 Blender (bpy) 之间双向传输文本与几何数据，支持 3MF 与 STL 导出。',
    tabTextToBlender: '文本传输至 Blender',
    tabTextFromBlender: '从 Blender 同步文本',
    tabLiveBridge: '实时桥接 (端口 8008)',
    blenderStatus: 'Blender 状态:',
    connected: '已连接',
    notConnected: '未连接到端口 8008',
    btnRunInBlender: '在 Blender 中运行 (一键)',
    copyCode: '复制脚本',
    copied: '已复制！',
    downloadPy: '下载 .py',
    importFromBlender: '从 Blender 导入并同步:',
    parseAndSync: '解析并同步到 3D 视图',
  },
};

import { createContext, useContext, useState } from 'react';

interface LanguageContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'sv',
  setLang: () => {},
  t: TRANSLATIONS.sv,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('chromaforge_lang');
      if (saved && ['sv', 'en', 'de', 'fr', 'es', 'zh'].includes(saved)) {
        return saved as SupportedLanguage;
      }
    } catch (e) {
      // Ignore
    }
    return 'sv';
  });

  const setLang = (newLang: SupportedLanguage) => {
    setLangState(newLang);
    try {
      localStorage.setItem('chromaforge_lang', newLang);
    } catch (e) {
      // Ignore
    }
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.sv;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
