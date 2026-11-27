import type { CartPricingSummary, Course, Currency, VoucherDefinition } from '../types/lms';

export const VND_PER_USD = 25_000;

export const VOUCHER_CATALOG: Record<string, VoucherDefinition> = {
  SOLARIS20: {
    code: 'SOLARIS20',
    discountRate: 0.2,
    label: {
      en: '20% Off Founding Scholar Voucher',
      vi: 'Giảm 20% Mã Học Bổng Tiên Phong',
    },
  },
  ARCHITECT10: {
    code: 'ARCHITECT10',
    discountRate: 0.1,
    label: {
      en: '10% Off Engineering Community Code',
      vi: 'Giảm 10% Mã Cộng Đồng Kỹ Sư',
    },
  },
};

export function validateVoucher(rawCode: string): VoucherDefinition | null {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) return null;
  return VOUCHER_CATALOG[normalized] ?? null;
}

/**
 * Multi-course automatic bundle tiers:
 * - 1 course: 0%
 * - 2 courses: 10%
 * - 3 to 5 courses: 15%
 * - 6+ courses (All-Access): 25%
 */
export function getBundleDiscountRate(courseCount: number): number {
  if (courseCount >= 6) return 0.25;
  if (courseCount >= 3) return 0.15;
  if (courseCount === 2) return 0.1;
  return 0;
}

export function calculateCartPricing(
  coursesInCart: Course[],
  rawVoucherCode: string = '',
): CartPricingSummary {
  const uniqueById = new Map<string, Course>();
  for (const c of coursesInCart) {
    uniqueById.set(c.id, c);
  }
  const uniqueCourses = Array.from(uniqueById.values());
  const courseCount = uniqueCourses.length;
  const subtotalVnd = uniqueCourses.reduce((sum, c) => sum + c.priceVnd, 0);

  if (courseCount === 0 || subtotalVnd === 0) {
    return {
      courseCount: 0,
      subtotalVnd: 0,
      bundleRate: 0,
      bundleDiscountVnd: 0,
      voucherCode: null,
      voucherRate: 0,
      voucherDiscountVnd: 0,
      totalDiscountVnd: 0,
      finalTotalVnd: 0,
      finalTotalUsd: 0,
      savingsPct: 0,
    };
  }

  const bundleRate = getBundleDiscountRate(courseCount);
  const bundleDiscountVnd = Math.round(subtotalVnd * bundleRate);
  const afterBundleVnd = subtotalVnd - bundleDiscountVnd;

  const voucher = validateVoucher(rawVoucherCode);
  const voucherRate = voucher ? voucher.discountRate : 0;
  const voucherDiscountVnd = voucher ? Math.round(afterBundleVnd * voucherRate) : 0;

  const totalDiscountVnd = bundleDiscountVnd + voucherDiscountVnd;
  const finalTotalVnd = Math.max(0, subtotalVnd - totalDiscountVnd);
  const finalTotalUsd = Math.round((finalTotalVnd / VND_PER_USD) * 100) / 100;
  const savingsPct = Math.round((totalDiscountVnd / subtotalVnd) * 100);

  return {
    courseCount,
    subtotalVnd,
    bundleRate,
    bundleDiscountVnd,
    voucherCode: voucher ? voucher.code : null,
    voucherRate,
    voucherDiscountVnd,
    totalDiscountVnd,
    finalTotalVnd,
    finalTotalUsd,
    savingsPct,
  };
}

export function formatMoney(amountVnd: number, currency: Currency): string {
  if (currency === 'USD') {
    const usd = amountVnd / VND_PER_USD;
    const isWhole = Math.abs(usd - Math.round(usd)) < 0.01;
    return `$${usd.toLocaleString('en-US', {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${Math.round(amountVnd).toLocaleString('vi-VN')} VNĐ`;
}
