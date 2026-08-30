import { getToken } from './auth';
import type {
  CalendarPanel,
  InterviewDetail,
  InterviewStatus,
  InterviewSummary,
  UpcomingPanel,
} from './interviews';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

export async function fetchInterviews(profileId?: number): Promise<InterviewSummary[]> {
  const qs = profileId ? `?profileId=${profileId}` : '';
  return authed<InterviewSummary[]>(`/api/interviews${qs}`, []);
}

export async function fetchUpcoming(days = 7): Promise<UpcomingPanel[]> {
  return authed<UpcomingPanel[]>(`/api/interviews/upcoming?days=${days}`, []);
}

export async function fetchInterviewStatus(
  profileId: number,
  jobIds: number[],
): Promise<Record<number, { interviewId: number; status: InterviewStatus; steps: number }>> {
  if (!profileId || jobIds.length === 0) return {};
  const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
  return authed(`/api/interviews/status?${qs}`, {});
}

export async function fetchCalendarPanels(
  from: Date,
  to: Date,
  profileId?: number,
): Promise<CalendarPanel[]> {
  const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  if (profileId) qs.set('profileId', String(profileId));
  return authed<CalendarPanel[]>(`/api/interviews/calendar?${qs}`, []);
}
