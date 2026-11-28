import { Suspense, lazy } from 'react';
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

const SystemTopology3DStage = lazy(() => import('./SystemTopology3DStage'));

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
          <div className="lg:col-span-6">
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

          {/* Right 3D Distributed Architecture Sandbox + Compact Learner Strip */}
          <div className="lg:col-span-6 space-y-3">
            <Suspense
              fallback={
                <div className="sol-card flex h-[480px] items-center justify-center rounded-2xl font-code text-xs text-[var(--sol-text-muted)]">
                  {locale === 'vi'
                    ? 'Đang khởi tạo Sa Bàn Kiến Trúc Phân Tán 3D...'
                    : 'Initializing 3D Distributed Topology Sandbox...'}
                </div>
              }
            >
              <SystemTopology3DStage locale={locale} />
            </Suspense>

            {/* Compact Live Learner Telemetry Strip */}
            <div className="sol-card flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-2 py-0.5 font-code text-xs font-bold text-white dark:bg-blue-600">
                  <BoltIcon className="h-3 w-3 text-amber-300" />
                  LV.{levelProgress.level}
                </span>
                <div className="text-xs">
                  <span className="font-bold text-[var(--sol-text)]">
                    {levelProgress.rankTitle[locale]}
                  </span>
                  <span className="ml-2 font-code text-[var(--sol-text-muted)]">
                    {levelProgress.currentXp} XP · {activeCourse.code} ({activeCourseStats.percent}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 font-code text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <FlameIcon className="h-3.5 w-3.5" />
                  {learner.streakDays}d
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--sol-text-secondary)]">
                  <LayersIcon className="h-3.5 w-3.5 text-amber-500" />
                  {dueCardsCount} SM-2
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheckIcon className="h-3.5 w-3.5" />
                  {learner.solvedChallenges.length}/6 AST
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('certificate')}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--sol-border-strong)] px-2 py-1 text-[11px] font-bold text-[var(--sol-text)] hover:border-emerald-600"
                >
                  <AwardIcon className="h-3 w-3" />
                  <span>A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
