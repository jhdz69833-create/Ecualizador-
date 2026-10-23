import React, { useState, useRef, useEffect } from "react";
import { audioEngine } from "../audio/AudioEngine";
import {
  Disc,
  FolderOpen,
  Headphones,
  Mic,
  MicOff,
  Music,
  Pause,
  Play,
  Radio,
  Search,
  Sparkles,
  Volume2,
  Youtube,
} from "lucide-react";

interface AudioSourcePlayerProps {
  isGameBoosterActive?: boolean;
  onTrackChange?: (trackName: string) => void;
}

const YOUTUBE_PRESETS = [
  {
    title: "Synthwave / Cyberpunk Radio",
    videoId: "4xDzrJKXOOY",
    genre: "Synthwave",
    desc: "Bajos 80s y sintetizadores analógicos",
  },
  {
    title: "Lofi Girl - beats to relax/study",
    videoId: "jfKfPfyJRdk",
    genre: "Lo-Fi",
    desc: "Texturas cálidas y batería chill",
  },
  {
    title: "Gaming Tactical Bass Boost",
    videoId: "5qap5aO4i9A",
    genre: "Gaming OST",
    desc: "Graves de impacto y detalles espaciales",
  },
  {
    title: "Electronic Club Dance Hits",
    videoId: "21X5lGlDOfg",
    genre: "EDM",
    desc: "Doble bombo, compresión y agudos aireados",
  },
  {
    title: "Rock Clásico & Guitarras",
    videoId: "1w7OgIMMRc4",
    genre: "Rock",
    desc: "Riffs contundentes y medios marcados",
  },
];

export const AudioSourcePlayer: React.FC<AudioSourcePlayerProps> = ({
  isGameBoosterActive = false,
  onTrackChange,
}) => {
  const [activeTab, setActiveTab] = useState<"procedural" | "youtube" | "mic" | "file">("procedural");
  const [proceduralTrack, setProceduralTrack] = useState<"synthwave" | "lofi" | "bass" | "tactical_game">("synthwave");
  const [isPlayingProcedural, setIsPlayingProcedural] = useState(false);
  
  // YouTube states
  const [ytUrl, setYtUrl] = useState("");
  const [activeVideoId, setActiveVideoId] = useState("4xDzrJKXOOY");
  const [activeVideoTitle, setActiveVideoTitle] = useState("Synthwave / Cyberpunk Radio");
  const [isYtPlaying, setIsYtPlaying] = useState(false);

  // Mic states
  const [isMicActive, setIsMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // File upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isFilePlaying, setIsFilePlaying] = useState(false);

  // Master Volume
  const [volume, setVolume] = useState(85);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setMasterVolume(newVol / 100);
  };

  // Toggle Procedural Track
  const toggleProcedural = (trackType: "synthwave" | "lofi" | "bass" | "tactical_game") => {
    if (isPlayingProcedural && proceduralTrack === trackType) {
      audioEngine.stopProcedural();
      setIsPlayingProcedural(false);
    } else {
      setProceduralTrack(trackType);
      audioEngine.playProceduralTrack(trackType);
      setIsPlayingProcedural(true);
      if (onTrackChange) {
        onTrackChange(
          trackType === "synthwave"
            ? "Cyberpunk Synthwave Beat"
            : trackType === "lofi"
            ? "Lo-Fi Tape Chillhop"
            : trackType === "bass"
            ? "808 Sub-Bass EDM Pulse"
            : "Tactical Game Audio Simulation"
        );
      }
    }
  };

  // Toggle Mic / System Audio Input
  const toggleMic = async () => {
    if (isMicActive) {
      audioEngine.stopMic();
      setIsMicActive(false);
    } else {
      setMicError(null);
      const ok = await audioEngine.enableMicInput();
      if (ok) {
        setIsMicActive(true);
        setIsPlayingProcedural(false);
      } else {
        setMicError("No se pudo acceder al micrófono o dispositivo de entrada de audio.");
      }
    }
  };

  // Handle Local File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    if (audioElementRef.current) {
      audioElementRef.current.src = url;
      audioEngine.connectMediaElement(audioElementRef.current);
      audioElementRef.current.play();
      setIsFilePlaying(true);
      setIsPlayingProcedural(false);
      if (onTrackChange) onTrackChange(file.name);
    }
  };

  const toggleFilePlayback = () => {
    if (!audioElementRef.current) return;
    if (audioElementRef.current.paused) {
      audioEngine.connectMediaElement(audioElementRef.current);
      audioElementRef.current.play();
      setIsFilePlaying(true);
      setIsPlayingProcedural(false);
    } else {
      audioElementRef.current.pause();
      setIsFilePlaying(false);
    }
  };

  // Parse YouTube URL or Video ID
  const handleLoadYouTubeUrl = () => {
    if (!ytUrl.trim()) return;
    let extractedId = ytUrl.trim();

    // Match youtube.com/watch?v=ID or youtu.be/ID or music.youtube.com/watch?v=ID
    const vMatch = ytUrl.match(/(?:v=|\/|youtu\.be\/|embed\/)([0-9A-Za-z_-]{11})/);
    if (vMatch && vMatch[1]) {
      extractedId = vMatch[1];
    }

    setActiveVideoId(extractedId);
    setActiveVideoTitle(`YouTube Music: ${extractedId}`);
    setIsYtPlaying(true);
    setYtUrl("");
    if (onTrackChange) onTrackChange(`YouTube Music [${extractedId}]`);
  };

  const selectYouTubePreset = (preset: (typeof YOUTUBE_PRESETS)[0]) => {
    setActiveVideoId(preset.videoId);
    setActiveVideoTitle(preset.title);
    setIsYtPlaying(true);
    if (onTrackChange) onTrackChange(preset.title);
  };

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 backdrop-blur-xl shadow-2xl">
      <audio ref={audioElementRef} onEnded={() => setIsFilePlaying(false)} className="hidden" />

      {/* Top Source Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/70 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-400 border border-red-500/25">
            <Youtube className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wide uppercase text-zinc-200">
              Fuente de Audio & YouTube Music
            </h3>
            <p className="text-[11px] text-zinc-500">
              Escucha pistas en tiempo real procesadas a través del ecualizador
            </p>
          </div>
        </div>

        {/* Master Volume Slider */}
        <div className="flex items-center gap-2 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800">
          <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-mono text-zinc-400">Master:</span>
          <input
            type="range"
            min="0"
            max="120"
            value={volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="h-1.5 w-20 cursor-pointer accent-cyan-400 bg-zinc-800 rounded-lg"
          />
          <span className="text-[11px] font-mono font-medium text-zinc-300 w-8 text-right">
            {volume}%
          </span>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab("youtube")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "youtube"
              ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
              : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <Youtube className="h-3.5 w-3.5 text-red-400" />
          <span>YouTube Music</span>
        </button>

        <button
          onClick={() => setActiveTab("procedural")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "procedural"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <Music className="h-3.5 w-3.5 text-cyan-400" />
          <span>Pistas Web Audio DSP (Directo)</span>
          <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-bold text-cyan-300">
            Fidelidad 100%
          </span>
        </button>

        <button
          onClick={() => setActiveTab("mic")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "mic"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <Mic className="h-3.5 w-3.5 text-emerald-400" />
          <span>Micrófono / Audio del Sistema</span>
        </button>

        <button
          onClick={() => setActiveTab("file")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
            activeTab === "file"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
              : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
          <span>Archivo Local (MP3/WAV)</span>
        </button>
      </div>

      {/* Tab 1: YouTube Music Embedded Player */}
      {activeTab === "youtube" && (
        <div className="space-y-4">
          {/* URL Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Pega un enlace de YouTube / YouTube Music o ID de video (ej. 4xDzrJKXOOY)..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadYouTubeUrl()}
                className="w-full rounded-xl bg-zinc-900/90 pl-9 pr-3 py-2 text-xs text-zinc-200 border border-zinc-800 focus:border-red-500/50 focus:outline-none"
              />
            </div>
            <button
              onClick={handleLoadYouTubeUrl}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 transition-colors shadow-sm"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Cargar</span>
            </button>
          </div>

          {/* Embedded YouTube Iframe Player */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-7 aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-lg">
              <iframe
                title="Reproductor YouTube Music"
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
                  window.location.origin
                )}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>

            {/* Quick Presets for YouTube Music */}
            <div className="lg:col-span-5 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Pistas Recomendadas para Probar el EQ:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {YOUTUBE_PRESETS.map((preset) => (
                  <button
                    key={preset.videoId}
                    onClick={() => selectYouTubePreset(preset)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                      activeVideoId === preset.videoId
                        ? "bg-red-500/15 border-red-500/40 text-white"
                        : "bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="text-xs font-medium truncate">{preset.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{preset.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                      {preset.genre}
                    </span>
                  </button>
                ))}
              </div>

              {/* YouTube Music Audio Processing Tip */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 text-[11px] text-zinc-400 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-zinc-200">Consejo Pro:</strong> Puedes reproducir YouTube Music aquí y simultáneamente activar las pistas sintetizadas o la entrada de Mic/Sistema para ver el visualizador de ondas en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: High-Fidelity Synthesized Web Audio Tracks (Direct DSP Filtering) */}
      {activeTab === "procedural" && (
        <div>
          <p className="text-xs text-zinc-400 mb-3">
            Estas pistas se sintetizan directamente mediante el motor Web Audio de la aplicación, por lo que cada cambio en las 10 bandas y el delay se aplica instantáneamente a la señal en tiempo real.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => toggleProcedural("synthwave")}
              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
                isPlayingProcedural && proceduralTrack === "synthwave"
                  ? "bg-cyan-500/20 border-cyan-500/50 text-white shadow-lg shadow-cyan-950/50"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono">Synthwave Neon 80s</span>
                {isPlayingProcedural && proceduralTrack === "synthwave" ? (
                  <Pause className="h-4 w-4 text-cyan-400" />
                ) : (
                  <Play className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                120 BPM • Bajos resonantes, arpegios y cajas brillantes
              </p>
            </button>

            <button
              onClick={() => toggleProcedural("lofi")}
              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
                isPlayingProcedural && proceduralTrack === "lofi"
                  ? "bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-950/50"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono">Lo-Fi Tape Chillhop</span>
                {isPlayingProcedural && proceduralTrack === "lofi" ? (
                  <Pause className="h-4 w-4 text-purple-400" />
                ) : (
                  <Play className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                78 BPM • Acordes cálidos, bombo suave y eco vintage
              </p>
            </button>

            <button
              onClick={() => toggleProcedural("bass")}
              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
                isPlayingProcedural && proceduralTrack === "bass"
                  ? "bg-pink-500/20 border-pink-500/50 text-white shadow-lg shadow-pink-950/50"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono">808 Sub-Bass EDM</span>
                {isPlayingProcedural && proceduralTrack === "bass" ? (
                  <Pause className="h-4 w-4 text-pink-400" />
                ) : (
                  <Play className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                135 BPM • Sub-bajos de 32-64Hz de alta energía
              </p>
            </button>

            <button
              onClick={() => toggleProcedural("tactical_game")}
              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
                isPlayingProcedural && proceduralTrack === "tactical_game"
                  ? "bg-orange-500/20 border-orange-500/50 text-white shadow-lg shadow-orange-950/50"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-orange-400">
                  Game Tactical Audio
                </span>
                {isPlayingProcedural && proceduralTrack === "tactical_game" ? (
                  <Pause className="h-4 w-4 text-orange-400" />
                ) : (
                  <Play className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Simulación: Pasos 2-4kHz, recargas y radar espacial
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Microphone / System Loopback */}
      {activeTab === "mic" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">
                Entrada en Vivo de Audio (Micrófono o 'Mezcla Estéreo')
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Conecta tu micrófono o dispositivo virtual de audio para ecualizar tu voz, instrumentos o audio reproducido externamente desde YouTube Music en tu ordenador.
              </p>
            </div>
            <button
              onClick={toggleMic}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-md shrink-0 ${
                isMicActive
                  ? "bg-emerald-600 text-white shadow-emerald-950/50"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {isMicActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span>{isMicActive ? "Detener Entrada" : "Activar Entrada en Vivo"}</span>
            </button>
          </div>

          {micError && (
            <p className="text-xs text-red-400 font-mono bg-red-950/30 border border-red-900/40 p-2 rounded-lg">
              {micError}
            </p>
          )}
        </div>
      )}

      {/* Tab 4: Local Audio File */}
      {activeTab === "file" && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              <FolderOpen className="h-4 w-4 text-purple-400" />
              <span>Seleccionar Archivo MP3 / WAV</span>
            </button>

            {fileName && (
              <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
                <Music className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-mono text-zinc-300 truncate max-w-xs">{fileName}</span>
                <button
                  onClick={toggleFilePlayback}
                  className="ml-2 flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-500"
                >
                  {isFilePlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  <span>{isFilePlaying ? "Pausar" : "Reproducir"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
