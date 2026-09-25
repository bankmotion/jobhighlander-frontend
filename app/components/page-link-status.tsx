'use client';

import { useEffect } from 'react';
import { useLinkStatus } from 'next/link';
import { setNavPending } from '@/lib/nav-pending';

/**
 * A spinner over the pagination control that was just clicked.
 *
 * Must be rendered INSIDE the `<Link>` it reports on — `useLinkStatus` reads
 * the pending state of its nearest Link ancestor, so it cannot be hoisted or
 * given the page number as a prop.
 *
 * Why this rather than a `useTransition` in a client component: the job list is
 * server-rendered, and paging is a real navigation. `useLinkStatus` reports the
 * pending state of that navigation itself, so the spinner clears exactly when
 * the new page commits — with no second source of truth to drift.
 *
 * The overlay covers the label instead of sitting beside it so the control does
 * not change width mid-click, which would shuffle the row of page numbers under
 * the reader's cursor.
 */
export function PageLinkStatus() {
  const { pending } = useLinkStatus();

  // Publish upward so the page-level overlay can show too. The cleanup runs
  // when this link stops pending OR when it unmounts mid-navigation — paging
  // replaces the whole control row, so the unmount case is the normal one and
  // without it the counter would never come back down.
  useEffect(() => {
    if (!pending) return;
    setNavPending(true);
    return () => setNavPending(false);
  }, [pending]);

  if (!pending) return null;

  return (
    <span
      aria-hidden
      className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--surface-2)]"
    >
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--primary)]" />
    </span>
  );
}

/**
 * Announces the same state to assistive tech, which the spinner cannot.
 *
 * Separate from the visual because it belongs in the live region, not in the
 * control: a screen reader should hear "loading page" once, not read a spinner.
 */
export function PageLinkAnnounce() {
  const { pending } = useLinkStatus();
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {pending ? 'Loading page…' : ''}
    </span>
  );
}
