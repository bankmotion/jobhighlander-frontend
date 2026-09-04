'use client';

import { useDiscard } from './discard-provider';

function IconX({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const shortName = (email: string) => email.split('@')[0];

const byLine = (discardedBy: string, viewerEmail: string | null): string =>
  discardedBy === viewerEmail ? 'you' : shortName(discardedBy);

export function DiscardAction({ jobId }: { jobId: number }) {
  // `viewerEmail` is not read here: the discarded state renders nothing, and
  // the badge that does render it pulls its own.
  const { profileId, discardedOn, isBusy, toggle } = useDiscard();
  const status = discardedOn(jobId);
  const busy = isBusy(jobId);

  const base =
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 disabled:opacity-60';

  // Without a profile there is nothing to discard FOR, so the control is shown
  // disabled rather than removed — same reasoning as the applied button.
  if (!profileId) {
    return (
      <span
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Discarding is tracked per profile — create one, or ask an admin to invite you to theirs"
        aria-label={`Cannot discard posting ${jobId}: no profile yet`}
        className={`${base} cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted)]`}
      >
        <IconX />
      </span>
    );
  }

  // Discarding is one-way, and once done the control has nothing left to offer:
  // no undo, and no state to report that the card is not already reporting.
  // So it removes itself entirely rather than leaving a dead icon sitting where
  // a live button was a moment ago.
  //
  // The state stays perfectly visible without it — `DiscardedBadge` labels the
  // row with who and when, and `JobPanel` dims and desaturates the whole card.
  // Nothing is deleted either: the discard row is intact and the discarded
  // filter still lists these.
  if (status) return null;

  return (
    <button
      type="button"
      onClick={() => toggle(jobId)}
      disabled={busy}
      aria-label={`Discard posting ${jobId} for this profile`}
      title="Not a fit for this profile — discard it"
      className={`${base} border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300`}
    >
      <IconX />
    </button>
  );
}

export function DiscardedBadge({ jobId }: { jobId: number }) {
  const { viewerEmail, discardedOn } = useDiscard();
  const status = discardedOn(jobId);
  if (!status) return null;

  return (
    <span
      title={`Discarded ${when(status.discardedAt)} by ${status.discardedBy}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300"
    >
      <IconX className="h-3 w-3" />
      Discarded
      <span className="text-red-300/70">{byLine(status.discardedBy, viewerEmail)}</span>
    </span>
  );
}

/**
 * "You have dismissed this company before."
 *
 * The counterpart to PreviouslyAppliedBadge, and deliberately quieter than the
 * DiscardedBadge above it: that one says THIS posting is discarded, which is a
 * fact about the row you are looking at. This one is a reminder about an
 * earlier judgement on a DIFFERENT posting, so it is outlined rather than
 * filled and never dims the card.
 *
 * It does not hide or block anything. Having passed on one role at a company
 * is not a reason to pass on the next, and the badge exists so that call is
 * made knowingly rather than by accident.
 */
export function PreviouslyDiscardedBadge({
  jobId,
  size = 'sm',
}: {
  jobId: number;
  size?: 'sm' | 'lg';
}) {
  const { companyHistoryOn, discardedOn } = useDiscard();
  const history = companyHistoryOn(jobId);
  if (!history) return null;

  // Suppressed when THIS posting is already discarded: the card is dimmed and
  // carries a "Discarded" badge, and a second red pill about the company would
  // be saying the obvious twice.
  if (discardedOn(jobId)) return null;

  const lg = size === 'lg';
  const more = history.count > 1 ? ` (${history.count} times)` : '';

  return (
    <span
      // The earlier role is in the tooltip, matching the applied badge: it is
      // the first thing you want once the badge has caught your eye, and the
      // last thing that would fit on it.
      title={`Previously discarded a role at ${history.company}${more} — most recently ${when(
        history.discardedAt,
      )}: "${history.jobTitle}"`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-transparent font-medium text-red-300/80 ${
        lg ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <IconHistoryX className={lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      Previously discarded at this company on {when(history.discardedAt)}
    </span>
  );
}

function IconHistoryX({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      {/* The same clock-arrow as the applied badge, so the pair reads as one
          idea, with a cross where that one has hands. */}
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m10 10 4 4M14 10l-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
