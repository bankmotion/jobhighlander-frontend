import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type AppliedFilter = 'all' | 'applied' | 'unapplied';

export const isAppliedFilter = (v: string): v is AppliedFilter =>
  v === 'all' || v === 'applied' || v === 'unapplied';

/**
 * Whether ANOTHER candidate has already applied — the rest of the board, as
 * opposed to `AppliedFilter`, which is about the profile you are viewing as.
 * With a profile selected, your own application does not count as "another".
 */
export type OthersAppliedFilter = 'all' | 'others' | 'none';

export const isOthersAppliedFilter = (v: string): v is OthersAppliedFilter =>
  v === 'all' || v === 'others' || v === 'none';

export interface AppliedStatus {
  jobId: number;
  appliedAt: string;
  markedBy: string;
}

export type AppliedStatusMap = Record<number, AppliedStatus>;

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

export interface CompanyHistory {
  company: string;
  appliedAt: string;
  jobTitle: string;
  jobId: number | null;
  count: number;
}

export type CompanyHistoryMap = Record<number, CompanyHistory>;

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
