import { getToken } from './auth';
import type { AppliedStatusMap, CompanyHistoryMap } from './applications';
import type { CoverLetterStatusMap } from './cover-letters';
import type { DiscardCompanyHistoryMap, DiscardStatusMap } from './discards';
import type { InterviewStatus } from './interviews';
import type { RejectionStatusMap } from './rejections';
import type { ResumeStatusMap } from './resumes';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface JobStatuses {
  resume: ResumeStatusMap;
  applied: AppliedStatusMap;
  coverLetter: CoverLetterStatusMap;
  discard: DiscardStatusMap;
  interview: Record<
    number,
    { interviewId: number; status: InterviewStatus; steps: number; note: string | null }
  >;
  rejection: RejectionStatusMap;
  queryCounts: Record<number, number>;
  companyHistory: CompanyHistoryMap;
  discardCompanyHistory: DiscardCompanyHistoryMap;
}

const EMPTY: JobStatuses = {
  resume: {},
  applied: {},
  coverLetter: {},
  discard: {},
  interview: {},
  rejection: {},
  queryCounts: {},
  companyHistory: {},
  discardCompanyHistory: {},
};

/**
 * Every per-job status for one page of the list, in ONE request.
 *
 * Replaces eight separate fetches that all asked the same question — these job
 * ids, this profile — of eight different endpoints. The database work was never
 * the cost; eight HTTP round trips were, and the page waited on the slowest.
 *
 * Fails soft to empty maps, like the fetchers it replaces: badges are worth
 * losing, the job list is not.
 */
export async function fetchJobStatuses(
  profileId: number | null,
  jobIds: number[],
): Promise<JobStatuses> {
  if (!profileId || jobIds.length === 0) return EMPTY;
  try {
    const token = await getToken();
    const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
    const res = await fetch(`${API_URL}/api/job-statuses?${qs}`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return EMPTY;
    return { ...EMPTY, ...((await res.json()) as Partial<JobStatuses>) };
  } catch {
    return EMPTY;
  }
}
