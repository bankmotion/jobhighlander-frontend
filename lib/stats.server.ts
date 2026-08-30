import { getToken } from './auth';
import type { BidPerformance } from './stats';

/**
 * Server-only stats fetcher.
 *
 * Split from `stats.ts` for the same reason `ai-usage.server.ts` is split from
 * `ai-usage.ts`: `getToken` reads `next/headers`, and the dashboard imports the
 * formatters from `stats.ts` as values, so anything reachable from that file is
 * bundled for the browser. Do not merge these two.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Either a rolling day count or an explicit `YYYY-MM-DD` window. */
export type StatsWindow = { days: number } | { from: string; to: string };

/**
 * Team-wide bids: every bidder's applications on the profiles the caller may
 * use. Admin and super admin only — the backend enforces that, this just asks.
 */
export async function fetchTeamBidPerformance(
  window: StatsWindow = { days: 90 },
  profileId?: number,
  userId?: number,
): Promise<BidPerformance | null> {
  return get('/api/stats/bid-performance/all', window, profileId, userId);
}

export async function fetchBidPerformance(
  window: StatsWindow = { days: 90 },
  profileId?: number,
): Promise<BidPerformance | null> {
  return get('/api/stats/bid-performance', window, profileId);
}

async function get(
  path: string,
  window: StatsWindow,
  profileId?: number,
  userId?: number,
): Promise<BidPerformance | null> {
  const token = await getToken();
  if (!token) return null;
  const qs = new URLSearchParams();
  if ('days' in window) qs.set('days', String(window.days));
  else {
    qs.set('from', window.from);
    qs.set('to', window.to);
  }
  if (profileId) qs.set('profileId', String(profileId));
  if (userId) qs.set('userId', String(userId));
  try {
    const res = await fetch(`${API_URL}${path}?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as BidPerformance;
  } catch {
    return null;
  }
}
