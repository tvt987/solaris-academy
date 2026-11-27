import { useMemo, useState } from 'react';
import type { Course, Currency, LearnerState, Locale } from '../types/lms';
import { tCopy } from '../data/i18n';
import { calculateCartPricing, formatMoney, validateVoucher } from '../engines/pricing';
import {
  buildOrderCsvBom,
  buildVietQrPayload,
  sanitizeVietQrMemo,
  TECHCOMBANK_CONFIG,
} from '../engines/vietqr';
import { buildQrSvgPath } from '../engines/certificate';
import {
  CartIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  ShieldCheckIcon,
  TrashIcon,
} from './Icons';

interface CheckoutSectionProps {
  courses: Course[];
  locale: Locale;
  currency: Currency;
  learner: LearnerState;
  onSetCart: (courseIds: string[]) => void;
  onToggleCart: (courseId: string) => void;
  onCompleteEnrollment: (courseIds: string[]) => void;
  onNotify: (message: string) => void;
}

export function CheckoutSection({
  courses,
  locale,
  currency,
  learner,
  onSetCart,
  onToggleCart,
  onCompleteEnrollment,
  onNotify,
}: CheckoutSectionProps) {
  const copy = tCopy(locale);
  const [voucherInput, setVoucherInput] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<string>('');
  const [voucherError, setVoucherError] = useState<boolean>(false);
  const [enrollmentConfirmed, setEnrollmentConfirmed] = useState<boolean>(false);

  const cartCourses = useMemo(() => {
    const idSet = new Set(learner.cartCourseIds);
    return courses.filter((c) => idSet.has(c.id));
  }, [courses, learner.cartCourseIds]);

  const remainingCourses = useMemo(() => {
    const idSet = new Set(learner.cartCourseIds);
    return courses.filter((c) => !idSet.has(c.id));
  }, [courses, learner.cartCourseIds]);

  const pricing = useMemo(
    () => calculateCartPricing(cartCourses, appliedVoucher),
    [cartCourses, appliedVoucher],
  );

  const orderCode = useMemo(() => {
    const codes = cartCourses.map((c) => c.code).slice(0, 3).join('');
    return `SOL-${codes || 'DEMO'}-2026`;
  }, [cartCourses]);

  const transferMemo = useMemo(() => {
    const trackCodes = cartCourses.map((c) => c.code).join(' ');
    return sanitizeVietQrMemo(`SOLARIS ${trackCodes || 'FELLOWSHIP'} ${learner.studentName.split(' ').pop() ?? ''}`);
  }, [cartCourses, learner.studentName]);

  const vietQrPayload = useMemo(
    () => buildVietQrPayload(pricing.finalTotalVnd, transferMemo),
    [pricing.finalTotalVnd, transferMemo],
  );

  const vietQrSvg = useMemo(() => buildQrSvgPath(vietQrPayload), [vietQrPayload]);

  const handleApplyVoucher = (codeOverride?: string) => {
    const raw = (codeOverride ?? voucherInput).trim().toUpperCase();
    if (!raw) {
      setAppliedVoucher('');
      setVoucherError(false);
      return;
    }
    const found = validateVoucher(raw);
    if (!found) {
      setVoucherError(true);
      setAppliedVoucher('');
      return;
    }
    setVoucherInput(found.code);
    setAppliedVoucher(found.code);
    setVoucherError(false);
    onNotify(
      locale === 'vi'
        ? `Đã áp dụng mã ${found.code} (-${Math.round(found.discountRate * 100)}%)`
        : `Applied voucher ${found.code} (-${Math.round(found.discountRate * 100)}%)`,
    );
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(locale === 'vi' ? `Đã chép ${label}` : `Copied ${label}`);
    } catch {
      onNotify(text);
    }
  };

  const handleExportReceiptCsv = () => {
    if (cartCourses.length === 0) return;
    const csv = buildOrderCsvBom(
      cartCourses,
      orderCode,
      pricing.finalTotalVnd,
      pricing.voucherCode,
      locale,
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${orderCode.toLowerCase()}-receipt.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotify(
      locale === 'vi'
        ? `Đã xuất hóa đơn ${orderCode}.csv (UTF-8 BOM)`
        : `Exported receipt ${orderCode}.csv (UTF-8 BOM)`,
    );
  };

  const handleConfirmEnrollment = () => {
    if (cartCourses.length === 0) return;
    onCompleteEnrollment(cartCourses.map((c) => c.id));
    setEnrollmentConfirmed(true);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div>
        <span className="font-code text-xs font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
          {copy.checkout.sectionLabel}
        </span>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--sol-text)] sm:text-3xl">
          {copy.checkout.sectionTitle}
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm text-[var(--sol-text-secondary)]">
          {copy.checkout.sectionDesc}
        </p>
      </div>

      {/* 1-Click Fellowship Bundles */}
      <div className="sol-card mt-6 rounded-2xl p-4 sm:p-5">
        <div className="font-code text-[11px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
          {copy.checkout.quickBundleTitle}
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <button
            type="button"
            data-testid="bundle-trio-btn"
            onClick={() => {
              onSetCart(['dotnet-10', 'react-19', 'applied-rag']);
              setEnrollmentConfirmed(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white dark:text-indigo-300 dark:hover:text-white"
          >
            <span>{copy.checkout.bundleTrio}</span>
          </button>

          <button
            type="button"
            data-testid="bundle-all-btn"
            onClick={() => {
              onSetCart(courses.map((c) => c.id));
              setEnrollmentConfirmed(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white dark:text-emerald-300 dark:hover:text-white"
          >
            <span>{copy.checkout.bundleAll}</span>
          </button>
        </div>
      </div>

      {enrollmentConfirmed && (
        <div
          data-testid="enrollment-confirmed-banner"
          className="mt-5 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/12 p-4 text-sm font-bold text-emerald-800 dark:text-emerald-200"
        >
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{copy.checkout.enrollmentDone}</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Cart Items & Voucher Breakdown */}
        <div className="space-y-5 lg:col-span-7">
          <div className="sol-card rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-[var(--sol-border)] pb-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--sol-text)]">
                <CartIcon className="h-4 w-4 text-indigo-500" />
                <span>
                  {copy.checkout.cartHeading} ({cartCourses.length})
                </span>
              </h3>
              {pricing.bundleRate > 0 && (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/12 px-2.5 py-0.5 font-code text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  -{Math.round(pricing.bundleRate * 100)}% BUNDLE TIER
                </span>
              )}
            </div>

            {cartCourses.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--sol-text-muted)]">
                {copy.checkout.emptyCart}
              </div>
            ) : (
              <div className="mt-3 divide-y divide-[var(--sol-border)]">
                {cartCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 font-code text-[10px] font-bold text-white"
                          style={{ backgroundColor: course.accentHex }}
                        >
                          {course.code}
                        </span>
                        <span className="truncate text-sm font-bold text-[var(--sol-text)]">
                          {course.title[locale]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--sol-text-muted)]">
                        {course.durationHours}h · {course.skills.slice(0, 3).join(' · ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-code text-sm font-bold text-[var(--sol-text)]">
                        {formatMoney(course.priceVnd, currency)}
                      </span>
                      <button
                        type="button"
                        aria-label={`${copy.checkout.remove} ${course.title[locale]}`}
                        onClick={() => onToggleCart(course.id)}
                        className="rounded-lg border border-[var(--sol-border)] p-1.5 text-[var(--sol-text-muted)] transition-colors hover:border-rose-500/50 hover:text-rose-500"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Remaining Courses */}
            {remainingCourses.length > 0 && (
              <div className="mt-4 border-t border-[var(--sol-border)] pt-4">
                <div className="font-code text-[10px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]">
                  {copy.checkout.addCourseQuick}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {remainingCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => {
                        onToggleCart(course.id);
                        setEnrollmentConfirmed(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--sol-text)] transition-colors hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300"
                    >
                      <span className="font-code text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        +{course.code}
                      </span>
                      <span>{course.title[locale]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voucher & Tuition Breakdown */}
          <div className="sol-card rounded-2xl p-5">
            <label
              htmlFor="voucher-code-input"
              className="block font-code text-[11px] font-bold uppercase tracking-wider text-[var(--sol-text-muted)]"
            >
              {copy.checkout.voucherLabel}
            </label>

            <div className="mt-2 flex gap-2">
              <input
                id="voucher-code-input"
                data-testid="voucher-input"
                type="text"
                value={voucherInput}
                onChange={(e) => {
                  setVoucherInput(e.target.value);
                  setVoucherError(false);
                }}
                placeholder={copy.checkout.voucherPlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-elevated)] px-3.5 py-2.5 font-code text-xs uppercase text-[var(--sol-text)] placeholder:normal-case placeholder:text-[var(--sol-text-muted)] focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                data-testid="apply-voucher-btn"
                onClick={() => handleApplyVoucher()}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
              >
                {copy.checkout.applyVoucher}
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="chip-solaris20"
                onClick={() => handleApplyVoucher('SOLARIS20')}
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-code text-[11px] font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
              >
                SOLARIS20 (-20%)
              </button>
              <button
                type="button"
                onClick={() => handleApplyVoucher('ARCHITECT10')}
                className="rounded-md border border-indigo-500/35 bg-indigo-500/10 px-2.5 py-1 font-code text-[11px] font-bold text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
              >
                ARCHITECT10 (-10%)
              </button>
              {pricing.voucherCode && (
                <span
                  data-testid="voucher-applied-badge"
                  className="inline-flex items-center gap-1 font-code text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  {copy.checkout.voucherApplied}: {pricing.voucherCode}
                </span>
              )}
            </div>

            {voucherError && (
              <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {copy.checkout.voucherInvalid}
              </p>
            )}

            {/* Pricing Ledger */}
            <div className="mt-5 space-y-2.5 border-t border-[var(--sol-border)] pt-4 text-sm">
              <div className="flex justify-between text-[var(--sol-text-secondary)]">
                <span>{copy.checkout.subtotal}</span>
                <span className="font-code font-semibold">
                  {formatMoney(pricing.subtotalVnd, currency)}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>
                  {copy.checkout.bundleDiscount} ({Math.round(pricing.bundleRate * 100)}%)
                </span>
                <span className="font-code font-semibold">
                  -{formatMoney(pricing.bundleDiscountVnd, currency)}
                </span>
              </div>

              <div className="flex justify-between text-amber-700 dark:text-amber-400">
                <span>
                  {copy.checkout.voucherDiscount}{' '}
                  {pricing.voucherCode ? `(${pricing.voucherCode})` : ''}
                </span>
                <span className="font-code font-semibold">
                  -{formatMoney(pricing.voucherDiscountVnd, currency)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-[var(--sol-border-strong)] pt-3">
                <div>
                  <span className="text-base font-extrabold text-[var(--sol-text)]">
                    {copy.checkout.finalTotal}
                  </span>
                  {pricing.savingsPct > 0 && (
                    <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 font-code text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      SAVE {pricing.savingsPct}%
                    </span>
                  )}
                </div>
                <span
                  data-testid="checkout-final-total"
                  className="font-code text-xl font-extrabold text-indigo-600 dark:text-indigo-400"
                >
                  {formatMoney(pricing.finalTotalVnd, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Real EMVCo VietQR Techcombank Panel */}
        <div className="lg:col-span-5">
          <div className="sol-card overflow-hidden rounded-2xl">
            <div className="border-b border-[var(--sol-border)] bg-gradient-to-r from-indigo-600/15 via-emerald-500/10 to-transparent px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--sol-text)]">
                  <ShieldCheckIcon className="h-4 w-4 text-emerald-500" />
                  <span>{copy.checkout.vietQrTitle}</span>
                </h3>
                <span className="rounded bg-slate-950 px-2 py-0.5 font-code text-[10px] font-bold text-emerald-400">
                  BIN {TECHCOMBANK_CONFIG.bankBin}
                </span>
              </div>
            </div>

            <div className="p-5">
              {/* Real Vector QR Matrix */}
              <div className="mx-auto flex w-56 flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
                <svg
                  data-testid="vietqr-svg"
                  viewBox={`0 0 ${vietQrSvg.size} ${vietQrSvg.size}`}
                  className="h-44 w-44"
                  role="img"
                  aria-label={`Techcombank VietQR for ${pricing.finalTotalVnd} VND`}
                >
                  <rect width={vietQrSvg.size} height={vietQrSvg.size} fill="#ffffff" />
                  <path d={vietQrSvg.pathData} fill="#0c0f14" />
                </svg>
                <div className="mt-2 font-code text-[10px] font-bold tracking-wider text-slate-700">
                  NAPAS 247 · EMVCo CRC-16
                </div>
              </div>

              {/* Bank Metadata */}
              <div className="mt-5 space-y-2.5 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-elevated)] p-3.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sol-text-muted)]">{copy.checkout.bankLabel}</span>
                  <span className="font-bold text-[var(--sol-text)]">
                    {TECHCOMBANK_CONFIG.bankName} ({TECHCOMBANK_CONFIG.bankBin})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sol-text-muted)]">{copy.checkout.accountLabel}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-code font-bold text-[var(--sol-text)]">
                      {TECHCOMBANK_CONFIG.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyText(TECHCOMBANK_CONFIG.accountNumber, copy.checkout.accountLabel)
                      }
                      className="rounded border border-[var(--sol-border-strong)] px-1.5 py-0.5 font-code text-[10px] font-semibold text-indigo-600 hover:bg-indigo-600 hover:text-white dark:text-indigo-300"
                    >
                      <CopyIcon className="inline h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sol-text-muted)]">{copy.checkout.holderLabel}</span>
                  <span className="font-code font-bold text-[var(--sol-text)]">
                    {TECHCOMBANK_CONFIG.accountName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sol-text-muted)]">{copy.checkout.memoLabel}</span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-code font-bold text-emerald-700 dark:text-emerald-300">
                      {transferMemo}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyText(transferMemo, copy.checkout.memoLabel)}
                      className="shrink-0 rounded border border-[var(--sol-border-strong)] px-1.5 py-0.5 font-code text-[10px] font-semibold text-indigo-600 hover:bg-indigo-600 hover:text-white dark:text-indigo-300"
                    >
                      <CopyIcon className="inline h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Settlement Actions */}
              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  data-testid="confirm-enrollment-btn"
                  disabled={cartCourses.length === 0}
                  onClick={handleConfirmEnrollment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>{copy.checkout.confirmEnrollment}</span>
                </button>

                <button
                  type="button"
                  disabled={cartCourses.length === 0}
                  onClick={handleExportReceiptCsv}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-4 py-2.5 font-code text-xs font-bold text-[var(--sol-text)] transition-colors hover:border-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <DownloadIcon className="h-4 w-4" />
                  <span>{copy.checkout.exportReceiptCsv}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
