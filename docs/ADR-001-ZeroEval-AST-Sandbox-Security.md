# ADR-001: Zero-Eval Dual-Runtime AST Sandbox Security Architecture

- **Status:** Accepted & Implemented (v2.0)
- **Date:** 2026-11-27
- **Authors:** Truong Van Tinh (Principal Solution Architect)
- **Components:** `src/engines/jsInterpreter.ts`, `src/engines/grader.ts`, `backend/solaris_api/grader.py`, `backend/solaris_api/main.py`

## Context

An interactive engineering LMS must grade untrusted student code in real time across both offline-capable browser labs and server-authoritative FastAPI assessments. Traditional approaches suffer from severe security or operational weaknesses:

1. **Browser `eval()` / `new Function()`**: Violates Strict Content-Security-Policy (`script-src 'self'`), enables DOM/cookie exfiltration, prototype pollution (`__proto__`), and tab-freezing infinite loops.
2. **Naive Python `exec(code, {"__builtins__": {}})`**: Repeatedly defeated via object-graph traversal escapes such as `().__class__.__base__.__subclasses__()` to recover `os.popen` or `BuiltinImporter`, and unable to deterministically preempt CPU-exhausting loops without OS-level container teardown.
3. **Ephemeral MicroVM/Docker per submission**: Adds 300ms–1,500ms cold-start latency and significant cloud infrastructure spend for pure algorithmic unit tests.

## Decision

Solaris Academy v2.0 implements a **Zero-Eval, Dual-Runtime Deterministic AST Tree-Walking Interpreter** across both runtimes:

1. **Frontend Browser Runtime (`src/engines/jsInterpreter.ts` + `src/engines/grader.ts`)**:
   - Tokenizes and parses student JavaScript into an AST without `eval` or `new Function`, fully compliant with `Content-Security-Policy: script-src 'self'`.
   - Enforces a deterministic AST step budget and static denylist (`window`, `document`, `fetch`, `eval`, `__proto__`).
2. **Backend FastAPI Runtime (`backend/solaris_api/grader.py`)**:
   - **Phase 1 — Static AST Policy Gate (`_AstSecurityVisitor`)**:
     - Parses code via `ast.parse(code, mode="exec")` and traverses every node before any execution begins.
     - Explicitly blocks `ast.Import`, `ast.ImportFrom`, `ast.ClassDef`, `ast.With`, `ast.Async*`, `ast.Global`, `ast.Nonlocal`, `ast.Delete`, `ast.Yield*`, decorators, any identifier or attribute starting/ending with `__` (blocking `__class__`, `__subclasses__`, `__mro__`, `__builtins__`, `__import__`), and dangerous builtins (`eval`, `exec`, `compile`, `open`, `getattr`, `setattr`, `globals`, `locals`, `type`).
     - Enforces a strict allowlist of pure data-structure methods (`SAFE_METHODS`) on `list`, `dict`, `set`, `str`, and `tuple`.
     - Any policy violation short-circuits with HTTP `400 Bad Request` (`code: "AST_SECURITY_VIOLATION"`) and exact violation diagnostics.
   - **Phase 2 — Bounded Tree-Walking Evaluator (`_SafeAstInterpreter`)**:
     - Evaluates the validated AST directly in Python with zero calls to `eval()`, `exec()`, or `compile()`.
     - Enforces three hard resource budgets per test case:
       - `max_steps` (default `10,000` AST step ticks, configurable up to `50,000`) — deterministically terminates infinite loops (`while True:`) in milliseconds.
       - `MAX_RECURSION_DEPTH = 64` — protects the Python call stack from uncontrolled recursion.
       - `MAX_COLLECTION_SIZE = 10,000` and bounded exponentiation (`<= 1,000`) — mitigates memory bombs like `[0] * 10**9` or `9 ** 9 ** 9`.
     - Deep-copies test-case inputs per assertion so mutations in one case never leak into subsequent cases.

## Consequences

### Positive
- **Zero `eval` / `exec` footprint** across the entire monorepo, keeping Strict CSP green in browsers and eliminating arbitrary code execution (RCE) vectors in FastAPI workers.
- **Sub-5ms deterministic grading** per submission with exact AST node counts and step telemetry returned in the API response.
- **Graceful DoS resilience**: Infinite loops and runaway allocations fail cleanly inside the request lifecycle without hanging Uvicorn workers.

### Trade-offs & Future Evolution
- **Language subset scope**: Third-party C-extension libraries (e.g., `numpy`, `pandas`) and arbitrary OOP class hierarchies are intentionally outside the algorithmic sandbox subset. When Solaris Academy expands to data-science notebooks or multi-file system labs, those tracks should execute inside isolated gVisor/Firecracker worker pools behind a Redis queue while retaining the Zero-Eval AST gate for rapid algorithmic grading.

## Verification

- **Frontend (`vitest`)**: Security probes (`window.location`, `fetch`, `eval`, `new Function`, `__proto__`, `while (true)`) and runaway loop step-limit termination verified in `src/engines/solaris.test.ts`.
- **Backend (`pytest`)**: 10 parameterized malicious AST payloads (`import os`, `from subprocess`, `__import__`, `eval`, `exec`, `open`, `__class__.__mro__`, `__builtins__`, `class Escape`, `getattr`) return HTTP `400`, while infinite loops terminate cleanly under `max_steps` in `backend/tests/test_solaris_api.py`.
