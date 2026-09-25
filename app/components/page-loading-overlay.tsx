'use client';

import { useSyncExternalStore } from 'react';
import {
  subscribeNavPending,
  getNavPending,
  getNavPendingServer,
} from '@/lib/nav-pending';

/**
 * A page-level veil while a paging navigation is in flight.
 *
 * Covers the list rather than replacing it: the rows stay visible underneath,
 * dimmed, so the reader keeps their place and the page does not collapse and
 * re-expand on every click. `pointer-events` are captured so a second click
 * cannot queue a navigation behind the first.
 *
 * `useSyncExternalStore` rather than `useState` + an effect, so the first
 * client render already agrees with the store and there is no hydration flash.
 */
export function PageLoadingOverlay() {
  const pending = useSyncExternalStore(
    subscribeNavPending,
    getNavPending,
    getNavPendingServer,
  );
  if (!pending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading jobs"
      className="fixed inset-0 z-40 flex items-start justify-center bg-[var(--bg)]/55 backdrop-blur-[1px]"
    >
      <span className="mt-32 inline-flex items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--text)] shadow-2xl">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--primary)]" />
        Loading jobs…
      </span>
    </div>
  );
}
