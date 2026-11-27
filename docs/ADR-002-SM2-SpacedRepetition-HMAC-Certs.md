# ADR-002: SuperMemo-2 Spaced Repetition Parity & HMAC-SHA256 Verifiable Certificates

- **Status:** Accepted & Implemented (v2.0)
- **Date:** 2026-11-27
- **Authors:** Truong Van Tinh (Principal Solution Architect)
- **Components:** `src/engines/sm2.ts`, `src/engines/certificate.ts`, `backend/solaris_api/grader.py`, `backend/solaris_api/main.py`

## Context

Engineering learners rarely retain architecture patterns (idempotency locks, B-Tree index selectivity, hybrid RAG reranking) after passive video consumption. Furthermore, traditional LMS completion certificates are easily forged static PDFs that employers cannot verify without querying opaque third-party portals.

Solaris Academy v2.0 requires two coupled capabilities that operate seamlessly both **offline-first in static GitHub Pages deployments** and **server-authoritatively when connected to the FastAPI backend**:

1. Scientifically grounded long-term memory scheduling with zero drift between client and server calculations.
2. Tamper-evident completion credentials verifiable via scannable QR codes and API endpoints.

## Decision

### 1. Canonical SuperMemo-2 (SM-2) Dual-Engine Parity
Both TypeScript (`src/engines/sm2.ts`) and Python (`backend/solaris_api/grader.py::schedule_sm2_review`) implement identical SM-2 scheduling equations:

- **Quality mapping**: `again -> 1`, `hard -> 3`, `good -> 4`, `easy -> 5`.
- **Ease Factor update**:
  $$EF' = \max\left(1.30,\ \mathrm{round}\left(EF + \left(0.1 - (5 - q)(0.08 + (5 - q) \cdot 0.02)\right),\ 2\right)\right)$$
- **Interval progression**:
  - `again`: resets `repetitions = 0`, increments `lapses`, sets `interval_days = 1` with an immediate `10-minute` in-session re-surface timestamp (`due_at = reviewed_at + 10m`).
  - `good`: `1d -> 6d -> max(prev + 1, round(prev * EF'))`.
  - `easy`: `4d -> 10d -> max(prev + 1, round(prev * EF' * 1.3))`.
- **Mastery threshold**: `repetitions >= 3 && interval_days >= 10`.
- **Client Persistence**: Persisted immediately to `localStorage` and asynchronously mirrored to `IndexedDB` (`solaris_academy_db`), while `POST /api/v1/srs/review` provides authoritative server-side scheduling for multi-device PostgreSQL sync.

### 2. HMAC-SHA256 Constant-Time Certificate Signing
To guarantee tamper resistance without complex X.509 PKI certificate authority management:

- **Deterministic Credential ID**: `SOL-CERT-{CODE}-{SHA256_8HEX}-{HMAC_4HEX}` derived from normalized student name, 4-char course code, and ISO issue date (`YYYY-MM-DD`).
- **Canonical Signing Payload**:
  ```text
  SOLARIS-CERT-V2|{credential_id}|{NORMALIZED_NAME}|{CODE}|{course_title}|{issue_date}|{HONORS|STANDARD}
  ```
- **Cryptographic Signature**: 64-character lowercase hex digest generated via `HMAC-SHA256(SOLARIS_CERT_SECRET, canonical_payload)`.
- **Timing-Attack Mitigation**: `POST /api/v1/certificates/verify` validates both the derived `credential_id` and the 64-hex `signature` strictly using **`hmac.compare_digest()`** (constant-time byte comparison), defeating byte-by-byte timing oracle attacks.
- **Archival A4 Vector Export + QR Matrix**: The frontend generates a standalone 1123x794 landscape SVG certificate embedding an error-correction level `M` QR vector pointing to `?verify=<credential_id>`, printable to A4 PDF via `@media print`.

## Consequences

### Positive
- **Zero-cost offline verification + authoritative server verification**: Static GitHub Pages demos validate checksums instantly on-device while Docker/FastAPI deployments enforce full secret-keyed HMAC-SHA256 tamper rejection on every field (`student_name`, `course_code`, `course_title`, `issue_date`, `honors`, `signature`).
- **Identical SM-2 math across TypeScript & Python**: Prevents scheduling divergence when syncing offline study sessions back to the API.

### Trade-offs & Secret Rotation Strategy
- HMAC-SHA256 relies on a shared secret (`SOLARIS_CERT_SECRET`) held exclusively by the issuing backend. If third-party universities or external verifiers require offline cryptographic verification without calling `/api/v1/certificates/verify`, v3.0 can add an Ed25519 asymmetric signature block alongside a published `/.well-known/jwks.json` public key set while keeping the canonical payload format unchanged.

## Verification

- **Frontend (`vitest`)**: Canonical SM-2 intervals (`1d -> 6d -> 15d`, Easy `4d -> 10d`, EF clamping at `1.30`) and certificate checksum / XSS-safe SVG XML escaping verified in `src/engines/solaris.test.ts`.
- **Backend (`pytest`)**: SM-2 mastery progression, 10-minute lapse retry, EF clamping, HMAC-SHA256 issue/verify round-trip, and tamper rejection on `student_name`, `honors` escalation, malformed IDs, and 1-char signature mutation verified in `backend/tests/test_solaris_api.py`.
