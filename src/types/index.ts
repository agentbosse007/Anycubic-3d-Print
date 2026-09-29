export interface FilamentChannel {
  id: number; // 1 to 8
  name: string;
  color: string; // hex #RRGGBB
  material: 'High-Speed PLA' | 'PLA+' | 'PETG' | 'TPU (95A)' | 'ABS' | 'PVA Soluble';
  tempNozzle: number;
  tempBed: number;
  purgeFactor: number;
  spoolGramsRemaining: number;
  slotActive: boolean;
  rfidTag?: string;
}

export interface PrinterProfile {
  id: 'kobra3' | 'kobra_x';
  name: string;
  tagline: string;
  bedX: number;
  bedY: number;
  bedZ: number;
  maxColors: number;
  aceProUnits: 1 | 2; // 1 = 4 colors, 2 = 8 colors (daisy-chained)
  maxSpeed: number; // mm/s
  maxAcceleration: number; // mm/s²
  nozzleDiameter: number;
  wipeTower: {
    x: number;
    y: number;
    width: number;
    minVolume: number;
    enabled: boolean;
  };
}

export interface MeshSegment {
  id: string;
  name: string;
  filamentId: number; // 1 to 8
  geometryType:
    | 'box'
    | 'cylinder'
    | 'sphere'
    | 'torus'
    | 'cone'
    | 'ring'
    | 'prism'
    | 'organic_mesh'
    | 'lathe'
    | 'extrude_spline'
    | 'parametric_surface'
    | 'voronoi_organic';
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  parameters: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    radiusTop?: number;
    radiusBottom?: number;
    tube?: number;
    radialSegments?: number;
    // Organic & Lifelike Nature parameters
    organicType?:
      | 'frog_body'
      | 'frog_limb'
      | 'butterfly_wing'
      | 'butterfly_body'
      | 'nautilus_shell'
      | 'feather_plumage'
      | 'petal'
      | 'rock_pedestal'
      | 'organic_eye'
      | 'branch_bark'
      | 'leaf_vein'
      | 'smooth_anatomy'
      | 'fossil_spiral'
      | 'custom_spline'
      | 'chameleon_tail'
      | 'mushroom_cap'
      | 'mushroom_stem'
      | 'succulent_rosette'
      | 'crystal_cluster'
      | 'beetle_elytra'
      | 'coral_branch'
      | 'pinecone_scale'
      | 'tree_trunk_bark'
      | 'tortoise_shell';
    curvature?: number;
    noiseAmplitude?: number;
    subdivisions?: number;
    taper?: number;
    points?: [number, number][];
    finish?:
      | 'organic_skin'
      | 'matte_feather'
      | 'glossy_chitin'
      | 'mineral_stone'
      | 'botanical_petal'
      | 'fleshy_succulent'
      | 'crystalline_quartz'
      | 'translucent_resin';
  };
}

export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  prompt: string;
  dimensions: { x: number; y: number; z: number };
  segments: MeshSegment[];
  blenderPythonScript: string;
  slicingTips?: string[];
  generatedBy: 'ollama' | 'gemini' | 'preset';
  createdAt: string;
}

export interface SlicingConfig {
  layerHeight: number; // mm (e.g. 0.20)
  infillDensity: number; // % (e.g. 15)
  purgeIntoInfill: boolean;
  purgeIntoSupport: boolean;
  flushingMultiplier: number; // 0.6x to 1.5x
  wipeTowerX: number;
  wipeTowerY: number;
  wipeTowerWidth: number;
  wipeTowerEnabled: boolean;
}

export interface BleedRiskItem {
  layer: number;
  heightMm: number;
  fromSlot: number;
  toSlot: number;
  fromColor: string;
  toColor: string;
  bleedSeverity: 'low' | 'moderate' | 'critical';
  bleedPercent: number; // 0 to 100% contamination risk
  mixedColorHex: string;
  currentFlushMm3: number;
  recommendedFlushMm3: number;
  description: string;
}

export interface SlicingAnalysis {
  totalLayers: number;
  totalHeightMm: number;
  toolChangesCount: number;
  purgeWasteVolumeMm3: number;
  purgeWasteGrams: number;
  modelFilamentGrams: number;
  totalFilamentGrams: number;
  infillSavingsGrams: number;
  estimatedPrintMinutes: number;
  estimatedPurgeMinutes: number;
  toolChangeLayers: { layer: number; heightMm: number; fromSlot: number; toSlot: number }[];
  bleedRisks: BleedRiskItem[];
  hasCriticalBleed: boolean;
}

export interface OllamaState {
  endpoint: string;
  model: string;
  isConnected: boolean;
  isLoading: boolean;
  availableModels: string[];
  lastError?: string;
}
