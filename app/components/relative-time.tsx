import { formatPostedRelative } from '@/lib/format';

/**
 * A "3 hours ago" label that does not trip hydration.
 *
 * The value is derived from `Date.now()`, so the server computes it at request
 * time and the client recomputes it at hydration — often a minute later, and
 * "Scraped 24 mins ago" versus "25 mins ago" is a genuine text mismatch that
 * React reports and then re-renders the whole subtree over.
 *
 * `suppressHydrationWarning` is the documented answer for a value that is
 * legitimately time-dependent (Next's "preventing flash before hydration"
 * guide lists live-updating dates under exactly this). It tells React to keep
 * what is in the DOM for THIS element only, so a real mismatch anywhere else in
 * the card is still reported.
 *
 * Rendered as <time> with the machine-readable timestamp, so the exact instant
 * survives for screen readers and crawlers even though the visible text is
 * approximate — and so hovering shows the precise time.
 */
export function RelativeTime({
  iso,
  prefix,
  className,
}: {
  iso: string | null;
  /** e.g. "Posted " — inside the element, so it is covered by the suppression. */
  prefix?: string;
  className?: string;
}) {
  if (!iso) return null;
  const label = formatPostedRelative(iso);
  if (!label) return null;

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} className={className} suppressHydrationWarning>
      {prefix}
      {label}
    </time>
  );
}
