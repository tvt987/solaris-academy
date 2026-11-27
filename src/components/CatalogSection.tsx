import { useMemo, useState } from 'react';
import type { Course, CourseCategory, Currency, LearnerState, Locale } from '../types/lms';
import { tCopy } from '../data/i18n';
import { calculateCourseCompletion } from '../engines/progression';
import { formatMoney } from '../engines/pricing';
import { buildStudyScheduleIcs, buildSyllabusMarkdown } from '../engines/vietqr';
import {
  AwardIcon,
  CalendarIcon,
  CartIcon,
  CategoryGlyph,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  SearchIcon,
  StarIcon,
  TerminalIcon,
} from './Icons';

interface CatalogSectionProps {
  courses: Course[];
  locale: Locale;
  currency: Currency;
  learner: LearnerState;
  expandedCourseId: string | null;
  onSelectExpandedCourse: (courseId: string | null) => void;
  onToggleLesson: (lessonId: string) => void;
  onLaunchLab: (course: Course) => void;
  onPracticeCards: (courseId: string) => void;
  onOpenCertificate: (courseId: string) => void;
  onToggleCart: (courseId: string) => void;
  onNotify: (message: string) => void;
}

function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DIFFICULTY_STYLES: Record<Course['difficulty'], string> = {
  intermediate: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  advanced: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  architect: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

const DIFFICULTY_LABEL: Record<Course['difficulty'], { en: string; vi: string }> = {
  intermediate: { en: 'INTERMEDIATE', vi: 'TRUNG CẤP' },
  advanced: { en: 'ADVANCED', vi: 'NÂNG CAO' },
  architect: { en: 'ARCHITECT', vi: 'KIẾN TRÚC SƯ' },
};

const LESSON_TYPE_STYLE = {
  concept: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  lab: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  architecture: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  quiz: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
} as const;

export function CatalogSection({
  courses,
  locale,
  currency,
  learner,
  expandedCourseId,
  onSelectExpandedCourse,
  onToggleLesson,
  onLaunchLab,
  onPracticeCards,
  onOpenCertificate,
  onToggleCart,
  onNotify,
}: CatalogSectionProps) {
  const copy = tCopy(locale);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | CourseCategory>('all');

  const filters: Array<{ id: 'all' | CourseCategory; label: string }> = [
    { id: 'all', label: copy.catalog.filterAll },
    { id: 'backend', label: copy.catalog.filterBackend },
    { id: 'frontend', label: copy.catalog.filterFrontend },
    { id: 'ai', label: copy.catalog.filterAi },
    { id: 'data', label: copy.catalog.filterData },
  ];

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (category !== 'all' && course.category !== category) return false;
      if (!q) return true;
      const haystack = [
        course.code,
        course.title.en,
        course.title.vi,
        course.subtitle.en,
        course.subtitle.vi,
        ...course.skills,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, category, search]);

  const expandedCourse = useMemo(
    () => courses.find((c) => c.id === expandedCourseId) ?? null,
    [courses, expandedCourseId],
  );

  const completedSet = useMemo(() => new Set(learner.completedLessons), [learner.completedLessons]);
  const enrolledSet = useMemo(() => new Set(learner.enrolledCourseIds), [learner.enrolledCourseIds]);
  const cartSet = useMemo(() => new Set(learner.cartCourseIds), [learner.cartCourseIds]);

  const handleExportMd = (course: Course) => {
    const md = buildSyllabusMarkdown(course, locale);
    triggerFileDownload(`solaris-${course.slug}-syllabus.md`, md, 'text/markdown;charset=utf-8');
    onNotify(
      locale === 'vi'
        ? `Đã xuất giáo trình ${course.code} (.md UTF-8 BOM)`
        : `Exported ${course.code} syllabus (.md UTF-8 BOM)`,
    );
  };

  const handleExportIcs = (course: Course) => {
    const ics = buildStudyScheduleIcs(course, locale);
    triggerFileDownload(`solaris-${course.slug}-study-plan.ics`, ics, 'text/calendar;charset=utf-8');
    onNotify(
      locale === 'vi'
        ? `Đã tải lịch học ${course.code} (.ics)`
        : `Downloaded ${course.code} study schedule (.ics)`,
    );
  };

  return (
    <section id="catalog-section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="font-code text-xs font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
            {copy.catalog.sectionLabel}
          </span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--sol-text)] sm:text-3xl">
            {copy.catalog.sectionTitle}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--sol-text-secondary)]">
            {copy.catalog.sectionDesc}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-[23rem]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sol-text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.catalog.searchPlaceholder}
            aria-label={copy.catalog.searchPlaceholder}
            className="w-full rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--sol-text)] placeholder:text-[var(--sol-text-muted)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = category === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setCategory(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'border border-[var(--sol-border)] bg-[var(--sol-surface)] text-[var(--sol-text-secondary)] hover:border-indigo-500/40 hover:text-[var(--sol-text)]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 6 Flagship Courses Grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.map((course) => {
          const stats = calculateCourseCompletion(
            course,
            learner.completedLessons,
            learner.solvedChallenges,
          );
          const isExpanded = expandedCourseId === course.id;
          const isEnrolled = enrolledSet.has(course.id);
          const isInCart = cartSet.has(course.id);

          return (
            <article
              key={course.id}
              data-course-id={course.id}
              className={`sol-card group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/10 dark:hover:shadow-black/40 ${
                isExpanded ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              {/* Top Accent Strip */}
              <div
                aria-hidden="true"
                className="h-1.5 w-full"
                style={{
                  background: `linear-gradient(90deg, ${course.accentHex}, #10b981)`,
                }}
              />

              <div className="flex flex-1 flex-col p-5">
                {/* Code, Category Icon & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                      style={{ backgroundColor: course.accentHex }}
                    >
                      <CategoryGlyph category={course.category} className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-code text-xs font-bold tracking-wider text-[var(--sol-text)]">
                          {course.code}
                        </span>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 font-code text-[9px] font-bold tracking-wider ${DIFFICULTY_STYLES[course.difficulty]}`}
                        >
                          {DIFFICULTY_LABEL[course.difficulty][locale]}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--sol-text-muted)]">
                        <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
                          <StarIcon className="h-3 w-3" />
                          {course.rating.toFixed(2)}
                        </span>
                        <span>·</span>
                        <span>
                          {course.enrolledCount.toLocaleString()} {copy.catalog.learnersLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {isEnrolled && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 font-code text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckIcon className="h-3 w-3" />
                        {copy.catalog.enrolledBadge}
                      </span>
                    )}
                    {stats.certificateEligible && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 font-code text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        <AwardIcon className="h-3 w-3" />
                        {copy.catalog.certReady}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h3 className="mt-4 text-lg font-extrabold tracking-tight text-[var(--sol-text)]">
                  {course.title[locale]}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--sol-text-secondary)]">
                  {course.subtitle[locale]}
                </p>

                {/* Skill Pills */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {course.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-2 py-0.5 font-code text-[10px] font-medium text-[var(--sol-text-secondary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Syllabus Progress Bar */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between font-code text-[11px]">
                    <span className="text-[var(--sol-text-muted)]">
                      {stats.completedCount}/{stats.totalCount} {copy.catalog.lessonsLabel} · {course.durationHours}{' '}
                      {copy.catalog.hoursLabel}
                    </span>
                    <span className="font-bold text-[var(--sol-text)]">{stats.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--sol-elevated)]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${stats.percent}%`,
                        backgroundColor: course.accentHex,
                      }}
                    />
                  </div>
                </div>

                {/* Pricing Row */}
                <div className="mt-4 flex items-baseline justify-between border-t border-[var(--sol-border)] pt-3.5">
                  <div>
                    <div className="font-code text-base font-extrabold text-[var(--sol-text)]">
                      {formatMoney(course.priceVnd, currency)}
                    </div>
                    <div className="font-code text-[11px] text-[var(--sol-text-muted)] line-through">
                      {formatMoney(course.originalPriceVnd, currency)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleCart(course.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      isInCart
                        ? 'border border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        : 'border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] text-[var(--sol-text)] hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300'
                    }`}
                  >
                    {isInCart ? <CheckIcon className="h-3.5 w-3.5" /> : <CartIcon className="h-3.5 w-3.5" />}
                    <span>{isInCart ? copy.catalog.inCart : copy.catalog.addToCart}</span>
                  </button>
                </div>

                {/* Action Footer */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectExpandedCourse(isExpanded ? null : course.id)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      isExpanded
                        ? 'bg-indigo-600 text-white'
                        : 'border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] text-[var(--sol-text)] hover:border-indigo-500/60'
                    }`}
                  >
                    <span>{isExpanded ? copy.catalog.closeSyllabus : copy.catalog.openSyllabus}</span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onLaunchLab(course)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/12 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500 dark:hover:text-white"
                  >
                    <TerminalIcon className="h-3.5 w-3.5" />
                    <span>{copy.catalog.launchLab}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Empty Search Fallback */}
      {filteredCourses.length === 0 && (
        <div className="sol-card mt-6 rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-[var(--sol-text-secondary)]">
            {locale === 'vi'
              ? 'Không tìm thấy khóa học phù hợp từ khóa. Thử xóa bộ lọc.'
              : 'No courses matched your query. Try clearing the search filter.'}
          </p>
        </div>
      )}

      {/* Expanded Interactive Curriculum Drawer */}
      {expandedCourse && (
        <div
          id="curriculum-drawer"
          className="sol-card mt-7 overflow-hidden rounded-2xl shadow-2xl shadow-slate-950/10 dark:shadow-black/40"
        >
          <div
            className="flex flex-col justify-between gap-4 border-b border-[var(--sol-border)] p-5 sm:p-6 lg:flex-row lg:items-center"
            style={{
              background: `linear-gradient(120deg, ${expandedCourse.accentHex}18 0%, transparent 65%)`,
            }}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 font-code text-xs font-bold text-white"
                  style={{ backgroundColor: expandedCourse.accentHex }}
                >
                  {expandedCourse.code}
                </span>
                <span className="font-code text-xs text-[var(--sol-text-muted)]">
                  {expandedCourse.instructor} · {expandedCourse.instructorRole[locale]}
                </span>
              </div>
              <h3 className="mt-2 text-xl font-extrabold text-[var(--sol-text)] sm:text-2xl">
                {expandedCourse.title[locale]}
              </h3>
              <p className="mt-1 max-w-3xl text-sm text-[var(--sol-text-secondary)]">
                {expandedCourse.summary[locale]}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onLaunchLab(expandedCourse)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                <TerminalIcon className="h-3.5 w-3.5" />
                <span>{copy.catalog.launchLab}</span>
              </button>
              <button
                type="button"
                onClick={() => onPracticeCards(expandedCourse.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-2 text-xs font-bold text-[var(--sol-text)] hover:border-amber-500/60"
              >
                <LayersIcon className="h-3.5 w-3.5 text-amber-500" />
                <span>{copy.catalog.practiceCards}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCertificate(expandedCourse.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-2 text-xs font-bold text-[var(--sol-text)] hover:border-emerald-500/60"
              >
                <AwardIcon className="h-3.5 w-3.5 text-emerald-500" />
                <span>{copy.tabs.certificate}</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportMd(expandedCourse)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-3 py-2 font-code text-[11px] font-semibold text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]"
              >
                <FileTextIcon className="h-3.5 w-3.5" />
                <span>{copy.catalog.exportMd}</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportIcs(expandedCourse)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-3 py-2 font-code text-[11px] font-semibold text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{copy.catalog.exportIcs}</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* Outcomes */}
            <div className="mb-6">
              <h4 className="font-code text-xs font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {copy.catalog.outcomesHeading}
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {expandedCourse.outcomes.map((outcome, idx) => (
                  <div key={idx} className="sol-elevated flex items-start gap-2.5 rounded-xl p-3.5">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="text-xs leading-relaxed text-[var(--sol-text-secondary)]">
                      {outcome[locale]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modules & Clickable Lessons */}
            <h4 className="font-code text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {copy.catalog.syllabusHeading}
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {expandedCourse.modules.map((mod, mIdx) => (
                <div key={mod.id} className="sol-elevated flex flex-col rounded-xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 font-code text-xs font-bold text-white">
                      {mIdx + 1}
                    </span>
                    <h5 className="text-sm font-bold text-[var(--sol-text)]">{mod.title[locale]}</h5>
                  </div>

                  <div className="flex flex-col gap-2">
                    {mod.lessons.map((lesson) => {
                      const done = completedSet.has(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          data-lesson-id={lesson.id}
                          onClick={() => onToggleLesson(lesson.id)}
                          className={`group flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                            done
                              ? 'border-emerald-500/40 bg-emerald-500/8'
                              : 'border-[var(--sol-border)] bg-[var(--sol-surface)] hover:border-indigo-500/50'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              done
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-[var(--sol-border-strong)] bg-transparent text-transparent group-hover:border-indigo-500'
                            }`}
                          >
                            <CheckIcon className="h-3 w-3" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 font-code text-[9px] font-bold uppercase ${LESSON_TYPE_STYLE[lesson.type]}`}
                              >
                                {lesson.type}
                              </span>
                              <span className="inline-flex items-center gap-0.5 font-code text-[10px] text-[var(--sol-text-muted)]">
                                <ClockIcon className="h-3 w-3" />
                                {lesson.durationMin}m
                              </span>
                            </div>
                            <p
                              className={`mt-1 text-xs font-bold ${
                                done
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-[var(--sol-text)]'
                              }`}
                            >
                              {lesson.title[locale]}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-[var(--sol-text-muted)]">
                              {lesson.keyConcept[locale]}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
