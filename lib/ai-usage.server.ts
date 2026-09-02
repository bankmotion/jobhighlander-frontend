import { getToken } from './auth';
import {
  CALL_PAGE_SIZE,
  usageQuery,
  type AdminUsageSummary,
  type ProviderRate,
  type UsageCallPage,
  type UsageFilter,
  type UsageSummary,
} from './ai-usage';

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

export const fetchMyAiUsage = (days: number): Promise<UsageSummary | null> =>
  get<UsageSummary>(`/api/ai-usage/me?days=${days}`);

export const fetchAllAiUsage = (
  days: number,
  filter: UsageFilter,
): Promise<AdminUsageSummary | null> =>
  get<AdminUsageSummary>(`/api/ai-usage/all?${usageQuery(days, filter)}`);

export const fetchAiRates = async (): Promise<ProviderRate[] | null> => {
  const data = await get<{ rates: ProviderRate[] }>('/api/ai-usage/rates');
  return data?.rates ?? null;
};

export const fetchAiUsageCalls = (
  days: number,
  filter: UsageFilter,
  offset = 0,
): Promise<UsageCallPage | null> =>
  get<UsageCallPage>(
    `/api/ai-usage/calls?${usageQuery(days, filter, { limit: CALL_PAGE_SIZE, offset })}`,
  );
