import { getToken } from './auth';
// The window builder is shared rather than duplicated: two copies would let the
// two dashboards drift on what a range means, which is exactly the bug that
// makes one page's "today" disagree with the other's.
import { windowParams, type StatsWindow } from './stats.server';
import type { TeamBidPerformance } from './team-stats';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Server-only, same split as `stats.server.ts`: `getToken` reads `next/headers`,
// and the dashboard imports value helpers from `team-stats.ts`, so anything
// reachable from there would be bundled for the browser.
//
// Returns null on any failure, including the 403 a non-super-admin gets. The
// page renders a plain notice for that rather than leaking whether the
// endpoint exists.
export async function fetchTeamBidPerformance(
  window: StatsWindow = { days: 90 },
  profileId?: number,
  bidder?: number,
): Promise<TeamBidPerformance | null> {
  const token = await getToken();
  if (!token) return null;

  const qs = windowParams(window);
  if (profileId) qs.set('profileId', String(profileId));
  if (bidder) qs.set('bidder', String(bidder));

  try {
    const res = await fetch(`${API_URL}/api/stats/bid-performance/all?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as TeamBidPerformance;
  } catch {
    return null;
  }
}
