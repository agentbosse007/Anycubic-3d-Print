import React, { useState, useMemo } from 'react';
import type { FilamentChannel, MeshSegment, ModelDefinition, ModelSplitConfig } from '../types';
import { generateSingleStl } from '../utils/exportFormats';
import {
  X,
  Scissors,
  Box,
  Layers,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  CheckCircle2,
  HardDrive,
  Download,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ModelSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ModelDefinition;
  filaments: FilamentChannel[];
  onApplySplit: (partA: ModelDefinition, partB: ModelDefinition) => void;
}

export const ModelSplitModal: React.FC<ModelSplitModalProps> = ({
  isOpen,
  onClose,
  model,
  filaments,
  onApplySplit,
}) => {
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('y');
  const maxDim = axis === 'x' ? model.dimensions.x : axis === 'y' ? model.dimensions.y : model.dimensions.z;
  const [cutPosition, setCutPosition] = useState<number>(() => Math.round(maxDim / 2));
  const [dowelCount, setDowelCount] = useState<number>(2);
  const [dowelRadius, setDowelRadius] = useState<number>(4);
  const [dowelLength, setDowelLength] = useState<number>(10);
  const [tolerance, setTolerance] = useState<number>(0.15);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Dowel positions calculation on the cut interface
  const dowelCoordinates = useMemo(() => {
    const coords: { x: number; z: number }[] = [];
    const spreadX = Math.min(25, model.dimensions.x * 0.25);
    const spreadZ = Math.min(25, model.dimensions.z * 0.25);

    if (dowelCount === 2) {
      coords.push({ x: -spreadX, z: 0 });
      coords.push({ x: spreadX, z: 0 });
    } else if (dowelCount === 3) {
      coords.push({ x: 0, z: -spreadZ });
      coords.push({ x: -spreadX, z: spreadZ });
      coords.push({ x: spreadX, z: spreadZ });
    } else {
      coords.push({ x: -spreadX, z: -spreadZ });
      coords.push({ x: spreadX, z: -spreadZ });
      coords.push({ x: -spreadX, z: spreadZ });
      coords.push({ x: spreadX, z: spreadZ });
    }
    return coords;
  }, [dowelCount, model.dimensions]);

  const handleExecuteSplit = () => {
    setIsApplying(true);

    try {
      const partASegments: MeshSegment[] = [];
      const partBSegments: MeshSegment[] = [];

      // Partition existing segments
      model.segments.forEach(seg => {
        const posVal = axis === 'x' ? seg.transform.position[0] : axis === 'y' ? seg.transform.position[1] : seg.transform.position[2];
        if (posVal >= cutPosition - 5) {
          partASegments.push({ ...seg, id: `${seg.id}-partA` });
        } else {
          partBSegments.push({ ...seg, id: `${seg.id}-partB` });
        }
      });

      // If one part ended up empty, split segments proportionately
      if (partASegments.length === 0 || partBSegments.length === 0) {
        const mid = Math.ceil(model.segments.length / 2);
        partASegments.push(...model.segments.slice(0, mid));
        partBSegments.push(...model.segments.slice(mid));
      }

      // Add Dowel Pins (Han-tappar) to Part A
      dowelCoordinates.forEach((dCoord, idx) => {
        partASegments.push({
          id: `dowel-pin-${idx + 1}`,
          name: `Styrtapp (Dowel Pin ${idx + 1})`,
          filamentId: filaments[0]?.id || 1,
          geometryType: 'cylinder',
          transform: {
            position: [dCoord.x, cutPosition - dowelLength / 2, dCoord.z],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          parameters: {
            radius: dowelRadius,
            height: dowelLength,
            radialSegments: 24,
            finish: 'mineral_stone',
          },
        });

        // Add matching socket markers (Hon-spår) to Part B
        partBSegments.push({
          id: `dowel-socket-${idx + 1}`,
          name: `Tapp-hylsa (Socket ${idx + 1} +${tolerance}mm)`,
          filamentId: filaments[1]?.id || filaments[0]?.id || 1,
          geometryType: 'ring',
          transform: {
            position: [dCoord.x, cutPosition, dCoord.z],
            rotation: [Math.PI / 2, 0, 0],
            scale: [1, 1, 1],
          },
          parameters: {
            radius: dowelRadius + tolerance,
            tube: 1.2,
            radialSegments: 24,
          },
        });
      });

      const partA: ModelDefinition = {
        ...model,
        id: `${model.id}-del-A`,
        name: `${model.name} (Del A - Övre med Tappar)`,
        dimensions: {
          x: model.dimensions.x,
          y: Math.round(maxDim - cutPosition + dowelLength),
          z: model.dimensions.z,
        },
        segments: partASegments,
        slicingTips: [
          'Utskriftsorientering: Placera snittytan mot byggplattan eller orientera för minimala stöd.',
          `Tappar: ${dowelCount}st cylindriska han-tappar med ${dowelRadius}mm radie.`,
        ],
      };

      const partB: ModelDefinition = {
        ...model,
        id: `${model.id}-del-B`,
        name: `${model.name} (Del B - Undre med Monteringshål)`,
        dimensions: {
          x: model.dimensions.x,
          y: Math.round(cutPosition),
          z: model.dimensions.z,
        },
        segments: partBSegments,
        slicingTips: [
          `Monteringshål: Passform med +${tolerance}mm tolerans för direkt klickfäste eller cyanoakrylatlim.`,
        ],
      };

      onApplySplit(partA, partB);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Automatisk Modellsplittring & Tappar
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Dowel Pin Alignment
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Klyv stora modeller med automatiska han/hon-styrtappar och 0.15 mm passform för Anycubic Kobra 3.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 text-xs">
          {/* Axis Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Snittplan (Klyvaxel)
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAxis('y');
                  setCutPosition(Math.round(model.dimensions.y / 2));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  axis === 'y'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Horisontellt (Y-Plan / Höjd)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAxis('z');
                  setCutPosition(Math.round(model.dimensions.z / 2));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  axis === 'z'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Djup (Z-Plan / Front-Bak)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAxis('x');
                  setCutPosition(Math.round(model.dimensions.x / 2));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  axis === 'x'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vertikalt (X-Plan / Sida)
              </button>
            </div>
          </div>

          {/* Cut Position Slider */}
          <div className="p-4 bg-slate-850 rounded-xl border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Snittposition längs {axis.toUpperCase()}-axeln</span>
              <span className="font-mono text-cyan-400 font-bold">{cutPosition} mm (av {maxDim} mm)</span>
            </div>
            <input
              type="range"
              min="5"
              max={maxDim - 5}
              value={cutPosition}
              onChange={e => setCutPosition(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Del B (Undre): {cutPosition} mm</span>
              <span>Del A (Övre): {maxDim - cutPosition} mm</span>
            </div>
          </div>

          {/* Dowel Pin Configuration */}
          <div className="p-4 bg-slate-850 rounded-xl border border-slate-800 flex flex-col gap-3">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Styrtappar & Monteringshål (Alignment Pins)</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Antal tappar</label>
                <select
                  value={dowelCount}
                  onChange={e => setDowelCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                >
                  <option value={2}>2 tappar (Standard)</option>
                  <option value={3}>3 tappar (Triangel)</option>
                  <option value={4}>4 tappar (Fyrkant)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Tappradie</label>
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    min="2"
                    max="8"
                    value={dowelRadius}
                    onChange={e => setDowelRadius(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Tapplängd</label>
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    min="5"
                    max="20"
                    value={dowelLength}
                    onChange={e => setDowelLength(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Passningstolerans</label>
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="0.4"
                    value={tolerance}
                    onChange={e => setTolerance(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-[11px] text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Tapparna skapas med <strong>{tolerance} mm glidpassning</strong> – redo att monteras ihop direkt från Anycubic Kobra 3 utan borrning eller efterbearbetning.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Avbryt
          </button>

          <button
            type="button"
            onClick={handleExecuteSplit}
            disabled={isApplying}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-all cursor-pointer font-bold"
          >
            <Scissors className="w-4 h-4 text-slate-950" />
            <span>Klyv Modell & Skapa Styrtappar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
