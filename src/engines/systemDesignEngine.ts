import type { BilingualText } from '../types/lms';

export type BlueprintId = 'url-shortener' | 'flash-sale-voucher' | 'realtime-chat-feed';
export type AppRuntime = 'dotnet10' | 'go' | 'nodejs';
export type TierId = 'cdn' | 'api_gateway' | 'app_fleet' | 'redis_cache' | 'database';
export type TierStatus = 'healthy' | 'warning' | 'overloaded';

export interface CapacityInputs {
  blueprintId: BlueprintId;
  dau: number; // 10_000 .. 10_000_000
  readWriteRatio: number; // 10 .. 100
  peakMultiplier: number; // 3 .. 10
  cacheHitRatioPct: number; // 50 .. 98
  avgPayloadKb: number; // 1 .. 64
  runtime: AppRuntime;
}

export interface ProvisionedFleet {
  cdnGbps: number;
  apiGwNodes: number;
  appPods: number;
  redisShards: number;
  dbPrimaryShards: number;
  dbReadReplicas: number;
}

export interface BlueprintDefinition {
  id: BlueprintId;
  badge: string;
  name: BilingualText;
  subtitle: BilingualText;
  interviewPrompt: BilingualText;
  writesPerDauPerDay: number;
  metadataOverheadBytes: number;
  defaultInputs: CapacityInputs;
  baselineFleet: ProvisionedFleet;
  architecturalNotes: BilingualText[];
}

export interface TierHealth {
  id: TierId;
  label: BilingualText;
  loadValue: number;
  capacityValue: number;
  unit: string;
  utilizationPct: number;
  status: TierStatus;
  provisionedUnits: number;
  recommendedUnits: number;
  provisionedLabel: string;
  recommendedLabel: string;
  bottleneckSummary: BilingualText;
}

export interface CostBreakdown {
  cdnUsd: number;
  apiGwUsd: number;
  appFleetUsd: number;
  redisUsd: number;
  databaseUsd: number;
  totalMonthlyUsd: number;
}

export interface RuntimePodComparison {
  dotnet10: number;
  go: number;
  nodejs: number;
}

export interface WorksheetStep {
  stepNumber: number;
  title: BilingualText;
  formula: string;
  result: string;
  note: BilingualText;
}

export interface CapacityEstimate {
  blueprintId: BlueprintId;
  runtime: AppRuntime;
  inputs: CapacityInputs;
  provisionedFleet: ProvisionedFleet;
  autoScaledFleet: ProvisionedFleet;
  avgWriteQps: number;
  avgReadQps: number;
  avgTotalQps: number;
  peakWriteQps: number;
  peakReadQps: number;
  peakTotalQps: number;
  cacheHitQps: number;
  cacheMissReadQps: number;
  originDbPeakQps: number;
  requiredAppPods: number;
  runtimePodComparison: RuntimePodComparison;
  requiredDbPrimaryShards: number;
  requiredDbReadReplicas: number;
  requiredRedisShards: number;
  requiredApiGwNodes: number;
  requiredCdnGbps: number;
  dailyStorageGb: number;
  fiveYearRawStorageTb: number;
  fiveYearReplicatedStorageTb: number;
  peakCdnEgressGbps: number;
  monthlyEgressTb: number;
  monthlyCloudCostUsd: number;
  costBreakdown: CostBreakdown;
  tiers: TierHealth[];
  bottlenecks: TierId[];
  overloadedTiers: TierId[];
  overallStatus: TierStatus;
  worksheetSteps: WorksheetStep[];
}

export const SECONDS_PER_DAY = 86_400;
export const DAYS_IN_FIVE_YEARS = 365 * 5;
export const STORAGE_REPLICATION_FACTOR = 3;
export const TARGET_HEADROOM_UTILIZATION = 0.65;

export const MIN_DAU = 10_000;
export const MAX_DAU = 10_000_000;
export const MIN_RW_RATIO = 10;
export const MAX_RW_RATIO = 100;
export const MIN_PEAK_MULTIPLIER = 3;
export const MAX_PEAK_MULTIPLIER = 10;
export const MIN_CACHE_HIT_PCT = 50;
export const MAX_CACHE_HIT_PCT = 98;
export const MIN_PAYLOAD_KB = 1;
export const MAX_PAYLOAD_KB = 64;

export const APP_RUNTIME_SPECS: Record<
  AppRuntime,
  {
    id: AppRuntime;
    label: string;
    stackHint: string;
    qpsPerPod: number;
    monthlyUsdPerPod: number;
  }
> = {
  dotnet10: {
    id: 'dotnet10',
    label: '.NET 10',
    stackHint: 'Kestrel + Dapper (2 vCPU / 4 GB)',
    qpsPerPod: 3_500,
    monthlyUsdPerPod: 115,
  },
  go: {
    id: 'go',
    label: 'Go',
    stackHint: 'net/http + pgx (2 vCPU / 2 GB)',
    qpsPerPod: 4_200,
    monthlyUsdPerPod: 92,
  },
  nodejs: {
    id: 'nodejs',
    label: 'Node.js',
    stackHint: 'Fastify Cluster (2 vCPU / 4 GB)',
    qpsPerPod: 1_600,
    monthlyUsdPerPod: 110,
  },
};

export const API_GW_QPS_PER_NODE = 15_000;
export const REDIS_QPS_PER_SHARD = 45_000;
export const DB_PRIMARY_WRITE_QPS_PER_SHARD = 2_500;
export const DB_READ_REPLICA_QPS = 4_000;

export const SYSTEM_DESIGN_BLUEPRINTS: BlueprintDefinition[] = [
  {
    id: 'url-shortener',
    badge: 'READ-HEAVY EDGE',
    name: {
      en: 'Global Short-URL / Redirector',
      vi: 'Hệ Thống Rút Gọn URL Toàn Cầu',
    },
    subtitle: {
      en: 'Base62 Snowflake IDs · Edge 301/302 Redirect · Redis Hot-Key Shield',
      vi: 'Mã Base62 Snowflake · Điều hướng 301/302 tại Edge · Chắn tải Redis',
    },
    interviewPrompt: {
      en: 'Design a Bit.ly / TinyURL redirector serving millions of daily redirects at p99 < 15ms with 5-year link retention and analytics durability.',
      vi: 'Thiết kế hệ thống rút gọn URL kiểu Bit.ly phục vụ hàng triệu lượt chuyển hướng mỗi ngày với p99 < 15ms và lưu trữ bền vững 5 năm.',
    },
    writesPerDauPerDay: 2,
    metadataOverheadBytes: 256,
    defaultInputs: {
      blueprintId: 'url-shortener',
      dau: 2_500_000,
      readWriteRatio: 80,
      peakMultiplier: 6,
      cacheHitRatioPct: 82,
      avgPayloadKb: 4,
      runtime: 'dotnet10',
    },
    baselineFleet: {
      cdnGbps: 2.0,
      apiGwNodes: 1,
      appPods: 4,
      redisShards: 2,
      dbPrimaryShards: 1,
      dbReadReplicas: 1,
    },
    architecturalNotes: [
      {
        en: 'Use 302 Found for analytics tracking or 301 Permanent + CDN edge caching to absorb viral redirect spikes.',
        vi: 'Dùng 302 Found để đo lường lượt click hoặc 301 Permanent kết hợp cache CDN để hấp thụ đỉnh lưu lượng đột biến.',
      },
      {
        en: 'Pre-generate Base62 keys via distributed Snowflake / Range Allocator to keep PostgreSQL writes lock-free.',
        vi: 'Sinh trước khóa Base62 qua Snowflake / Range Allocator để loại bỏ tranh chấp khóa ghi trên PostgreSQL.',
      },
    ],
  },
  {
    id: 'flash-sale-voucher',
    badge: 'CONCURRENCY CRITICAL',
    name: {
      en: 'Flash-Sale E-Commerce Voucher API',
      vi: 'API Voucher Flash-Sale Thương Mại Điện Tử',
    },
    subtitle: {
      en: 'Atomic Redis Lua Claim · Optimistic Locking · Zero Double-Spending',
      vi: 'Trừ kho Redis Lua Nguyên Tử · Khóa Lạc Quan · Chống Dùng Kép Voucher',
    },
    interviewPrompt: {
      en: 'Design a 700-store omnichannel voucher claim & redemption gateway absorbing 9x midnight flash-sale bursts with strict idempotency.',
      vi: 'Thiết kế cổng săn & đổi voucher cho chuỗi 700+ cửa hàng chịu tải bùng nổ 9x lúc 0h với đảm bảo idempotency tuyệt đối.',
    },
    writesPerDauPerDay: 4,
    metadataOverheadBytes: 512,
    defaultInputs: {
      blueprintId: 'flash-sale-voucher',
      dau: 2_000_000,
      readWriteRatio: 25,
      peakMultiplier: 9,
      cacheHitRatioPct: 74,
      avgPayloadKb: 12,
      runtime: 'dotnet10',
    },
    baselineFleet: {
      cdnGbps: 2.0,
      apiGwNodes: 1,
      appPods: 4,
      redisShards: 2,
      dbPrimaryShards: 1,
      dbReadReplicas: 1,
    },
    architecturalNotes: [
      {
        en: 'Gate inventory decrements in Redis Lua before async transactional outbox commit to PostgreSQL primary.',
        vi: 'Chặn tồn kho bằng Redis Lua nguyên tử trước khi ghi bất đồng bộ qua Outbox xuống PostgreSQL Primary.',
      },
      {
        en: 'Enforce Idempotency-Key + rowversion optimistic concurrency to eliminate double-redemption under retries.',
        vi: 'Bắt buộc Idempotency-Key và khóa lạc quan rowversion để triệt tiêu 100% lỗi đổi trùng khi client retry.',
      },
    ],
  },
  {
    id: 'realtime-chat-feed',
    badge: 'HIGH FAN-OUT',
    name: {
      en: 'Real-Time Chat & Presence Feed',
      vi: 'Hệ Thống Chat Thời Gian Thực & Trạng Thái Online',
    },
    subtitle: {
      en: 'WebSocket Gateways · Redis Pub/Sub Presence · Partitioned Message Store',
      vi: 'Cổng WebSocket · Trạng Thái Redis Pub/Sub · Lưu Trữ Tin Nhắn Phân Mảnh',
    },
    interviewPrompt: {
      en: 'Design a Slack / Discord messaging & presence cluster handling persistent message ingestion, channel fan-out reads, and media metadata.',
      vi: 'Thiết kế cụm nhắn tin thời gian thực kiểu Slack/Discord xử lý ghi tin nhắn cường độ cao, đọc lịch sử kênh và trạng thái online.',
    },
    writesPerDauPerDay: 15,
    metadataOverheadBytes: 768,
    defaultInputs: {
      blueprintId: 'realtime-chat-feed',
      dau: 1_500_000,
      readWriteRatio: 18,
      peakMultiplier: 5,
      cacheHitRatioPct: 72,
      avgPayloadKb: 16,
      runtime: 'go',
    },
    baselineFleet: {
      cdnGbps: 2.0,
      apiGwNodes: 1,
      appPods: 4,
      redisShards: 2,
      dbPrimaryShards: 1,
      dbReadReplicas: 1,
    },
    architecturalNotes: [
      {
        en: 'Shard message tables by (channel_id, bucket_month) to keep B-Tree working sets resident in shared buffers.',
        vi: 'Phân mảnh bảng tin nhắn theo (channel_id, bucket_month) để giữ chỉ mục B-Tree nóng nằm gọn trong RAM.',
      },
      {
        en: 'Use Redis TTL heartbeats (30s) for online presence so ephemeral disconnects never touch the SQL primary.',
        vi: 'Dùng Redis TTL heartbeat (30 giây) cho trạng thái online để không bao giờ ghi tải trạng thái xuống SQL Primary.',
      },
    ],
  },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function getBlueprint(id: BlueprintId): BlueprintDefinition {
  return SYSTEM_DESIGN_BLUEPRINTS.find((bp) => bp.id === id) ?? SYSTEM_DESIGN_BLUEPRINTS[0]!;
}

export function clampCapacityInputs(inputs: CapacityInputs): CapacityInputs {
  const validBlueprint = SYSTEM_DESIGN_BLUEPRINTS.some((b) => b.id === inputs.blueprintId)
    ? inputs.blueprintId
    : 'url-shortener';
  const validRuntime: AppRuntime =
    inputs.runtime === 'go' || inputs.runtime === 'nodejs' ? inputs.runtime : 'dotnet10';

  return {
    blueprintId: validBlueprint,
    dau: Math.round(clamp(inputs.dau, MIN_DAU, MAX_DAU)),
    readWriteRatio: Math.round(clamp(inputs.readWriteRatio, MIN_RW_RATIO, MAX_RW_RATIO)),
    peakMultiplier: Math.round(clamp(inputs.peakMultiplier, MIN_PEAK_MULTIPLIER, MAX_PEAK_MULTIPLIER)),
    cacheHitRatioPct: Math.round(clamp(inputs.cacheHitRatioPct, MIN_CACHE_HIT_PCT, MAX_CACHE_HIT_PCT)),
    avgPayloadKb: Math.round(clamp(inputs.avgPayloadKb, MIN_PAYLOAD_KB, MAX_PAYLOAD_KB)),
    runtime: validRuntime,
  };
}

/**
 * Maps DAU (10,000 .. 10,000,000) to a smooth 0..1000 logarithmic slider position.
 */
export function dauToLogSlider(dau: number): number {
  const clamped = clamp(dau, MIN_DAU, MAX_DAU);
  const logMin = Math.log10(MIN_DAU); // 4
  const logMax = Math.log10(MAX_DAU); // 7
  return Math.round(((Math.log10(clamped) - logMin) / (logMax - logMin)) * 1000);
}

/**
 * Maps a 0..1000 logarithmic slider position back to a clean rounded DAU value.
 */
export function logSliderToDau(sliderPos: number): number {
  const clampedPos = clamp(sliderPos, 0, 1000);
  const logMin = Math.log10(MIN_DAU);
  const logMax = Math.log10(MAX_DAU);
  const raw = Math.pow(10, logMin + (clampedPos / 1000) * (logMax - logMin));
  if (raw < 100_000) {
    return Math.round(raw / 5_000) * 5_000;
  }
  if (raw < 1_000_000) {
    return Math.round(raw / 25_000) * 25_000;
  }
  return Math.round(raw / 100_000) * 100_000;
}

function classifyUtilization(utilizationPct: number): TierStatus {
  if (utilizationPct >= 100) return 'overloaded';
  if (utilizationPct >= 75) return 'warning';
  return 'healthy';
}

function computeRequiredFleetFromTraffic(
  peakTotalQps: number,
  peakReadQps: number,
  peakWriteQps: number,
  cacheMissReadQps: number,
  peakCdnEgressGbps: number,
  runtime: AppRuntime,
): {
  fleet: ProvisionedFleet;
  runtimePodComparison: RuntimePodComparison;
} {
  const podsForRuntime = (r: AppRuntime): number =>
    Math.max(2, Math.ceil(peakTotalQps / (APP_RUNTIME_SPECS[r].qpsPerPod * TARGET_HEADROOM_UTILIZATION)));

  const runtimePodComparison: RuntimePodComparison = {
    dotnet10: podsForRuntime('dotnet10'),
    go: podsForRuntime('go'),
    nodejs: podsForRuntime('nodejs'),
  };

  const requiredCdnGbps = Math.max(
    2.0,
    Math.ceil((peakCdnEgressGbps / TARGET_HEADROOM_UTILIZATION) * 2) / 2,
  );
  const requiredApiGwNodes = Math.max(
    1,
    Math.ceil(peakTotalQps / (API_GW_QPS_PER_NODE * TARGET_HEADROOM_UTILIZATION)),
  );
  const requiredRedisShards = Math.max(
    1,
    Math.ceil(peakReadQps / (REDIS_QPS_PER_SHARD * TARGET_HEADROOM_UTILIZATION)),
  );
  const requiredDbPrimaryShards = Math.max(
    1,
    Math.ceil(peakWriteQps / (DB_PRIMARY_WRITE_QPS_PER_SHARD * TARGET_HEADROOM_UTILIZATION)),
  );
  const requiredDbReadReplicas = Math.max(
    1,
    Math.ceil(cacheMissReadQps / (DB_READ_REPLICA_QPS * TARGET_HEADROOM_UTILIZATION)),
  );

  return {
    fleet: {
      cdnGbps: round1(requiredCdnGbps),
      apiGwNodes: requiredApiGwNodes,
      appPods: runtimePodComparison[runtime],
      redisShards: requiredRedisShards,
      dbPrimaryShards: requiredDbPrimaryShards,
      dbReadReplicas: requiredDbReadReplicas,
    },
    runtimePodComparison,
  };
}

export function autoScaleFleet(rawInputs: CapacityInputs): ProvisionedFleet {
  const estimate = computeCapacityEstimate(rawInputs);
  return { ...estimate.autoScaledFleet };
}

export function computeCapacityEstimate(
  rawInputs: CapacityInputs,
  fleetOverride?: Partial<ProvisionedFleet>,
): CapacityEstimate {
  const inputs = clampCapacityInputs(rawInputs);
  const blueprint = getBlueprint(inputs.blueprintId);
  const runtimeSpec = APP_RUNTIME_SPECS[inputs.runtime];

  const provisionedFleet: ProvisionedFleet = {
    cdnGbps: Math.max(0.5, fleetOverride?.cdnGbps ?? blueprint.baselineFleet.cdnGbps),
    apiGwNodes: Math.max(1, Math.round(fleetOverride?.apiGwNodes ?? blueprint.baselineFleet.apiGwNodes)),
    appPods: Math.max(1, Math.round(fleetOverride?.appPods ?? blueprint.baselineFleet.appPods)),
    redisShards: Math.max(1, Math.round(fleetOverride?.redisShards ?? blueprint.baselineFleet.redisShards)),
    dbPrimaryShards: Math.max(
      1,
      Math.round(fleetOverride?.dbPrimaryShards ?? blueprint.baselineFleet.dbPrimaryShards),
    ),
    dbReadReplicas: Math.max(
      1,
      Math.round(fleetOverride?.dbReadReplicas ?? blueprint.baselineFleet.dbReadReplicas),
    ),
  };

  // 1. Traffic QPS
  const dailyWrites = inputs.dau * blueprint.writesPerDauPerDay;
  const avgWriteQpsRaw = dailyWrites / SECONDS_PER_DAY;
  const avgReadQpsRaw = avgWriteQpsRaw * inputs.readWriteRatio;
  const avgTotalQpsRaw = avgReadQpsRaw + avgWriteQpsRaw;

  const peakWriteQpsRaw = avgWriteQpsRaw * inputs.peakMultiplier;
  const peakReadQpsRaw = avgReadQpsRaw * inputs.peakMultiplier;
  const peakTotalQpsRaw = peakReadQpsRaw + peakWriteQpsRaw;

  // 2. Cache Hit & Origin DB Survival QPS
  const cacheHitFraction = inputs.cacheHitRatioPct / 100;
  const cacheHitQpsRaw = peakReadQpsRaw * cacheHitFraction;
  const cacheMissReadQpsRaw = peakReadQpsRaw * (1 - cacheHitFraction);
  const originDbPeakQpsRaw = peakWriteQpsRaw + cacheMissReadQpsRaw;

  // 3. 5-Year Storage Footprint (decimal TB, 3x replication)
  const bytesPerWrite = inputs.avgPayloadKb * 1024 + blueprint.metadataOverheadBytes;
  const dailyStorageBytes = dailyWrites * bytesPerWrite;
  const dailyStorageGbRaw = dailyStorageBytes / 1_000_000_000;
  const fiveYearRawStorageTbRaw = (dailyStorageBytes * DAYS_IN_FIVE_YEARS) / 1_000_000_000_000;
  const fiveYearReplicatedStorageTbRaw = fiveYearRawStorageTbRaw * STORAGE_REPLICATION_FACTOR;

  // 4. Peak CDN Egress (Gbps) & Monthly Egress (TB)
  // Using decimal KB = 1000 bytes -> QPS * KB * 8 / 1,000,000 = Gbps
  const peakCdnEgressGbpsRaw = (peakReadQpsRaw * inputs.avgPayloadKb * 8) / 1_000_000;
  const monthlyEgressTbRaw =
    (avgReadQpsRaw * inputs.avgPayloadKb * 1_000 * SECONDS_PER_DAY * 30) / 1_000_000_000_000;

  // 5. Required Auto-Scaled Fleet with 35% headroom (<= 65% target utilization)
  const { fleet: autoScaledFleet, runtimePodComparison } = computeRequiredFleetFromTraffic(
    peakTotalQpsRaw,
    peakReadQpsRaw,
    peakWriteQpsRaw,
    cacheMissReadQpsRaw,
    peakCdnEgressGbpsRaw,
    inputs.runtime,
  );

  // 6. Tier-by-Tier Bottleneck Analysis against Provisioned Fleet
  const cdnCapacityGbps = provisionedFleet.cdnGbps;
  const cdnUtil = round1((peakCdnEgressGbpsRaw / cdnCapacityGbps) * 100);

  const apiGwCapacityQps = provisionedFleet.apiGwNodes * API_GW_QPS_PER_NODE;
  const apiGwUtil = round1((peakTotalQpsRaw / apiGwCapacityQps) * 100);

  const appCapacityQps = provisionedFleet.appPods * runtimeSpec.qpsPerPod;
  const appUtil = round1((peakTotalQpsRaw / appCapacityQps) * 100);

  const redisCapacityQps = provisionedFleet.redisShards * REDIS_QPS_PER_SHARD;
  const redisUtil = round1((peakReadQpsRaw / redisCapacityQps) * 100);

  const dbPrimaryCapacityWriteQps =
    provisionedFleet.dbPrimaryShards * DB_PRIMARY_WRITE_QPS_PER_SHARD;
  const dbReplicaCapacityReadQps = provisionedFleet.dbReadReplicas * DB_READ_REPLICA_QPS;
  const dbWriteUtil = (peakWriteQpsRaw / dbPrimaryCapacityWriteQps) * 100;
  const dbReadUtil = (cacheMissReadQpsRaw / dbReplicaCapacityReadQps) * 100;
  const dbUtil = round1(Math.max(dbWriteUtil, dbReadUtil));
  const dbCapacityEffective = dbPrimaryCapacityWriteQps + dbReplicaCapacityReadQps;

  const tiers: TierHealth[] = [
    {
      id: 'cdn',
      label: { en: 'CDN Edge PoPs', vi: 'Mạng Phân Phối CDN' },
      loadValue: round2(peakCdnEgressGbpsRaw),
      capacityValue: round2(cdnCapacityGbps),
      unit: 'Gbps',
      utilizationPct: cdnUtil,
      status: classifyUtilization(cdnUtil),
      provisionedUnits: provisionedFleet.cdnGbps,
      recommendedUnits: autoScaledFleet.cdnGbps,
      provisionedLabel: `${provisionedFleet.cdnGbps.toFixed(1)} Gbps tier`,
      recommendedLabel: `${autoScaledFleet.cdnGbps.toFixed(1)} Gbps tier`,
      bottleneckSummary:
        cdnUtil >= 100
          ? {
              en: `Peak edge egress (${round2(peakCdnEgressGbpsRaw)} Gbps) saturates committed CDN quota (${cdnCapacityGbps.toFixed(1)} Gbps). Upgrade edge commit or enable Brotli compression.`,
              vi: `Băng thông đỉnh (${round2(peakCdnEgressGbpsRaw)} Gbps) vượt hạn mức CDN (${cdnCapacityGbps.toFixed(1)} Gbps). Cần nâng gói Edge hoặc bật nén Brotli.`,
            }
          : cdnUtil >= 75
            ? {
                en: `CDN egress approaching saturation (${cdnUtil}%). Headroom below 25% for viral surges.`,
                vi: `Băng thông CDN tiệm cận ngưỡng (${cdnUtil}%), biên dự phòng dưới 25%.`,
              }
            : {
                en: `Edge PoPs absorb ${round2(peakCdnEgressGbpsRaw)} Gbps cleanly with healthy burst headroom.`,
                vi: `Edge PoP hấp thụ ${round2(peakCdnEgressGbpsRaw)} Gbps ổn định, đủ biên dự phòng.`,
              },
    },
    {
      id: 'api_gateway',
      label: { en: 'API Gateway', vi: 'Cổng API Gateway' },
      loadValue: round2(peakTotalQpsRaw),
      capacityValue: apiGwCapacityQps,
      unit: 'QPS',
      utilizationPct: apiGwUtil,
      status: classifyUtilization(apiGwUtil),
      provisionedUnits: provisionedFleet.apiGwNodes,
      recommendedUnits: autoScaledFleet.apiGwNodes,
      provisionedLabel: `${provisionedFleet.apiGwNodes} GW nodes`,
      recommendedLabel: `${autoScaledFleet.apiGwNodes} GW nodes`,
      bottleneckSummary:
        apiGwUtil >= 100
          ? {
              en: `Ingress ${formatCompactNumber(peakTotalQpsRaw)} QPS exceeds ${provisionedFleet.apiGwNodes} gateway node(s) (${formatCompactNumber(apiGwCapacityQps)} QPS). Scale Envoy / NGINX ingress to ${autoScaledFleet.apiGwNodes} nodes.`,
              vi: `Lưu lượng đỉnh ${formatCompactNumber(peakTotalQpsRaw)} QPS vượt năng lực ${provisionedFleet.apiGwNodes} node Gateway. Cần mở rộng lên ${autoScaledFleet.apiGwNodes} node.`,
            }
          : apiGwUtil >= 75
            ? {
                en: `API Gateway at ${apiGwUtil}% utilization. Add rate-limiter replicas before TLS handshake queuing spikes.`,
                vi: `API Gateway đạt ${apiGwUtil}% công suất. Cần bổ sung replica trước khi tăng độ trễ hàng đợi TLS.`,
              }
            : {
                en: `TLS termination, JWT validation, and rate limiting healthy at ${apiGwUtil}% utilization.`,
                vi: `Xử lý TLS, xác thực JWT và rate-limiting ổn định ở mức ${apiGwUtil}%.`,
              },
    },
    {
      id: 'app_fleet',
      label: { en: `App Fleet (${runtimeSpec.label})`, vi: `Cụm Ứng Dụng (${runtimeSpec.label})` },
      loadValue: round2(peakTotalQpsRaw),
      capacityValue: appCapacityQps,
      unit: 'QPS',
      utilizationPct: appUtil,
      status: classifyUtilization(appUtil),
      provisionedUnits: provisionedFleet.appPods,
      recommendedUnits: autoScaledFleet.appPods,
      provisionedLabel: `${provisionedFleet.appPods} pods`,
      recommendedLabel: `${autoScaledFleet.appPods} pods`,
      bottleneckSummary:
        appUtil >= 100
          ? {
              en: `${provisionedFleet.appPods} ${runtimeSpec.label} pods saturate at ${formatCompactNumber(appCapacityQps)} QPS vs ${formatCompactNumber(peakTotalQpsRaw)} peak QPS. HPA must scale to ${autoScaledFleet.appPods} pods.`,
              vi: `${provisionedFleet.appPods} pod ${runtimeSpec.label} quá tải (${formatCompactNumber(peakTotalQpsRaw)} / ${formatCompactNumber(appCapacityQps)} QPS). Cần HPA mở rộng lên ${autoScaledFleet.appPods} pod.`,
            }
          : appUtil >= 75
            ? {
                en: `Compute fleet above 75% CPU threshold (${appUtil}%). Tail p99 latency degrades under GC or thread-pool queuing.`,
                vi: `Cụm ứng dụng vượt ngưỡng 75% CPU (${appUtil}%), dễ tăng đột biến độ trễ p99.`,
              }
            : {
                en: `${provisionedFleet.appPods} ${runtimeSpec.label} pods handle peak QPS at ${appUtil}% utilization with safe p99 latency.`,
                vi: `${provisionedFleet.appPods} pod ${runtimeSpec.label} gánh đỉnh tải ở mức ${appUtil}%, độ trễ p99 an toàn.`,
              },
    },
    {
      id: 'redis_cache',
      label: { en: 'Redis Cache Cluster', vi: 'Cụm Redis Cache' },
      loadValue: round2(peakReadQpsRaw),
      capacityValue: redisCapacityQps,
      unit: 'QPS',
      utilizationPct: redisUtil,
      status: classifyUtilization(redisUtil),
      provisionedUnits: provisionedFleet.redisShards,
      recommendedUnits: autoScaledFleet.redisShards,
      provisionedLabel: `${provisionedFleet.redisShards} shards`,
      recommendedLabel: `${autoScaledFleet.redisShards} shards`,
      bottleneckSummary:
        redisUtil >= 100
          ? {
              en: `Redis lookup traffic (${formatCompactNumber(peakReadQpsRaw)} QPS) exceeds ${provisionedFleet.redisShards} shard(s). Partition keyspace across ${autoScaledFleet.redisShards} Redis Cluster shards.`,
              vi: `Truy vấn Redis (${formatCompactNumber(peakReadQpsRaw)} QPS) vượt quá ${provisionedFleet.redisShards} shard. Cần chia tải sang ${autoScaledFleet.redisShards} shard Redis Cluster.`,
            }
          : redisUtil >= 75
            ? {
                en: `Redis CPU approaching single-thread saturation (${redisUtil}%). Enable read-from-replica or add hash-slot shards.`,
                vi: `Redis tiệm cận ngưỡng bão hòa đơn luồng (${redisUtil}%). Nên bật đọc từ replica hoặc thêm shard.`,
              }
            : {
                en: `Absorbing ${inputs.cacheHitRatioPct}% of reads (${formatCompactNumber(cacheHitQpsRaw)} QPS) at ${redisUtil}% cluster load.`,
                vi: `Đang chắn ${inputs.cacheHitRatioPct}% lượt đọc (${formatCompactNumber(cacheHitQpsRaw)} QPS) ở mức tải ${redisUtil}%.`,
              },
    },
    {
      id: 'database',
      label: { en: 'PostgreSQL Primary + Replicas', vi: 'PostgreSQL Primary + Replica' },
      loadValue: round2(originDbPeakQpsRaw),
      capacityValue: dbCapacityEffective,
      unit: 'QPS',
      utilizationPct: dbUtil,
      status: classifyUtilization(dbUtil),
      provisionedUnits: provisionedFleet.dbPrimaryShards + provisionedFleet.dbReadReplicas,
      recommendedUnits: autoScaledFleet.dbPrimaryShards + autoScaledFleet.dbReadReplicas,
      provisionedLabel: `${provisionedFleet.dbPrimaryShards}P + ${provisionedFleet.dbReadReplicas}R`,
      recommendedLabel: `${autoScaledFleet.dbPrimaryShards}P + ${autoScaledFleet.dbReadReplicas}R`,
      bottleneckSummary:
        dbUtil >= 100
          ? {
              en:
                dbWriteUtil >= dbReadUtil
                  ? `Primary write storm (${round2(peakWriteQpsRaw)} QPS vs ${dbPrimaryCapacityWriteQps} cap). Shard writes to ${autoScaledFleet.dbPrimaryShards}P + ${autoScaledFleet.dbReadReplicas}R.`
                  : `Cache-miss read surge (${round2(cacheMissReadQpsRaw)} QPS vs ${dbReplicaCapacityReadQps} cap). Scale to ${autoScaledFleet.dbPrimaryShards}P + ${autoScaledFleet.dbReadReplicas}R or boost cache hit ratio.`,
              vi:
                dbWriteUtil >= dbReadUtil
                  ? `Bão ghi Primary (${round2(peakWriteQpsRaw)} / ${dbPrimaryCapacityWriteQps} QPS). Cần phân mảnh lên ${autoScaledFleet.dbPrimaryShards}P + ${autoScaledFleet.dbReadReplicas}R.`
                  : `Đọc lọt cache (${round2(cacheMissReadQpsRaw)} / ${dbReplicaCapacityReadQps} QPS) gây nghẽn DB. Cần mở rộng ${autoScaledFleet.dbPrimaryShards}P + ${autoScaledFleet.dbReadReplicas}R hoặc tăng tỷ lệ trúng cache.`,
            }
          : dbUtil >= 75
            ? {
                en: `Origin DB utilization at ${dbUtil}% (Write ${round1(dbWriteUtil)}% · Read ${round1(dbReadUtil)}%). Risk of connection-pool exhaustion during cache flush.`,
                vi: `Origin DB đạt ${dbUtil}% tải (Ghi ${round1(dbWriteUtil)}% · Đọc ${round1(dbReadUtil)}%). Rủi ro cạn kiệt connection pool khi cache bị xả.`,
              }
            : {
                en: `Origin DB healthy at ${dbUtil}% max tier load (${round2(peakWriteQpsRaw)} W / ${round2(cacheMissReadQpsRaw)} R QPS).`,
                vi: `Origin DB vận hành khỏe mạnh ở mức ${dbUtil}% (${round2(peakWriteQpsRaw)} W / ${round2(cacheMissReadQpsRaw)} R QPS).`,
              },
    },
  ];

  const bottlenecks = tiers.filter((t) => t.status !== 'healthy').map((t) => t.id);
  const overloadedTiers = tiers.filter((t) => t.status === 'overloaded').map((t) => t.id);
  const overallStatus: TierStatus =
    overloadedTiers.length > 0 ? 'overloaded' : bottlenecks.length > 0 ? 'warning' : 'healthy';

  // 7. Monthly Cloud Cost Estimate (USD) for Provisioned Fleet
  const cdnUsd = Math.round(provisionedFleet.cdnGbps * 85 + monthlyEgressTbRaw * 28);
  const monthlyRequestsMillions = (avgTotalQpsRaw * SECONDS_PER_DAY * 30) / 1_000_000;
  const apiGwUsd = Math.round(provisionedFleet.apiGwNodes * 140 + monthlyRequestsMillions * 0.9);
  const appFleetUsd = Math.round(provisionedFleet.appPods * runtimeSpec.monthlyUsdPerPod);
  const redisUsd = Math.round(provisionedFleet.redisShards * 260);
  const activeYear1StorageTb = Math.max(0.1, fiveYearReplicatedStorageTbRaw / 5);
  const databaseUsd = Math.round(
    provisionedFleet.dbPrimaryShards * 520 +
      provisionedFleet.dbReadReplicas * 340 +
      activeYear1StorageTb * 115,
  );
  const totalMonthlyUsd = cdnUsd + apiGwUsd + appFleetUsd + redisUsd + databaseUsd;

  const costBreakdown: CostBreakdown = {
    cdnUsd,
    apiGwUsd,
    appFleetUsd,
    redisUsd,
    databaseUsd,
    totalMonthlyUsd,
  };

  // 8. Back-of-the-Envelope Interview Worksheet Derivation Steps
  const worksheetSteps: WorksheetStep[] = [
    {
      stepNumber: 1,
      title: { en: 'Average & Peak Traffic QPS', vi: 'Lưu Lượng QPS Trung Bình & Đỉnh' },
      formula: `(${formatDau(inputs.dau)} × ${blueprint.writesPerDauPerDay} W/day) / 86,400 × ${inputs.readWriteRatio}:1 R:W × ${inputs.peakMultiplier}x peak`,
      result: `Avg ${formatCompactNumber(avgTotalQpsRaw)} QPS · Peak ${formatCompactNumber(peakTotalQpsRaw)} QPS`,
      note: {
        en: `Peak split: ${formatCompactNumber(peakReadQpsRaw)} Read QPS + ${formatCompactNumber(peakWriteQpsRaw)} Write QPS.`,
        vi: `Phân bổ đỉnh: ${formatCompactNumber(peakReadQpsRaw)} QPS Đọc + ${formatCompactNumber(peakWriteQpsRaw)} QPS Ghi.`,
      },
    },
    {
      stepNumber: 2,
      title: { en: 'Origin DB QPS Surviving Cache Miss', vi: 'QPS Lọt Cache Đánh Xuống Origin DB' },
      formula: `${formatCompactNumber(peakWriteQpsRaw)} W + ${formatCompactNumber(peakReadQpsRaw)} R × (1 - ${inputs.cacheHitRatioPct}%)`,
      result: `${formatCompactNumber(originDbPeakQpsRaw)} Origin DB QPS`,
      note: {
        en: `Redis absorbs ${formatCompactNumber(cacheHitQpsRaw)} QPS (${inputs.cacheHitRatioPct}% hit rate), slashing read DB pressure.`,
        vi: `Redis hấp thụ ${formatCompactNumber(cacheHitQpsRaw)} QPS (trúng ${inputs.cacheHitRatioPct}%), giảm mạnh tải đọc cho DB.`,
      },
    },
    {
      stepNumber: 3,
      title: { en: 'Compute Fleet & DB Topology Sizing', vi: 'Cỡ Cụm App Pods & PostgreSQL Topology' },
      formula: `ceil(Peak / (UnitCap × 0.65 headroom)) · ${runtimeSpec.label} (${runtimeSpec.qpsPerPod} QPS/pod)`,
      result: `${autoScaledFleet.appPods} ${runtimeSpec.label} Pods · ${autoScaledFleet.dbPrimaryShards}P + ${autoScaledFleet.dbReadReplicas}R PG · ${autoScaledFleet.redisShards} Redis`,
      note: {
        en: `Runtime comparison: Go ${runtimePodComparison.go} pods · .NET 10 ${runtimePodComparison.dotnet10} pods · Node.js ${runtimePodComparison.nodejs} pods.`,
        vi: `So sánh runtime: Go ${runtimePodComparison.go} pod · .NET 10 ${runtimePodComparison.dotnet10} pod · Node.js ${runtimePodComparison.nodejs} pod.`,
      },
    },
    {
      stepNumber: 4,
      title: { en: '5-Year Replicated Storage & Peak Egress', vi: 'Lưu Trữ 5 Năm (3x) & Băng Thông Đỉnh CDN' },
      formula: `${formatCompactNumber(dailyWrites)} writes/d × ${bytesPerWrite} B × 1,825d × 3x | Peak R × ${inputs.avgPayloadKb} KB × 8b`,
      result: `${round2(fiveYearReplicatedStorageTbRaw)} TB (3x) · ${round2(peakCdnEgressGbpsRaw)} Gbps peak`,
      note: {
        en: `Daily ingestion ${round2(dailyStorageGbRaw)} GB/day · Monthly blended CDN egress ${round2(monthlyEgressTbRaw)} TB/mo.`,
        vi: `Phát sinh ${round2(dailyStorageGbRaw)} GB/ngày · Băng thông truyền tải CDN ${round2(monthlyEgressTbRaw)} TB/tháng.`,
      },
    },
  ];

  return {
    blueprintId: inputs.blueprintId,
    runtime: inputs.runtime,
    inputs,
    provisionedFleet,
    autoScaledFleet,
    avgWriteQps: round2(avgWriteQpsRaw),
    avgReadQps: round2(avgReadQpsRaw),
    avgTotalQps: round2(avgTotalQpsRaw),
    peakWriteQps: round2(peakWriteQpsRaw),
    peakReadQps: round2(peakReadQpsRaw),
    peakTotalQps: round2(peakTotalQpsRaw),
    cacheHitQps: round2(cacheHitQpsRaw),
    cacheMissReadQps: round2(cacheMissReadQpsRaw),
    originDbPeakQps: round2(originDbPeakQpsRaw),
    requiredAppPods: autoScaledFleet.appPods,
    runtimePodComparison,
    requiredDbPrimaryShards: autoScaledFleet.dbPrimaryShards,
    requiredDbReadReplicas: autoScaledFleet.dbReadReplicas,
    requiredRedisShards: autoScaledFleet.redisShards,
    requiredApiGwNodes: autoScaledFleet.apiGwNodes,
    requiredCdnGbps: autoScaledFleet.cdnGbps,
    dailyStorageGb: round2(dailyStorageGbRaw),
    fiveYearRawStorageTb: round2(fiveYearRawStorageTbRaw),
    fiveYearReplicatedStorageTb: round2(fiveYearReplicatedStorageTbRaw),
    peakCdnEgressGbps: round2(peakCdnEgressGbpsRaw),
    monthlyEgressTb: round2(monthlyEgressTbRaw),
    monthlyCloudCostUsd: totalMonthlyUsd,
    costBreakdown,
    tiers,
    bottlenecks,
    overloadedTiers,
    overallStatus,
    worksheetSteps,
  };
}

export function formatDau(dau: number): string {
  if (dau >= 1_000_000) {
    const m = dau / 1_000_000;
    return `${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(2).replace(/0$/, '')}M`;
  }
  if (dau >= 1_000) {
    const k = dau / 1_000;
    return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return String(Math.round(dau));
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 10_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

export function formatUsd(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export function generateSizingMarkdown(estimate: CapacityEstimate): string {
  const bp = getBlueprint(estimate.blueprintId);
  const rt = APP_RUNTIME_SPECS[estimate.runtime];
  const lines = [
    `# System Design Capacity Worksheet — ${bp.name.en}`,
    '',
    `## Workload Assumptions`,
    `- **Daily Active Users (DAU):** ${estimate.inputs.dau.toLocaleString('en-US')} (${formatDau(estimate.inputs.dau)})`,
    `- **Read:Write Ratio:** ${estimate.inputs.readWriteRatio}:1`,
    `- **Peak-to-Average Multiplier:** ${estimate.inputs.peakMultiplier}x`,
    `- **Redis Cache Hit Ratio:** ${estimate.inputs.cacheHitRatioPct}%`,
    `- **Average Payload Size:** ${estimate.inputs.avgPayloadKb} KB`,
    `- **Target App Runtime:** ${rt.label} (${rt.stackHint})`,
    '',
    `## Back-of-the-Envelope Sizing Output`,
    `- **Average QPS:** ${estimate.avgTotalQps} (${estimate.avgReadQps} R / ${estimate.avgWriteQps} W)`,
    `- **Peak QPS:** ${estimate.peakTotalQps} (${estimate.peakReadQps} R / ${estimate.peakWriteQps} W)`,
    `- **Origin DB Peak QPS (Post-Cache):** ${estimate.originDbPeakQps} (${estimate.cacheMissReadQps} miss R + ${estimate.peakWriteQps} W)`,
    `- **Required App Pods:** ${estimate.requiredAppPods} ${rt.label} pods (Go: ${estimate.runtimePodComparison.go} · .NET 10: ${estimate.runtimePodComparison.dotnet10} · Node.js: ${estimate.runtimePodComparison.nodejs})`,
    `- **PostgreSQL Topology:** ${estimate.requiredDbPrimaryShards} Primary Shard(s) + ${estimate.requiredDbReadReplicas} Read Replica(s)`,
    `- **Redis Cluster:** ${estimate.requiredRedisShards} Shard(s)`,
    `- **5-Year Storage (3x Replication):** ${estimate.fiveYearReplicatedStorageTb} TB`,
    `- **Peak CDN Egress:** ${estimate.peakCdnEgressGbps} Gbps (${estimate.monthlyEgressTb} TB/mo)`,
    `- **Estimated Monthly Cloud Cost:** ${formatUsd(estimate.monthlyCloudCostUsd)}/mo`,
    '',
    `## Live Bottleneck Audit`,
    ...estimate.tiers.map(
      (tier) =>
        `- **${tier.label.en}** [${tier.status.toUpperCase()} — ${tier.utilizationPct}%]: ${tier.provisionedLabel} (Recommended: ${tier.recommendedLabel})`,
    ),
  ];
  return lines.join('\n');
}
