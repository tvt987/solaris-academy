"""
Solaris Academy v3.0 — System Design Back-of-the-Envelope Capacity & Scaling Engine.

Maintains 100% mathematical parity with `src/engines/systemDesignEngine.ts`:
  - 3 production FAANG blueprints:
      * url-shortener      (Global Short-URL / Redirector)
      * flash-sale-voucher (Flash-Sale E-Commerce Voucher API)
      * realtime-chat-feed (Real-Time Chat & Presence Feed)
  - Deterministic Average & Peak QPS (Read/Write), Origin DB QPS surviving cache miss,
    Required App Pods (.NET 10 / Go / Node.js), PostgreSQL Primary + Read Replicas,
    Redis Cache Cluster Shards, 5-Year Storage Footprint (TB with 3x replication),
    Peak CDN Egress (Gbps), 5-Tier Bottleneck Analysis, 1-Click Auto-Scale, and
    Itemized Monthly Cloud Cost Estimate (USD).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

BlueprintId = Literal["url-shortener", "flash-sale-voucher", "realtime-chat-feed"]
AppRuntime = Literal["dotnet10", "go", "nodejs"]
TierId = Literal["cdn", "api_gateway", "app_fleet", "redis_cache", "database"]
TierStatus = Literal["healthy", "warning", "overloaded"]

SECONDS_PER_DAY = 86_400
DAYS_IN_FIVE_YEARS = 365 * 5
STORAGE_REPLICATION_FACTOR = 3
TARGET_HEADROOM_UTILIZATION = 0.65

API_GW_QPS_PER_NODE = 15_000
REDIS_QPS_PER_SHARD = 45_000
DB_PRIMARY_WRITE_QPS_PER_SHARD = 2_500
DB_READ_REPLICA_QPS = 4_000


@dataclass(frozen=True)
class RuntimeSpec:
    id: AppRuntime
    label: str
    qps_per_pod: int
    monthly_usd_per_pod: int


APP_RUNTIME_SPECS: dict[AppRuntime, RuntimeSpec] = {
    "dotnet10": RuntimeSpec(
        id="dotnet10",
        label=".NET 10",
        qps_per_pod=3_500,
        monthly_usd_per_pod=115,
    ),
    "go": RuntimeSpec(
        id="go",
        label="Go",
        qps_per_pod=4_200,
        monthly_usd_per_pod=92,
    ),
    "nodejs": RuntimeSpec(
        id="nodejs",
        label="Node.js",
        qps_per_pod=1_600,
        monthly_usd_per_pod=110,
    ),
}


@dataclass(frozen=True)
class ProvisionedFleetSpec:
    cdn_gbps: float
    api_gw_nodes: int
    app_pods: int
    redis_shards: int
    db_primary_shards: int
    db_read_replicas: int


@dataclass(frozen=True)
class BlueprintSpec:
    id: BlueprintId
    name: str
    writes_per_dau_per_day: int
    metadata_overhead_bytes: int
    baseline_fleet: ProvisionedFleetSpec


BLUEPRINTS: dict[BlueprintId, BlueprintSpec] = {
    "url-shortener": BlueprintSpec(
        id="url-shortener",
        name="Global Short-URL / Redirector",
        writes_per_dau_per_day=2,
        metadata_overhead_bytes=256,
        baseline_fleet=ProvisionedFleetSpec(
            cdn_gbps=2.0,
            api_gw_nodes=1,
            app_pods=4,
            redis_shards=2,
            db_primary_shards=1,
            db_read_replicas=1,
        ),
    ),
    "flash-sale-voucher": BlueprintSpec(
        id="flash-sale-voucher",
        name="Flash-Sale E-Commerce Voucher API",
        writes_per_dau_per_day=4,
        metadata_overhead_bytes=512,
        baseline_fleet=ProvisionedFleetSpec(
            cdn_gbps=2.0,
            api_gw_nodes=1,
            app_pods=4,
            redis_shards=2,
            db_primary_shards=1,
            db_read_replicas=1,
        ),
    ),
    "realtime-chat-feed": BlueprintSpec(
        id="realtime-chat-feed",
        name="Real-Time Chat & Presence Feed",
        writes_per_dau_per_day=15,
        metadata_overhead_bytes=768,
        baseline_fleet=ProvisionedFleetSpec(
            cdn_gbps=2.0,
            api_gw_nodes=1,
            app_pods=4,
            redis_shards=2,
            db_primary_shards=1,
            db_read_replicas=1,
        ),
    ),
}


@dataclass(frozen=True)
class TierHealthResult:
    id: TierId
    label: str
    load_value: float
    capacity_value: float
    unit: str
    utilization_pct: float
    status: TierStatus
    provisioned_units: float
    recommended_units: float
    summary: str


@dataclass(frozen=True)
class CostBreakdownResult:
    cdn_usd: int
    api_gw_usd: int
    app_fleet_usd: int
    redis_usd: int
    database_usd: int
    total_monthly_usd: int


@dataclass(frozen=True)
class CapacityEstimateResult:
    blueprint_id: BlueprintId
    blueprint_name: str
    runtime: AppRuntime
    dau: int
    read_write_ratio: int
    peak_multiplier: int
    cache_hit_ratio_pct: int
    avg_payload_kb: int
    avg_write_qps: float
    avg_read_qps: float
    avg_total_qps: float
    peak_write_qps: float
    peak_read_qps: float
    peak_total_qps: float
    cache_hit_qps: float
    cache_miss_read_qps: float
    origin_db_peak_qps: float
    required_app_pods: int
    runtime_pod_comparison: dict[AppRuntime, int]
    required_db_primary_shards: int
    required_db_read_replicas: int
    required_redis_shards: int
    required_api_gw_nodes: int
    required_cdn_gbps: float
    daily_storage_gb: float
    five_year_raw_storage_tb: float
    five_year_replicated_storage_tb: float
    peak_cdn_egress_gbps: float
    monthly_egress_tb: float
    monthly_cloud_cost_usd: int
    cost_breakdown: CostBreakdownResult
    tiers: list[TierHealthResult]
    bottlenecks: list[TierId]
    overloaded_tiers: list[TierId]
    overall_status: TierStatus
    provisioned_fleet: ProvisionedFleetSpec
    auto_scaled_fleet: ProvisionedFleetSpec


def _round2(value: float) -> float:
    return math.floor(value * 100.0 + 0.5) / 100.0


def _round1(value: float) -> float:
    return math.floor(value * 10.0 + 0.5) / 10.0


def _round_int(value: float) -> int:
    return int(math.floor(value + 0.5))


def _classify_utilization(utilization_pct: float) -> TierStatus:
    if utilization_pct >= 100.0:
        return "overloaded"
    if utilization_pct >= 75.0:
        return "warning"
    return "healthy"


def compute_system_design_capacity(
    *,
    blueprint_id: BlueprintId,
    dau: int,
    read_write_ratio: int,
    peak_multiplier: int,
    cache_hit_ratio_pct: int,
    avg_payload_kb: int,
    runtime: AppRuntime = "dotnet10",
    provisioned_fleet: ProvisionedFleetSpec | None = None,
    auto_scale: bool = False,
) -> CapacityEstimateResult:
    blueprint = BLUEPRINTS[blueprint_id]
    runtime_spec = APP_RUNTIME_SPECS[runtime]

    # 1. Traffic QPS
    daily_writes = dau * blueprint.writes_per_dau_per_day
    avg_write_qps_raw = daily_writes / SECONDS_PER_DAY
    avg_read_qps_raw = avg_write_qps_raw * read_write_ratio
    avg_total_qps_raw = avg_read_qps_raw + avg_write_qps_raw

    peak_write_qps_raw = avg_write_qps_raw * peak_multiplier
    peak_read_qps_raw = avg_read_qps_raw * peak_multiplier
    peak_total_qps_raw = peak_read_qps_raw + peak_write_qps_raw

    # 2. Cache Hit & Origin DB Survival QPS
    cache_hit_fraction = cache_hit_ratio_pct / 100.0
    cache_hit_qps_raw = peak_read_qps_raw * cache_hit_fraction
    cache_miss_read_qps_raw = peak_read_qps_raw * (1.0 - cache_hit_fraction)
    origin_db_peak_qps_raw = peak_write_qps_raw + cache_miss_read_qps_raw

    # 3. 5-Year Storage Footprint (decimal TB, 3x replication)
    bytes_per_write = avg_payload_kb * 1024 + blueprint.metadata_overhead_bytes
    daily_storage_bytes = daily_writes * bytes_per_write
    daily_storage_gb_raw = daily_storage_bytes / 1_000_000_000.0
    five_year_raw_storage_tb_raw = (
        daily_storage_bytes * DAYS_IN_FIVE_YEARS
    ) / 1_000_000_000_000.0
    five_year_replicated_storage_tb_raw = (
        five_year_raw_storage_tb_raw * STORAGE_REPLICATION_FACTOR
    )

    # 4. Peak CDN Egress (Gbps) & Monthly Egress (TB)
    peak_cdn_egress_gbps_raw = (peak_read_qps_raw * avg_payload_kb * 8.0) / 1_000_000.0
    monthly_egress_tb_raw = (
        avg_read_qps_raw * avg_payload_kb * 1_000.0 * SECONDS_PER_DAY * 30.0
    ) / 1_000_000_000_000.0

    # 5. Required Auto-Scaled Fleet (target <= 65% utilization / 35% safety headroom)
    def pods_for_runtime(rt_key: AppRuntime) -> int:
        spec = APP_RUNTIME_SPECS[rt_key]
        return max(2, math.ceil(peak_total_qps_raw / (spec.qps_per_pod * TARGET_HEADROOM_UTILIZATION)))

    runtime_pod_comparison: dict[AppRuntime, int] = {
        "dotnet10": pods_for_runtime("dotnet10"),
        "go": pods_for_runtime("go"),
        "nodejs": pods_for_runtime("nodejs"),
    }

    required_cdn_gbps = _round1(
        max(2.0, math.ceil((peak_cdn_egress_gbps_raw / TARGET_HEADROOM_UTILIZATION) * 2.0) / 2.0)
    )
    required_api_gw_nodes = max(
        1, math.ceil(peak_total_qps_raw / (API_GW_QPS_PER_NODE * TARGET_HEADROOM_UTILIZATION))
    )
    required_redis_shards = max(
        1, math.ceil(peak_read_qps_raw / (REDIS_QPS_PER_SHARD * TARGET_HEADROOM_UTILIZATION))
    )
    required_db_primary_shards = max(
        1,
        math.ceil(
            peak_write_qps_raw / (DB_PRIMARY_WRITE_QPS_PER_SHARD * TARGET_HEADROOM_UTILIZATION)
        ),
    )
    required_db_read_replicas = max(
        1, math.ceil(cache_miss_read_qps_raw / (DB_READ_REPLICA_QPS * TARGET_HEADROOM_UTILIZATION))
    )

    auto_scaled_fleet = ProvisionedFleetSpec(
        cdn_gbps=required_cdn_gbps,
        api_gw_nodes=required_api_gw_nodes,
        app_pods=runtime_pod_comparison[runtime],
        redis_shards=required_redis_shards,
        db_primary_shards=required_db_primary_shards,
        db_read_replicas=required_db_read_replicas,
    )

    active_fleet = (
        auto_scaled_fleet
        if auto_scale
        else (provisioned_fleet if provisioned_fleet is not None else blueprint.baseline_fleet)
    )

    # 6. Tier-by-Tier Bottleneck Analysis
    cdn_cap = active_fleet.cdn_gbps
    cdn_util = _round1((peak_cdn_egress_gbps_raw / cdn_cap) * 100.0)

    api_gw_cap = active_fleet.api_gw_nodes * API_GW_QPS_PER_NODE
    api_gw_util = _round1((peak_total_qps_raw / api_gw_cap) * 100.0)

    app_cap = active_fleet.app_pods * runtime_spec.qps_per_pod
    app_util = _round1((peak_total_qps_raw / app_cap) * 100.0)

    redis_cap = active_fleet.redis_shards * REDIS_QPS_PER_SHARD
    redis_util = _round1((peak_read_qps_raw / redis_cap) * 100.0)

    db_primary_cap = active_fleet.db_primary_shards * DB_PRIMARY_WRITE_QPS_PER_SHARD
    db_replica_cap = active_fleet.db_read_replicas * DB_READ_REPLICA_QPS
    db_write_util = (peak_write_qps_raw / db_primary_cap) * 100.0
    db_read_util = (cache_miss_read_qps_raw / db_replica_cap) * 100.0
    db_util = _round1(max(db_write_util, db_read_util))

    tiers = [
        TierHealthResult(
            id="cdn",
            label="CDN Edge PoPs",
            load_value=_round2(peak_cdn_egress_gbps_raw),
            capacity_value=_round2(cdn_cap),
            unit="Gbps",
            utilization_pct=cdn_util,
            status=_classify_utilization(cdn_util),
            provisioned_units=active_fleet.cdn_gbps,
            recommended_units=auto_scaled_fleet.cdn_gbps,
            summary=(
                f"Peak edge egress {_round2(peak_cdn_egress_gbps_raw)} Gbps vs "
                f"{_round2(cdn_cap)} Gbps committed quota ({cdn_util}%)."
            ),
        ),
        TierHealthResult(
            id="api_gateway",
            label="API Gateway",
            load_value=_round2(peak_total_qps_raw),
            capacity_value=float(api_gw_cap),
            unit="QPS",
            utilization_pct=api_gw_util,
            status=_classify_utilization(api_gw_util),
            provisioned_units=float(active_fleet.api_gw_nodes),
            recommended_units=float(auto_scaled_fleet.api_gw_nodes),
            summary=(
                f"Ingress {_round2(peak_total_qps_raw)} QPS across {active_fleet.api_gw_nodes} "
                f"node(s) ({api_gw_util}% utilization)."
            ),
        ),
        TierHealthResult(
            id="app_fleet",
            label=f"App Fleet ({runtime_spec.label})",
            load_value=_round2(peak_total_qps_raw),
            capacity_value=float(app_cap),
            unit="QPS",
            utilization_pct=app_util,
            status=_classify_utilization(app_util),
            provisioned_units=float(active_fleet.app_pods),
            recommended_units=float(auto_scaled_fleet.app_pods),
            summary=(
                f"{active_fleet.app_pods} {runtime_spec.label} pods handling "
                f"{_round2(peak_total_qps_raw)} peak QPS ({app_util}% utilization)."
            ),
        ),
        TierHealthResult(
            id="redis_cache",
            label="Redis Cache Cluster",
            load_value=_round2(peak_read_qps_raw),
            capacity_value=float(redis_cap),
            unit="QPS",
            utilization_pct=redis_util,
            status=_classify_utilization(redis_util),
            provisioned_units=float(active_fleet.redis_shards),
            recommended_units=float(auto_scaled_fleet.redis_shards),
            summary=(
                f"{active_fleet.redis_shards} Redis shard(s) absorbing {cache_hit_ratio_pct}% "
                f"of reads ({redis_util}% utilization)."
            ),
        ),
        TierHealthResult(
            id="database",
            label="PostgreSQL Primary + Replicas",
            load_value=_round2(origin_db_peak_qps_raw),
            capacity_value=float(db_primary_cap + db_replica_cap),
            unit="QPS",
            utilization_pct=db_util,
            status=_classify_utilization(db_util),
            provisioned_units=float(active_fleet.db_primary_shards + active_fleet.db_read_replicas),
            recommended_units=float(
                auto_scaled_fleet.db_primary_shards + auto_scaled_fleet.db_read_replicas
            ),
            summary=(
                f"{active_fleet.db_primary_shards}P + {active_fleet.db_read_replicas}R handling "
                f"{_round2(peak_write_qps_raw)} W / {_round2(cache_miss_read_qps_raw)} miss R QPS "
                f"(max tier load {db_util}%)."
            ),
        ),
    ]

    bottlenecks: list[TierId] = [t.id for t in tiers if t.status != "healthy"]
    overloaded_tiers: list[TierId] = [t.id for t in tiers if t.status == "overloaded"]
    overall_status: TierStatus = (
        "overloaded" if overloaded_tiers else ("warning" if bottlenecks else "healthy")
    )

    # 7. Monthly Cloud Cost Estimate (USD)
    cdn_usd = _round_int(active_fleet.cdn_gbps * 85.0 + monthly_egress_tb_raw * 28.0)
    monthly_requests_millions = (avg_total_qps_raw * SECONDS_PER_DAY * 30.0) / 1_000_000.0
    api_gw_usd = _round_int(active_fleet.api_gw_nodes * 140.0 + monthly_requests_millions * 0.9)
    app_fleet_usd = _round_int(active_fleet.app_pods * runtime_spec.monthly_usd_per_pod)
    redis_usd = _round_int(active_fleet.redis_shards * 260.0)
    active_year1_storage_tb = max(0.1, five_year_replicated_storage_tb_raw / 5.0)
    database_usd = _round_int(
        active_fleet.db_primary_shards * 520.0
        + active_fleet.db_read_replicas * 340.0
        + active_year1_storage_tb * 115.0
    )
    total_monthly_usd = cdn_usd + api_gw_usd + app_fleet_usd + redis_usd + database_usd

    cost_breakdown = CostBreakdownResult(
        cdn_usd=cdn_usd,
        api_gw_usd=api_gw_usd,
        app_fleet_usd=app_fleet_usd,
        redis_usd=redis_usd,
        database_usd=database_usd,
        total_monthly_usd=total_monthly_usd,
    )

    return CapacityEstimateResult(
        blueprint_id=blueprint_id,
        blueprint_name=blueprint.name,
        runtime=runtime,
        dau=dau,
        read_write_ratio=read_write_ratio,
        peak_multiplier=peak_multiplier,
        cache_hit_ratio_pct=cache_hit_ratio_pct,
        avg_payload_kb=avg_payload_kb,
        avg_write_qps=_round2(avg_write_qps_raw),
        avg_read_qps=_round2(avg_read_qps_raw),
        avg_total_qps=_round2(avg_total_qps_raw),
        peak_write_qps=_round2(peak_write_qps_raw),
        peak_read_qps=_round2(peak_read_qps_raw),
        peak_total_qps=_round2(peak_total_qps_raw),
        cache_hit_qps=_round2(cache_hit_qps_raw),
        cache_miss_read_qps=_round2(cache_miss_read_qps_raw),
        origin_db_peak_qps=_round2(origin_db_peak_qps_raw),
        required_app_pods=auto_scaled_fleet.app_pods,
        runtime_pod_comparison=runtime_pod_comparison,
        required_db_primary_shards=auto_scaled_fleet.db_primary_shards,
        required_db_read_replicas=auto_scaled_fleet.db_read_replicas,
        required_redis_shards=auto_scaled_fleet.redis_shards,
        required_api_gw_nodes=auto_scaled_fleet.api_gw_nodes,
        required_cdn_gbps=auto_scaled_fleet.cdn_gbps,
        daily_storage_gb=_round2(daily_storage_gb_raw),
        five_year_raw_storage_tb=_round2(five_year_raw_storage_tb_raw),
        five_year_replicated_storage_tb=_round2(five_year_replicated_storage_tb_raw),
        peak_cdn_egress_gbps=_round2(peak_cdn_egress_gbps_raw),
        monthly_egress_tb=_round2(monthly_egress_tb_raw),
        monthly_cloud_cost_usd=total_monthly_usd,
        cost_breakdown=cost_breakdown,
        tiers=tiers,
        bottlenecks=bottlenecks,
        overloaded_tiers=overloaded_tiers,
        overall_status=overall_status,
        provisioned_fleet=active_fleet,
        auto_scaled_fleet=auto_scaled_fleet,
    )
