import { describe, expect, it } from 'vitest';
import {
  APP_RUNTIME_SPECS,
  MAX_DAU,
  MIN_DAU,
  SYSTEM_DESIGN_BLUEPRINTS,
  autoScaleFleet,
  clampCapacityInputs,
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
} from './systemDesignEngine';

describe('Solaris System Design Back-of-the-Envelope Capacity Engine', () => {
  it('exposes exactly 3 production FAANG blueprints with valid defaults', () => {
    expect(SYSTEM_DESIGN_BLUEPRINTS).toHaveLength(3);
    const ids = SYSTEM_DESIGN_BLUEPRINTS.map((bp) => bp.id);
    expect(ids).toEqual(['url-shortener', 'flash-sale-voucher', 'realtime-chat-feed']);
    for (const bp of SYSTEM_DESIGN_BLUEPRINTS) {
      expect(bp.writesPerDauPerDay).toBeGreaterThan(0);
      expect(bp.defaultInputs.dau).toBeGreaterThanOrEqual(MIN_DAU);
      expect(bp.defaultInputs.dau).toBeLessThanOrEqual(MAX_DAU);
    }
  });

  it('computes exact deterministic QPS and cache-miss Origin DB QPS for Global Short-URL', () => {
    const bp = getBlueprint('url-shortener');
    const est = computeCapacityEstimate(bp.defaultInputs);

    // 2.5M DAU * 2 writes/day / 86400 = 57.87037...
    expect(est.avgWriteQps).toBe(57.87);
    expect(est.avgReadQps).toBe(4629.63);
    expect(est.avgTotalQps).toBe(4687.5);
    expect(est.peakWriteQps).toBe(347.22);
    expect(est.peakReadQps).toBe(27777.78);
    expect(est.peakTotalQps).toBe(28125);
    // 18% miss of 27777.777... = 5000.00
    expect(est.cacheMissReadQps).toBe(5000);
    expect(est.originDbPeakQps).toBe(5347.22);
    expect(est.cacheHitQps).toBe(22777.78);
  });

  it('computes exact sizing for Flash-Sale E-Commerce Voucher API', () => {
    const bp = getBlueprint('flash-sale-voucher');
    const est = computeCapacityEstimate(bp.defaultInputs);

    // 2M DAU * 4 / 86400 = 92.59259...
    expect(est.avgWriteQps).toBe(92.59);
    expect(est.peakWriteQps).toBe(833.33);
    expect(est.peakReadQps).toBe(20833.33);
    expect(est.peakTotalQps).toBe(21666.67);
    expect(est.cacheMissReadQps).toBe(5416.67);
    expect(est.originDbPeakQps).toBe(6250);
    expect(est.fiveYearReplicatedStorageTb).toBeGreaterThan(50);
    expect(est.peakCdnEgressGbps).toBe(2);
  });

  it('computes exact sizing for Real-Time Chat & Presence Feed', () => {
    const bp = getBlueprint('realtime-chat-feed');
    const est = computeCapacityEstimate(bp.defaultInputs);

    // 1.5M DAU * 15 / 86400 = 260.41666...
    expect(est.avgWriteQps).toBe(260.42);
    expect(est.peakWriteQps).toBe(1302.08);
    expect(est.peakReadQps).toBe(23437.5);
    expect(est.originDbPeakQps).toBe(7864.58);
    expect(est.requiredDbPrimaryShards).toBe(1);
    expect(est.requiredDbReadReplicas).toBeGreaterThanOrEqual(2);
  });

  it('scales QPS, storage, egress, and pod demand monotonically as DAU increases', () => {
    const base: CapacityInputs = {
      blueprintId: 'url-shortener',
      dau: 100_000,
      readWriteRatio: 50,
      peakMultiplier: 5,
      cacheHitRatioPct: 80,
      avgPayloadKb: 8,
      runtime: 'dotnet10',
    };
    const low = computeCapacityEstimate(base);
    const mid = computeCapacityEstimate({ ...base, dau: 1_000_000 });
    const high = computeCapacityEstimate({ ...base, dau: 10_000_000 });

    expect(mid.peakTotalQps).toBeCloseTo(low.peakTotalQps * 10, 1);
    expect(high.peakTotalQps).toBeCloseTo(mid.peakTotalQps * 10, 1);
    expect(high.fiveYearReplicatedStorageTb).toBeGreaterThan(mid.fiveYearReplicatedStorageTb);
    expect(mid.fiveYearReplicatedStorageTb).toBeGreaterThan(low.fiveYearReplicatedStorageTb);
    expect(high.peakCdnEgressGbps).toBeGreaterThan(mid.peakCdnEgressGbps);
    expect(high.requiredAppPods).toBeGreaterThan(mid.requiredAppPods);
    expect(high.requiredDbReadReplicas).toBeGreaterThan(mid.requiredDbReadReplicas);
  });

  it('raising Redis Cache Hit Ratio sharply lowers Origin DB QPS and replica count', () => {
    const lowCache = computeCapacityEstimate({
      blueprintId: 'url-shortener',
      dau: 3_000_000,
      readWriteRatio: 80,
      peakMultiplier: 6,
      cacheHitRatioPct: 50,
      avgPayloadKb: 4,
      runtime: 'dotnet10',
    });
    const highCache = computeCapacityEstimate({
      blueprintId: 'url-shortener',
      dau: 3_000_000,
      readWriteRatio: 80,
      peakMultiplier: 6,
      cacheHitRatioPct: 95,
      avgPayloadKb: 4,
      runtime: 'dotnet10',
    });

    expect(lowCache.peakTotalQps).toBe(highCache.peakTotalQps);
    expect(highCache.cacheMissReadQps).toBeCloseTo(lowCache.cacheMissReadQps / 10, 1);
    expect(highCache.originDbPeakQps).toBeLessThan(lowCache.originDbPeakQps * 0.2);
    expect(highCache.requiredDbReadReplicas).toBeLessThan(lowCache.requiredDbReadReplicas);
  });

  it('increasing Peak Multiplier raises peak QPS and CDN egress without altering 5-year storage', () => {
    const mild = computeCapacityEstimate({
      blueprintId: 'flash-sale-voucher',
      dau: 1_000_000,
      readWriteRatio: 30,
      peakMultiplier: 3,
      cacheHitRatioPct: 80,
      avgPayloadKb: 10,
      runtime: 'dotnet10',
    });
    const burst = computeCapacityEstimate({
      blueprintId: 'flash-sale-voucher',
      dau: 1_000_000,
      readWriteRatio: 30,
      peakMultiplier: 9,
      cacheHitRatioPct: 80,
      avgPayloadKb: 10,
      runtime: 'dotnet10',
    });

    expect(burst.peakTotalQps).toBeCloseTo(mild.peakTotalQps * 3, 1);
    expect(burst.peakCdnEgressGbps).toBeCloseTo(mild.peakCdnEgressGbps * 3, 1);
    expect(burst.fiveYearReplicatedStorageTb).toBe(mild.fiveYearReplicatedStorageTb);
  });

  it('increasing Avg Payload Size scales 5-year storage TB and CDN egress without changing QPS', () => {
    const small = computeCapacityEstimate({
      blueprintId: 'realtime-chat-feed',
      dau: 1_000_000,
      readWriteRatio: 20,
      peakMultiplier: 5,
      cacheHitRatioPct: 75,
      avgPayloadKb: 2,
      runtime: 'go',
    });
    const large = computeCapacityEstimate({
      blueprintId: 'realtime-chat-feed',
      dau: 1_000_000,
      readWriteRatio: 20,
      peakMultiplier: 5,
      cacheHitRatioPct: 75,
      avgPayloadKb: 32,
      runtime: 'go',
    });

    expect(large.peakTotalQps).toBe(small.peakTotalQps);
    expect(large.peakCdnEgressGbps).toBeCloseTo(small.peakCdnEgressGbps * 16, 1);
    expect(large.fiveYearReplicatedStorageTb).toBeGreaterThan(small.fiveYearReplicatedStorageTb * 10);
  });

  it('enforces exact 3x replication factor on 5-year storage footprint', () => {
    const est = computeCapacityEstimate(getBlueprint('flash-sale-voucher').defaultInputs);
    expect(est.fiveYearReplicatedStorageTb).toBeCloseTo(est.fiveYearRawStorageTb * 3, 1);
  });

  it('orders runtime pod requirements accurately: Go <= .NET 10 < Node.js under high load', () => {
    const est = computeCapacityEstimate({
      blueprintId: 'url-shortener',
      dau: 5_000_000,
      readWriteRatio: 80,
      peakMultiplier: 6,
      cacheHitRatioPct: 85,
      avgPayloadKb: 4,
      runtime: 'dotnet10',
    });

    expect(est.runtimePodComparison.go).toBeLessThanOrEqual(est.runtimePodComparison.dotnet10);
    expect(est.runtimePodComparison.dotnet10).toBeLessThan(est.runtimePodComparison.nodejs);
    expect(est.requiredAppPods).toBe(est.runtimePodComparison.dotnet10);
    expect(APP_RUNTIME_SPECS.go.qpsPerPod).toBeGreaterThan(APP_RUNTIME_SPECS.dotnet10.qpsPerPod);
    expect(APP_RUNTIME_SPECS.dotnet10.qpsPerPod).toBeGreaterThan(APP_RUNTIME_SPECS.nodejs.qpsPerPod);
  });

  it('detects overloaded tiers on baseline starter fleet under default high-scale workload', () => {
    const est = computeCapacityEstimate(getBlueprint('url-shortener').defaultInputs);
    expect(est.tiers).toHaveLength(5);
    expect(est.tiers.map((t) => t.id)).toEqual([
      'cdn',
      'api_gateway',
      'app_fleet',
      'redis_cache',
      'database',
    ]);
    expect(est.overloadedTiers).toContain('api_gateway');
    expect(est.overloadedTiers).toContain('app_fleet');
    expect(est.overloadedTiers).toContain('database');
    expect(est.overallStatus).toBe('overloaded');
  });

  it('detects primary DB write saturation even when cache hit ratio is 98%', () => {
    const est = computeCapacityEstimate(
      {
        blueprintId: 'realtime-chat-feed',
        dau: 10_000_000,
        readWriteRatio: 10,
        peakMultiplier: 10,
        cacheHitRatioPct: 98,
        avgPayloadKb: 4,
        runtime: 'go',
      },
      {
        cdnGbps: 200,
        apiGwNodes: 30,
        appPods: 100,
        redisShards: 20,
        dbPrimaryShards: 1, // Deliberately bottlenecked on writes!
        dbReadReplicas: 20,
      },
    );

    const dbTier = est.tiers.find((t) => t.id === 'database')!;
    expect(dbTier.status).toBe('overloaded');
    expect(dbTier.utilizationPct).toBeGreaterThan(100);
    expect(est.requiredDbPrimaryShards).toBeGreaterThan(1);
  });

  it('detects CDN egress overload when payload and DAU saturate provisioned CDN Gbps', () => {
    const est = computeCapacityEstimate(
      {
        blueprintId: 'url-shortener',
        dau: 5_000_000,
        readWriteRatio: 80,
        peakMultiplier: 8,
        cacheHitRatioPct: 95,
        avgPayloadKb: 64,
        runtime: 'dotnet10',
      },
      { cdnGbps: 5.0 },
    );

    const cdnTier = est.tiers.find((t) => t.id === 'cdn')!;
    expect(cdnTier.status).toBe('overloaded');
    expect(est.overloadedTiers).toContain('cdn');
  });

  it('1-click Auto-Scale resolves 100% of bottlenecks across all 3 blueprints and all 3 runtimes', () => {
    const blueprints: BlueprintId[] = ['url-shortener', 'flash-sale-voucher', 'realtime-chat-feed'];
    const runtimes: AppRuntime[] = ['dotnet10', 'go', 'nodejs'];

    for (const blueprintId of blueprints) {
      for (const runtime of runtimes) {
        const bp = getBlueprint(blueprintId);
        const inputs: CapacityInputs = { ...bp.defaultInputs, runtime };
        const scaledFleet = autoScaleFleet(inputs);
        const after = computeCapacityEstimate(inputs, scaledFleet);

        expect(after.overloadedTiers).toEqual([]);
        expect(after.bottlenecks).toEqual([]);
        expect(after.overallStatus).toBe('healthy');
        for (const tier of after.tiers) {
          expect(tier.status).toBe('healthy');
          expect(tier.utilizationPct).toBeLessThanOrEqual(65.1);
        }
      }
    }
  });

  it('1-click Auto-Scale resolves absolute worst-case maximum sliders (10M DAU, 100:1, 10x, 50% hit, 64KB)', () => {
    const extremeInputs: CapacityInputs = {
      blueprintId: 'realtime-chat-feed',
      dau: 10_000_000,
      readWriteRatio: 100,
      peakMultiplier: 10,
      cacheHitRatioPct: 50,
      avgPayloadKb: 64,
      runtime: 'nodejs',
    };
    const before = computeCapacityEstimate(extremeInputs);
    expect(before.overloadedTiers).toHaveLength(5);

    const scaled = autoScaleFleet(extremeInputs);
    const after = computeCapacityEstimate(extremeInputs, scaled);
    expect(after.overallStatus).toBe('healthy');
    expect(after.overloadedTiers).toHaveLength(0);
    expect(after.bottlenecks).toHaveLength(0);
    expect(after.monthlyCloudCostUsd).toBeGreaterThan(before.monthlyCloudCostUsd);
  });

  it('handles minimum boundary workload (10K DAU, 10:1, 3x, 98% hit, 1KB) without NaN or zero pods', () => {
    const tinyInputs: CapacityInputs = {
      blueprintId: 'url-shortener',
      dau: 10_000,
      readWriteRatio: 10,
      peakMultiplier: 3,
      cacheHitRatioPct: 98,
      avgPayloadKb: 1,
      runtime: 'go',
    };
    const est = computeCapacityEstimate(tinyInputs);
    expect(Number.isFinite(est.avgTotalQps)).toBe(true);
    expect(Number.isFinite(est.peakCdnEgressGbps)).toBe(true);
    expect(est.requiredAppPods).toBe(2); // HA minimum
    expect(est.requiredDbPrimaryShards).toBe(1);
    expect(est.requiredDbReadReplicas).toBe(1);
    expect(est.overallStatus).toBe('healthy');
  });

  it('itemizes monthly cloud cost accurately so total equals exact sum of all 5 tier costs', () => {
    const est = computeCapacityEstimate(getBlueprint('flash-sale-voucher').defaultInputs);
    const cb = est.costBreakdown;
    expect(cb.cdnUsd).toBeGreaterThan(0);
    expect(cb.apiGwUsd).toBeGreaterThan(0);
    expect(cb.appFleetUsd).toBeGreaterThan(0);
    expect(cb.redisUsd).toBeGreaterThan(0);
    expect(cb.databaseUsd).toBeGreaterThan(0);
    expect(cb.cdnUsd + cb.apiGwUsd + cb.appFleetUsd + cb.redisUsd + cb.databaseUsd).toBe(
      cb.totalMonthlyUsd,
    );
    expect(est.monthlyCloudCostUsd).toBe(cb.totalMonthlyUsd);
  });

  it('clamps out-of-range inputs safely within documented slider boundaries', () => {
    const clamped = clampCapacityInputs({
      blueprintId: 'url-shortener',
      dau: 500_000_000,
      readWriteRatio: 2,
      peakMultiplier: 99,
      cacheHitRatioPct: 12,
      avgPayloadKb: 512,
      runtime: 'dotnet10',
    });
    expect(clamped.dau).toBe(10_000_000);
    expect(clamped.readWriteRatio).toBe(10);
    expect(clamped.peakMultiplier).toBe(10);
    expect(clamped.cacheHitRatioPct).toBe(50);
    expect(clamped.avgPayloadKb).toBe(64);
  });

  it('maps DAU logarithmic slider smoothly and monotonically across 10K to 10M', () => {
    expect(dauToLogSlider(10_000)).toBe(0);
    expect(dauToLogSlider(10_000_000)).toBe(1000);
    expect(logSliderToDau(0)).toBe(10_000);
    expect(logSliderToDau(1000)).toBe(10_000_000);

    let prev = 0;
    for (let pos = 0; pos <= 1000; pos += 50) {
      const dau = logSliderToDau(pos);
      expect(dau).toBeGreaterThanOrEqual(prev);
      prev = dau;
    }
  });

  it('detects warning state cleanly between 75% and 99.9% utilization', () => {
    const est = computeCapacityEstimate(
      {
        blueprintId: 'url-shortener',
        dau: 2_500_000,
        readWriteRatio: 80,
        peakMultiplier: 6,
        cacheHitRatioPct: 82,
        avgPayloadKb: 4,
        runtime: 'dotnet10',
      },
      {
        cdnGbps: 10,
        apiGwNodes: 3, // 45k cap vs 28.125k = 62.5% healthy
        appPods: 10, // 35k cap vs 28.125k = 80.4% warning!
        redisShards: 2,
        dbPrimaryShards: 1,
        dbReadReplicas: 2, // 8k cap vs 5k = 62.5% healthy
      },
    );
    const appTier = est.tiers.find((t) => t.id === 'app_fleet')!;
    expect(appTier.status).toBe('warning');
    expect(est.overallStatus).toBe('warning');
    expect(est.bottlenecks).toEqual(['app_fleet']);
    expect(est.overloadedTiers).toEqual([]);
  });

  it('formats compact numbers, DAU labels, and USD cleanly', () => {
    expect(formatDau(10_000)).toBe('10K');
    expect(formatDau(2_500_000)).toBe('2.5M');
    expect(formatDau(10_000_000)).toBe('10M');
    expect(formatCompactNumber(28_125)).toBe('28.1K');
    expect(formatCompactNumber(1_250_000)).toBe('1.25M');
    expect(formatUsd(4820)).toBe('$4,820');
  });

  it('produces 4 ordered back-of-the-envelope worksheet derivation steps', () => {
    const est = computeCapacityEstimate(getBlueprint('url-shortener').defaultInputs);
    expect(est.worksheetSteps).toHaveLength(4);
    expect(est.worksheetSteps.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4]);
    expect(est.worksheetSteps[1]!.result).toContain('Origin DB QPS');
  });

  it('generates clean Markdown sizing specification report with no HTML tags', () => {
    const est = computeCapacityEstimate(getBlueprint('flash-sale-voucher').defaultInputs);
    const md = generateSizingMarkdown(est);
    expect(md).toContain('# System Design Capacity Worksheet');
    expect(md).toContain('Flash-Sale E-Commerce Voucher API');
    expect(md).toContain('5-Year Storage (3x Replication)');
    expect(md).not.toContain('<script');
  });

  it('matches Python FastAPI parity test vector exactly', () => {
    const est = computeCapacityEstimate({
      blueprintId: 'url-shortener',
      dau: 1_000_000,
      readWriteRatio: 50,
      peakMultiplier: 5,
      cacheHitRatioPct: 80,
      avgPayloadKb: 8,
      runtime: 'dotnet10',
    });

    // Exact cross-runtime parity checkpoints verified identically in pytest
    expect(est.avgWriteQps).toBe(23.15);
    expect(est.avgReadQps).toBe(1157.41);
    expect(est.peakTotalQps).toBe(5902.78);
    expect(est.cacheMissReadQps).toBe(1157.41);
    expect(est.originDbPeakQps).toBe(1273.15);
    expect(est.requiredAppPods).toBe(3);
    expect(est.runtimePodComparison).toEqual({ dotnet10: 3, go: 3, nodejs: 6 });
    expect(est.requiredDbPrimaryShards).toBe(1);
    expect(est.requiredDbReadReplicas).toBe(1);
    expect(est.peakCdnEgressGbps).toBe(0.37);
    expect(est.fiveYearReplicatedStorageTb).toBe(92.51);
  });
});
