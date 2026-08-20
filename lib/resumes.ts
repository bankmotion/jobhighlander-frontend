import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** What the job list knows about a resume without downloading the document. */
export interface ResumeStatus {
  jobId: number;
  templateKey: string;
  model: string;
  updatedAt: string;
  headline: string;
  inferredCount: number;
  reviewNoteCount: number;
}

/** Keyed by job id. A job with no resume is simply absent. */
export type ResumeStatusMap = Record<number, ResumeStatus>;

/**
 * Resume status for a page of jobs, fetched on the server so the first paint is
 * already correct — a client-side fetch would flash "no resume" on every card.
 *
 * Failure is not fatal: the list still renders, every card just offers to
 * generate. That is a better outcome than a page that will not load.
 */
export async function fetchResumeStatus(
  profileId: number,
  jobIds: number[],
): Promise<ResumeStatusMap> {
  if (!profileId || jobIds.length === 0) return {};
  const token = await getToken();
  if (!token) return {};

  const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
  try {
    const res = await fetch(`${API_URL}/api/resumes/status?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
