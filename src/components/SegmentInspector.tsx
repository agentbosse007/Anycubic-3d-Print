import React from 'react';
import type { FilamentChannel, MeshSegment, ModelDefinition } from '../types';
import { Layers, Box, Check, Palette, Sparkles } from 'lucide-react';

interface SegmentInspectorProps {
  model: ModelDefinition;
  filaments: FilamentChannel[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
  onAssignFilament: (segmentId: string, filamentId: number) => void;
  maxColors: number;
}

export const SegmentInspector: React.FC<SegmentInspectorProps> = ({
  model,
  filaments,
  selectedSegmentId,
  onSelectSegment,
  onAssignFilament,
  maxColors,
}) => {
  const activeFilaments = filaments.slice(0, maxColors);

  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            Model Assembly Components
          </h2>
          <span className="text-[11px] text-slate-400">
            {model.segments.length} multi-material parts · {model.dimensions.x}×{model.dimensions.y}×{model.dimensions.z}mm
          </span>
        </div>
      </div>

      {/* Segments List */}
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
        {model.segments.map(seg => {
          const isSelected = seg.id === selectedSegmentId;
          const currentFil = filaments.find(f => f.id === seg.filamentId) || filaments[0];

          return (
            <div
              key={seg.id}
              onClick={() => onSelectSegment(isSelected ? null : seg.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-sm"
                    style={{ backgroundColor: currentFil.color }}
                  />
                  <div className="truncate">
                    <span className="font-semibold text-white truncate block">{seg.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Type: {seg.geometryType} · Slot {seg.filamentId} ({currentFil.name})
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                  S{seg.filamentId}
                </span>
              </div>

              {/* Filament Reassignment Chips */}
              <div
                className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-0.5"
                onClick={e => e.stopPropagation()}
              >
                <span className="text-[10px] text-slate-500 shrink-0 font-medium">Assign Color:</span>
                {activeFilaments.map(fil => {
                  const isCurrent = fil.id === seg.filamentId;
                  return (
                    <button
                      key={fil.id}
                      onClick={() => onAssignFilament(seg.id, fil.id)}
                      className={`w-5 h-5 rounded-full border shrink-0 transition-transform flex items-center justify-center ${
                        isCurrent
                          ? 'border-white scale-110 shadow-sm'
                          : 'border-white/20 hover:scale-105 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: fil.color }}
                      title={`Assign Slot ${fil.id} (${fil.name})`}
                    >
                      {isCurrent && (
                        <Check
                          className={`w-3 h-3 ${
                            fil.color.toLowerCase() > '#888888' ? 'text-slate-900' : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slicing Tips from AI */}
      {model.slicingTips && model.slicingTips.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
            <Sparkles className="w-3 h-3" />
            <span>Multi-Material Optimization Tips</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
            {model.slicingTips.map((tip, idx) => (
              <li key={idx} className="leading-snug">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
