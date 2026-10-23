import React, { useEffect, useRef, useState } from "react";
import { audioEngine, FREQUENCIES } from "../audio/AudioEngine";
import {
  Activity,
  BarChart2,
  Check,
  Compass,
  Eye,
  Layers,
  Radio,
  ShieldAlert,
  Sparkles,
  Sliders,
  Volume2,
} from "lucide-react";

interface WaveformVisualizerProps {
  isGameBoosterActive?: boolean;
  bands?: number[];
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isGameBoosterActive = false,
  bands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Visualization modes
  const [viewMode, setViewMode] = useState<"wave" | "superimposed" | "eq-peaks" | "spectrum">("superimposed");
  const [showBandPeaks, setShowBandPeaks] = useState<boolean>(true);
  const [showWaveformOverlay, setShowWaveformOverlay] = useState<boolean>(true);
  const [colorTheme, setColorTheme] = useState<"cyan" | "emerald" | "purple" | "fire">("cyan");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRmsDb, setCurrentRmsDb] = useState("-inf");
  const animationFrameRef = useRef<number | null>(null);

  // Peak hold data for the 10 bands
  const bandPeakLevels = useRef<Float32Array>(new Float32Array(10).fill(0));
  const bandCurrentLevels = useRef<Float32Array>(new Float32Array(10).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const timeData = new Uint8Array(2048);
    const freqData = new Uint8Array(1024);
    const spectrumPeaks = new Float32Array(64).fill(0);

    // Approximate FFT bins for the 10 ISO center frequencies:
    // sampleRate ~ 44100 / 48000, binResolution ~ 21.5 Hz / bin
    const bandBinIndices = [
      2,   // ~32 Hz
      3,   // ~64 Hz
      6,   // ~125 Hz
      12,  // ~250 Hz
      23,  // ~500 Hz
      46,  // ~1000 Hz
      93,  // ~2000 Hz
      186, // ~4000 Hz
      372, // ~8000 Hz
      744, // ~16000 Hz
    ];

    let lastFpsUpdate = performance.now();

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background clear with slight decay for smooth phosphor motion trails
      ctx.fillStyle = "rgba(9, 13, 20, 0.42)";
      ctx.fillRect(0, 0, width, height);

      // Get real audio data
      audioEngine.getWaveformData(timeData);
      audioEngine.getFrequencyData(freqData);

      // Check audio activity & calculate real RMS in dB
      let sumSquares = 0;
      for (let i = 0; i < 512; i++) {
        const sample = (timeData[i] - 128) / 128.0;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / 512);
      const active = rms > 0.003;
      setIsPlaying(active);

      if (performance.now() - lastFpsUpdate > 150) {
        lastFpsUpdate = performance.now();
        if (active) {
          const db = Math.max(-60, Math.min(0, 20 * Math.log10(rms)));
          setCurrentRmsDb(`${db.toFixed(1)} dB`);
        } else {
          setCurrentRmsDb("-∞ dB");
        }
      }

      // Studio Grid Background
      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75].forEach((pos) => {
        ctx.beginPath();
        ctx.moveTo(0, height * pos);
        ctx.lineTo(width, height * pos);
        ctx.stroke();
      });

      // 10 Frequency Band vertical column guidelines
      for (let i = 0; i < 10; i++) {
        const x = (width / 11) * (i + 1);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Theme Colors palette
      const isBooster = isGameBoosterActive;
      const primaryHex = isBooster
        ? "#f97316"
        : colorTheme === "emerald"
        ? "#10b981"
        : colorTheme === "purple"
        ? "#a855f7"
        : colorTheme === "fire"
        ? "#ef4444"
        : "#06b6d4";

      const secondaryHex = isBooster
        ? "#fb923c"
        : colorTheme === "emerald"
        ? "#34d399"
        : colorTheme === "purple"
        ? "#c084fc"
        : colorTheme === "fire"
        ? "#f97316"
        : "#38bdf8";

      // --- 1. SPECTRUM LAYER (FFT Bars or Background Glow) ---
      if (viewMode === "spectrum" || viewMode === "superimposed") {
        const barCount = 48;
        const barWidth = (width / barCount) * 0.72;
        const gap = (width / barCount) * 0.28;

        for (let i = 0; i < barCount; i++) {
          const logIdx = Math.min(
            1023,
            Math.floor(Math.pow(i / barCount, 2.1) * 600)
          );
          const rawEnergy = freqData[logIdx] / 255.0;
          const barHeight = Math.max(3, rawEnergy * (height * (viewMode === "superimposed" ? 0.65 : 0.85)));

          if (barHeight > spectrumPeaks[i]) {
            spectrumPeaks[i] = barHeight;
          } else {
            spectrumPeaks[i] = Math.max(0, spectrumPeaks[i] - 1.2);
          }

          const x = i * (barWidth + gap) + gap / 2;
          const y = height - barHeight;

          // Gradient fill
          const grad = ctx.createLinearGradient(0, height, 0, y);
          if (viewMode === "superimposed") {
            grad.addColorStop(0, `${primaryHex}15`);
            grad.addColorStop(0.5, `${primaryHex}55`);
            grad.addColorStop(1, `${secondaryHex}90`);
          } else {
            grad.addColorStop(0, `${primaryHex}30`);
            grad.addColorStop(0.7, `${primaryHex}95`);
            grad.addColorStop(1, `${secondaryHex}ff`);
          }

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Peak cap needle
          if (spectrumPeaks[i] > 3) {
            ctx.fillStyle = `${secondaryHex}ee`;
            ctx.fillRect(x, height - spectrumPeaks[i], barWidth, 1.5);
          }
        }
      }

      // --- 2. 10-BAND EQUALIZER PEAK INDICATORS ---
      if (viewMode === "eq-peaks" || showBandPeaks) {
        for (let i = 0; i < 10; i++) {
          const bin = bandBinIndices[i];
          // Average surrounding bins for stability
          const bVal = (freqData[bin] + freqData[bin - 1] + freqData[bin + 1]) / (3 * 255.0);
          const bandGainBoost = (bands[i] || 0) > 0 ? (bands[i] / 12) * 0.15 : 0;
          const targetLevel = Math.min(1.0, bVal * (1.1 + bandGainBoost));

          // Smooth current meter
          bandCurrentLevels.current[i] += (targetLevel - bandCurrentLevels.current[i]) * 0.45;
          const curr = bandCurrentLevels.current[i];

          // Gravity ballistics on peak hold
          if (curr > bandPeakLevels.current[i]) {
            bandPeakLevels.current[i] = curr;
          } else {
            bandPeakLevels.current[i] = Math.max(0, bandPeakLevels.current[i] - 0.008);
          }

          const x = (width / 11) * (i + 1);
          const columnW = viewMode === "eq-peaks" ? 18 : 6;
          const colHeight = Math.max(4, curr * (height * 0.75));
          const peakY = height - bandPeakLevels.current[i] * (height * 0.75);

          // Column Bar
          const colGrad = ctx.createLinearGradient(0, height, 0, height - colHeight);
          colGrad.addColorStop(0, `${primaryHex}20`);
          colGrad.addColorStop(0.7, `${primaryHex}80`);
          colGrad.addColorStop(1, `${secondaryHex}dd`);

          ctx.fillStyle = colGrad;
          ctx.fillRect(x - columnW / 2, height - colHeight, columnW, colHeight);

          // Peak Hold Line
          ctx.fillStyle = isBooster ? "#fed7aa" : "#e0e7ff";
          ctx.fillRect(x - columnW / 2, Math.max(4, peakY), columnW, 2);

          // Frequency marker at bottom
          ctx.fillStyle = "rgba(161, 161, 170, 0.7)";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          const label = FREQUENCIES[i] >= 1000 ? `${FREQUENCIES[i] / 1000}k` : `${FREQUENCIES[i]}`;
          ctx.fillText(label, x, height - 6);
        }
      }

      // --- 3. ADVANCED OSCILLOSCOPE WAVEFORM LAYER ---
      if (viewMode === "wave" || viewMode === "superimposed" || showWaveformOverlay) {
        // Zero-crossing search to stabilize wave oscillations smoothly
        let startOffset = 0;
        for (let i = 0; i < 512; i++) {
          if (timeData[i] < 128 && timeData[i + 1] >= 128) {
            startOffset = i;
            break;
          }
        }

        ctx.beginPath();
        const sliceWidth = width / 1024;
        let x = 0;

        for (let i = 0; i < 1024; i++) {
          const sampleIdx = (startOffset + i) % 2048;
          const v = timeData[sampleIdx] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        // Phosphor Glow Vector
        ctx.shadowBlur = isBooster ? 14 : 10;
        ctx.shadowColor = `${primaryHex}cc`;
        ctx.strokeStyle = isBooster ? "#fed7aa" : "#ffffff";
        ctx.lineWidth = viewMode === "wave" ? 2.5 : 1.8;
        ctx.stroke();

        // Second subtle translucent baseline trace
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `${secondaryHex}aa`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // --- 4. TACTICAL RADAR HUD IN GAME BOOSTER MODE ---
      if (isBooster) {
        const cx = width / 2;
        const cy = height / 2;

        // Concentric Tactical Circles
        ctx.strokeStyle = "rgba(249, 115, 22, 0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 75, 0, Math.PI * 2);
        ctx.stroke();

        // 360 Radar Sweep Line
        const angle = (performance.now() / 900) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 75, angle, angle + 0.35);
        ctx.fillStyle = "rgba(249, 115, 22, 0.12)";
        ctx.fill();

        // Target Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - 85, cy);
        ctx.lineTo(cx + 85, cy);
        ctx.moveTo(cx, cy - 85);
        ctx.lineTo(cx, cy + 85);
        ctx.stroke();

        // Highlight footsteps detection zone (2k - 4k)
        const x2k = (width / 11) * 7;
        const x4k = (width / 11) * 8;
        ctx.fillStyle = "rgba(249, 115, 22, 0.08)";
        ctx.fillRect(x2k - 10, 8, x4k - x2k + 20, height - 16);
      }

      ctx.restore();
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [viewMode, showBandPeaks, showWaveformOverlay, colorTheme, isGameBoosterActive, bands]);

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/75 p-5 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Background ambient light */}
      <div
        className={`pointer-events-none absolute -top-24 -left-24 h-60 w-60 rounded-full blur-3xl transition-opacity duration-700 ${
          isGameBoosterActive
            ? "bg-orange-600/20 opacity-90"
            : colorTheme === "emerald"
            ? "bg-emerald-600/15 opacity-80"
            : colorTheme === "purple"
            ? "bg-purple-600/15 opacity-80"
            : colorTheme === "fire"
            ? "bg-red-600/15 opacity-80"
            : "bg-cyan-500/15 opacity-80"
        }`}
      />

      {/* Top Header & Toolbar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-zinc-800/70 mb-4">
        {/* Title & Status */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
              isGameBoosterActive
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse shadow-md shadow-orange-950/40"
                : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
            }`}
          >
            {isGameBoosterActive ? (
              <ShieldAlert className="h-4.5 w-4.5" />
            ) : (
              <Activity className="h-4.5 w-4.5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                {isGameBoosterActive
                  ? "Radar Acústico 3D (Game Booster)"
                  : "Visualización Avanzada en Tiempo Real"}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                  isPlaying
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPlaying ? "bg-emerald-400 animate-ping" : "bg-zinc-500"
                  }`}
                />
                {isPlaying ? "Señal Activa" : "En Reposo"}
              </span>

              {isPlaying && (
                <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  RMS: {currentRmsDb}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Forma de onda vectorial + superposición de espectro y medidor de picos de las 10 bandas
            </p>
          </div>
        </div>

        {/* View Mode & Superimposition Options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Superposition Toggles */}
          <button
            onClick={() => setShowBandPeaks(!showBandPeaks)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium border transition-all ${
              showBandPeaks
                ? "bg-zinc-850 text-cyan-300 border-cyan-500/40 shadow-sm"
                : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
            }`}
            title="Superponer indicadores de picos de las 10 bandas del ecualizador"
          >
            <Sliders className="h-3 w-3" />
            <span>Picos 10 Bandas</span>
          </button>

          {/* Mode Selector */}
          <div className="flex items-center rounded-xl bg-zinc-900 p-0.5 border border-zinc-800">
            <button
              onClick={() => setViewMode("wave")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "wave"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Onda
            </button>
            <button
              onClick={() => setViewMode("superimposed")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "superimposed"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Superpone la onda con el espectro FFT"
            >
              Híbrido
            </button>
            <button
              onClick={() => setViewMode("eq-peaks")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "eq-peaks"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Monitoreo de picos de frecuencias"
            >
              10 Bandas
            </button>
            <button
              onClick={() => setViewMode("spectrum")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "spectrum"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Espectro
            </button>
          </div>
        </div>
      </div>

      {/* Main High-Resolution Canvas */}
      <div className="relative h-48 w-full rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 shadow-inner">
        <canvas
          ref={canvasRef}
          className="h-full w-full block cursor-crosshair"
        />

        {/* Legend Overlay of the 10 bands */}
        <div className="pointer-events-none absolute bottom-1.5 inset-x-0 flex justify-between px-3 text-[9px] font-mono text-zinc-500">
          <span>32Hz</span>
          <span>64Hz</span>
          <span>125Hz</span>
          <span>250Hz</span>
          <span>500Hz</span>
          <span>1kHz</span>
          <span className={isGameBoosterActive ? "text-orange-400 font-bold" : ""}>
            2kHz
          </span>
          <span className={isGameBoosterActive ? "text-orange-400 font-bold" : ""}>
            4kHz
          </span>
          <span>8kHz</span>
          <span>16kHz</span>
        </div>
      </div>
    </div>
  );
};
