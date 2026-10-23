import React from "react";
import { audioEngine } from "../audio/AudioEngine";
import {
  Activity,
  Crosshair,
  Flame,
  Radio,
  Shield,
  ShieldAlert,
  Sparkles,
  Volume2,
  X,
  Zap,
} from "lucide-react";

interface GameBoosterPanelProps {
  isActive: boolean;
  onDeactivate: () => void;
  onApplyGamePreset: (gameMode: "fps" | "cod" | "apex" | "immersion") => void;
}

export const GameBoosterPanel: React.FC<GameBoosterPanelProps> = ({
  isActive,
  onDeactivate,
  onApplyGamePreset,
}) => {
  if (!isActive) return null;

  const testTacticalSound = () => {
    audioEngine.triggerGameBoosterSonicPulse();
    audioEngine.playProceduralTrack("tactical_game");
  };

  return (
    <div className="relative rounded-2xl border-2 border-orange-500/60 bg-gradient-to-b from-orange-950/40 via-zinc-950/90 to-zinc-950 p-5 backdrop-blur-2xl shadow-2xl shadow-orange-950/60 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Decorative tactical background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

      {/* Top Banner */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-orange-500/30 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-600/40 animate-pulse">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wider text-orange-400 uppercase font-mono">
                GAME BOOSTER ACTIVO // MODO TÁCTICO INTEGRADO
              </h3>
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-orange-300 border border-orange-500/40 animate-pulse">
                SISTEMA OPTIMIZADO
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Aislador acústico de pasos en 2kHz-4kHz y micro-delay binaural 3D habilitado
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={testTacticalSound}
            className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-orange-500 shadow-md shadow-orange-950/50 transition-all"
            title="Prueba de audio táctico con pasos sintetizados"
          >
            <Radio className="h-3.5 w-3.5 animate-spin" />
            <span>Probar Audio Táctico</span>
          </button>

          <button
            onClick={onDeactivate}
            className="flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title="Desactivar Game Booster"
          >
            <X className="h-4 w-4" />
            <span>Desactivar</span>
          </button>
        </div>
      </div>

      {/* Tactical Radar & Band Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-orange-300 font-bold">
              2 kHz - 4 kHz
            </span>
            <span className="text-xs font-mono font-black text-orange-400">
              +6.0 dB
            </span>
          </div>
          <p className="text-[11px] font-semibold text-zinc-200">
            Aislamiento de Pasos
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Realza el crujido de pisadas en metal, grava y madera.
          </p>
        </div>

        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-orange-300 font-bold">
              64 Hz / Graves
            </span>
            <span className="text-xs font-mono font-black text-orange-400">
              +4.0 dB
            </span>
          </div>
          <p className="text-[11px] font-semibold text-zinc-200">
            Impacto de Explosiones
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Pegada contundente y limpia sin saturar el espectro.
          </p>
        </div>

        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-zinc-400 font-bold">
              250 Hz - 500 Hz
            </span>
            <span className="text-xs font-mono font-black text-pink-400">
              -3.0 dB
            </span>
          </div>
          <p className="text-[11px] font-semibold text-zinc-200">
            Filtro Anti-Turbidez
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Elimina el eco de habitaciones y retumbos confusos.
          </p>
        </div>

        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-purple-300 font-bold">
              Delay 3D Binaural
            </span>
            <span className="text-xs font-mono font-black text-purple-300">
              24 ms
            </span>
          </div>
          <p className="text-[11px] font-semibold text-zinc-200">
            Localización 360°
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Micro-retardo espacial para ubicar la dirección del enemigo.
          </p>
        </div>
      </div>

      {/* Quick Game Modes Selector */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-orange-500/20">
        <span className="text-[11px] font-bold text-zinc-400 mr-2 uppercase tracking-wider">
          Ajustes Especializados por Juego:
        </span>

        <button
          onClick={() => onApplyGamePreset("fps")}
          className="flex items-center gap-1.5 rounded-lg bg-orange-500/15 border border-orange-500/40 px-3 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-500/30 transition-all"
        >
          <Crosshair className="h-3.5 w-3.5" />
          <span>CS2 / Valorant</span>
        </button>

        <button
          onClick={() => onApplyGamePreset("cod")}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
        >
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span>Call of Duty / Warzone</span>
        </button>

        <button
          onClick={() => onApplyGamePreset("apex")}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
        >
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span>Apex Legends / Fortnite</span>
        </button>

        <button
          onClick={() => onApplyGamePreset("immersion")}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>RPG & Mundo Abierto</span>
        </button>
      </div>
    </div>
  );
};
