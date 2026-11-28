import type { BilingualText } from '../types/lms';

export type TopologyTierId =
  | 'edge_cdn'
  | 'api_gateway'
  | 'app_cluster'
  | 'redis_cache'
  | 'sharded_db';

export type ChaosMode = 'none' | 'cache_stampede' | 'db_failover';

export type CameraPresetId = 'isometric' | 'data_plane' | 'db_bottleneck';

export type TrafficPresetId = 'normal' | 'flash_sale' | 'black_friday';

export type TierHealthState = 'healthy' | 'elevated' | 'saturated' | 'offline';

export type PacketStreamKind = 'cache_hit' | 'full_stack' | 'dropped_503';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface Topology3DConfig {
  rps: number; // 1_000 .. 100_000
  appNodes: number; // 2 .. 12
  redisEnabled: boolean;
  dbReplicas: number; // 1 .. 6
  chaosMode: ChaosMode;
  cdnNodes?: number; // 2 .. 8
  gatewayNodes?: number; // 2 .. 8
  redisNodes?: number; // 1 .. 6
}

export interface NormalizedTopology3DConfig {
  rps: number;
  appNodes: number;
  redisEnabled: boolean;
  dbReplicas: number;
  chaosMode: ChaosMode;
  cdnNodes: number;
  gatewayNodes: number;
  redisNodes: number;
}

export interface TierSpecDefinition {
  id: TopologyTierId;
  code: 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  name: BilingualText;
  shortLabel: string;
  role: BilingualText;
  minNodes: number;
  maxNodes: number;
  capacityPerNodeQps: number;
  baseLatencyMs: number;
  monthlyCostPerNodeUsd: number;
  anchor: Vec3Tuple;
  accentHex: string;
}

export interface TierTelemetry {
  id: TopologyTierId;
  code: 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  name: BilingualText;
  shortLabel: string;
  role: BilingualText;
  activeNodes: number;
  effectiveNodes: number;
  minNodes: number;
  maxNodes: number;
  loadQps: number;
  capacityQps: number;
  demandRatio: number; // raw load / capacity (can exceed 1.0 under overload)
  cpuPct: number; // clamped 0..100 for meter display
  latencyContributionMs: number;
  dropRatePct: number;
  status: TierHealthState;
  monthlyCostUsd: number;
  canScaleUp: boolean;
  canScaleDown: boolean;
  anchor: Vec3Tuple;
}

export interface PacketStreamDescriptor {
  kind: PacketStreamKind;
  activeCount: number;
  maxCount: number;
  speedUnitsPerSec: number;
  colorHex: string;
  waypoints: Vec3Tuple[];
}

export interface SparkEmitterDescriptor {
  tierId: TopologyTierId;
  origin: Vec3Tuple;
  sparkCount: number;
  intensity: number; // 0..1
}

export interface PacketStreamPlan {
  streams: {
    cacheHit: PacketStreamDescriptor;
    fullStack: PacketStreamDescriptor;
  };
  sparkEmitters: SparkEmitterDescriptor[];
  totalActivePackets: number;
  totalActiveSparks: number;
  redisBypassActive: boolean;
}

export interface TopologyTelemetry {
  config: NormalizedTopology3DConfig;
  tiers: TierTelemetry[];
  tierMap: Record<TopologyTierId, TierTelemetry>;
  isRedisOnline: boolean;
  cacheHitRatioPct: number; // 0 or 88
  dbReadOffloadPct: number; // 0 or 88
  cacheHitQps: number;
  originDbQps: number;
  endToEndP99Ms: number;
  dropRate503Pct: number;
  droppedRps: number;
  successfulRps: number;
  monthlyCloudCostUsd: number;
  primaryBottleneckTierId: TopologyTierId | null;
  saturatedTierIds: TopologyTierId[];
  overallStatus: TierHealthState;
  autoScaleTarget: NormalizedTopology3DConfig;
  packetPlan: PacketStreamPlan;
}

export interface CameraPresetPose {
  id: CameraPresetId;
  label: BilingualText;
  position: Vec3Tuple;
  target: Vec3Tuple;
}

// ============================================================================
// Constants & Deterministic Architecture Specifications
// ============================================================================

export const RPS_MIN = 1_000;
export const RPS_MAX = 100_000;

export const APP_NODES_MIN = 2;
export const APP_NODES_MAX = 12;

export const DB_REPLICAS_MIN = 1;
export const DB_REPLICAS_MAX = 6;

export const CDN_NODES_MIN = 2;
export const CDN_NODES_MAX = 8;

export const GATEWAY_NODES_MIN = 2;
export const GATEWAY_NODES_MAX = 8;

export const REDIS_NODES_MIN = 1;
export const REDIS_NODES_MAX = 6;

export const REDIS_ENABLED_HIT_RATIO_PCT = 88;
export const CACHE_STAMPEDE_DB_AMPLIFICATION = 1.18;
export const SATURATION_CPU_THRESHOLD = 0.9;
export const ELEVATED_CPU_THRESHOLD = 0.72;
export const AUTO_SCALE_TARGET_UTILIZATION = 0.72;

export const TIER_ORDER: readonly TopologyTierId[] = [
  'edge_cdn',
  'api_gateway',
  'app_cluster',
  'redis_cache',
  'sharded_db',
] as const;

export const TIER_SPECS: Record<TopologyTierId, TierSpecDefinition> = {
  edge_cdn: {
    id: 'edge_cdn',
    code: 'T1',
    name: { en: 'Edge CDN', vi: 'Edge CDN Toàn Cầu' },
    shortLabel: 'T1 EDGE CDN',
    role: {
      en: 'Global Anycast PoPs, TLS 1.3 Termination & DDoS Shield',
      vi: 'PoP Anycast toàn cầu, giải mã TLS 1.3 & lá chắn DDoS',
    },
    minNodes: CDN_NODES_MIN,
    maxNodes: CDN_NODES_MAX,
    capacityPerNodeQps: 36_000,
    baseLatencyMs: 1.6,
    monthlyCostPerNodeUsd: 110,
    anchor: { x: -7.0, y: 0, z: 0.55 },
    accentHex: '#0284c7',
  },
  api_gateway: {
    id: 'api_gateway',
    code: 'T2',
    name: { en: 'API Gateway', vi: 'Cổng API Gateway' },
    shortLabel: 'T2 API GW',
    role: {
      en: 'Envoy L7 Mesh, Token-Bucket Rate Limiter & JWT Auth',
      vi: 'Envoy L7 Mesh, giới hạn tốc độ Token-Bucket & xác thực JWT',
    },
    minNodes: GATEWAY_NODES_MIN,
    maxNodes: GATEWAY_NODES_MAX,
    capacityPerNodeQps: 28_000,
    baseLatencyMs: 2.1,
    monthlyCostPerNodeUsd: 155,
    anchor: { x: -3.5, y: 0, z: 0.55 },
    accentHex: '#1d4ed8',
  },
  app_cluster: {
    id: 'app_cluster',
    code: 'T3',
    name: { en: 'App Cluster', vi: 'Cụm App Stateless' },
    shortLabel: 'T3 APP CLUSTER',
    role: {
      en: 'Stateless .NET 10 / Kestrel Compute Blades & Business Logic',
      vi: 'Cụm máy chủ ứng dụng .NET 10 / Kestrel xử lý nghiệp vụ không trạng thái',
    },
    minNodes: APP_NODES_MIN,
    maxNodes: APP_NODES_MAX,
    capacityPerNodeQps: 12_000,
    baseLatencyMs: 4.2,
    monthlyCostPerNodeUsd: 195,
    anchor: { x: 0.0, y: 0, z: 0.55 },
    accentHex: '#2563eb',
  },
  redis_cache: {
    id: 'redis_cache',
    code: 'T4',
    name: { en: 'Redis Cache', vi: 'Cụm Redis Cache' },
    shortLabel: 'T4 REDIS CACHE',
    role: {
      en: 'In-Memory Read-Through Cluster (88% Hit Bypass & Lock Shield)',
      vi: 'Bộ nhớ đệm nội bộ Redis (88% trúng cache giảm tải trực tiếp cho DB)',
    },
    minNodes: REDIS_NODES_MIN,
    maxNodes: REDIS_NODES_MAX,
    capacityPerNodeQps: 34_000,
    baseLatencyMs: 1.3,
    monthlyCostPerNodeUsd: 240,
    anchor: { x: 3.1, y: 0, z: -2.95 },
    accentHex: '#059669',
  },
  sharded_db: {
    id: 'sharded_db',
    code: 'T5',
    name: { en: 'Sharded DB', vi: 'CSDL Phân Mảnh' },
    shortLabel: 'T5 SHARDED DB',
    role: {
      en: 'PostgreSQL 16 NVMe Sharded Primary & Read Replicas',
      vi: 'Cụm PostgreSQL 16 NVMe phân mảnh Primary & Read Replicas',
    },
    minNodes: DB_REPLICAS_MIN,
    maxNodes: DB_REPLICAS_MAX,
    capacityPerNodeQps: 3_200,
    baseLatencyMs: 5.6,
    monthlyCostPerNodeUsd: 540,
    anchor: { x: 6.2, y: 0, z: 1.25 },
    accentHex: '#4338ca',
  },
};

export const DEFAULT_TOPOLOGY_3D_CONFIG: NormalizedTopology3DConfig = {
  rps: 18_000,
  appNodes: 4,
  redisEnabled: true,
  dbReplicas: 2,
  chaosMode: 'none',
  cdnNodes: 3,
  gatewayNodes: 3,
  redisNodes: 3,
};

export const TRAFFIC_PRESETS: Record<
  TrafficPresetId,
  { id: TrafficPresetId; rps: number; label: BilingualText; shortLabel: string }
> = {
  normal: {
    id: 'normal',
    rps: 5_000,
    label: { en: '5K RPS Normal', vi: '5K RPS Bình Thường' },
    shortLabel: '5K Normal',
  },
  flash_sale: {
    id: 'flash_sale',
    rps: 40_000,
    label: { en: '40K RPS Flash Sale', vi: '40K RPS Flash Sale' },
    shortLabel: '40K Flash Sale',
  },
  black_friday: {
    id: 'black_friday',
    rps: 100_000,
    label: { en: '100K RPS Black Friday', vi: '100K RPS Black Friday' },
    shortLabel: '100K Black Friday',
  },
};

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPresetPose> = {
  isometric: {
    id: 'isometric',
    label: { en: 'ISOMETRIC ARCHITECT', vi: 'KIẾN TRÚC ISOMETRIC' },
    position: { x: 0.4, y: 10.6, z: 14.8 },
    target: { x: 0.0, y: 0.85, z: -0.25 },
  },
  data_plane: {
    id: 'data_plane',
    label: { en: 'DATA-PLANE LOW ANGLE', vi: 'GÓC THẤP LUỒNG GÓI TIN' },
    position: { x: -11.4, y: 3.7, z: 7.4 },
    target: { x: 1.4, y: 1.0, z: -0.1 },
  },
  db_bottleneck: {
    id: 'db_bottleneck',
    label: { en: 'DB BOTTLENECK FOCUS', vi: 'TIÊU ĐIỂM NÚT THẮT DB' },
    position: { x: 7.6, y: 5.6, z: 7.6 },
    target: { x: 4.3, y: 1.0, z: -0.35 },
  },
};

// ============================================================================
// Pure Utility & Math Helpers
// ============================================================================

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function sanitizeTopologyConfig(config: Topology3DConfig): NormalizedTopology3DConfig {
  const chaosMode: ChaosMode =
    config.chaosMode === 'cache_stampede' || config.chaosMode === 'db_failover'
      ? config.chaosMode
      : 'none';

  return {
    rps: clampInt(config.rps, RPS_MIN, RPS_MAX),
    appNodes: clampInt(config.appNodes, APP_NODES_MIN, APP_NODES_MAX),
    redisEnabled: Boolean(config.redisEnabled),
    dbReplicas: clampInt(config.dbReplicas, DB_REPLICAS_MIN, DB_REPLICAS_MAX),
    chaosMode,
    cdnNodes: clampInt(config.cdnNodes ?? DEFAULT_TOPOLOGY_3D_CONFIG.cdnNodes, CDN_NODES_MIN, CDN_NODES_MAX),
    gatewayNodes: clampInt(
      config.gatewayNodes ?? DEFAULT_TOPOLOGY_3D_CONFIG.gatewayNodes,
      GATEWAY_NODES_MIN,
      GATEWAY_NODES_MAX,
    ),
    redisNodes: clampInt(
      config.redisNodes ?? DEFAULT_TOPOLOGY_3D_CONFIG.redisNodes,
      REDIS_NODES_MIN,
      REDIS_NODES_MAX,
    ),
  };
}

/**
 * Deterministic queueing latency contribution (M/M/c hockey-stick curve).
 * Smoothly climbs as utilization passes 75%, then spikes steeply past 90% saturation.
 */
function computeTierLatencyMs(
  tierId: TopologyTierId,
  baseMs: number,
  demandRatio: number,
  chaosMode: ChaosMode,
  isOffline: boolean,
): number {
  if (isOffline) return 0;

  let latency: number;
  if (demandRatio <= 0.75) {
    latency = baseMs * (1 + 0.5 * demandRatio * demandRatio);
  } else if (demandRatio < SATURATION_CPU_THRESHOLD) {
    const ramp = (demandRatio - 0.75) / (SATURATION_CPU_THRESHOLD - 0.75);
    latency = baseMs * (1 + 0.5 * demandRatio * demandRatio + 8.5 * ramp * ramp);
  } else {
    const excess = Math.min(3.5, demandRatio - SATURATION_CPU_THRESHOLD);
    latency = baseMs * (1 + 8.5 + 92 * Math.pow(excess + 0.15, 1.25));
  }

  // Chaos contention penalties (DB connection-pool exhaustion / failover leader election)
  if (tierId === 'sharded_db' && chaosMode === 'cache_stampede') {
    const severity = Math.min(1, Math.max(0.25, demandRatio / 1.2));
    latency += 780 * severity;
  }
  if (tierId === 'sharded_db' && chaosMode === 'db_failover') {
    latency += 280;
  }

  return roundTo(Math.min(2_650, latency), 1);
}

/**
 * Deterministic per-tier HTTP 503 shedding probability (%).
 * Zero drops below 90% utilization; ramps cleanly once saturated.
 */
function computeTierDropRatePct(demandRatio: number, isOffline: boolean): number {
  if (isOffline || demandRatio <= SATURATION_CPU_THRESHOLD) {
    return 0;
  }
  if (demandRatio <= 1.0) {
    const brownout = ((demandRatio - SATURATION_CPU_THRESHOLD) / (1.0 - SATURATION_CPU_THRESHOLD)) * 4.5;
    return roundTo(brownout, 2);
  }
  const overload = demandRatio - 1.0;
  const pct = 4.5 + (overload / (overload + 0.58)) * 79;
  return roundTo(Math.min(92, pct), 2);
}

function classifyTierHealth(demandRatio: number, isOffline: boolean): TierHealthState {
  if (isOffline) return 'offline';
  if (demandRatio >= SATURATION_CPU_THRESHOLD) return 'saturated';
  if (demandRatio >= ELEVATED_CPU_THRESHOLD) return 'elevated';
  return 'healthy';
}

// ============================================================================
// Auto-Scale & Direct Blade Scaling Actions
// ============================================================================

/**
 * Computes the optimal 1-Click Auto-Scale configuration for any incoming RPS:
 * restores Redis, clears active chaos, and sizes all 5 tiers so every tier stays
 * well below saturation (0.00% HTTP 503 drops & end-to-end P99 < 22ms even at 100K RPS).
 */
export function computeAutoScaleConfig(config: Topology3DConfig): NormalizedTopology3DConfig {
  const safe = sanitizeTopologyConfig(config);
  const rps = safe.rps;
  const cacheHitQps = Math.round(rps * (REDIS_ENABLED_HIT_RATIO_PCT / 100));
  const originDbQps = Math.max(1, rps - cacheHitQps);

  const cdnNodes = clampInt(
    Math.ceil(rps / (TIER_SPECS.edge_cdn.capacityPerNodeQps * AUTO_SCALE_TARGET_UTILIZATION)),
    CDN_NODES_MIN,
    CDN_NODES_MAX,
  );
  const gatewayNodes = clampInt(
    Math.ceil(rps / (TIER_SPECS.api_gateway.capacityPerNodeQps * AUTO_SCALE_TARGET_UTILIZATION)),
    GATEWAY_NODES_MIN,
    GATEWAY_NODES_MAX,
  );
  const appNodes = clampInt(
    Math.ceil(rps / (TIER_SPECS.app_cluster.capacityPerNodeQps * AUTO_SCALE_TARGET_UTILIZATION)),
    APP_NODES_MIN,
    APP_NODES_MAX,
  );
  const redisNodes = clampInt(
    Math.ceil(cacheHitQps / (TIER_SPECS.redis_cache.capacityPerNodeQps * AUTO_SCALE_TARGET_UTILIZATION)),
    REDIS_NODES_MIN,
    REDIS_NODES_MAX,
  );
  const dbReplicas = clampInt(
    Math.ceil(originDbQps / (TIER_SPECS.sharded_db.capacityPerNodeQps * AUTO_SCALE_TARGET_UTILIZATION)),
    DB_REPLICAS_MIN,
    DB_REPLICAS_MAX,
  );

  return {
    rps,
    appNodes,
    redisEnabled: true,
    dbReplicas,
    chaosMode: 'none',
    cdnNodes,
    gatewayNodes,
    redisNodes,
  };
}

/**
 * Directly increments or decrements blade count on a clicked 3D server tier.
 * If Redis is offline/stampeding and the learner clicks "+1 Scale Blade" on Redis,
 * it automatically re-enables Redis and clears the cache stampede!
 */
export function scaleTierBlades(
  config: Topology3DConfig,
  tierId: TopologyTierId,
  delta: 1 | -1,
): NormalizedTopology3DConfig {
  const safe = sanitizeTopologyConfig(config);

  switch (tierId) {
    case 'edge_cdn':
      return {
        ...safe,
        cdnNodes: clampInt(safe.cdnNodes + delta, CDN_NODES_MIN, CDN_NODES_MAX),
      };
    case 'api_gateway':
      return {
        ...safe,
        gatewayNodes: clampInt(safe.gatewayNodes + delta, GATEWAY_NODES_MIN, GATEWAY_NODES_MAX),
      };
    case 'app_cluster':
      return {
        ...safe,
        appNodes: clampInt(safe.appNodes + delta, APP_NODES_MIN, APP_NODES_MAX),
      };
    case 'redis_cache': {
      if (delta === 1 && (!safe.redisEnabled || safe.chaosMode === 'cache_stampede')) {
        return {
          ...safe,
          redisEnabled: true,
          chaosMode: safe.chaosMode === 'cache_stampede' ? 'none' : safe.chaosMode,
        };
      }
      return {
        ...safe,
        redisNodes: clampInt(safe.redisNodes + delta, REDIS_NODES_MIN, REDIS_NODES_MAX),
      };
    }
    case 'sharded_db':
      return {
        ...safe,
        dbReplicas: clampInt(safe.dbReplicas + delta, DB_REPLICAS_MIN, DB_REPLICAS_MAX),
      };
  }
}

// ============================================================================
// Deterministic 3D Packet Stream & Spline Path Planner
// ============================================================================

export function samplePolylinePoint(waypoints: readonly Vec3Tuple[], tRaw: number): Vec3Tuple {
  if (waypoints.length === 0) return { x: 0, y: 0, z: 0 };
  if (waypoints.length === 1) return { ...waypoints[0]! };

  const t = Math.min(1, Math.max(0, tRaw));
  const segLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]!;
    const b = waypoints[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    segLengths.push(len);
    totalLength += len;
  }

  if (totalLength <= 1e-6) return { ...waypoints[0]! };

  let targetDist = t * totalLength;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i]!;
    if (targetDist <= segLen || i === segLengths.length - 1) {
      const localT = segLen > 1e-6 ? Math.min(1, Math.max(0, targetDist / segLen)) : 0;
      const a = waypoints[i]!;
      const b = waypoints[i + 1]!;
      return {
        x: a.x + (b.x - a.x) * localT,
        y: a.y + (b.y - a.y) * localT,
        z: a.z + (b.z - a.z) * localT,
      };
    }
    targetDist -= segLen;
  }

  return { ...waypoints[waypoints.length - 1]! };
}

export function buildCacheHitWaypoints(): Vec3Tuple[] {
  const c1 = TIER_SPECS.edge_cdn.anchor;
  const c2 = TIER_SPECS.api_gateway.anchor;
  const c3 = TIER_SPECS.app_cluster.anchor;
  const c4 = TIER_SPECS.redis_cache.anchor;
  return [
    { x: c1.x - 1.3, y: 1.05, z: c1.z },
    { x: c1.x, y: 1.05, z: c1.z },
    { x: c2.x, y: 1.05, z: c2.z },
    { x: c3.x, y: 1.15, z: c3.z },
    { x: 1.65, y: 1.48, z: -1.35 },
    { x: c4.x, y: 1.38, z: c4.z },
    // Fast return arc back toward API gateway edge response
    { x: 0.4, y: 2.05, z: -2.15 },
    { x: c2.x, y: 1.55, z: c2.z - 0.55 },
  ];
}

export function buildFullStackWaypoints(): Vec3Tuple[] {
  const c1 = TIER_SPECS.edge_cdn.anchor;
  const c2 = TIER_SPECS.api_gateway.anchor;
  const c3 = TIER_SPECS.app_cluster.anchor;
  const c5 = TIER_SPECS.sharded_db.anchor;
  return [
    { x: c1.x - 1.3, y: 0.85, z: c1.z + 0.18 },
    { x: c1.x, y: 0.85, z: c1.z + 0.18 },
    { x: c2.x, y: 0.85, z: c2.z + 0.18 },
    { x: c3.x, y: 0.92, z: c3.z + 0.18 },
    { x: 3.15, y: 1.02, z: 0.95 },
    { x: c5.x, y: 1.05, z: c5.z },
  ];
}

export function computePacketStreamPlan(
  rps: number,
  isRedisOnline: boolean,
  tiers: readonly TierTelemetry[],
): PacketStreamPlan {
  const loadNorm = (rps - RPS_MIN) / (RPS_MAX - RPS_MIN); // 0..1
  const loadScale = Math.pow(Math.max(0.05, loadNorm), 0.62);

  const maxCacheHit = 140;
  const maxFullStack = 140;

  const cacheHitCount = isRedisOnline
    ? clampInt(24 + loadScale * (maxCacheHit - 24), 18, maxCacheHit)
    : 0;

  // When Redis is offline or stampeding, full-stack DB packets surge dramatically
  const fullStackBase = isRedisOnline ? 14 + loadScale * 54 : 38 + loadScale * (maxFullStack - 38);
  const fullStackCount = clampInt(fullStackBase, 12, maxFullStack);

  const dbTier = tiers.find((t) => t.id === 'sharded_db');
  const fullStackColor =
    dbTier && dbTier.status === 'saturated'
      ? '#dc2626'
      : dbTier && dbTier.status === 'elevated'
        ? '#d97706'
        : '#1d4ed8';

  const sparkEmitters: SparkEmitterDescriptor[] = tiers
    .filter((t) => t.status === 'saturated')
    .map((tier) => {
      const intensity = Math.min(1, Math.max(0.25, (tier.demandRatio - 0.85) / 1.4));
      const sparkCount = clampInt(18 + intensity * 46, 16, 64);
      return {
        tierId: tier.id,
        origin: { x: tier.anchor.x, y: 2.05, z: tier.anchor.z },
        sparkCount,
        intensity: roundTo(intensity, 2),
      };
    });

  const totalActiveSparks = sparkEmitters.reduce((acc, e) => acc + e.sparkCount, 0);

  return {
    streams: {
      cacheHit: {
        kind: 'cache_hit',
        activeCount: cacheHitCount,
        maxCount: maxCacheHit,
        speedUnitsPerSec: roundTo(0.32 + loadScale * 0.44, 3),
        colorHex: '#059669',
        waypoints: buildCacheHitWaypoints(),
      },
      fullStack: {
        kind: 'full_stack',
        activeCount: fullStackCount,
        maxCount: maxFullStack,
        speedUnitsPerSec: roundTo(isRedisOnline ? 0.24 + loadScale * 0.3 : 0.34 + loadScale * 0.42, 3),
        colorHex: fullStackColor,
        waypoints: buildFullStackWaypoints(),
      },
    },
    sparkEmitters,
    totalActivePackets: cacheHitCount + fullStackCount,
    totalActiveSparks,
    redisBypassActive: isRedisOnline,
  };
}

// ============================================================================
// Primary Telemetry Physics Engine
// ============================================================================

export function computeTopologyTelemetry(inputConfig: Topology3DConfig): TopologyTelemetry {
  const config = sanitizeTopologyConfig(inputConfig);
  const rps = config.rps;

  const isRedisOnline = config.redisEnabled && config.chaosMode !== 'cache_stampede';
  const cacheHitRatioPct = isRedisOnline ? REDIS_ENABLED_HIT_RATIO_PCT : 0;
  const dbReadOffloadPct = cacheHitRatioPct;

  const cacheHitQps = isRedisOnline ? Math.round(rps * (cacheHitRatioPct / 100)) : 0;
  const originDbQps = isRedisOnline
    ? Math.max(1, rps - cacheHitQps)
    : config.chaosMode === 'cache_stampede'
      ? Math.round(rps * CACHE_STAMPEDE_DB_AMPLIFICATION)
      : rps;

  const nodeCounts: Record<TopologyTierId, number> = {
    edge_cdn: config.cdnNodes,
    api_gateway: config.gatewayNodes,
    app_cluster: config.appNodes,
    redis_cache: isRedisOnline ? config.redisNodes : 0,
    sharded_db: config.dbReplicas,
  };

  const tierLoads: Record<TopologyTierId, number> = {
    edge_cdn: rps,
    api_gateway: rps,
    app_cluster: rps,
    redis_cache: isRedisOnline ? cacheHitQps : 0,
    sharded_db: originDbQps,
  };

  const tiers: TierTelemetry[] = TIER_ORDER.map((tierId) => {
    const spec = TIER_SPECS[tierId];
    const activeNodes = nodeCounts[tierId];
    const isOffline = tierId === 'redis_cache' && !isRedisOnline;

    let effectiveNodes = activeNodes;
    if (tierId === 'sharded_db' && config.chaosMode === 'db_failover') {
      effectiveNodes = Math.max(0.45, activeNodes - 1);
    }

    const capacityQps = isOffline ? 0 : Math.round(effectiveNodes * spec.capacityPerNodeQps);
    const loadQps = tierLoads[tierId];
    const demandRatio = isOffline ? 0 : capacityQps > 0 ? loadQps / capacityQps : 9.99;
    const cpuPct = isOffline ? 0 : roundTo(Math.min(100, demandRatio * 100), 1);
    const status = classifyTierHealth(demandRatio, isOffline);
    const latencyContributionMs = computeTierLatencyMs(
      tierId,
      spec.baseLatencyMs,
      demandRatio,
      config.chaosMode,
      isOffline,
    );
    const dropRatePct = computeTierDropRatePct(demandRatio, isOffline);

    const egressAddon = tierId === 'edge_cdn' ? Math.round(rps * 0.0045) : 0;
    const monthlyCostUsd = isOffline
      ? 0
      : Math.round(activeNodes * spec.monthlyCostPerNodeUsd + egressAddon);

    const canScaleUp =
      tierId === 'redis_cache'
        ? !isRedisOnline || config.redisNodes < spec.maxNodes
        : activeNodes < spec.maxNodes;
    const canScaleDown = !isOffline && activeNodes > spec.minNodes;

    return {
      id: tierId,
      code: spec.code,
      name: spec.name,
      shortLabel: spec.shortLabel,
      role: spec.role,
      activeNodes,
      effectiveNodes: roundTo(effectiveNodes, 2),
      minNodes: spec.minNodes,
      maxNodes: spec.maxNodes,
      loadQps,
      capacityQps,
      demandRatio: roundTo(demandRatio, 3),
      cpuPct,
      latencyContributionMs,
      dropRatePct,
      status,
      monthlyCostUsd,
      canScaleUp,
      canScaleDown,
      anchor: spec.anchor,
    };
  });

  const tierMap = tiers.reduce(
    (acc, tier) => {
      acc[tier.id] = tier;
      return acc;
    },
    {} as Record<TopologyTierId, TierTelemetry>,
  );

  // End-to-End P99 latency sums critical path contributions
  const endToEndP99Ms = roundTo(
    tierMap.edge_cdn.latencyContributionMs +
      tierMap.api_gateway.latencyContributionMs +
      tierMap.app_cluster.latencyContributionMs +
      tierMap.redis_cache.latencyContributionMs +
      tierMap.sharded_db.latencyContributionMs,
    1,
  );

  // End-to-End 503 drop probability across serial + split cache/DB branches
  const sCdn = 1 - tierMap.edge_cdn.dropRatePct / 100;
  const sGw = 1 - tierMap.api_gateway.dropRatePct / 100;
  const sApp = 1 - tierMap.app_cluster.dropRatePct / 100;
  const hitFrac = cacheHitRatioPct / 100;
  const sRedis = isRedisOnline ? 1 - tierMap.redis_cache.dropRatePct / 100 : 0;
  const sDb = 1 - tierMap.sharded_db.dropRatePct / 100;

  const overallSurvival = sCdn * sGw * sApp * (hitFrac * sRedis + (1 - hitFrac) * sDb);
  const dropRate503Pct = roundTo(Math.max(0, Math.min(99.9, (1 - overallSurvival) * 100)), 2);
  const droppedRps = Math.round(rps * (dropRate503Pct / 100));
  const successfulRps = Math.max(0, rps - droppedRps);

  const monthlyCloudCostUsd = tiers.reduce((acc, t) => acc + t.monthlyCostUsd, 0);

  const saturatedTierIds = tiers.filter((t) => t.status === 'saturated').map((t) => t.id);

  const stressedTiers = tiers
    .filter((t) => t.status === 'saturated' || t.status === 'elevated')
    .sort((a, b) => b.demandRatio - a.demandRatio);

  const primaryBottleneckTierId: TopologyTierId | null =
    stressedTiers.length > 0 ? stressedTiers[0]!.id : null;

  const overallStatus: TierHealthState =
    saturatedTierIds.length > 0
      ? 'saturated'
      : stressedTiers.length > 0
        ? 'elevated'
        : 'healthy';

  const autoScaleTarget = computeAutoScaleConfig(config);
  const packetPlan = computePacketStreamPlan(rps, isRedisOnline, tiers);

  return {
    config,
    tiers,
    tierMap,
    isRedisOnline,
    cacheHitRatioPct,
    dbReadOffloadPct,
    cacheHitQps,
    originDbQps,
    endToEndP99Ms,
    dropRate503Pct,
    droppedRps,
    successfulRps,
    monthlyCloudCostUsd,
    primaryBottleneckTierId,
    saturatedTierIds,
    overallStatus,
    autoScaleTarget,
    packetPlan,
  };
}

export function formatCompactRps(value: number): string {
  if (value >= 100_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) {
    const k = value / 1_000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return `${Math.round(value)}`;
}
