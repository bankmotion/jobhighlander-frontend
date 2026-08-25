import { getToken } from './auth';
import type { InterviewDetail, InterviewStatus, InterviewSummary, UpcomingPanel } from './interviews';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Server-only interview fetchers.
 *
 * Split from `interviews.ts` because `getToken` reads `next/headers`, which
 * cannot exist in a browser bundle — and the timeline is a client component
 * that imports the label maps from there as values. Keeping the two apart is
 * what stops one `import` from failing the production build.
 */
async function authed<T>(path: string, fallback: T): Promise<T> {
  const token = await getToken();
  if (!token) return fallback;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * The timeline for one (job, profile), fetched on the server so the first paint
 * already has it.
 *
 * Failure is not fatal: the tab still renders and offers to start a timeline.
 * That beats a page that will not load.
 */
export async function fetchInterviewForJob(
  jobId: number,
  profileId: number,
): Promise<InterviewDetail | null> {
  if (!jobId || !profileId) return null;
  return authed<InterviewDetail | null>(
    `/api/interviews/for-job?jobId=${jobId}&profileId=${profileId}`,
    null,
  );
}

/** Every timeline the caller can reach, newest activity first. */
export async function fetchInterviews(profileId?: number): Promise<InterviewSummary[]> {
  const qs = profileId ? `?profileId=${profileId}` : '';
  return authed<InterviewSummary[]>(`/api/interviews${qs}`, []);
}

/** Everything scheduled in the next `days`, across every process. */
export async function fetchUpcoming(days = 7): Promise<UpcomingPanel[]> {
  return authed<UpcomingPanel[]>(`/api/interviews/upcoming?days=${days}`, []);
}

/**
 * Which of `jobIds` have a timeline. One request for a whole page, mirroring
 * `fetchAppliedStatus`.
 */
export async function fetchInterviewStatus(
  profileId: number,
  jobIds: number[],
): Promise<Record<number, { interviewId: number; status: InterviewStatus; steps: number }>> {
  if (!profileId || jobIds.length === 0) return {};
  const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
  return authed(`/api/interviews/status?${qs}`, {});
}
