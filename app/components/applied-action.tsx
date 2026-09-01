'use client';

import { useApplied } from './applied-provider';

function IconCheck({ className = 'h-4 w-4' }: { className?: string }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// The tick sits on a darker disc rather than directly on the gradient: a white
// check on mid-emerald is legible but weak, and the disc gives it an edge to
// read against at 16px.
function CheckDisc({ lg }: { lg: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-950/45 shadow-[0_1px_0_0_rgba(255,255,255,0.22)_inset] ${
        lg ? 'h-6 w-6' : 'h-5 w-5'
      }`}
    >
      <IconCheck className={lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
    </span>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const shortName = (email: string) => email.split('@')[0];

const byLine = (markedBy: string, viewerEmail: string | null): string =>
  markedBy === viewerEmail ? 'you' : shortName(markedBy);

export function AppliedAction({ jobId, size = 'sm' }: { jobId: number; size?: 'sm' | 'lg' }) {
  const { profileId, viewerEmail, appliedOn, isBusy, toggle } = useApplied();
  const status = appliedOn(jobId);
  const busy = isBusy(jobId);
  const lg = size === 'lg';

  const base = `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 ${
    lg ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-sm'
  }`;

  // Without a profile there is nothing to be applied AS, so the control is
  // shown disabled rather than removed — same reasoning as the resume button.
  if (!profileId) {
    return (
      <span
        role="button"
        aria-disabled="true"
        tabIndex={0}
        title="Applying is tracked per profile — create one, or ask an admin to invite you to theirs"
        aria-label={`Cannot mark posting ${jobId} as applied: no profile yet`}
        className={`${base} cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted)]`}
      >
        <IconCheck />
        Mark as Applied
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
        aria-label={`Undo applied for posting ${jobId}, marked ${when(status.appliedAt)} by ${byLine(
          status.markedBy,
          viewerEmail,
        )}`}
        title={`Applied ${when(status.appliedAt)} by ${status.markedBy} — click to undo`}
        className={`${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60`}
      >
        <IconCheck />
        {busy ? 'Saving…' : `Applied ${when(status.appliedAt)}`}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(jobId)}
      disabled={busy}
      aria-label={`Mark posting ${jobId} as applied`}
      className={`${base} border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-emerald-500/50 hover:text-white disabled:opacity-60`}
    >
      <IconCheck />
      {busy ? 'Saving…' : 'Mark as Applied'}
    </button>
  );
}

export function PreviouslyAppliedBadge({ jobId, size = 'sm' }: { jobId: number; size?: 'sm' | 'lg' }) {
  const { companyHistoryOn } = useApplied();
  const history = companyHistoryOn(jobId);
  if (!history) return null;

  const lg = size === 'lg';
  const more = history.count > 1 ? ` (${history.count} times)` : '';

  return (
    <span
      // The earlier role lives in the tooltip: it is the first thing you want
      // once the badge has caught your eye, and the last thing that fits on it.
      title={`Previously applied to ${history.company}${more} — most recently ${when(
        history.appliedAt,
      )} for "${history.jobTitle}"`}
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30 ${
        lg ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <IconHistory className={lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      Previously applied to this company on {when(history.appliedAt)}
    </span>
  );
}

function IconHistory({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppliedBadge({ jobId, size = 'sm' }: { jobId: number; size?: 'sm' | 'lg' }) {
  const { viewerEmail, appliedOn } = useApplied();
  const status = appliedOn(jobId);
  if (!status) return null;

  const lg = size === 'lg';
  const who = byLine(status.markedBy, viewerEmail);

  return (
    <span
      // Full address in the tooltip, short name on screen: two colleagues can
      // share a first name and the pill has no room to settle that.
      title={`Applied ${when(status.appliedAt)} by ${status.markedBy}`}
      // Three light effects doing three different jobs, which is what stops it
      // reading as a flat coloured rectangle:
      //   - a diagonal gradient, so the fill has a direction
      //   - an inset top highlight, which is what makes it look raised
      //   - a soft emerald glow, so it lifts off the card instead of sitting on it
      // The white ring keeps a crisp edge on both themes; on the light theme the
      // glow alone would leave the pill floating with no boundary.
      className={`inline-flex items-center whitespace-nowrap rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white ring-1 ring-inset ring-white/30 shadow-[0_1px_0_0_rgba(255,255,255,0.3)_inset,0_3px_14px_-3px_rgba(16,185,129,0.75)] ${
        lg ? 'gap-2 px-3.5 py-2 text-sm' : 'gap-2 px-3 py-1.5 text-[13px]'
      }`}
    >
      <CheckDisc lg={lg} />
      <span className="font-extrabold uppercase tracking-wider">Applied</span>

      {/* A hairline rather than a bullet: it separates the label from the
          metadata without adding a glyph that competes with the tick. */}
      <span aria-hidden className={`w-px self-stretch bg-white/30 ${lg ? 'my-0.5' : 'my-px'}`} />

      <span className="font-semibold text-white/95">{who}</span>
      {/* The date earns its place at both sizes now the pill is large enough:
          "who applied" and "how long ago" are the two questions this badge is
          scanned for, and only one of them used to be answered. */}
      <span className={`font-medium text-white/75 ${lg ? 'text-xs' : 'text-[11px]'}`}>
        {when(status.appliedAt)}
      </span>
    </span>
  );
}
