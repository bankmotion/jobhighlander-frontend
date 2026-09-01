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

// A 12-lobe rosette, computed rather than eyeballed: alternating radii of 10.6
// and 8.7 about a 24-unit box. Rounded joins turn what would be a spiky star
// into a scalloped medal, which is the shape a person already reads as
// "certified" — a plain tick says an item is ticked, a seal says it is done.
const SEAL_PATH =
  'M12.00 1.40 L14.25 3.60 L17.30 2.82 L18.15 5.85 L21.18 6.70 L20.40 9.75 L22.60 12.00 ' +
  'L20.40 14.25 L21.18 17.30 L18.15 18.15 L17.30 21.18 L14.25 20.40 L12.00 22.60 L9.75 20.40 ' +
  'L6.70 21.18 L5.85 18.15 L2.82 17.30 L3.60 14.25 L1.40 12.00 L3.60 9.75 L2.82 6.70 ' +
  'L5.85 5.85 L6.70 2.82 L9.75 3.60 Z';

function AppliedSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {/* Stroked as well as filled, so the scallops keep their soft edge
          instead of coming to points at small sizes. */}
      <path
        d={SEAL_PATH}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* pathLength normalises the tick to 1 unit, so the draw animation's dash
          values hold at every size this renders at. */}
      <path
        className="jh-badge-check"
        d="M8.2 12.3 L10.9 15 L16 9.6"
        pathLength={1}
        fill="none"
        stroke="#065f46"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      //
      // `overflow-hidden` clips the sheen to the capsule; `isolate` gives it a
      // stacking context so the sheen cannot ride over a neighbouring badge.
      // The min-width matters as much as the padding: "you · Sep 1, 2026" is a
      // third the length of a full colleague name, so padding alone left the
      // badge visibly different widths down a list. A floor makes the short
      // case match the common one instead of shrinking to fit.
      className={`jh-badge relative isolate inline-flex items-center overflow-hidden whitespace-nowrap rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 text-white ring-1 ring-inset ring-white/30 shadow-[0_1px_0_0_rgba(255,255,255,0.3)_inset,0_4px_16px_-4px_rgba(16,185,129,0.8)] ${
        lg ? 'min-w-[13.5rem] gap-3.5 py-2 pl-2.5 pr-6' : 'min-w-[12rem] gap-3 py-1.5 pl-2 pr-5'
      }`}
    >
      {/* A gloss band that crosses the pill on hover. Purely decorative and
          pointer-transparent, so it never intercepts the hover driving it. */}
      <span
        aria-hidden
        className="jh-badge-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />

      <AppliedSeal
        className={`jh-badge-seal relative shrink-0 text-white drop-shadow-[0_1px_1px_rgba(6,78,59,0.45)] ${
          lg ? 'h-9 w-9' : 'h-8 w-8'
        }`}
      />

      {/* Stacked rather than inline: the height is what was asked for, and two
          short lines give it honestly instead of padding an empty pill. It also
          puts the label above its own metadata, which is the reading order. */}
      <span className="relative flex flex-col leading-tight">
        <span className={`font-extrabold uppercase tracking-wider ${lg ? 'text-sm' : 'text-[13px]'}`}>
          Applied
        </span>
        <span className={`font-medium text-white/85 ${lg ? 'text-xs' : 'text-[11px]'}`}>
          {who} · {when(status.appliedAt)}
        </span>
      </span>
    </span>
  );
}
