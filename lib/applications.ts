import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Which side of the applied line the list is showing. */
export type AppliedFilter = 'all' | 'applied' | 'unapplied';

export const isAppliedFilter = (v: string): v is AppliedFilter =>
  v === 'all' || v === 'applied' || v === 'unapplied';

/** What a card needs to render the badge, without loading the whole record. */
export interface AppliedStatus {
  jobId: number;
  appliedAt: string;
  /** Who marked it — a shared profile has more than one user. */
  markedBy: string;
}

/** Keyed by job id. A job nobody applied to is simply absent. */
export type AppliedStatusMap = Record<number, AppliedStatus>;

/**
 * Applied markers for a page of jobs, fetched on the server so the first paint
 * is already correct — fetching from the client would show every card as
 * un-applied and then stamp badges onto it a moment later.
 *
 * Failure is not fatal: the list still renders and every card offers to mark.
 * That beats a page that will not load.
 */
export async function fetchAppliedStatus(
  profileId: number,
  jobIds: number[],
): Promise<AppliedStatusMap> {
  if (!profileId || jobIds.length === 0) return {};
  const token = await getToken();
  if (!token) return {};

  const qs = new URLSearchParams({
    profileId: String(profileId),
    jobIds: jobIds.join(','),
  });
  try {
    const res = await fetch(`${API_URL}/api/applications/status?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
