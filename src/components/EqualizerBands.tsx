import React from "react";
import { FREQUENCIES } from "../audio/AudioEngine";
import { Disc, Music2, RotateCcw, Sliders, Volume2, Zap } from "lucide-react";

interface EqualizerBandsProps {
  bands: number[];
  preamp: number;
  onBandChange: (index: number, gain: number) => void;
  onPreampChange: (preamp: number) => void;
  onReset: () => void;
  onSelectPreset?: (presetId: string) => void;
  activePresetId?: string;
  isGameBoosterActive?: boolean;
}

const BAND_LABELS = [
  "32",
  "64",
  "125",
  "250",
  "500",
  "1k",
  "2k",
  "4k",
  "8k",
  "16k",
];

const BAND_DESCRIPTIONS = [
  "Sub-graves",
  "Bombo / Graves",
  "Calidez baja",
  "Cuerpo medio",
  "Medios vocales",
  "Presencia",
  "Ataque / Pasos",
  "Claridad / Tiros",
  "Agudos / Brillo",
  "Aire / Apertura",
];

export const EqualizerBands: React.FC<EqualizerBandsProps> = ({
  bands,
  preamp,
  onBandChange,
  onPreampChange,
  onReset,
  onSelectPreset,
  activePresetId,
  isGameBoosterActive = false,
}) => {
  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 backdrop-blur-xl shadow-2xl">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/70 mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              isGameBoosterActive
                ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
            }`}
          >
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
              Ecualizador Gráfico de 10 Bandas
              {isGameBoosterActive && (
                <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-500/30">
                  GAME BOOSTER
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400">
              Ajuste de ganancia con curvas Biquad con precisión de ±12 dB
            </p>
          </div>
        </div>

        {/* Preamp & Reset buttons */}
        <div className="flex items-center gap-4">
          {/* Preamp slider */}
          <div className="flex items-center gap-2 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800">
            <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-mono text-zinc-300">Preamp:</span>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={preamp}
              onChange={(e) => onPreampChange(parseFloat(e.target.value))}
              className="h-1.5 w-20 cursor-pointer accent-cyan-400 bg-zinc-800 rounded-lg"
              title="Ganancia de entrada previa"
            />
            <span
              className={`text-xs font-mono font-medium w-12 text-right ${
                preamp > 0
                  ? "text-cyan-400"
                  : preamp < 0
                  ? "text-amber-400"
                  : "text-zinc-400"
              }`}
            >
              {preamp > 0 ? `+${preamp.toFixed(1)}` : preamp.toFixed(1)} dB
            </span>
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-all"
            title="Restablecer todas las bandas a 0 dB"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset 0dB</span>
          </button>
        </div>
      </div>

      {/* Quick Predefined Audio Genres Bar */}
      {onSelectPreset && (
        <div className="mb-4 pb-3 border-b border-zinc-900 overflow-x-auto flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
            <Music2 className="h-3.5 w-3.5 text-cyan-400" />
            Perfiles:
          </span>

          {[
            { id: "preset-rock", name: "Rock", color: "from-amber-600 to-red-600" },
            { id: "preset-pop", name: "Pop", color: "from-pink-600 to-rose-600" },
            { id: "preset-jazz", name: "Jazz", color: "from-amber-700 to-yellow-600" },
            { id: "preset-clasico", name: "Clásico", color: "from-indigo-600 to-blue-600" },
            { id: "preset-electronica", name: "Electrónica", color: "from-cyan-600 to-teal-600" },
            { id: "preset-flat", name: "Plano", color: "from-zinc-700 to-zinc-600" },
            { id: "preset-game-booster", name: "GAME BOSTER", color: "from-orange-600 to-amber-600" },
          ].map((g) => {
            const isCurrent = activePresetId === g.id;
            const isBooster = g.id === "preset-game-booster";

            return (
              <button
                key={g.id}
                onClick={() => onSelectPreset(g.id)}
                className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                  isCurrent
                    ? `bg-gradient-to-r ${g.color} text-white shadow-md shadow-black/40 ring-1 ring-white/30 scale-105`
                    : isBooster
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {isBooster && <Zap className="h-3 w-3 fill-current" />}
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 10 Vertical Band Sliders */}
      <div className="grid grid-cols-10 gap-2 sm:gap-3 py-2">
        {FREQUENCIES.map((freq, index) => {
          const gain = bands[index] ?? 0;
          const isBoost = gain > 0;
          const isCut = gain < 0;
          const isTacticalTarget =
            isGameBoosterActive && (freq === 2000 || freq === 4000);

          return (
            <div
              key={freq}
              className={`flex flex-col items-center justify-between rounded-xl p-2 transition-all ${
                isTacticalTarget
                  ? "bg-orange-950/20 border border-orange-500/40 shadow-lg shadow-orange-950/30"
                  : "bg-zinc-900/40 border border-zinc-800/40 hover:border-zinc-700/60"
              }`}
            >
              {/* dB Badge */}
              <span
                onDoubleClick={() => onBandChange(index, 0)}
                title="Doble clic para restablecer a 0 dB"
                className={`text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                  isTacticalTarget
                    ? "text-orange-400"
                    : isBoost
                    ? "text-cyan-400"
                    : isCut
                    ? "text-pink-400"
                    : "text-zinc-500"
                }`}
              >
                {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
              </span>

              {/* Vertical Slider Container */}
              <div className="relative my-4 flex h-48 w-8 items-center justify-center">
                {/* 0 dB center reference line */}
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-700/60 pointer-events-none" />
                <div className="absolute top-[25%] left-1 right-1 h-[1px] bg-zinc-800/40 pointer-events-none" />
                <div className="absolute top-[75%] left-1 right-1 h-[1px] bg-zinc-800/40 pointer-events-none" />

                {/* Vertical Range Slider */}
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gain}
                  onChange={(e) =>
                    onBandChange(index, parseFloat(e.target.value))
                  }
                  onDoubleClick={() => onBandChange(index, 0)}
                  className={`eq-vertical-slider h-44 w-2 cursor-pointer appearance-none rounded-lg bg-zinc-800 focus:outline-none ${
                    isTacticalTarget
                      ? "accent-orange-500"
                      : isGameBoosterActive
                      ? "accent-orange-400"
                      : "accent-cyan-400"
                  }`}
                  style={{
                    WebkitAppearance: "slider-vertical",
                    writingMode: "vertical-lr",
                    direction: "rtl",
                  }}
                />
              </div>

              {/* Band Frequency Label */}
              <div className="text-center">
                <span
                  className={`text-xs font-bold font-mono ${
                    isTacticalTarget
                      ? "text-orange-400"
                      : "text-zinc-200"
                  }`}
                >
                  {BAND_LABELS[index]}
                  <span className="text-[10px] text-zinc-500">
                    {freq >= 1000 ? "" : "Hz"}
                  </span>
                </span>
                <p className="hidden md:block text-[9px] text-zinc-500 truncate max-w-[65px]">
                  {BAND_DESCRIPTIONS[index]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zero dB Scale hints */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500 px-2 pt-2 border-t border-zinc-900">
        <span className="text-pink-400/80">-12 dB (Atenuación)</span>
        <span className="text-zinc-400">0 dB (Neutral)</span>
        <span className="text-cyan-400/80">+12 dB (Realce)</span>
      </div>
    </div>
  );
};
