import type { Course, LearnerState, Locale, WorkspaceTab } from '../types/lms';
import { tCopy } from '../data/i18n';
import type { CourseCompletionStats, LevelProgress } from '../engines/progression';
import {
  ArrowRightIcon,
  AwardIcon,
  BoltIcon,
  CpuIcon,
  FlameIcon,
  LayersIcon,
  NetworkScaleIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from './Icons';

interface HeroSectionProps {
  locale: Locale;
  learner: LearnerState;
  levelProgress: LevelProgress;
  activeCourse: Course;
  activeCourseStats: CourseCompletionStats;
  dueCardsCount: number;
  totalLessons: number;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onScrollToCatalog: () => void;
}

const WEEK_LABELS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function HeroSection({
  locale,
  learner,
  levelProgress,
  activeCourse,
  activeCourseStats,
  dueCardsCount,
  totalLessons,
  onNavigateTab,
  onScrollToCatalog,
}: HeroSectionProps) {
  const copy = tCopy(locale);
  const weekLabels = locale === 'vi' ? WEEK_LABELS_VI : WEEK_LABELS_EN;
  const maxBar = Math.max(4, ...learner.weeklyActivity);

  return (
    <section className="relative overflow-hidden border-b border-[var(--sol-border)] sol-grid-backdrop">
      {/* Subtle Oxford daylight atmospheric accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 left-1/4 h-72 w-96 rounded-full bg-blue-700/8 blur-3xl dark:bg-blue-500/18"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-1/5 h-64 w-80 rounded-full bg-emerald-600/8 blur-3xl dark:bg-emerald-500/14"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-11">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Oxford Editorial Pitch */}
          <div className="lg:col-span-7">
            <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-700/25 bg-blue-700/8 px-3 py-1 font-code text-[10px] font-semibold tracking-normal text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300 sm:text-[11px] sm:tracking-wider">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.75)]" />
              <span>{copy.hero.eyebrow}</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--sol-text)] sm:text-5xl lg:text-[52px] lg:leading-[1.06]">
              <span className="block">{copy.hero.titleLine1}</span>
              <span className="font-editorial block font-semibold italic text-blue-700 dark:text-blue-400">
                {copy.hero.titleLine2}
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--sol-text-secondary)] sm:text-base">
              {copy.hero.subtitle}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-testid="hero-system-design-cta"
                onClick={() => onNavigateTab('system-design')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-700/20 transition-all hover:-translate-y-0.5 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus:ring-offset-slate-950 sm:text-sm"
              >
                <NetworkScaleIcon className="h-4 w-4" />
                <span>{copy.hero.ctaPrimary}</span>
                <ArrowRightIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                data-testid="hero-algorithms-cta"
                onClick={() => onNavigateTab('algorithms')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/35 bg-emerald-600/10 px-3.5 py-2.5 text-xs font-bold text-emerald-800 transition-all hover:-translate-y-0.5 hover:bg-emerald-600 hover:text-white dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white sm:text-sm"
              >
                <CpuIcon className="h-4 w-4" />
                <span>{copy.hero.ctaSecondary}</span>
              </button>

              <button
                type="button"
                data-testid="hero-sandbox-cta"
                onClick={() => onNavigateTab('sandbox')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3.5 py-2.5 text-xs font-bold text-[var(--sol-text)] transition-all hover:border-blue-700/60 hover:text-blue-700 dark:hover:text-blue-300 sm:text-sm"
              >
                <TerminalIcon className="h-4 w-4" />
                <span>{copy.hero.ctaCodeLab}</span>
              </button>

              <button
                type="button"
                onClick={onScrollToCatalog}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border)] bg-transparent px-3 py-2.5 text-xs font-bold text-[var(--sol-text-secondary)] transition-colors hover:border-blue-700/45 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <span>{copy.hero.ctaCatalog}</span>
              </button>
            </div>

            {/* 4 Scholastic KPI Tiles */}
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="sol-card rounded-xl px-3.5 py-3">
                <div className="font-code text-xl font-bold text-[var(--sol-text)]">06</div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--sol-text-muted)]">
                  {copy.hero.statTracks}
                </div>
              </div>
              <div className="sol-card rounded-xl px-3.5 py-3">
                <div className="font-code text-xl font-bold text-blue-700 dark:text-blue-400">
                  {totalLessons}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--sol-text-muted)]">
                  {copy.hero.statLessons}
                </div>
              </div>
              <div className="sol-card rounded-xl px-3.5 py-3">
                <div className="font-code text-xl font-bold text-amber-600 dark:text-amber-400">SM-2</div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--sol-text-muted)]">
                  {copy.hero.statEngine}
                </div>
              </div>
              <div className="sol-card rounded-xl px-3.5 py-3">
                <div className="font-code text-xl font-bold text-emerald-600 dark:text-emerald-400">A4 QR</div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--sol-text-muted)]">
                  {copy.hero.statCert}
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Learner Telemetry Command Card */}
          <div className="lg:col-span-5">
            <div className="sol-card relative overflow-hidden rounded-2xl p-5">
              {/* Top Academic Accent Bar */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-700 via-emerald-600 to-amber-500"
              />

              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-code text-[11px] font-semibold tracking-wider text-[var(--sol-text-muted)]">
                  {copy.hero.telemetryTitle}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-0.5 font-code text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheckIcon className="h-3 w-3 shrink-0" />
                  AST SAFE
                </span>
              </div>

              {/* Learner Rank & XP Bar */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-2 py-0.5 font-code text-xs font-bold text-white dark:bg-blue-600">
                      <BoltIcon className="h-3 w-3 text-amber-300" />
                      LV.{levelProgress.level}
                    </span>
                    <span className="text-sm font-bold text-[var(--sol-text)]">
                      {levelProgress.rankTitle[locale]}
                    </span>
                  </div>
                  <p className="mt-1 font-code text-xs text-[var(--sol-text-muted)]">
                    {learner.studentName} · {levelProgress.currentXp} XP
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 font-code text-lg font-bold text-amber-600 dark:text-amber-400">
                    <FlameIcon className="h-4 w-4" />
                    <span>{learner.streakDays}d</span>
                  </div>
                  <div className="text-[10px] font-medium text-[var(--sol-text-muted)]">
                    {copy.hero.telemetryStreak}
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-code text-[11px] text-[var(--sol-text-muted)]">
                  <span>
                    {levelProgress.xpIntoLevel} / {levelProgress.xpForNextLevel} XP
                  </span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {levelProgress.progressPct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--sol-elevated)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-emerald-600 transition-all duration-500"
                    style={{ width: `${Math.max(6, levelProgress.progressPct)}%` }}
                  />
                </div>
              </div>

              {/* Weekly Activity Sparkline + Live Stats */}
              <div className="mt-4 grid grid-cols-12 gap-3">
                <div className="sol-elevated col-span-7 rounded-xl p-3">
                  <div className="mb-2 flex items-center justify-between font-code text-[10px] font-semibold uppercase tracking-wider text-[var(--sol-text-muted)]">
                    <span>{locale === 'vi' ? 'Nhịp 7 ngày' : '7-Day Velocity'}</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {learner.completedLessons.length}/{totalLessons}
                    </span>
                  </div>
                  <div className="flex h-12 items-end justify-between gap-1.5">
                    {learner.weeklyActivity.map((count, idx) => {
                      const pct = Math.max(18, Math.round((count / maxBar) * 100));
                      const isToday = idx === learner.weeklyActivity.length - 1;
                      return (
                        <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                          <div className="flex h-9 w-full items-end">
                            <div
                              className={`w-full rounded-sm transition-all ${
                                isToday
                                  ? 'bg-emerald-600'
                                  : 'bg-blue-700/70 dark:bg-blue-400/75'
                              }`}
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                          <span className="font-code text-[9px] text-[var(--sol-text-muted)]">
                            {weekLabels[idx]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-5 flex flex-col justify-between gap-2">
                  <div className="sol-elevated flex items-center justify-between rounded-xl px-3 py-2">
                    <div>
                      <div className="font-code text-base font-bold text-amber-600 dark:text-amber-400">
                        {dueCardsCount}
                      </div>
                      <div className="text-[10px] leading-tight text-[var(--sol-text-muted)]">
                        {copy.hero.telemetryDueCards}
                      </div>
                    </div>
                    <LayersIcon className="h-4 w-4 shrink-0 text-amber-500/80" />
                  </div>

                  <div className="sol-elevated flex items-center justify-between rounded-xl px-3 py-2">
                    <div>
                      <div className="font-code text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {learner.solvedChallenges.length}/6
                      </div>
                      <div className="text-[10px] leading-tight text-[var(--sol-text-muted)]">
                        {copy.hero.telemetrySolvedLabs}
                      </div>
                    </div>
                    <TerminalIcon className="h-4 w-4 shrink-0 text-emerald-600/80" />
                  </div>
                </div>
              </div>

              {/* Active Track Preview + AST Engine Strip */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-900 p-3 text-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-2 font-code text-[10px]">
                  <span className="text-slate-400">{copy.hero.telemetryActiveTrack}</span>
                  <span className="font-semibold text-emerald-400">
                    {activeCourse.code} · {activeCourseStats.percent}%
                  </span>
                </div>
                <div className="font-editorial mt-1 truncate text-sm font-semibold text-white">
                  {activeCourse.title[locale]}
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-800/90 px-2.5 py-1.5 font-code text-[10px] text-emerald-300">
                  <span className="truncate">&gt; {copy.hero.telemetryAssertions}</span>
                  <span className="shrink-0 text-blue-300">AST · &lt;1ms</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigateTab('sandbox')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700/10 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-700 hover:text-white dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white"
                >
                  <TerminalIcon className="h-3.5 w-3.5" />
                  <span>{copy.hero.telemetryRunQuick}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('certificate')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-3 py-2 text-xs font-bold text-[var(--sol-text)] transition-colors hover:border-emerald-600/60 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  <AwardIcon className="h-3.5 w-3.5" />
                  <span>{copy.hero.telemetryCertQuick}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
