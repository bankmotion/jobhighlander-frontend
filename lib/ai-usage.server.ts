import { getToken } from './auth';
import {
  CALL_PAGE_SIZE,
  usageQuery,
  type AdminUsageSummary,
  type UsageCallPage,
  type UsageFilter,
  type UsageSummary,
} from './ai-usage';

/**
 * Server-only AI-usage fetchers.
 *
 * Split from `ai-usage.ts` because `getToken` reads `next/headers`: the
 * dashboards are client components and import the formatters from that file as
 * values, so anything reachable from it is bundled for the browser. Keeping the
 * cookie read here is what stops a server-only API from being dragged into the
 * client graph. Do not merge these two files back together.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * The signed-in user's own spend, for every role.
 *
 * Scoped by the backend to the token's user; this passes no id and there is no
 * parameter here that could widen it.
 */
export const fetchMyAiUsage = (days: number): Promise<UsageSummary | null> =>
  get<UsageSummary>(`/api/ai-usage/me?days=${days}`);

/**
 * EVERY user's spend, across every profile. Super admin only.
 *
 * Returns null for anyone else, because the backend answers 403 and `get`
 * turns any non-OK response into null — the page then renders its "could not
 * load" state rather than an empty dashboard that reads as "nobody has spent
 * anything". The route is already gated by middleware, so a non-super-admin
 * should never reach this in the first place.
 */
export const fetchAllAiUsage = (
  days: number,
  filter: UsageFilter,
): Promise<AdminUsageSummary | null> =>
  get<AdminUsageSummary>(`/api/ai-usage/all?${usageQuery(days, filter)}`);

/**
 * The first page of the call log, rendered with the page. Super admin only.
 *
 * Fetched on the server alongside the summary so the dashboard mounts with
 * both halves already populated — no mount effect, and no empty table that
 * fills in a moment later.
 */
export const fetchAiUsageCalls = (
  days: number,
  filter: UsageFilter,
  offset = 0,
): Promise<UsageCallPage | null> =>
  get<UsageCallPage>(
    `/api/ai-usage/calls?${usageQuery(days, filter, { limit: CALL_PAGE_SIZE, offset })}`,
  );
