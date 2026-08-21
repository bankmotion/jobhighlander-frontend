import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Which side of the discarded line the list is showing. */
export type DiscardedFilter = 'all' | 'discarded' | 'undiscarded';

export const isDiscardedFilter = (v: string): v is DiscardedFilter =>
  v === 'all' || v === 'discarded' || v === 'undiscarded';

/** What a card needs to render the badge, without loading the whole record. */
export interface DiscardStatus {
  jobId: number;
  discardedAt: string;
  /** Who dismissed it — a shared profile has more than one user. */
  discardedBy: string;
}

/** Keyed by job id. A job nobody discarded is simply absent. */
export type DiscardStatusMap = Record<number, DiscardStatus>;

/**
 * Discard markers for a page of jobs, fetched on the server so the first paint
 * is already correct — fetching from the client would show every card as kept
 * and then grey some of them out a moment later.
 *
 * Failure is not fatal: the list still renders and every card offers to
 * discard. That beats a page that will not load.
 */
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
