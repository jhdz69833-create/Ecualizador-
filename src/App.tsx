/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  audioEngine,
  DelayConfig,
  EqualizerProfile,
  FREQUENCIES,
} from "./audio/AudioEngine";
import {
  FACTORY_PRESETS,
  getLocalProfiles,
  saveLocalProfiles,
  saveProfileToFirestore,
  deleteProfileFromFirestore,
  subscribeToUserProfiles,
} from "./services/profileService";
import { auth, loginWithGoogle, logoutUser } from "./firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

import { WaveformVisualizer } from "./components/WaveformVisualizer";
import { EqualizerBands } from "./components/EqualizerBands";
import { DelayEffectPanel } from "./components/DelayEffectPanel";
import { AudioSourcePlayer } from "./components/AudioSourcePlayer";
import { ProfileManager } from "./components/ProfileManager";
import { GeminiAcousticChat } from "./components/GeminiAcousticChat";
import { GameBoosterPanel } from "./components/GameBoosterPanel";
import { AnalysisHistoryPanel } from "./components/AnalysisHistoryPanel";
import {
  AudioAnalysisRecord,
  getLocalAnalysisHistory,
  saveLocalAnalysisHistory,
  saveAnalysisRecordToFirestore,
  deleteAnalysisRecordFromFirestore,
  subscribeToAnalysisHistory,
} from "./services/analysisHistoryService";

import {
  Activity,
  Flame,
  Globe,
  Headphones,
  Info,
  Radio,
  ShieldAlert,
  Sparkles,
  Volume2,
  Waves,
  Youtube,
  Zap,
} from "lucide-react";

export default function App() {
  // --- Audio State ---
  const [currentProfile, setCurrentProfile] = useState<EqualizerProfile>(
    FACTORY_PRESETS[0]
  );
  const [bands, setBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [preamp, setPreamp] = useState<number>(0);
  const [delay, setDelay] = useState<DelayConfig>({
    enabled: true,
    time: 0.28,
    feedback: 0.35,
    mix: 0.3,
    pingPong: true,
  });

  // --- Game Booster State ---
  const [isGameBoosterActive, setIsGameBoosterActive] = useState<boolean>(false);
  const [activeTrackTitle, setActiveTrackTitle] = useState<string>(
    "Synthwave / Cyberpunk Radio"
  );

  // --- Profiles & Analysis History State ---
  const [customProfiles, setCustomProfiles] = useState<EqualizerProfile[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AudioAnalysisRecord[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // --- Notification Toast ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Initialize Firebase Auth, Profiles & History ---
  useEffect(() => {
    // Load local profiles and analysis history on boot
    const local = getLocalProfiles();
    setCustomProfiles(local);
    const localHistory = getLocalAnalysisHistory();
    setAnalysisHistory(localHistory);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        showToast(`Sesión iniciada como ${firebaseUser.displayName || firebaseUser.email}`);
        // Subscribe to Firestore custom profiles
        const unsubscribeProfiles = subscribeToUserProfiles(
          firebaseUser.uid,
          (cloudProfiles) => {
            if (cloudProfiles.length > 0) {
              setCustomProfiles(cloudProfiles);
            }
          },
          (err) => console.warn("Firestore listener error:", err)
        );

        // Subscribe to Firestore analysis history
        const unsubscribeHistory = subscribeToAnalysisHistory(
          firebaseUser.uid,
          (cloudHistory) => {
            if (cloudHistory.length > 0) {
              setAnalysisHistory(cloudHistory);
            }
          },
          (err) => console.warn("Firestore history listener error:", err)
        );

        return () => {
          unsubscribeProfiles();
          unsubscribeHistory();
        };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Sync state to AudioEngine
  useEffect(() => {
    audioEngine.setAllBands(bands);
  }, [bands]);

  useEffect(() => {
    audioEngine.setPreamp(preamp);
  }, [preamp]);

  useEffect(() => {
    audioEngine.setDelay(delay);
  }, [delay]);

  // --- Handlers ---
  const handleBandChange = useCallback((index: number, gain: number) => {
    setBands((prev) => {
      const next = [...prev];
      next[index] = gain;
      return next;
    });
  }, []);

  const handlePreampChange = useCallback((newPreamp: number) => {
    setPreamp(newPreamp);
  }, []);

  const handleDelayChange = useCallback((newDelay: Partial<DelayConfig>) => {
    setDelay((prev) => ({ ...prev, ...newDelay }));
  }, []);

  const handleResetBands = useCallback(() => {
    setBands([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    setPreamp(0);
    showToast("Bandas restablecidas a 0 dB (Neutral)");
  }, []);

  const handleSelectProfile = useCallback((profile: EqualizerProfile) => {
    setCurrentProfile(profile);
    setBands([...profile.bands]);
    setPreamp(profile.preamp);
    setDelay({ ...profile.delay });
    if (profile.isGameBooster) {
      setIsGameBoosterActive(true);
      audioEngine.triggerGameBoosterSonicPulse();
    } else {
      setIsGameBoosterActive(false);
    }
    showToast(`Perfil cargado: "${profile.name}"`);
  }, []);

  // --- GAME BOOSTER Activation ---
  const triggerGameBooster = useCallback(() => {
    setIsGameBoosterActive(true);
    audioEngine.triggerGameBoosterSonicPulse();

    // Tactical curve: Footsteps at 2-4kHz boosted, mud at 250-500Hz cut, punch at 64Hz
    const tacticalBands = [-2.0, 4.0, 1.0, -3.0, -1.0, 3.0, 6.0, 5.0, 3.0, 1.0];
    const tacticalDelay: DelayConfig = {
      enabled: true,
      time: 0.024, // 24ms micro-delay for binaural soundstage expansion
      feedback: 0.15,
      mix: 0.25,
      pingPong: true,
    };

    setBands(tacticalBands);
    setPreamp(1.5);
    setDelay(tacticalDelay);

    showToast("⚡ ¡GAME BOOSTER ACTIVADO! Modo táctico de combate habilitado.");
  }, []);

  const handleDeactivateGameBooster = useCallback(() => {
    setIsGameBoosterActive(false);
    showToast("Game Booster desactivado.");
  }, []);

  const handleApplyGamePreset = useCallback(
    (mode: "fps" | "cod" | "apex" | "immersion") => {
      audioEngine.triggerGameBoosterSonicPulse();
      if (mode === "fps") {
        setBands([-3, 3, 0, -3, -1, 3, 7, 6, 4, 1]);
        setDelay({ enabled: true, time: 0.02, feedback: 0.12, mix: 0.22, pingPong: true });
        showToast("Modo FPS Táctico (CS2/Valorant): Pasos al máximo");
      } else if (mode === "cod") {
        setBands([-1, 5, 2, -2, 0, 2.5, 5.5, 5, 3.5, 2]);
        setDelay({ enabled: true, time: 0.028, feedback: 0.18, mix: 0.26, pingPong: true });
        showToast("Modo Warzone / CoD: Explosiones claras y audio 3D");
      } else if (mode === "apex") {
        setBands([-2, 3.5, 1, -2.5, 0, 3, 6.5, 5.5, 4, 3]);
        setDelay({ enabled: true, time: 0.025, feedback: 0.15, mix: 0.25, pingPong: true });
        showToast("Modo Apex / Fortnite: Sonido vertical y deslizamientos");
      } else {
        setBands([4, 3, 1, 0, 1.5, 2, 3.5, 4, 5, 4]);
        setDelay({ enabled: true, time: 0.045, feedback: 0.3, mix: 0.35, pingPong: true });
        showToast("Modo RPG Inmersivo: Atmósfera y diálogos nítidos");
      }
    },
    []
  );

  // --- Save Custom Profile ---
  const handleSaveProfile = useCallback(
    async (name: string, description?: string) => {
      const newProfile: EqualizerProfile = {
        id: `profile-${Date.now()}`,
        name,
        description,
        bands: [...bands],
        preamp,
        delay: { ...delay },
        isGameBooster: isGameBoosterActive,
      };

      // Always save locally
      const updated = [newProfile, ...customProfiles];
      setCustomProfiles(updated);
      saveLocalProfiles(updated);

      // If user is authenticated, sync to Firestore
      if (user) {
        try {
          await saveProfileToFirestore(user.uid, newProfile);
          showToast(`Perfil "${name}" sincronizado en la nube (Firestore)`);
        } catch (e) {
          console.error("Firestore save error:", e);
          showToast(`Guardado localmente. Error en nube: ${e}`);
        }
      } else {
        showToast(`Perfil "${name}" guardado localmente.`);
      }
    },
    [bands, preamp, delay, isGameBoosterActive, customProfiles, user]
  );

  const handleDeleteProfile = useCallback(
    async (profileId: string) => {
      const filtered = customProfiles.filter((p) => p.id !== profileId);
      setCustomProfiles(filtered);
      saveLocalProfiles(filtered);

      if (user) {
        try {
          await deleteProfileFromFirestore(user.uid, profileId);
        } catch (e) {
          console.error("Firestore delete error:", e);
        }
      }
      showToast("Perfil eliminado.");
    },
    [customProfiles, user]
  );

  // --- Gemini AI Profile Generation ---
  const handleGenerateAiProfile = useCallback(
    async (target: string, headphones?: string) => {
      showToast(`Gemini investigando curva acústica para "${target}"...`);
      const response = await fetch("/api/gemini/generate-eq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: target, headphones }),
      });

      if (!response.ok) {
        throw new Error("Error al generar perfil con Gemini");
      }

      const data = await response.json();
      if (Array.isArray(data.bands) && data.bands.length === 10) {
        const newProf: EqualizerProfile = {
          id: `ai-${Date.now()}`,
          name: data.name || `AI: ${target}`,
          description: data.why || data.description || "Diseñado por Gemini",
          bands: data.bands,
          preamp: data.preamp || 0,
          delay: {
            enabled: !!data.delayEnabled,
            time: data.delayTime || 0.25,
            feedback: data.delayFeedback || 0.2,
            mix: data.delayMix || 0.25,
            pingPong: true,
          },
        };

        handleSelectProfile(newProf);
        // Also save to custom profiles
        const updated = [newProf, ...customProfiles];
        setCustomProfiles(updated);
        saveLocalProfiles(updated);
        if (user) {
          saveProfileToFirestore(user.uid, newProf).catch(console.error);
        }
        showToast(`¡Curva acústica AI aplicada para "${data.name}"!`);
      }
    },
    [customProfiles, user, handleSelectProfile]
  );

  // --- Apply Curve from Gemini Chat ---
  const handleApplyFromChat = useCallback(
    (newBands: number[], newDelay?: Partial<DelayConfig>, name?: string) => {
      setBands([...newBands]);
      if (newDelay) {
        setDelay((prev) => ({ ...prev, ...newDelay }));
      }
      showToast(`Curva aplicada: ${name || "Recomendación AI"}`);
    },
    []
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-zinc-900/95 px-4 py-3 text-xs font-semibold text-cyan-300 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-3">
          <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Navigation / Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all shadow-md ${
                isGameBoosterActive
                  ? "bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-orange-950/50"
                  : "bg-gradient-to-tr from-cyan-500 to-purple-600 text-white shadow-cyan-950/50"
              }`}
            >
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">
                  WavePulse <span className="text-cyan-400">EQ</span>
                </h1>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                  10-Band Studio
                </span>
                {isGameBoosterActive && (
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-orange-400 border border-orange-500/30 animate-pulse">
                    GAME BOOSTER
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">
                Ecualizador Gráfico, Delay Estéreo & YouTube Music
              </p>
            </div>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="flex items-center gap-3">
            {/* Direct GAME BOSTER Trigger Button */}
            <button
              onClick={triggerGameBooster}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all shadow-md ${
                isGameBoosterActive
                  ? "bg-orange-600 text-white shadow-orange-950/60 ring-2 ring-orange-400/40"
                  : "bg-zinc-900 text-orange-400 border border-orange-500/30 hover:bg-orange-950/40"
              }`}
              title="Activar función integrada GAME BOSTER"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span className="hidden sm:inline">GAME BOSTER</span>
            </button>

            {/* YouTube Music Tag */}
            <div className="hidden md:flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs text-red-400">
              <Youtube className="h-3.5 w-3.5" />
              <span>YouTube Music Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Real-time Oscilloscope & FFT Spectrum Visualizer */}
        <section>
          <WaveformVisualizer
            isGameBoosterActive={isGameBoosterActive}
            bands={bands}
          />
        </section>

        {/* Dedicated Game Booster Panel (Shown when active) */}
        <section>
          <GameBoosterPanel
            isActive={isGameBoosterActive}
            onDeactivate={handleDeactivateGameBooster}
            onApplyGamePreset={handleApplyGamePreset}
          />
        </section>

        {/* Audio Source & YouTube Music Player */}
        <section>
          <AudioSourcePlayer
            isGameBoosterActive={isGameBoosterActive}
            onTrackChange={(t) => setActiveTrackTitle(t)}
          />
        </section>

        {/* 10-Band Graphic Equalizer */}
        <section>
          <EqualizerBands
            bands={bands}
            preamp={preamp}
            onBandChange={handleBandChange}
            onPreampChange={handlePreampChange}
            onReset={handleResetBands}
            onSelectPreset={(presetId) => {
              const p = FACTORY_PRESETS.find((f) => f.id === presetId);
              if (p) handleSelectProfile(p);
            }}
            activePresetId={currentProfile.id}
            isGameBoosterActive={isGameBoosterActive}
          />
        </section>

        {/* Stereo Delay Effect Panel */}
        <section>
          <DelayEffectPanel
            delay={delay}
            onDelayChange={handleDelayChange}
            isGameBoosterActive={isGameBoosterActive}
          />
        </section>

        {/* Two-Column: Profiles Manager & Gemini Acoustic Chatbot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profiles & Cloud Storage (7 cols) */}
          <div className="lg:col-span-7">
            <ProfileManager
              currentProfile={currentProfile}
              customProfiles={customProfiles}
              onSelectProfile={handleSelectProfile}
              onSaveCurrentAsProfile={handleSaveProfile}
              onDeleteProfile={handleDeleteProfile}
              onGenerateAiProfile={handleGenerateAiProfile}
              user={user}
              onLogin={loginWithGoogle}
              onLogout={logoutUser}
              isGameBoosterActive={isGameBoosterActive}
            />
          </div>

          {/* Right Column: Gemini Chatbot & Search Grounding (5 cols) */}
          <div className="lg:col-span-5">
            <GeminiAcousticChat
              currentBands={bands}
              currentDelay={delay}
              onApplyProfile={handleApplyFromChat}
              onTriggerGameBooster={triggerGameBooster}
              isGameBoosterActive={isGameBoosterActive}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            WavePulse EQ • Ecualizador Gráfico de 10 Bandas con Efecto Delay y Visualización de Ondas para YouTube Music
          </p>
          <p className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
            <span>Envía</span>
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-orange-400 font-bold border border-zinc-800">
              GAME BOSTER
            </code>
            <span>para activar el modo táctico</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
