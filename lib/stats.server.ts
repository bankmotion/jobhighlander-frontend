import { getToken } from './auth';
import type { BidPerformance } from './stats';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type StatsWindow = { days: number } | { from: string; to: string };

// Server-only fetcher. Split from `stats.ts` because `getToken` reads
// `next/headers`, and the dashboard imports the formatters from that file as
// values, so anything reachable from it is bundled for the browser.
//
// `bidder` decides whose bids are counted: undefined = the caller's own,
// 'all' = every member of the in-scope profiles, a number = that teammate.
export async function fetchBidPerformance(
  window: StatsWindow = { days: 90 },
  profileId?: number,
  bidder?: number | 'all',
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
  if (bidder) qs.set('bidder', String(bidder));

  try {
    const res = await fetch(`${API_URL}/api/stats/bid-performance?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as BidPerformance;
  } catch {
    return null;
  }
}
