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

function IconRestore({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Local part of an email — enough to identify a colleague, short enough to fit. */
const shortName = (email: string) => email.split('@')[0];

const byLine = (discardedBy: string, viewerEmail: string | null): string =>
  discardedBy === viewerEmail ? 'you' : shortName(discardedBy);

/**
 * The discard control: top-right corner of a job card.
 *
 * An icon rather than a labelled button because it repeats on every row and
 * competes with Apply Now, which is the action the card is actually for. It
 * toggles, for the same reason Mark as Applied does: this records a judgement
 * the app cannot observe, and a mis-click that could not be undone would bury a
 * posting with no way back to it.
 *
 * Per profile, not per user — the same job can be wrong for one candidate and
 * right for the next, so the tooltip names the profile scope explicitly.
 */
export function DiscardAction({ jobId }: { jobId: number }) {
  const { profileId, viewerEmail, discardedOn, isBusy, toggle } = useDiscard();
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

  if (status) {
    return (
      <button
        type="button"
        onClick={() => toggle(jobId)}
        disabled={busy}
        // The label says what the click DOES; the state is already announced by
        // the badge at the top of the card.
        aria-label={`Restore posting ${jobId}, discarded ${when(status.discardedAt)} by ${byLine(
          status.discardedBy,
          viewerEmail,
        )}`}
        title={`Discarded ${when(status.discardedAt)} by ${status.discardedBy} — click to restore`}
        className={`${base} border-red-500/40 bg-red-500/10 text-red-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300`}
      >
        <IconRestore />
      </button>
    );
  }

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

/**
 * The "Discarded" chip.
 *
 * Deliberately flat and quiet, the opposite of the Applied badge: that one is a
 * solid glowing pill because catching it while scanning is its whole job, while
 * this one sits on a card the panel has already greyed out. Two loud badges
 * competing on one row would leave neither of them loud.
 *
 * Renders nothing when the job is not discarded.
 */
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
