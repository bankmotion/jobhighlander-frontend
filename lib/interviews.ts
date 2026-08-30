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
  scheduledAt: string | null;
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

export interface CalendarPanel {
  panelId: number;
  interviewId: number;
  jobId: number | null;
  jobTitle: string;
  jobCompany: string | null;
  profileId: number;
  profileName: string;
  stepTitle: string | null;
  stepResult: StepResult;
  interviewStatus: InterviewStatus;
  stages: StageBadge[];
  scheduledAt: string;
  timezone: string | null;
  durationMin: number | null;
  meetingUrl: string | null;
}

export const CLOSED_STATUSES: ReadonlySet<InterviewStatus> = new Set<InterviewStatus>([
  'rejected',
  'withdrawn',
  'ghosted',
  'accepted',
]);
