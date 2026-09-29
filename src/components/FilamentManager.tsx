import React from 'react';
import type { FilamentChannel } from '../types';
import { Palette, Check, SlidersHorizontal, Flame, Thermometer } from 'lucide-react';

interface FilamentManagerProps {
  filaments: FilamentChannel[];
  onUpdateFilament: (updated: FilamentChannel) => void;
  activeSlot: number;
  onSetActiveSlot: (slotId: number) => void;
  maxColors: number; // 4 or 8
  onChangeMaxColors: (num: 4 | 8) => void;
}

export const FilamentManager: React.FC<FilamentManagerProps> = ({
  filaments,
  onUpdateFilament,
  activeSlot,
  onSetActiveSlot,
  maxColors,
  onChangeMaxColors,
}) => {
  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* ACE Pro Header & Multi-Unit Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            Anycubic Color Engine Pro (ACE Pro)
          </h2>
          <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
            <span>Active Slots: {filaments.filter(f => f.id <= maxColors && f.slotActive).length} / {maxColors}</span>
            <span aria-hidden="true">·</span>
            <span>RFID Auto-Sync Ready</span>
          </div>
        </div>

        {/* ACE Pro Mode Toggle (4-Color 1x ACE Pro vs 8-Color 2x ACE Pro Chained) */}
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700/60">
          <button
            onClick={() => onChangeMaxColors(4)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              maxColors === 4
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            4-Color (1x ACE)
          </button>
          <button
            onClick={() => onChangeMaxColors(8)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              maxColors === 8
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            8-Color (2x ACE Daisy-Chain)
          </button>
        </div>
      </div>

      {/* Grid of Filament Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filaments.slice(0, maxColors).map(slot => {
          const isActive = slot.id === activeSlot;

          return (
            <div
              key={slot.id}
              onClick={() => onSetActiveSlot(slot.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {/* Color Swatch & Native Color Picker */}
                  <div className="relative group shrink-0">
                    <div
                      className="w-7 h-7 rounded-lg border border-white/20 shadow-inner flex items-center justify-center transition-transform group-hover:scale-105"
                      style={{ backgroundColor: slot.color }}
                    >
                      {isActive && (
                        <Check
                          className={`w-4 h-4 ${
                            slot.color.toLowerCase() > '#888888' ? 'text-slate-900' : 'text-white'
                          }`}
                        />
                      )}
                    </div>
                    <input
                      type="color"
                      value={slot.color}
                      onChange={e => {
                        e.stopPropagation();
                        onUpdateFilament({ ...slot, color: e.target.value });
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Click to pick filament color"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-cyan-400 font-bold">Slot {slot.id}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-medium text-white truncate max-w-[140px]">{slot.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {slot.material} · {slot.tempNozzle}°C
                    </div>
                  </div>
                </div>

                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {slot.spoolGramsRemaining}g
                </span>
              </div>

              {/* Filament Attributes Configuration */}
              <div
                className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]"
                onClick={e => e.stopPropagation()}
              >
                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Filament Name</label>
                  <input
                    type="text"
                    value={slot.name}
                    onChange={e => onUpdateFilament({ ...slot, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-0.5">Material Profile</label>
                  <select
                    value={slot.material}
                    onChange={e => onUpdateFilament({ ...slot, material: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-white text-xs"
                  >
                    <option value="High-Speed PLA">High-Speed PLA (600mm/s)</option>
                    <option value="PLA+">PLA+ Tough</option>
                    <option value="PETG">PETG High-Temp</option>
                    <option value="TPU (95A)">TPU (95A Flexible)</option>
                    <option value="ABS">ABS Structural</option>
                    <option value="PVA Soluble">PVA Soluble Support</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] flex items-center gap-1 mb-0.5">
                    <Flame className="w-2.5 h-2.5 text-amber-400" />
                    Nozzle Temp
                  </label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      value={slot.tempNozzle}
                      onChange={e => onUpdateFilament({ ...slot, tempNozzle: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white text-xs tabular-nums"
                    />
                    <span className="text-slate-500">°C</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] flex items-center gap-1 mb-0.5">
                    <SlidersHorizontal className="w-2.5 h-2.5 text-cyan-400" />
                    Purge Factor
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.5"
                    value={slot.purgeFactor}
                    onChange={e => onUpdateFilament({ ...slot, purgeFactor: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white text-xs font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
