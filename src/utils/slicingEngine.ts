import type { FilamentChannel, MeshSegment, SlicingConfig, SlicingAnalysis, BleedRiskItem } from '../types';

/**
 * Computes luminance of a hex color (0 to 255)
 */
export function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  luminance: number;
}

const parsedColorCache = new Map<string, ParsedColor>();

export function parseHexColor(hex: string): ParsedColor {
  const key = hex.toLowerCase();
  const cached = parsedColorCache.get(key);
  if (cached) {
    return cached;
  }

  const cleanHex = key.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const parsed = { r, g, b, luminance };
  parsedColorCache.set(key, parsed);
  return parsed;
}

/**
 * Linearly interpolates two hex colors
 * ratio = 0.0 -> colorA, ratio = 1.0 -> colorB
 */
export function blendHexColors(colorA: string, colorB: string, ratio: number): string {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const cA = parseHexColor(colorA);
  const cB = parseHexColor(colorB);

  const r = Math.round(cA.r * (1 - clampedRatio) + cB.r * clampedRatio);
  const g = Math.round(cA.g * (1 - clampedRatio) + cB.g * clampedRatio);
  const b = Math.round(cA.b * (1 - clampedRatio) + cB.b * clampedRatio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Computes the recommended flush volume (mm³) from color A to color B.
 * Dark to light transitions require significantly more flushing to prevent bleed.
 */
export function calculateFlushVolume(
  fromColor: string,
  toColor: string,
  multiplier: number = 1.0
): number {
  if (fromColor.toLowerCase() === toColor.toLowerCase()) {
    return 0;
  }

  const lumFrom = parseHexColor(fromColor).luminance;
  const lumTo = parseHexColor(toColor).luminance;
  const lumDiff = (lumTo - lumFrom) / 255; // -1 to +1

  // Base flush volume in mm³
  let volume = 240;

  if (lumDiff > 0) {
    // Transitioning from darker to lighter: high contamination risk!
    volume = 240 + lumDiff * 220; // 240 to 460 mm³
  } else {
    // Transitioning from lighter to darker: easily covered
    volume = 240 + lumDiff * 110; // down to 130 mm³
  }

  return Math.round(volume * multiplier);
}

/**
 * Builds the full 8x8 flush matrix for all active filament slots
 */
export function buildFlushMatrix(
  filaments: FilamentChannel[],
  multiplier: number = 1.0
): number[][] {
  const matrix: number[][] = [];
  const activeFilaments = filaments.filter(f => f.slotActive !== false);

  for (let i = 0; i < activeFilaments.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < activeFilaments.length; j++) {
      if (i === j) {
        row.push(0);
      } else {
        const vol = calculateFlushVolume(
          activeFilaments[i].color,
          activeFilaments[j].color,
          multiplier * activeFilaments[j].purgeFactor
        );
        row.push(vol);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Estimates segment Z bounds in mm based on its geometry and transform
 */
function getSegmentZBounds(segment: MeshSegment): { minZ: number; maxZ: number } {
  const posZ = segment.transform.position[1]; // In 3D CAD/Three Y or Z, we assume pos[1] is elevation
  const scaleZ = segment.transform.scale[1] || 1;
  const height = (segment.parameters.height || segment.parameters.depth || 10) * scaleZ;
  return {
    minZ: Math.max(0, posZ - height / 2),
    maxZ: posZ + height / 2,
  };
}

/**
 * Precomputes segment bounds once to reduce repeated geometry recalculation.
 */
function buildSegmentBoundMap(segments: MeshSegment[]) {
  return segments.map(seg => ({
    segment: seg,
    bounds: getSegmentZBounds(seg),
  }));
}

/**
 * Analyzes the multi-material 3D model layer-by-layer and identifies bleed risks
 */
export function analyzeMultiMaterialSlicing(
  segments: MeshSegment[],
  filaments: FilamentChannel[],
  config: SlicingConfig
): SlicingAnalysis {
  if (segments.length === 0) {
    return {
      totalLayers: 0,
      totalHeightMm: 0,
      toolChangesCount: 0,
      purgeWasteVolumeMm3: 0,
      purgeWasteGrams: 0,
      modelFilamentGrams: 0,
      totalFilamentGrams: 0,
      infillSavingsGrams: 0,
      estimatedPrintMinutes: 0,
      estimatedPurgeMinutes: 0,
      toolChangeLayers: [],
      bleedRisks: [],
      hasCriticalBleed: false,
    };
  }

  const activeFilaments = filaments.filter(f => f.slotActive !== false);
  const boundsBySegment = buildSegmentBoundMap(segments);

  // Find total height
  let maxModelZ = 0;
  for (const entry of boundsBySegment) {
    if (entry.bounds.maxZ > maxModelZ) maxModelZ = entry.bounds.maxZ;
  }

  const layerHeight = Math.max(0.08, config.layerHeight || 0.2);
  const totalLayers = Math.max(1, Math.ceil(maxModelZ / layerHeight));
  const toolChangeLayers: { layer: number; heightMm: number; fromSlot: number; toSlot: number }[] = [];
  const bleedRisks: BleedRiskItem[] = [];

  let currentActiveFilament = segments[0]?.filamentId || 1;
  let totalPurgeMm3 = 0;
  let toolChangesCount = 0;

  // Build matrix once using active filaments only
  const flushMatrix = buildFlushMatrix(activeFilaments, config.flushingMultiplier);

  // Scan every layer
  for (let l = 0; l < totalLayers; l++) {
    const currentZ = l * layerHeight;
    // Find all segments present at this layer height
    const activeSegmentsAtLayer = boundsBySegment.filter(entry => {
      const { minZ, maxZ } = entry.bounds;
      return currentZ >= minZ && currentZ <= maxZ;
    });

    const activeFilamentIds = Array.from(new Set(activeSegmentsAtLayer.map(({ segment }) => segment.filamentId)));

    if (activeFilamentIds.length > 1) {
      // Multi-color layer: requires color switches on this layer
      for (const slotId of activeFilamentIds) {
        if (slotId !== currentActiveFilament) {
          const fromIdx = Math.max(0, Math.min(activeFilaments.length - 1, currentActiveFilament - 1));
          const toIdx = Math.max(0, Math.min(activeFilaments.length - 1, slotId - 1));
          const flush = flushMatrix[fromIdx]?.[toIdx] || 240;
          const fromFil = activeFilaments[fromIdx];
          const toFil = activeFilaments[toIdx];

          totalPurgeMm3 += flush;
          toolChangesCount++;
          toolChangeLayers.push({
            layer: l + 1,
            heightMm: parseFloat(currentZ.toFixed(2)),
            fromSlot: currentActiveFilament,
            toSlot: slotId,
          });

          // Evaluate color bleed risk
          if (fromFil && toFil) {
            const lumFrom = parseHexColor(fromFil.color).luminance;
            const lumTo = parseHexColor(toFil.color).luminance;
            const recommendedVol = calculateFlushVolume(fromFil.color, toFil.color, 1.15);

            // Dark to Light transition with insufficient flush
            if (lumTo > lumFrom + 35 && flush < recommendedVol) {
              const shortfall = recommendedVol - flush;
              const severity = shortfall > 80 ? 'critical' : 'moderate';
              const mixedColor = blendHexColors(fromFil.color, toFil.color, 0.4);

              bleedRisks.push({
                layer: l + 1,
                heightMm: parseFloat(currentZ.toFixed(2)),
                fromSlot: currentActiveFilament,
                toSlot: slotId,
                fromColor: fromFil.color,
                toColor: toFil.color,
                bleedSeverity: severity,
                bleedPercent: Math.min(100, Math.round((shortfall / recommendedVol) * 100)),
                mixedColorHex: mixedColor,
                currentFlushMm3: flush,
                recommendedFlushMm3: recommendedVol,
                description: `${fromFil.name} pigment will muddy ${toFil.name} (needs +${shortfall} mm³ purge)`,
              });
            }
          }

          currentActiveFilament = slotId;
        }
      }
    } else if (activeFilamentIds.length === 1 && activeFilamentIds[0] !== currentActiveFilament) {
      // Transition to next body layer
      const nextSlot = activeFilamentIds[0];
      const fromIdx = Math.max(0, Math.min(activeFilaments.length - 1, currentActiveFilament - 1));
      const toIdx = Math.max(0, Math.min(activeFilaments.length - 1, nextSlot - 1));
      const flush = flushMatrix[fromIdx]?.[toIdx] || 240;
      const fromFil = activeFilaments[fromIdx];
      const toFil = activeFilaments[toIdx];

      totalPurgeMm3 += flush;
      toolChangesCount++;
      toolChangeLayers.push({
        layer: l + 1,
        heightMm: parseFloat(currentZ.toFixed(2)),
        fromSlot: currentActiveFilament,
        toSlot: nextSlot,
      });

      if (fromFil && toFil) {
        const lumFrom = parseHexColor(fromFil.color).luminance;
        const lumTo = parseHexColor(toFil.color).luminance;
        const recommendedVol = calculateFlushVolume(fromFil.color, toFil.color, 1.15);

        if (lumTo > lumFrom + 35 && flush < recommendedVol) {
          const shortfall = recommendedVol - flush;
          const severity = shortfall > 80 ? 'critical' : 'moderate';
          const mixedColor = blendHexColors(fromFil.color, toFil.color, 0.4);

          bleedRisks.push({
            layer: l + 1,
            heightMm: parseFloat(currentZ.toFixed(2)),
            fromSlot: currentActiveFilament,
            toSlot: nextSlot,
            fromColor: fromFil.color,
            toColor: toFil.color,
            bleedSeverity: severity,
            bleedPercent: Math.min(100, Math.round((shortfall / recommendedVol) * 100)),
            mixedColorHex: mixedColor,
            currentFlushMm3: flush,
            recommendedFlushMm3: recommendedVol,
            description: `${fromFil.name} pigment will muddy ${toFil.name} (needs +${shortfall} mm³ purge)`,
          });
        }
      }

      currentActiveFilament = nextSlot;
    }
  }

  // Calculate waste reduction from Infill & Support flushing
  let infillSavingsFactor = 0;
  if (config.purgeIntoInfill) infillSavingsFactor += 0.38;
  if (config.purgeIntoSupport) infillSavingsFactor += 0.22;
  const effectivePurgeMm3 = totalPurgeMm3 * (1 - infillSavingsFactor);

  // Filament density: ~1.24 g/cm³ for PLA
  const plaDensity = 0.00124; // g/mm³
  const purgeWasteGrams = parseFloat((effectivePurgeMm3 * plaDensity).toFixed(1));
  const infillSavingsGrams = parseFloat(((totalPurgeMm3 - effectivePurgeMm3) * plaDensity).toFixed(1));

  // Rough model volume estimate
  let modelVolumeMm3 = 0;
  for (const s of segments) {
    const w = s.parameters.width || s.parameters.radius || 20;
    const h = s.parameters.height || 20;
    const d = s.parameters.depth || s.parameters.radius || 20;
    modelVolumeMm3 += w * h * d * 0.45; // partial infill density
  }
  const modelFilamentGrams = parseFloat((modelVolumeMm3 * (config.infillDensity / 100) * plaDensity + 12).toFixed(1));
  const totalFilamentGrams = parseFloat((modelFilamentGrams + purgeWasteGrams).toFixed(1));

  // Estimated tool change duration on Anycubic ACE Pro: ~38 seconds per change
  const secondsPerToolChange = 38;
  const estimatedPurgeMinutes = Math.round((toolChangesCount * secondsPerToolChange) / 60);

  const basePrintMinutes = Math.round((totalLayers * 0.6) + (modelFilamentGrams * 1.2));
  const estimatedPrintMinutes = basePrintMinutes + estimatedPurgeMinutes;

  return {
    totalLayers,
    totalHeightMm: parseFloat(maxModelZ.toFixed(1)),
    toolChangesCount,
    purgeWasteVolumeMm3: Math.round(effectivePurgeMm3),
    purgeWasteGrams,
    modelFilamentGrams,
    totalFilamentGrams,
    infillSavingsGrams,
    estimatedPrintMinutes,
    estimatedPurgeMinutes,
    toolChangeLayers,
    bleedRisks,
    hasCriticalBleed: bleedRisks.some(b => b.bleedSeverity === 'critical'),
  };
}

/**
 * Generates Anycubic ACE Pro optimized Tool Change G-code macro
 */
export function generateAnycubicToolChangeGCode(
  fromTool: number,
  toTool: number,
  purgeVolumeMm3: number
): string {
  const purgeFilamentLength = (purgeVolumeMm3 / (Math.PI * Math.pow(1.75 / 2, 2))).toFixed(1);

  return `; ============================================
; ANYCUBIC KOBRA 3 / ACE PRO TOOL CHANGE: T${fromTool - 1} -> T${toTool - 1}
; Optimized for 8-Color Daisy Chain & Anti-Blob Tip Shaping
; ============================================
M104 S[temperature_${toTool - 1}] ; Set target tool temp
G91 ; Relative positioning
G1 Z+0.6 F12000 ; Z-hop clearance
G90 ; Absolute positioning

; --- 1. Move to Anycubic Silicone Wiper & Cutter Dock ---
G1 X12 Y252 F18000 ; Rapid to Kobra 3 cutter lever
M400 ; Wait for moves to finish
G1 Y258 F4000 ; Engage mechanical cutter blade
G4 P150 ; Dwell 150ms for clean filament cut
G1 Y248 F8000 ; Release cutter

; --- 2. ACE Pro Buffer Retract ---
G91
G1 E-18 F3600 ; High-speed unload to heatbreak safe zone
G90
T${toTool - 1} ; Trigger ACE Pro Motor Feeder to active slot ${toTool}
M400

; --- 3. Purge Tower Flushing & Nozzle Clean ---
G1 X[wipe_tower_x] Y[wipe_tower_y] F18000 ; Move to wipe tower
M109 S[temperature_${toTool - 1}] ; Ensure extrusion temperature
G91
G1 E${purgeFilamentLength} F450 ; Purge transition filament (${purgeVolumeMm3} mm³)
G1 E-1.2 F3000 ; Wipe retraction
G90
; Nozzle wipe against silicone brush
G1 X24 Y250 F12000
G1 X38 Y250 F12000
G1 X24 Y250 F12000
; Resume print path
`;
}

