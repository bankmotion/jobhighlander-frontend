import { getToken } from './auth';
import type { RejectionStatusMap } from './rejections';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Rejections for the postings on this page.
 *
 * Fails soft to an empty map, like the discard fetcher: a status lookup that
 * cannot be read is a reason to show no badges, never a reason to fail the
 * whole job list.
 */
export async function fetchRejectionStatus(
  profileId: number,
  jobIds: number[],
): Promise<RejectionStatusMap> {
  if (!profileId || jobIds.length === 0) return {};
  try {
    const token = await getToken();
    const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
    const res = await fetch(`${API_URL}/api/rejections/status?${qs}`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return {};
    return (await res.json()) as RejectionStatusMap;
  } catch {
    return {};
  }
}
