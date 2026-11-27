# Solaris Academy v3.0 — Oxford Academic LMS, System Design Capacity Lab & FastAPI Auto-Grader

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-1D4ED8?style=flat-square)](https://tvt987.github.io/solaris-academy/)
[![Frontend Tests](https://img.shields.io/badge/Vitest-71_Passed-059669?style=flat-square)](#verification--quality-gates)
[![Backend Tests](https://img.shields.io/badge/Pytest_FastAPI-41_Passed-059669?style=flat-square)](#verification--quality-gates)
[![Zero Eval](https://img.shields.io/badge/AST_Sandbox-Zero_Eval-0F172A?style=flat-square)](./docs/ADR-001-ZeroEval-AST-Sandbox-Security.md)

**Solaris Academy v3.0** is a full-stack production engineering Learning Management System (LMS) combining a **Daylight Oxford Academic Paper** React 19 + TypeScript frontend (`#F9FAFB` canvas, `#FFFFFF` structured cards, `#1D4ED8` Oxford Royal Blue, `#059669` Mastery Emerald, `Newsreader` serif course titles paired with `Plus Jakarta Sans` and `JetBrains Mono`, plus optional Evening Dark Mode) with an interactive **FAANG System Design Back-of-the-Envelope Capacity & Bottleneck Estimator** and a tested **Python 3.12 FastAPI** zero-eval AST auto-grader, capacity engine, SuperMemo-2 scheduler, and HMAC-SHA256 certificate verification backend.

---

## System Architecture

```mermaid
flowchart LR
    subgraph Client["Web Client · React 19 + TypeScript + Vite (Code-Split)"]
        UI["Daylight Oxford UI\nHeader · Hero · Catalog"]
        SD["Lazy: SystemDesignCapacityLab\nBack-of-the-Envelope Sizing · SVG Bottlenecks"]
        ALGO["Lazy: AlgorithmVisualizerLab\nBinary Search · QuickSort · Dijkstra"]
        LAB["Lazy: CodeSandboxLab\nJS AST Sandbox + Quiz Arena"]
        SM2C["Lazy: FlashcardTrainer\nSM-2 Deck · IndexedDB"]
        CERT["Lazy: CertificateModal\nA4 Vector SVG · QR"]
        PAY["Lazy: CheckoutModal\nBundle Pricing · EMVCo VietQR"]
    end

    subgraph Edge["Nginx Reverse Proxy (Strict CSP + Immutable Assets)"]
        NGX["nginx:1.27-alpine\nPort 80 / 8080"]
    end

    subgraph Backend["Python 3.12 FastAPI Backend (backend/solaris_api)"]
        API["FastAPI App · Port 8000"]
        CAP["System Design Capacity Engine\nQPS · Cache Miss · Pods · Replicas · Cost"]
        AST["Zero-Eval Python AST Validator\n& Bounded Tree-Walker"]
        SM2S["SM-2 Spaced-Repetition Engine"]
        HMAC["HMAC-SHA256 Certificate\nIssuer & Constant-Time Verifier"]
    end

    subgraph Data["Production Data Tier (docker-compose.yml)"]
        PG[("PostgreSQL 16")]
        RD[("Redis 7")]
    end

    UI --> SD & ALGO & LAB & SM2C & CERT & PAY
    Client --> NGX
    NGX -->|"/api/* & /health"| API
    API --> CAP & AST & SM2S & HMAC
    API --> PG & RD
```

---

## Key Capabilities

### 1. Daylight Oxford Academic LMS (`src/`)
- **Visual System**: Boots into crisp Daylight Oxford Academic Paper (`#F9FAFB` canvas, `#FFFFFF` course cards, `#1D4ED8` primary royal blue, `#059669` mastery emerald, `#0F172A` editorial ink, `Newsreader` serif course headings) with an optional Evening Study Dark Mode toggle persisted in `localStorage`.
- **Interactive System Design Back-of-the-Envelope Capacity & Scaling Lab (`systemDesignEngine.ts` + lazy `SystemDesignCapacityLab.tsx`)**:
  - **3 Production FAANG Blueprints**: *Global Short-URL / Redirector*, *Flash-Sale E-Commerce Voucher API*, and *Real-Time Chat & Presence Feed*.
  - **Live Workload Sliders**: Logarithmic **Daily Active Users (`10K–10M DAU`)**, **Read:Write Ratio (`10:1–100:1`)**, **Peak-to-Average Multiplier (`3x–10x`)**, **Redis Cache Hit Ratio (`50%–98%`)**, **Avg Payload Size (`1–64 KB`)**, and **App Runtime Target (`.NET 10` / `Go` / `Node.js`)**.
  - **Deterministic Sizing Outputs**: Average & Peak Read/Write QPS, **Origin DB QPS surviving cache miss**, Required App Pods across `.NET 10`, `Go`, and `Node.js`, PostgreSQL Primary Shards + Read Replicas, Redis Shards, **5-Year Storage Footprint (`TB` with 3x replication)**, **Peak CDN Egress (`Gbps`)**, and itemized **Monthly Cloud Cost (`USD`)**.
  - **Interactive SVG Live Architecture Bottleneck Diagram**: Real-time 5-tier topology (`CDN -> API GW -> App Fleet -> Redis Cache -> Primary/Replica DB`) where saturated tiers pulse amber (`75–99%`) or crimson (`>=100%`), paired with clickable Tier Bottleneck Inspector, **1-click "Auto-Scale Architecture"** resolving every bottleneck cleanly (`<= 65%` utilization headroom), and a FAANG whiteboard formula worksheet with Markdown export.
- **Interactive Algorithm Step-Through Visualizer (`algoVisualizerEngine.ts` + lazy `AlgorithmVisualizerLab.tsx`)**:
  - **Binary Search**: `O(log n)` `low` / `mid` / `high` pointers, eliminated regions, and click-to-target cells.
  - **QuickSort (Lomuto Partition)**: Live pivot highlight, animated SVG **swap arcs** with arrowheads, active sub-array bracket, and locked sorted partition markers.
  - **Dijkstra Shortest Path**: Interactive **7-node weighted SVG network (`A`–`G`)** with click-to-select destination node, live Min-Heap Priority Queue, Distance & Predecessor table, and glowing optimal shortest path (`A -> C -> B -> D -> F -> G = 13ms`).
- **Zero-Eval In-Browser Code Sandbox & Architecture Quiz**: Deterministic JS AST interpreter (`0 eval`, `0 new Function`) enforcing Strict CSP (`script-src 'self'`) and step budgets across 6 production labs + 10 timed architecture questions.
- **SuperMemo-2 (SM-2) Spaced-Repetition Deck**: 3D flip flashcards persisted in `localStorage` + `IndexedDB`, calculating Ease Factor (`EF >= 1.30`) and optimal review intervals.
- **Archival A4 Certificate Studio & EMVCo VietQR Checkout**: 1123×794 landscape vector SVG/PDF certificates with scannable QR verification matrix, checksum verifier, tiered bundle pricing, voucher stacking (`SOLARIS20`), and Techcombank EMVCo CRC-16 VietQR checkout.
- **Route-Level Code Splitting**: `React.lazy` for all 6 interactive workspaces + `vite.config.ts` `manualChunks` (`react`, `curriculum-data`, `engines`, `system-design-engine`, `algo-engine`, `qrcode`) keeping initial entry JS at **79.01 kB (22.13 kB gzip)**.

### 2. Python 3.12 FastAPI Backend (`backend/`)
- **System Design Capacity Engine (`backend/solaris_api/capacity.py`)**: Exact cross-runtime mathematical parity with TypeScript (`systemDesignEngine.ts`) serving QPS, cache-miss DB QPS, multi-runtime pod sizing, DB shard/replica sizing, 5-year TB storage, CDN egress Gbps, tier bottleneck flags, auto-scale targets, and itemized monthly cloud cost.
- **Zero-Eval Python AST Security Gate (`backend/solaris_api/grader.py`)**:
  - Statically inspects submitted Python AST before execution — rejects `import`, `from ... import`, `eval`, `exec`, `open`, `class`, `with`, decorators, and any `__dunder__` attribute/name (`__class__`, `__subclasses__`, `__builtins__`, `__import__`) with HTTP `400 AST_SECURITY_VIOLATION`.
  - Executes validated code inside a bounded tree-walking AST interpreter with deterministic step limits (`max_steps`), recursion depth caps (`64`), and collection-size limits (`10,000`).
- **API Endpoints** (Full OpenAPI 3.1 specification in [`docs/openapi.yaml`](./docs/openapi.yaml)):

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/health` | Service readiness & sandbox engine telemetry (`v3.0.0`) |
| `POST` | `/api/v1/system-design/capacity` | Back-of-the-envelope QPS, Origin DB QPS, pod/replica sizing, 5-yr TB storage, egress Gbps, bottlenecks & USD cost |
| `POST` | `/api/v1/sandbox/grade` | Static AST security validation + deterministic unit test grading |
| `POST` | `/api/v1/srs/review` | SuperMemo-2 interval, Ease Factor & due timestamp computation |
| `POST` | `/api/v1/certificates/issue` | Deterministic HMAC-SHA256 completion certificate signing |
| `POST` | `/api/v1/certificates/verify` | Constant-time (`hmac.compare_digest`) tamper-resistant verification |

---

## Architecture Decision Records & Contracts

- [OpenAPI 3.1 Specification (`docs/openapi.yaml`)](./docs/openapi.yaml)
- [ADR-001: Zero-Eval Dual-Runtime AST Sandbox Security](./docs/ADR-001-ZeroEval-AST-Sandbox-Security.md)
- [ADR-002: SuperMemo-2 Spaced Repetition Parity & HMAC-SHA256 Certificates](./docs/ADR-002-SM2-SpacedRepetition-HMAC-Certs.md)

---

## Local Development & Docker Quickstart

### Full Stack via Docker Compose (Web + FastAPI + PostgreSQL 16 + Redis 7)
```bash
docker compose up --build
```
- **Web App (Nginx + SPA + `/api` proxy):** `http://localhost:8080`
- **FastAPI Docs (Swagger / OpenAPI):** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

### Run Frontend Locally (Node.js 22+)
```bash
npm ci
npm test        # Runs 71 Vitest unit tests
npm run dev     # Starts Vite dev server on http://localhost:5173
npm run build   # TypeScript check + code-split production bundle
```

### Run Backend Locally (Python 3.12+)
```bash
pip install -r backend/requirements.txt
python -m pytest backend/tests -v
uvicorn solaris_api.main:app --app-dir backend --reload --port 8000
```

---

## Verification & Quality Gates

| Quality Gate | Tool / Scope | Verified Result |
| :--- | :--- | :--- |
| **Gate 1 — Frontend Unit Tests** | `npm test` (Vitest 3.2) | **71 / 71 passed** (`solaris.test.ts`: 25, `algoVisualizerEngine.test.ts`: 22, `systemDesignEngine.test.ts`: 24) |
| **Gate 2 — Production Build & Split** | `npm run build` (`tsc -b && vite build`) | **0 errors** · Code-split chunks (`index`: **79.01 kB / 22.13 kB gz**, `react`: 223.19 kB, `curriculum-data`: 73.90 kB, `engines`: 43.55 kB, `SystemDesignCapacityLab`: 31.01 kB, `AlgorithmVisualizerLab`: 25.63 kB, `qrcode`: 25.39 kB, `CodeSandboxLab`: 18.32 kB, `system-design-engine`: 17.98 kB, `CertificateModal`: 16.99 kB, `CheckoutModal`: 14.70 kB, `algo-engine`: 12.46 kB, `FlashcardTrainer`: 12.07 kB) |
| **Gate 3 — Backend API & Security Tests** | `python -m pytest backend/tests -v` | **41 / 41 passed** (14 System Design Capacity endpoint & TS-parity tests, 10 malicious AST `400` blocks, safe grading, infinite-loop step cap, SM-2 progression, HMAC-SHA256 tamper rejection) |
| **Gate 4 — Headless E2E (Desktop & Mobile)** | Playwright against `vite preview` (`1440×900` & `390×844`) | **0 console errors · 0 page errors · 0 failed requests · 0px horizontal overflow** · Verified `#F9FAFB` Daylight Oxford boot, live DAU & Cache-Hit sliders updating Origin DB QPS & SVG bottlenecks, 1-click Auto-Scale resolving all 5 tiers to healthy, Binary Search/QuickSort/Dijkstra, Zero-Eval AST Grader & Strict CSP |
| **Static Security Audit** | AST + Source Scan | **0** `eval`/`exec`/`new Function`, **0** `dangerouslySetInnerHTML`/`innerHTML`, **0** custom cursors, **0** UI emojis, Strict CSP + `Referrer-Policy` enforced |

---

Built by **Truong Van Tinh (TVT Studio)** — Solution Architect & Full-Stack Engineer.
