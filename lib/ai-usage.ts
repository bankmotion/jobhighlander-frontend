/**
 * Shared AI-usage types and formatters.
 *
 * DELIBERATELY FREE OF SERVER IMPORTS. The dashboards are client components and
 * import `usd`, `tokens` and `RANGES` as values, so everything reachable from
 * this file lands in the browser bundle too. Pulling in `getToken` (which reads
 * `next/headers`) breaks every page that touches it at build time, which is why
 * the fetchers live in `ai-usage.server.ts` instead.
 */
/** One row of a breakdown: a day, a model, a generator, a person, a profile. */
export interface UsageBucket {
  key: string;
  label: string;
  /** Context under the label — a profile's owner, a user's role. Often absent. */
  sub?: string;
  calls: number;
  /**
   * UNCACHED input only. Total tokens sent is this plus the two cache columns —
   * on a repeat application most of the prompt is a cache read, so this number
   * looks far smaller than the prompt actually is.
   */
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
}

export type UsageTotals = Omit<UsageBucket, 'key' | 'label' | 'sub'>;

export interface RateRow {
  model: string;
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
  byModel: UsageBucket[];
  byFeature: UsageBucket[];
  /** Calls on a model with no known rate, counted as $0 — totals understate. */
  unpricedCalls: number;
  rates: RateRow[];
}

/** One entry of a filter picker on the admin view. */
export interface FilterOption {
  id: number;
  label: string;
  sub?: string;
}

/** The super-admin view: everything above, plus who and which profile. */
export interface AdminUsageSummary extends UsageSummary {
  byUser: UsageBucket[];
  byProfile: UsageBucket[];
  /** The filter the server actually applied — read this, not local state, so a
   *  failed request never leaves the heading describing a view nobody fetched. */
  scope: { userId: number | null; profileId: number | null };
  /** Menu contents, always the full unfiltered window so a choice is reversible. */
  filters: { users: FilterOption[]; profiles: FilterOption[] };
}

/** One logged call, as the drill-down table lists it. */
export interface UsageCall {
  id: number;
  at: string;
  feature: string;
  featureLabel: string;
  model: string;
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

/** The admin filter, in the one shape the page, the URL and the API agree on. */
export interface UsageFilter {
  userId: number | null;
  profileId: number | null;
}

export const NO_FILTER: UsageFilter = { userId: null, profileId: null };

/**
 * Rows per page of the call log.
 *
 * Shared because the first page is rendered on the server and every later one
 * is fetched in the browser: a mismatch would make "51-100 of 120" skip a row.
 */
export const CALL_PAGE_SIZE = 50;

/** Range options the pickers offer, shared so both pages agree. */
export const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

/**
 * Query string for an admin usage request.
 *
 * One builder for the summary, the call log and the server-side first load, so
 * the three can never disagree about what "no filter" looks like. A null id is
 * omitted entirely rather than sent as an empty parameter.
 */
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

/**
 * Format a dollar amount at a resolution that survives the number.
 *
 * A single cached generation can cost well under a cent, so a flat 2-decimal
 * format renders a real charge as "$0.00" and makes the page look broken. Small
 * amounts get four decimals; totals people actually reconcile get two.
 */
export function usd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

/** Compact token counts: 1234567 becomes 1.23M. */
export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A call's timestamp, in UTC.
 *
 * UTC and not the reader's zone, deliberately, for two reasons. The first page
 * of the call log is rendered on the SERVER and the rest in the browser, so a
 * locale- or zone-dependent format would hydrate to different text than it
 * rendered with. And every other date on this page — the range caption, the
 * daily buckets — is already a UTC day, so a local-time clock beside them would
 * put a call in a row it does not belong to.
 *
 * Hand-rolled rather than `toLocaleString`, because that reads the runtime's
 * locale: same input, different output on two machines.
 */
export function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${time}`;
}
