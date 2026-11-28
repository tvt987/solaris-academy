import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CAMERA_PRESETS,
  computeAutoScaleConfig,
  computeTopologyTelemetry,
  DEFAULT_TOPOLOGY_3D_CONFIG,
  formatCompactRps,
  RPS_MAX,
  RPS_MIN,
  scaleTierBlades,
  TIER_ORDER,
  TIER_SPECS,
  TRAFFIC_PRESETS,
  type CameraPresetId,
  type ChaosMode,
  type NormalizedTopology3DConfig,
  type TopologyTierId,
} from '../engines/systemTopology3dEngine';
import type { Locale } from '../types/lms';
import { BoltIcon, NetworkScaleIcon, ShieldCheckIcon } from './Icons';

interface SystemTopology3DStageProps {
  locale: Locale;
}

const MAX_RENDER_BLADES = 8;
const MAX_PACKET_INSTANCES = 180;
const MAX_SPARK_INSTANCES = 96;

function sampleWaypoints(pts: readonly { x: number; y: number; z: number }[], t: number): { x: number; y: number; z: number } {
  const first = pts[0];
  if (!first) return { x: 0, y: 1, z: 0 };
  if (pts.length === 1) return first;
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (pts.length - 1);
  const idx = Math.min(pts.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const a = pts[idx] ?? first;
  const b = pts[idx + 1] ?? a;
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
    z: a.z + (b.z - a.z) * frac,
  };
}

export default function SystemTopology3DStage({ locale }: SystemTopology3DStageProps) {
  const [config, setConfig] = useState<NormalizedTopology3DConfig>(DEFAULT_TOPOLOGY_3D_CONFIG);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('isometric');
  const [selectedTier, setSelectedTier] = useState<TopologyTierId>('sharded_db');

  const mountRef = useRef<HTMLDivElement | null>(null);
  const telemetry = useMemo(() => computeTopologyTelemetry(config), [config]);

  const stateRef = useRef({ telemetry, cameraPreset, selectedTier });
  useEffect(() => {
    stateRef.current = { telemetry, cameraPreset, selectedTier };
  }, [telemetry, cameraPreset, selectedTier]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(320, container.clientWidth || 720);
    const height = Math.max(320, container.clientHeight || 390);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f3f7fc');
    scene.fog = new THREE.Fog('#f3f7fc', 18, 42);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 90);
    camera.position.set(0.4, 10.6, 14.8);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Oxford Daylight Blueprint Studio Lighting
    scene.add(new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.4));
    const keyLight = new THREE.DirectionalLight('#fffbf0', 1.45);
    keyLight.position.set(8, 14, 10);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight('#93c5fd', 0.85);
    rimLight.position.set(-10, 6, -8);
    scene.add(rimLight);

    // Architectural Blueprint Grid Floor
    const grid = new THREE.GridHelper(26, 36, '#93c5fd', '#dbeafe');
    grid.position.y = -0.02;
    scene.add(grid);

    // Build 5 Interactive Server-Rack Tier Bays
    const baseGeo = new THREE.BoxGeometry(2.2, 0.16, 2.2);
    const bladeGeo = new THREE.BoxGeometry(0.28, 1.45, 1.38);
    const beaconGeo = new THREE.SphereGeometry(0.14, 14, 14);

    const clickableTargets: THREE.Mesh[] = [];
    const tierVisuals = new Map<
      TopologyTierId,
      {
        baseMat: THREE.MeshStandardMaterial;
        beaconMat: THREE.MeshStandardMaterial;
        blades: THREE.Mesh[];
        bladeMats: THREE.MeshStandardMaterial[];
        bladeHeights: number[];
      }
    >();

    for (const tierId of TIER_ORDER) {
      const spec = TIER_SPECS[tierId];
      const bay = new THREE.Group();
      bay.position.set(spec.anchor.x, 0, spec.anchor.z);
      scene.add(bay);

      const baseMat = new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.36,
        metalness: 0.35,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.08;
      baseMesh.userData = { tierId };
      bay.add(baseMesh);
      clickableTargets.push(baseMesh);

      const beaconMat = new THREE.MeshStandardMaterial({
        color: spec.accentHex,
        emissive: spec.accentHex,
        emissiveIntensity: 0.5,
        roughness: 0.2,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 2.15, 0);
      bay.add(beacon);

      const blades: THREE.Mesh[] = [];
      const bladeMats: THREE.MeshStandardMaterial[] = [];
      const bladeHeights: number[] = [];

      for (let b = 0; b < MAX_RENDER_BLADES; b += 1) {
        const bMat = new THREE.MeshStandardMaterial({
          color: spec.accentHex,
          emissive: spec.accentHex,
          emissiveIntensity: 0.15,
          roughness: 0.28,
          metalness: 0.4,
        });
        const blade = new THREE.Mesh(bladeGeo, bMat);
        const col = b % 4;
        const row = Math.floor(b / 4);
        blade.position.set(-0.57 + col * 0.38, 0.78, row === 0 ? -0.35 : 0.35);
        blade.scale.set(1, 0.01, 0.45);
        blade.userData = { tierId };
        bay.add(blade);
        clickableTargets.push(blade);
        blades.push(blade);
        bladeMats.push(bMat);
        bladeHeights.push(0.01);
      }

      tierVisuals.set(tierId, { baseMat, beaconMat, blades, bladeMats, bladeHeights });
    }

    // Data-Plane Fiber Optic Rail Tubes
    const buildRail = (pts: readonly { x: number; y: number; z: number }[], color: string) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
      const tube = new THREE.TubeGeometry(curve, 36, 0.045, 8, false);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
      const mesh = new THREE.Mesh(tube, mat);
      scene.add(mesh);
      return { tube, mat };
    };
    const cacheRail = buildRail(telemetry.packetPlan.streams.cacheHit.waypoints, '#059669');
    const dbRail = buildRail(telemetry.packetPlan.streams.fullStack.waypoints, '#1d4ed8');

    // Instanced HTTP Request Packets (180) + 503 Overload Sparks (96)
    const pktGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const pktMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const pktMesh = new THREE.InstancedMesh(pktGeo, pktMat, MAX_PACKET_INSTANCES);
    scene.add(pktMesh);

    const pktPhases = new Float32Array(MAX_PACKET_INSTANCES);
    for (let i = 0; i < MAX_PACKET_INSTANCES; i += 1) {
      pktPhases[i] = i / MAX_PACKET_INSTANCES;
    }

    const sparkGeo = new THREE.OctahedronGeometry(0.09, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#dc2626' });
    const sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, MAX_SPARK_INSTANCES);
    scene.add(sparkMesh);

    const sparkSeeds = new Float32Array(MAX_SPARK_INSTANCES * 3);
    for (let i = 0; i < MAX_SPARK_INSTANCES; i += 1) {
      sparkSeeds[i * 3] = ((i * 37) % 100) / 100 - 0.5;
      sparkSeeds[i * 3 + 1] = ((i * 53) % 100) / 100;
      sparkSeeds[i * 3 + 2] = ((i * 71) % 100) / 100 - 0.5;
    }

    // Drag Orbit + Click on any Tier to +1 Blade!
    let isDragging = false;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let orbitYaw = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      orbitYaw = Math.max(-0.85, Math.min(0.85, orbitYaw + (e.clientX - lastX) * 0.006));
      lastX = e.clientX;
    };
    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      isDragging = false;
      if (moved < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickableTargets, false);
        const firstHit = hits[0];
        if (firstHit) {
          const hitTier = firstHit.object.userData?.tierId as TopologyTierId | undefined;
          if (hitTier) {
            setSelectedTier(hitTier);
            setConfig((prev) => scaleTierBlades(prev, hitTier, 1));
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width));
        const h = Math.max(300, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const dummy = new THREE.Object3D();
    const colEmerald = new THREE.Color('#059669');
    const colBlue = new THREE.Color('#2563eb');
    const colAmber = new THREE.Color('#d97706');
    const colCrimson = new THREE.Color('#dc2626');
    const colOffline = new THREE.Color('#64748b');
    const camTarget = new THREE.Vector3(0, 0.85, -0.25);
    const desiredCamPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();

    let rafId = 0;
    let prev = performance.now();

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      const { telemetry: tel, cameraPreset: camId, selectedTier: selTier } = stateRef.current;

      // Camera smooth preset + drag yaw
      const pose = CAMERA_PRESETS[camId];
      const cosY = Math.cos(orbitYaw);
      const sinY = Math.sin(orbitYaw);
      desiredCamPos.set(
        pose.position.x * cosY + pose.position.z * sinY,
        pose.position.y,
        -pose.position.x * sinY + pose.position.z * cosY
      );
      desiredLook.set(pose.target.x, pose.target.y, pose.target.z);
      camera.position.lerp(desiredCamPos, Math.min(1, dt * 4.5));
      camTarget.lerp(desiredLook, Math.min(1, dt * 4.5));
      camera.lookAt(camTarget);

      // Update 5 Tiers: blade height rise + CPU thermal color
      const lerpK = Math.min(1, dt * 7);
      for (const tier of tel.tiers) {
        const vis = tierVisuals.get(tier.id);
        if (!vis) continue;

        const statusColor =
          tier.status === 'offline'
            ? colOffline
            : tier.status === 'saturated'
              ? colCrimson
              : tier.status === 'elevated'
                ? colAmber
                : tier.id === 'redis_cache'
                  ? colEmerald
                  : colBlue;

        vis.beaconMat.color.copy(statusColor);
        vis.beaconMat.emissive.copy(statusColor);
        vis.beaconMat.emissiveIntensity =
          tier.status === 'saturated' ? 0.85 + Math.sin(now * 0.012) * 0.35 : 0.45;
        vis.baseMat.color.set(tier.id === selTier ? '#0f172a' : '#334155');

        const visibleBlades = Math.min(MAX_RENDER_BLADES, tier.activeNodes);
        for (let b = 0; b < MAX_RENDER_BLADES; b += 1) {
          const bladeMesh = vis.blades[b];
          const bladeMat = vis.bladeMats[b];
          if (!bladeMesh || !bladeMat) continue;
          const prevH = vis.bladeHeights[b] ?? 0.01;
          const targetScaleY = b < visibleBlades ? 0.72 + (tier.cpuPct / 100) * 0.45 : 0.001;
          const h = prevH + (targetScaleY - prevH) * lerpK;
          vis.bladeHeights[b] = h;
          bladeMesh.visible = h > 0.03;
          bladeMesh.scale.y = Math.max(0.01, h);
          bladeMesh.position.y = 0.16 + (1.45 * Math.max(0.01, h)) / 2;
          bladeMat.color.copy(statusColor);
          bladeMat.emissive.copy(statusColor);
          bladeMat.emissiveIntensity = tier.status === 'saturated' ? 0.42 : 0.14;
        }
      }

      // Animate Instanced HTTP Request Packets along Cache-Hit & Full-Stack Streams
      const { cacheHit, fullStack } = tel.packetPlan.streams;
      const cacheCount = Math.min(100, cacheHit.activeCount);
      const fullCount = Math.min(MAX_PACKET_INSTANCES - cacheCount, fullStack.activeCount);
      const fullColor = new THREE.Color(fullStack.colorHex);

      for (let i = 0; i < MAX_PACKET_INSTANCES; i += 1) {
        if (i < cacheCount) {
          const nextPhase = ((pktPhases[i] ?? 0) + dt * cacheHit.speedUnitsPerSec) % 1;
          pktPhases[i] = nextPhase;
          const pt = sampleWaypoints(cacheHit.waypoints, nextPhase);
          dummy.position.set(pt.x, pt.y + 0.15, pt.z);
          dummy.scale.setScalar(1.0);
          dummy.updateMatrix();
          pktMesh.setMatrixAt(i, dummy.matrix);
          pktMesh.setColorAt(i, colEmerald);
        } else if (i < cacheCount + fullCount) {
          const nextPhase = ((pktPhases[i] ?? 0) + dt * fullStack.speedUnitsPerSec) % 1;
          pktPhases[i] = nextPhase;
          const pt = sampleWaypoints(fullStack.waypoints, nextPhase);
          dummy.position.set(pt.x, pt.y + 0.15, pt.z);
          dummy.scale.setScalar(1.08);
          dummy.updateMatrix();
          pktMesh.setMatrixAt(i, dummy.matrix);
          pktMesh.setColorAt(i, fullColor);
        } else {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          pktMesh.setMatrixAt(i, dummy.matrix);
        }
      }
      pktMesh.instanceMatrix.needsUpdate = true;
      if (pktMesh.instanceColor) pktMesh.instanceColor.needsUpdate = true;

      // Animate Crimson 503 Overload Sparks erupting from Saturated Tiers
      const emitters = tel.packetPlan.sparkEmitters;
      for (let i = 0; i < MAX_SPARK_INSTANCES; i += 1) {
        const em = emitters.length > 0 ? emitters[i % emitters.length] : undefined;
        if (!em) {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0.001);
          dummy.updateMatrix();
          sparkMesh.setMatrixAt(i, dummy.matrix);
        } else {
          const seedX = sparkSeeds[i * 3] ?? 0;
          const seedY = sparkSeeds[i * 3 + 1] ?? 0;
          const seedZ = sparkSeeds[i * 3 + 2] ?? 0;
          const phase = (now * 0.0018 * (0.8 + em.intensity) + seedY) % 1;
          const sx = em.origin.x + seedX * (1.2 + phase * 1.4);
          const sy = em.origin.y + phase * (2.6 * em.intensity);
          const sz = em.origin.z + seedZ * (1.2 + phase * 1.4);
          dummy.position.set(sx, sy, sz);
          dummy.scale.setScalar((1 - phase) * 1.35);
          dummy.rotation.set(phase * 6, phase * 4, 0);
          dummy.updateMatrix();
          sparkMesh.setMatrixAt(i, dummy.matrix);
        }
      }
      sparkMesh.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      baseGeo.dispose();
      bladeGeo.dispose();
      beaconGeo.dispose();
      cacheRail.tube.dispose();
      cacheRail.mat.dispose();
      dbRail.tube.dispose();
      dbRail.mat.dispose();
      pktGeo.dispose();
      pktMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      renderer.dispose();
    };
  }, []);

  const triggerChaos = (mode: ChaosMode) => {
    setConfig((prev) => ({
      ...prev,
      rps: mode === 'cache_stampede' ? Math.max(prev.rps, 40_000) : prev.rps,
      redisEnabled: mode === 'cache_stampede' ? false : prev.redisEnabled,
      chaosMode: mode,
    }));
  };

  const handleAutoScale = () => {
    setConfig((prev) => computeAutoScaleConfig(prev));
  };

  const statusTone =
    telemetry.overallStatus === 'saturated'
      ? 'border-red-600/40 bg-red-600/12 text-red-700 dark:text-red-300'
      : telemetry.overallStatus === 'elevated'
        ? 'border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300'
        : 'border-emerald-600/40 bg-emerald-600/12 text-emerald-700 dark:text-emerald-300';

  return (
    <div
      data-testid="solaris-3d-topology-stage"
      className="sol-card overflow-hidden rounded-2xl border border-[var(--sol-border-strong)]"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sol-border)] bg-[var(--sol-bg)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <NetworkScaleIcon className="h-4 w-4 text-blue-700 dark:text-blue-400" />
          <span className="font-code text-[11px] font-bold uppercase tracking-wider text-[var(--sol-text)]">
            {locale === 'vi'
              ? 'SA BÀN KIẾN TRÚC PHÂN TÁN 3D · THREE.JS v4.0'
              : '3D DISTRIBUTED TOPOLOGY SANDBOX · THREE.JS v4.0'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(['isometric', 'data_plane', 'db_bottleneck'] as CameraPresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`solaris-cam-${id}`}
              onClick={() => setCameraPreset(id)}
              className={`cursor-pointer rounded-md border px-2 py-0.5 font-code text-[10px] font-bold transition ${
                cameraPreset === id
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-[var(--sol-border)] bg-[var(--sol-surface)] text-[var(--sol-text-secondary)] hover:border-blue-600'
              }`}
            >
              {CAMERA_PRESETS[id].label[locale]}
            </button>
          ))}
        </div>
      </div>

      {/* Three.js Viewport */}
      <div className="relative">
        <div
          ref={mountRef}
          className="h-[310px] w-full cursor-grab active:cursor-grabbing sm:h-[345px]"
          aria-label="Interactive 3D 5-Tier Distributed Cloud Architecture Sandbox"
        />

        {/* Top-Left Live SLA Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-lg border px-2.5 py-1 font-code text-[10px] font-extrabold backdrop-blur-sm ${statusTone}`}>
            P99: {telemetry.endToEndP99Ms.toFixed(1)}ms · 503 DROP: {telemetry.dropRate503Pct.toFixed(2)}%
          </span>
          <span className="rounded-lg border border-slate-300/80 bg-white/92 px-2.5 py-1 font-code text-[10px] font-bold text-slate-800">
            REDIS HIT: {telemetry.cacheHitRatioPct}% · ${telemetry.monthlyCloudCostUsd.toLocaleString('en-US')}/mo
          </span>
        </div>

        {/* Bottom Interactive Tier Blades Strip (Click any tier to +1 blade!) */}
        <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center gap-1">
          {telemetry.tiers.map((tier) => {
            const pillTone =
              tier.status === 'saturated'
                ? 'border-red-500 bg-red-600 text-white'
                : tier.status === 'offline'
                  ? 'border-slate-500 bg-slate-700 text-slate-200'
                  : tier.id === selectedTier
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : 'border-slate-300/90 bg-white/92 text-slate-800 hover:border-blue-600';
            return (
              <button
                key={tier.id}
                type="button"
                data-testid={`solaris-tier-${tier.id}`}
                onClick={() => {
                  setSelectedTier(tier.id);
                  setConfig((prev) => scaleTierBlades(prev, tier.id, 1));
                }}
                className={`cursor-pointer rounded-lg border px-2 py-1 font-code text-[10px] font-bold shadow-xs transition ${pillTone}`}
                title="Click to +1 blade"
              >
                {tier.code} {tier.activeNodes}x ({tier.cpuPct.toFixed(0)}%)
              </button>
            );
          })}
        </div>
      </div>

      {/* Direct Manipulation Controls: RPS Scrubber + Chaos + 1-Click Auto-Scale */}
      <div className="space-y-3 border-t border-[var(--sol-border)] bg-[var(--sol-surface)] p-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[var(--sol-text)]">
              {locale === 'vi' ? 'Lưu Lượng Truy Cập (RPS)' : 'Incoming Traffic Load'} —{' '}
              <span className="font-code text-blue-700 dark:text-blue-400">
                {formatCompactRps(config.rps)} RPS
              </span>
            </span>
            <div className="flex flex-wrap gap-1">
              {Object.values(TRAFFIC_PRESETS).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, rps: preset.rps }))}
                  className={`cursor-pointer rounded-md border px-2 py-0.5 font-code text-[10px] font-bold transition ${
                    config.rps === preset.rps
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-[var(--sol-border)] text-[var(--sol-text-secondary)] hover:border-blue-600'
                  }`}
                >
                  {preset.shortLabel}
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            min={RPS_MIN}
            max={RPS_MAX}
            step={1_000}
            value={config.rps}
            onChange={(e) => setConfig((prev) => ({ ...prev, rps: Number(e.target.value) }))}
            aria-label="Incoming requests per second"
            className="h-2 w-full cursor-pointer accent-blue-700"
          />
        </div>

        {/* Chaos Injection vs 1-Click Auto-Scale */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            data-testid="solaris-chaos-stampede"
            onClick={() => triggerChaos('cache_stampede')}
            className={`cursor-pointer rounded-xl border px-3 py-2 font-code text-[11px] font-bold transition ${
              config.chaosMode === 'cache_stampede'
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-red-600/35 bg-red-600/8 text-red-700 hover:bg-red-600 hover:text-white dark:text-red-300'
            }`}
          >
            INJECT CACHE STAMPEDE
          </button>

          <button
            type="button"
            data-testid="solaris-chaos-dbfailover"
            onClick={() => triggerChaos('db_failover')}
            className={`cursor-pointer rounded-xl border px-3 py-2 font-code text-[11px] font-bold transition ${
              config.chaosMode === 'db_failover'
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-amber-600/35 bg-amber-600/8 text-amber-800 hover:bg-amber-600 hover:text-white dark:text-amber-300'
            }`}
          >
            DB PRIMARY FAILOVER
          </button>

          <button
            type="button"
            data-testid="solaris-autoscale-btn"
            onClick={handleAutoScale}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 font-code text-[11px] font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <BoltIcon className="h-3.5 w-3.5" />
            <span>1-CLICK AUTO-SCALE</span>
          </button>
        </div>

        {/* Telemetry Hint Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-bg)] px-3 py-2 font-code text-[11px] text-[var(--sol-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {locale === 'vi'
                ? `Nhấn vào bất kỳ cụm 3D nào để nâng +1 blade · Origin DB: ${formatCompactRps(telemetry.originDbQps)} QPS`
                : `Click any 3D rack bay to +1 blade · Origin DB Load: ${formatCompactRps(telemetry.originDbQps)} QPS`}
            </span>
          </span>
          <span className="font-bold text-[var(--sol-text)]">
            {telemetry.successfulRps.toLocaleString('en-US')} OK/s
          </span>
        </div>
      </div>
    </div>
  );
}
