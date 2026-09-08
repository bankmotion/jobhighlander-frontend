'use client';

import { useViewedJobs } from '@/lib/viewed-jobs';

function when(ms: number): string {
  const d = new Date(ms);
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * "Viewed" — this reader has already worked on this posting.
 *
 * Same family as `AppliedBadge` — gradient fill, inset ring, sheen on hover —
 * but a single compact line rather than that badge's stacked two. Applying is
 * an achievement and having already looked at something is not, so this one
 * takes the styling without the footprint: slate instead of emerald, one row
 * instead of two, and no minimum width. That floor exists on the applied badge
 * to stop a column of them shifting width as names change length; here the
 * content is always "Viewed" plus a short age, so there is nothing to steady.
 *
 * Purely local to this browser. It answers "have I read this", not "has anyone
 * applied" — which is what `AppliedCountBadge` is for, and why that one is
 * super-admin only. This one is nobody else's business, so every role sees it.
 */
export function ViewedBadge({ jobId, size = 'sm' }: { jobId: number; size?: 'sm' | 'lg' }) {
  const seen = useViewedJobs();
  const at = seen?.[jobId];
  if (!at) return null;

  const lg = size === 'lg';

  return (
    <span
      title={`You last worked on this on ${new Date(at).toLocaleString()}`}
      className={`jh-badge relative isolate inline-flex items-center overflow-hidden whitespace-nowrap rounded-full bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_2px_8px_-3px_rgba(100,116,139,0.7)] ${
        lg ? 'gap-1.5 px-2.5 py-1 text-xs' : 'gap-1 px-2 py-0.5 text-[11px]'
      }`}
    >
      <span
        aria-hidden
        className="jh-badge-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />

      <ViewedSeal
        className={`jh-badge-seal relative shrink-0 text-white ${lg ? 'h-4 w-4' : 'h-3.5 w-3.5'}`}
      />

      <span className="relative font-semibold">Viewed</span>
      {/* The age sits inline and lighter: useful when scanning, but never the
          part being read first. */}
      <span className="relative font-medium text-white/70">{when(at)}</span>
    </span>
  );
}

/** An eye inside a ring, so it reads as a seal at badge size rather than a bare icon. */
function ViewedSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="rgba(255,255,255,0.16)" />
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 20s4.4-7 11-7 11 7 11 7-4.4 7-11 7-11-7-11-7Z" />
        <circle cx="20" cy="20" r="3.2" />
      </g>
    </svg>
  );
}
