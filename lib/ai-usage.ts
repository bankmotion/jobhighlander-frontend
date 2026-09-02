import type { AiProvider } from './ai-providers';

export interface UsageBucket {
  key: string;
  label: string;
  sub?: string;
  calls: number;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
}

export type UsageTotals = Omit<UsageBucket, 'key' | 'label' | 'sub'>;

export interface RateRow {
  model: string;
  provider: AiProvider | null;
  providerLabel: string;
  /** The markup applied on top of list price: 1 is list, 1.2 is +20%. */
  multiplier: number;
  listInputPerMTok: number;
  listOutputPerMTok: number;
  /** What this deployment bills — list x markup. Every total is built from these. */
  inputPerMTok: number;
  outputPerMTok: number;
  cacheWritePerMTok: number;
  cacheReadPerMTok: number;
}

/** One provider's markup, as the admin screen reads and writes it. */
export interface ProviderRate {
  provider: AiProvider;
  label: string;
  model: string;
  multiplier: number;
  multiplierBp: number;
  backfilledAt: string | null;
  updatedByEmail: string | null;
  updatedAt: string | null;
}

export interface UsageSummary {
  from: string;
  to: string;
  days: number;
  /** Whether `daily` holds hourly or daily buckets, so the chart can title itself. */
  granularity: 'hour' | 'day';
  /** The range in words, for captions: "today", "the last 24 hours", "1 Sep – 8 Sep". */
  rangeLabel: string;
  totals: UsageTotals;
  daily: UsageBucket[];
  byProvider: UsageBucket[];
  byModel: UsageBucket[];
  byFeature: UsageBucket[];
  unpricedCalls: number;
  rates: RateRow[];
}

export interface FilterOption {
  id: number;
  label: string;
  sub?: string;
}

export interface AdminUsageSummary extends UsageSummary {
  byUser: UsageBucket[];
  byProfile: UsageBucket[];
  scope: { userId: number | null; profileId: number | null };
  filters: { users: FilterOption[]; profiles: FilterOption[] };
}

export interface UsageCall {
  id: number;
  at: string;
  feature: string;
  featureLabel: string;
  model: string;
  provider: AiProvider | null;
  providerLabel: string;
  multiplier: number;
  userId: number | null;
  userLabel: string;
  profileId: number | null;
  profileLabel: string | null;
  jobId: number | null;
  jobLabel: string | null;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
  priced: boolean;
}

export interface UsageCallPage {
  rows: UsageCall[];
  total: number;
  limit: number;
  offset: number;
}

export interface UsageFilter {
  userId: number | null;
  profileId: number | null;
}

export const NO_FILTER: UsageFilter = { userId: null, profileId: null };

export const CALL_PAGE_SIZE = 50;

/**
 * What range the page is showing.
 *
 * `today` and `24h` are deliberately separate. One is the calendar day so far
 * and resets at midnight UTC; the other is a rolling window that spans two
 * dates for most of the day. They answer different questions and routinely
 * disagree — at 09:00 UTC, "today" is nine hours of data and "24 hours" is
 * twenty-four — so collapsing them into one tab would be wrong either way.
 */
export type UsageRange =
  | { kind: 'preset'; preset: 'today' | '24h' }
  | { kind: 'days'; days: number }
  | { kind: 'custom'; from: string; to: string };

export const RANGES = [
  { id: 'today', label: 'Today', range: { kind: 'preset', preset: 'today' } },
  { id: '24h', label: '24 hours', range: { kind: 'preset', preset: '24h' } },
  { id: '7d', label: '7 days', range: { kind: 'days', days: 7 } },
  { id: '30d', label: '30 days', range: { kind: 'days', days: 30 } },
  { id: '90d', label: '90 days', range: { kind: 'days', days: 90 } },
  { id: '365d', label: '12 months', range: { kind: 'days', days: 365 } },
] as const satisfies readonly { id: string; label: string; range: UsageRange }[];

export const DEFAULT_RANGE: UsageRange = { kind: 'days', days: 30 };

export const isSameRange = (a: UsageRange, b: UsageRange): boolean =>
  a.kind === b.kind &&
  (a.kind === 'preset'
    ? a.preset === (b as { preset: string }).preset
    : a.kind === 'days'
      ? a.days === (b as { days: number }).days
      : a.from === (b as { from: string }).from && a.to === (b as { to: string }).to);

/** Which preset tab is lit, or null when a custom range is showing. */
export const rangeId = (range: UsageRange): string | null =>
  RANGES.find((r) => isSameRange(r.range, range))?.id ?? null;

/**
 * Only ever sends the one parameter the range actually means. The server reads
 * `preset` and `from`/`to` in preference to `days`, so sending several at once
 * would make which window you get depend on precedence rules rather than on
 * what was clicked.
 */
export function usageQuery(
  range: UsageRange,
  filter: UsageFilter,
  extra: Record<string, number | string> = {},
): string {
  const q = new URLSearchParams();
  if (range.kind === 'days') q.set('days', String(range.days));
  else if (range.kind === 'preset') q.set('preset', range.preset);
  else {
    q.set('from', range.from);
    q.set('to', range.to);
  }
  if (filter.userId != null) q.set('userId', String(filter.userId));
  if (filter.profileId != null) q.set('profileId', String(filter.profileId));
  for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
  return q.toString();
}

export const dateInputValue = (d: Date): string => d.toISOString().slice(0, 10);

export function usd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${time}`;
}
