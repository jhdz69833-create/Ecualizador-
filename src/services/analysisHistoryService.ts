import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

export interface AudioAnalysisRecord {
  id: string;
  userId: string;
  query: string;
  title: string;
  summary: string;
  bands: number[]; // 10 values
  preamp?: number;
  delayEnabled?: boolean;
  delayTime?: number;
  delayFeedback?: number;
  delayMix?: number;
  isGameBooster?: boolean;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = "wavepulse_analysis_history";

export const DEFAULT_INITIAL_ANALYSES: AudioAnalysisRecord[] = [
  {
    id: "rec-initial-game-booster",
    userId: "guest",
    query: "GAME BOSTER",
    title: "Modo Táctico Competitivo (Pasos y Radar 3D)",
    summary:
      "Aislamiento psicoacústico de frecuencias de pisadas en 2kHz-4kHz (+6dB), mitigación de retumbos parásitos en 250Hz-500Hz (-3dB) y micro-delay binaural de 24ms para orientación espacial 360° en shooters (CS2, Warzone, Apex).",
    bands: [-2.0, 4.0, 1.0, -3.0, -1.0, 3.0, 6.0, 5.0, 3.0, 1.0],
    preamp: 1.5,
    delayEnabled: true,
    delayTime: 0.024,
    delayFeedback: 0.15,
    delayMix: 0.25,
    isGameBooster: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "rec-initial-daft-punk",
    query: "Daft Punk - Around the World (YouTube Music)",
    title: "French Touch & Línea de Bajo Funk",
    summary:
      "Realce enérgico de bombo y bajo a 64Hz (+5.5dB), apertura de medios para el vocoder a 1kHz-2kHz (+3dB) y delay estéreo rítmico de 250ms (1/8 de compás a 120 BPM).",
    bands: [3.5, 5.5, 3.0, -1.0, 0.5, 2.5, 3.5, 2.0, 3.0, 4.0],
    preamp: 0.0,
    delayEnabled: true,
    delayTime: 0.25,
    delayFeedback: 0.35,
    delayMix: 0.28,
    isGameBooster: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    userId: "guest",
  },
  {
    id: "rec-initial-sony-wh1000",
    query: "Compensación Sony WH-1000XM5",
    title: "Curva Harman Target para Auriculares",
    summary:
      "Atenúa la ligera acumulación de 125Hz-250Hz propia de los transductores cerrados con cancelación de ruido, abriendo la claridad vocal a 3kHz (+4dB) y extensión de aire a 16kHz.",
    bands: [1.0, 1.5, -0.5, -2.0, 0.0, 1.5, 3.0, 4.0, 3.5, 3.0],
    preamp: 0.5,
    delayEnabled: false,
    delayTime: 0.18,
    delayFeedback: 0.15,
    delayMix: 0.15,
    isGameBooster: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    userId: "guest",
  },
  {
    id: "rec-initial-lofi-beats",
    query: "Lofi Girl Beats (YouTube Music)",
    title: "Calidez Analógica y Atenuación Tape",
    summary:
      "Graves redondos y suaves en 64Hz (+4dB), realce nostálgico de frecuencias medias (500Hz-1kHz) y atenuación progresiva en agudos (-6dB en 16kHz) para emular cinta de casete con delay de 360ms.",
    bands: [3.0, 4.0, 2.5, 1.0, 1.5, 0.0, -2.0, -4.0, -6.0, -8.0],
    preamp: 0.5,
    delayEnabled: true,
    delayTime: 0.36,
    delayFeedback: 0.45,
    delayMix: 0.35,
    isGameBooster: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    userId: "guest",
  },
];

export function getLocalAnalysisHistory(): AudioAnalysisRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_ANALYSES));
      return DEFAULT_INITIAL_ANALYSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INITIAL_ANALYSES;
  } catch (e) {
    console.error("Failed to read local analysis history:", e);
    return DEFAULT_INITIAL_ANALYSES;
  }
}

export function saveLocalAnalysisHistory(history: AudioAnalysisRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save local analysis history:", e);
  }
}

export async function saveAnalysisRecordToFirestore(
  userId: string,
  record: AudioAnalysisRecord
) {
  const path = `users/${userId}/analysis_history/${record.id}`;
  try {
    const docRef = doc(db, "users", userId, "analysis_history", record.id);
    const payload = {
      id: record.id,
      userId,
      query: (record.query || "").slice(0, 256),
      title: (record.title || "Recomendación Gemini").slice(0, 128),
      summary: (record.summary || "").slice(0, 2048),
      bands: record.bands.slice(0, 10),
      preamp: record.preamp ?? 0,
      delayEnabled: !!record.delayEnabled,
      delayTime: record.delayTime ?? 0.25,
      delayFeedback: record.delayFeedback ?? 0.2,
      delayMix: record.delayMix ?? 0.25,
      isGameBooster: !!record.isGameBooster,
      createdAt: record.createdAt || new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAnalysisRecordFromFirestore(
  userId: string,
  recordId: string
) {
  const path = `users/${userId}/analysis_history/${recordId}`;
  try {
    const docRef = doc(db, "users", userId, "analysis_history", recordId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToAnalysisHistory(
  userId: string,
  onUpdate: (records: AudioAnalysisRecord[]) => void,
  onError?: (err: any) => void
) {
  const path = `users/${userId}/analysis_history`;
  const colRef = collection(db, "users", userId, "analysis_history");

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AudioAnalysisRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id || d.id,
          userId: data.userId || userId,
          query: data.query || "",
          title: data.title || "Análisis Acústico",
          summary: data.summary || "",
          bands: data.bands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          preamp: data.preamp ?? 0,
          delayEnabled: !!data.delayEnabled,
          delayTime: data.delayTime ?? 0.25,
          delayFeedback: data.delayFeedback ?? 0.2,
          delayMix: data.delayMix ?? 0.25,
          isGameBooster: !!data.isGameBooster,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      // Sort newest first
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
