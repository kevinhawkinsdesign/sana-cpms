'use client';

/**
 * Kabisa Console UI primitives (FE-1 / KAB-106).
 * Faithful TypeScript port of design/mockup/02-ui-primitives.js — keep visual
 * parity with the mockup; consult that file before changing styles here.
 * Icons come from lucide-react (the stroke grid the mockup imitated); the
 * Icon wrapper keeps the mockup's name-based API. `station` stays a custom
 * path — lucide has no EV-charging-station glyph.
 *
 * Styled with TailAdmin's Tailwind CSS design system.
 */
import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Bell,
  Building2,
  Calendar,
  CalendarPlus,
  CalendarX,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudDownload,
  DollarSign,
  Download,
  Eraser,
  FileText,
  Filter,
  Globe,
  GitCompare,
  House,
  Key,
  LockOpen,
  LogOut,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  PanelLeft,
  Play,
  Plus,
  Power,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Star,
  Tag,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  Users,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

/* ---------- Icons ---------- */
const LUCIDE_ICONS = {
  home: House,
  bolt: Zap,
  tariff: DollarSign,
  money: Banknote,
  people: Users,
  shield: ShieldCheck,
  settings: Settings,
  user: User,
  monitor: Monitor,
  search: Search,
  bell: Bell,
  chevD: ChevronDown,
  chevL: ChevronLeft,
  chevR: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  arrowL: ArrowLeft,
  arrowUR: ArrowUpRight,
  plus: Plus,
  dots: MoreHorizontal,
  filter: Filter,
  download: Download,
  alert: TriangleAlert,
  check: Check,
  x: X,
  stop: Square,
  sidebar: PanelLeft,
  clock: Clock,
  car: Car,
  doc: FileText,
  refresh: RefreshCw,
  wrench: Wrench,
  globe: Globe,
  logout: LogOut,
  key: Key,
  building: Building2,
  // Tags & charger operations
  tag: Tag,
  play: Play,
  power: Power,
  sliders: SlidersHorizontal,
  message: MessageSquare,
  transfer: ArrowLeftRight,
  upload: Upload,
  unlock: LockOpen,
  eraser: Eraser,
  calendar: Calendar,
  calendarPlus: CalendarPlus,
  calendarX: CalendarX,
  cloudDownload: CloudDownload,
  trash: Trash2,
  gitCompare: GitCompare,
  star: Star,
} as const satisfies Record<string, LucideIcon>;

/** EV charging station — no lucide equivalent; ported from the mockup. */
const STATION_PATH =
  'M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3.5 21h13M16 8h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 1 0 3 0V9l-2.5-2.5M8.5 7h4M10.5 11l-2 3.5h4l-2 3.5';

export type IconName = keyof typeof LUCIDE_ICONS | 'station';

export function Icon({
  name,
  size = 16,
  stroke = 1.5,
  style,
}: Readonly<{
  name: IconName;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
}>) {
  if (name === 'station') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, ...style }}
      >
        <path d={STATION_PATH} />
      </svg>
    );
  }
  const Cmp = LUCIDE_ICONS[name] ?? MoreHorizontal;
  return <Cmp size={size} strokeWidth={stroke} style={{ flexShrink: 0, ...style }} />;
}

/* ---------- Badges ---------- */
export type BadgeKind = 'ok' | 'warn' | 'err' | 'info' | 'charge' | 'neutral';

// Soft-tint status chips (mockup): pale background + saturated text + a solid
// colored dot. Dark mode uses a translucent tint of the same hue.
const BADGE_CLASSES: Record<BadgeKind, { badge: string; dot: string }> = {
  ok: {
    badge: 'bg-[#e8f6ee] text-[#1f7a45] dark:bg-[#1f7a45]/15 dark:text-[#5fd08a]',
    dot: 'bg-[#23a35a]',
  },
  warn: {
    badge: 'bg-[#fff6cc] text-[#8a6f00] dark:bg-[#e0a800]/15 dark:text-[#f0c544]',
    dot: 'bg-[#e0a800]',
  },
  err: {
    badge: 'bg-[#fdece8] text-[#c0392b] dark:bg-[#e0533d]/15 dark:text-[#f0998a]',
    dot: 'bg-[#e0533d]',
  },
  info: {
    badge: 'bg-[#eaf0fa] text-[#1f4f8f] dark:bg-[#4561de]/15 dark:text-[#9fb3ee]',
    dot: 'bg-[#1f4f8f] dark:bg-[#9fb3ee]',
  },
  charge: {
    badge: 'bg-[#fff6cc] text-[#8a6f00] dark:bg-[#e0a800]/15 dark:text-[#f0c544]',
    dot: 'bg-[#e0a800]',
  },
  neutral: {
    badge: 'bg-[#eef1f6] text-[#566882] dark:bg-white/10 dark:text-white/70',
    dot: 'bg-[#8696ac]',
  },
};

export function Badge({
  kind = 'neutral',
  children,
  dot,
  pulse,
}: Readonly<{
  kind?: BadgeKind;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
}>) {
  const k = BADGE_CLASSES[kind] ?? BADGE_CLASSES.neutral;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        k.badge,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            k.dot,
            pulse && 'kc-pulse',
          )}
        />
      )}
      {children}
    </span>
  );
}

/** Status string -> badge kind + label. Covers station, connector, EBM, payout,
 *  tariff, team and fault states (mirrors the mockup map). */
const STATUS_BADGE: Record<string, [BadgeKind, string]> = {
  operational: ['ok', 'Operational'],
  degraded: ['warn', 'Degraded'],
  maintenance: ['warn', 'Maintenance'],
  installing: ['info', 'Installing'],
  online: ['ok', 'Online'],
  offline: ['neutral', 'Offline'],
  fault: ['err', 'Fault'],
  Available: ['ok', 'Available'],
  Charging: ['charge', 'Charging'],
  Preparing: ['info', 'Preparing'],
  Faulted: ['err', 'Faulted'],
  Unavailable: ['neutral', 'Unavailable'],
  Offline: ['neutral', 'Offline'],
  issued: ['ok', 'Issued'],
  failed: ['err', 'Failed'],
  missing: ['warn', 'Missing'],
  pending: ['info', 'Pending'],
  paid: ['ok', 'Paid'],
  accruing: ['info', 'Accruing'],
  active: ['ok', 'Active'],
  draft: ['neutral', 'Draft'],
  invited: ['info', 'Invited'],
  open: ['err', 'Open'],
  resolved: ['ok', 'Resolved'],
  critical: ['err', 'Critical'],
  warning: ['warn', 'Warning'],
};

export function StatusBadge({ status, pulse }: Readonly<{ status: string; pulse?: boolean }>) {
  const [kind, label] = STATUS_BADGE[status] ?? (['neutral', status] as [BadgeKind, string]);
  return (
    <Badge kind={kind} dot pulse={pulse || status === 'Charging'}>
      {label}
    </Badge>
  );
}

/* ---------- Buttons ---------- */

const BTN_VARIANT_CLASSES = {
  default:
    'bg-white text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]',
  // Primary action = Signal Teal on ink text (mockup CTA: Export / Add).
  primary:
    'bg-[#00C2A8] text-[#0C1B18] shadow-sm hover:bg-[#00a58f] border-transparent',
  // Ink secondary action (mockup: Reboot / Configure).
  secondary:
    'bg-[#0C1B18] text-white shadow-sm hover:bg-[#08130f] border-transparent',
  ghost:
    'text-gray-700 hover:bg-gray-100 border-transparent shadow-none dark:text-gray-300 dark:hover:bg-white/5',
  danger:
    'bg-[#e0533d] text-white shadow-sm hover:bg-[#c8442f] border-transparent',
} as const;

const BTN_SIZE_CLASSES = {
  xs: 'px-3 py-1.5 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-sm',
} as const;

export function Btn({
  variant = 'default',
  size = 'sm',
  icon,
  children,
  onClick,
  type = 'button',
  disabled,
  loading,
  style,
}: Readonly<{
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  icon?: IconName;
  children?: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  style?: CSSProperties;
}>) {
  const inactive = disabled || loading;
  return (
    <button
      type={type}
      disabled={inactive}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:scale-[0.98]',
        BTN_SIZE_CLASSES[size],
        BTN_VARIANT_CLASSES[variant],
        (variant === 'primary' || variant === 'secondary') && 'font-semibold',
        inactive && 'cursor-not-allowed opacity-50',
        !inactive && 'cursor-pointer',
      )}
      style={style}
      onClick={onClick}
    >
      {loading ? (
        <Spinner size={size === 'xs' ? 12 : 14} />
      ) : (
        icon && <Icon name={icon} size={size === 'xs' ? 12 : 14} />
      )}
      {children}
    </button>
  );
}

function Spinner({ size = 14 }: Readonly<{ size?: number }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Layout helpers ---------- */
export function Card({
  title,
  action,
  children,
  pad = true,
  style,
  className = '',
}: Readonly<{
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  pad?: boolean;
  style?: CSSProperties;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-[#e6ebf2] bg-white shadow-sm dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.4)] dark:bg-[#1A1A1A] dark:border-[#2A2A2A]',
        className,
      )}
      style={style}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-gray-100/50 px-6 py-5 dark:border-white/5">
          <div className="text-base font-medium text-gray-800 dark:text-white/90">{title}</div>
          {action}
        </div>
      )}
      <div className={cn(pad && 'p-5 sm:p-6')}>{children}</div>
    </div>
  );
}

/** Bible "wow moment": stat values count up 0->value over 600ms ease-out on
 *  first load only (rAF, interruptible, honors prefers-reduced-motion).
 *  Live updates after mount render instantly -- remount with a key to replay. */
export function CountUp({
  value,
  format = (v: number) => Math.round(v).toLocaleString('en-US'),
  duration = 600,
}: Readonly<{ value: number; format?: (v: number) => string; duration?: number }>) {
  const [display, setDisplay] = useState(() =>
    globalThis.window !== undefined && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0,
  );
  const done = useRef(false);
  useEffect(() => {
    if (done.current) {
      setDisplay(value);
      return;
    }
    done.current = true;
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="[font-variant-numeric:tabular-nums]">{format(display)}</span>;
}

const DELTA_CLASSES = {
  ok: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  err: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  neutral: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
} as const;

export function Stat({
  label,
  value,
  sub,
  delta,
  deltaKind = 'ok',
  spark,
  icon,
}: Readonly<{
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: ReactNode;
  deltaKind?: 'ok' | 'err' | 'neutral';
  spark?: ReactNode;
  /** Optional leading icon (rendered in a tinted circle, left of the label). */
  icon?: ReactNode;
}>) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[10px] border border-[#e6ebf2] bg-white p-5 shadow-sm md:p-6 dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-300">
            {icon}
          </span>
        )}
        <div className="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-2xl font-bold tracking-tight text-gray-800 [font-variant-numeric:tabular-nums] dark:text-white/90">
            {value}
          </span>
          {sub && (
            <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">{sub}</span>
          )}
        </div>
        {spark}
      </div>
      {delta && (
        <div
          className={cn(
            'mt-1 inline-flex w-fit items-center gap-1 rounded-full py-0.5 pl-2 pr-2.5 text-sm font-medium',
            DELTA_CLASSES[deltaKind],
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

export interface SummaryItem {
  label: ReactNode;
  value: ReactNode;
  /** optional small trailing delta/qualifier (e.g. "+12%", "live") */
  delta?: ReactNode;
  deltaKind?: 'ok' | 'err' | 'info' | 'neutral';
  /** When set, the cell is a drill-in: hover highlight + pointer + button semantics. */
  onClick?: () => void;
}

const SUMMARY_DELTA_COLOR: Record<NonNullable<SummaryItem['deltaKind']>, string> = {
  ok: 'text-[#1f7a45] dark:text-[#5fd08a]',
  err: 'text-[#c0392b] dark:text-[#f0998a]',
  info: 'text-[#1f4f8f] dark:text-[#9fb3ee]',
  neutral: 'text-[#8696ac]',
};

/**
 * Slim inline summary strip — replaces the vanity KPI tile grid (mockup:
 * "no vanity tiles"). One white card; cells split by a hairline divider; each
 * cell is a muted label over a bold value with an optional colored delta.
 * Collapses to a 2-col grid on narrow screens.
 */
export function SummaryStrip({ items }: Readonly<{ items: SummaryItem[] }>) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-[#e6ebf2] bg-white sm:flex sm:items-stretch dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
      {items.map((s, i) => {
        const Cell = s.onClick ? 'button' : 'div';
        return (
        <Cell
          key={typeof s.label === 'string' ? s.label : i}
          {...(s.onClick && { type: 'button' as const, onClick: s.onClick })}
          className={cn(
            'flex flex-1 flex-col gap-1 px-5 py-3.5',
            'border-[#eef1f6] dark:border-[#242424]',
            // hairline dividers between cells (not before the first in each row)
            i % 2 !== 0 && 'border-l',
            'sm:border-l sm:first:border-l-0',
            i >= 2 && 'border-t sm:border-t-0',
            s.onClick && 'cursor-pointer text-left transition-colors hover:bg-[#f7f9fc] dark:hover:bg-white/[.04]',
          )}
        >
          <span className="text-[11.5px] font-medium text-[#8696ac]">{s.label}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[19px] font-bold tracking-tight text-[#101d31] [font-variant-numeric:tabular-nums] dark:text-white/90">
              {s.value}
            </span>
            {s.delta != null && s.delta !== '' && (
              <span
                className={cn(
                  'text-[11px] font-bold',
                  SUMMARY_DELTA_COLOR[s.deltaKind ?? 'neutral'],
                )}
              >
                {s.delta}
              </span>
            )}
          </div>
        </Cell>
        );
      })}
    </div>
  );
}

export type TabDef = string | { id: string; label: string; count?: number | null };

export function Tabs({
  tabs,
  value,
  onChange,
  style,
}: Readonly<{
  tabs: TabDef[];
  value: string;
  onChange: (id: string) => void;
  style?: CSSProperties;
}>) {
  return (
    <div
      className="flex border-b border-gray-200 dark:border-gray-800"
      style={style}
    >
      {tabs.map((t) => {
        const id = typeof t === 'string' ? t : t.id;
        const label = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'object' ? t.count : null;
        const on = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              '-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-4 py-2.5 text-sm font-medium transition-colors',
              on
                ? 'border-[#0B4F42] text-[#0B4F42]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {label}
            {count != null && (
              <span
                className={cn(
                  'ml-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  on
                    ? 'bg-[#0B4F42] text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({
  placeholder = 'Search\u2026',
  value,
  onChange,
  style,
}: Readonly<{
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  style?: CSSProperties;
}>) {
  return (
    <div className="relative" style={style}>
      <span className="absolute left-3 top-1/2 flex -translate-y-1/2 text-gray-400">
        <Icon name="search" size={13} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-10 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#0B4F42] focus:ring-3 focus:ring-[#0B4F42]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90 dark:placeholder:text-white/30"
      />
    </div>
  );
}

export function Select({
  options,
  value,
  onChange,
  style,
}: Readonly<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
  style?: CSSProperties;
}>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-transparent bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#0B4F42] focus:ring-3 focus:ring-[#0B4F42]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90 dark:placeholder:text-white/30"
      style={style}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Avatar({ name, size = 26 }: Readonly<{ name: string; size?: number }>) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[7px] bg-[#f1f4f8] font-semibold text-[#5a6b82] dark:bg-gray-800 dark:text-gray-300"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </span>
  );
}

export function PageHead({
  title,
  sub,
  actions,
  back,
  onBack,
  crumb,
}: Readonly<{
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: boolean;
  onBack?: () => void;
  crumb?: ReactNode;
}>) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {crumb &&
          (onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-1 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-xs text-gray-500 dark:text-gray-400"
            >
              {back && <Icon name="arrowL" size={12} />}
              {crumb}
            </button>
          ) : (
            <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              {back && <Icon name="arrowL" size={12} />}
              {crumb}
            </div>
          ))}
        <h1 className="m-0 flex items-center gap-2.5 text-xl font-semibold tracking-tight text-gray-800 dark:text-white/90">
          {title}
        </h1>
        {sub && (
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{sub}</div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/* ---------- TableCard — data table wrapper with search, show entries, pagination ---------- */

const SHOW_OPTIONS = [10, 25, 50, 100] as const;

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalItems: number;
  pageSize: number;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  // Build visible page numbers: always show first, last, current ±1
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const btnBase =
    'flex h-8 min-w-8 items-center justify-center rounded-lg border text-sm font-medium transition';
  const btnInactive =
    'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#1A1A1A] dark:border dark:border-[#2A2A2A] dark:text-gray-300 dark:hover:bg-white/5';
  const btnActive =
    'border-[#0B4F42] bg-[#0B4F42] text-white dark:border-[#00C2A8] dark:bg-[#00C2A8]';
  const btnDisabled = 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed dark:border-gray-800 dark:bg-black dark:text-gray-600';

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:px-6 dark:border-white/5">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-800 dark:text-white/90">{from}</span> to{' '}
        <span className="font-medium text-gray-800 dark:text-white/90">{to}</span> of{' '}
        <span className="font-medium text-gray-800 dark:text-white/90">{totalItems}</span> entries
      </span>
      <div className="flex items-center gap-1">
        <button
          className={cn(btnBase, page <= 1 ? btnDisabled : btnInactive)}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-1 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={p}
              className={cn(btnBase, 'px-2.5', p === page ? btnActive : btnInactive)}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          className={cn(btnBase, page >= totalPages ? btnDisabled : btnInactive)}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}

export function TableCard({
  title,
  children,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  showValue,
  onShowChange,
  action,
  totalLabel,
  page,
  totalPages,
  totalItems,
  onPageChange,
}: Readonly<{
  title: string;
  children: ReactNode;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: () => void;
  showValue?: number;
  onShowChange?: (v: number) => void;
  action?: ReactNode;
  totalLabel?: string;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (p: number) => void;
}>) {
  return (
    <div className="rounded-[10px] border border-[#e6ebf2] bg-white shadow-sm dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.4)] dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
          {totalLabel && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {totalLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onSearchChange && (
            <div className="relative">
              <Icon name="search" size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#98a2b3' }} />
              <input
                type="text"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && onSearchSubmit) { e.preventDefault(); onSearchSubmit(); } }}
                placeholder="Search…"
                className="h-10 w-48 rounded-lg border border-gray-300 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-[#0B4F42] focus:ring-3 focus:ring-[#0B4F42]/10 focus:outline-none dark:border-gray-700 dark:bg-black dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
          )}
          {onShowChange && (totalItems ?? 0) > SHOW_OPTIONS[0] && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Show</span>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-gray-300 dark:hover:border-gray-600"
                  >
                    {showValue ?? 10}
                    <Icon name="chevD" size={14} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="kc-fadeup z-50 min-w-[80px] rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-[#2A2A2A] dark:bg-[#1A1A1A]"
                >
                  {SHOW_OPTIONS.map((n) => (
                    <DropdownMenu.Item
                      key={n}
                      onSelect={() => onShowChange(n)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm outline-none transition-colors',
                        n === (showValue ?? 10)
                          ? 'bg-brand-500 font-medium text-white'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5',
                      )}
                    >
                      {n === (showValue ?? 10) && <Icon name="check" size={13} />}
                      {n !== (showValue ?? 10) && <span className="w-[13px]" />}
                      {n}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
              <span>entries</span>
            </div>
          )}
          {action}
        </div>
      </div>
      <div className="w-full overflow-x-auto">{children}</div>
      {onPageChange && page != null && totalPages != null && totalItems != null && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={showValue ?? 10}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

/**
 * Props for a fully clickable table row (KAB UX). Spread onto a `<tr>` so the
 * whole row navigates on click — keyboard-accessible (role=link + Enter/Space)
 * so it isn't a non-interactive element with a bare click handler. Clicks that
 * originate on a real control inside the row (button/input/a) are ignored so
 * those still work. Navigate via router.push (the top-loading bar picks it up).
 */
/** Navigate with the blue top progress bar. nextjs-toploader auto-catches
 *  <a>/<Link> clicks (sidebar) but NOT programmatic router.push — so clickable
 *  rows showed no bar. Start it manually here; the loader auto-finishes on the
 *  pathname change after the route resolves. */
export function useConsoleNav() {
  const router = useRouter();
  const loader = useTopLoader();
  return (href: string) => {
    loader.start();
    router.push(href);
  };
}

export function rowNav(navigate: () => void) {
  return {
    role: 'link' as const,
    tabIndex: 0,
    className: 'kc-row-clickable',
    onClick: (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, a, input, select, [role="button"]')) return;
      navigate();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate();
      }
    },
  };
}
