import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CodeGradeReport,
  CodingChallenge,
  Course,
  Currency,
  LearnerState,
  Locale,
  QuizGradeReport,
  Sm2Rating,
  ThemeMode,
  WorkspaceTab,
} from './types/lms';
import { COURSES } from './data/courses';
import { CODING_CHALLENGES, FLASHCARDS, QUIZ_QUESTIONS } from './data/sandbox';
import { tCopy } from './data/i18n';
import {
  calculateCourseCompletion,
  calculateLevelProgress,
  toIsoDateOnly,
  updateDailyStreak,
} from './engines/progression';
import { computeDeckRetentionStats, createInitialSm2State, reviewSm2Card } from './engines/sm2';
import {
  createDefaultLearnerState,
  loadInitialLearnerState,
  loadLearnerStateFromIndexedDb,
  persistLearnerState,
} from './engines/storage';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { CatalogSection } from './components/CatalogSection';
import { SandboxSection } from './components/SandboxSection';
import { FlashcardsSection } from './components/FlashcardsSection';
import { CertificateSection } from './components/CertificateSection';
import { CheckoutSection } from './components/CheckoutSection';
import { CheckCircleIcon, RotateIcon, SolarisMark } from './components/Icons';

const UI_PREFS_KEY = 'solaris_academy_ui_v1';

interface UiPrefs {
  locale: Locale;
  currency: Currency;
  theme: ThemeMode;
}

function loadUiPrefs(): UiPrefs {
  const defaults: UiPrefs = { locale: 'en', currency: 'VND', theme: 'dark' };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      locale: parsed.locale === 'vi' ? 'vi' : 'en',
      currency: parsed.currency === 'USD' ? 'USD' : 'VND',
      theme: parsed.theme === 'light' ? 'light' : 'dark',
    };
  } catch {
    return defaults;
  }
}

function bumpActivity(state: LearnerState, deltaXp: number): LearnerState {
  const todayIso = toIsoDateOnly(new Date());
  const streak = updateDailyStreak(state.streakDays, state.lastActiveDateIso, todayIso);
  const nextWeekly = [...state.weeklyActivity];
  if (nextWeekly.length === 7) {
    nextWeekly[6] = (nextWeekly[6] ?? 0) + 1;
  }
  return {
    ...state,
    xp: Math.max(0, state.xp + deltaXp),
    streakDays: streak.streakDays,
    lastActiveDateIso: streak.lastActiveDateIso,
    weeklyActivity: nextWeekly,
  };
}

export function App() {
  const initialPrefs = useMemo(() => loadUiPrefs(), []);
  const [locale, setLocale] = useState<Locale>(initialPrefs.locale);
  const [currency, setCurrency] = useState<Currency>(initialPrefs.currency);
  const [theme, setTheme] = useState<ThemeMode>(initialPrefs.theme);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('catalog');
  const [learner, setLearner] = useState<LearnerState>(() => loadInitialLearnerState());

  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(COURSES[0]?.id ?? null);
  const [activeChallengeId, setActiveChallengeId] = useState<string>(
    CODING_CHALLENGES[0]?.id ?? 'lab-dotnet-idempotency',
  );
  const [flashcardCourseFilter, setFlashcardCourseFilter] = useState<string>('all');
  const [certCourseId, setCertCourseId] = useState<string>(COURSES[0]?.id ?? 'dotnet-10');
  const [initialVerifyQuery, setInitialVerifyQuery] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const hasHydratedIdbRef = useRef(false);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
  };

  // Handle ?verify=SOL-CERT-... deep link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify');
    if (verifyParam) {
      setInitialVerifyQuery(verifyParam);
      setActiveTab('certificate');
    }
  }, []);

  // Reconcile IndexedDB state on mount (only if user has not already interacted)
  useEffect(() => {
    let active = true;
    void loadLearnerStateFromIndexedDb().then((stored) => {
      if (!active || !stored || hasHydratedIdbRef.current) return;
      hasHydratedIdbRef.current = true;
      setLearner((current) => (stored.xp > current.xp ? stored : current));
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist learner state to localStorage + IndexedDB
  useEffect(() => {
    persistLearnerState(learner);
  }, [learner]);

  // Persist UI preferences & sync document classes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(
        UI_PREFS_KEY,
        JSON.stringify({ locale, currency, theme } satisfies UiPrefs),
      );
    } catch {
      // Ignore storage errors
    }
  }, [locale, currency, theme]);

  const copy = tCopy(locale);

  const levelProgress = useMemo(() => calculateLevelProgress(learner.xp), [learner.xp]);

  const totalLessons = useMemo(
    () => COURSES.reduce((acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0), 0),
    [],
  );

  const deckStats = useMemo(
    () =>
      computeDeckRetentionStats(
        FLASHCARDS.map((f) => f.id),
        learner.sm2States,
      ),
    [learner.sm2States],
  );

  const activeHeroCourse = useMemo(() => {
    const enrolledFirst = COURSES.find((c) => learner.enrolledCourseIds.includes(c.id));
    return enrolledFirst ?? COURSES[0]!;
  }, [learner.enrolledCourseIds]);

  const activeHeroCourseStats = useMemo(
    () =>
      calculateCourseCompletion(
        activeHeroCourse,
        learner.completedLessons,
        learner.solvedChallenges,
      ),
    [activeHeroCourse, learner.completedLessons, learner.solvedChallenges],
  );

  const handleToggleLesson = (lessonId: string) => {
    hasHydratedIdbRef.current = true;
    setLearner((prev) => {
      const exists = prev.completedLessons.includes(lessonId);
      if (exists) {
        return {
          ...prev,
          completedLessons: prev.completedLessons.filter((id) => id !== lessonId),
        };
      }
      return bumpActivity(
        {
          ...prev,
          completedLessons: [...prev.completedLessons, lessonId],
        },
        25,
      );
    });
  };

  const handleLaunchLab = (course: Course) => {
    setActiveChallengeId(course.featuredLabId);
    setActiveTab('sandbox');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePracticeCards = (courseId: string) => {
    setFlashcardCourseFilter(courseId);
    setActiveTab('flashcards');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCertificate = (courseId: string) => {
    setCertCourseId(courseId);
    setActiveTab('certificate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleCart = (courseId: string) => {
    hasHydratedIdbRef.current = true;
    setLearner((prev) => {
      const inCart = prev.cartCourseIds.includes(courseId);
      const nextCart = inCart
        ? prev.cartCourseIds.filter((id) => id !== courseId)
        : [...prev.cartCourseIds, courseId];
      return { ...prev, cartCourseIds: nextCart };
    });
  };

  const handleSetCart = (courseIds: string[]) => {
    hasHydratedIdbRef.current = true;
    setLearner((prev) => ({ ...prev, cartCourseIds: Array.from(new Set(courseIds)) }));
  };

  const handleChallengePassed = (challenge: CodingChallenge, report: CodeGradeReport) => {
    hasHydratedIdbRef.current = true;
    const alreadySolved = learner.solvedChallenges.includes(challenge.id);
    setLearner((prev) => {
      const solved = prev.solvedChallenges.includes(challenge.id)
        ? prev.solvedChallenges
        : [...prev.solvedChallenges, challenge.id];
      const bonusXp = prev.solvedChallenges.includes(challenge.id) ? 15 : report.xpAwarded;
      return bumpActivity({ ...prev, solvedChallenges: solved }, bonusXp);
    });
    notify(
      alreadySolved
        ? locale === 'vi'
          ? `Vượt qua 100% test case (+15 XP ôn luyện)`
          : `All assertions passed (+15 practice XP)`
        : locale === 'vi'
          ? `Hoàn thành Lab ${challenge.title.vi} (+${report.xpAwarded} XP)`
          : `Mastered ${challenge.title.en} (+${report.xpAwarded} XP)`,
    );
  };

  const handleQuizCompleted = (domainKey: string, report: QuizGradeReport) => {
    hasHydratedIdbRef.current = true;
    setLearner((prev) => {
      const prevBest = prev.quizBestScores[domainKey] ?? 0;
      return bumpActivity(
        {
          ...prev,
          quizBestScores: {
            ...prev.quizBestScores,
            [domainKey]: Math.max(prevBest, report.scorePct),
          },
        },
        report.xpAwarded,
      );
    });
    notify(
      locale === 'vi'
        ? `Hoàn tất bài thi kiến trúc: ${report.scorePct}% (+${report.xpAwarded} XP)`
        : `Architecture Quiz graded: ${report.scorePct}% (+${report.xpAwarded} XP)`,
    );
  };

  const handleRateFlashcard = (cardId: string, rating: Sm2Rating) => {
    hasHydratedIdbRef.current = true;
    setLearner((prev) => {
      const existing = prev.sm2States[cardId] ?? createInitialSm2State(cardId);
      const updated = reviewSm2Card(existing, rating);
      return bumpActivity(
        {
          ...prev,
          sm2States: {
            ...prev.sm2States,
            [cardId]: updated,
          },
        },
        rating === 'again' ? 5 : 15,
      );
    });
  };

  const handleResetDeck = () => {
    hasHydratedIdbRef.current = true;
    setLearner((prev) => ({ ...prev, sm2States: {} }));
    notify(locale === 'vi' ? 'Đã đặt lại lịch ôn SM-2' : 'SM-2 deck schedule reset');
  };

  const handleCompleteEnrollment = (courseIds: string[]) => {
    hasHydratedIdbRef.current = true;
    setLearner((prev) => {
      const merged = Array.from(new Set([...prev.enrolledCourseIds, ...courseIds]));
      return bumpActivity(
        {
          ...prev,
          enrolledCourseIds: merged,
          cartCourseIds: [],
        },
        100,
      );
    });
    notify(
      locale === 'vi'
        ? `Đã mở khóa ${courseIds.length} khóa học (+100 XP)`
        : `Unlocked ${courseIds.length} tracks (+100 XP)`,
    );
  };

  const handleResetAllProgress = () => {
    hasHydratedIdbRef.current = true;
    const fresh = createDefaultLearnerState();
    setLearner(fresh);
    notify(locale === 'vi' ? 'Đã khôi phục hồ sơ học tập mặc định' : 'Local progress reset to default profile');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sol-bg)] text-[var(--sol-text)]">
      <Header
        locale={locale}
        currency={currency}
        theme={theme}
        activeTab={activeTab}
        cartCount={learner.cartCourseIds.length}
        dueCardsCount={deckStats.dueCards}
        levelProgress={levelProgress}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleLocale={() => setLocale((l) => (l === 'en' ? 'vi' : 'en'))}
        onToggleCurrency={() => setCurrency((c) => (c === 'VND' ? 'USD' : 'VND'))}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <main className="flex-1">
        {activeTab === 'catalog' && (
          <>
            <HeroSection
              locale={locale}
              learner={learner}
              levelProgress={levelProgress}
              activeCourse={activeHeroCourse}
              activeCourseStats={activeHeroCourseStats}
              dueCardsCount={deckStats.dueCards}
              totalLessons={totalLessons}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onScrollToCatalog={() => {
                document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <CatalogSection
              courses={COURSES}
              locale={locale}
              currency={currency}
              learner={learner}
              expandedCourseId={expandedCourseId}
              onSelectExpandedCourse={setExpandedCourseId}
              onToggleLesson={handleToggleLesson}
              onLaunchLab={handleLaunchLab}
              onPracticeCards={handlePracticeCards}
              onOpenCertificate={handleOpenCertificate}
              onToggleCart={handleToggleCart}
              onNotify={notify}
            />
          </>
        )}

        {activeTab === 'sandbox' && (
          <SandboxSection
            courses={COURSES}
            challenges={CODING_CHALLENGES}
            questions={QUIZ_QUESTIONS}
            locale={locale}
            activeChallengeId={activeChallengeId}
            solvedChallenges={learner.solvedChallenges}
            onSelectChallenge={setActiveChallengeId}
            onChallengePassed={handleChallengePassed}
            onQuizCompleted={handleQuizCompleted}
            onJumpToCertificate={handleOpenCertificate}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsSection
            courses={COURSES}
            cards={FLASHCARDS}
            locale={locale}
            sm2States={learner.sm2States}
            initialCourseFilter={flashcardCourseFilter}
            onRateCard={handleRateFlashcard}
            onResetDeck={handleResetDeck}
          />
        )}

        {activeTab === 'certificate' && (
          <CertificateSection
            courses={COURSES}
            locale={locale}
            learner={learner}
            selectedCourseId={certCourseId}
            initialVerifyQuery={initialVerifyQuery}
            onSelectCourseId={setCertCourseId}
            onUpdateStudentName={(name) => {
              hasHydratedIdbRef.current = true;
              setLearner((prev) => ({ ...prev, studentName: name }));
            }}
            onNotify={notify}
          />
        )}

        {activeTab === 'checkout' && (
          <CheckoutSection
            courses={COURSES}
            locale={locale}
            currency={currency}
            learner={learner}
            onSetCart={handleSetCart}
            onToggleCart={handleToggleCart}
            onCompleteEnrollment={handleCompleteEnrollment}
            onNotify={notify}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-[var(--sol-border)] bg-[var(--sol-surface)]/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-[var(--sol-text-muted)] sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <SolarisMark className="h-6 w-6 shrink-0" />
            <span>{copy.footer.tagline}</span>
          </div>
          <button
            type="button"
            onClick={handleResetAllProgress}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sol-border)] px-3 py-1.5 font-code text-[11px] font-semibold text-[var(--sol-text-secondary)] transition-colors hover:border-rose-500/50 hover:text-rose-500"
          >
            <RotateIcon className="h-3.5 w-3.5" />
            <span>{copy.footer.resetProgress}</span>
          </button>
        </div>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 right-4 z-50 flex max-w-sm items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-950/95 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md"
        >
          <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
