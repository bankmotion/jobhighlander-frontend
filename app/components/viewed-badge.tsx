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
 * Built to the same shape as `AppliedBadge` so the two read as one family, but
 * deliberately slate rather than emerald: applying is an achievement and having
 * already looked at something is not, so it gets the presence without the
 * celebration. Down a list of cards the hue is what separates them at a glance.
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
      className={`jh-badge relative isolate inline-flex items-center overflow-hidden whitespace-nowrap rounded-full bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white ring-1 ring-inset ring-white/25 shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_4px_16px_-4px_rgba(100,116,139,0.7)] ${
        lg ? 'min-w-[11rem] gap-3.5 py-2 pl-2.5 pr-6' : 'min-w-[9.5rem] gap-3 py-1.5 pl-2 pr-5'
      }`}
    >
      <span
        aria-hidden
        className="jh-badge-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
      />

      <ViewedSeal
        className={`jh-badge-seal relative shrink-0 text-white drop-shadow-[0_1px_1px_rgba(15,23,42,0.45)] ${
          lg ? 'h-9 w-9' : 'h-8 w-8'
        }`}
      />

      {/* Two stacked lines, as on the applied badge: the label above its own
          metadata is the reading order, and it fills the height honestly
          rather than padding an empty pill. */}
      <span className="relative flex flex-col leading-tight">
        <span className={`font-extrabold uppercase tracking-wider ${lg ? 'text-sm' : 'text-[13px]'}`}>
          Viewed
        </span>
        <span className={`font-medium text-white/85 ${lg ? 'text-xs' : 'text-[11px]'}`}>
          {when(at)}
        </span>
      </span>
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
