import type { Course, Locale } from '../types/lms';

export const TECHCOMBANK_CONFIG = {
  bankName: 'Techcombank',
  bankBin: '970407',
  accountNumber: '19077742964012',
  accountName: 'TRUONG VAN TINH',
  currencyCodeVnd: '704',
  countryCode: 'VN',
} as const;

function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Standard CRC-16/CCITT-FALSE (polynomial 0x1021, init 0xFFFF) required by EMVCo & NAPAS VietQR.
 */
export function computeCrc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= (payload.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function sanitizeVietQrMemo(rawMemo: string): string {
  return rawMemo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
    .toUpperCase();
}

/**
 * Generates a real spec-compliant NAPAS 247 / EMVCo VietQR payload string
 * scannable by Techcombank, Vietcombank, MB, MoMo, and Vietnamese banking apps.
 */
export function buildVietQrPayload(amountVnd: number, transferMemo: string): string {
  const cleanAmount = Math.max(0, Math.round(amountVnd));
  const cleanMemo = sanitizeVietQrMemo(transferMemo || 'SOLARIS ACADEMY');

  const beneficiaryInfo =
    tlv('00', TECHCOMBANK_CONFIG.bankBin) + tlv('01', TECHCOMBANK_CONFIG.accountNumber);

  const merchantAccountInfo =
    tlv('00', 'A000000727') + tlv('01', beneficiaryInfo) + tlv('02', 'QRIBFTTA');

  const additionalData = cleanMemo ? tlv('08', cleanMemo) : '';

  const withoutCrc =
    tlv('00', '01') +
    tlv('01', cleanAmount > 0 ? '12' : '11') +
    tlv('38', merchantAccountInfo) +
    tlv('53', TECHCOMBANK_CONFIG.currencyCodeVnd) +
    (cleanAmount > 0 ? tlv('54', String(cleanAmount)) : '') +
    tlv('58', TECHCOMBANK_CONFIG.countryCode) +
    (additionalData ? tlv('62', additionalData) : '') +
    '6304';

  const crc = computeCrc16Ccitt(withoutCrc);
  return `${withoutCrc}${crc}`;
}

export function buildSyllabusMarkdown(course: Course, locale: Locale): string {
  const lines: string[] = [
    `# ${course.title[locale]} (${course.code})`,
    '',
    `> ${course.subtitle[locale]}`,
    '',
    `- **${locale === 'vi' ? 'Giảng viên' : 'Instructor'}**: ${course.instructor} (${course.instructorRole[locale]})`,
    `- **${locale === 'vi' ? 'Thời lượng' : 'Duration'}**: ${course.durationHours}h`,
    `- **${locale === 'vi' ? 'Kỹ năng trọng tâm' : 'Core Skills'}**: ${course.skills.join(', ')}`,
    '',
    `## ${locale === 'vi' ? 'Mục tiêu đầu ra' : 'Learning Outcomes'}`,
    ...course.outcomes.map((o) => `- ${o[locale]}`),
    '',
    `## ${locale === 'vi' ? 'Giáo trình chi tiết' : 'Curriculum Syllabus'}`,
  ];

  course.modules.forEach((mod, idx) => {
    lines.push('', `### ${idx + 1}. ${mod.title[locale]}`);
    mod.lessons.forEach((lesson, lIdx) => {
      lines.push(
        `- ${idx + 1}.${lIdx + 1} **${lesson.title[locale]}** (${lesson.durationMin}m · ${lesson.type.toUpperCase()}) — ${lesson.keyConcept[locale]}`,
      );
    });
  });

  return `\uFEFF${lines.join('\n')}\n`;
}

export function buildStudyScheduleIcs(course: Course, locale: Locale, startDate: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatIcsDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Solaris Academy//Study Planner 2026//EN',
    'CALSCALE:GREGORIAN',
  ];

  course.modules.forEach((mod, idx) => {
    const start = new Date(startDate.getTime() + idx * 2 * 24 * 60 * 60 * 1000);
    start.setUTCHours(13, 0, 0, 0);
    const end = new Date(start.getTime() + 90 * 60 * 1000);

    lines.push(
      'BEGIN:VEVENT',
      `UID:solaris-${course.id}-${mod.id}@solaris.academy`,
      `DTSTAMP:${formatIcsDate(startDate)}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:[Solaris] ${course.code} — ${mod.title[locale]}`,
      `DESCRIPTION:${mod.lessons.map((l) => l.title[locale]).join(' | ')}`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function buildOrderCsvBom(
  courses: Course[],
  orderCode: string,
  totalVnd: number,
  voucherCode: string | null,
  locale: Locale,
): string {
  const header =
    locale === 'vi'
      ? 'MaDonHang,MaKhoaHoc,TenKhoaHoc,GiaNiemYetVND,MaGiamGia,TongThanhToanVND'
      : 'OrderCode,CourseCode,CourseTitle,ListPriceVND,VoucherCode,FinalTotalVND';

  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = courses.map((c) =>
    [
      escapeCsv(orderCode),
      escapeCsv(c.code),
      escapeCsv(c.title[locale]),
      String(c.priceVnd),
      escapeCsv(voucherCode ?? 'NONE'),
      String(totalVnd),
    ].join(','),
  );

  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
}
