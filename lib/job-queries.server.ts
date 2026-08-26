import { getToken } from './auth';
import type { JobQuery } from './job-queries';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * The ask-AI log for one (job, profile), fetched on the server so the detail
 * page's first paint already has it.
 *
 * Failure is not fatal: the panel still renders and can ask. That beats a page
 * that will not load.
 */
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

/** How many questions each of `jobIds` has. One request for a whole page. */
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
