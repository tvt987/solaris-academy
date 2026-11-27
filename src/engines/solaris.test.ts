import { describe, expect, it } from 'vitest';
import { COURSES, getCourseById } from '../data/courses';
import { CODING_CHALLENGES, FLASHCARDS, QUIZ_QUESTIONS } from '../data/sandbox';
import {
  buildCertificateSvg,
  buildQrSvgPath,
  buildVerificationUrl,
  generateCredentialId,
  verifyCredentialId,
} from './certificate';
import { deepEqual, gradeArchitectureQuiz, gradeCodeChallenge, scanCodeSafety } from './grader';
import {
  calculateCartPricing,
  formatMoney,
  getBundleDiscountRate,
  validateVoucher,
} from './pricing';
import {
  calculateCourseCompletion,
  calculateLevelProgress,
  diffCalendarDays,
  updateDailyStreak,
} from './progression';
import {
  computeDeckRetentionStats,
  createInitialSm2State,
  DAY_MS,
  MIN_EASE_FACTOR,
  previewSm2Intervals,
  reviewSm2Card,
} from './sm2';
import {
  buildOrderCsvBom,
  buildStudyScheduleIcs,
  buildSyllabusMarkdown,
  buildVietQrPayload,
  computeCrc16Ccitt,
  sanitizeVietQrMemo,
  TECHCOMBANK_CONFIG,
} from './vietqr';

describe('Solaris Curriculum & Sandbox Data Integrity', () => {
  it('ships 6 flagship courses with 54 lessons and matched labs/flashcards', () => {
    expect(COURSES).toHaveLength(6);
    const totalLessons = COURSES.reduce(
      (sum, c) => sum + c.modules.reduce((mSum, m) => mSum + m.lessons.length, 0),
      0,
    );
    expect(totalLessons).toBe(54);
    expect(CODING_CHALLENGES).toHaveLength(6);
    expect(QUIZ_QUESTIONS).toHaveLength(10);
    expect(FLASHCARDS).toHaveLength(18);

    for (const course of COURSES) {
      expect(CODING_CHALLENGES.some((ch) => ch.id === course.featuredLabId)).toBe(true);
      expect(getCourseById(course.id)?.code).toBe(course.code);
    }
  });
});

describe('Safe AST Sandbox Grader (Zero eval / Zero new Function)', () => {
  it('passes all 6 flagship challenges using both starterCode and referenceSolution', () => {
    for (const challenge of CODING_CHALLENGES) {
      const starterReport = gradeCodeChallenge(challenge, challenge.starterCode);
      expect(starterReport.securityBlocked).toBe(false);
      expect(starterReport.compileError).toBeUndefined();
      expect(starterReport.passedAll).toBe(true);
      expect(starterReport.passedCount).toBe(challenge.testCases.length);
      expect(starterReport.xpAwarded).toBe(challenge.xpReward);

      const refReport = gradeCodeChallenge(challenge, challenge.referenceSolution);
      expect(refReport.passedAll).toBe(true);
      expect(refReport.scorePct).toBe(100);
    }
  });

  it('accurately detects buggy user implementations and reports failing assertions', () => {
    const idempotencyLab = CODING_CHALLENGES[0]!;
    const buggyCode = `
      function dedupeIdempotencyKeys(requests) {
        return { accepted: [], rejectedDuplicates: 0, invalidCount: 0, totalAmount: 0 };
      }
    `;
    const report = gradeCodeChallenge(idempotencyLab, buggyCode);
    expect(report.securityBlocked).toBe(false);
    expect(report.passedAll).toBe(false);
    expect(report.passedCount).toBe(1); // Only empty batch passes
    expect(report.totalCount).toBe(3);
    expect(report.results[0]?.passed).toBe(false);
    expect(report.results[2]?.passed).toBe(true);
  });

  it('blocks dangerous security patterns before execution', () => {
    const lab = CODING_CHALLENGES[0]!;
    const maliciousSnippets = [
      'function dedupeIdempotencyKeys() { return window.location; }',
      'function dedupeIdempotencyKeys() { return fetch("https://evil.test"); }',
      'function dedupeIdempotencyKeys() { return eval("1+1"); }',
      'function dedupeIdempotencyKeys() { return new Function("return 1")(); }',
      'function dedupeIdempotencyKeys(x) { return x.__proto__; }',
      'function dedupeIdempotencyKeys() { while (true) {} }',
    ];

    for (const snippet of maliciousSnippets) {
      const check = scanCodeSafety(snippet);
      expect(check.safe).toBe(false);
      const report = gradeCodeChallenge(lab, snippet);
      expect(report.securityBlocked).toBe(true);
      expect(report.passedAll).toBe(false);
      expect(report.results.every((r) => r.actualPreview === 'BLOCKED')).toBe(true);
    }
  });

  it('terminates runaway non-trivial loops via deterministic AST step budget', () => {
    const lab = CODING_CHALLENGES[1]!;
    const runawayLoop = `
      function diffVirtualNodes(prevKeys, nextKeys) {
        let i = 0;
        for (let k = 0; k >= 0; k += 1) {
          i += 1;
        }
        return { mounted: [], kept: [], removed: [] };
      }
    `;
    const report = gradeCodeChallenge(lab, runawayLoop);
    expect(report.securityBlocked).toBe(false);
    expect(report.passedAll).toBe(false);
    expect(report.results[0]?.actualPreview).toBe('RUNTIME_ERROR');
    expect(report.results[0]?.error).toContain('step limit');
  });

  it('reports compile syntax errors and missing target function names cleanly', () => {
    const lab = CODING_CHALLENGES[2]!;
    const syntaxBroken = 'function reciprocalRankFusion(a, b { return []; }';
    const syntaxReport = gradeCodeChallenge(lab, syntaxBroken);
    expect(syntaxReport.compileError).toBeDefined();
    expect(syntaxReport.results[0]?.actualPreview).toBe('COMPILE_ERROR');

    const wrongName = 'function otherHelper(a) { return a; }';
    const wrongReport = gradeCodeChallenge(lab, wrongName);
    expect(wrongReport.compileError).toContain('reciprocalRankFusion');
  });

  it('supports deepEqual on nested structures and floating point tolerance', () => {
    expect(deepEqual({ a: [1, 2.0000001] }, { a: [1, 2] })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it('grades architecture quiz accurately with >=70% pass bonus XP', () => {
    const allCorrect: Record<string, number> = {};
    for (const q of QUIZ_QUESTIONS) {
      allCorrect[q.id] = q.correctIndex;
    }
    const fullReport = gradeArchitectureQuiz(QUIZ_QUESTIONS, allCorrect);
    expect(fullReport.scorePct).toBe(100);
    expect(fullReport.passed).toBe(true);
    expect(fullReport.xpAwarded).toBe(QUIZ_QUESTIONS.length * 20 + 50);

    const lowReport = gradeArchitectureQuiz(QUIZ_QUESTIONS, { [QUIZ_QUESTIONS[0]!.id]: QUIZ_QUESTIONS[0]!.correctIndex });
    expect(lowReport.correctCount).toBe(1);
    expect(lowReport.passed).toBe(false);
    expect(lowReport.xpAwarded).toBe(20);
  });
});

describe('SuperMemo-2 (SM-2) Spaced-Repetition Engine', () => {
  const T0 = 1_760_000_000_000;

  it('follows canonical Good progression (1d -> 6d -> round(interval * EF))', () => {
    const s0 = createInitialSm2State('fc-dotnet-1', T0);
    const s1 = reviewSm2Card(s0, 'good', T0);
    expect(s1.repetitions).toBe(1);
    expect(s1.intervalDays).toBe(1);
    expect(s1.dueAt).toBe(T0 + DAY_MS);

    const s2 = reviewSm2Card(s1, 'good', T0 + DAY_MS);
    expect(s2.repetitions).toBe(2);
    expect(s2.intervalDays).toBe(6);

    const s3 = reviewSm2Card(s2, 'good', T0 + 7 * DAY_MS);
    expect(s3.repetitions).toBe(3);
    expect(s3.intervalDays).toBeGreaterThanOrEqual(14);
  });

  it('boosts interval & EF on Easy ratings', () => {
    const s0 = createInitialSm2State('fc-rag-1', T0);
    const s1 = reviewSm2Card(s0, 'easy', T0);
    expect(s1.intervalDays).toBe(4);
    expect(s1.easeFactor).toBeCloseTo(2.6, 2);

    const s2 = reviewSm2Card(s1, 'easy', T0 + 4 * DAY_MS);
    expect(s2.intervalDays).toBe(10);
    expect(s2.easeFactor).toBeCloseTo(2.7, 2);
  });

  it('resets repetitions, increments lapses, and clamps EF >= 1.3 on repeated Again', () => {
    let st = createInitialSm2State('fc-sql-1', T0);
    st = reviewSm2Card(st, 'good', T0);
    for (let i = 0; i < 6; i += 1) {
      st = reviewSm2Card(st, 'again', T0 + i * 1000);
    }
    expect(st.repetitions).toBe(0);
    expect(st.lapses).toBe(6);
    expect(st.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
    expect(st.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it('generates readable interval previews and deck retention stats', () => {
    const s0 = createInitialSm2State('fc-1', T0);
    const preview = previewSm2Intervals(s0, T0);
    expect(preview).toEqual({ again: '10m', good: '1d', easy: '4d' });

    const mastered = {
      ...s0,
      repetitions: 3,
      intervalDays: 15,
      reviewsCount: 3,
      dueAt: T0 + 15 * DAY_MS,
    };
    const stats = computeDeckRetentionStats(['fc-1', 'fc-2'], { 'fc-1': mastered }, T0);
    expect(stats.totalCards).toBe(2);
    expect(stats.masteredCards).toBe(1);
    expect(stats.dueCards).toBe(1);
    expect(stats.predictedRetentionPct).toBeGreaterThanOrEqual(74);
  });
});

describe('Verifiable Certificate Generator & Checksum Validator', () => {
  it('generates deterministic SOL-CERT IDs and verifies valid signatures', () => {
    const id1 = generateCredentialId('Truong Van Tinh', 'DN10', '2026-11-27');
    const id2 = generateCredentialId('  truong   van tinh ', 'dn10', '2026-11-27');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^SOL-CERT-DN10-[0-9A-F]{8}-[0-9A-HJ-NP-Z]{2}$/);

    const check = verifyCredentialId(id1);
    expect(check.valid).toBe(true);
    expect(check.trackCode).toBe('DN10');
  });

  it('rejects tampered checksums and malformed credential IDs', () => {
    const validId = generateCredentialId('Nguyen An', 'RAG2', '2026-11-27');
    const lastChar = validId.slice(-1);
    const tampered = `${validId.slice(0, -1)}${lastChar === 'A' ? 'B' : 'A'}`;

    expect(verifyCredentialId(tampered).valid).toBe(false);
    expect(verifyCredentialId('SOL-CERT-INVALID').valid).toBe(false);
  });

  it('renders archival A4 SVG with escaped recipient text, QR path, and credential ID', () => {
    const credId = generateCredentialId('Le <Admin> & "Co"', 'RC19', '2026-11-27');
    const url = buildVerificationUrl(credId);
    const qr = buildQrSvgPath(url);
    expect(qr.size).toBeGreaterThan(20);
    expect(qr.pathData.startsWith('M')).toBe(true);

    const svg = buildCertificateSvg({
      studentName: 'Le <Admin> & "Co"',
      courseId: 'react-19',
      courseCode: 'RC19',
      courseTitleEn: 'React 19 Architecture',
      courseTitleVi: 'Kiến Trúc React 19',
      durationHours: 12,
      skills: ['React 19', 'Fiber'],
      issueDateIso: '2026-11-27',
      honors: true,
      credentialId: credId,
      verificationUrl: url,
      locale: 'en',
    });

    expect(svg).toContain('viewBox="0 0 1123 794"');
    expect(svg).toContain(credId);
    expect(svg).toContain('Le &lt;Admin&gt; &amp; &quot;Co&quot;');
    expect(svg).not.toContain('<Admin>');
  });
});

describe('Course Bundle Pricing & SOLARIS20 Voucher Engine', () => {
  it('computes tiered multi-course bundle discount rates correctly', () => {
    expect(getBundleDiscountRate(0)).toBe(0);
    expect(getBundleDiscountRate(1)).toBe(0);
    expect(getBundleDiscountRate(2)).toBe(0.1);
    expect(getBundleDiscountRate(3)).toBe(0.15);
    expect(getBundleDiscountRate(5)).toBe(0.15);
    expect(getBundleDiscountRate(6)).toBe(0.25);
  });

  it('stacks 25% All-Access bundle with SOLARIS20 (20% off) accurately', () => {
    const summary = calculateCartPricing(COURSES, 'solaris20');
    const rawSubtotal = COURSES.reduce((s, c) => s + c.priceVnd, 0);
    const expectedBundle = Math.round(rawSubtotal * 0.25);
    const expectedVoucher = Math.round((rawSubtotal - expectedBundle) * 0.2);
    const expectedFinal = rawSubtotal - expectedBundle - expectedVoucher;

    expect(summary.courseCount).toBe(6);
    expect(summary.voucherCode).toBe('SOLARIS20');
    expect(summary.bundleDiscountVnd).toBe(expectedBundle);
    expect(summary.voucherDiscountVnd).toBe(expectedVoucher);
    expect(summary.finalTotalVnd).toBe(expectedFinal);
    expect(summary.savingsPct).toBe(40); // 1 - 0.75 * 0.8 = 0.40
  });

  it('deduplicates repeated course entries and validates unknown vouchers safely', () => {
    const dupSummary = calculateCartPricing([COURSES[0]!, COURSES[0]!], 'INVALID99');
    expect(dupSummary.courseCount).toBe(1);
    expect(dupSummary.bundleRate).toBe(0);
    expect(dupSummary.voucherCode).toBeNull();
    expect(validateVoucher('ARCHITECT10')?.discountRate).toBe(0.1);
    expect(validateVoucher('NOTREAL')).toBeNull();
  });

  it('formats VNĐ and USD amounts cleanly', () => {
    expect(formatMoney(2_500_000, 'USD')).toBe('$100');
    expect(formatMoney(3_490_000, 'USD')).toBe('$139.60');
    expect(formatMoney(3_490_000, 'VND')).toContain('VNĐ');
  });
});

describe('EMVCo VietQR Techcombank & UTF-8 BOM Exports', () => {
  it('matches standard CRC-16/CCITT-FALSE check value 0x29B1 for "123456789"', () => {
    expect(computeCrc16Ccitt('123456789')).toBe('29B1');
  });

  it('builds spec-compliant Techcombank (970407 / 19077742964012) VietQR with valid trailing CRC', () => {
    const payload = buildVietQrPayload(3_490_000, 'Solaris Học Bổng DN10');
    expect(payload).toContain('A000000727');
    expect(payload).toContain(TECHCOMBANK_CONFIG.bankBin);
    expect(payload).toContain(TECHCOMBANK_CONFIG.accountNumber);
    expect(payload).toContain('54073490000');
    expect(payload).toContain('SOLARIS HOC BONG DN10');

    const bodyWithoutCrc = payload.slice(0, -4);
    const trailingCrc = payload.slice(-4);
    expect(computeCrc16Ccitt(bodyWithoutCrc)).toBe(trailingCrc);
    expect(sanitizeVietQrMemo('Trương Văn Tình #2026!')).toBe('TRUONG VAN TINH 2026');
  });

  it('exports UTF-8 BOM Syllabus Markdown, ICS calendar events, and CSV receipt', () => {
    const course = COURSES[0]!;
    const md = buildSyllabusMarkdown(course, 'vi');
    expect(md.charCodeAt(0)).toBe(0xfeff);
    expect(md).toContain(course.title.vi);

    const ics = buildStudyScheduleIcs(course, 'en', new Date('2026-11-27T00:00:00Z'));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');

    const csv = buildOrderCsvBom([course], 'SOL-DN10-2026', 2_792_000, 'SOLARIS20', 'en');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('SOLARIS20');
    expect(csv).toContain('2792000');
  });
});

describe('Learner XP Progression & Daily Streak Engine', () => {
  it('computes progressive level thresholds and rank titles accurately', () => {
    const lv1 = calculateLevelProgress(0);
    expect(lv1.level).toBe(1);
    expect(lv1.xpForNextLevel).toBe(250);

    const lv2 = calculateLevelProgress(250);
    expect(lv2.level).toBe(2);
    expect(lv2.xpIntoLevel).toBe(0);
    expect(lv2.xpForNextLevel).toBe(400);

    const high = calculateLevelProgress(12_000);
    expect(high.level).toBeGreaterThanOrEqual(10);
    expect(high.rankTitle.en).toBe('Principal Fellow');
  });

  it('increments streak on consecutive day, preserves on same day, and resets after gap', () => {
    expect(diffCalendarDays('2026-11-26', '2026-11-27')).toBe(1);

    const sameDay = updateDailyStreak(5, '2026-11-27', '2026-11-27');
    expect(sameDay.streakDays).toBe(5);
    expect(sameDay.streakIncremented).toBe(false);

    const nextDay = updateDailyStreak(5, '2026-11-26', '2026-11-27');
    expect(nextDay.streakDays).toBe(6);
    expect(nextDay.streakIncremented).toBe(true);

    const broken = updateDailyStreak(5, '2026-11-20', '2026-11-27');
    expect(broken.streakDays).toBe(1);
  });

  it('unlocks certificate eligibility when >=50% syllabus completed OR featured lab solved', () => {
    const course = COURSES[0]!;
    const none = calculateCourseCompletion(course, [], []);
    expect(none.percent).toBe(0);
    expect(none.certificateEligible).toBe(false);

    const byLab = calculateCourseCompletion(course, [], [course.featuredLabId]);
    expect(byLab.certificateEligible).toBe(true);

    const fiveLessons = course.modules.flatMap((m) => m.lessons.map((l) => l.id)).slice(0, 5);
    const bySyllabus = calculateCourseCompletion(course, fiveLessons, []);
    expect(bySyllabus.percent).toBeGreaterThanOrEqual(50);
    expect(bySyllabus.certificateEligible).toBe(true);
  });
});
