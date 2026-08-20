/**
 * Shared AI-usage types and formatters.
 *
 * DELIBERATELY FREE OF SERVER IMPORTS. The dashboard is a client component and
 * imports `usd`, `tokens` and `RANGES` as values, so everything reachable from
 * this file lands in the browser bundle too. Pulling in `getToken` (which reads
 * `next/headers`) breaks every page that touches it at build time, which is why
 * the fetchers live in `ai-usage.server.ts` instead.
 */
/** One row of a breakdown: a day, a model, a generator or a person. */
export interface UsageBucket {
  key: string;
  label: string;
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

export type UsageTotals = Omit<UsageBucket, 'key' | 'label'>;

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

/** Range options the pickers offer, shared so both pages agree. */
export const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

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
