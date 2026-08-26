'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Re-fetch the current page's server data.
 *
 * IN THE TOP BAR, so every page has it from one implementation rather than each
 * screen growing its own. Every page in this app is `force-dynamic` and reads a
 * backend that a scraper, a colleague on a shared profile, or another tab can
 * change underneath it — so "is this still true?" is a question any screen can
 * raise, not a property of one of them.
 *
 * `router.refresh()`, NOT `location.reload()`. A full reload throws away client
 * state that has nothing to do with staleness — an open modal, a half-typed
 * note, the scroll position, an expanded nav group. `refresh()` re-runs the
 * server render and reconciles, so what is on screen updates and what is being
 * worked on survives.
 *
 * `useTransition` supplies the pending flag: `refresh()` returns void and gives
 * no completion signal of its own, so without it the button cannot tell the
 * user anything happened — and a control with no feedback gets clicked four
 * times.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label="Refresh this page's data"
      title="Refresh"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white disabled:opacity-60"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      <span className="sr-only">{pending ? 'Refreshing…' : 'Refresh'}</span>
    </button>
  );
}
