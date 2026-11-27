import type { LearnerState } from '../types/lms';
import { toIsoDateOnly } from './progression';

const STORAGE_KEY = 'solaris_academy_state_v1';
const DB_NAME = 'solaris_academy_db';
const STORE_NAME = 'learner_state';
const RECORD_KEY = 'primary_profile';

export function createDefaultLearnerState(todayIso: string = toIsoDateOnly(new Date())): LearnerState {
  return {
    xp: 420,
    streakDays: 5,
    lastActiveDateIso: todayIso,
    weeklyActivity: [2, 3, 1, 4, 3, 2, 1],
    completedLessons: [
      'dotnet-m1-l1',
      'dotnet-m1-l2',
      'react-m1-l1',
      'rag-m1-l1',
    ],
    solvedChallenges: [],
    quizBestScores: {},
    sm2States: {},
    enrolledCourseIds: ['dotnet-10'],
    cartCourseIds: ['react-19', 'applied-rag'],
    studentName: 'Truong Van Tinh',
  };
}

export function loadInitialLearnerState(): LearnerState {
  const fallback = createDefaultLearnerState();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LearnerState>;
    return {
      ...fallback,
      ...parsed,
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : fallback.completedLessons,
      solvedChallenges: Array.isArray(parsed.solvedChallenges) ? parsed.solvedChallenges : fallback.solvedChallenges,
      enrolledCourseIds: Array.isArray(parsed.enrolledCourseIds) ? parsed.enrolledCourseIds : fallback.enrolledCourseIds,
      cartCourseIds: Array.isArray(parsed.cartCourseIds) ? parsed.cartCourseIds : fallback.cartCourseIds,
      weeklyActivity:
        Array.isArray(parsed.weeklyActivity) && parsed.weeklyActivity.length === 7
          ? parsed.weeklyActivity
          : fallback.weeklyActivity,
      sm2States: parsed.sm2States && typeof parsed.sm2States === 'object' ? parsed.sm2States : {},
      quizBestScores: parsed.quizBestScores && typeof parsed.quizBestScores === 'object' ? parsed.quizBestScores : {},
    };
  } catch {
    return fallback;
  }
}

function openSolarisDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadLearnerStateFromIndexedDb(): Promise<LearnerState | null> {
  const db = await openSolarisDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);
      req.onsuccess = () => {
        const val = req.result as Partial<LearnerState> | undefined;
        db.close();
        if (!val) {
          resolve(null);
          return;
        }
        resolve({ ...createDefaultLearnerState(), ...val });
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export function persistLearnerState(state: LearnerState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors in restricted contexts
  }

  void openSolarisDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(state, RECORD_KEY);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    } catch {
      db.close();
    }
  });
}
