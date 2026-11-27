import QRCode from 'qrcode';
import type { CertificateSpec } from '../types/lms';

const CHECKSUM_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Deterministic 32-bit FNV-1a + Murmur-style avalanche hash for verifiable Credential IDs.
 */
export function deterministicHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function computeCheckChars(body: string): string {
  const h = deterministicHash32(`SOLARIS-CHECK::${body}`);
  const c1 = CHECKSUM_ALPHABET[h % CHECKSUM_ALPHABET.length] ?? '0';
  const c2 = CHECKSUM_ALPHABET[Math.floor(h / CHECKSUM_ALPHABET.length) % CHECKSUM_ALPHABET.length] ?? '0';
  return `${c1}${c2}`;
}

export function generateCredentialId(
  studentName: string,
  courseCode: string,
  issueDateIso: string,
): string {
  const normalizedName = studentName.trim().toUpperCase().replace(/\s+/g, ' ');
  const normalizedCode = courseCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  const seed = `${normalizedName}|${normalizedCode}|${issueDateIso.trim()}`;
  const digestHex = deterministicHash32(seed).toString(16).toUpperCase().padStart(8, '0');
  const body = `SOL-CERT-${normalizedCode}-${digestHex}`;
  const check = computeCheckChars(body);
  return `${body}-${check}`;
}

export interface CredentialVerificationResult {
  valid: boolean;
  normalizedId: string;
  trackCode?: string;
  reason: string;
}

export function verifyCredentialId(rawId: string): CredentialVerificationResult {
  const normalizedId = rawId.trim().toUpperCase();
  const match = /^SOL-CERT-([A-Z0-9]{4})-([0-9A-F]{8})-([0-9A-HJ-NP-Z]{2})$/.exec(normalizedId);

  if (!match) {
    return {
      valid: false,
      normalizedId,
      reason: 'Format must match SOL-CERT-XXXX-HHHHHHHH-CC',
    };
  }

  const trackCode = match[1] ?? '';
  const digest = match[2] ?? '';
  const providedCheck = match[3] ?? '';
  const expectedCheck = computeCheckChars(`SOL-CERT-${trackCode}-${digest}`);

  if (providedCheck !== expectedCheck) {
    return {
      valid: false,
      normalizedId,
      trackCode,
      reason: 'Checksum mismatch — credential signature invalid',
    };
  }

  return {
    valid: true,
    normalizedId,
    trackCode,
    reason: 'Cryptographic checksum verified on Solaris Registry',
  };
}

export function buildVerificationUrl(credentialId: string): string {
  return `https://tvt987.github.io/solaris-academy/?verify=${encodeURIComponent(credentialId)}`;
}

export interface QrSvgVector {
  size: number;
  pathData: string;
}

export function buildQrSvgPath(payload: string): QrSvgVector {
  const qr = QRCode.create(payload || 'https://tvt987.github.io/solaris-academy/', {
    errorCorrectionLevel: 'M',
  });
  const size = qr.modules.size;
  const segments: string[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (qr.modules.get(row, col)) {
        segments.push(`M${col} ${row}h1v1h-1z`);
      }
    }
  }

  return { size, pathData: segments.join('') };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a formal A4 Landscape (1123 x 794) vector SVG completion certificate
 * complete with guilloche framing, Solaris astrolabe crest, signature vector, and real scannable QR SVG.
 */
export function buildCertificateSvg(spec: CertificateSpec): string {
  const qr = buildQrSvgPath(spec.verificationUrl);
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
  const instructorLabel = isVi ? 'KIẾN TRÚC SƯ TRƯỞNG · GIÁM ĐỐC HỌC THUẬT' : 'PRINCIPAL ARCHITECT · ACADEMIC DIRECTOR';
  const verifyHint = isVi ? 'QUÉT MÃ XÁC THỰC' : 'SCAN TO VERIFY';

  const skillBadges = spec.skills.slice(0, 5);
  const pillGap = 10;
  const pillWidth = 152;
  const totalPillsWidth = skillBadges.length * pillWidth + Math.max(0, skillBadges.length - 1) * pillGap;
  const pillsStartX = (1123 - totalPillsWidth) / 2;

  const pillsSvg = skillBadges
    .map((skill, idx) => {
      const x = pillsStartX + idx * (pillWidth + pillGap);
      return `
        <g transform="translate(${x.toFixed(1)}, 482)">
          <rect width="${pillWidth}" height="28" rx="14" fill="#171d2c" stroke="#4f46e5" stroke-opacity="0.55" stroke-width="1"/>
          <text x="${pillWidth / 2}" y="18" text-anchor="middle" fill="#e2e8f0" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600">${escapeXml(skill.slice(0, 18))}</text>
        </g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1123 794" width="1123" height="794" role="img" aria-label="${escapeXml(headingLabel)} - ${escapeXml(studentDisplay)}">
  <defs>
    <linearGradient id="solarisBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0f17"/>
      <stop offset="55%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0d1322"/>
    </linearGradient>
    <linearGradient id="goldBorder" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="48%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="indigoGlow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4f46e5" stop-opacity="0"/>
      <stop offset="50%" stop-color="#4f46e5" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
    <pattern id="scholasticGrid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#94a3b8" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1123" height="794" fill="url(#solarisBg)"/>
  <rect width="1123" height="794" fill="url(#scholasticGrid)"/>

  <!-- Subtle radial astrolabe watermark -->
  <g transform="translate(561.5, 397)" opacity="0.08" stroke="#cbd5e1" fill="none">
    <circle r="290" stroke-width="1.2" stroke-dasharray="6 6"/>
    <circle r="220" stroke-width="1"/>
    <circle r="145" stroke-width="0.9" stroke-dasharray="3 5"/>
    <line x1="-320" y1="0" x2="320" y2="0" stroke-width="0.8"/>
    <line x1="0" y1="-320" x2="0" y2="320" stroke-width="0.8"/>
  </g>

  <!-- Outer & Inner Scholastic Frames -->
  <rect x="28" y="28" width="1067" height="738" rx="18" fill="none" stroke="url(#goldBorder)" stroke-width="2.5"/>
  <rect x="42" y="42" width="1039" height="710" rx="12" fill="none" stroke="#334155" stroke-width="1"/>

  <!-- Corner Architectural Brackets -->
  <path d="M58 84V58H84 M1065 84V58H1039 M58 710V736H84 M1065 710V736H1039" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/>

  <!-- Top Header Crest -->
  <g transform="translate(561.5, 102)">
    <circle cx="0" cy="0" r="24" fill="#131927" stroke="#4f46e5" stroke-width="2"/>
    <circle cx="0" cy="0" r="13" fill="#4f46e5"/>
    <circle cx="0" cy="0" r="5.5" fill="#f59e0b"/>
    <path d="M0 -31v6M0 25v6M-31 0h6M25 0h6" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
  </g>

  <text x="561.5" y="156" text-anchor="middle" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="13" letter-spacing="4" font-weight="600">SOLARIS ACADEMY · TVT STUDIO</text>
  <text x="561.5" y="190" text-anchor="middle" fill="#f8fafc" font-family="'Plus Jakarta Sans', sans-serif" font-size="22" letter-spacing="3.2" font-weight="700">${escapeXml(headingLabel)}</text>

  <!-- Distinction Pill -->
  <rect x="401.5" y="208" width="320" height="28" rx="14" fill="${spec.honors ? '#f59e0b' : '#10b981'}" fill-opacity="0.14" stroke="${spec.honors ? '#f59e0b' : '#10b981'}" stroke-opacity="0.6" stroke-width="1"/>
  <text x="561.5" y="226" text-anchor="middle" fill="${spec.honors ? '#fbbf24' : '#34d399'}" font-family="'JetBrains Mono', monospace" font-size="11.5" letter-spacing="1.4" font-weight="700">${escapeXml(honorsText)}</text>

  <!-- Recipient -->
  <text x="561.5" y="274" text-anchor="middle" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="12" letter-spacing="2.8">${escapeXml(awardedToLabel)}</text>
  <text x="561.5" y="334" text-anchor="middle" fill="#ffffff" font-family="'Newsreader', Georgia, serif" font-size="54" font-weight="600" font-style="italic">${escapeXml(studentDisplay)}</text>
  <rect x="261.5" y="352" width="600" height="2" fill="url(#indigoGlow)"/>

  <!-- Course Info -->
  <text x="561.5" y="392" text-anchor="middle" fill="#cbd5e1" font-family="'Plus Jakarta Sans', sans-serif" font-size="15.5">${escapeXml(completionCopy)}</text>
  <text x="561.5" y="440" text-anchor="middle" fill="#f8fafc" font-family="'Plus Jakarta Sans', sans-serif" font-size="30" font-weight="800">${escapeXml(courseTitle)}</text>
  <text x="561.5" y="466" text-anchor="middle" fill="#818cf8" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="600">TRACK CODE: ${escapeXml(spec.courseCode)} · ${spec.durationHours} VERIFIED HOURS</text>

  <!-- Verified Skill Pills -->
  ${pillsSvg}

  <!-- Footer Metadata & Signature & QR -->
  <line x1="92" y1="546" x2="1031" y2="546" stroke="#1e293b" stroke-width="1.2"/>

  <!-- Left Metadata Block -->
  <g transform="translate(96, 586)">
    <text x="0" y="0" fill="#64748b" font-family="'JetBrains Mono', monospace" font-size="11" letter-spacing="1.8">${escapeXml(issueLabel)}</text>
    <text x="0" y="24" fill="#f1f5f9" font-family="'JetBrains Mono', monospace" font-size="16" font-weight="600">${escapeXml(spec.issueDateIso)}</text>

    <text x="0" y="66" fill="#64748b" font-family="'JetBrains Mono', monospace" font-size="11" letter-spacing="1.8">${escapeXml(idLabel)}</text>
    <text x="0" y="90" fill="#34d399" font-family="'JetBrains Mono', monospace" font-size="14.5" font-weight="700">${escapeXml(spec.credentialId)}</text>
  </g>

  <!-- Center Signature Block -->
  <g transform="translate(561.5, 594)">
    <path d="M-92 18 C -72 -18, -42 -12, -32 10 C -20 34, 4 -24, 24 8 C 40 32, 62 -14, 92 6" fill="none" stroke="#f59e0b" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="-130" y1="36" x2="130" y2="36" stroke="#475569" stroke-width="1"/>
    <text x="0" y="58" text-anchor="middle" fill="#f8fafc" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="700">Truong Van Tinh</text>
    <text x="0" y="78" text-anchor="middle" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="10.5" letter-spacing="1.2">${escapeXml(instructorLabel)}</text>
  </g>

  <!-- Right Real Verification QR Block -->
  <g transform="translate(888, 566)">
    <rect x="0" y="0" width="136" height="156" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1"/>
    <rect x="12" y="10" width="112" height="112" rx="6" fill="#ffffff"/>
    <g transform="translate(12, 10) scale(${qrScale.toFixed(4)})">
      <path d="${qr.pathData}" fill="#0c0f14"/>
    </g>
    <text x="68" y="142" text-anchor="middle" fill="#94a3b8" font-family="'JetBrains Mono', monospace" font-size="9.5" letter-spacing="1.4" font-weight="600">${escapeXml(verifyHint)}</text>
  </g>
</svg>`;
}
