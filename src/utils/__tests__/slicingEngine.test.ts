import { describe, expect, it } from 'vitest';
import {
  analyzeMultiMaterialSlicing,
  blendHexColors,
  buildFlushMatrix,
  calculateFlushVolume,
  getLuminance,
  parseHexColor,
} from '../slicingEngine';
import type { FilamentChannel, MeshSegment, SlicingConfig } from '../../types';

const makeFilament = (overrides: Partial<FilamentChannel> = {}): FilamentChannel => ({
  id: 1,
  name: 'PLA',
  color: '#000000',
  material: 'PLA+',
  tempNozzle: 210,
  tempBed: 60,
  purgeFactor: 1,
  spoolGramsRemaining: 1000,
  slotActive: true,
  ...overrides,
});

const makeSegment = (overrides: Partial<MeshSegment> = {}): MeshSegment => ({
  id: 'segment-1',
  name: 'Segment 1',
  filamentId: 1,
  geometryType: 'box',
  transform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  parameters: {
    width: 10,
    height: 10,
    depth: 10,
  },
  ...overrides,
});

const baseConfig: SlicingConfig = {
  layerHeight: 0.2,
  infillDensity: 15,
  purgeIntoInfill: false,
  purgeIntoSupport: false,
  flushingMultiplier: 1,
  wipeTowerX: 0,
  wipeTowerY: 0,
  wipeTowerWidth: 0,
  wipeTowerEnabled: false,
};

describe('slicingEngine', () => {
  it('calculates luminance for black and white values', () => {
    expect(getLuminance('#000000')).toBe(0);
    expect(getLuminance('#ffffff')).toBe(255);
    expect(getLuminance('#808080')).toBeCloseTo(128.5, 0);
  });

  it('parses hex colors into RGB and luminance values', () => {
    expect(parseHexColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, luminance: 76.245 });
    expect(parseHexColor('#00ff00').g).toBe(255);
    expect(parseHexColor('#000000').luminance).toBe(0);
  });

  it('blends colors linearly between endpoints', () => {
    expect(blendHexColors('#000000', '#ffffff', 0)).toBe('#000000');
    expect(blendHexColors('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(blendHexColors('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('returns zero flush volume for the same color transition', () => {
    expect(calculateFlushVolume('#ff0000', '#ff0000')).toBe(0);
  });

  it('uses a larger purge for dark-to-light transitions', () => {
    const darkToLight = calculateFlushVolume('#000000', '#ffffff');
    const lightToDark = calculateFlushVolume('#ffffff', '#000000');

    expect(darkToLight).toBeGreaterThan(lightToDark);
    expect(darkToLight).toBeGreaterThan(240);
    expect(lightToDark).toBeGreaterThan(120);
  });

  it('buildFlushMatrix is square with zero diagonal values', () => {
    const filaments = [
      makeFilament({ id: 1, color: '#000000', name: 'Black' }),
      makeFilament({ id: 2, color: '#ffffff', name: 'White' }),
      makeFilament({ id: 3, color: '#ff0000', name: 'Red' }),
    ];

    const matrix = buildFlushMatrix(filaments, 1.1);

    expect(matrix).toHaveLength(3);
    expect(matrix[0]).toHaveLength(3);
    expect(matrix[0][0]).toBe(0);
    expect(matrix[1][1]).toBe(0);
    expect(matrix[2][2]).toBe(0);
    expect(matrix[0][1]).toBeGreaterThan(0);
  });

  it('buildFlushMatrix respects purgeFactor and multiplier adjustments', () => {
    const filaments = [
      makeFilament({ id: 1, color: '#000000', purgeFactor: 1.2 }),
      makeFilament({ id: 2, color: '#ffffff', purgeFactor: 0.8 }),
    ];

    const matrix = buildFlushMatrix(filaments, 1.5);

    expect(matrix[0][1]).toBeGreaterThan(0);
    expect(matrix[1][0]).toBeGreaterThan(0);
    expect(matrix[0][1]).not.toBe(matrix[1][0]);
  });

  it('returns a zeroed analysis for empty segments', () => {
    const result = analyzeMultiMaterialSlicing([], [makeFilament()], baseConfig);

    expect(result).toMatchObject({
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
      bleedRisks: [],
      hasCriticalBleed: false,
    });
  });

  it('tracks a single-filament model without tool changes', () => {
    const segments = [makeSegment({ id: 'a', filamentId: 1, transform: { ...makeSegment().transform, position: [0, 5, 0] } })];
    const filaments = [makeFilament({ id: 1, color: '#00ff00', name: 'Green' })];

    const result = analyzeMultiMaterialSlicing(segments, filaments, baseConfig);

    expect(result.toolChangesCount).toBe(0);
    expect(result.toolChangeLayers).toHaveLength(0);
    expect(result.bleedRisks).toHaveLength(0);
    expect(result.totalLayers).toBeGreaterThan(0);
  });

  it('detects a filament switch and counts a tool change', () => {
    const black = makeFilament({ id: 1, color: '#000000', name: 'Black' });
    const white = makeFilament({ id: 2, color: '#ffffff', name: 'White' });

    const segments = [
      makeSegment({ id: 'low', filamentId: 1, transform: { ...makeSegment().transform, position: [0, 5, 0] } }),
      makeSegment({ id: 'high', filamentId: 2, transform: { ...makeSegment().transform, position: [0, 30, 0] } }),
    ];

    const result = analyzeMultiMaterialSlicing(segments, [black, white], baseConfig);

    expect(result.toolChangesCount).toBeGreaterThan(0);
    expect(result.toolChangeLayers.length).toBeGreaterThan(0);
    expect(result.toolChangeLayers[0]).toMatchObject({ fromSlot: 1, toSlot: 2 });
  });

  it('records a bleed risk for dark-to-light transitions with insufficient flush', () => {
    const black = makeFilament({ id: 1, color: '#000000', name: 'Black' });
    const white = makeFilament({ id: 2, color: '#ffffff', name: 'White' });

    const segments = [
      makeSegment({ id: 'low', filamentId: 1, transform: { ...makeSegment().transform, position: [0, 5, 0] } }),
      makeSegment({ id: 'high', filamentId: 2, transform: { ...makeSegment().transform, position: [0, 30, 0] } }),
    ];

    const result = analyzeMultiMaterialSlicing(segments, [black, white], {
      ...baseConfig,
      flushingMultiplier: 0.1,
    });

    expect(result.bleedRisks.some(r => r.bleedSeverity === 'critical' || r.bleedSeverity === 'moderate')).toBe(true);
    expect(result.hasCriticalBleed || result.bleedRisks.length > 0).toBe(true);
  });

  it('keeps purge waste values positive but finite for normal transitions', () => {
    const black = makeFilament({ id: 1, color: '#000000', name: 'Black' });
    const red = makeFilament({ id: 2, color: '#ff0000', name: 'Red' });

    const segments = [
      makeSegment({ id: 'low', filamentId: 1, transform: { ...makeSegment().transform, position: [0, 5, 0] } }),
      makeSegment({ id: 'high', filamentId: 2, transform: { ...makeSegment().transform, position: [0, 25, 0] } }),
    ];

    const result = analyzeMultiMaterialSlicing(segments, [black, red], baseConfig);

    expect(result.purgeWasteVolumeMm3).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.purgeWasteGrams)).toBe(true);
    expect(Number.isFinite(result.modelFilamentGrams)).toBe(true);
    expect(Number.isFinite(result.totalFilamentGrams)).toBe(true);
  });

  it('uses the layer height to compute a sensible total layer count', () => {
    const segments = [
      makeSegment({ id: 's1', transform: { ...makeSegment().transform, position: [0, 12, 0] } }),
      makeSegment({ id: 's2', transform: { ...makeSegment().transform, position: [0, 22, 0] } }),
    ];

    const result = analyzeMultiMaterialSlicing(segments, [makeFilament({ id: 1, color: '#00ff00' })], baseConfig);

    expect(result.totalLayers).toBeGreaterThanOrEqual(60);
    expect(result.totalLayers).toBeLessThanOrEqual(200);
  });

  it('supports multiple material changes without crashing', () => {
    const filaments = [
      makeFilament({ id: 1, color: '#000000', name: 'Black' }),
      makeFilament({ id: 2, color: '#ff0000', name: 'Red' }),
      makeFilament({ id: 3, color: '#00ff00', name: 'Green' }),
    ];

    const segments = [
      makeSegment({ id: 'a', filamentId: 1, transform: { ...makeSegment().transform, position: [0, 4, 0] } }),
      makeSegment({ id: 'b', filamentId: 2, transform: { ...makeSegment().transform, position: [0, 12, 0] } }),
      makeSegment({ id: 'c', filamentId: 3, transform: { ...makeSegment().transform, position: [0, 22, 0] } }),
    ];

    const result = analyzeMultiMaterialSlicing(segments, filaments, baseConfig);

    expect(result.toolChangesCount).toBeGreaterThan(1);
    expect(result.estimatedPrintMinutes).toBeGreaterThan(0);
  });

  it('allows purgeIntoInfill and purgeIntoSupport to lower waste values', () => {
    const black = makeFilament({ id: 1, color: '#000000', name: 'Black' });
    const white = makeFilament({ id: 2, color: '#ffffff', name: 'White' });

    const segments = [
      makeSegment({ id: 'low', filamentId: 1, transform: { ...makeSegment().transform, position: [0, 5, 0] } }),
      makeSegment({ id: 'high', filamentId: 2, transform: { ...makeSegment().transform, position: [0, 30, 0] } }),
    ];

    const normal = analyzeMultiMaterialSlicing(segments, [black, white], baseConfig);
    const savingsEnabled = analyzeMultiMaterialSlicing(segments, [black, white], {
      ...baseConfig,
      purgeIntoInfill: true,
      purgeIntoSupport: true,
    });

    expect(savingsEnabled.purgeWasteVolumeMm3).toBeLessThanOrEqual(normal.purgeWasteVolumeMm3);
    expect(savingsEnabled.infillSavingsGrams).toBeGreaterThanOrEqual(0);
  });

  it('returns stable numeric outputs for model and total filament estimates', () => {
    const segments = [
      makeSegment({ id: 'a', filamentId: 1, transform: { ...makeSegment().transform, position: [0, 6, 0] } }),
      makeSegment({ id: 'b', filamentId: 2, transform: { ...makeSegment().transform, position: [0, 18, 0] } }),
    ];

    const result = analyzeMultiMaterialSlicing(segments, [makeFilament({ id: 1, color: '#888888' }), makeFilament({ id: 2, color: '#444444' })], baseConfig);

    expect(typeof result.modelFilamentGrams).toBe('number');
    expect(typeof result.totalFilamentGrams).toBe('number');
    expect(result.totalFilamentGrams).toBeGreaterThan(result.modelFilamentGrams);
  });
});
