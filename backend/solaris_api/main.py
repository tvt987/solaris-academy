"""
Solaris Academy v2.0 — FastAPI AST Auto-Grader, SM-2 Scheduler & HMAC Certificate API.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import __version__
from .grader import (
    DEFAULT_MAX_STEPS,
    INITIAL_EASE_FACTOR,
    MIN_EASE_FACTOR,
    AstSecurityViolationError,
    GradeTestCaseInput,
    SandboxSyntaxError,
    Sm2RatingLiteral,
    grade_python_submission,
    issue_certificate,
    schedule_sm2_review,
    verify_certificate,
)

app = FastAPI(
    title="Solaris Academy API",
    version=__version__,
    description=(
        "Production Python 3.12 FastAPI backend providing zero-eval AST sandbox grading, "
        "SuperMemo-2 spaced-repetition scheduling, and HMAC-SHA256 verifiable certificates."
    ),
)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "SOLARIS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:4173,http://localhost:8080,https://tvt987.github.io",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ============================================================================
# Pydantic v2 Request / Response Schemas
# ============================================================================


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    sandbox_engine: str


class SandboxTestCaseSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    args: list[Any] = Field(default_factory=list)
    expected: Any


class SandboxGradeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=25_000)
    function_name: str = Field(..., min_length=1, max_length=64, pattern=r"^[A-Za-z][A-Za-z0-9_]*$")
    test_cases: list[SandboxTestCaseSchema] = Field(..., min_length=1, max_length=50)
    xp_reward: int = Field(default=120, ge=0, le=1000)
    max_steps: int = Field(default=DEFAULT_MAX_STEPS, ge=100, le=50_000)


class SandboxCaseResultSchema(BaseModel):
    name: str
    passed: bool
    expected: Any
    actual: Any
    duration_ms: float
    error: str | None = None


class SandboxGradeResponse(BaseModel):
    passed_all: bool
    passed_count: int
    total_count: int
    score_pct: int
    xp_awarded: int
    execution_ms: float
    ast_nodes_checked: int
    steps_executed: int
    results: list[SandboxCaseResultSchema]


class Sm2ReviewRequest(BaseModel):
    card_id: str = Field(..., min_length=1, max_length=80)
    rating: Sm2RatingLiteral
    repetitions: int = Field(default=0, ge=0, le=1000)
    interval_days: int = Field(default=0, ge=0, le=36_500)
    ease_factor: float = Field(default=INITIAL_EASE_FACTOR, ge=MIN_EASE_FACTOR, le=5.0)
    lapses: int = Field(default=0, ge=0, le=10_000)
    reviewed_at: datetime | None = None


class Sm2ReviewResponse(BaseModel):
    card_id: str
    rating: Sm2RatingLiteral
    quality: int
    repetitions: int
    interval_days: int
    ease_factor: float
    lapses: int
    due_at: str
    is_mastered: bool
    next_interval_preview: dict[str, str]


class CertificateIssueRequest(BaseModel):
    student_name: str = Field(..., min_length=2, max_length=80)
    course_code: str = Field(..., min_length=2, max_length=10)
    course_title: str = Field(..., min_length=3, max_length=140)
    issue_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    honors: bool = True


class CertificateIssueResponse(BaseModel):
    credential_id: str
    student_name: str
    course_code: str
    course_title: str
    issue_date: str
    honors: bool
    algorithm: str
    signature: str
    verification_url: str
    issued_at: str


class CertificateVerifyRequest(BaseModel):
    credential_id: str = Field(..., min_length=8, max_length=64)
    student_name: str = Field(..., min_length=2, max_length=80)
    course_code: str = Field(..., min_length=2, max_length=10)
    course_title: str = Field(..., min_length=3, max_length=140)
    issue_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    honors: bool
    signature: str = Field(..., min_length=64, max_length=64)


class CertificateVerifyResponse(BaseModel):
    valid: bool
    credential_id: str
    algorithm: str
    reason: str
    verified_at: str


# ============================================================================
# Routes
# ============================================================================


@app.get("/health", response_model=HealthResponse, tags=["System"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="solaris-academy-api",
        version=__version__,
        sandbox_engine="python-ast-zero-eval",
    )


@app.post("/api/v1/sandbox/grade", response_model=SandboxGradeResponse, tags=["AST Grader"])
def grade_sandbox(payload: SandboxGradeRequest) -> SandboxGradeResponse:
    cases = [
        GradeTestCaseInput(name=tc.name, args=tc.args, expected=tc.expected)
        for tc in payload.test_cases
    ]
    try:
        report = grade_python_submission(
            code=payload.code,
            function_name=payload.function_name,
            test_cases=cases,
            xp_reward=payload.xp_reward,
            max_steps=payload.max_steps,
        )
    except AstSecurityViolationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "AST_SECURITY_VIOLATION",
                "message": "Submitted Python code violated static AST sandbox security policy.",
                "violations": exc.violations,
            },
        ) from exc
    except SandboxSyntaxError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "SANDBOX_SYNTAX_ERROR",
                "message": str(exc),
                "violations": [],
            },
        ) from exc

    return SandboxGradeResponse(
        passed_all=report.passed_all,
        passed_count=report.passed_count,
        total_count=report.total_count,
        score_pct=report.score_pct,
        xp_awarded=report.xp_awarded,
        execution_ms=report.execution_ms,
        ast_nodes_checked=report.ast_nodes_checked,
        steps_executed=report.steps_executed,
        results=[
            SandboxCaseResultSchema(
                name=r.name,
                passed=r.passed,
                expected=r.expected,
                actual=r.actual,
                duration_ms=r.duration_ms,
                error=r.error,
            )
            for r in report.results
        ],
    )


@app.post("/api/v1/srs/review", response_model=Sm2ReviewResponse, tags=["SM-2 Spaced Repetition"])
def review_srs_card(payload: Sm2ReviewRequest) -> Sm2ReviewResponse:
    result = schedule_sm2_review(
        card_id=payload.card_id,
        rating=payload.rating,
        repetitions=payload.repetitions,
        interval_days=payload.interval_days,
        ease_factor=payload.ease_factor,
        lapses=payload.lapses,
        reviewed_at=payload.reviewed_at,
    )
    return Sm2ReviewResponse(
        card_id=result.card_id,
        rating=result.rating,
        quality=result.quality,
        repetitions=result.repetitions,
        interval_days=result.interval_days,
        ease_factor=result.ease_factor,
        lapses=result.lapses,
        due_at=result.due_at,
        is_mastered=result.is_mastered,
        next_interval_preview=result.next_interval_preview,
    )


@app.post(
    "/api/v1/certificates/issue",
    response_model=CertificateIssueResponse,
    tags=["HMAC Certificates"],
)
def issue_cert(payload: CertificateIssueRequest) -> CertificateIssueResponse:
    cert = issue_certificate(
        student_name=payload.student_name,
        course_code=payload.course_code,
        course_title=payload.course_title,
        issue_date=payload.issue_date,
        honors=payload.honors,
    )
    return CertificateIssueResponse(
        credential_id=cert.credential_id,
        student_name=cert.student_name,
        course_code=cert.course_code,
        course_title=cert.course_title,
        issue_date=cert.issue_date,
        honors=cert.honors,
        algorithm=cert.algorithm,
        signature=cert.signature,
        verification_url=cert.verification_url,
        issued_at=cert.issued_at,
    )


@app.post(
    "/api/v1/certificates/verify",
    response_model=CertificateVerifyResponse,
    tags=["HMAC Certificates"],
)
def verify_cert(payload: CertificateVerifyRequest) -> CertificateVerifyResponse:
    result = verify_certificate(
        credential_id=payload.credential_id,
        student_name=payload.student_name,
        course_code=payload.course_code,
        course_title=payload.course_title,
        issue_date=payload.issue_date,
        honors=payload.honors,
        signature=payload.signature,
    )
    return CertificateVerifyResponse(
        valid=result.valid,
        credential_id=result.credential_id,
        algorithm=result.algorithm,
        reason=result.reason,
        verified_at=result.verified_at,
    )
