import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type DiscardedFilter = 'all' | 'discarded' | 'undiscarded';

export const isDiscardedFilter = (v: string): v is DiscardedFilter =>
  v === 'all' || v === 'discarded' || v === 'undiscarded';

export interface DiscardStatus {
  jobId: number;
  discardedAt: string;
  discardedBy: string;
}

export type DiscardStatusMap = Record<number, DiscardStatus>;

export async function fetchDiscardStatus(
  profileId: number,
  jobIds: number[],
): Promise<DiscardStatusMap> {
  if (!profileId || jobIds.length === 0) return {};
  const token = await getToken();
  if (!token) return {};

  const qs = new URLSearchParams({
    profileId: String(profileId),
    jobIds: jobIds.join(','),
  });
  try {
    const res = await fetch(`${API_URL}/api/discards/status?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
