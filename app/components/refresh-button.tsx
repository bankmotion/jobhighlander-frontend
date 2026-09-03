'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Re-fetch the current page's data, from anywhere.
 *
 * Floating rather than in the top bar. Almost every page here is a list or a
 * dashboard of numbers that go stale while you read them, so "get me the
 * current version" is a page-level action — and at the bottom of a long job
 * list it is now in reach instead of a scroll away at the top.
 *
 * It takes the anchor position in the corner because it is always present;
 * back-to-top stacks above it and only appears once there is something to
 * scroll back from.
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
      className="jh-press fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)] shadow-lg transition hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-70"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        // The spin IS the pending state — a disabled button with a static icon
        // reads as broken rather than busy.
        className={`h-5 w-5 ${pending ? 'animate-spin motion-reduce:animate-none' : ''}`}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      <span className="sr-only">{pending ? 'Refreshing…' : 'Refresh'}</span>
    </button>
  );
}
