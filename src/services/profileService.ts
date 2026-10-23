import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { EqualizerProfile } from "../audio/AudioEngine";

export const FACTORY_PRESETS: EqualizerProfile[] = [
  {
    id: "preset-rock",
    name: "Rock",
    description: "Pegada contundente en bombo (64Hz), medios limpios y mordida en guitarras eléctricas y solos.",
    bands: [4.5, 4.0, 2.0, -1.0, -1.5, 1.5, 4.0, 5.0, 5.5, 4.0],
    preamp: 0,
    delay: { enabled: true, time: 0.16, feedback: 0.22, mix: 0.2, pingPong: false },
  },
  {
    id: "preset-pop",
    name: "Pop",
    description: "Voces cristalinas al frente (1k-3k), bombo controlado y agudos brillantes para YouTube Music.",
    bands: [2.5, 3.5, 2.0, -1.0, 0.5, 3.0, 4.5, 3.5, 3.0, 2.0],
    preamp: 0.5,
    delay: { enabled: true, time: 0.24, feedback: 0.25, mix: 0.22, pingPong: true },
  },
  {
    id: "preset-jazz",
    name: "Jazz",
    description: "Calidez acústica, definición de contrabajo (64-125Hz) y resonancia suave en vientos y escobillas.",
    bands: [2.0, 3.5, 2.5, 1.5, 1.0, 2.0, 2.5, 2.0, 3.0, 3.5],
    preamp: 0,
    delay: { enabled: true, time: 0.28, feedback: 0.3, mix: 0.24, pingPong: true },
  },
  {
    id: "preset-clasico",
    name: "Clásico",
    description: "Rango dinámico natural amplio de sala sinfónica, cuerdas sedosas y transparencia armónica.",
    bands: [1.5, 2.0, 1.0, 0, 0, 1.0, 2.0, 3.5, 4.5, 5.0],
    preamp: 0,
    delay: { enabled: true, time: 0.35, feedback: 0.45, mix: 0.3, pingPong: true },
  },
  {
    id: "preset-electronica",
    name: "Electrónica",
    description: "Sub-graves masivos (32-64Hz) para sintetizadores y 808s, con agudos centelleantes (8k-16k).",
    bands: [7.0, 6.5, 3.5, -1.5, -2.0, 1.5, 3.5, 5.0, 6.5, 7.0],
    preamp: -0.5,
    delay: { enabled: true, time: 0.25, feedback: 0.4, mix: 0.32, pingPong: true },
  },
  {
    id: "preset-flat",
    name: "Plano / Estudio Neutral",
    description: "Respuesta en frecuencia balanceada y sin colorear.",
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    preamp: 0,
    delay: { enabled: false, time: 0.25, feedback: 0.2, mix: 0.2, pingPong: false },
  },
  {
    id: "preset-bass",
    name: "Bass Boost Ultra",
    description: "Realce potente de sub-graves (32-125Hz) para Hip-Hop, Trap y graves pesados.",
    bands: [7.5, 6.0, 4.0, 1.5, 0, -1.0, 0.5, 2.0, 3.5, 2.0],
    preamp: -1.0,
    delay: { enabled: false, time: 0.2, feedback: 0.15, mix: 0.15, pingPong: false },
  },
  {
    id: "preset-vocal",
    name: "Vocal Clarity & Podcasts",
    description: "Claridad cristalina para voces, diálogos y presencia lírica.",
    bands: [-2.0, -1.0, 0.5, 1.5, 3.5, 4.5, 3.0, 2.0, 1.0, 0],
    preamp: 0.5,
    delay: { enabled: false, time: 0.18, feedback: 0.1, mix: 0.12, pingPong: false },
  },
  {
    id: "preset-game-booster",
    name: "GAME BOSTER Táctico",
    description: "Modo Competitivo: Pasos (2-4kHz) nítidos, explosiones limpias y delay espacial 3D.",
    bands: [-2.0, 4.0, 1.0, -3.0, -1.0, 3.0, 6.0, 5.0, 3.0, 1.0],
    preamp: 1.5,
    delay: { enabled: true, time: 0.024, feedback: 0.15, mix: 0.25, pingPong: true },
    isGameBooster: true,
  },
];

const LOCAL_STORAGE_KEY = "wavepulse_custom_profiles";

export function getLocalProfiles(): EqualizerProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read local profiles", e);
    return [];
  }
}

export function saveLocalProfiles(profiles: EqualizerProfile[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error("Failed to save local profiles", e);
  }
}

// Firestore operations for authenticated users
export async function saveProfileToFirestore(userId: string, profile: EqualizerProfile) {
  const path = `users/${userId}/profiles/${profile.id}`;
  try {
    const docRef = doc(db, "users", userId, "profiles", profile.id);
    const payload = {
      id: profile.id,
      userId,
      name: profile.name.slice(0, 100),
      description: (profile.description || "").slice(0, 500),
      bands: profile.bands.slice(0, 10),
      preamp: profile.preamp,
      delayEnabled: profile.delay.enabled,
      delayTime: profile.delay.time,
      delayFeedback: profile.delay.feedback,
      delayMix: profile.delay.mix,
      isGameBooster: !!profile.isGameBooster,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProfileFromFirestore(userId: string, profileId: string) {
  const path = `users/${userId}/profiles/${profileId}`;
  try {
    const docRef = doc(db, "users", userId, "profiles", profileId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserProfiles(
  userId: string,
  onUpdate: (profiles: EqualizerProfile[]) => void,
  onError?: (err: any) => void
) {
  const path = `users/${userId}/profiles`;
  const colRef = collection(db, "users", userId, "profiles");

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: EqualizerProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id || d.id,
          name: data.name,
          description: data.description,
          bands: data.bands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          preamp: data.preamp || 0,
          delay: {
            enabled: !!data.delayEnabled,
            time: data.delayTime || 0.25,
            feedback: data.delayFeedback || 0.2,
            mix: data.delayMix || 0.2,
            pingPong: true,
          },
          isGameBooster: !!data.isGameBooster,
        });
      });
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
