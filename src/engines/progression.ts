import type { BilingualText, Course } from '../types/lms';

export interface LevelProgress {
  level: number;
  currentXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
  rankTitle: BilingualText;
}

/**
 * Progressive scholastic XP curve:
 * Level 1 starts at 0 XP.
 * Moving from level L to L+1 requires: 250 + (L - 1) * 150 XP.
 */
export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 250 + (safeLevel - 1) * 150;
}

export function getLearnerRank(level: number): BilingualText {
  if (level >= 10) {
    return { en: 'Principal Fellow', vi: 'Kiến Trúc Sư Trưởng' };
  }
  if (level >= 7) {
    return { en: 'Staff Systems Architect', vi: 'Kỹ Sư Hệ Thống Cấp Cao' };
  }
  if (level >= 4) {
    return { en: 'Senior Builder', vi: 'Kỹ Sư Thực Chiến' };
  }
  if (level >= 2) {
    return { en: 'Applied Engineer', vi: 'Kỹ Sư Ứng Dụng' };
  }
  return { en: 'Scholastic Initiate', vi: 'Học Viên Khởi Đầu' };
}

export function calculateLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeXp;

  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }

  const needed = xpRequiredForLevel(level);
  const progressPct = Math.min(100, Math.round((remaining / needed) * 100));

  return {
    level,
    currentXp: safeXp,
    xpIntoLevel: remaining,
    xpForNextLevel: needed,
    progressPct,
    rankTitle: getLearnerRank(level),
  };
}

export function toIsoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function diffCalendarDays(earlierIso: string, laterIso: string): number {
  const earlierParts = earlierIso.split('-').map(Number);
  const laterParts = laterIso.split('-').map(Number);
  if (earlierParts.length !== 3 || laterParts.length !== 3) return 0;

  const t1 = Date.UTC(earlierParts[0] ?? 2026, (earlierParts[1] ?? 1) - 1, earlierParts[2] ?? 1);
  const t2 = Date.UTC(laterParts[0] ?? 2026, (laterParts[1] ?? 1) - 1, laterParts[2] ?? 1);
  return Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
}

export interface StreakUpdateResult {
  streakDays: number;
  lastActiveDateIso: string;
  streakIncremented: boolean;
}

export function updateDailyStreak(
  currentStreak: number,
  lastActiveDateIso: string,
  todayIso: string,
): StreakUpdateResult {
  if (!lastActiveDateIso) {
    return { streakDays: 1, lastActiveDateIso: todayIso, streakIncremented: true };
  }

  const dayGap = diffCalendarDays(lastActiveDateIso, todayIso);
  if (dayGap <= 0) {
    return {
      streakDays: Math.max(1, currentStreak),
      lastActiveDateIso: todayIso,
      streakIncremented: false,
    };
  }
  if (dayGap === 1) {
    return {
      streakDays: Math.max(1, currentStreak) + 1,
      lastActiveDateIso: todayIso,
      streakIncremented: true,
    };
  }
  return {
    streakDays: 1,
    lastActiveDateIso: todayIso,
    streakIncremented: true,
  };
}

export interface CourseCompletionStats {
  completedCount: number;
  totalCount: number;
  percent: number;
  certificateEligible: boolean;
}

export function calculateCourseCompletion(
  course: Course,
  completedLessons: string[],
  solvedChallenges: string[],
): CourseCompletionStats {
  const completedSet = new Set(completedLessons);
  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const totalCount = allLessonIds.length;
  const completedCount = allLessonIds.filter((id) => completedSet.has(id)).length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const labSolved = solvedChallenges.includes(course.featuredLabId);

  return {
    completedCount,
    totalCount,
    percent,
    certificateEligible: percent >= 50 || labSolved,
  };
}
