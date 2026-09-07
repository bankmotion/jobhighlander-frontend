'use client';

/**
 * "Blacklisted" on a job whose employer this profile has ruled out.
 *
 * A FLAG, never a filter: the posting stays in the list and stays actionable,
 * because "we don't bid this employer" is advice to the person reading, not a
 * reason to hide work from them.
 *
 * Always relative to the profile being viewed as — a blacklist belongs to a
 * profile, so another candidate looking at the same posting may not see this.
 */
export function BlacklistBadge({
  on,
  size = 'sm',
}: {
  on: boolean | undefined;
  size?: 'sm' | 'lg';
}) {
  if (!on) return null;

  const lg = size === 'lg';
  return (
    <span
      title="This company is blacklisted for the profile you are viewing as"
      aria-label="Blacklisted for this profile"
      className={`inline-flex items-center gap-1.5 rounded-full bg-red-500/15 font-semibold text-red-300 ring-1 ring-inset ring-red-400/30 ${
        lg ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <IconBan className={lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      Blacklisted
    </span>
  );
}

function IconBan({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" strokeLinecap="round" />
    </svg>
  );
}
