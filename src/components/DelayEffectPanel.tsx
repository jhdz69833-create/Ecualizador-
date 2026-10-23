import React, { useState, useRef, useEffect } from "react";
import { DelayConfig } from "../audio/AudioEngine";
import {
  Clock,
  Disc,
  Layers,
  Radio,
  Repeat,
  Sparkles,
  Timer,
  Volume2,
  Waves,
  Zap,
} from "lucide-react";

interface DelayEffectPanelProps {
  delay: DelayConfig;
  onDelayChange: (delay: Partial<DelayConfig>) => void;
  isGameBoosterActive?: boolean;
}

export const DelayEffectPanel: React.FC<DelayEffectPanelProps> = ({
  delay,
  onDelayChange,
  isGameBoosterActive = false,
}) => {
  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapBpm, setTapBpm] = useState<number | null>(null);

  // Pulse animation for delay timing
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!delay.enabled) return;
    const intervalMs = Math.max(50, Math.round(delay.time * 1000));
    const timer = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 90);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [delay.enabled, delay.time]);

  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 2500);
    taps.push(now);
    tapTimesRef.current = taps;

    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgMs);
      setTapBpm(bpm);
      const delayTimeSec = Math.max(0.01, Math.min(1.0, avgMs / 1000));
      onDelayChange({ enabled: true, time: delayTimeSec });
    }
  };

  const getRepeatDescription = (feedback: number) => {
    if (feedback < 0.15) return "1 repetición rápida (Eco directo / Slapback)";
    if (feedback < 0.35) return "2 a 3 ecos rítmicos definidos";
    if (feedback < 0.6) return "4 a 6 ecos con desvanecimiento espacial";
    return "8+ repeticiones (Cascada ambiental prolongada)";
  };

  const quickPresets = [
    { label: "Micro 3D (24ms)", time: 0.024, feedback: 0.15, mix: 0.25, desc: "Binaural Gamer" },
    { label: "Slapback (90ms)", time: 0.09, feedback: 0.12, mix: 0.25, desc: "Rockabilly / Voz" },
    { label: "Rítmico 1/8 (250ms)", time: 0.25, feedback: 0.38, mix: 0.3, desc: "Pop / Synthwave" },
    { label: "Dotted 1/8 (375ms)", time: 0.375, feedback: 0.48, mix: 0.35, desc: "Estilo U2 / Guitarra" },
    { label: "Eco Dub (500ms)", time: 0.5, feedback: 0.65, mix: 0.4, desc: "Dub / Reggae / Ambient" },
    { label: "Cascada (750ms)", time: 0.75, feedback: 0.8, mix: 0.45, desc: "Inmersión profunda" },
  ];

  const currentMs = Math.round(delay.time * 1000);

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 backdrop-blur-xl shadow-2xl">
      {/* Header with power toggle and tempo pulse */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/70 mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              delay.enabled
                ? isGameBoosterActive
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-lg shadow-orange-950/40"
                  : "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-950/40"
                : "bg-zinc-900 text-zinc-600 border border-zinc-800"
            }`}
          >
            <Waves className="h-5 w-5" />
            {delay.enabled && (
              <span
                className={`absolute -top-1 -right-1 h-3 w-3 rounded-full transition-all duration-75 ${
                  pulse
                    ? isGameBoosterActive
                      ? "bg-orange-400 scale-125 shadow-md shadow-orange-400"
                      : "bg-purple-400 scale-125 shadow-md shadow-purple-400"
                    : "bg-zinc-700 scale-75"
                }`}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide text-zinc-100 flex items-center gap-2">
                Control de Efecto Delay & Ecos
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                  delay.enabled
                    ? isGameBoosterActive
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {delay.enabled ? "EFECTO ACTIVO" : "BYPASS (APAGADO)"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Ajusta el tiempo exacto en milisegundos y el número de repeticiones (feedback)
            </p>
          </div>
        </div>

        {/* Tap Tempo & Power Switch */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTapTempo}
            disabled={!delay.enabled}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 disabled:opacity-40 transition-all active:scale-95"
            title="Haz clic rítmicamente al compás de la música para sincronizar el delay"
          >
            <Timer className="h-3.5 w-3.5 text-amber-400" />
            <span>Tap Tempo</span>
            {tapBpm && (
              <span className="font-mono text-[10px] text-amber-300 ml-0.5">
                ({tapBpm} BPM)
              </span>
            )}
          </button>

          <button
            onClick={() => onDelayChange({ enabled: !delay.enabled })}
            className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all shadow-md ${
              delay.enabled
                ? isGameBoosterActive
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-950/60"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-950/60"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                delay.enabled ? "bg-white animate-pulse" : "bg-zinc-600"
              }`}
            />
            <span>{delay.enabled ? "ENCENDIDO" : "APAGADO"}</span>
          </button>
        </div>
      </div>

      {/* Main Dual Controls: 1. Time in Milliseconds & 2. Feedback Repetitions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Delay Time (ms) */}
        <div
          className={`rounded-2xl border p-4.5 transition-all ${
            delay.enabled
              ? "bg-zinc-900/60 border-purple-500/30 shadow-lg shadow-purple-950/20"
              : "bg-zinc-900/20 border-zinc-850 opacity-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <Clock className="h-4 w-4 text-purple-400" />
              Tiempo de Delay (Milisegundos)
            </span>
            <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-purple-500/40">
              <input
                type="number"
                min="10"
                max="1000"
                step="5"
                disabled={!delay.enabled}
                value={currentMs}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 10;
                  onDelayChange({ time: Math.max(0.01, Math.min(1.0, val / 1000)) });
                }}
                className="w-14 bg-transparent text-right font-mono text-xs font-bold text-purple-300 focus:outline-none"
              />
              <span className="text-[11px] font-mono text-purple-400">ms</span>
            </div>
          </div>

          <input
            type="range"
            min="10"
            max="1000"
            step="5"
            disabled={!delay.enabled}
            value={currentMs}
            onChange={(e) =>
              onDelayChange({ time: parseFloat(e.target.value) / 1000 })
            }
            className="w-full h-2.5 cursor-pointer accent-purple-400 bg-zinc-800 rounded-lg transition-all"
          />

          <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-2">
            <span>10 ms (Micro eco)</span>
            <span className="text-purple-300 font-bold">{currentMs} ms</span>
            <span>1000 ms (1 segundo)</span>
          </div>
        </div>

        {/* 2. Feedback (Repeticiones) */}
        <div
          className={`rounded-2xl border p-4.5 transition-all ${
            delay.enabled
              ? "bg-zinc-900/60 border-cyan-500/30 shadow-lg shadow-cyan-950/20"
              : "bg-zinc-900/20 border-zinc-850 opacity-50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <Repeat className="h-4 w-4 text-cyan-400" />
              Feedback (Nivel de Repeticiones)
            </span>
            <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-cyan-500/40">
              <span className="font-mono text-xs font-bold text-cyan-300">
                {Math.round(delay.feedback * 100)}%
              </span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="0.88"
            step="0.01"
            disabled={!delay.enabled}
            value={delay.feedback}
            onChange={(e) =>
              onDelayChange({ feedback: parseFloat(e.target.value) })
            }
            className="w-full h-2.5 cursor-pointer accent-cyan-400 bg-zinc-800 rounded-lg transition-all"
          />

          <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-2">
            <span>0% (1 eco)</span>
            <span className="text-cyan-300 font-bold">
              {Math.round(delay.feedback * 100)}%
            </span>
            <span>88% (Largo)</span>
          </div>

          <p className="text-[11px] text-zinc-400 mt-2 bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-850 truncate">
            {getRepeatDescription(delay.feedback)}
          </p>
        </div>

        {/* 3. Wet/Dry Mix & Ping-Pong 3D */}
        <div
          className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between ${
            delay.enabled
              ? "bg-zinc-900/60 border-emerald-500/30 shadow-lg shadow-emerald-950/20"
              : "bg-zinc-900/20 border-zinc-850 opacity-50"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <Layers className="h-4 w-4 text-emerald-400" />
                Mezcla Señal (Wet / Dry)
              </span>
              <span className="font-mono text-xs font-bold text-emerald-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                {Math.round(delay.mix * 100)}% Eco
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              disabled={!delay.enabled}
              value={delay.mix}
              onChange={(e) =>
                onDelayChange({ mix: parseFloat(e.target.value) })
              }
              className="w-full h-2.5 cursor-pointer accent-emerald-400 bg-zinc-800 rounded-lg transition-all"
            />
          </div>

          {/* Ping Pong Stereo Toggle */}
          <button
            onClick={() => onDelayChange({ pingPong: !delay.pingPong })}
            disabled={!delay.enabled}
            className={`mt-3 flex items-center justify-between rounded-xl p-2.5 border transition-all ${
              delay.pingPong && delay.enabled
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-zinc-950 border-zinc-800 text-zinc-500"
            }`}
            title="Alterna los ecos entre los canales estéreo izquierdo y derecho"
          >
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Ping-Pong Estéreo 3D</span>
            </div>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                delay.pingPong && delay.enabled
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {delay.pingPong && delay.enabled ? "ACTIVADO" : "MONO"}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Eco & Delay Presets */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-zinc-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-400 mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            Configuraciones de Eco Rápidas:
          </span>
          {quickPresets.map((preset) => {
            const isMatch =
              Math.abs(delay.time - preset.time) < 0.02 &&
              Math.abs(delay.feedback - preset.feedback) < 0.08;

            return (
              <button
                key={preset.label}
                onClick={() => {
                  onDelayChange({
                    enabled: true,
                    time: preset.time,
                    feedback: preset.feedback,
                    mix: preset.mix,
                  });
                }}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium transition-all ${
                  isMatch
                    ? "bg-purple-500/25 text-purple-200 border border-purple-500/50 shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700"
                }`}
                title={`${preset.desc} (${Math.round(preset.time * 1000)}ms, ${Math.round(preset.feedback * 100)}% feedback)`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
