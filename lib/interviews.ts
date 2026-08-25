import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type InterviewStatus =
  | 'active'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'ghosted'
  | 'on_hold';

export type StepResult = 'pending' | 'passed' | 'failed' | 'cancelled';

export interface StageBadge {
  id: number;
  key: string;
  name: string;
  color: string;
  archived: boolean;
}

export interface InterviewPanel {
  id: number;
  title: string | null;
  note: string | null;
  meetingUrl: string | null;
  /** ISO-8601 UTC, or null when nothing is scheduled yet. */
  scheduledAt: string | null;
  /** IANA zone the invitation was written in; pairs with `scheduledAt`. */
  timezone: string | null;
  durationMin: number | null;
  sortOrder: number;
}

export interface InterviewStep {
  id: number;
  title: string | null;
  result: StepResult;
  sortOrder: number;
  stages: StageBadge[];
  panels: InterviewPanel[];
  /** Earliest panel time — derived by the API so the rail has one source. */
  date: string | null;
}

export interface InterviewDetail {
  id: number;
  profileId: number;
  jobId: number | null;
  jobTitle: string;
  jobCompany: string | null;
  status: InterviewStatus;
  lastActivityAt: string;
  openedBy: string;
  steps: InterviewStep[];
}

/** One row on the `/interviews` index — no steps loaded. */
export interface InterviewSummary {
  id: number;
  profileId: number;
  profileName: string;
  jobId: number | null;
  jobTitle: string;
  jobCompany: string | null;
  status: InterviewStatus;
  lastActivityAt: string;
  steps: number;
  /** Live, but nothing has moved in three weeks. */
  stale: boolean;
}

export interface UpcomingPanel {
  panelId: number;
  interviewId: number;
  jobId: number | null;
  jobTitle: string;
  jobCompany: string | null;
  stepTitle: string | null;
  stages: StageBadge[];
  scheduledAt: string;
  timezone: string | null;
  durationMin: number | null;
  meetingUrl: string | null;
}

/** Human labels for the process status, used by the picker and the chips. */
export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  active: 'Active',
  offer: 'Offer received',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
  on_hold: 'On hold',
};

export const STEP_RESULT_LABELS: Record<StepResult, string> = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Did not pass',
  cancelled: 'Cancelled',
};

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
