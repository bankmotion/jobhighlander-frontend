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

export async function fetchBidPerformance(
  days = 90,
  profileId?: number,
): Promise<BidPerformance | null> {
  const token = await getToken();
  if (!token) return null;
  const qs = new URLSearchParams({ days: String(days) });
  if (profileId) qs.set('profileId', String(profileId));
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
