import type { Currency, Locale, ThemeMode, WorkspaceTab } from '../types/lms';
import { tCopy } from '../data/i18n';
import type { LevelProgress } from '../engines/progression';
import {
  AwardIcon,
  BoltIcon,
  BookIcon,
  CartIcon,
  CpuIcon,
  LayersIcon,
  MoonIcon,
  SolarisMark,
  SunIcon,
  TerminalIcon,
} from './Icons';

interface HeaderProps {
  locale: Locale;
  currency: Currency;
  theme: ThemeMode;
  activeTab: WorkspaceTab;
  cartCount: number;
  dueCardsCount: number;
  levelProgress: LevelProgress;
  onSelectTab: (tab: WorkspaceTab) => void;
  onToggleLocale: () => void;
  onToggleCurrency: () => void;
  onToggleTheme: () => void;
}

export function Header({
  locale,
  currency,
  theme,
  activeTab,
  cartCount,
  dueCardsCount,
  levelProgress,
  onSelectTab,
  onToggleLocale,
  onToggleCurrency,
  onToggleTheme,
}: HeaderProps) {
  const copy = tCopy(locale);

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    shortLabel: string;
    icon: typeof BookIcon;
    badge?: number;
    badgeTone?: 'blue' | 'amber';
  }> = [
    {
      id: 'catalog',
      label: copy.tabs.catalog,
      shortLabel: locale === 'vi' ? 'Khóa' : 'Tracks',
      icon: BookIcon,
    },
    {
      id: 'algorithms',
      label: copy.tabs.algorithms,
      shortLabel: locale === 'vi' ? 'Algos' : 'Algos',
      icon: CpuIcon,
    },
    {
      id: 'sandbox',
      label: copy.tabs.sandbox,
      shortLabel: 'Lab',
      icon: TerminalIcon,
    },
    {
      id: 'flashcards',
      label: copy.tabs.flashcards,
      shortLabel: 'SM-2',
      icon: LayersIcon,
      badge: dueCardsCount > 0 ? dueCardsCount : undefined,
      badgeTone: 'amber',
    },
    {
      id: 'certificate',
      label: copy.tabs.certificate,
      shortLabel: locale === 'vi' ? 'Bằng' : 'Cert',
      icon: AwardIcon,
    },
    {
      id: 'checkout',
      label: copy.tabs.checkout,
      shortLabel: locale === 'vi' ? 'Giỏ' : 'Cart',
      icon: CartIcon,
      badge: cartCount > 0 ? cartCount : undefined,
      badgeTone: 'blue',
    },
  ];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[var(--sol-border)] bg-[var(--sol-surface)]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 px-4 py-3 sm:px-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onSelectTab('catalog')}
          className="group flex min-w-0 items-center gap-2.5 text-left focus:outline-none"
        >
          <SolarisMark className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover:scale-105" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-editorial truncate text-base font-bold tracking-tight text-[var(--sol-text)] sm:text-lg">
                Solaris Academy
              </span>
              <span className="hidden rounded border border-blue-700/30 bg-blue-700/10 px-1.5 py-0.5 font-code text-[10px] font-semibold tracking-wider text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300 sm:inline-block">
                v2.0
              </span>
            </div>
            <p className="hidden truncate font-code text-[11px] text-[var(--sol-text-muted)] sm:block">
              {copy.brandSub}
            </p>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav
          aria-label="Workspace navigation"
          className="hidden items-center gap-1 rounded-xl border border-[var(--sol-border)] bg-[var(--sol-bg)] p-1 lg:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-tab={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/25 dark:bg-blue-600'
                    : 'text-[var(--sol-text-secondary)] hover:bg-[var(--sol-surface)] hover:text-[var(--sol-text)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-code text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : item.badgeTone === 'amber'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-700/12 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg border border-[var(--sol-border)] bg-[var(--sol-bg)] px-2.5 py-1.5 font-code text-[11px] font-semibold text-[var(--sol-text-secondary)] xl:flex">
            <BoltIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>LV.{levelProgress.level}</span>
            <span className="text-[var(--sol-text-muted)]">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">{levelProgress.currentXp} XP</span>
          </div>

          <button
            type="button"
            onClick={onToggleLocale}
            aria-label="Switch language"
            data-testid="toggle-locale"
            className="rounded-lg border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-2.5 py-1.5 font-code text-[11px] font-bold text-[var(--sol-text)] transition-colors hover:border-blue-700/60 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {locale === 'en' ? 'EN / VI' : 'VI / EN'}
          </button>

          <button
            type="button"
            onClick={onToggleCurrency}
            aria-label="Switch currency"
            data-testid="toggle-currency"
            className="rounded-lg border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] px-2.5 py-1.5 font-code text-[11px] font-bold text-[var(--sol-text)] transition-colors hover:border-emerald-600/60 hover:text-emerald-600 dark:hover:text-emerald-300"
          >
            {currency === 'VND' ? 'VNĐ' : 'USD'}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to daylight Oxford theme' : 'Switch to dark theme'}
            data-testid="toggle-theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sol-border-strong)] bg-[var(--sol-surface)] text-[var(--sol-text)] transition-colors hover:border-blue-700/60 hover:text-blue-700 dark:hover:text-amber-400"
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar (6 tabs fit 390px cleanly) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="grid grid-cols-6 gap-1 border-t border-[var(--sol-border)] bg-[var(--sol-surface)] px-1.5 py-1.5 lg:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-mobile-tab={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-semibold transition-all ${
                active
                  ? 'bg-blue-700 text-white shadow-sm dark:bg-blue-600'
                  : 'text-[var(--sol-text-secondary)] hover:bg-[var(--sol-elevated)]'
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {item.badge !== undefined && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-1 font-code text-[9px] font-bold text-slate-950">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="max-w-full truncate">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
