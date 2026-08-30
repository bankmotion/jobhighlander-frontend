import { getToken } from './auth';
import type { JobQuery } from './job-queries';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchJobQueries(jobId: number, profileId: number): Promise<JobQuery[]> {
  if (!jobId || !profileId) return [];
  const token = await getToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/api/job-queries?jobId=${jobId}&profileId=${profileId}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchJobQueryCounts(
  profileId: number,
  jobIds: number[],
): Promise<Record<number, number>> {
  if (!profileId || jobIds.length === 0) return {};
  const token = await getToken();
  if (!token) return {};
  const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
  try {
    const res = await fetch(`${API_URL}/api/job-queries/counts?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
