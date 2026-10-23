import React, { useState } from "react";
import { EqualizerProfile, DelayConfig } from "../audio/AudioEngine";
import { FACTORY_PRESETS } from "../services/profileService";
import {
  Bookmark,
  Check,
  Download,
  FolderPlus,
  LogIn,
  LogOut,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";

interface ProfileManagerProps {
  currentProfile: EqualizerProfile;
  customProfiles: EqualizerProfile[];
  onSelectProfile: (profile: EqualizerProfile) => void;
  onSaveCurrentAsProfile: (name: string, description?: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onGenerateAiProfile: (target: string, headphones?: string) => Promise<void>;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  isGameBoosterActive?: boolean;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  currentProfile,
  customProfiles,
  onSelectProfile,
  onSaveCurrentAsProfile,
  onDeleteProfile,
  onGenerateAiProfile,
  user,
  onLogin,
  onLogout,
  isGameBoosterActive = false,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDesc, setNewProfileDesc] = useState("");

  const [aiTarget, setAiTarget] = useState("");
  const [aiHeadphones, setAiHeadphones] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onSaveCurrentAsProfile(newProfileName.trim(), newProfileDesc.trim());
    setNewProfileName("");
    setNewProfileDesc("");
    setShowSaveModal(false);
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTarget.trim()) return;
    setIsGeneratingAi(true);
    try {
      await onGenerateAiProfile(aiTarget, aiHeadphones);
      setShowAiModal(false);
      setAiTarget("");
      setAiHeadphones("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 backdrop-blur-xl shadow-2xl">
      {/* Header bar with Auth and Save buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/70 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
            <Bookmark className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
              Perfiles de Audio Personalizados
              {user && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                  Firestore Sincronizado
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              Guarda tus curvas de ecualización y configuraciones de delay en la nube
            </p>
          </div>
        </div>

        {/* Auth status & Save Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-zinc-900/90 pl-2 pr-3 py-1 rounded-xl border border-zinc-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Usuario"}
                  className="h-6 w-6 rounded-full border border-zinc-700"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="text-xs text-zinc-300 max-w-[120px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                onClick={onLogout}
                className="text-zinc-500 hover:text-zinc-300 ml-1"
                title="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 border border-zinc-700 hover:bg-zinc-800 transition-colors shadow-sm"
              title="Inicia sesión con Google para sincronizar tus perfiles en Firestore"
            >
              <LogIn className="h-3.5 w-3.5 text-cyan-400" />
              <span>Sincronizar con Google</span>
            </button>
          )}

          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 transition-all shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Generador AI</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-950/40"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>Guardar Perfil Actual</span>
          </button>
        </div>
      </div>

      {/* Preset Categories */}
      <div className="space-y-4">
        {/* Factory Presets Grid */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
            Perfiles de Estudio (Predeterminados):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {FACTORY_PRESETS.map((preset) => {
              const isSelected = currentProfile.id === preset.id;
              const isBoosterPreset = preset.isGameBooster;

              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectProfile(preset)}
                  className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? isBoosterPreset
                        ? "bg-orange-500/20 border-orange-500/60 text-white shadow-lg shadow-orange-950/40 ring-1 ring-orange-500/40"
                        : "bg-cyan-500/20 border-cyan-500/60 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40"
                      : isBoosterPreset
                      ? "bg-orange-950/20 border-orange-900/40 text-orange-300 hover:border-orange-500/40"
                      : "bg-zinc-900/50 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 mb-2">
                      {preset.description}
                    </p>
                  </div>

                  {/* Micro EQ Curve Sparkline */}
                  <div className="flex items-end justify-between h-5 px-1 pt-0.5 bg-zinc-950/80 rounded-md border border-zinc-850">
                    {preset.bands.map((val, idx) => {
                      const h = Math.max(15, Math.min(100, ((val + 12) / 24) * 100));
                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-t transition-all ${
                            isSelected
                              ? isBoosterPreset
                                ? "bg-orange-400"
                                : "bg-cyan-400"
                              : "bg-zinc-600"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom User Profiles Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Tus Perfiles Personalizados ({customProfiles.length}):
            </span>
          </div>

          {customProfiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center">
              <p className="text-xs text-zinc-500">
                Aún no has guardado perfiles personalizados. Ajusta las 10 bandas y el delay, luego haz clic en "Guardar Perfil Actual".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {customProfiles.map((p) => {
                const isSelected = currentProfile.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProfile(p)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500/60 text-white shadow-lg"
                        : "bg-zinc-900/40 border-zinc-800/70 text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {p.description || "Perfil personalizado"}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProfile(p.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Eliminar perfil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h4 className="text-base font-bold text-zinc-100 mb-2">
              Guardar Perfil de Ecualizador
            </h4>
            <p className="text-xs text-zinc-400 mb-4">
              Se almacenará la curva actual de 10 bandas, ganancia previa (preamp) y configuración de retardo estéreo.
            </p>

            <form onSubmit={handleSaveSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Nombre del Perfil *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mis Auriculares Sony / YouTube Bass"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 border border-zinc-800 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notas de audición o género musical..."
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 border border-zinc-800 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-cyan-400"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Guardar Perfil</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Generate Profile Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h4 className="text-base font-bold text-zinc-100">
                Generador de Perfiles Gemini AI con Búsqueda
              </h4>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Indica una canción, álbum o género de YouTube Music, y opcionalmente tu modelo de auriculares. Gemini investigará las frecuencias maestras para moldear la curva ideal.
            </p>

            <form onSubmit={handleAiSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Canción, Artista o Género en YouTube Music *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. The Weeknd - Blinding Lights / Cyberpunk 2077 OST"
                  value={aiTarget}
                  onChange={(e) => setAiTarget(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 border border-zinc-800 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Modelo de Auriculares o Altavoces (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Sony WH-1000XM4, AirPods Pro 2, Sennheiser HD650..."
                  value={aiHeadphones}
                  onChange={(e) => setAiHeadphones(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 border border-zinc-800 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  disabled={isGeneratingAi}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAi || !aiTarget.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isGeneratingAi ? "Investigando Curva..." : "Diseñar Curva Acústica"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
