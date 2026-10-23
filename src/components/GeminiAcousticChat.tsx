import React, { useState, useRef, useEffect } from "react";
import { EqualizerProfile, DelayConfig } from "../audio/AudioEngine";
import {
  Bot,
  Check,
  ChevronDown,
  Flame,
  Globe,
  Loader2,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

interface GeminiAcousticChatProps {
  currentBands: number[];
  currentDelay: DelayConfig;
  onApplyProfile: (bands: number[], delay?: Partial<DelayConfig>, name?: string) => void;
  onTriggerGameBooster: () => void;
  onNewAnalysisRecord?: (record: any) => void;
  isGameBoosterActive?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendedEq?: number[] | null;
  recommendedDelay?: any;
  presetName?: string;
  isGameBooster?: boolean;
  timestamp: string;
}

export const GeminiAcousticChat: React.FC<GeminiAcousticChatProps> = ({
  currentBands,
  currentDelay,
  onApplyProfile,
  onTriggerGameBooster,
  onNewAnalysisRecord,
  isGameBoosterActive = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "¡Hola! Soy tu **Ingeniero Acústico Gemini AI**. Puedo buscar en Google las curvas de ecualización ideales para cualquier canción, artista o género de YouTube Music, optimizar tus auriculares (Sony, AirPods, Sennheiser) o ajustar el retardo estéreo.\n\n💡 *Tip Especial:* Escribe **GAME BOSTER** en cualquier momento para activar el modo de combate y amplificar pasos de enemigos en 2kHz-4kHz.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    // Check for GAME BOSTER keyword trigger
    const isGameBoosterWord = /game\s*boo?ster/i.test(query);
    if (isGameBoosterWord) {
      onTriggerGameBooster();
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build lightweight conversation history for multi-turn
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        text: m.content,
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          currentSettings: {
            bands: currentBands,
            delay: currentDelay,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en servidor: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply || "He procesado tu consulta.",
        recommendedEq: data.recommendedEq,
        recommendedDelay: data.recommendedDelay,
        presetName: data.presetName,
        isGameBooster: data.isGameBoosterTrigger,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Save to analysis history for comparison
      if (data.recommendedEq && onNewAnalysisRecord) {
        onNewAnalysisRecord({
          id: `rec-${Date.now()}`,
          userId: "guest",
          query,
          title: data.presetName || `Recomendación: ${query.slice(0, 32)}`,
          summary: (data.reply || "").replace(/```eq-recommendation[\s\S]*?```/, "").trim().slice(0, 500),
          bands: data.recommendedEq,
          preamp: 0,
          delayEnabled: !!data.recommendedDelay?.enabled,
          delayTime: data.recommendedDelay?.time ?? 0.25,
          delayFeedback: data.recommendedDelay?.feedback ?? 0.25,
          delayMix: data.recommendedDelay?.mix ?? 0.25,
          isGameBooster: !!data.isGameBoosterTrigger,
          createdAt: new Date().toISOString(),
        });
      }

      // If server confirmed Game Booster trigger, guarantee activation
      if (data.isGameBoosterTrigger && !isGameBoosterActive) {
        onTriggerGameBooster();
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ Ocurrió un error al contactar al asistente Gemini. Por favor verifica la conexión o intenta nuevamente.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyCurve = (msg: Message) => {
    if (!msg.recommendedEq) return;
    onApplyProfile(msg.recommendedEq, msg.recommendedDelay, msg.presetName);
    setAppliedMessageId(msg.id);
    setTimeout(() => setAppliedMessageId(null), 3000);
  };

  const quickPrompts = [
    "GAME BOSTER",
    "EQ para Daft Punk en YouTube Music",
    "Perfil para Sony WH-1000XM5",
    "Realzar voces en Pop acústico",
    "Delay óptimo para guitarra rock",
  ];

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/70 bg-zinc-900/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Asistente Acústico Gemini AI
              </h3>
              <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-500/20">
                <Globe className="h-2.5 w-2.5" />
                Google Search Conectado
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Gemini 3.8 Flash con búsqueda de masterings y perfiles de YouTube Music
            </p>
          </div>
        </div>

        {/* Quick Game Booster trigger button */}
        <button
          onClick={() => handleSendMessage("GAME BOSTER")}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-md ${
            isGameBoosterActive
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-950/50"
              : "bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25"
          }`}
          title="Enviar comando GAME BOSTER"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>GAME BOSTER</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "assistant" && (
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                  m.isGameBooster
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                    : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                }`}
              >
                {m.isGameBooster ? (
                  <ShieldAlert className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/30"
                  : m.isGameBooster
                  ? "bg-zinc-900/90 border border-orange-500/40 text-zinc-200 shadow-lg shadow-orange-950/20"
                  : "bg-zinc-900/90 border border-zinc-800 text-zinc-300"
              }`}
            >
              {/* Message text with formatted line breaks */}
              <div className="whitespace-pre-wrap space-y-2">
                {m.content.replace(/```eq-recommendation[\s\S]*?```/, "").trim()}
              </div>

              {/* Recommended Curve Card */}
              {m.recommendedEq && (
                <div className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1.5 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      {m.presetName || "Curva Recomendada de 10 Bandas"}
                    </span>
                    <button
                      onClick={() => applyCurve(m)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all shadow-sm ${
                        appliedMessageId === m.id
                          ? "bg-emerald-600 text-white"
                          : "bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
                      }`}
                    >
                      {appliedMessageId === m.id ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>¡Aplicado!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3" />
                          <span>Aplicar al Ecualizador</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Micro mini EQ preview curve */}
                  <div className="flex items-end justify-between h-8 px-1 pt-1 bg-zinc-950/70 rounded-lg">
                    {m.recommendedEq.map((g, idx) => {
                      const heightPercent = Math.max(10, ((g + 12) / 24) * 100);
                      return (
                        <div
                          key={idx}
                          className="w-1.5 rounded-t bg-cyan-400 transition-all"
                          style={{ height: `${heightPercent}%` }}
                          title={`Banda ${idx}: ${g}dB`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <span className="block mt-1.5 text-[9px] text-zinc-500 text-right font-mono">
                {m.timestamp}
              </span>
            </div>

            {m.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-zinc-400 text-xs py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/80 px-3.5 py-2 rounded-2xl border border-zinc-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span className="text-zinc-400 font-mono text-[11px]">
                Analizando acústica y buscando en Google...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Pills */}
      <div className="px-4 py-2 border-t border-zinc-900 bg-zinc-950/60 overflow-x-auto flex gap-1.5">
        {quickPrompts.map((q) => (
          <button
            key={q}
            onClick={() => handleSendMessage(q)}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              q === "GAME BOSTER"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {q === "GAME BOSTER" ? "⚡ GAME BOSTER" : q}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-3 bg-zinc-900/60 border-t border-zinc-800/80 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
          placeholder="Escribe 'GAME BOSTER' o pregunta por el EQ de cualquier canción/auricular..."
          className="flex-1 rounded-xl bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 border border-zinc-800 focus:border-cyan-500/60 focus:outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-zinc-950 font-bold hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 transition-colors shadow-sm"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
