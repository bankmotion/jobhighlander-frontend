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

/**
 * A prior application at the same company as a job on screen.
 *
 * Distinct from `AppliedStatus`, which is about THIS posting: this one says
 * "you have dealt with this employer before", which is the thing worth knowing
 * while scanning a list of twenty cards from the same few agencies.
 */
export interface CompanyHistory {
  company: string;
  appliedAt: string;
  jobTitle: string;
  jobId: number | null;
  count: number;
}

/** Keyed by the job id ON SCREEN, not by the earlier application's job. */
export type CompanyHistoryMap = Record<number, CompanyHistory>;

/**
 * Prior-company applications for a page of jobs. Server-side for the same
 * reason as `fetchAppliedStatus`: a client fetch would paint every card
 * unbadged and then stamp them a moment later.
 *
 * Failure is not fatal — the badge is an aid, not a gate, so the list still
 * renders without it.
 */
export async function fetchCompanyHistory(
  profileId: number,
  jobIds: number[],
): Promise<CompanyHistoryMap> {
  if (!profileId || jobIds.length === 0) return {};
  const token = await getToken();
  if (!token) return {};

  const qs = new URLSearchParams({
    profileId: String(profileId),
    jobIds: jobIds.join(','),
  });
  try {
    const res = await fetch(`${API_URL}/api/applications/company-history?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
