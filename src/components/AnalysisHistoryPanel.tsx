import React, { useState } from "react";
import { AudioAnalysisRecord } from "../services/analysisHistoryService";
import { FREQUENCIES, DelayConfig } from "../audio/AudioEngine";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Flame,
  Globe,
  Headphones,
  History,
  Info,
  Maximize2,
  Minimize2,
  Radio,
  Repeat,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

interface AnalysisHistoryPanelProps {
  history: AudioAnalysisRecord[];
  currentBands: number[];
  currentDelay: DelayConfig;
  onApplyRecommendation: (
    bands: number[],
    delay?: { enabled: boolean; time: number; feedback: number; mix: number },
    title?: string
  ) => void;
  onDeleteRecord: (id: string) => void;
  onClearHistory: () => void;
  isGameBoosterActive?: boolean;
}

const BAND_LABELS = ["32", "64", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"];

export const AnalysisHistoryPanel: React.FC<AnalysisHistoryPanelProps> = ({
  history,
  currentBands,
  currentDelay,
  onApplyRecommendation,
  onDeleteRecord,
  onClearHistory,
  isGameBoosterActive = false,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    history[0]?.id || ""
  );
  const [filterQuery, setFilterQuery] = useState("");
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [savedSettingsBeforeAudition, setSavedSettingsBeforeAudition] = useState<{
    bands: number[];
    delay: DelayConfig;
  } | null>(null);

  // If current selection is deleted, pick first
  const activeRecord =
    history.find((h) => h.id === selectedRecordId) || history[0] || null;

  const filteredHistory = history.filter(
    (h) =>
      h.query.toLowerCase().includes(filterQuery.toLowerCase()) ||
      h.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      h.summary.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 2) return "Justo ahora";
      if (mins < 60) return `Hace ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Hace ${hours} h`;
      return new Date(isoString).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Reciente";
    }
  };

  // Toggle A/B Audition Test
  const handleToggleAudition = () => {
    if (!activeRecord) return;

    if (!isAuditioning) {
      // Save current settings and switch to recommendation
      setSavedSettingsBeforeAudition({
        bands: [...currentBands],
        delay: { ...currentDelay },
      });
      setIsAuditioning(true);
      onApplyRecommendation(
        activeRecord.bands,
        activeRecord.delayTime !== undefined
          ? {
              enabled: !!activeRecord.delayEnabled,
              time: activeRecord.delayTime,
              feedback: activeRecord.delayFeedback ?? 0.25,
              mix: activeRecord.delayMix ?? 0.25,
            }
          : undefined,
        `[Audición A/B] ${activeRecord.title}`
      );
    } else {
      // Restore previous settings
      if (savedSettingsBeforeAudition) {
        onApplyRecommendation(
          savedSettingsBeforeAudition.bands,
          savedSettingsBeforeAudition.delay,
          "Ajustes Previos Restaurados"
        );
      }
      setIsAuditioning(false);
      setSavedSettingsBeforeAudition(null);
    }
  };

  const handleApplyPermanently = () => {
    if (!activeRecord) return;
    setIsAuditioning(false);
    setSavedSettingsBeforeAudition(null);
    onApplyRecommendation(
      activeRecord.bands,
      activeRecord.delayTime !== undefined
        ? {
            enabled: !!activeRecord.delayEnabled,
            time: activeRecord.delayTime,
            feedback: activeRecord.delayFeedback ?? 0.25,
            mix: activeRecord.delayMix ?? 0.25,
          }
        : undefined,
      activeRecord.title
    );
  };

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/75 p-5 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/70 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 shadow-md">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide text-zinc-100 flex items-center gap-2">
                Historial de Análisis Acústicos Gemini
              </h3>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-500/20">
                Comparador A/B en Vivo
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Compara curvas recomendadas previas frente a tus ajustes actuales en tiempo real
            </p>
          </div>
        </div>

        {/* Search filter and Clear button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar en historial..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="rounded-xl bg-zinc-900/90 pl-8 pr-3 py-1.5 text-xs text-zinc-200 border border-zinc-800 focus:border-cyan-500 focus:outline-none w-40 sm:w-56"
            />
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-1.5 rounded-xl bg-zinc-900 text-zinc-500 hover:text-red-400 hover:bg-zinc-850 border border-zinc-800 transition-colors"
              title="Limpiar todo el historial"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/20">
          <Bot className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-zinc-300">
            Aún no hay análisis en el historial
          </h4>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Haz consultas en el Asistente Acústico Gemini o genera perfiles con el botón "Generador AI". Cada recomendación aparecerá aquí para comparar y audicionar frente a tu ecualizador.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Scrollable History List (5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Registros de Análisis ({filteredHistory.length})
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Desplazable • Más recientes primero
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
              {filteredHistory.map((rec) => {
                const isSelected = activeRecord?.id === rec.id;
                const isGame = rec.isGameBooster;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecordId(rec.id)}
                    className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? isGame
                          ? "bg-orange-500/15 border-orange-500/50 shadow-lg shadow-orange-950/40 ring-1 ring-orange-500/30"
                          : "bg-cyan-500/15 border-cyan-500/50 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30"
                        : "bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="truncate">
                        <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(rec.createdAt)}
                          {isGame && (
                            <span className="ml-1 text-orange-400 font-bold">
                              • GAME BOOSTER
                            </span>
                          )}
                        </span>
                        <h4
                          className={`text-xs font-bold truncate mt-0.5 ${
                            isSelected ? "text-white" : "text-zinc-200"
                          }`}
                        >
                          {rec.title}
                        </h4>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRecord(rec.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
                        title="Eliminar este registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
                      {rec.summary}
                    </p>

                    {/* Query badge and micro EQ preview */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                      <span className="text-[10px] font-mono text-cyan-300/80 truncate max-w-[170px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        {rec.query}
                      </span>

                      {/* Mini 10-bar signature */}
                      <div className="flex items-end gap-0.5 h-4 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-850">
                        {rec.bands.map((val, idx) => {
                          const h = Math.max(
                            15,
                            Math.min(100, ((val + 12) / 24) * 100)
                          );
                          return (
                            <div
                              key={idx}
                              className={`w-1 rounded-t ${
                                isSelected
                                  ? isGame
                                    ? "bg-orange-400"
                                    : "bg-cyan-400"
                                  : "bg-zinc-600"
                              }`}
                              style={{ height: `${h}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Comparative Inspection & A/B Testing (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-5">
            {activeRecord ? (
              <div className="space-y-4">
                {/* Active Record Title & A/B Audition Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {activeRecord.title}
                        {activeRecord.isGameBooster && (
                          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[9px] font-mono font-bold text-orange-400 border border-orange-500/30">
                            TACTICAL GAME
                          </span>
                        )}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Consulta: <span className="text-cyan-300 font-mono">"{activeRecord.query}"</span> • {formatRelativeTime(activeRecord.createdAt)}
                    </p>
                  </div>

                  {/* A/B Test Audition Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleAudition}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-md ${
                        isAuditioning
                          ? "bg-amber-500 text-zinc-950 animate-pulse shadow-amber-950/50 ring-2 ring-amber-400"
                          : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                      }`}
                      title="Alternar entre escuchar tus ajustes y la recomendación"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      <span>{isAuditioning ? "Audicionando A/B (Activo)" : "Probar A/B"}</span>
                    </button>

                    <button
                      onClick={handleApplyPermanently}
                      className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-950/40"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Cargar al Ecualizador</span>
                    </button>
                  </div>
                </div>

                {/* Acoustic Reasoning Box */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 text-xs text-zinc-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Dictamen Acústico Gemini:</span>
                  </div>
                  {activeRecord.summary}
                </div>

                {/* Visual Comparative Curve Chart (Dual Traces) */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between mb-3 text-[11px] font-semibold">
                    <span className="text-zinc-400 uppercase tracking-wider">
                      Comparación Gráfica de Curva de Frecuencias:
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-cyan-400 font-mono">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        Recomendado
                      </span>
                      <span className="flex items-center gap-1.5 text-zinc-300 font-mono">
                        <span className="h-2 w-2 rounded-full bg-zinc-100" />
                        Tu Ajuste Actual
                      </span>
                    </div>
                  </div>

                  {/* SVG Multi-trace Curve Comparison */}
                  <div className="relative h-32 w-full">
                    <svg
                      className="h-full w-full overflow-visible"
                      viewBox="0 0 500 120"
                      preserveAspectRatio="none"
                    >
                      {/* Zero dB line */}
                      <line
                        x1="0"
                        y1="60"
                        x2="500"
                        y2="60"
                        stroke="rgba(255,255,255,0.1)"
                        strokeDasharray="4 4"
                      />
                      {/* +6dB and -6dB reference guides */}
                      <line
                        x1="0"
                        y1="30"
                        x2="500"
                        y2="30"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <line
                        x1="0"
                        y1="90"
                        x2="500"
                        y2="90"
                        stroke="rgba(255,255,255,0.04)"
                      />

                      {/* Current User Curve Path */}
                      {(() => {
                        const points = currentBands.map((val, idx) => {
                          const x = (500 / 9) * idx;
                          // -12dB -> y=110, 0dB -> y=60, +12dB -> y=10
                          const y = 60 - (val / 12) * 50;
                          return `${x},${y}`;
                        });
                        return (
                          <path
                            d={`M ${points.join(" L ")}`}
                            fill="none"
                            stroke="rgba(244, 244, 245, 0.85)"
                            strokeWidth="2"
                            strokeDasharray="3 3"
                          />
                        );
                      })()}

                      {/* Gemini Recommended Curve Path */}
                      {(() => {
                        const points = activeRecord.bands.map((val, idx) => {
                          const x = (500 / 9) * idx;
                          const y = 60 - (val / 12) * 50;
                          return `${x},${y}`;
                        });
                        return (
                          <path
                            d={`M ${points.join(" L ")}`}
                            fill="none"
                            stroke={activeRecord.isGameBooster ? "#f97316" : "#22d3ee"}
                            strokeWidth="2.5"
                          />
                        );
                      })()}

                      {/* Dots on frequencies for both */}
                      {activeRecord.bands.map((val, idx) => {
                        const x = (500 / 9) * idx;
                        const yRec = 60 - (val / 12) * 50;
                        const yCur = 60 - (currentBands[idx] / 12) * 50;
                        return (
                          <g key={idx}>
                            {/* Current dot */}
                            <circle
                              cx={x}
                              cy={yCur}
                              r="3"
                              fill="#ffffff"
                              opacity="0.8"
                            />
                            {/* Rec dot */}
                            <circle
                              cx={x}
                              cy={yRec}
                              r="4"
                              fill={
                                activeRecord.isGameBooster ? "#f97316" : "#22d3ee"
                              }
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Band labels under graph */}
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-2">
                      {BAND_LABELS.map((lbl) => (
                        <span key={lbl}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 10-Band Delta Table (Δ in dB) */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Diferencial por Banda (Δ Ganancia):
                  </span>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {activeRecord.bands.map((recGain, idx) => {
                      const curGain = currentBands[idx] ?? 0;
                      const delta = recGain - curGain;
                      const isSignificant = Math.abs(delta) >= 1.0;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-850"
                        >
                          <span className="text-[10px] font-mono text-zinc-400 font-bold">
                            {BAND_LABELS[idx]}
                          </span>

                          {/* Recommended vs Current */}
                          <div className="text-[9px] font-mono text-zinc-500 my-1 text-center">
                            <span className="text-cyan-400 block font-semibold">
                              {recGain > 0 ? `+${recGain}` : recGain}
                            </span>
                            <span className="text-zinc-400 block">
                              {curGain > 0 ? `+${curGain}` : curGain}
                            </span>
                          </div>

                          {/* Delta */}
                          <span
                            className={`text-[10px] font-mono font-black ${
                              delta > 0.5
                                ? "text-emerald-400"
                                : delta < -0.5
                                ? "text-pink-400"
                                : "text-zinc-600"
                            }`}
                          >
                            {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delay Comparison strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-850 text-xs">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-purple-400" />
                    <span className="font-semibold text-zinc-200">
                      Comparativa de Retardo / Delay:
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <div>
                      <span className="text-zinc-500">Recomendado: </span>
                      <span className="text-purple-300 font-bold">
                        {activeRecord.delayEnabled
                          ? `${Math.round((activeRecord.delayTime || 0.25) * 1000)}ms / ${Math.round(
                              (activeRecord.delayFeedback || 0.2) * 100
                            )}% fb`
                          : "Apagado"}
                      </span>
                    </div>

                    <div className="text-zinc-600">vs</div>

                    <div>
                      <span className="text-zinc-500">Actual: </span>
                      <span className="text-zinc-300 font-bold">
                        {currentDelay.enabled
                          ? `${Math.round(currentDelay.time * 1000)}ms / ${Math.round(
                              currentDelay.feedback * 100
                            )}% fb`
                          : "Apagado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
