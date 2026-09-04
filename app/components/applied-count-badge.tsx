'use client';

/**
 * "N profiles applied" — how many profiles across the WHOLE board have applied
 * to a posting, not just the one being viewed as.
 *
 * Deliberately separate from `AppliedBadge`, which answers "did *I* apply".
 * On a shared board those are different questions: a bidder needs to see that
 * somebody else already went in on a posting before spending a bid on it.
 *
 * The count comes from the list endpoint (`Job.appliedCount`); it is absent on
 * endpoints that do not compute it, and a posting nobody has applied to renders
 * nothing rather than a "0" that would sit on every card.
 */
export function AppliedCountBadge({
  count,
  size = 'sm',
}: {
  count: number | undefined;
  size?: 'sm' | 'lg';
}) {
  if (!count || count < 1) return null;

  const lg = size === 'lg';
  const label = count === 1 ? '1 profile applied' : `${count} profiles applied`;

  return (
    <span
      title={
        count === 1
          ? 'One profile has already applied to this posting'
          : `${count} profiles have already applied to this posting`
      }
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 font-semibold text-violet-300 ring-1 ring-inset ring-violet-400/30 ${
        lg ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <IconUsers className={lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      {label}
    </span>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
