import { useEffect, useMemo, useState } from 'react';
import type {
  CodeGradeReport,
  CodingChallenge,
  Course,
  Locale,
  QuizGradeReport,
  QuizQuestion,
} from '../types/lms';
import { tCopy } from '../data/i18n';
import { gradeArchitectureQuiz, gradeCodeChallenge } from '../engines/grader';
import {
  AwardIcon,
  BoltIcon,
  BulbIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  RotateIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TerminalIcon,
  XCircleIcon,
} from './Icons';

interface SandboxSectionProps {
  courses: Course[];
  challenges: CodingChallenge[];
  questions: QuizQuestion[];
  locale: Locale;
  activeChallengeId: string;
  solvedChallenges: string[];
  onSelectChallenge: (challengeId: string) => void;
  onChallengePassed: (challenge: CodingChallenge, report: CodeGradeReport) => void;
  onQuizCompleted: (domainKey: string, report: QuizGradeReport) => void;
  onJumpToCertificate: (courseId: string) => void;
}

function formatClock(totalSec: number): string {
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function SandboxSection({
  courses,
  challenges,
  questions,
  locale,
  activeChallengeId,
  solvedChallenges,
  onSelectChallenge,
  onChallengePassed,
  onQuizCompleted,
  onJumpToCertificate,
}: SandboxSectionProps) {
  const copy = tCopy(locale);
  const [mode, setMode] = useState<'code' | 'quiz'>('code');

  // Code Lab state
  const activeChallenge = useMemo(
    () => challenges.find((c) => c.id === activeChallengeId) ?? challenges[0]!,
    [challenges, activeChallengeId],
  );
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const ch of challenges) {
      initial[ch.id] = ch.starterCode;
    }
    return initial;
  });
  const [gradeReport, setGradeReport] = useState<CodeGradeReport | null>(null);
  const [revealedHints, setRevealedHints] = useState<number>(0);

  // Quiz state
  const [quizFilter, setQuizFilter] = useState<string>('all');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizReport, setQuizReport] = useState<QuizGradeReport | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const solvedSet = useMemo(() => new Set(solvedChallenges), [solvedChallenges]);
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const currentCode = codeDrafts[activeChallenge.id] ?? activeChallenge.starterCode;
  const lineCount = Math.max(12, currentCode.split('\n').length);

  // Reset hint & report when switching challenges
  useEffect(() => {
    setGradeReport(null);
    setRevealedHints(0);
  }, [activeChallenge.id]);

  // Quiz sprint timer
  useEffect(() => {
    if (mode !== 'quiz' || quizReport !== null) return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, quizReport]);

  const filteredQuestions = useMemo(
    () => (quizFilter === 'all' ? questions : questions.filter((q) => q.courseId === quizFilter)),
    [questions, quizFilter],
  );

  const handleRunTests = () => {
    const report = gradeCodeChallenge(activeChallenge, currentCode);
    setGradeReport(report);
    if (report.passedAll) {
      onChallengePassed(activeChallenge, report);
    }
  };

  const handleResetCode = () => {
    setCodeDrafts((prev) => ({ ...prev, [activeChallenge.id]: activeChallenge.starterCode }));
    setGradeReport(null);
  };

  const handleLoadSolution = () => {
    setCodeDrafts((prev) => ({ ...prev, [activeChallenge.id]: activeChallenge.referenceSolution }));
    setGradeReport(null);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunTests();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = `${currentCode.slice(0, start)}  ${currentCode.slice(end)}`;
      setCodeDrafts((prev) => ({ ...prev, [activeChallenge.id]: next }));
      requestAnimationFrame(() => {
        target.selectionStart = start + 2;
        target.selectionEnd = start + 2;
      });
    }
  };

  const handleGradeQuiz = () => {
    const report = gradeArchitectureQuiz(filteredQuestions, selectedAnswers);
    setQuizReport(report);
    onQuizCompleted(quizFilter, report);
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizReport(null);
    setElapsedSec(0);
  };

  const activeCourse = courseMap.get(activeChallenge.courseId);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header + Mode Switcher */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="font-code text-xs font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
            {copy.sandbox.sectionLabel}
          </span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--sol-text)] sm:text-3xl">
            {copy.sandbox.sectionTitle}
          </h2>
        </div>

        <div className="inline-flex w-full rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] p-1 sm:w-auto">
          <button
            type="button"
            data-testid="sandbox-mode-code"
            onClick={() => setMode('code')}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold transition-all sm:flex-none ${
              mode === 'code'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
            }`}
          >
            {copy.sandbox.modeCode}
          </button>
          <button
            type="button"
            data-testid="sandbox-mode-quiz"
            onClick={() => setMode('quiz')}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-bold transition-all sm:flex-none ${
              mode === 'quiz'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
            }`}
          >
            {copy.sandbox.modeQuiz}
          </button>
        </div>
      </div>

      {mode === 'code' ? (
        <div className="mt-6 space-y-5">
          {/* Challenge Selector Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((ch) => {
              const course = courseMap.get(ch.courseId);
              const isSelected = ch.id === activeChallenge.id;
              const isSolved = solvedSet.has(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  data-challenge-id={ch.id}
                  onClick={() => onSelectChallenge(ch.id)}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/10 ring-1 ring-indigo-500/40'
                      : 'border-[var(--sol-border)] bg-[var(--sol-surface)] hover:border-indigo-500/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="rounded px-1.5 py-0.5 font-code text-[10px] font-bold text-white"
                        style={{ backgroundColor: course?.accentHex ?? '#4f46e5' }}
                      >
                        {course?.code ?? 'LAB'}
                      </span>
                      <span className="font-code text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        +{ch.xpReward} XP
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-[var(--sol-text)]">
                      {ch.title[locale]}
                    </div>
                  </div>
                  {isSolved ? (
                    <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <TerminalIcon className="h-4 w-4 shrink-0 text-[var(--sol-text-muted)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Prompt & Controls Card */}
          <div className="sol-card rounded-2xl p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-md px-2 py-0.5 font-code text-[11px] font-bold text-white"
                    style={{ backgroundColor: activeCourse?.accentHex ?? '#4f46e5' }}
                  >
                    {activeCourse?.code ?? 'LAB'}
                  </span>
                  <h3 className="text-lg font-extrabold text-[var(--sol-text)]">
                    {activeChallenge.title[locale]}
                  </h3>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-code text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    AST Sandbox · 0 eval
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sol-text-secondary)]">
                  {activeChallenge.prompt[locale]}
                </p>
                <div className="mt-2.5 inline-block max-w-full overflow-x-auto rounded-lg border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-3 py-1 font-code text-xs text-indigo-700 dark:text-indigo-300">
                  {activeChallenge.signature}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRevealedHints((h) => Math.min(2, h + 1))}
                  disabled={revealedHints >= 2}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-3 py-2 text-xs font-bold text-[var(--sol-text)] transition-colors hover:border-amber-500/60 disabled:opacity-45"
                >
                  <BulbIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    {copy.sandbox.revealHint} ({revealedHints}/2)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleResetCode}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-2 text-xs font-bold text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]"
                >
                  <RotateIcon className="h-3.5 w-3.5" />
                  <span>{copy.sandbox.resetCode}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSolution}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-2 text-xs font-bold text-[var(--sol-text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-300"
                >
                  <span>{copy.sandbox.loadSolution}</span>
                </button>
                <button
                  type="button"
                  data-testid="run-tests-btn"
                  onClick={handleRunTests}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-500"
                >
                  <PlayIcon className="h-3.5 w-3.5" />
                  <span>{copy.sandbox.runTests}</span>
                </button>
              </div>
            </div>

            {revealedHints > 0 && (
              <div className="mt-4 space-y-2 border-t border-[var(--sol-border)] pt-3">
                {activeChallenge.hints.slice(0, revealedHints).map((hint, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
                  >
                    <BulbIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>
                      <strong className="font-code">HINT {idx + 1}:</strong> {hint[locale]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Split Editor + Automated Assertions */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Code Editor */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#070b13] shadow-xl lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-code text-[11px] font-semibold text-slate-400">
                    {activeChallenge.functionName}.js
                  </span>
                </div>
                <span className="hidden font-code text-[10px] text-slate-400 sm:inline">
                  {copy.sandbox.editorHeader}
                </span>
              </div>

              <div className="flex min-h-[340px] max-h-[460px] overflow-auto">
                <div
                  aria-hidden="true"
                  className="select-none border-r border-slate-800/80 bg-slate-950/60 px-3 py-4 text-right font-code text-xs leading-6 text-slate-600"
                >
                  {Array.from({ length: lineCount }, (_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>
                <textarea
                  aria-label="Sandbox code editor"
                  data-testid="sandbox-editor"
                  spellCheck={false}
                  value={currentCode}
                  onChange={(e) =>
                    setCodeDrafts((prev) => ({
                      ...prev,
                      [activeChallenge.id]: e.target.value,
                    }))
                  }
                  onKeyDown={handleEditorKeyDown}
                  rows={Math.max(14, lineCount)}
                  className="w-full resize-none bg-transparent p-4 font-code text-xs leading-6 text-slate-100 focus:outline-none sm:text-[13px]"
                />
              </div>
            </div>

            {/* Automated Assertions Panel */}
            <div className="sol-card flex flex-col overflow-hidden rounded-2xl lg:col-span-5">
              <div className="flex items-center justify-between border-b border-[var(--sol-border)] px-4 py-3">
                <span className="font-code text-xs font-bold tracking-wider text-[var(--sol-text)]">
                  {copy.sandbox.resultsHeader}
                </span>
                {gradeReport && (
                  <span className="font-code text-xs font-bold text-[var(--sol-text-muted)]">
                    {gradeReport.passedCount}/{gradeReport.totalCount} · {gradeReport.totalDurationMs}ms
                  </span>
                )}
              </div>

              <div className="flex-1 p-4">
                {!gradeReport ? (
                  <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--sol-border-strong)] p-6 text-center">
                    <ShieldCheckIcon className="h-9 w-9 text-indigo-500/70" />
                    <p className="mt-3 max-w-xs text-xs leading-relaxed text-[var(--sol-text-secondary)]">
                      {copy.sandbox.runPrompt}
                    </p>
                    <button
                      type="button"
                      onClick={handleRunTests}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      <PlayIcon className="h-3.5 w-3.5" />
                      <span>{copy.sandbox.runTests}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Summary Banner */}
                    <div
                      data-testid="grade-banner"
                      className={`rounded-xl border p-3.5 ${
                        gradeReport.securityBlocked
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : gradeReport.passedAll
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-code text-xs font-bold">
                          {gradeReport.securityBlocked ? (
                            <ShieldAlertIcon className="h-4 w-4 shrink-0" />
                          ) : gradeReport.passedAll ? (
                            <CheckCircleIcon className="h-4 w-4 shrink-0" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 shrink-0" />
                          )}
                          <span>
                            {gradeReport.securityBlocked
                              ? copy.sandbox.blockedBanner
                              : gradeReport.passedAll
                                ? copy.sandbox.passedBanner
                                : copy.sandbox.failedBanner}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 font-code text-[11px] font-bold dark:bg-white/10">
                          <BoltIcon className="h-3 w-3" />+{gradeReport.xpAwarded} XP
                        </span>
                      </div>

                      {gradeReport.compileError && (
                        <p className="mt-2 font-code text-[11px] opacity-90">
                          {gradeReport.compileError}
                        </p>
                      )}

                      {gradeReport.passedAll && (
                        <button
                          type="button"
                          onClick={() => onJumpToCertificate(activeChallenge.courseId)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                        >
                          <AwardIcon className="h-3.5 w-3.5" />
                          <span>{copy.sandbox.jumpToCert}</span>
                        </button>
                      )}
                    </div>

                    {/* Individual Assertions */}
                    <div className="space-y-2.5">
                      {gradeReport.results.map((res, idx) => (
                        <div
                          key={res.id}
                          className={`rounded-xl border p-3 ${
                            res.passed
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-rose-500/30 bg-rose-500/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {res.passed ? (
                                <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <XCircleIcon className="h-4 w-4 shrink-0 text-rose-500" />
                              )}
                              <span className="text-xs font-bold text-[var(--sol-text)]">
                                #{idx + 1} {res.name[locale]}
                              </span>
                            </div>
                            <span className="font-code text-[10px] text-[var(--sol-text-muted)]">
                              {res.durationMs}ms
                            </span>
                          </div>

                          <div className="mt-2 space-y-1 font-code text-[11px]">
                            <div className="truncate text-[var(--sol-text-muted)]">
                              <span className="font-semibold text-[var(--sol-text-secondary)]">
                                {copy.sandbox.colExpected}:
                              </span>{' '}
                              {res.expectedPreview}
                            </div>
                            <div
                              className={`truncate ${
                                res.passed
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-rose-600 dark:text-rose-300'
                              }`}
                            >
                              <span className="font-semibold">{copy.sandbox.colActual}:</span>{' '}
                              {res.actualPreview}
                            </div>
                            {res.error && (
                              <div className="text-[11px] text-rose-600 dark:text-rose-300">
                                {res.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Timed Architecture Quiz Mode */
        <div className="mt-6 space-y-5">
          {/* Quiz Control Strip */}
          <div className="sol-card flex flex-col justify-between gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setQuizFilter('all');
                  setQuizReport(null);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  quizFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
                }`}
              >
                {copy.sandbox.quizFilterAll} ({questions.length})
              </button>
              {courses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setQuizFilter(c.id);
                    setQuizReport(null);
                  }}
                  className={`rounded-full px-3 py-1 font-code text-[11px] font-semibold transition-colors ${
                    quizFilter === c.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-3 py-1.5 font-code text-xs font-bold text-[var(--sol-text)]">
                <ClockIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>{copy.sandbox.quizTimerLabel}:</span>
                <span className="text-indigo-600 dark:text-indigo-400">{formatClock(elapsedSec)}</span>
              </div>
              <button
                type="button"
                onClick={handleResetQuiz}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-1.5 text-xs font-bold text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]"
              >
                <RotateIcon className="h-3.5 w-3.5" />
                <span>{copy.sandbox.quizReset}</span>
              </button>
            </div>
          </div>

          {/* Quiz Result Summary Banner */}
          {quizReport && (
            <div
              data-testid="quiz-report-banner"
              className={`rounded-2xl border p-5 ${
                quizReport.passed
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-amber-500/40 bg-amber-500/10'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-code text-xs font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                    {copy.sandbox.quizScoreTitle}
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="font-code text-3xl font-extrabold text-[var(--sol-text)]">
                      {quizReport.scorePct}%
                    </span>
                    <span className="text-sm font-semibold text-[var(--sol-text-secondary)]">
                      ({quizReport.correctCount}/{quizReport.totalCount}) · {formatClock(elapsedSec)}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 font-code text-xs font-bold text-white">
                  <BoltIcon className="h-3.5 w-3.5 text-amber-300" />+{quizReport.xpAwarded} XP
                </span>
              </div>
            </div>
          )}

          {/* Question Cards */}
          <div className="space-y-4">
            {filteredQuestions.map((q, qIdx) => {
              const picked = selectedAnswers[q.id];
              const breakdown = quizReport?.breakdown.find((b) => b.questionId === q.id);

              return (
                <div key={q.id} className="sol-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-600/15 px-2 py-0.5 font-code text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      Q{qIdx + 1}
                    </span>
                    <span className="rounded-md border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-2 py-0.5 font-code text-[10px] font-semibold text-[var(--sol-text-muted)]">
                      {q.topic}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold leading-relaxed text-[var(--sol-text)] sm:text-base">
                    {q.question[locale]}
                  </h3>

                  <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isPicked = picked === optIdx;
                      const isCorrectOpt = optIdx === q.correctIndex;
                      let stateStyle =
                        'border-[var(--sol-border)] bg-[var(--sol-elevated)]/60 hover:border-indigo-500/50';
                      if (quizReport) {
                        if (isCorrectOpt) {
                          stateStyle =
                            'border-emerald-500 bg-emerald-500/12 text-emerald-900 dark:text-emerald-200';
                        } else if (isPicked && !isCorrectOpt) {
                          stateStyle =
                            'border-rose-500 bg-rose-500/12 text-rose-900 dark:text-rose-200';
                        }
                      } else if (isPicked) {
                        stateStyle =
                          'border-indigo-500 bg-indigo-600/12 ring-1 ring-indigo-500/40';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={quizReport !== null}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                          }
                          className={`flex items-start gap-2.5 rounded-xl border p-3 text-left text-xs leading-relaxed transition-all ${stateStyle}`}
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] font-code text-[10px] font-bold text-[var(--sol-text)]">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="text-[var(--sol-text)]">{opt[locale]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {breakdown && (
                    <div className="mt-3.5 rounded-xl border border-indigo-500/25 bg-indigo-500/8 p-3 text-xs leading-relaxed text-[var(--sol-text-secondary)]">
                      <span className="font-code font-bold text-indigo-600 dark:text-indigo-300">
                        {copy.sandbox.quizExplanation}:{' '}
                      </span>
                      {q.explanation[locale]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              data-testid="submit-quiz-btn"
              onClick={handleGradeQuiz}
              disabled={quizReport !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />
              <span>{copy.sandbox.quizSubmit}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
