import type { Sm2CardState, Sm2Rating } from '../types/lms';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_EASE_FACTOR = 1.3;
export const INITIAL_EASE_FACTOR = 2.5;

export function createInitialSm2State(cardId: string, nowMs: number = Date.now()): Sm2CardState {
  return {
    cardId,
    repetitions: 0,
    intervalDays: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    dueAt: nowMs,
    lapses: 0,
    lastRating: null,
    reviewsCount: 0,
  };
}

function ratingToQuality(rating: Sm2Rating): number {
  switch (rating) {
    case 'again':
      return 1;
    case 'good':
      return 4;
    case 'easy':
      return 5;
  }
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pure SuperMemo-2 (SM-2) scheduler with Again / Good / Easy ratings.
 * - Again (q=1): resets repetitions to 0, schedules 1-day interval (and short in-session retry), penalizes EF.
 * - Good  (q=4): 1d -> 6d -> round(interval * EF), keeps EF balanced.
 * - Easy  (q=5): 4d -> 10d -> round(interval * EF * 1.3), boosts EF by +0.10.
 */
export function reviewSm2Card(
  state: Sm2CardState,
  rating: Sm2Rating,
  nowMs: number = Date.now(),
): Sm2CardState {
  const q = ratingToQuality(rating);

  // Standard SM-2 ease factor update formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const deltaEf = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const nextEaseFactor = roundTo2(Math.max(MIN_EASE_FACTOR, state.easeFactor + deltaEf));

  if (rating === 'again') {
    return {
      ...state,
      repetitions: 0,
      intervalDays: 1,
      easeFactor: nextEaseFactor,
      dueAt: nowMs + 10 * 60 * 1000, // Re-surface in 10 minutes for immediate reinforcement
      lapses: state.lapses + 1,
      lastRating: 'again',
      reviewsCount: state.reviewsCount + 1,
    };
  }

  const nextRepetitions = state.repetitions + 1;
  let nextIntervalDays: number;

  if (nextRepetitions === 1) {
    nextIntervalDays = rating === 'easy' ? 4 : 1;
  } else if (nextRepetitions === 2) {
    nextIntervalDays = rating === 'easy' ? 10 : 6;
  } else {
    const baseInterval = Math.max(1, state.intervalDays) * nextEaseFactor;
    const easyMultiplier = rating === 'easy' ? 1.3 : 1;
    nextIntervalDays = Math.max(state.intervalDays + 1, Math.round(baseInterval * easyMultiplier));
  }

  return {
    ...state,
    repetitions: nextRepetitions,
    intervalDays: nextIntervalDays,
    easeFactor: nextEaseFactor,
    dueAt: nowMs + nextIntervalDays * DAY_MS,
    lastRating: rating,
    reviewsCount: state.reviewsCount + 1,
  };
}

export interface Sm2IntervalPreview {
  again: string;
  good: string;
  easy: string;
}

export function formatIntervalLabel(days: number, isShortRetry: boolean): string {
  if (isShortRetry) return '10m';
  if (days < 30) return `${days}d`;
  const months = Math.round((days / 30) * 10) / 10;
  return `${months}mo`;
}

export function previewSm2Intervals(state: Sm2CardState, nowMs: number = Date.now()): Sm2IntervalPreview {
  const goodState = reviewSm2Card(state, 'good', nowMs);
  const easyState = reviewSm2Card(state, 'easy', nowMs);

  return {
    again: formatIntervalLabel(1, true),
    good: formatIntervalLabel(goodState.intervalDays, false),
    easy: formatIntervalLabel(easyState.intervalDays, false),
  };
}

export function isCardDue(state: Sm2CardState, nowMs: number = Date.now()): boolean {
  return state.dueAt <= nowMs;
}

export interface DeckRetentionStats {
  totalCards: number;
  dueCards: number;
  newCards: number;
  learningCards: number;
  masteredCards: number;
  avgEaseFactor: number;
  predictedRetentionPct: number;
}

export function computeDeckRetentionStats(
  cardIds: string[],
  states: Record<string, Sm2CardState>,
  nowMs: number = Date.now(),
): DeckRetentionStats {
  const totalCards = cardIds.length;
  if (totalCards === 0) {
    return {
      totalCards: 0,
      dueCards: 0,
      newCards: 0,
      learningCards: 0,
      masteredCards: 0,
      avgEaseFactor: INITIAL_EASE_FACTOR,
      predictedRetentionPct: 100,
    };
  }

  let dueCards = 0;
  let newCards = 0;
  let learningCards = 0;
  let masteredCards = 0;
  let easeSum = 0;
  let reviewedCards = 0;

  for (const id of cardIds) {
    const st = states[id];
    if (!st || st.reviewsCount === 0) {
      newCards += 1;
      dueCards += 1;
      easeSum += INITIAL_EASE_FACTOR;
      continue;
    }

    reviewedCards += 1;
    easeSum += st.easeFactor;
    if (isCardDue(st, nowMs)) {
      dueCards += 1;
    }
    if (st.repetitions >= 3 && st.intervalDays >= 10) {
      masteredCards += 1;
    } else {
      learningCards += 1;
    }
  }

  const avgEaseFactor = roundTo2(easeSum / totalCards);
  const masteryRatio = (masteredCards + learningCards * 0.55) / totalCards;
  const predictedRetentionPct =
    reviewedCards === 0 ? 85 : Math.min(99, Math.max(62, Math.round(74 + masteryRatio * 24)));

  return {
    totalCards,
    dueCards,
    newCards,
    learningCards,
    masteredCards,
    avgEaseFactor,
    predictedRetentionPct,
  };
}
