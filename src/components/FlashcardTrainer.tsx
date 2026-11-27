import { useEffect, useMemo, useState } from 'react';
import type { Course, FlashcardItem, Locale, Sm2CardState, Sm2Rating } from '../types/lms';
import { tCopy } from '../data/i18n';
import {
  computeDeckRetentionStats,
  createInitialSm2State,
  formatIntervalLabel,
  isCardDue,
  previewSm2Intervals,
} from '../engines/sm2';
import { CheckCircleIcon, LayersIcon, RotateIcon } from './Icons';

export interface FlashcardTrainerProps {
  courses: Course[];
  cards: FlashcardItem[];
  locale: Locale;
  sm2States: Record<string, Sm2CardState>;
  initialCourseFilter: string;
  onRateCard: (cardId: string, rating: Sm2Rating) => void;
  onResetDeck: () => void;
}

export function FlashcardTrainer({
  courses,
  cards,
  locale,
  sm2States,
  initialCourseFilter,
  onRateCard,
  onResetDeck,
}: FlashcardTrainerProps) {
  const copy = tCopy(locale);
  const [courseFilter, setCourseFilter] = useState<string>(initialCourseFilter || 'all');
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewAheadCardId, setReviewAheadCardId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (initialCourseFilter) {
      setCourseFilter(initialCourseFilter);
      setIsFlipped(false);
      setReviewAheadCardId(null);
    }
  }, [initialCourseFilter]);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const filteredCards = useMemo(
    () => (courseFilter === 'all' ? cards : cards.filter((c) => c.courseId === courseFilter)),
    [cards, courseFilter],
  );

  const stats = useMemo(
    () =>
      computeDeckRetentionStats(
        filteredCards.map((c) => c.id),
        sm2States,
        nowTs,
      ),
    [filteredCards, sm2States, nowTs],
  );

  const dueCards = useMemo(
    () =>
      filteredCards.filter((card) => {
        const st = sm2States[card.id];
        return !st || st.reviewsCount === 0 || isCardDue(st, nowTs);
      }),
    [filteredCards, sm2States, nowTs],
  );

  const activeCard: FlashcardItem | null = useMemo(() => {
    if (reviewAheadCardId) {
      const picked = filteredCards.find((c) => c.id === reviewAheadCardId);
      if (picked) return picked;
    }
    return dueCards[0] ?? null;
  }, [dueCards, filteredCards, reviewAheadCardId]);

  const activeCardState: Sm2CardState | null = useMemo(() => {
    if (!activeCard) return null;
    return sm2States[activeCard.id] ?? createInitialSm2State(activeCard.id, nowTs);
  }, [activeCard, sm2States, nowTs]);

  const intervalPreview = useMemo(
    () => (activeCardState ? previewSm2Intervals(activeCardState, nowTs) : null),
    [activeCardState, nowTs],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !activeCard) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      e.preventDefault();
      setIsFlipped((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCard]);

  const handleRate = (rating: Sm2Rating) => {
    if (!activeCard) return;
    onRateCard(activeCard.id, rating);
    setIsFlipped(false);
    setReviewAheadCardId(null);
    setNowTs(Date.now());
  };

  const handleReviewAhead = () => {
    if (filteredCards.length === 0) return;
    const sorted = [...filteredCards].sort((a, b) => {
      const dueA = sm2States[a.id]?.dueAt ?? 0;
      const dueB = sm2States[b.id]?.dueAt ?? 0;
      return dueA - dueB;
    });
    if (sorted[0]) {
      setReviewAheadCardId(sorted[0].id);
      setIsFlipped(false);
    }
  };

  const activeCourse = activeCard ? courseMap.get(activeCard.courseId) : undefined;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="font-code text-xs font-bold tracking-widest text-amber-600 dark:text-amber-400">
            {copy.flashcards.sectionLabel}
          </span>
          <h2 className="font-editorial mt-1 text-2xl font-semibold tracking-tight text-[var(--sol-text)] sm:text-4xl">
            {copy.flashcards.sectionTitle}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--sol-text-secondary)]">
            {copy.flashcards.sectionDesc}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onResetDeck();
            setIsFlipped(false);
            setReviewAheadCardId(null);
            setNowTs(Date.now());
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3.5 py-2 text-xs font-bold text-[var(--sol-text-secondary)] hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-300 md:self-auto"
        >
          <RotateIcon className="h-3.5 w-3.5" />
          <span>{copy.flashcards.resetDeck}</span>
        </button>
      </div>

      {/* Track Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setCourseFilter('all');
            setIsFlipped(false);
            setReviewAheadCardId(null);
          }}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            courseFilter === 'all'
              ? 'bg-blue-700 text-white shadow-sm dark:bg-blue-600'
              : 'border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
          }`}
        >
          {copy.flashcards.filterAll}
        </button>
        {courses.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCourseFilter(c.id);
              setIsFlipped(false);
              setReviewAheadCardId(null);
            }}
            className={`rounded-full px-3.5 py-1.5 font-code text-xs font-semibold transition-all ${
              courseFilter === c.id
                ? 'bg-blue-700 text-white shadow-sm dark:bg-blue-600'
                : 'border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
            }`}
          >
            {c.code}
          </button>
        ))}
      </div>

      {/* 4 SM-2 Telemetry KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sol-card rounded-xl p-4">
          <div className="font-code text-xs font-semibold text-[var(--sol-text-muted)]">
            {copy.flashcards.statDue}
          </div>
          <div className="mt-1 font-code text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {stats.dueCards}
            <span className="ml-1 text-xs font-medium text-[var(--sol-text-muted)]">
              / {stats.totalCards}
            </span>
          </div>
        </div>
        <div className="sol-card rounded-xl p-4">
          <div className="font-code text-xs font-semibold text-[var(--sol-text-muted)]">
            {copy.flashcards.statMastered}
          </div>
          <div className="mt-1 font-code text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.masteredCards}
          </div>
        </div>
        <div className="sol-card rounded-xl p-4">
          <div className="font-code text-xs font-semibold text-[var(--sol-text-muted)]">
            {copy.flashcards.statEase}
          </div>
          <div className="mt-1 font-code text-2xl font-extrabold text-blue-700 dark:text-blue-400">
            {stats.avgEaseFactor.toFixed(2)}
          </div>
        </div>
        <div className="sol-card rounded-xl p-4">
          <div className="font-code text-xs font-semibold text-[var(--sol-text-muted)]">
            {copy.flashcards.statRetention}
          </div>
          <div className="mt-1 font-code text-2xl font-extrabold text-[var(--sol-text)]">
            {stats.predictedRetentionPct}%
          </div>
        </div>
      </div>

      {/* Main Flashcard Stage */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {activeCard && activeCardState ? (
            <div>
              <div className="sol-perspective">
                <button
                  type="button"
                  data-testid="flashcard-stage"
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="block w-full text-left focus:outline-none"
                >
                  <div
                    className={`sol-flip-inner relative min-h-[320px] w-full ${
                      isFlipped ? 'is-flipped' : ''
                    }`}
                  >
                    {/* Front Face */}
                    <div className="sol-flip-face sol-card absolute inset-0 flex flex-col justify-between rounded-2xl p-6 sm:p-8">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-md px-2 py-0.5 font-code text-xs font-bold text-white"
                            style={{ backgroundColor: activeCourse?.accentHex ?? '#1d4ed8' }}
                          >
                            {activeCourse?.code ?? 'DECK'}
                          </span>
                          <span className="rounded-md border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-2 py-0.5 font-code text-[11px] font-semibold text-[var(--sol-text-secondary)]">
                            {activeCard.tag}
                          </span>
                        </div>
                        <span className="rounded-full border border-blue-700/30 bg-blue-700/10 px-2.5 py-0.5 font-code text-[10px] font-bold tracking-wider text-blue-700 dark:text-blue-300">
                          {copy.flashcards.questionBadge}
                        </span>
                      </div>

                      <div className="my-6">
                        <h3 className="font-editorial text-xl font-semibold leading-snug text-[var(--sol-text)] sm:text-2xl">
                          {activeCard.front[locale]}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sol-border)] pt-4 font-code text-[11px] text-[var(--sol-text-muted)]">
                        <span>{copy.flashcards.tapToFlip}</span>
                        <span>
                          REP {activeCardState.repetitions} · EF {activeCardState.easeFactor.toFixed(2)} · INT{' '}
                          {activeCardState.intervalDays}d
                        </span>
                      </div>
                    </div>

                    {/* Back Face */}
                    <div className="sol-flip-face sol-flip-back sol-card absolute inset-0 flex flex-col justify-between rounded-2xl border-emerald-600/40 p-6 sm:p-8">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-code text-xs font-bold text-[var(--sol-text-muted)]">
                          {activeCourse?.title[locale]} · {activeCard.tag}
                        </span>
                        <span className="rounded-full border border-emerald-600/40 bg-emerald-600/12 px-2.5 py-0.5 font-code text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                          {copy.flashcards.answerBadge}
                        </span>
                      </div>

                      <div className="my-4 space-y-3">
                        <p className="text-sm leading-relaxed text-[var(--sol-text)] sm:text-base">
                          {activeCard.back[locale]}
                        </p>
                        {activeCard.codeSnippet && (
                          <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 font-code text-xs text-emerald-300">
                            <code>{activeCard.codeSnippet}</code>
                          </pre>
                        )}
                      </div>

                      <div className="border-t border-[var(--sol-border)] pt-3 font-code text-[11px] text-[var(--sol-text-muted)]">
                        {copy.flashcards.ratePrompt}
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* SM-2 Rating Controls */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <button
                  type="button"
                  data-testid="sm2-rate-again"
                  disabled={!isFlipped}
                  onClick={() => handleRate('again')}
                  className="flex flex-col items-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-3 text-rose-700 transition-all hover:bg-rose-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 dark:text-rose-300 dark:hover:text-white"
                >
                  <span className="text-xs font-extrabold">{copy.flashcards.again}</span>
                  <span className="mt-0.5 font-code text-[11px] opacity-85">
                    {copy.flashcards.nextInterval}: {intervalPreview?.again ?? '10m'}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="sm2-rate-good"
                  disabled={!isFlipped}
                  onClick={() => handleRate('good')}
                  className="flex flex-col items-center rounded-xl border border-blue-700/40 bg-blue-700/10 px-3 py-3 text-blue-700 transition-all hover:bg-blue-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 dark:text-blue-300 dark:hover:text-white"
                >
                  <span className="text-xs font-extrabold">{copy.flashcards.good}</span>
                  <span className="mt-0.5 font-code text-[11px] opacity-85">
                    {copy.flashcards.nextInterval}: {intervalPreview?.good ?? '1d'}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="sm2-rate-easy"
                  disabled={!isFlipped}
                  onClick={() => handleRate('easy')}
                  className="flex flex-col items-center rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-3 py-3 text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 dark:text-emerald-300 dark:hover:text-white"
                >
                  <span className="text-xs font-extrabold">{copy.flashcards.easy}</span>
                  <span className="mt-0.5 font-code text-[11px] opacity-85">
                    {copy.flashcards.nextInterval}: {intervalPreview?.easy ?? '4d'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="sol-card flex min-h-[320px] flex-col items-center justify-center rounded-2xl p-8 text-center">
              <CheckCircleIcon className="h-12 w-12 text-emerald-600" />
              <h3 className="font-editorial mt-3 text-2xl font-semibold text-[var(--sol-text)]">
                {copy.flashcards.deckCompleteTitle}
              </h3>
              <p className="mt-2 max-w-md text-sm text-[var(--sol-text-secondary)]">
                {copy.flashcards.deckCompleteDesc}
              </p>
              <button
                type="button"
                onClick={handleReviewAhead}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <LayersIcon className="h-4 w-4" />
                <span>{copy.flashcards.reviewAhead}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Live SM-2 Card Schedule Queue */}
        <div className="sol-card flex flex-col rounded-2xl p-4 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-[var(--sol-border)] pb-3">
            <span className="font-code text-xs font-bold uppercase tracking-wider text-[var(--sol-text)]">
              {locale === 'vi' ? 'Hàng Đợi SM-2' : 'SM-2 Schedule Queue'}
            </span>
            <span className="font-code text-[11px] text-[var(--sol-text-muted)]">
              {filteredCards.length} cards
            </span>
          </div>

          <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
            {filteredCards.map((card) => {
              const st = sm2States[card.id];
              const isSelected = activeCard?.id === card.id;
              const due = !st || st.reviewsCount === 0 || isCardDue(st, nowTs);
              const statusLabel = !st || st.reviewsCount === 0
                ? locale === 'vi'
                  ? 'MỚI'
                  : 'NEW'
                : due
                  ? locale === 'vi'
                    ? 'ĐẾN HẠN'
                    : 'DUE'
                  : formatIntervalLabel(st.intervalDays, false);

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setReviewAheadCardId(card.id);
                    setIsFlipped(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-blue-700 bg-blue-700/8 dark:border-blue-400 dark:bg-blue-500/15'
                      : 'border-[var(--sol-border)] bg-[var(--sol-elevated)]/60 hover:border-blue-700/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-code text-[10px] font-semibold text-[var(--sol-text-muted)]">
                      {card.tag}
                    </div>
                    <div className="truncate text-xs font-semibold text-[var(--sol-text)]">
                      {card.front[locale]}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 font-code text-[10px] font-bold ${
                      due
                        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FlashcardTrainer;
