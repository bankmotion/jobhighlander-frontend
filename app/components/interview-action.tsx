'use client';

import Link from 'next/link';
import { useApplied } from './applied-provider';
import { INTERVIEW_STATUS_LABELS, type InterviewStatus } from '@/lib/interviews';

/** What a list card needs to badge a job, without loading the whole timeline. */
export interface InterviewCardStatus {
  interviewId: number;
  status: InterviewStatus;
  steps: number;
}

/** Straight to the Interview tab on the profile the list is showing. */
const timelineHref = (jobId: number, profileId: number | null) =>
  `/jobs/${jobId}?tab=interview${profileId ? `&profile=${profileId}` : ''}`;

/**
 * Complete literal class strings, one per status.
 *
 * Tailwind v4 scans source statically, so a composed `bg-${tone}-500/15`
 * compiles to no CSS at all — silently, and with no build error.
 */
const BADGE: Record<InterviewStatus, string> = {
  active: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
  offer: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  accepted: 'border-emerald-400/60 bg-emerald-500/25 text-emerald-200',
  rejected: 'border-red-500/40 bg-red-500/15 text-red-300',
  withdrawn: 'border-[var(--border)] bg-white/10 text-[var(--muted)]',
  ghosted: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  on_hold: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
};

/**
 * The interview badge, shown at the top of a card beside "Applied".
 *
 * Quieter than `AppliedBadge` on purpose. Applied is the scan signal that stops
 * a posting being answered twice, so it is loud; this one carries state about a
 * job you have already dealt with, and two competing gradients in the same row
 * would cost the first one exactly the attention it exists to collect.
 *
 * Renders nothing when there is no timeline — a placeholder on every card would
 * be noise on the many that never reach an interview.
 */
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

/**
 * The footer control.
 *
 * A LINK, not a button. Opening a timeline is a write, but it is also the point
 * at which you start entering real detail — so it belongs on the page that can
 * actually hold that detail rather than creating an empty record from a list
 * and leaving the user to find it later.
 *
 * Applied state comes from the provider, not from the server snapshot, so
 * marking a job applied in the list makes this appear immediately rather than
 * after a refresh.
 */
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
