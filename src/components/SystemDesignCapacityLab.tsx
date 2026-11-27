import { useMemo, useState } from 'react';
import type { Locale } from '../types/lms';
import { tCopy } from '../data/i18n';
import {
  APP_RUNTIME_SPECS,
  MAX_CACHE_HIT_PCT,
  MAX_PAYLOAD_KB,
  MAX_PEAK_MULTIPLIER,
  MAX_RW_RATIO,
  MIN_CACHE_HIT_PCT,
  MIN_PAYLOAD_KB,
  MIN_PEAK_MULTIPLIER,
  MIN_RW_RATIO,
  SYSTEM_DESIGN_BLUEPRINTS,
  autoScaleFleet,
  computeCapacityEstimate,
  dauToLogSlider,
  formatCompactNumber,
  formatDau,
  formatUsd,
  generateSizingMarkdown,
  getBlueprint,
  logSliderToDau,
  type AppRuntime,
  type BlueprintId,
  type CapacityInputs,
  type ProvisionedFleet,
  type TierHealth,
  type TierId,
  type TierStatus,
} from '../engines/systemDesignEngine';
import {
  BoltIcon,
  CheckCircleIcon,
  CloudGlobeIcon,
  CopyIcon,
  CpuIcon,
  DatabaseIcon,
  NetworkScaleIcon,
  RotateIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparkScaleIcon,
} from './Icons';

interface SystemDesignCapacityLabProps {
  locale: Locale;
  onNotify?: (message: string) => void;
}

const DAU_QUICK_STOPS = [10_000, 250_000, 1_000_000, 5_000_000, 10_000_000] as const;

const TIER_SVG_X: Record<TierId, number> = {
  cdn: 12,
  api_gateway: 188,
  app_fleet: 364,
  redis_cache: 540,
  database: 716,
};

const TIER_SHORT_TITLE: Record<TierId, { en: string; vi: string }> = {
  cdn: { en: 'CDN Edge', vi: 'CDN Edge' },
  api_gateway: { en: 'API Gateway', vi: 'API Gateway' },
  app_fleet: { en: 'App Fleet', vi: 'Cụm App' },
  redis_cache: { en: 'Redis Cache', vi: 'Redis Cache' },
  database: { en: 'Primary / Replica', vi: 'Primary / Replica' },
};

function tierStrokeColor(status: TierStatus): string {
  if (status === 'overloaded') return '#dc2626';
  if (status === 'warning') return '#d97706';
  return '#059669';
}

function tierBadgeBg(status: TierStatus): string {
  if (status === 'overloaded') return 'rgba(220, 38, 38, 0.14)';
  if (status === 'warning') return 'rgba(217, 119, 6, 0.16)';
  return 'rgba(5, 150, 105, 0.14)';
}

function tierCardClass(status: TierStatus): string {
  if (status === 'overloaded') return 'sol-tier-overloaded';
  if (status === 'warning') return 'sol-tier-warning';
  return '';
}

function BlueprintIcon({ id, className = 'h-4 w-4' }: { id: BlueprintId; className?: string }) {
  if (id === 'url-shortener') return <CloudGlobeIcon className={className} />;
  if (id === 'flash-sale-voucher') return <BoltIcon className={className} />;
  return <NetworkScaleIcon className={className} />;
}

export function SystemDesignCapacityLab({ locale, onNotify }: SystemDesignCapacityLabProps) {
  const copy = tCopy(locale);
  const sd = copy.systemDesign;

  const initialBlueprint = SYSTEM_DESIGN_BLUEPRINTS[0]!;
  const [inputs, setInputs] = useState<CapacityInputs>({ ...initialBlueprint.defaultInputs });
  const [fleet, setFleet] = useState<ProvisionedFleet>({ ...initialBlueprint.baselineFleet });
  const [selectedTierId, setSelectedTierId] = useState<TierId>('database');
  const [autoScaleSummary, setAutoScaleSummary] = useState<string | null>(null);

  const activeBlueprint = useMemo(() => getBlueprint(inputs.blueprintId), [inputs.blueprintId]);
  const estimate = useMemo(() => computeCapacityEstimate(inputs, fleet), [inputs, fleet]);

  const selectedTier: TierHealth = useMemo(
    () => estimate.tiers.find((t) => t.id === selectedTierId) ?? estimate.tiers[4]!,
    [estimate.tiers, selectedTierId],
  );

  const dauSliderValue = useMemo(() => dauToLogSlider(inputs.dau), [inputs.dau]);

  const handleSelectBlueprint = (id: BlueprintId) => {
    const bp = getBlueprint(id);
    setInputs({ ...bp.defaultInputs });
    setFleet({ ...bp.baselineFleet });
    setAutoScaleSummary(null);
    setSelectedTierId('database');
  };

  const updateInput = <K extends keyof CapacityInputs>(key: K, value: CapacityInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setAutoScaleSummary(null);
  };

  const handleAutoScale = () => {
    const target = autoScaleFleet(inputs);
    const diffs: string[] = [];
    if (target.cdnGbps !== fleet.cdnGbps) {
      diffs.push(`CDN ${fleet.cdnGbps.toFixed(1)}->${target.cdnGbps.toFixed(1)}Gbps`);
    }
    if (target.apiGwNodes !== fleet.apiGwNodes) {
      diffs.push(`GW ${fleet.apiGwNodes}->${target.apiGwNodes}`);
    }
    if (target.appPods !== fleet.appPods) {
      diffs.push(`Pods ${fleet.appPods}->${target.appPods}`);
    }
    if (target.redisShards !== fleet.redisShards) {
      diffs.push(`Redis ${fleet.redisShards}->${target.redisShards}`);
    }
    if (
      target.dbPrimaryShards !== fleet.dbPrimaryShards ||
      target.dbReadReplicas !== fleet.dbReadReplicas
    ) {
      diffs.push(
        `DB ${fleet.dbPrimaryShards}P+${fleet.dbReadReplicas}R->${target.dbPrimaryShards}P+${target.dbReadReplicas}R`,
      );
    }

    setFleet(target);
    const summaryText =
      diffs.length > 0
        ? diffs.join(' · ')
        : locale === 'vi'
          ? 'Tất cả 5 tầng đã đạt ngưỡng an toàn <= 65%'
          : 'All 5 tiers calibrated <= 65% utilization';
    setAutoScaleSummary(summaryText);
    onNotify?.(`${sd.autoScaleDiffPrefix} ${summaryText}`);
  };

  const handleResetFleet = () => {
    setFleet({ ...activeBlueprint.baselineFleet });
    setAutoScaleSummary(null);
  };

  const handleCopySpec = async () => {
    const md = generateSizingMarkdown(estimate);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(md);
      }
      onNotify?.(sd.copiedSpecMsg);
    } catch {
      onNotify?.(sd.copiedSpecMsg);
    }
  };

  const statusLabel = (status: TierStatus) =>
    status === 'overloaded'
      ? sd.statusOverloaded
      : status === 'warning'
        ? sd.statusWarning
        : sd.statusHealthy;

  const costEntries = [
    {
      key: 'cdn',
      label: 'CDN Edge',
      usd: estimate.costBreakdown.cdnUsd,
      color: 'bg-sky-600 dark:bg-sky-500',
    },
    {
      key: 'gw',
      label: 'API GW',
      usd: estimate.costBreakdown.apiGwUsd,
      color: 'bg-indigo-600 dark:bg-indigo-500',
    },
    {
      key: 'app',
      label: APP_RUNTIME_SPECS[inputs.runtime].label,
      usd: estimate.costBreakdown.appFleetUsd,
      color: 'bg-blue-700 dark:bg-blue-500',
    },
    {
      key: 'redis',
      label: 'Redis',
      usd: estimate.costBreakdown.redisUsd,
      color: 'bg-amber-600 dark:bg-amber-500',
    },
    {
      key: 'db',
      label: 'PostgreSQL',
      usd: estimate.costBreakdown.databaseUsd,
      color: 'bg-emerald-600 dark:bg-emerald-500',
    },
  ];

  const totalCost = Math.max(1, estimate.costBreakdown.totalMonthlyUsd);

  return (
    <section
      data-testid="system-design-lab"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
    >
      {/* Editorial Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="font-code text-xs font-bold tracking-widest text-blue-700 dark:text-blue-400">
            {sd.sectionLabel}
          </span>
          <h2 className="font-editorial mt-1 text-2xl font-semibold tracking-tight text-[var(--sol-text)] sm:text-4xl">
            {sd.sectionTitle}
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--sol-text-secondary)]">
            {sd.sectionDesc}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="sd-overall-status-badge"
            data-status={estimate.overallStatus}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-code text-xs font-bold ${
              estimate.overallStatus === 'overloaded'
                ? 'border-red-600/35 bg-red-600/10 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300'
                : estimate.overallStatus === 'warning'
                  ? 'border-amber-600/35 bg-amber-600/10 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'border-emerald-600/35 bg-emerald-600/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
            }`}
          >
            {estimate.overallStatus === 'healthy' ? (
              <ShieldCheckIcon className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlertIcon className="h-3.5 w-3.5" />
            )}
            <span>
              {statusLabel(estimate.overallStatus)} ·{' '}
              {estimate.overloadedTiers.length > 0
                ? `${estimate.overloadedTiers.length} ${locale === 'vi' ? 'tầng quá tải' : 'overloaded'}`
                : estimate.bottlenecks.length > 0
                  ? `${estimate.bottlenecks.length} ${locale === 'vi' ? 'cảnh báo' : 'warning'}`
                  : locale === 'vi'
                    ? '0 nút thắt'
                    : '0 bottlenecks'}
            </span>
          </span>

          <button
            type="button"
            onClick={() => void handleCopySpec()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-1.5 font-code text-xs font-semibold text-[var(--sol-text)] transition-colors hover:border-blue-700/60 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            <span>{sd.copySpecBtn}</span>
          </button>
        </div>
      </div>

      {/* 3 FAANG Blueprint Selector Cards */}
      <div className="mt-6">
        <div className="mb-2.5 font-code text-[11px] font-bold tracking-wider text-[var(--sol-text-muted)]">
          {sd.blueprintHeading}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {SYSTEM_DESIGN_BLUEPRINTS.map((bp) => {
            const active = bp.id === inputs.blueprintId;
            return (
              <button
                key={bp.id}
                type="button"
                data-testid={`blueprint-btn-${bp.id}`}
                onClick={() => handleSelectBlueprint(bp.id)}
                className={`sol-card group flex flex-col justify-between rounded-2xl p-4 text-left transition-all ${
                  active
                    ? 'border-blue-700 ring-2 ring-blue-700/20 dark:border-blue-500 dark:ring-blue-500/25'
                    : 'hover:border-blue-700/45'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-code text-[10px] font-bold tracking-wider ${
                        active
                          ? 'bg-blue-700 text-white dark:bg-blue-600'
                          : 'bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)]'
                      }`}
                    >
                      <BlueprintIcon id={bp.id} className="h-3 w-3" />
                      {bp.badge}
                    </span>
                    <span className="font-code text-[10px] font-semibold text-[var(--sol-text-muted)]">
                      {bp.writesPerDauPerDay} W/DAU/d
                    </span>
                  </div>
                  <h3 className="font-editorial mt-2.5 text-lg font-semibold leading-snug text-[var(--sol-text)]">
                    {bp.name[locale]}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--sol-text-secondary)]">
                    {bp.subtitle[locale]}
                  </p>
                </div>
                <p className="mt-3 border-t border-[var(--sol-border)] pt-2.5 text-[11px] leading-relaxed text-[var(--sol-text-muted)]">
                  {bp.interviewPrompt[locale]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Workspace: Left Sliders (5 cols) + Right SVG Topology & KPIs (7 cols) */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT COLUMN: Sliders, Runtime Selector & Auto-Scale Actions */}
        <div className="sol-card flex flex-col justify-between rounded-2xl p-5 xl:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--sol-border)] pb-3">
              <span className="font-code text-[11px] font-bold tracking-wider text-[var(--sol-text-muted)]">
                {sd.controlsHeading}
              </span>
              <span className="font-code text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                {activeBlueprint.writesPerDauPerDay} {locale === 'vi' ? 'lượt ghi/user/ngày' : 'writes/user/day'}
              </span>
            </div>

            <div className="mt-4 space-y-5">
              {/* Slider 1: DAU (Logarithmic 10K - 10M) */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="sd-dau-slider"
                    className="text-xs font-bold text-[var(--sol-text)]"
                  >
                    {sd.dauLabel}
                  </label>
                  <span
                    data-testid="sd-dau-value"
                    className="font-code text-sm font-bold text-blue-700 dark:text-blue-400"
                  >
                    {formatDau(inputs.dau)} ({inputs.dau.toLocaleString('en-US')})
                  </span>
                </div>
                <input
                  id="sd-dau-slider"
                  data-testid="sd-dau-slider"
                  type="range"
                  min={0}
                  max={1000}
                  step={5}
                  value={dauSliderValue}
                  onChange={(e) => updateInput('dau', logSliderToDau(Number(e.target.value)))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--sol-elevated)] accent-blue-700 dark:accent-blue-500"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
                  {DAU_QUICK_STOPS.map((stop) => {
                    const isSelected = inputs.dau === stop;
                    return (
                      <button
                        key={stop}
                        type="button"
                        data-testid={`sd-dau-preset-${formatDau(stop)}`}
                        onClick={() => updateInput('dau', stop)}
                        className={`rounded-md border px-2 py-0.5 font-code text-[10px] font-bold transition-colors ${
                          isSelected
                            ? 'border-blue-700 bg-blue-700 text-white dark:border-blue-500 dark:bg-blue-600'
                            : 'border-[var(--sol-border)] bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)] hover:border-blue-700/50'
                        }`}
                      >
                        {formatDau(stop)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider 2: Read:Write Ratio (10:1 - 100:1) */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="sd-rw-slider"
                    className="text-xs font-bold text-[var(--sol-text)]"
                  >
                    {sd.rwRatioLabel}
                  </label>
                  <span
                    data-testid="sd-rw-value"
                    className="font-code text-sm font-bold text-[var(--sol-text)]"
                  >
                    {inputs.readWriteRatio}:1
                  </span>
                </div>
                <input
                  id="sd-rw-slider"
                  data-testid="sd-rw-slider"
                  type="range"
                  min={MIN_RW_RATIO}
                  max={MAX_RW_RATIO}
                  step={5}
                  value={inputs.readWriteRatio}
                  onChange={(e) => updateInput('readWriteRatio', Number(e.target.value))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--sol-elevated)] accent-blue-700 dark:accent-blue-500"
                />
                <div className="mt-1 flex justify-between font-code text-[10px] text-[var(--sol-text-muted)]">
                  <span>10:1 (Write-Intensive)</span>
                  <span>100:1 (Read-Heavy)</span>
                </div>
              </div>

              {/* Slider 3: Peak-to-Average Multiplier (3x - 10x) */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="sd-peak-slider"
                    className="text-xs font-bold text-[var(--sol-text)]"
                  >
                    {sd.peakLabel}
                  </label>
                  <span
                    data-testid="sd-peak-value"
                    className="font-code text-sm font-bold text-[var(--sol-text)]"
                  >
                    {inputs.peakMultiplier}x
                  </span>
                </div>
                <input
                  id="sd-peak-slider"
                  data-testid="sd-peak-slider"
                  type="range"
                  min={MIN_PEAK_MULTIPLIER}
                  max={MAX_PEAK_MULTIPLIER}
                  step={1}
                  value={inputs.peakMultiplier}
                  onChange={(e) => updateInput('peakMultiplier', Number(e.target.value))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--sol-elevated)] accent-blue-700 dark:accent-blue-500"
                />
                <div className="mt-1 flex justify-between font-code text-[10px] text-[var(--sol-text-muted)]">
                  <span>3x (Steady)</span>
                  <span>10x (Flash-Sale Spike)</span>
                </div>
              </div>

              {/* Slider 4: Redis Cache Hit Ratio (50% - 98%) */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="sd-cache-slider"
                    className="text-xs font-bold text-[var(--sol-text)]"
                  >
                    {sd.cacheHitLabel}
                  </label>
                  <span
                    data-testid="sd-cache-value"
                    className={`font-code text-sm font-bold ${
                      inputs.cacheHitRatioPct >= 85
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : inputs.cacheHitRatioPct >= 70
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {inputs.cacheHitRatioPct}%
                  </span>
                </div>
                <input
                  id="sd-cache-slider"
                  data-testid="sd-cache-slider"
                  type="range"
                  min={MIN_CACHE_HIT_PCT}
                  max={MAX_CACHE_HIT_PCT}
                  step={1}
                  value={inputs.cacheHitRatioPct}
                  onChange={(e) => updateInput('cacheHitRatioPct', Number(e.target.value))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--sol-elevated)] accent-emerald-600 dark:accent-emerald-500"
                />
                <div className="mt-1 flex justify-between font-code text-[10px] text-[var(--sol-text-muted)]">
                  <span>50% (Cold / Volatile)</span>
                  <span>98% (Hot Key Shield)</span>
                </div>
              </div>

              {/* Slider 5: Avg Payload Size (1 - 64 KB) */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="sd-payload-slider"
                    className="text-xs font-bold text-[var(--sol-text)]"
                  >
                    {sd.payloadLabel}
                  </label>
                  <span
                    data-testid="sd-payload-value"
                    className="font-code text-sm font-bold text-[var(--sol-text)]"
                  >
                    {inputs.avgPayloadKb} KB
                  </span>
                </div>
                <input
                  id="sd-payload-slider"
                  data-testid="sd-payload-slider"
                  type="range"
                  min={MIN_PAYLOAD_KB}
                  max={MAX_PAYLOAD_KB}
                  step={1}
                  value={inputs.avgPayloadKb}
                  onChange={(e) => updateInput('avgPayloadKb', Number(e.target.value))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--sol-elevated)] accent-blue-700 dark:accent-blue-500"
                />
                <div className="mt-1 flex justify-between font-code text-[10px] text-[var(--sol-text-muted)]">
                  <span>1 KB (Lean JSON)</span>
                  <span>64 KB (Rich Document)</span>
                </div>
              </div>

              {/* App Runtime Toggle (.NET 10 / Go / Node.js) */}
              <div className="border-t border-[var(--sol-border)] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--sol-text)]">
                    {sd.runtimeLabel}
                  </span>
                  <span className="font-code text-[10px] text-[var(--sol-text-muted)]">
                    {APP_RUNTIME_SPECS[inputs.runtime].stackHint}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['dotnet10', 'go', 'nodejs'] as AppRuntime[]).map((rtKey) => {
                    const spec = APP_RUNTIME_SPECS[rtKey];
                    const active = inputs.runtime === rtKey;
                    return (
                      <button
                        key={rtKey}
                        type="button"
                        data-testid={`sd-runtime-${rtKey}`}
                        onClick={() => updateInput('runtime', rtKey)}
                        className={`rounded-xl border px-2.5 py-2 text-center transition-all ${
                          active
                            ? 'border-blue-700 bg-blue-700 text-white shadow-sm dark:border-blue-500 dark:bg-blue-600'
                            : 'border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] text-[var(--sol-text-secondary)] hover:border-blue-700/50'
                        }`}
                      >
                        <div className="font-code text-xs font-bold">{spec.label}</div>
                        <div
                          className={`mt-0.5 font-code text-[10px] ${
                            active ? 'text-blue-100' : 'text-[var(--sol-text-muted)]'
                          }`}
                        >
                          {spec.qpsPerPod.toLocaleString('en-US')} QPS
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Auto-Scale Architecture CTA + Reset */}
          <div className="mt-6 space-y-2.5 border-t border-[var(--sol-border)] pt-4">
            <button
              type="button"
              data-testid="sd-autoscale-btn"
              onClick={handleAutoScale}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                estimate.bottlenecks.length > 0
                  ? 'bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700 focus:ring-emerald-600'
                  : 'bg-blue-700 shadow-blue-700/20 hover:bg-blue-800 focus:ring-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
              }`}
            >
              {estimate.bottlenecks.length > 0 ? (
                <SparkScaleIcon className="h-4 w-4" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              <span>
                {estimate.bottlenecks.length > 0
                  ? `${sd.autoScaleBtn} (${estimate.bottlenecks.length})`
                  : sd.autoScaledDone}
              </span>
            </button>

            <button
              type="button"
              data-testid="sd-reset-fleet-btn"
              onClick={handleResetFleet}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-3 py-2 font-code text-xs font-semibold text-[var(--sol-text-secondary)] transition-colors hover:border-blue-700/50 hover:text-[var(--sol-text)]"
            >
              <RotateIcon className="h-3.5 w-3.5" />
              <span>{sd.resetFleetBtn}</span>
            </button>

            {autoScaleSummary && (
              <div
                data-testid="sd-autoscale-summary"
                className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 font-code text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300"
              >
                {sd.autoScaleDiffPrefix} {autoScaleSummary}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live SVG Bottleneck Diagram + KPI Grid */}
        <div className="flex flex-col gap-5 xl:col-span-7">
          {/* Interactive SVG Live Architecture Bottleneck Diagram */}
          <div className="sol-card rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-code text-[11px] font-bold tracking-wider text-[var(--sol-text-muted)]">
                  {sd.topologyHeading}
                </div>
                <p className="mt-0.5 text-xs text-[var(--sol-text-muted)]">{sd.topologySub}</p>
              </div>
              <div className="flex items-center gap-3 font-code text-[10px] font-semibold">
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  &lt;75%
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  75-99%
                </span>
                <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-600" />
                  &ge;100%
                </span>
              </div>
            </div>

            {/* Responsive Vector SVG Architecture Pipeline */}
            <div className="mt-3 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-bg)] p-2 sm:p-3">
              <svg
                viewBox="0 0 860 274"
                role="img"
                aria-label="Live system architecture bottleneck diagram from CDN through API Gateway, App Fleet, Redis Cache, to PostgreSQL Primary and Read Replicas"
                className="block h-auto w-full select-none"
                data-testid="sd-topology-svg"
              >
                <defs>
                  <marker
                    id="solArrowBlue"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#1d4ed8" />
                  </marker>
                  <marker
                    id="solArrowEmerald"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                  </marker>
                  <marker
                    id="solArrowAmber"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
                  </marker>
                </defs>

                {/* Cache Hit Return Path Arc (Redis -> App Fleet) */}
                <path
                  d="M 606 62 Q 518 14 430 62"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="1.8"
                  strokeDasharray="5 4"
                  markerEnd="url(#solArrowEmerald)"
                />
                <rect x="466" y="13" width="104" height="20" rx="6" fill="rgba(5,150,105,0.12)" />
                <text
                  x="518"
                  y="27"
                  textAnchor="middle"
                  fill="#059669"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {inputs.cacheHitRatioPct}% HIT
                </text>

                {/* Direct Write Path Arc (App Fleet -> PostgreSQL Primary) */}
                <path
                  d="M 430 198 Q 606 254 782 198"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  markerEnd="url(#solArrowAmber)"
                />
                <rect x="530" y="234" width="152" height="20" rx="6" fill="rgba(217,119,6,0.12)" />
                <text
                  x="606"
                  y="248"
                  textAnchor="middle"
                  fill="#b45309"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  WRITES: {formatCompactNumber(estimate.peakWriteQps)} QPS
                </text>

                {/* Primary Horizontal Pipeline Connectors */}
                {[
                  { x1: 146, x2: 186, label: `${estimate.peakCdnEgressGbps}G` },
                  { x1: 322, x2: 362, label: formatCompactNumber(estimate.peakTotalQps) },
                  { x1: 498, x2: 538, label: formatCompactNumber(estimate.peakReadQps) },
                  { x1: 674, x2: 714, label: `${100 - inputs.cacheHitRatioPct}%` },
                ].map((link, idx) => (
                  <g key={idx}>
                    <line
                      x1={link.x1}
                      y1={128}
                      x2={link.x2}
                      y2={128}
                      stroke="#1d4ed8"
                      strokeWidth="2.2"
                      markerEnd="url(#solArrowBlue)"
                    />
                    <text
                      x={(link.x1 + link.x2) / 2}
                      y={114}
                      textAnchor="middle"
                      fill="var(--sol-text-muted)"
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {link.label}
                    </text>
                  </g>
                ))}

                {/* 5 Architecture Tier Nodes */}
                {estimate.tiers.map((tier) => {
                  const x = TIER_SVG_X[tier.id];
                  const y = 62;
                  const w = 132;
                  const h = 136;
                  const stroke = tierStrokeColor(tier.status);
                  const isSelected = tier.id === selectedTierId;
                  const barPct = Math.min(100, Math.max(4, tier.utilizationPct));
                  const barW = Math.round(((w - 24) * barPct) / 100);
                  const loadDisplay =
                    tier.unit === 'Gbps'
                      ? `${tier.loadValue} Gbps`
                      : `${formatCompactNumber(tier.loadValue)} QPS`;

                  return (
                    <g
                      key={tier.id}
                      data-testid={`svg-tier-${tier.id}`}
                      data-status={tier.status}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedTierId(tier.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTierId(tier.id);
                        }
                      }}
                      className={`cursor-pointer focus:outline-none ${tierCardClass(tier.status)}`}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx="12"
                        fill="var(--sol-surface)"
                        stroke={stroke}
                        strokeWidth={isSelected ? '3' : '2'}
                      />

                      {/* Status Pill */}
                      <rect
                        x={x + 10}
                        y={y + 10}
                        width={w - 20}
                        height="20"
                        rx="6"
                        fill={tierBadgeBg(tier.status)}
                      />
                      <text
                        x={x + w / 2}
                        y={y + 23.5}
                        textAnchor="middle"
                        fill={stroke}
                        fontSize="9.5"
                        fontWeight="800"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {statusLabel(tier.status)} · {tier.utilizationPct}%
                      </text>

                      {/* Tier Title */}
                      <text
                        x={x + w / 2}
                        y={y + 52}
                        textAnchor="middle"
                        fill="var(--sol-text)"
                        fontSize="12"
                        fontWeight="700"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                      >
                        {TIER_SHORT_TITLE[tier.id][locale]}
                      </text>

                      {/* Live Peak Load */}
                      <text
                        x={x + w / 2}
                        y={y + 76}
                        textAnchor="middle"
                        fill={stroke}
                        fontSize="13.5"
                        fontWeight="800"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {loadDisplay}
                      </text>

                      {/* Provisioned Fleet */}
                      <text
                        x={x + w / 2}
                        y={y + 96}
                        textAnchor="middle"
                        fill="var(--sol-text-muted)"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {tier.provisionedLabel}
                      </text>

                      {/* Utilization Meter Track */}
                      <rect
                        x={x + 12}
                        y={y + 112}
                        width={w - 24}
                        height="8"
                        rx="4"
                        fill="var(--sol-elevated)"
                      />
                      <rect
                        x={x + 12}
                        y={y + 112}
                        width={barW}
                        height="8"
                        rx="4"
                        fill={stroke}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Active Tier Bottleneck Inspector */}
            <div
              data-testid="sd-tier-inspector"
              className="mt-3 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <DatabaseIcon className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <span className="text-xs font-bold text-[var(--sol-text)]">
                    {selectedTier.label[locale]}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-code text-[10px] font-bold ${
                      selectedTier.status === 'overloaded'
                        ? 'bg-red-600/15 text-red-700 dark:text-red-300'
                        : selectedTier.status === 'warning'
                          ? 'bg-amber-600/15 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {selectedTier.utilizationPct}%
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-code text-[11px] text-[var(--sol-text-muted)]">
                  <span>
                    {sd.inspectorProvisioned}:{' '}
                    <strong className="text-[var(--sol-text)]">{selectedTier.provisionedLabel}</strong>
                  </span>
                  <span>
                    {sd.inspectorRecommended}:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {selectedTier.recommendedLabel}
                    </strong>
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--sol-text-secondary)]">
                {selectedTier.bottleneckSummary[locale]}
              </p>
            </div>
          </div>

          {/* 8 Executive Sizing KPI Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiAvgQps}
              </div>
              <div
                data-testid="sd-kpi-avg-qps"
                className="font-code mt-1 text-lg font-extrabold text-[var(--sol-text)]"
              >
                {formatCompactNumber(estimate.avgTotalQps)}
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                R {formatCompactNumber(estimate.avgReadQps)} · W {formatCompactNumber(estimate.avgWriteQps)}
              </div>
            </div>

            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiPeakQps}
              </div>
              <div
                data-testid="sd-kpi-peak-qps"
                className="font-code mt-1 text-lg font-extrabold text-blue-700 dark:text-blue-400"
              >
                {formatCompactNumber(estimate.peakTotalQps)}
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                R {formatCompactNumber(estimate.peakReadQps)} · W {formatCompactNumber(estimate.peakWriteQps)}
              </div>
            </div>

            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiOriginDbQps}
              </div>
              <div
                data-testid="sd-kpi-origin-db-qps"
                className={`font-code mt-1 text-lg font-extrabold ${
                  estimate.tiers[4]?.status === 'overloaded'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatCompactNumber(estimate.originDbPeakQps)}
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                Miss R {formatCompactNumber(estimate.cacheMissReadQps)} + W {formatCompactNumber(estimate.peakWriteQps)}
              </div>
            </div>

            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiAppPods}
              </div>
              <div
                data-testid="sd-kpi-app-pods"
                className="font-code mt-1 text-lg font-extrabold text-[var(--sol-text)]"
              >
                {estimate.requiredAppPods}{' '}
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {APP_RUNTIME_SPECS[inputs.runtime].label}
                </span>
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                Active fleet: {estimate.provisionedFleet.appPods} pods
              </div>
            </div>

            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiDbTopology}
              </div>
              <div
                data-testid="sd-kpi-db-topology"
                className="font-code mt-1 text-lg font-extrabold text-[var(--sol-text)]"
              >
                {estimate.requiredDbPrimaryShards}P + {estimate.requiredDbReadReplicas}R
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                Redis: {estimate.requiredRedisShards} shard(s)
              </div>
            </div>

            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiStorage5Yr}
              </div>
              <div
                data-testid="sd-kpi-storage-tb"
                className="font-code mt-1 text-lg font-extrabold text-[var(--sol-text)]"
              >
                {estimate.fiveYearReplicatedStorageTb.toLocaleString('en-US')} TB
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                Raw {estimate.fiveYearRawStorageTb} TB · {estimate.dailyStorageGb} GB/d
              </div>
            </div>

            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiCdnEgress}
              </div>
              <div
                data-testid="sd-kpi-cdn-egress"
                className="font-code mt-1 text-lg font-extrabold text-[var(--sol-text)]"
              >
                {estimate.peakCdnEgressGbps} Gbps
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                {estimate.monthlyEgressTb} TB / mo avg
              </div>
            </div>

            <div className="sol-card rounded-xl p-3.5">
              <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                {sd.kpiMonthlyCost}
              </div>
              <div
                data-testid="sd-kpi-monthly-cost"
                className="font-code mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-400"
              >
                {formatUsd(estimate.monthlyCloudCostUsd)}
              </div>
              <div className="font-code mt-0.5 text-[10px] text-[var(--sol-text-muted)]">
                USD / month provisioned
              </div>
            </div>
          </div>

          {/* Runtime Pod Comparison & Cost Breakdown Split Card */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="sol-card rounded-2xl p-4">
              <div className="flex items-center gap-1.5 font-code text-[10px] font-bold tracking-wider text-[var(--sol-text-muted)]">
                <CpuIcon className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                <span>{sd.runtimeCompareHeading}</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {(['go', 'dotnet10', 'nodejs'] as AppRuntime[]).map((rtKey) => {
                  const pods = estimate.runtimePodComparison[rtKey];
                  const maxPods = Math.max(
                    1,
                    estimate.runtimePodComparison.nodejs,
                    estimate.runtimePodComparison.dotnet10,
                    estimate.runtimePodComparison.go,
                  );
                  const pct = Math.max(12, Math.round((pods / maxPods) * 100));
                  const isCurrent = inputs.runtime === rtKey;
                  return (
                    <div key={rtKey}>
                      <div className="flex justify-between font-code text-xs">
                        <span
                          className={
                            isCurrent
                              ? 'font-bold text-blue-700 dark:text-blue-400'
                              : 'font-semibold text-[var(--sol-text-secondary)]'
                          }
                        >
                          {APP_RUNTIME_SPECS[rtKey].label}
                        </span>
                        <span className="font-bold text-[var(--sol-text)]">
                          {pods} pods · {formatUsd(pods * APP_RUNTIME_SPECS[rtKey].monthlyUsdPerPod)}/mo
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--sol-elevated)]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCurrent
                              ? 'bg-blue-700 dark:bg-blue-500'
                              : 'bg-slate-400 dark:bg-slate-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sol-card rounded-2xl p-4">
              <div className="font-code text-[10px] font-bold tracking-wider text-[var(--sol-text-muted)]">
                {sd.costSplitHeading}
              </div>
              <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-[var(--sol-elevated)]">
                {costEntries.map((item) => (
                  <div
                    key={item.key}
                    title={`${item.label}: ${formatUsd(item.usd)}`}
                    className={`${item.color} h-full transition-all duration-300`}
                    style={{ width: `${Math.max(4, Math.round((item.usd / totalCost) * 100))}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-code text-[11px]">
                {costEntries.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[var(--sol-text-secondary)]">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="font-bold text-[var(--sol-text)]">{formatUsd(item.usd)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Academic Back-of-the-Envelope Derivation Worksheet + Staff Architect Notes */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="sol-card rounded-2xl p-5 lg:col-span-8">
          <div className="font-code text-[11px] font-bold tracking-wider text-[var(--sol-text-muted)]">
            {sd.worksheetHeading}
          </div>
          <div className="mt-4 divide-y divide-[var(--sol-border)]">
            {estimate.worksheetSteps.map((step) => (
              <div
                key={step.stepNumber}
                className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-700/10 font-code text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      0{step.stepNumber}
                    </span>
                    <h4 className="text-sm font-bold text-[var(--sol-text)]">
                      {step.title[locale]}
                    </h4>
                  </div>
                  <div className="mt-1.5 overflow-x-auto rounded-lg bg-[var(--sol-elevated)] px-2.5 py-1.5 font-code text-[11px] text-[var(--sol-text-secondary)]">
                    {step.formula}
                  </div>
                  <p className="mt-1 text-xs text-[var(--sol-text-muted)]">{step.note[locale]}</p>
                </div>
                <div className="shrink-0 rounded-lg border border-blue-700/20 bg-blue-700/6 px-3 py-1.5 font-code text-xs font-bold text-blue-800 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-300">
                  {step.result}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sol-card rounded-2xl p-5 lg:col-span-4">
          <div className="font-code text-[11px] font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
            {sd.architectNotesHeading}
          </div>
          <h3 className="font-editorial mt-1.5 text-xl font-semibold text-[var(--sol-text)]">
            {activeBlueprint.name[locale]}
          </h3>
          <ul className="mt-3 space-y-3">
            {activeBlueprint.architecturalNotes.map((note, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] p-3 text-xs leading-relaxed text-[var(--sol-text-secondary)]"
              >
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{note[locale]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-900 p-3 font-code text-[11px] text-slate-200 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-[10px] text-slate-400">FASTAPI PARITY ENDPOINT</div>
            <div className="mt-1 text-emerald-300">POST /api/v1/system-design/capacity</div>
            <div className="mt-1 text-[10px] text-slate-400">
              Deterministic TS &amp; Python 3.12 sizing parity
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SystemDesignCapacityLab;
