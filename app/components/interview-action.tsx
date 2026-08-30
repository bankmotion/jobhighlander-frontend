'use client';

import Link from 'next/link';
import { useApplied } from './applied-provider';
import { INTERVIEW_STATUS_LABELS, type InterviewStatus } from '@/lib/interviews';

export interface InterviewCardStatus {
  interviewId: number;
  status: InterviewStatus;
  steps: number;
}

const timelineHref = (jobId: number, profileId: number | null) =>
  `/jobs/${jobId}?tab=interview${profileId ? `&profile=${profileId}` : ''}`;

const BADGE: Record<InterviewStatus, string> = {
  active: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
  offer: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  accepted: 'border-emerald-400/60 bg-emerald-500/25 text-emerald-200',
  rejected: 'border-red-500/40 bg-red-500/15 text-red-300',
  withdrawn: 'border-[var(--border)] bg-white/10 text-[var(--muted)]',
  ghosted: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  on_hold: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
};

export function InterviewBadge({
  jobId,
  profileId,
  interview,
}: {
  jobId: number;
  profileId: number | null;
  interview: InterviewCardStatus | null;
}) {
  if (!interview) return null;
  return (
    <Link
      href={timelineHref(jobId, profileId)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${INTERVIEW_STATUS_LABELS[interview.status]} — ${interview.steps} step${
        interview.steps === 1 ? '' : 's'
      }. Opens the timeline.`}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold transition hover:brightness-125 ${
        BADGE[interview.status]
      }`}
    >
      <span aria-hidden>🗓️</span>
      {INTERVIEW_STATUS_LABELS[interview.status]}
      <span className="rounded bg-black/25 px-1.5 py-px text-[10px] font-bold">
        {interview.steps}
      </span>
    </Link>
  );
}

export function InterviewAction({
  jobId,
  interview,
}: {
  jobId: number;
  interview: InterviewCardStatus | null;
}) {
  const { profileId, appliedOn } = useApplied();

  // Without a profile there is nothing to interview AS, and a timeline cannot
  // exist for one either.
  if (!profileId) return null;

  const applied = Boolean(appliedOn(jobId));
  // Not applied and no timeline: nothing to offer. Timelines start from an
  // application, and advertising a step the user cannot take is worse than
  // staying quiet until the Applied mark makes it available.
  if (!applied && !interview) return null;

  return (
    <Link
      href={timelineHref(jobId, profileId)}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-lg border px-3 py-1.5 transition ${
        interview
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:border-blue-500/70'
          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-strong)]'
      }`}
    >
      {interview
        ? `Interview · ${interview.steps} ${interview.steps === 1 ? 'step' : 'steps'}`
        : '🗓️ Track interview'}
    </Link>
  );
}
