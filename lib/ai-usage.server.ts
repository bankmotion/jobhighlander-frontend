import { getToken } from './auth';
import type { UsageSummary } from './ai-usage';

/**
 * Server-only AI-usage fetchers.
 *
 * Split from `ai-usage.ts` because `getToken` reads `next/headers`: the
 * dashboard is a client component and imports the formatters from that file as
 * values, so anything reachable from it is bundled for the browser. Keeping the
 * cookie read here is what stops a server-only API from being dragged into the
 * client graph. Do not merge these two files back together.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get(path: string): Promise<UsageSummary | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * The signed-in user's own spend, for every role.
 *
 * There is no all-users counterpart on purpose: nobody sees anyone else's
 * spend, and the backend has no endpoint that would return it.
 */
export const fetchMyAiUsage = (days: number): Promise<UsageSummary | null> =>
  get(`/api/ai-usage/me?days=${days}`);
