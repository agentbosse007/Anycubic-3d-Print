import React, { useState } from 'react';
import type { FilamentChannel, SlicingAnalysis, SlicingConfig } from '../types';
import { buildFlushMatrix } from '../utils/slicingEngine';
import { Sliders, CheckSquare, Square, Zap, Info, Clock, Trash2, ArrowRightLeft, Layers, ShieldAlert, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';

interface SlicingOptimizerPanelProps {
  analysis: SlicingAnalysis;
  filaments: FilamentChannel[];
  config: SlicingConfig;
  onChangeConfig: (newConfig: SlicingConfig) => void;
  maxColors: number;
}

export const SlicingOptimizerPanel: React.FC<SlicingOptimizerPanelProps> = ({
  analysis,
  filaments,
  config,
  onChangeConfig,
  maxColors,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'layers' | 'bleed'>('overview');
  const activeFilaments = filaments.slice(0, maxColors);
  const matrix = buildFlushMatrix(activeFilaments, config.flushingMultiplier);

  const handleAutoFixBleed = () => {
    onChangeConfig({
      ...config,
      flushingMultiplier: Math.max(1.25, Number((config.flushingMultiplier + 0.2).toFixed(2))),
    });
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            Anycubic Multi-Material Slicing Optimizer
          </h2>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Calibrated for Anycubic Kobra 3 ACE Pro tool changing and minimal purge waste.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeTab === 'overview' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Optimization
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeTab === 'matrix' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flush Matrix
          </button>
          <button
            onClick={() => setActiveTab('bleed')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'bleed'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : analysis.bleedRisks.length > 0
                ? 'text-amber-400 hover:text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Bleed Risks</span>
            {analysis.bleedRisks.length > 0 && (
              <span className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold ${
                activeTab === 'bleed' ? 'bg-slate-900 text-amber-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {analysis.bleedRisks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              activeTab === 'layers' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Swaps ({analysis.toolChangesCount})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & CONTROLS */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Total Print Time</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {Math.floor(analysis.estimatedPrintMinutes / 60)}h {analysis.estimatedPrintMinutes % 60}m
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                includes ~{analysis.estimatedPurgeMinutes}m tool changes
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Tool Changes</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-cyan-400 font-mono tabular-nums">
                  {analysis.toolChangesCount}
                </span>
                <span className="text-xs text-slate-400">swaps</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                across {analysis.totalLayers} layers ({analysis.totalHeightMm}mm)
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Purge Waste Weight</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                  {analysis.purgeWasteGrams}g
                </span>
                <span className="text-[11px] text-slate-400">({analysis.purgeWasteVolumeMm3} mm³)</span>
              </div>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                -{analysis.infillSavingsGrams}g saved via infill
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Model Net Weight</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {analysis.modelFilamentGrams}g
                </span>
                <span className="text-xs text-slate-500">net</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Total: {analysis.totalFilamentGrams}g spool pull
              </span>
            </div>
          </div>

          {/* Color Bleed Warning Banner if Risks exist */}
          {analysis.bleedRisks.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                    <span>Color Bleeding Contamination Detected</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                      {analysis.bleedRisks.length} transition{analysis.bleedRisks.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Darker filaments transition to lighter ones without sufficient flush volume. Residue will bleed muddy hues into the initial perimeters.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('bleed')}
                  className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-[11px] transition-colors whitespace-nowrap cursor-pointer"
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={handleAutoFixBleed}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  <span>Auto-Fix Purge (+20%)</span>
                </button>
              </div>
            </div>
          )}

          {/* Waste Reduction Toggles */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Waste Reduction Mechanisms</span>
              <span className="text-[11px] text-cyan-400 font-mono">Anycubic Slicer Next Compatible</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Purge into Infill */}
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, purgeIntoInfill: !config.purgeIntoInfill })}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  config.purgeIntoInfill
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="mt-0.5">
                  {config.purgeIntoInfill ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-xs text-white">Purge into Infill</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Injects transition colors into internal sparse infill patterns (Gyroid/Grid). Saves ~38% purge waste.
                  </div>
                </div>
              </button>

              {/* Purge into Support */}
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, purgeIntoSupport: !config.purgeIntoSupport })}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  config.purgeIntoSupport
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="mt-0.5">
                  {config.purgeIntoSupport ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-xs text-white">Purge into Support</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Flushes color changes into support towers/trees prior to entering the wipe tower. Saves ~22% purge waste.
                  </div>
                </div>
              </button>
            </div>

            {/* Global Flushing Multiplier Slider */}
            <div className="mt-1 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Flushing Volume Multiplier</span>
                <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                  {config.flushingMultiplier.toFixed(2)}x
                  {config.flushingMultiplier < 1.0 && ' (Aggressive Savings)'}
                  {config.flushingMultiplier === 1.0 && ' (Standard Safety)'}
                  {config.flushingMultiplier > 1.0 && ' (Ultra Clean)'}
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.05"
                value={config.flushingMultiplier}
                onChange={e => onChangeConfig({ ...config, flushingMultiplier: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.60x (Minimal waste)</span>
                <span>1.00x (Recommended)</span>
                <span>1.40x (Zero bleed)</span>
              </div>
            </div>
          </div>

          {/* Purge Tower / Wipe Tower Bed Parameters */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Wipe Tower Bed Allocation</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                <input
                  type="checkbox"
                  checked={config.wipeTowerEnabled}
                  onChange={e => onChangeConfig({ ...config, wipeTowerEnabled: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                />
                <span>Enable Wipe Tower</span>
              </label>
            </div>

            {config.wipeTowerEnabled && (
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div>
                  <label className="text-slate-400 block mb-1">Position X (mm)</label>
                  <input
                    type="number"
                    value={config.wipeTowerX}
                    onChange={e => onChangeConfig({ ...config, wipeTowerX: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Position Y (mm)</label>
                  <input
                    type="number"
                    value={config.wipeTowerY}
                    onChange={e => onChangeConfig({ ...config, wipeTowerY: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tower Width (mm)</label>
                  <input
                    type="number"
                    value={config.wipeTowerWidth}
                    onChange={e => onChangeConfig({ ...config, wipeTowerWidth: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FLUSH MATRIX */}
      {activeTab === 'matrix' && (
        <div className="flex flex-col gap-3">
          <p className="text-slate-400 text-xs">
            Dynamic transition matrix in mm³. Values indicate filament purged when swapping from Row (From) to Column (To). Dark to light transitions require higher purge volumes.
          </p>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 p-2">
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr>
                  <th className="p-2 text-left text-slate-500 font-normal">From \ To</th>
                  {activeFilaments.map(f => (
                    <th key={f.id} className="p-1.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: f.color }} />
                        <span className="text-[10px] text-slate-400">S{f.id}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, rIdx) => {
                  const fromFil = activeFilaments[rIdx];
                  return (
                    <tr key={rIdx} className="border-t border-slate-900">
                      <td className="p-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: fromFil.color }} />
                          <span className="text-slate-300 font-sans text-xs">Slot {fromFil.id}</span>
                        </div>
                      </td>
                      {row.map((val, cIdx) => {
                        const isSelf = rIdx === cIdx;
                        const isHighWaste = val > 320;

                        return (
                          <td
                            key={cIdx}
                            className={`p-1.5 text-center tabular-nums ${
                              isSelf
                                ? 'text-slate-700 bg-slate-900/30'
                                : isHighWaste
                                ? 'text-amber-400 font-bold bg-amber-950/20'
                                : 'text-slate-300'
                            }`}
                          >
                            {isSelf ? '—' : `${val}`}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LAYER TOOL SWAPS */}
      {activeTab === 'layers' && (
        <div className="flex flex-col gap-3">
          <p className="text-slate-400 text-xs">
            Chronological sequence of Anycubic ACE Pro tool changes calculated per layer.
          </p>

          <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-900">
            {analysis.toolChangeLayers.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                Single material layer configuration (0 tool changes required).
              </div>
            ) : (
              analysis.toolChangeLayers.map((tc, idx) => {
                const fromFil = filaments.find(f => f.id === tc.fromSlot);
                const toFil = filaments.find(f => f.id === tc.toSlot);

                return (
                  <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-semibold tabular-nums text-xs">
                        Layer {tc.layer}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-slate-400 text-[11px] tabular-nums">
                        Z = {tc.heightMm}mm
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fromFil?.color || '#fff' }} />
                        <span className="text-[11px] text-slate-300">Slot {tc.fromSlot}</span>
                      </div>

                      <ArrowRightLeft className="w-3 h-3 text-slate-500" />

                      <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toFil?.color || '#fff' }} />
                        <span className="text-[11px] text-cyan-300 font-semibold">Slot {tc.toSlot}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COLOR BLEEDING & PURGE CONTAMINATION */}
      {activeTab === 'bleed' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs">
              Color bleeding simulation analyzes optical contrast between swapping filaments. Insufficient flushing leaves residual melt inside the hotend that stains consecutive layers.
            </p>

            {analysis.bleedRisks.length > 0 && (
              <button
                type="button"
                onClick={handleAutoFixBleed}
                className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded transition-colors whitespace-nowrap shadow-sm shrink-0 cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>Auto-Fix All Bleed</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {analysis.bleedRisks.length === 0 ? (
              <div className="p-6 text-center border border-slate-800 rounded-xl bg-slate-950/60 flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <span className="font-semibold text-white text-xs">Zero Color Bleeding Risks</span>
                <p className="text-slate-400 text-[11px] max-w-sm">
                  All active tool changes meet or exceed the recommended purging thresholds for their respective pigment contrasts.
                </p>
              </div>
            ) : (
              analysis.bleedRisks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                    risk.bleedSeverity === 'critical'
                      ? 'bg-amber-950/30 border-amber-500/50'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        risk.bleedSeverity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
                      }`} />
                      <span className="font-bold text-white text-xs">
                        Layer {risk.layer} (Z = {risk.heightMm}mm)
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 rounded ${
                        risk.bleedSeverity === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {risk.bleedSeverity} risk ({risk.bleedPercent}% contamination)
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-amber-300">
                      Flush: {risk.currentFlushMm3} / {risk.recommendedFlushMm3} mm³
                    </span>
                  </div>

                  {/* Visual Color Gradient Swatch */}
                  <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: risk.fromColor }} />
                      <span className="text-slate-400 font-mono text-[10px]">Slot {risk.fromSlot}</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                      <div
                        className="h-3 rounded-full border border-white/10 w-full"
                        style={{
                          background: `linear-gradient(to right, ${risk.fromColor} 0%, ${risk.mixedColorHex} 50%, ${risk.toColor} 100%)`
                        }}
                        title="Simulated Purge Gradient Blend"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Preceding</span>
                        <span className="text-amber-400">Contaminated Zone</span>
                        <span>Target Pure</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: risk.toColor }} />
                      <span className="text-slate-400 font-mono text-[10px]">Slot {risk.toSlot}</span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {risk.description}. Increase flushing multiplier or enable "Purge into Infill" to mask residual darkness inside inner gyroid tracks.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
