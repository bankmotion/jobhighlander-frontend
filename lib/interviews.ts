/**
 * Shared interview types and labels.
 *
 * DELIBERATELY FREE OF SERVER IMPORTS. `interview-timeline.tsx` is a client
 * component and imports `INTERVIEW_STATUS_LABELS` / `STEP_RESULT_LABELS` as
 * VALUES, so everything reachable from this file lands in the browser bundle
 * with it. Pulling in `getToken` (which reads `next/headers`) fails the
 * production build outright — the fetchers live in `interviews.server.ts` for
 * exactly that reason, mirroring `ai-usage.ts` / `ai-usage.server.ts`.
 */
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
