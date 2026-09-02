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
  inputPerMTok: number;
  outputPerMTok: number;
  cacheWritePerMTok: number;
  cacheReadPerMTok: number;
}

export interface UsageSummary {
  from: string;
  to: string;
  days: number;
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

export const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

export function usageQuery(
  days: number,
  filter: UsageFilter,
  extra: Record<string, number | string> = {},
): string {
  const q = new URLSearchParams({ days: String(days) });
  if (filter.userId != null) q.set('userId', String(filter.userId));
  if (filter.profileId != null) q.set('profileId', String(filter.profileId));
  for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
  return q.toString();
}

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
