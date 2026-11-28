import { describe, expect, it } from 'vitest';
import {
  APP_NODES_MAX,
  APP_NODES_MIN,
  CAMERA_PRESETS,
  CDN_NODES_MAX,
  CDN_NODES_MIN,
  DB_REPLICAS_MAX,
  DB_REPLICAS_MIN,
  DEFAULT_TOPOLOGY_3D_CONFIG,
  GATEWAY_NODES_MAX,
  REDIS_ENABLED_HIT_RATIO_PCT,
  REDIS_NODES_MAX,
  RPS_MAX,
  RPS_MIN,
  TIER_ORDER,
  TIER_SPECS,
  TRAFFIC_PRESETS,
  buildCacheHitWaypoints,
  buildFullStackWaypoints,
  computeAutoScaleConfig,
  computeTopologyTelemetry,
  formatCompactRps,
  samplePolylinePoint,
  sanitizeTopologyConfig,
  scaleTierBlades,
  type Topology3DConfig,
} from '../systemTopology3dEngine';

describe('systemTopology3dEngine — 3D Distributed Architecture Physics & Queueing Engine', () => {
  it('1. sanitizes and strictly clamps out-of-range config inputs', () => {
    const clamped = sanitizeTopologyConfig({
      rps: 999_999,
      appNodes: 99,
      redisEnabled: true,
      dbReplicas: 0,
      chaosMode: 'cache_stampede',
      cdnNodes: 1,
      gatewayNodes: 25,
      redisNodes: -3,
    });

    expect(clamped.rps).toBe(RPS_MAX);
    expect(clamped.appNodes).toBe(APP_NODES_MAX);
    expect(clamped.dbReplicas).toBe(DB_REPLICAS_MIN);
    expect(clamped.cdnNodes).toBe(CDN_NODES_MIN);
    expect(clamped.gatewayNodes).toBe(GATEWAY_NODES_MAX);
    expect(clamped.redisNodes).toBe(1);
    expect(clamped.chaosMode).toBe('cache_stampede');
  });

  it('2. falls back safely on NaN, negative RPS, and invalid chaos mode', () => {
    const sanitized = sanitizeTopologyConfig({
      rps: Number.NaN,
      appNodes: Number.POSITIVE_INFINITY,
      redisEnabled: false,
      dbReplicas: -10,
      chaosMode: 'invalid_mode' as Topology3DConfig['chaosMode'],
    });

    expect(sanitized.rps).toBe(RPS_MIN);
    expect(sanitized.appNodes).toBe(APP_NODES_MIN);
    expect(sanitized.dbReplicas).toBe(DB_REPLICAS_MIN);
    expect(sanitized.chaosMode).toBe('none');
  });

  it('3. computes healthy baseline hero telemetry with all 5 tiers in T1–T5 order', () => {
    const telemetry = computeTopologyTelemetry(DEFAULT_TOPOLOGY_3D_CONFIG);

    expect(telemetry.tiers.map((t) => t.id)).toEqual([...TIER_ORDER]);
    expect(telemetry.overallStatus).toBe('healthy');
    expect(telemetry.isRedisOnline).toBe(true);
    expect(telemetry.cacheHitRatioPct).toBe(REDIS_ENABLED_HIT_RATIO_PCT);
    expect(telemetry.dbReadOffloadPct).toBe(REDIS_ENABLED_HIT_RATIO_PCT);
    expect(telemetry.dropRate503Pct).toBe(0);
    expect(telemetry.endToEndP99Ms).toBeLessThan(20);
    expect(telemetry.primaryBottleneckTierId).toBeNull();
    expect(telemetry.saturatedTierIds).toHaveLength(0);
  });

  it('4. enforces exact 88% cache hit ratio on and 0% when Redis is disabled', () => {
    const redisOn = computeTopologyTelemetry({ ...DEFAULT_TOPOLOGY_3D_CONFIG, redisEnabled: true });
    const redisOff = computeTopologyTelemetry({ ...DEFAULT_TOPOLOGY_3D_CONFIG, redisEnabled: false });

    expect(redisOn.cacheHitRatioPct).toBe(88);
    expect(redisOn.dbReadOffloadPct).toBe(88);
    expect(redisOn.cacheHitQps + redisOn.originDbQps).toBe(redisOn.config.rps);

    expect(redisOff.isRedisOnline).toBe(false);
    expect(redisOff.cacheHitRatioPct).toBe(0);
    expect(redisOff.dbReadOffloadPct).toBe(0);
    expect(redisOff.cacheHitQps).toBe(0);
    expect(redisOff.originDbQps).toBe(redisOff.config.rps);
    expect(redisOff.tierMap.redis_cache.status).toBe('offline');
    expect(redisOff.tierMap.redis_cache.cpuPct).toBe(0);
  });

  it('5. keeps 5K RPS Normal preset calm with low CPU and zero 503 drops', () => {
    const normal = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: TRAFFIC_PRESETS.normal.rps,
    });

    expect(normal.overallStatus).toBe('healthy');
    expect(normal.dropRate503Pct).toBe(0);
    expect(normal.endToEndP99Ms).toBeLessThan(18);
    for (const tier of normal.tiers) {
      expect(tier.cpuPct).toBeLessThan(30);
    }
  });

  it('6. elevates App Cluster & Sharded DB utilization under 40K RPS Flash Sale preset', () => {
    const flash = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: TRAFFIC_PRESETS.flash_sale.rps,
    });

    expect(flash.tierMap.app_cluster.status).toBe('elevated');
    expect(flash.tierMap.sharded_db.status).toBe('elevated');
    expect(flash.overallStatus).toBe('elevated');
    expect(flash.primaryBottleneckTierId).toBe('app_cluster');
    expect(flash.dropRate503Pct).toBe(0);
  });

  it('7. saturates racks past 90% CPU and climbs P99 past 1,200ms under 100K RPS Black Friday on baseline fleet', () => {
    const storm = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: TRAFFIC_PRESETS.black_friday.rps,
    });

    expect(storm.overallStatus).toBe('saturated');
    expect(storm.tierMap.app_cluster.cpuPct).toBeGreaterThanOrEqual(90);
    expect(storm.tierMap.sharded_db.cpuPct).toBeGreaterThanOrEqual(90);
    expect(storm.saturatedTierIds).toContain('app_cluster');
    expect(storm.saturatedTierIds).toContain('sharded_db');
    expect(storm.endToEndP99Ms).toBeGreaterThan(1_200);
    expect(storm.dropRate503Pct).toBeGreaterThan(30);
  });

  it('8. Cache Stampede disables effective Redis, amplifies DB load, pushes P99 > 1,400ms & triggers >= 34% 503 drops', () => {
    const stampede = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      redisEnabled: false,
      chaosMode: 'cache_stampede',
    });

    expect(stampede.isRedisOnline).toBe(false);
    expect(stampede.cacheHitRatioPct).toBe(0);
    expect(stampede.originDbQps).toBeGreaterThan(stampede.config.rps);
    expect(stampede.tierMap.redis_cache.status).toBe('offline');
    expect(stampede.tierMap.sharded_db.status).toBe('saturated');
    expect(stampede.primaryBottleneckTierId).toBe('sharded_db');
    expect(stampede.endToEndP99Ms).toBeGreaterThan(1_400);
    expect(stampede.dropRate503Pct).toBeGreaterThanOrEqual(34);
  });

  it('9. Cache Stampede overrides redisEnabled=true in chaos physics and melts down 100K RPS DB rack', () => {
    const extreme = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 100_000,
      redisEnabled: true,
      chaosMode: 'cache_stampede',
    });

    expect(extreme.isRedisOnline).toBe(false);
    expect(extreme.cacheHitRatioPct).toBe(0);
    expect(extreme.originDbQps).toBe(118_000);
    expect(extreme.primaryBottleneckTierId).toBe('sharded_db');
    expect(extreme.endToEndP99Ms).toBeGreaterThan(2_000);
    expect(extreme.dropRate503Pct).toBeGreaterThan(50);
  });

  it('10. DB Failover chaos reduces effective DB replica capacity and adds election tail latency', () => {
    const steady = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 25_000,
      dbReplicas: 2,
      chaosMode: 'none',
    });
    const failover = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 25_000,
      dbReplicas: 2,
      chaosMode: 'db_failover',
    });

    expect(failover.tierMap.sharded_db.effectiveNodes).toBe(1);
    expect(failover.tierMap.sharded_db.capacityQps).toBeLessThan(steady.tierMap.sharded_db.capacityQps);
    expect(failover.tierMap.sharded_db.cpuPct).toBeGreaterThan(steady.tierMap.sharded_db.cpuPct);
    expect(failover.endToEndP99Ms).toBeGreaterThan(steady.endToEndP99Ms + 250);
  });

  it('11. DB Failover with single replica degrades safely without division-by-zero', () => {
    const singleFailover = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 15_000,
      dbReplicas: 1,
      chaosMode: 'db_failover',
    });

    expect(singleFailover.tierMap.sharded_db.effectiveNodes).toBeCloseTo(0.45, 2);
    expect(Number.isFinite(singleFailover.endToEndP99Ms)).toBe(true);
    expect(Number.isFinite(singleFailover.dropRate503Pct)).toBe(true);
    expect(singleFailover.tierMap.sharded_db.status).toBe('saturated');
  });

  it('12. 1-Click Auto-Scale recovers 100K RPS Cache Stampede to 0.00% 503 drops and < 22ms P99', () => {
    const meltdownConfig: Topology3DConfig = {
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 100_000,
      redisEnabled: false,
      chaosMode: 'cache_stampede',
    };
    const scaledConfig = computeAutoScaleConfig(meltdownConfig);
    const recovered = computeTopologyTelemetry(scaledConfig);

    expect(scaledConfig.redisEnabled).toBe(true);
    expect(scaledConfig.chaosMode).toBe('none');
    expect(scaledConfig.appNodes).toBeLessThanOrEqual(APP_NODES_MAX);
    expect(scaledConfig.dbReplicas).toBeLessThanOrEqual(DB_REPLICAS_MAX);
    expect(recovered.dropRate503Pct).toBe(0);
    expect(recovered.endToEndP99Ms).toBeLessThan(22);
    expect(recovered.cacheHitRatioPct).toBe(88);
    expect(recovered.saturatedTierIds).toHaveLength(0);
    expect(recovered.overallStatus).toBe('healthy');
  });

  it('13. 1-Click Auto-Scale guarantees 0.00% 503 and < 25ms P99 across full 1K–100K RPS sweep', () => {
    const loads = [1_000, 5_000, 18_000, 40_000, 65_000, 85_000, 100_000];
    for (const rps of loads) {
      const target = computeAutoScaleConfig({
        rps,
        appNodes: 2,
        redisEnabled: false,
        dbReplicas: 1,
        chaosMode: 'cache_stampede',
      });
      const result = computeTopologyTelemetry(target);
      expect(result.dropRate503Pct).toBe(0);
      expect(result.endToEndP99Ms).toBeLessThan(25);
      expect(result.overallStatus).toBe('healthy');
    }
  });

  it('14. 1-Click Auto-Scale recovers active DB Failover chaos to healthy state', () => {
    const target = computeAutoScaleConfig({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 50_000,
      dbReplicas: 1,
      chaosMode: 'db_failover',
    });
    const result = computeTopologyTelemetry(target);
    expect(target.chaosMode).toBe('none');
    expect(result.dropRate503Pct).toBe(0);
    expect(result.endToEndP99Ms).toBeLessThan(25);
  });

  it('15. exhibits strict monotonicity as RPS increases on fixed infrastructure', () => {
    const rpsSteps = [5_000, 15_000, 30_000, 50_000, 75_000, 100_000];
    const results = rpsSteps.map((rps) =>
      computeTopologyTelemetry({ ...DEFAULT_TOPOLOGY_3D_CONFIG, rps }),
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.endToEndP99Ms).toBeGreaterThanOrEqual(results[i - 1]!.endToEndP99Ms);
      expect(results[i]!.dropRate503Pct).toBeGreaterThanOrEqual(results[i - 1]!.dropRate503Pct);
      expect(results[i]!.tierMap.app_cluster.demandRatio).toBeGreaterThan(
        results[i - 1]!.tierMap.app_cluster.demandRatio,
      );
    }
  });

  it('16. adding App Cluster blades directly reduces App demand ratio and latency under 60K load', () => {
    const fourNodes = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 60_000,
      appNodes: 4,
    });
    const eightNodes = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 60_000,
      appNodes: 8,
    });

    expect(eightNodes.tierMap.app_cluster.demandRatio).toBeLessThan(
      fourNodes.tierMap.app_cluster.demandRatio,
    );
    expect(eightNodes.tierMap.app_cluster.latencyContributionMs).toBeLessThan(
      fourNodes.tierMap.app_cluster.latencyContributionMs,
    );
  });

  it('17. adding Sharded DB replicas reduces DB saturation and HTTP 503 drops', () => {
    const oneReplica = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 40_000,
      appNodes: 8,
      dbReplicas: 1,
    });
    const fourReplicas = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 40_000,
      appNodes: 8,
      dbReplicas: 4,
    });

    expect(oneReplica.tierMap.sharded_db.status).toBe('saturated');
    expect(fourReplicas.tierMap.sharded_db.status).toBe('healthy');
    expect(fourReplicas.dropRate503Pct).toBeLessThan(oneReplica.dropRate503Pct);
  });

  it('18. scaleTierBlades increments and decrements all 5 tiers accurately', () => {
    const base = { ...DEFAULT_TOPOLOGY_3D_CONFIG };
    expect(scaleTierBlades(base, 'edge_cdn', 1).cdnNodes).toBe(base.cdnNodes + 1);
    expect(scaleTierBlades(base, 'edge_cdn', -1).cdnNodes).toBe(base.cdnNodes - 1);
    expect(scaleTierBlades(base, 'api_gateway', 1).gatewayNodes).toBe(base.gatewayNodes + 1);
    expect(scaleTierBlades(base, 'app_cluster', 1).appNodes).toBe(base.appNodes + 1);
    expect(scaleTierBlades(base, 'redis_cache', 1).redisNodes).toBe(base.redisNodes + 1);
    expect(scaleTierBlades(base, 'sharded_db', 1).dbReplicas).toBe(base.dbReplicas + 1);
  });

  it('19. scaleTierBlades (+1) on offline or stampeding Redis re-enables Redis & clears stampede', () => {
    const stampede: Topology3DConfig = {
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      redisEnabled: false,
      chaosMode: 'cache_stampede',
    };
    const restored = scaleTierBlades(stampede, 'redis_cache', 1);
    expect(restored.redisEnabled).toBe(true);
    expect(restored.chaosMode).toBe('none');
  });

  it('20. scaleTierBlades enforces min/max hardware rack caps cleanly', () => {
    const maxed: Topology3DConfig = {
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      cdnNodes: CDN_NODES_MAX,
      gatewayNodes: GATEWAY_NODES_MAX,
      appNodes: APP_NODES_MAX,
      redisNodes: REDIS_NODES_MAX,
      dbReplicas: DB_REPLICAS_MAX,
    };
    expect(scaleTierBlades(maxed, 'edge_cdn', 1).cdnNodes).toBe(CDN_NODES_MAX);
    expect(scaleTierBlades(maxed, 'api_gateway', 1).gatewayNodes).toBe(GATEWAY_NODES_MAX);
    expect(scaleTierBlades(maxed, 'app_cluster', 1).appNodes).toBe(APP_NODES_MAX);
    expect(scaleTierBlades(maxed, 'redis_cache', 1).redisNodes).toBe(REDIS_NODES_MAX);
    expect(scaleTierBlades(maxed, 'sharded_db', 1).dbReplicas).toBe(DB_REPLICAS_MAX);

    const minned: Topology3DConfig = {
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      appNodes: APP_NODES_MIN,
      dbReplicas: DB_REPLICAS_MIN,
    };
    expect(scaleTierBlades(minned, 'app_cluster', -1).appNodes).toBe(APP_NODES_MIN);
    expect(scaleTierBlades(minned, 'sharded_db', -1).dbReplicas).toBe(DB_REPLICAS_MIN);
  });

  it('21. computes exact itemized monthly cloud cost summing across all 5 tiers', () => {
    const telemetry = computeTopologyTelemetry(DEFAULT_TOPOLOGY_3D_CONFIG);
    const tierSum = telemetry.tiers.reduce((acc, t) => acc + t.monthlyCostUsd, 0);
    expect(telemetry.monthlyCloudCostUsd).toBe(tierSum);
    expect(telemetry.monthlyCloudCostUsd).toBeGreaterThan(2_000);

    const redisOff = computeTopologyTelemetry({ ...DEFAULT_TOPOLOGY_3D_CONFIG, redisEnabled: false });
    expect(redisOff.tierMap.redis_cache.monthlyCostUsd).toBe(0);
    expect(redisOff.monthlyCloudCostUsd).toBeLessThan(telemetry.monthlyCloudCostUsd);
  });

  it('22. conserves throughput: droppedRps + successfulRps === config.rps in all regimes', () => {
    const configs: Topology3DConfig[] = [
      DEFAULT_TOPOLOGY_3D_CONFIG,
      { ...DEFAULT_TOPOLOGY_3D_CONFIG, rps: 100_000 },
      { ...DEFAULT_TOPOLOGY_3D_CONFIG, rps: 100_000, redisEnabled: false, chaosMode: 'cache_stampede' },
      { ...DEFAULT_TOPOLOGY_3D_CONFIG, rps: 45_000, chaosMode: 'db_failover' },
      computeAutoScaleConfig({ ...DEFAULT_TOPOLOGY_3D_CONFIG, rps: 100_000 }),
    ];

    for (const cfg of configs) {
      const t = computeTopologyTelemetry(cfg);
      expect(t.droppedRps + t.successfulRps).toBe(t.config.rps);
    }
  });

  it('23. packet stream plan enables emerald cache-hit bypass lane when Redis is online', () => {
    const telemetry = computeTopologyTelemetry(DEFAULT_TOPOLOGY_3D_CONFIG);
    expect(telemetry.packetPlan.redisBypassActive).toBe(true);
    expect(telemetry.packetPlan.streams.cacheHit.activeCount).toBeGreaterThan(20);
    expect(telemetry.packetPlan.streams.cacheHit.colorHex).toBe('#059669');
    expect(telemetry.packetPlan.streams.fullStack.activeCount).toBeGreaterThan(10);
    expect(telemetry.packetPlan.totalActiveSparks).toBe(0);
    expect(telemetry.packetPlan.sparkEmitters).toHaveLength(0);
  });

  it('24. packet stream plan extinguishes emerald bypass and surges DB stream during Cache Stampede', () => {
    const normal = computeTopologyTelemetry(DEFAULT_TOPOLOGY_3D_CONFIG);
    const stampede = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      redisEnabled: false,
      chaosMode: 'cache_stampede',
    });

    expect(stampede.packetPlan.redisBypassActive).toBe(false);
    expect(stampede.packetPlan.streams.cacheHit.activeCount).toBe(0);
    expect(stampede.packetPlan.streams.fullStack.activeCount).toBeGreaterThan(
      normal.packetPlan.streams.fullStack.activeCount,
    );
    expect(stampede.packetPlan.streams.fullStack.colorHex).toBe('#dc2626');
  });

  it('25. packet stream density and velocity scale up smoothly from 5K to 100K RPS', () => {
    const low = computeTopologyTelemetry({ ...DEFAULT_TOPOLOGY_3D_CONFIG, rps: 5_000 });
    const high = computeTopologyTelemetry(
      computeAutoScaleConfig({ ...DEFAULT_TOPOLOGY_3D_CONFIG, rps: 100_000 }),
    );

    expect(high.packetPlan.totalActivePackets).toBeGreaterThan(low.packetPlan.totalActivePackets);
    expect(high.packetPlan.streams.cacheHit.speedUnitsPerSec).toBeGreaterThan(
      low.packetPlan.streams.cacheHit.speedUnitsPerSec,
    );
  });

  it('26. spawns crimson 503 spark emitters anchored on every saturated rack tier', () => {
    const meltdown = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      rps: 100_000,
      redisEnabled: false,
      chaosMode: 'cache_stampede',
    });

    expect(meltdown.packetPlan.sparkEmitters.length).toBe(meltdown.saturatedTierIds.length);
    expect(meltdown.packetPlan.totalActiveSparks).toBeGreaterThan(40);
    const dbEmitter = meltdown.packetPlan.sparkEmitters.find((e) => e.tierId === 'sharded_db');
    expect(dbEmitter).toBeDefined();
    expect(dbEmitter!.origin.x).toBe(TIER_SPECS.sharded_db.anchor.x);
    expect(dbEmitter!.sparkCount).toBeGreaterThanOrEqual(30);
  });

  it('27. samplePolylinePoint interpolates endpoints, midpoints, and clamps out-of-bounds t', () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
    ];

    expect(samplePolylinePoint(pts, 0)).toEqual({ x: 0, y: 0, z: 0 });
    expect(samplePolylinePoint(pts, 1)).toEqual({ x: 10, y: 10, z: 0 });
    expect(samplePolylinePoint(pts, 0.5)).toEqual({ x: 10, y: 0, z: 0 });
    expect(samplePolylinePoint(pts, -2)).toEqual({ x: 0, y: 0, z: 0 });
    expect(samplePolylinePoint(pts, 5)).toEqual({ x: 10, y: 10, z: 0 });
  });

  it('28. fiber-link waypoints connect T1→T2→T3→T4 bypass and T1→T2→T3→T5 full-stack cleanly', () => {
    const cachePath = buildCacheHitWaypoints();
    const dbPath = buildFullStackWaypoints();

    expect(cachePath.some((p) => p.x === TIER_SPECS.redis_cache.anchor.x && p.z === TIER_SPECS.redis_cache.anchor.z)).toBe(true);
    expect(dbPath[dbPath.length - 1]!.x).toBe(TIER_SPECS.sharded_db.anchor.x);
    expect(dbPath[dbPath.length - 1]!.z).toBe(TIER_SPECS.sharded_db.anchor.z);
  });

  it('29. defines all 3 camera presets with finite 3D poses and bilingual labels', () => {
    expect(Object.keys(CAMERA_PRESETS)).toEqual(['isometric', 'data_plane', 'db_bottleneck']);
    for (const preset of Object.values(CAMERA_PRESETS)) {
      expect(Number.isFinite(preset.position.x)).toBe(true);
      expect(Number.isFinite(preset.position.y)).toBe(true);
      expect(Number.isFinite(preset.position.z)).toBe(true);
      expect(preset.label.en.length).toBeGreaterThan(5);
      expect(preset.label.vi.length).toBeGreaterThan(5);
    }
  });

  it('30. formatCompactRps formats traffic figures cleanly for HUD pills', () => {
    expect(formatCompactRps(5_000)).toBe('5K');
    expect(formatCompactRps(18_500)).toBe('18.5K');
    expect(formatCompactRps(40_000)).toBe('40K');
    expect(formatCompactRps(100_000)).toBe('100K');
    expect(formatCompactRps(950)).toBe('950');
  });

  it('31. exposes accurate canScaleUp/canScaleDown affordances and synchronized tierMap', () => {
    const telemetry = computeTopologyTelemetry({
      ...DEFAULT_TOPOLOGY_3D_CONFIG,
      appNodes: APP_NODES_MAX,
      dbReplicas: DB_REPLICAS_MIN,
      redisEnabled: false,
    });

    expect(telemetry.tierMap.app_cluster.canScaleUp).toBe(false);
    expect(telemetry.tierMap.app_cluster.canScaleDown).toBe(true);
    expect(telemetry.tierMap.sharded_db.canScaleUp).toBe(true);
    expect(telemetry.tierMap.sharded_db.canScaleDown).toBe(false);
    expect(telemetry.tierMap.redis_cache.canScaleUp).toBe(true);
    expect(telemetry.tierMap.redis_cache.canScaleDown).toBe(false);

    for (const tier of telemetry.tiers) {
      expect(telemetry.tierMap[tier.id]).toEqual(tier);
    }
  });

  it('32. guarantees pure determinism across repeated invocations', () => {
    const cfg: Topology3DConfig = {
      rps: 64_000,
      appNodes: 5,
      redisEnabled: true,
      dbReplicas: 3,
      chaosMode: 'db_failover',
    };
    const first = computeTopologyTelemetry(cfg);
    const second = computeTopologyTelemetry(cfg);
    expect(first).toEqual(second);
  });
});
