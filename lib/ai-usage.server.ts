import { getToken } from './auth';
import { displayZone } from './zone.server';
import {
  CALL_PAGE_SIZE,
  usageQuery,
  type AdminUsageSummary,
  type UsageRange,
  type ProviderRate,
  type UsageCallPage,
  type UsageFilter,
  type UsageSummary,
} from './ai-usage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T | null> {
  const token = await getToken();
  if (!token) return null;
  // The viewer's zone is attached to every request from here rather than by
  // each fetcher: "today" and the daily buckets are computed server-side, so a
  // fetcher that omitted it would report a UTC day while the page around it
  // showed local times. One place means a new fetcher cannot get it wrong.
  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set('tz', await displayZone());
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchMyAiUsage = (range: UsageRange): Promise<UsageSummary | null> =>
  get<UsageSummary>(`/api/ai-usage/me?${usageQuery(range, { userId: null, profileId: null })}`);

export const fetchAllAiUsage = (
  range: UsageRange,
  filter: UsageFilter,
): Promise<AdminUsageSummary | null> =>
  get<AdminUsageSummary>(`/api/ai-usage/all?${usageQuery(range, filter)}`);

export const fetchAiRates = async (): Promise<ProviderRate[] | null> => {
  const data = await get<{ rates: ProviderRate[] }>('/api/ai-usage/rates');
  return data?.rates ?? null;
};

export const fetchAiUsageCalls = (
  range: UsageRange,
  filter: UsageFilter,
  offset = 0,
): Promise<UsageCallPage | null> =>
  get<UsageCallPage>(
    `/api/ai-usage/calls?${usageQuery(range, filter, { limit: CALL_PAGE_SIZE, offset })}`,
  );
