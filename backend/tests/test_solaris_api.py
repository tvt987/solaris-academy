"""
Comprehensive FastAPI integration & security tests for Solaris Academy v2.0 backend.
Covers:
  - /health
  - /api/v1/sandbox/grade (correct code, buggy code, recursion, infinite loops, syntax errors,
    and malicious AST blocking for import/exec/eval/open/__dunder__/class escapes)
  - /api/v1/srs/review (SM-2 Good/Easy/Hard/Again progression, EF floor clamping, mastery flag)
  - /api/v1/certificates/issue & /api/v1/certificates/verify (HMAC-SHA256 signing & tamper rejection)
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure backend/ is importable regardless of working directory
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from solaris_api.main import app  # noqa: E402

client = TestClient(app)


# ============================================================================
# 1. SYSTEM HEALTH
# ============================================================================


def test_health_endpoint_returns_ok() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "solaris-academy-api"
    assert body["version"] == "2.0.0"
    assert body["sandbox_engine"] == "python-ast-zero-eval"


# ============================================================================
# 2. ZERO-EVAL PYTHON AST SANDBOX GRADER
# ============================================================================


def test_grade_valid_two_sum_passes_all_cases() -> None:
    code = """
def two_sum(nums, target):
    seen = {}
    for i, val in enumerate(nums):
        comp = target - val
        if comp in seen:
            return [seen[comp], i]
        seen[val] = i
    return []
"""
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": code,
            "function_name": "two_sum",
            "xp_reward": 150,
            "test_cases": [
                {"name": "Standard pair", "args": [[2, 7, 11, 15], 9], "expected": [0, 1]},
                {"name": "Non-adjacent pair", "args": [[3, 2, 4], 6], "expected": [1, 2]},
                {"name": "No solution", "args": [[1, 2, 3], 99], "expected": []},
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["passed_all"] is True
    assert data["passed_count"] == 3
    assert data["total_count"] == 3
    assert data["score_pct"] == 100
    assert data["xp_awarded"] == 150
    assert data["ast_nodes_checked"] > 10
    assert data["steps_executed"] > 0


def test_grade_valid_binary_search_and_comprehensions() -> None:
    code = """
def binary_search(nums, target):
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = low + (high - low) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
"""
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": code,
            "function_name": "binary_search",
            "test_cases": [
                {"name": "Found right", "args": [[4, 11, 23, 42, 68, 91], 68], "expected": 4},
                {"name": "Found first", "args": [[4, 11, 23, 42, 68, 91], 4], "expected": 0},
                {"name": "Missing", "args": [[4, 11, 23, 42, 68, 91], 50], "expected": -1},
            ],
        },
    )
    assert res.status_code == 200
    assert res.json()["passed_all"] is True


def test_grade_recursive_function_with_sorted_lambda() -> None:
    code = """
def rank_scores(items):
    def bonus(n):
        if n <= 1:
            return n
        return n + bonus(n - 1)
    ranked = sorted(items, key=lambda item: -item["score"])
    return [{"id": x["id"], "total": x["score"] + bonus(2)} for x in ranked]
"""
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": code,
            "function_name": "rank_scores",
            "test_cases": [
                {
                    "name": "Sort descending with helper recursion",
                    "args": [[{"id": "a", "score": 10}, {"id": "b", "score": 25}]],
                    "expected": [{"id": "b", "total": 28}, {"id": "a", "total": 13}],
                }
            ],
        },
    )
    assert res.status_code == 200
    assert res.json()["passed_all"] is True


def test_grade_buggy_solution_reports_partial_pass_and_actual_values() -> None:
    code = """
def double_value(x):
    return x + 1
"""
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": code,
            "function_name": "double_value",
            "xp_reward": 100,
            "test_cases": [
                {"name": "Passes by coincidence at 1", "args": [1], "expected": 2},
                {"name": "Fails at 5", "args": [5], "expected": 10},
            ],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["passed_all"] is False
    assert body["passed_count"] == 1
    assert body["score_pct"] == 50
    assert body["results"][0]["passed"] is True
    assert body["results"][1]["passed"] is False
    assert body["results"][1]["actual"] == 6


def test_grade_terminates_infinite_loop_via_step_budget() -> None:
    code = """
def spin(n):
    i = 0
    while True:
        i += 1
    return i
"""
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": code,
            "function_name": "spin",
            "max_steps": 500,
            "test_cases": [{"name": "Runaway loop", "args": [1], "expected": 1}],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["passed_all"] is False
    assert "step limit" in (body["results"][0]["error"] or "").lower()


def test_grade_rejects_syntax_error_with_400() -> None:
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": "def broken(x:\n    return x",
            "function_name": "broken",
            "test_cases": [{"name": "Syntax", "args": [1], "expected": 1}],
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "SANDBOX_SYNTAX_ERROR"


def test_grade_rejects_missing_target_function_with_400() -> None:
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": "def other_name(x):\n    return x",
            "function_name": "expected_name",
            "test_cases": [{"name": "Missing fn", "args": [1], "expected": 1}],
        },
    )
    assert res.status_code == 400
    assert "expected_name" in res.json()["detail"]["message"]


@pytest.mark.parametrize(
    "malicious_code",
    [
        "import os\ndef f(x):\n    return os.getcwd()",
        "from subprocess import Popen\ndef f(x):\n    return x",
        "def f(x):\n    return __import__('os').system('id')",
        "def f(x):\n    return eval('1 + 1')",
        "def f(x):\n    exec('x = 1')\n    return x",
        "def f(x):\n    return open('/etc/passwd').read()",
        "def f(x):\n    return x.__class__.__mro__",
        "def f(x):\n    return __builtins__",
        "class Escape:\n    pass\ndef f(x):\n    return x",
        "def f(x):\n    return getattr(x, 'append')",
    ],
)
def test_grade_blocks_malicious_ast_patterns_with_400(malicious_code: str) -> None:
    res = client.post(
        "/api/v1/sandbox/grade",
        json={
            "code": malicious_code,
            "function_name": "f",
            "test_cases": [{"name": "Security probe", "args": [[1, 2]], "expected": [1, 2]}],
        },
    )
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert detail["code"] == "AST_SECURITY_VIOLATION"
    assert len(detail["violations"]) >= 1


# ============================================================================
# 3. SUPERMEMO-2 (SM-2) SPACED-REPETITION SCHEDULER
# ============================================================================


def test_sm2_canonical_good_progression_reaches_mastery() -> None:
    r1 = client.post(
        "/api/v1/srs/review",
        json={
            "card_id": "fc-dotnet-1",
            "rating": "good",
            "repetitions": 0,
            "interval_days": 0,
            "ease_factor": 2.5,
            "reviewed_at": "2026-11-27T00:00:00Z",
        },
    )
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["repetitions"] == 1
    assert d1["interval_days"] == 1
    assert d1["ease_factor"] == 2.5
    assert d1["due_at"] == "2026-11-28T00:00:00Z"
    assert d1["is_mastered"] is False

    r2 = client.post(
        "/api/v1/srs/review",
        json={
            "card_id": "fc-dotnet-1",
            "rating": "good",
            "repetitions": d1["repetitions"],
            "interval_days": d1["interval_days"],
            "ease_factor": d1["ease_factor"],
            "reviewed_at": "2026-11-28T00:00:00Z",
        },
    )
    d2 = r2.json()
    assert d2["repetitions"] == 2
    assert d2["interval_days"] == 6
    assert d2["due_at"] == "2026-12-04T00:00:00Z"

    r3 = client.post(
        "/api/v1/srs/review",
        json={
            "card_id": "fc-dotnet-1",
            "rating": "good",
            "repetitions": d2["repetitions"],
            "interval_days": d2["interval_days"],
            "ease_factor": d2["ease_factor"],
            "reviewed_at": "2026-12-04T00:00:00Z",
        },
    )
    d3 = r3.json()
    assert d3["repetitions"] == 3
    assert d3["interval_days"] == 15
    assert d3["is_mastered"] is True


def test_sm2_easy_boosts_interval_and_ease_factor() -> None:
    r1 = client.post(
        "/api/v1/srs/review",
        json={"card_id": "fc-rag-1", "rating": "easy", "reviewed_at": "2026-11-27T00:00:00Z"},
    )
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["interval_days"] == 4
    assert d1["ease_factor"] == 2.6

    r2 = client.post(
        "/api/v1/srs/review",
        json={
            "card_id": "fc-rag-1",
            "rating": "easy",
            "repetitions": d1["repetitions"],
            "interval_days": d1["interval_days"],
            "ease_factor": d1["ease_factor"],
            "reviewed_at": "2026-12-01T00:00:00Z",
        },
    )
    d2 = r2.json()
    assert d2["interval_days"] == 10
    assert d2["ease_factor"] == 2.7


def test_sm2_repeated_again_resets_reps_and_clamps_ef_floor() -> None:
    ef = 2.5
    lapses = 0
    reps = 3
    for _ in range(6):
        res = client.post(
            "/api/v1/srs/review",
            json={
                "card_id": "fc-sql-1",
                "rating": "again",
                "repetitions": reps,
                "interval_days": 14,
                "ease_factor": ef,
                "lapses": lapses,
                "reviewed_at": "2026-11-27T10:00:00Z",
            },
        )
        assert res.status_code == 200
        body = res.json()
        reps = body["repetitions"]
        ef = body["ease_factor"]
        lapses = body["lapses"]
        assert body["due_at"] == "2026-11-27T10:10:00Z"

    assert reps == 0
    assert lapses == 6
    assert ef == 1.3


def test_sm2_invalid_rating_returns_422() -> None:
    res = client.post(
        "/api/v1/srs/review",
        json={"card_id": "fc-1", "rating": "super_easy"},
    )
    assert res.status_code == 422


# ============================================================================
# 4. HMAC-SHA256 VERIFIABLE CERTIFICATES
# ============================================================================


def test_certificate_issue_and_verify_roundtrip_succeeds() -> None:
    issue_res = client.post(
        "/api/v1/certificates/issue",
        json={
            "student_name": "Truong Van Tinh",
            "course_code": "DN10",
            "course_title": "Full-Stack .NET 10",
            "issue_date": "2026-11-27",
            "honors": True,
        },
    )
    assert issue_res.status_code == 200
    cert = issue_res.json()
    assert cert["credential_id"].startswith("SOL-CERT-DN10-")
    assert cert["algorithm"] == "HMAC-SHA256"
    assert len(cert["signature"]) == 64

    verify_res = client.post(
        "/api/v1/certificates/verify",
        json={
            "credential_id": cert["credential_id"],
            "student_name": cert["student_name"],
            "course_code": cert["course_code"],
            "course_title": cert["course_title"],
            "issue_date": cert["issue_date"],
            "honors": cert["honors"],
            "signature": cert["signature"],
        },
    )
    assert verify_res.status_code == 200
    v = verify_res.json()
    assert v["valid"] is True
    assert v["credential_id"] == cert["credential_id"]


def test_certificate_verify_rejects_tampered_student_name() -> None:
    cert = client.post(
        "/api/v1/certificates/issue",
        json={
            "student_name": "Nguyen Minh",
            "course_code": "RAG2",
            "course_title": "Applied RAG & Agents",
            "issue_date": "2026-11-27",
            "honors": True,
        },
    ).json()

    verify_res = client.post(
        "/api/v1/certificates/verify",
        json={
            "credential_id": cert["credential_id"],
            "student_name": "Forged Recipient",
            "course_code": cert["course_code"],
            "course_title": cert["course_title"],
            "issue_date": cert["issue_date"],
            "honors": cert["honors"],
            "signature": cert["signature"],
        },
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is False


def test_certificate_verify_rejects_tampered_honors_flag() -> None:
    cert = client.post(
        "/api/v1/certificates/issue",
        json={
            "student_name": "Le Hoang",
            "course_code": "RC19",
            "course_title": "React 19 Architecture",
            "issue_date": "2026-11-27",
            "honors": False,
        },
    ).json()

    verify_res = client.post(
        "/api/v1/certificates/verify",
        json={
            "credential_id": cert["credential_id"],
            "student_name": cert["student_name"],
            "course_code": cert["course_code"],
            "course_title": cert["course_title"],
            "issue_date": cert["issue_date"],
            "honors": True,  # Tampered honors escalation
            "signature": cert["signature"],
        },
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is False
    assert "signature mismatch" in verify_res.json()["reason"].lower()


def test_certificate_verify_rejects_tampered_signature_hex() -> None:
    cert = client.post(
        "/api/v1/certificates/issue",
        json={
            "student_name": "Pham Linh",
            "course_code": "SQLP",
            "course_title": "SQL Performance Tuning",
            "issue_date": "2026-11-27",
            "honors": True,
        },
    ).json()

    flipped = ("0" if cert["signature"][-1] != "0" else "1")
    tampered_sig = cert["signature"][:-1] + flipped

    verify_res = client.post(
        "/api/v1/certificates/verify",
        json={
            "credential_id": cert["credential_id"],
            "student_name": cert["student_name"],
            "course_code": cert["course_code"],
            "course_title": cert["course_title"],
            "issue_date": cert["issue_date"],
            "honors": cert["honors"],
            "signature": tampered_sig,
        },
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is False


def test_certificate_verify_rejects_malformed_credential_id() -> None:
    verify_res = client.post(
        "/api/v1/certificates/verify",
        json={
            "credential_id": "FAKE-ID-1234",
            "student_name": "Test User",
            "course_code": "DN10",
            "course_title": "Full-Stack .NET 10",
            "issue_date": "2026-11-27",
            "honors": True,
            "signature": "a" * 64,
        },
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is False
    assert "malformed" in verify_res.json()["reason"].lower()
