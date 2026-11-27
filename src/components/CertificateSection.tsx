import { useEffect, useMemo, useState } from 'react';
import type { CertificateSpec, Course, LearnerState, Locale } from '../types/lms';
import { tCopy } from '../data/i18n';
import {
  buildCertificateSvg,
  buildQrSvgPath,
  buildVerificationUrl,
  generateCredentialId,
  verifyCredentialId,
  type CredentialVerificationResult,
} from '../engines/certificate';
import { calculateCourseCompletion, toIsoDateOnly } from '../engines/progression';
import {
  AwardIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  PrinterIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from './Icons';

interface CertificateSectionProps {
  courses: Course[];
  locale: Locale;
  learner: LearnerState;
  selectedCourseId: string;
  initialVerifyQuery: string;
  onSelectCourseId: (courseId: string) => void;
  onUpdateStudentName: (name: string) => void;
  onNotify: (message: string) => void;
}

/**
 * Pure declarative JSX SVG renderer for the archival A4 Landscape certificate (zero innerHTML).
 * Exported so App.tsx can also mount it inside the @media print A4 container.
 */
export function CertificateVectorCanvas({
  spec,
  idPrefix = 'cert',
}: {
  spec: CertificateSpec;
  idPrefix?: string;
}) {
  const qr = useMemo(() => buildQrSvgPath(spec.verificationUrl), [spec.verificationUrl]);
  const qrDisplaySize = 112;
  const qrScale = qrDisplaySize / qr.size;
  const courseTitle = spec.locale === 'vi' ? spec.courseTitleVi : spec.courseTitleEn;
  const studentDisplay = spec.studentName.trim() || 'Solaris Scholar';
  const isVi = spec.locale === 'vi';

  const headingLabel = isVi ? 'CHỨNG CHỈ HOÀN THÀNH CHUYÊN SÂU' : 'CERTIFICATE OF ENGINEERING MASTERY';
  const awardedToLabel = isVi ? 'TRAO TẶNG HỌC VIÊN' : 'PROUDLY CONFERRED UPON';
  const completionCopy = isVi
    ? `Đã hoàn thành xuất sắc chương trình đào tạo và kiểm định thực hành ${spec.durationHours} giờ cho chuyên đề`
    : `For demonstrating verified production proficiency across ${spec.durationHours} hours of graded labs & architecture drills in`;
  const honorsText = spec.honors
    ? isVi
      ? 'HẠNG XUẤT SẮC · HONORS DISTINCTION'
      : 'WITH HONORS DISTINCTION'
    : isVi
      ? 'CHỨNG NHẬN CHÍNH QUY · VERIFIED TRACK'
      : 'VERIFIED CURRICULUM COMPLETION';
  const issueLabel = isVi ? 'NGÀY CẤP' : 'DATE ISSUED';
  const idLabel = isVi ? 'MÃ XÁC THỰC' : 'CREDENTIAL ID';
  const instructorLabel = isVi
    ? 'KIẾN TRÚC SƯ TRƯỞNG · GIÁM ĐỐC HỌC THUẬT'
    : 'PRINCIPAL ARCHITECT · ACADEMIC DIRECTOR';
  const verifyHint = isVi ? 'QUÉT MÃ XÁC THỰC' : 'SCAN TO VERIFY';

  const skillBadges = spec.skills.slice(0, 5);
  const pillGap = 10;
  const pillWidth = 152;
  const totalPillsWidth =
    skillBadges.length * pillWidth + Math.max(0, skillBadges.length - 1) * pillGap;
  const pillsStartX = (1123 - totalPillsWidth) / 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1123 794"
      className="h-auto w-full rounded-xl shadow-2xl shadow-slate-950/25"
      role="img"
      aria-label={`${headingLabel} - ${studentDisplay}`}
    >
      <defs>
        <linearGradient id={`${idPrefix}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b0f17" />
          <stop offset="55%" stopColor="#111827" />
          <stop offset="100%" stopColor="#0d1322" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-border`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="48%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-glow`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0" />
          <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${idPrefix}-grid`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path
            d="M 36 0 L 0 0 0 36"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width="1123" height="794" fill={`url(#${idPrefix}-bg)`} />
      <rect width="1123" height="794" fill={`url(#${idPrefix}-grid)`} />

      {/* Subtle radial astrolabe watermark */}
      <g transform="translate(561.5, 397)" opacity="0.08" stroke="#cbd5e1" fill="none">
        <circle r="290" strokeWidth="1.2" strokeDasharray="6 6" />
        <circle r="220" strokeWidth="1" />
        <circle r="145" strokeWidth="0.9" strokeDasharray="3 5" />
        <line x1="-320" y1="0" x2="320" y2="0" strokeWidth="0.8" />
        <line x1="0" y1="-320" x2="0" y2="320" strokeWidth="0.8" />
      </g>

      {/* Outer & Inner Frames */}
      <rect
        x="28"
        y="28"
        width="1067"
        height="738"
        rx="18"
        fill="none"
        stroke={`url(#${idPrefix}-border)`}
        strokeWidth="2.5"
      />
      <rect x="42" y="42" width="1039" height="710" rx="12" fill="none" stroke="#334155" strokeWidth="1" />

      {/* Architectural Corner Brackets */}
      <path
        d="M58 84V58H84 M1065 84V58H1039 M58 710V736H84 M1065 710V736H1039"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Top Crest */}
      <g transform="translate(561.5, 102)">
        <circle cx="0" cy="0" r="24" fill="#131927" stroke="#4f46e5" strokeWidth="2" />
        <circle cx="0" cy="0" r="13" fill="#4f46e5" />
        <circle cx="0" cy="0" r="5.5" fill="#f59e0b" />
        <path
          d="M0 -31v6M0 25v6M-31 0h6M25 0h6"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      <text
        x="561.5"
        y="156"
        textAnchor="middle"
        fill="#94a3b8"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="13"
        letterSpacing="4"
        fontWeight="600"
      >
        SOLARIS ACADEMY · TVT STUDIO
      </text>
      <text
        x="561.5"
        y="190"
        textAnchor="middle"
        fill="#f8fafc"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="22"
        letterSpacing="3.2"
        fontWeight="700"
      >
        {headingLabel}
      </text>

      {/* Distinction Pill */}
      <rect
        x="401.5"
        y="208"
        width="320"
        height="28"
        rx="14"
        fill={spec.honors ? '#f59e0b' : '#10b981'}
        fillOpacity="0.14"
        stroke={spec.honors ? '#f59e0b' : '#10b981'}
        strokeOpacity="0.6"
        strokeWidth="1"
      />
      <text
        x="561.5"
        y="226"
        textAnchor="middle"
        fill={spec.honors ? '#fbbf24' : '#34d399'}
        fontFamily="'JetBrains Mono', monospace"
        fontSize="11.5"
        letterSpacing="1.4"
        fontWeight="700"
      >
        {honorsText}
      </text>

      {/* Recipient */}
      <text
        x="561.5"
        y="274"
        textAnchor="middle"
        fill="#94a3b8"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="12"
        letterSpacing="2.8"
      >
        {awardedToLabel}
      </text>
      <text
        x="561.5"
        y="334"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="'Newsreader', Georgia, serif"
        fontSize="54"
        fontWeight="600"
        fontStyle="italic"
      >
        {studentDisplay}
      </text>
      <rect x="261.5" y="352" width="600" height="2" fill={`url(#${idPrefix}-glow)`} />

      {/* Course Info */}
      <text
        x="561.5"
        y="392"
        textAnchor="middle"
        fill="#cbd5e1"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="15.5"
      >
        {completionCopy}
      </text>
      <text
        x="561.5"
        y="440"
        textAnchor="middle"
        fill="#f8fafc"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="30"
        fontWeight="800"
      >
        {courseTitle}
      </text>
      <text
        x="561.5"
        y="466"
        textAnchor="middle"
        fill="#818cf8"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="13"
        fontWeight="600"
      >
        {`TRACK CODE: ${spec.courseCode} · ${spec.durationHours} VERIFIED HOURS`}
      </text>

      {/* Skill Pills */}
      {skillBadges.map((skill, idx) => {
        const x = pillsStartX + idx * (pillWidth + pillGap);
        return (
          <g key={skill} transform={`translate(${x.toFixed(1)}, 482)`}>
            <rect
              width={pillWidth}
              height="28"
              rx="14"
              fill="#171d2c"
              stroke="#4f46e5"
              strokeOpacity="0.55"
              strokeWidth="1"
            />
            <text
              x={pillWidth / 2}
              y="18"
              textAnchor="middle"
              fill="#e2e8f0"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11"
              fontWeight="600"
            >
              {skill.slice(0, 18)}
            </text>
          </g>
        );
      })}

      {/* Divider */}
      <line x1="92" y1="546" x2="1031" y2="546" stroke="#1e293b" strokeWidth="1.2" />

      {/* Left Metadata Block */}
      <g transform="translate(96, 586)">
        <text x="0" y="0" fill="#64748b" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="1.8">
          {issueLabel}
        </text>
        <text x="0" y="24" fill="#f1f5f9" fontFamily="'JetBrains Mono', monospace" fontSize="16" fontWeight="600">
          {spec.issueDateIso}
        </text>
        <text x="0" y="66" fill="#64748b" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="1.8">
          {idLabel}
        </text>
        <text x="0" y="90" fill="#34d399" fontFamily="'JetBrains Mono', monospace" fontSize="14.5" fontWeight="700">
          {spec.credentialId}
        </text>
      </g>

      {/* Center Signature Block */}
      <g transform="translate(561.5, 594)">
        <path
          d="M-92 18 C -72 -18, -42 -12, -32 10 C -20 34, 4 -24, 24 8 C 40 32, 62 -14, 92 6"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <line x1="-130" y1="36" x2="130" y2="36" stroke="#475569" strokeWidth="1" />
        <text
          x="0"
          y="58"
          textAnchor="middle"
          fill="#f8fafc"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontSize="16"
          fontWeight="700"
        >
          Truong Van Tinh
        </text>
        <text
          x="0"
          y="78"
          textAnchor="middle"
          fill="#94a3b8"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="10.5"
          letterSpacing="1.2"
        >
          {instructorLabel}
        </text>
      </g>

      {/* Right Verification QR Block */}
      <g transform="translate(888, 566)">
        <rect x="0" y="0" width="136" height="156" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <rect x="12" y="10" width="112" height="112" rx="6" fill="#ffffff" />
        <g transform={`translate(12, 10) scale(${qrScale.toFixed(4)})`}>
          <path d={qr.pathData} fill="#0c0f14" />
        </g>
        <text
          x="68"
          y="142"
          textAnchor="middle"
          fill="#94a3b8"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="9.5"
          letterSpacing="1.4"
          fontWeight="600"
        >
          {verifyHint}
        </text>
      </g>
    </svg>
  );
}

export function CertificateSection({
  courses,
  locale,
  learner,
  selectedCourseId,
  initialVerifyQuery,
  onSelectCourseId,
  onUpdateStudentName,
  onNotify,
}: CertificateSectionProps) {
  const copy = tCopy(locale);
  const [issueDateIso, setIssueDateIso] = useState<string>(() => toIsoDateOnly(new Date()));
  const [honors, setHonors] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [verifierInput, setVerifierInput] = useState<string>(initialVerifyQuery);
  const [verifyResult, setVerifyResult] = useState<CredentialVerificationResult | null>(() =>
    initialVerifyQuery ? verifyCredentialId(initialVerifyQuery) : null,
  );

  useEffect(() => {
    if (initialVerifyQuery) {
      setVerifierInput(initialVerifyQuery);
      setVerifyResult(verifyCredentialId(initialVerifyQuery));
    }
  }, [initialVerifyQuery]);

  const activeCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? courses[0]!,
    [courses, selectedCourseId],
  );

  const courseStats = useMemo(
    () =>
      calculateCourseCompletion(
        activeCourse,
        learner.completedLessons,
        learner.solvedChallenges,
      ),
    [activeCourse, learner.completedLessons, learner.solvedChallenges],
  );

  const spec: CertificateSpec = useMemo(() => {
    const credentialId = generateCredentialId(
      learner.studentName || 'Solaris Scholar',
      activeCourse.code,
      issueDateIso,
    );
    return {
      studentName: learner.studentName || 'Solaris Scholar',
      courseId: activeCourse.id,
      courseCode: activeCourse.code,
      courseTitleEn: activeCourse.title.en,
      courseTitleVi: activeCourse.title.vi,
      durationHours: activeCourse.durationHours,
      skills: activeCourse.skills,
      issueDateIso,
      honors,
      credentialId,
      verificationUrl: buildVerificationUrl(credentialId),
      locale,
    };
  }, [learner.studentName, activeCourse, issueDateIso, honors, locale]);

  const handleDownloadSvg = () => {
    const svgXml = buildCertificateSvg(spec);
    const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.credentialId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotify(
      locale === 'vi'
        ? `Đã tải chứng chỉ vector ${spec.credentialId}.svg`
        : `Downloaded archival ${spec.credentialId}.svg`,
    );
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleCopyCredentialId = async () => {
    try {
      await navigator.clipboard.writeText(spec.credentialId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      onNotify(spec.credentialId);
    }
  };

  const handleVerify = (raw?: string) => {
    const target = (raw ?? verifierInput).trim();
    if (!target) return;
    setVerifyResult(verifyCredentialId(target));
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="no-print">
      <div>
        <span className="font-code text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
          {copy.certificate.sectionLabel}
        </span>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--sol-text)] sm:text-3xl">
          {copy.certificate.sectionTitle}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--sol-text-secondary)]">
          {copy.certificate.sectionDesc}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls & Verifier Sidebar */}
        <div className="space-y-5 lg:col-span-4">
          <div className="sol-card rounded-2xl p-5 space-y-4">
            {/* Earned Status Pill */}
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                courseStats.certificateEligible
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200'
              }`}
            >
              <AwardIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="text-xs">
                <div className="font-code text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {copy.certificate.liveProgressNote} ({courseStats.percent}%)
                </div>
                <div className="mt-0.5 font-semibold">
                  {courseStats.certificateEligible
                    ? copy.certificate.earnedState
                    : copy.certificate.previewState}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="cert-student-name"
                className="block font-code text-[11px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]"
              >
                {copy.certificate.studentNameLabel}
              </label>
              <input
                id="cert-student-name"
                type="text"
                value={learner.studentName}
                onChange={(e) => onUpdateStudentName(e.target.value)}
                maxLength={54}
                className="mt-1.5 w-full rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-3.5 py-2.5 text-sm font-semibold text-[var(--sol-text)] focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="cert-track-select"
                className="block font-code text-[11px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]"
              >
                {copy.certificate.trackLabel}
              </label>
              <select
                id="cert-track-select"
                value={activeCourse.id}
                onChange={(e) => onSelectCourseId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-3.5 py-2.5 text-sm font-semibold text-[var(--sol-text)] focus:border-indigo-500 focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.title[locale]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="cert-issue-date"
                className="block font-code text-[11px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]"
              >
                {copy.certificate.dateLabel}
              </label>
              <input
                id="cert-issue-date"
                type="date"
                value={issueDateIso}
                onChange={(e) => setIssueDateIso(e.target.value || toIsoDateOnly(new Date()))}
                className="mt-1.5 w-full rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-3.5 py-2.5 font-code text-sm text-[var(--sol-text)] focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)]/60 px-3.5 py-2.5 text-xs font-semibold text-[var(--sol-text)]">
              <input
                type="checkbox"
                checked={honors}
                onChange={(e) => setHonors(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
              />
              <span>{copy.certificate.honorsLabel}</span>
            </label>

            {/* Generated Credential ID Box */}
            <div className="rounded-xl border border-emerald-500/30 bg-slate-950 p-3 text-slate-100">
              <div className="flex items-center justify-between gap-2">
                <span className="font-code text-[10px] uppercase tracking-wider text-slate-400">
                  CREDENTIAL HASH
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyCredentialId()}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 font-code text-[10px] font-bold text-emerald-300 hover:bg-slate-700"
                >
                  <CopyIcon className="h-3 w-3" />
                  <span>{copiedId ? copy.certificate.copied : copy.certificate.copyId}</span>
                </button>
              </div>
              <div
                data-testid="generated-credential-id"
                className="mt-1 break-all font-code text-xs font-bold text-emerald-400"
              >
                {spec.credentialId}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                data-testid="download-cert-svg"
                onClick={handleDownloadSvg}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500"
              >
                <DownloadIcon className="h-4 w-4" />
                <span>{copy.certificate.downloadSvg}</span>
              </button>
              <button
                type="button"
                data-testid="print-cert-pdf"
                onClick={handlePrintPdf}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-4 py-2.5 text-xs font-bold text-[var(--sol-text)] hover:border-emerald-500/60"
              >
                <PrinterIcon className="h-4 w-4 text-emerald-500" />
                <span>{copy.certificate.printPdf}</span>
              </button>
            </div>
          </div>

          {/* Live Cryptographic Verifier */}
          <div className="sol-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-[var(--sol-text)]">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
                <span>{copy.certificate.verifierTitle}</span>
              </h3>
              <button
                type="button"
                data-testid="load-current-id-btn"
                onClick={() => {
                  setVerifierInput(spec.credentialId);
                  handleVerify(spec.credentialId);
                }}
                className="font-code text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {copy.certificate.verifyCurrent}
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                data-testid="verifier-input"
                value={verifierInput}
                onChange={(e) => setVerifierInput(e.target.value)}
                placeholder={copy.certificate.verifierPlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-3 py-2 font-code text-xs text-[var(--sol-text)] placeholder:text-[var(--sol-text-muted)] focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                data-testid="verify-btn"
                onClick={() => handleVerify()}
                className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                {copy.certificate.verifyBtn}
              </button>
            </div>

            {verifyResult && (
              <div
                data-testid="verify-result-box"
                className={`mt-3 rounded-xl border p-3 text-xs ${
                  verifyResult.valid
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-code font-bold">
                  {verifyResult.valid ? (
                    <CheckCircleIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <ShieldAlertIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {verifyResult.valid
                      ? copy.certificate.verifiedValid
                      : copy.certificate.verifiedInvalid}
                  </span>
                  {verifyResult.trackCode && (
                    <span className="ml-auto rounded bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                      {verifyResult.trackCode}
                    </span>
                  )}
                </div>
                <p className="mt-1 opacity-90">{verifyResult.reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Archival A4 Landscape Certificate Preview */}
        <div className="lg:col-span-8">
          <div className="sol-card rounded-2xl p-3 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="font-code text-[11px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                A4 LANDSCAPE · 1123×794 VECTOR MASTER · SCANNABLE QR
              </span>
              <span className="font-code text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {spec.courseCode} · {spec.issueDateIso}
              </span>
            </div>

            <CertificateVectorCanvas spec={spec} idPrefix="preview-cert" />
          </div>
        </div>
      </div>
      </div>

      {/* Dedicated Full-Bleed A4 Print Portal */}
      <div className="print-only-cert hidden">
        <CertificateVectorCanvas spec={spec} idPrefix="print-cert" />
      </div>
    </section>
  );
}
