import type {
  CodeGradeReport,
  CodingChallenge,
  QuizAnswerBreakdown,
  QuizGradeReport,
  QuizQuestion,
  TestCaseResult,
} from '../types/lms';
import { compileSafeSandboxFunction } from './jsInterpreter';

const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\b(window|document|globalThis|self|top|parent)\b/, reason: 'DOM / global object access is blocked in sandbox' },
  { regex: /\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator)\b/, reason: 'Network APIs are blocked in sandbox' },
  { regex: /\b(localStorage|sessionStorage|indexedDB|cookie)\b/, reason: 'Browser storage access is blocked in sandbox' },
  { regex: /\b(eval|Function|importScripts|require|process)\b/, reason: 'Dynamic code execution or runtime access is blocked' },
  { regex: /__proto__|prototype\s*\.\s*constructor|constructor\s*\[\s*['"]constructor['"]\s*\]/, reason: 'Prototype chain escape is blocked' },
  { regex: /\bwhile\s*\(\s*(true|1)\s*\)/, reason: 'Unbounded while(true) loop is blocked for deterministic safety' },
];

export interface CodeSafetyCheck {
  safe: boolean;
  violation?: string;
}

export function scanCodeSafety(sourceCode: string): CodeSafetyCheck {
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.regex.test(sourceCode)) {
      return { safe: false, violation: rule.reason };
    }
  }
  return { safe: true };
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-6;
  }

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const recA = a as Record<string, unknown>;
  const recB = b as Record<string, unknown>;
  const keysA = Object.keys(recA);
  const keysB = Object.keys(recB);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(recB, key)) return false;
    if (!deepEqual(recA[key], recB[key])) return false;
  }
  return true;
}

function formatPreview(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return String(value);
    return serialized.length > 110 ? `${serialized.slice(0, 107)}...` : serialized;
  } catch {
    return String(value);
  }
}

function cloneArgs(args: unknown[]): unknown[] {
  return args.map((item) => {
    if (item === null || typeof item !== 'object') return item;
    return JSON.parse(JSON.stringify(item)) as unknown;
  });
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Safely parses and evaluates user-submitted JavaScript via Solaris's deterministic AST interpreter
 * (zero eval, zero new Function) against automated test cases with strict step budgets.
 */
export function gradeCodeChallenge(challenge: CodingChallenge, sourceCode: string): CodeGradeReport {
  const totalCount = challenge.testCases.length;
  const safety = scanCodeSafety(sourceCode);

  if (!safety.safe) {
    return {
      challengeId: challenge.id,
      passedAll: false,
      passedCount: 0,
      totalCount,
      scorePct: 0,
      xpAwarded: 0,
      totalDurationMs: 0,
      securityBlocked: true,
      compileError: safety.violation,
      results: challenge.testCases.map((tc) => ({
        id: tc.id,
        name: tc.name,
        passed: false,
        inputPreview: formatPreview(tc.args),
        expectedPreview: formatPreview(tc.expected),
        actualPreview: 'BLOCKED',
        durationMs: 0,
        error: safety.violation,
      })),
    };
  }

  let compiledFn: (...args: unknown[]) => unknown;
  try {
    compiledFn = compileSafeSandboxFunction(sourceCode, challenge.functionName);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      challengeId: challenge.id,
      passedAll: false,
      passedCount: 0,
      totalCount,
      scorePct: 0,
      xpAwarded: 0,
      totalDurationMs: 0,
      securityBlocked: false,
      compileError: message,
      results: challenge.testCases.map((tc) => ({
        id: tc.id,
        name: tc.name,
        passed: false,
        inputPreview: formatPreview(tc.args),
        expectedPreview: formatPreview(tc.expected),
        actualPreview: 'COMPILE_ERROR',
        durationMs: 0,
        error: message,
      })),
    };
  }

  const results: TestCaseResult[] = [];
  let passedCount = 0;
  let totalDurationMs = 0;

  for (const tc of challenge.testCases) {
    const start = nowMs();
    try {
      const cloned = cloneArgs(tc.args);
      const actual = compiledFn(...cloned);
      const elapsed = Math.max(0.01, Math.round((nowMs() - start) * 100) / 100);
      totalDurationMs += elapsed;

      const passed = deepEqual(actual, tc.expected);
      if (passed) passedCount += 1;

      results.push({
        id: tc.id,
        name: tc.name,
        passed,
        inputPreview: formatPreview(tc.args),
        expectedPreview: formatPreview(tc.expected),
        actualPreview: formatPreview(actual),
        durationMs: elapsed,
      });
    } catch (err) {
      const elapsed = Math.max(0.01, Math.round((nowMs() - start) * 100) / 100);
      totalDurationMs += elapsed;
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        id: tc.id,
        name: tc.name,
        passed: false,
        inputPreview: formatPreview(tc.args),
        expectedPreview: formatPreview(tc.expected),
        actualPreview: 'RUNTIME_ERROR',
        durationMs: elapsed,
        error: message,
      });
    }
  }

  const scorePct = totalCount === 0 ? 0 : Math.round((passedCount / totalCount) * 100);
  const passedAll = passedCount === totalCount && totalCount > 0;
  const xpAwarded = passedAll ? challenge.xpReward : Math.round((challenge.xpReward * scorePct) / 300);

  return {
    challengeId: challenge.id,
    passedAll,
    passedCount,
    totalCount,
    scorePct,
    xpAwarded,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    securityBlocked: false,
    results,
  };
}

export function gradeArchitectureQuiz(
  questions: QuizQuestion[],
  selectedAnswers: Record<string, number>,
): QuizGradeReport {
  const totalCount = questions.length;
  let correctCount = 0;

  const breakdown: QuizAnswerBreakdown[] = questions.map((q) => {
    const picked = selectedAnswers[q.id];
    const selectedIndex = typeof picked === 'number' ? picked : null;
    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) correctCount += 1;
    return {
      questionId: q.id,
      selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect,
    };
  });

  const scorePct = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  const passed = scorePct >= 70;
  const xpAwarded = correctCount * 20 + (passed ? 50 : 0);

  return {
    correctCount,
    totalCount,
    scorePct,
    xpAwarded,
    passed,
    breakdown,
  };
}
