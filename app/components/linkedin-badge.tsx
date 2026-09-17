/**
 * Whether a posting is also listed on LinkedIn.
 *
 * Only Remote Rocketship reports this — its whole pitch is postings you will
 * NOT find on LinkedIn — so `onLinkedin` is null everywhere else and nothing
 * renders. Showing "not on LinkedIn" for a site that never checked would be
 * inventing a fact, which is why the null case is silence rather than a default.
 *
 * Not on LinkedIn is the notable state and gets the stronger treatment: it means
 * far fewer applicants have seen the posting, which is the reason to bid on it.
 * "On LinkedIn" still shows, quietly — knowing a posting is contested is worth
 * as much as knowing it is not, and its absence would be ambiguous between
 * "contested" and "unknown".
 */
export function LinkedInBadge({ onLinkedin }: { onLinkedin?: boolean | null }) {
  if (onLinkedin == null) return null;

  return onLinkedin ? (
    <span
      title="This posting is also listed on LinkedIn — expect more applicants"
      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]"
    >
      <IconIn className="h-3 w-3" />
      On LinkedIn
    </span>
  ) : (
    <span
      title="Not listed on LinkedIn — far fewer people have seen this one"
      className="inline-flex items-center gap-1 rounded-md border border-teal-500/40 bg-teal-500/15 px-2 py-0.5 text-xs font-semibold text-teal-300"
    >
      <IconIn className="h-3 w-3" />
      Not on LinkedIn
    </span>
  );
}

function IconIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.76-1.95 4.02 0 4.76 2.5 4.76 5.76V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21h-3.9V9Z" />
    </svg>
  );
}
