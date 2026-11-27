import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '../types/lms';
import { tCopy } from '../data/i18n';
import {
  BINARY_SEARCH_PRESETS,
  DEFAULT_DIJKSTRA_GRAPH,
  QUICKSORT_PRESETS,
  generateBinarySearchTrace,
  generateDijkstraTrace,
  generateQuickSortTrace,
  type AlgorithmId,
  type BinarySearchStep,
  type DijkstraStep,
  type QuickSortStep,
} from '../engines/algoVisualizerEngine';
import {
  CpuIcon,
  PauseIcon,
  PlayIcon,
  RotateIcon,
  StepBackIcon,
  StepForwardIcon,
} from './Icons';

interface AlgorithmVisualizerLabProps {
  locale: Locale;
}

function edgeMatches(a: string, b: string, pair: [string, string] | null): boolean {
  if (!pair) return false;
  return (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a);
}

function edgeInPath(a: string, b: string, pathEdges: Array<[string, string]>): boolean {
  return pathEdges.some(
    ([u, v]) => (u === a && v === b) || (u === b && v === a),
  );
}

export function AlgorithmVisualizerLab({ locale }: AlgorithmVisualizerLabProps) {
  const copy = tCopy(locale);
  const [algorithm, setAlgorithm] = useState<AlgorithmId>('quicksort-lomuto');
  const [binaryPresetIdx, setBinaryPresetIdx] = useState<number>(0);
  const [binaryCustomTarget, setBinaryCustomTarget] = useState<number | null>(null);
  const [quickPresetIdx, setQuickPresetIdx] = useState<number>(0);
  const [dijkstraTarget, setDijkstraTarget] = useState<string>('G');

  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);

  const binaryPreset = BINARY_SEARCH_PRESETS[binaryPresetIdx] ?? BINARY_SEARCH_PRESETS[0]!;
  const effectiveBinaryTarget = binaryCustomTarget ?? binaryPreset.target;

  const quickPreset = QUICKSORT_PRESETS[quickPresetIdx] ?? QUICKSORT_PRESETS[0]!;

  const binaryTrace = useMemo(
    () => generateBinarySearchTrace(binaryPreset.array, effectiveBinaryTarget),
    [binaryPreset, effectiveBinaryTarget],
  );

  const quickTrace = useMemo(
    () => generateQuickSortTrace(quickPreset.array),
    [quickPreset],
  );

  const dijkstraTrace = useMemo(
    () => generateDijkstraTrace(DEFAULT_DIJKSTRA_GRAPH, 'A', dijkstraTarget),
    [dijkstraTarget],
  );

  const totalSteps =
    algorithm === 'binary-search'
      ? binaryTrace.steps.length
      : algorithm === 'quicksort-lomuto'
        ? quickTrace.steps.length
        : dijkstraTrace.steps.length;

  const clampedStepIdx = Math.min(stepIdx, Math.max(0, totalSteps - 1));

  // Reset step when switching algorithm or dataset
  const resetPlayback = () => {
    setIsPlaying(false);
    setStepIdx(0);
  };

  // Auto-play timer driven by playback speed (0.5x - 3x)
  useEffect(() => {
    if (!isPlaying) return;
    if (clampedStepIdx >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }
    const baseMs = algorithm === 'binary-search' ? 950 : 720;
    const intervalMs = Math.max(140, Math.round(baseMs / speed));
    const timer = window.setTimeout(() => {
      setStepIdx((prev) => Math.min(totalSteps - 1, prev + 1));
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, clampedStepIdx, totalSteps, speed, algorithm]);

  const currentBinaryStep: BinarySearchStep =
    binaryTrace.steps[clampedStepIdx] ?? binaryTrace.steps[0]!;
  const currentQuickStep: QuickSortStep =
    quickTrace.steps[clampedStepIdx] ?? quickTrace.steps[0]!;
  const currentDijkstraStep: DijkstraStep =
    dijkstraTrace.steps[clampedStepIdx] ?? dijkstraTrace.steps[0]!;

  const activeComparisons =
    algorithm === 'binary-search'
      ? currentBinaryStep.comparisons
      : algorithm === 'quicksort-lomuto'
        ? currentQuickStep.comparisons
        : currentDijkstraStep.comparisons;

  const activeSecondaryCount =
    algorithm === 'binary-search'
      ? currentBinaryStep.swaps
      : algorithm === 'quicksort-lomuto'
        ? currentQuickStep.swaps
        : currentDijkstraStep.relaxations;

  const activeSecondaryLabel =
    algorithm === 'dijkstra' ? copy.algorithms.relaxationsLabel : copy.algorithms.swapsLabel;

  const activeComplexity =
    algorithm === 'binary-search'
      ? binaryTrace.complexity
      : algorithm === 'quicksort-lomuto'
        ? quickTrace.complexity
        : dijkstraTrace.complexity;

  const activePseudocode =
    algorithm === 'binary-search'
      ? binaryTrace.pseudocode
      : algorithm === 'quicksort-lomuto'
        ? quickTrace.pseudocode
        : dijkstraTrace.pseudocode;

  const activePseudocodeLine =
    algorithm === 'binary-search'
      ? currentBinaryStep.pseudocodeLine
      : algorithm === 'quicksort-lomuto'
        ? currentQuickStep.pseudocodeLine
        : currentDijkstraStep.pseudocodeLine;

  const activeMessage =
    algorithm === 'binary-search'
      ? currentBinaryStep.message[locale]
      : algorithm === 'quicksort-lomuto'
        ? currentQuickStep.message[locale]
        : currentDijkstraStep.message[locale];

  const handleTogglePlay = () => {
    if (clampedStepIdx >= totalSteps - 1) {
      setStepIdx(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  // Precompute QuickSort SVG geometry
  const qsMaxVal = Math.max(...currentQuickStep.array, 1);
  const qsCount = Math.max(currentQuickStep.array.length, 1);
  const qsSvgWidth = 760;
  const qsPadX = 34;
  const qsSlotWidth = (qsSvgWidth - qsPadX * 2) / qsCount;
  const qsBarWidth = Math.min(54, qsSlotWidth * 0.64);
  const qsBaseY = 236;
  const qsMaxBarH = 148;
  const qsSortedSet = new Set(currentQuickStep.sortedIndices);

  const nodeMap = useMemo(
    () => new Map(DEFAULT_DIJKSTRA_GRAPH.nodes.map((n) => [n.id, n])),
    [],
  );
  const visitedSet = new Set(currentDijkstraStep.visitedNodes);
  const pathNodeSet = new Set(currentDijkstraStep.shortestPathNodes);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header + Algorithm Selector */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="font-code text-xs font-bold tracking-widest text-blue-700 dark:text-blue-400">
            {copy.algorithms.sectionLabel}
          </span>
          <h2 className="font-editorial mt-1 text-2xl font-semibold tracking-tight text-[var(--sol-text)] sm:text-4xl">
            {copy.algorithms.sectionTitle}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--sol-text-secondary)]">
            {copy.algorithms.sectionDesc}
          </p>
        </div>

        <div className="inline-flex w-full flex-wrap rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] p-1 shadow-xs lg:w-auto">
          {(
            [
              { id: 'binary-search', label: copy.algorithms.algoBinary, testId: 'algo-tab-binary' },
              { id: 'quicksort-lomuto', label: copy.algorithms.algoQuickSort, testId: 'algo-tab-quicksort' },
              { id: 'dijkstra', label: copy.algorithms.algoDijkstra, testId: 'algo-tab-dijkstra' },
            ] as const
          ).map((item) => {
            const active = algorithm === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={item.testId}
                onClick={() => {
                  setAlgorithm(item.id);
                  resetPlayback();
                }}
                className={`flex-1 rounded-lg px-3.5 py-2 text-xs font-bold transition-all lg:flex-none ${
                  active
                    ? 'bg-blue-700 text-white shadow-sm dark:bg-blue-600'
                    : 'text-[var(--sol-text-secondary)] hover:bg-[var(--sol-elevated)] hover:text-[var(--sol-text)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Playback Control Deck & Telemetry Counters */}
      <div className="sol-card mt-6 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          {/* Transport Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="algo-play-btn"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isPlaying ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
              <span>{isPlaying ? copy.algorithms.pause : copy.algorithms.play}</span>
            </button>

            <button
              type="button"
              data-testid="algo-step-back"
              disabled={clampedStepIdx <= 0}
              onClick={() => {
                setIsPlaying(false);
                setStepIdx((prev) => Math.max(0, prev - 1));
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-2 text-xs font-bold text-[var(--sol-text)] transition-colors hover:border-blue-700/60 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <StepBackIcon className="h-3.5 w-3.5" />
              <span>{copy.algorithms.stepBack}</span>
            </button>

            <button
              type="button"
              data-testid="algo-step-forward"
              disabled={clampedStepIdx >= totalSteps - 1}
              onClick={() => {
                setIsPlaying(false);
                setStepIdx((prev) => Math.min(totalSteps - 1, prev + 1));
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-2 text-xs font-bold text-[var(--sol-text)] transition-colors hover:border-blue-700/60 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>{copy.algorithms.stepForward}</span>
              <StepForwardIcon className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              data-testid="algo-reset"
              onClick={resetPlayback}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-3 py-2 text-xs font-bold text-[var(--sol-text-secondary)] transition-colors hover:text-[var(--sol-text)]"
            >
              <RotateIcon className="h-3.5 w-3.5" />
              <span>{copy.algorithms.reset}</span>
            </button>

            {/* Speed Slider (0.5x - 3x) */}
            <div className="flex items-center gap-2 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] px-3 py-1.5">
              <label
                htmlFor="algo-speed-range"
                className="font-code text-[11px] font-semibold text-[var(--sol-text-muted)]"
              >
                {copy.algorithms.speedLabel}
              </label>
              <input
                id="algo-speed-range"
                data-testid="algo-speed-slider"
                type="range"
                min={0.5}
                max={3}
                step={0.5}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20 accent-blue-700 dark:accent-blue-500"
              />
              <span className="min-w-[2.4rem] text-right font-code text-xs font-bold text-blue-700 dark:text-blue-400">
                {speed.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Live Counters */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="sol-elevated rounded-xl px-3 py-2">
              <div className="font-code text-[10px] font-semibold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {copy.algorithms.stepLabel}
              </div>
              <div
                data-testid="algo-step-counter"
                className="font-code text-sm font-extrabold text-[var(--sol-text)]"
              >
                {clampedStepIdx + 1} / {totalSteps}
              </div>
            </div>

            <div className="sol-elevated rounded-xl px-3 py-2">
              <div className="font-code text-[10px] font-semibold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {copy.algorithms.comparisonsLabel}
              </div>
              <div
                data-testid="algo-comparisons"
                className="font-code text-sm font-extrabold text-blue-700 dark:text-blue-400"
              >
                {activeComparisons}
              </div>
            </div>

            <div className="sol-elevated rounded-xl px-3 py-2">
              <div className="font-code text-[10px] font-semibold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {activeSecondaryLabel}
              </div>
              <div
                data-testid="algo-swaps"
                className="font-code text-sm font-extrabold text-emerald-600 dark:text-emerald-400"
              >
                {activeSecondaryCount}
              </div>
            </div>

            <div className="sol-elevated rounded-xl px-3 py-2">
              <div className="font-code text-[10px] font-semibold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {copy.algorithms.complexityLabel}
              </div>
              <div className="truncate font-code text-xs font-bold text-[var(--sol-text)]">
                {activeComplexity.time}
              </div>
            </div>
          </div>
        </div>

        {/* Step Scrubber Bar */}
        <div className="mt-4 flex items-center gap-3">
          <input
            aria-label="Algorithm timeline scrubber"
            data-testid="algo-timeline-slider"
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={clampedStepIdx}
            onChange={(e) => {
              setIsPlaying(false);
              setStepIdx(Number(e.target.value));
            }}
            className="w-full accent-blue-700 dark:accent-blue-500"
          />
        </div>

        {/* Live Step Narration Banner */}
        <div
          data-testid="algo-step-narration"
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-blue-700/20 bg-blue-700/6 px-3.5 py-2.5 text-xs font-semibold text-[var(--sol-text)] dark:border-blue-500/30 dark:bg-blue-500/10"
        >
          <CpuIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
          <span className="leading-relaxed">{activeMessage}</span>
        </div>
      </div>

      {/* Main Visualization Stage + Synchronized Pseudocode */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Interactive Canvas */}
        <div className="sol-card rounded-2xl p-5 lg:col-span-8">
          {algorithm === 'binary-search' && (
            <div data-testid="visualizer-binary-stage">
              {/* Target Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sol-border)] pb-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {BINARY_SEARCH_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setBinaryPresetIdx(idx);
                        setBinaryCustomTarget(null);
                        resetPlayback();
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        binaryPresetIdx === idx && binaryCustomTarget === null
                          ? 'bg-blue-700 text-white dark:bg-blue-600'
                          : 'border border-[var(--sol-border)] bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
                      }`}
                    >
                      {preset.label[locale]}
                    </button>
                  ))}
                </div>
                <span className="rounded-md border border-blue-700/25 bg-blue-700/8 px-2.5 py-1 font-code text-xs font-bold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300">
                  TARGET = {currentBinaryStep.target}
                </span>
              </div>

              {/* Pointer Legend */}
              <div className="mt-4 flex flex-wrap gap-3 font-code text-[11px] text-[var(--sol-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-700" />
                  {copy.algorithms.legendLowHigh}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                  {copy.algorithms.legendMid}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                  {copy.algorithms.legendSorted}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-slate-700" />
                  {copy.algorithms.legendEliminated}
                </span>
              </div>

              {/* Array Cells */}
              <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                {currentBinaryStep.array.map((val, idx) => {
                  const isEliminated = currentBinaryStep.eliminatedIndices.includes(idx);
                  const isMid = currentBinaryStep.mid === idx;
                  const isFound = currentBinaryStep.foundIndex === idx;
                  const isLow = currentBinaryStep.low === idx;
                  const isHigh = currentBinaryStep.high === idx;
                  const inWindow = idx >= currentBinaryStep.low && idx <= currentBinaryStep.high;

                  let cellClasses =
                    'border-[var(--sol-border-strong)] bg-[var(--sol-surface)] text-[var(--sol-text)]';
                  if (isFound) {
                    cellClasses =
                      'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/40';
                  } else if (isMid) {
                    cellClasses =
                      'border-amber-500 bg-amber-500/15 text-amber-950 ring-2 ring-amber-500/40 dark:text-amber-200';
                  } else if (isEliminated) {
                    cellClasses =
                      'border-[var(--sol-border)] bg-[var(--sol-elevated)]/60 text-[var(--sol-text-muted)] opacity-45 line-through';
                  } else if (inWindow) {
                    cellClasses =
                      'border-blue-700/45 bg-blue-700/6 text-[var(--sol-text)] dark:border-blue-400/50 dark:bg-blue-500/10';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBinaryCustomTarget(val);
                        resetPlayback();
                      }}
                      title={`Set target to ${val}`}
                      className={`relative flex flex-col items-center justify-center rounded-xl border px-2 py-4 transition-all hover:-translate-y-0.5 ${cellClasses}`}
                    >
                      <span className="font-code text-[10px] opacity-70">[{idx}]</span>
                      <span className="mt-0.5 font-code text-lg font-extrabold">{val}</span>
                      <div className="mt-2 flex min-h-[18px] flex-wrap justify-center gap-1">
                        {isLow && (
                          <span className="rounded bg-blue-700 px-1.5 py-0.5 font-code text-[9px] font-bold text-white">
                            L
                          </span>
                        )}
                        {isMid && (
                          <span className="rounded bg-amber-500 px-1.5 py-0.5 font-code text-[9px] font-bold text-slate-950">
                            MID
                          </span>
                        )}
                        {isHigh && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-code text-[9px] font-bold text-white dark:bg-slate-200 dark:text-slate-950">
                            H
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 font-code text-[11px] text-[var(--sol-text-muted)]">
                {locale === 'vi'
                  ? 'Mẹo: Nhấn trực tiếp vào bất kỳ ô số nào để đặt làm mục tiêu tìm kiếm mới.'
                  : 'Tip: Click any array cell directly to re-run Binary Search against that target.'}
              </p>
            </div>
          )}

          {algorithm === 'quicksort-lomuto' && (
            <div data-testid="visualizer-quicksort-stage">
              {/* Dataset Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sol-border)] pb-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICKSORT_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setQuickPresetIdx(idx);
                        resetPlayback();
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        quickPresetIdx === idx
                          ? 'bg-blue-700 text-white dark:bg-blue-600'
                          : 'border border-[var(--sol-border)] bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
                      }`}
                    >
                      {preset.label[locale]}
                    </button>
                  ))}
                </div>
                {currentQuickStep.activeRange && (
                  <span className="rounded-md border border-blue-700/25 bg-blue-700/8 px-2.5 py-1 font-code text-xs font-bold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300">
                    RANGE [{currentQuickStep.activeRange[0]}..{currentQuickStep.activeRange[1]}]
                  </span>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3 font-code text-[11px] text-[var(--sol-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                  {copy.algorithms.legendPivot}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-700" />
                  {copy.algorithms.legendActive}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-rose-600" />
                  {copy.algorithms.legendSwap}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                  {copy.algorithms.legendSorted}
                </span>
              </div>

              {/* SVG Bars + Swap Arcs */}
              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--sol-border)] bg-[var(--sol-bg)] p-2">
                <svg
                  viewBox={`0 0 ${qsSvgWidth} 290`}
                  className="h-auto w-full"
                  role="img"
                  aria-label="QuickSort Lomuto partition bar chart with swap arcs"
                >
                  <defs>
                    <marker
                      id="qs-arrow"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#e11d48" />
                    </marker>
                  </defs>

                  {/* Active Partition Sub-Array Bracket */}
                  {currentQuickStep.activeRange && (
                    <rect
                      x={qsPadX + currentQuickStep.activeRange[0] * qsSlotWidth + 2}
                      y={58}
                      width={
                        (currentQuickStep.activeRange[1] - currentQuickStep.activeRange[0] + 1) *
                          qsSlotWidth -
                        4
                      }
                      height={196}
                      rx={10}
                      fill="#1d4ed8"
                      fillOpacity={0.07}
                      stroke="#1d4ed8"
                      strokeOpacity={0.35}
                      strokeDasharray="5 4"
                      strokeWidth={1.4}
                    />
                  )}

                  {/* Animated Swap Arc connecting swapPair[0] and swapPair[1] */}
                  {currentQuickStep.swapPair && (() => {
                    const [a, b] = currentQuickStep.swapPair;
                    const x1 = qsPadX + a * qsSlotWidth + qsSlotWidth / 2;
                    const x2 = qsPadX + b * qsSlotWidth + qsSlotWidth / 2;
                    const midX = (x1 + x2) / 2;
                    const arcHeight = Math.max(12, 48 - Math.abs(x2 - x1) * 0.05);
                    return (
                      <g data-testid="quicksort-swap-arc">
                        <path
                          d={`M ${x1} 62 Q ${midX} ${arcHeight - 28} ${x2} 62`}
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth={2.6}
                          strokeDasharray="6 3"
                          markerStart="url(#qs-arrow)"
                          markerEnd="url(#qs-arrow)"
                        />
                        <rect
                          x={midX - 28}
                          y={8}
                          width={56}
                          height={20}
                          rx={6}
                          fill="#e11d48"
                        />
                        <text
                          x={midX}
                          y={21}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize={10}
                          fontWeight={700}
                        >
                          SWAP
                        </text>
                      </g>
                    );
                  })()}

                  {/* Element Bars */}
                  {currentQuickStep.array.map((value, idx) => {
                    const centerX = qsPadX + idx * qsSlotWidth + qsSlotWidth / 2;
                    const barX = centerX - qsBarWidth / 2;
                    const barH = Math.max(22, Math.round((value / qsMaxVal) * qsMaxBarH));
                    const barY = qsBaseY - barH;

                    const isSorted = qsSortedSet.has(idx);
                    const isPivot = currentQuickStep.pivotIndex === idx;
                    const isSwapped =
                      currentQuickStep.swapPair !== null &&
                      (currentQuickStep.swapPair[0] === idx ||
                        currentQuickStep.swapPair[1] === idx);
                    const isJ = currentQuickStep.jPointer === idx;
                    const isI = currentQuickStep.iPointer === idx;

                    let fill = '#64748b';
                    if (isSwapped) fill = '#e11d48';
                    else if (isPivot) fill = '#d97706';
                    else if (isSorted) fill = '#059669';
                    else if (isJ) fill = '#1d4ed8';
                    else if (
                      currentQuickStep.activeRange &&
                      idx >= currentQuickStep.activeRange[0] &&
                      idx <= currentQuickStep.activeRange[1]
                    ) {
                      fill = '#3b82f6';
                    }

                    return (
                      <g key={idx}>
                        <rect
                          x={barX}
                          y={barY}
                          width={qsBarWidth}
                          height={barH}
                          rx={7}
                          fill={fill}
                        />
                        <text
                          x={centerX}
                          y={barY - 7}
                          textAnchor="middle"
                          fill="currentColor"
                          className="fill-[var(--sol-text)]"
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize={12}
                          fontWeight={700}
                        >
                          {value}
                        </text>
                        <text
                          x={centerX}
                          y={qsBaseY + 17}
                          textAnchor="middle"
                          className="fill-[var(--sol-text-muted)]"
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize={10}
                        >
                          [{idx}]
                        </text>

                        {/* Pointer Markers */}
                        {isPivot && (
                          <text
                            x={centerX}
                            y={qsBaseY + 34}
                            textAnchor="middle"
                            fill="#d97706"
                            fontFamily="'JetBrains Mono', monospace"
                            fontSize={10}
                            fontWeight={800}
                          >
                            PIVOT
                          </text>
                        )}
                        {!isPivot && isJ && (
                          <text
                            x={centerX}
                            y={qsBaseY + 34}
                            textAnchor="middle"
                            fill="#1d4ed8"
                            fontFamily="'JetBrains Mono', monospace"
                            fontSize={10}
                            fontWeight={800}
                          >
                            j
                          </text>
                        )}
                        {!isPivot && !isJ && isI && (
                          <text
                            x={centerX}
                            y={qsBaseY + 34}
                            textAnchor="middle"
                            fill="#7c3aed"
                            fontFamily="'JetBrains Mono', monospace"
                            fontSize={10}
                            fontWeight={800}
                          >
                            i
                          </text>
                        )}
                        {!isPivot && isSorted && !isJ && !isI && (
                          <text
                            x={centerX}
                            y={qsBaseY + 34}
                            textAnchor="middle"
                            fill="#059669"
                            fontFamily="'JetBrains Mono', monospace"
                            fontSize={9}
                            fontWeight={700}
                          >
                            OK
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {algorithm === 'dijkstra' && (
            <div data-testid="visualizer-dijkstra-stage">
              {/* Target Selector Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sol-border)] pb-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-code text-[11px] font-semibold text-[var(--sol-text-muted)]">
                    {copy.algorithms.targetNodeLabel}:
                  </span>
                  {DEFAULT_DIJKSTRA_GRAPH.nodes
                    .filter((n) => n.id !== 'A')
                    .map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        data-testid={`dijkstra-target-${n.id}`}
                        onClick={() => {
                          setDijkstraTarget(n.id);
                          resetPlayback();
                        }}
                        className={`rounded-lg px-2.5 py-1 font-code text-xs font-bold transition-all ${
                          dijkstraTarget === n.id
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'border border-[var(--sol-border)] bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)] hover:text-[var(--sol-text)]'
                        }`}
                      >
                        A -&gt; {n.id}
                      </button>
                    ))}
                </div>
                {currentDijkstraStep.shortestPathNodes.length > 0 && (
                  <span
                    data-testid="dijkstra-path-badge"
                    className="rounded-md border border-emerald-600/35 bg-emerald-600/10 px-2.5 py-1 font-code text-xs font-bold text-emerald-700 dark:text-emerald-300"
                  >
                    {copy.algorithms.pathLockedLabel}: {currentDijkstraStep.shortestPathNodes.join(' -> ')} (
                    {dijkstraTrace.shortestDistance}ms)
                  </span>
                )}
              </div>

              {/* Legend */}
              <div className="mt-3.5 flex flex-wrap gap-3 font-code text-[11px] text-[var(--sol-text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />
                  {copy.algorithms.legendActive}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  {copy.algorithms.relaxationsLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  {copy.algorithms.legendOptimalPath}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                  {copy.algorithms.legendVisited}
                </span>
              </div>

              {/* Interactive 7-Node Weighted SVG Graph */}
              <div className="mt-3.5 overflow-hidden rounded-xl border border-[var(--sol-border)] bg-[var(--sol-bg)] p-2">
                <svg
                  viewBox="0 0 800 350"
                  className="h-auto w-full"
                  role="img"
                  aria-label="Interactive 7-node weighted graph running Dijkstra shortest path"
                >
                  {/* Weighted Edges */}
                  {DEFAULT_DIJKSTRA_GRAPH.edges.map((edge) => {
                    const u = nodeMap.get(edge.from);
                    const v = nodeMap.get(edge.to);
                    if (!u || !v) return null;

                    const isActive = edgeMatches(edge.from, edge.to, currentDijkstraStep.activeEdge);
                    const isOptimal = edgeInPath(edge.from, edge.to, currentDijkstraStep.shortestPathEdges);
                    const midX = (u.x + v.x) / 2;
                    const midY = (u.y + v.y) / 2;

                    const stroke = isOptimal
                      ? '#059669'
                      : isActive
                        ? currentDijkstraStep.phase === 'relax-update'
                          ? '#d97706'
                          : '#1d4ed8'
                        : '#94a3b8';
                    const strokeWidth = isOptimal ? 5 : isActive ? 4 : 2;

                    return (
                      <g key={`${edge.from}-${edge.to}`}>
                        <line
                          x1={u.x}
                          y1={u.y}
                          x2={v.x}
                          y2={v.y}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          strokeOpacity={isOptimal || isActive ? 1 : 0.5}
                          className={isOptimal ? 'sol-path-glow' : undefined}
                        />
                        <rect
                          x={midX - 14}
                          y={midY - 11}
                          width={28}
                          height={22}
                          rx={6}
                          fill={isOptimal ? '#059669' : isActive ? '#1d4ed8' : '#ffffff'}
                          stroke={isOptimal ? '#047857' : isActive ? '#1e40af' : '#cbd5e1'}
                          strokeWidth={1.2}
                        />
                        <text
                          x={midX}
                          y={midY + 4}
                          textAnchor="middle"
                          fill={isOptimal || isActive ? '#ffffff' : '#0f172a'}
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize={11}
                          fontWeight={700}
                        >
                          {edge.weight}
                        </text>
                      </g>
                    );
                  })}

                  {/* 7 Interactive Graph Nodes */}
                  {DEFAULT_DIJKSTRA_GRAPH.nodes.map((node) => {
                    const isCurrent = currentDijkstraStep.currentNode === node.id;
                    const isVisited = visitedSet.has(node.id);
                    const isPathNode = pathNodeSet.has(node.id);
                    const isTarget = node.id === dijkstraTarget;
                    const dist = currentDijkstraStep.distances[node.id];
                    const distLabel = dist === null || dist === undefined ? 'INF' : String(dist);

                    let fill = '#ffffff';
                    let stroke = '#475569';
                    let textFill = '#0f172a';
                    if (isPathNode) {
                      fill = '#059669';
                      stroke = '#047857';
                      textFill = '#ffffff';
                    } else if (isCurrent) {
                      fill = '#1d4ed8';
                      stroke = '#1e40af';
                      textFill = '#ffffff';
                    } else if (isVisited) {
                      fill = '#0f172a';
                      stroke = '#334155';
                      textFill = '#f8fafc';
                    }

                    return (
                      <g
                        key={node.id}
                        data-testid={`dijkstra-node-${node.id}`}
                        onClick={() => {
                          if (node.id !== 'A') {
                            setDijkstraTarget(node.id);
                            resetPlayback();
                          }
                        }}
                        className={node.id !== 'A' ? 'cursor-pointer' : undefined}
                      >
                        {isTarget && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={32}
                            fill="none"
                            stroke="#059669"
                            strokeWidth={2}
                            strokeDasharray="4 3"
                          />
                        )}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={25}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={2.5}
                        />
                        <text
                          x={node.x}
                          y={node.y - 1}
                          textAnchor="middle"
                          fill={textFill}
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                          fontSize={15}
                          fontWeight={800}
                        >
                          {node.label}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + 13}
                          textAnchor="middle"
                          fill={isPathNode || isCurrent || isVisited ? '#e2e8f0' : '#1d4ed8'}
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize={10}
                          fontWeight={700}
                        >
                          d={distLabel}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + 42}
                          textAnchor="middle"
                          className="fill-[var(--sol-text-muted)]"
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize={9.5}
                          fontWeight={600}
                        >
                          {node.role[locale]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Priority Queue + Distance Table */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* Priority Queue */}
                <div className="sol-elevated rounded-xl p-3.5 md:col-span-5">
                  <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                    {copy.algorithms.priorityQueueHeader}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {currentDijkstraStep.priorityQueue.length === 0 ? (
                      <span className="font-code text-xs text-[var(--sol-text-muted)]">
                        [ empty ]
                      </span>
                    ) : (
                      currentDijkstraStep.priorityQueue.map((entry, idx) => (
                        <span
                          key={`${entry.node}-${idx}`}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-code text-xs font-bold ${
                            idx === 0
                              ? 'border-blue-700 bg-blue-700 text-white'
                              : 'border-[var(--sol-border-strong)] bg-[var(--sol-surface)] text-[var(--sol-text)]'
                          }`}
                        >
                          <span>{entry.node}</span>
                          <span className="opacity-75">:{entry.dist}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Distance Table */}
                <div className="sol-elevated overflow-x-auto rounded-xl p-3.5 md:col-span-7">
                  <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                    {copy.algorithms.distanceTableHeader}
                  </div>
                  <table className="mt-2 w-full border-collapse font-code text-xs">
                    <thead>
                      <tr className="border-b border-[var(--sol-border)] text-left text-[10px] text-[var(--sol-text-muted)]">
                        <th className="py-1 pr-2">NODE</th>
                        <th className="py-1 pr-2">DIST</th>
                        <th className="py-1 pr-2">PREV</th>
                        <th className="py-1">STATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEFAULT_DIJKSTRA_GRAPH.nodes.map((node) => {
                        const d = currentDijkstraStep.distances[node.id];
                        const p = currentDijkstraStep.previous[node.id];
                        const settled = visitedSet.has(node.id);
                        const onOptPath = pathNodeSet.has(node.id);
                        return (
                          <tr
                            key={node.id}
                            className={`border-b border-[var(--sol-border)]/60 last:border-0 ${
                              onOptPath ? 'bg-emerald-600/10 font-bold' : ''
                            }`}
                          >
                            <td className="py-1 pr-2 font-bold text-[var(--sol-text)]">
                              {node.id}
                            </td>
                            <td className="py-1 pr-2 text-blue-700 dark:text-blue-400">
                              {d === null || d === undefined ? 'INF' : `${d}ms`}
                            </td>
                            <td className="py-1 pr-2 text-[var(--sol-text-secondary)]">
                              {p ?? '-'}
                            </td>
                            <td className="py-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  onOptPath
                                    ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
                                    : settled
                                      ? 'bg-slate-600/15 text-[var(--sol-text-secondary)]'
                                      : 'bg-blue-700/10 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {onOptPath ? 'OPTIMAL' : settled ? 'SETTLED' : 'OPEN'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Synchronized Pseudocode & Complexity Card */}
        <div className="space-y-4 lg:col-span-4">
          <div className="sol-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--sol-border)] bg-[var(--sol-elevated)] px-4 py-3">
              <span className="font-code text-[11px] font-bold tracking-wider text-[var(--sol-text)]">
                {copy.algorithms.pseudocodeHeader}
              </span>
              <span className="rounded bg-blue-700/12 px-2 py-0.5 font-code text-[10px] font-bold text-blue-700 dark:text-blue-300">
                LINE {activePseudocodeLine + 1}
              </span>
            </div>

            <div className="space-y-1 p-3 font-code text-xs">
              {activePseudocode.map((line, idx) => {
                const isActive = idx === activePseudocodeLine;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors ${
                      isActive
                        ? 'border-l-2 border-blue-700 bg-blue-700/12 font-bold text-blue-900 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100'
                        : 'text-[var(--sol-text-secondary)]'
                    }`}
                  >
                    <span className="w-4 shrink-0 select-none text-right text-[10px] opacity-55">
                      {idx + 1}
                    </span>
                    <span className="whitespace-pre-wrap break-words">{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sol-card rounded-2xl p-4">
            <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
              {locale === 'vi' ? 'CHỈ SỐ HIỆU NĂNG PHỎNG VẤN' : 'INTERVIEW COMPLEXITY PROFILE'}
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-[var(--sol-elevated)] px-3 py-2">
                <span className="text-[var(--sol-text-muted)]">
                  {locale === 'vi' ? 'Thời gian' : 'Time Complexity'}
                </span>
                <span className="font-code font-bold text-blue-700 dark:text-blue-400">
                  {activeComplexity.time}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--sol-elevated)] px-3 py-2">
                <span className="text-[var(--sol-text-muted)]">
                  {locale === 'vi' ? 'Bộ nhớ phụ' : 'Auxiliary Space'}
                </span>
                <span className="font-code font-bold text-emerald-700 dark:text-emerald-400">
                  {activeComplexity.space}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--sol-elevated)] px-3 py-2">
                <span className="text-[var(--sol-text-muted)]">
                  {locale === 'vi' ? 'Tổng bước thực thi' : 'Total Trace Steps'}
                </span>
                <span className="font-code font-bold text-[var(--sol-text)]">
                  {totalSteps}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AlgorithmVisualizerLab;
