'use client';

import { useLayoutEffect } from 'react';
import { navStore } from '@/lib/nav';
import type { NavState } from '@/lib/nav-init';

function apply(state: NavState): void {
  const root = document.documentElement;
  if (state === 'hidden') root.dataset.nav = 'hidden';
  // Removed rather than set to 'shown': the stylesheet keys off the attribute
  // being present, and leaving a stale one behind would keep the sidebar hidden.
  else delete root.dataset.nav;
}

export function NavToggle() {
  const stored = navStore.useValue();
  const state: NavState = stored ?? 'shown';
  const hidden = state === 'hidden';

  useLayoutEffect(() => {
    // Re-applied for the same two reasons as the theme toggle: React's Strict
    // Mode remount in development wipes attributes it does not manage from JSX,
    // and another tab changing the value updates `stored` here.
    if (stored) apply(stored);
  }, [stored]);

  const next: NavState = hidden ? 'shown' : 'hidden';

  return (
    <button
      type="button"
      onClick={() => {
        navStore.set(next);
        apply(next);
      }}
      aria-pressed={hidden}
      // Controls an element rendered outside this component, so the relationship
      // is stated rather than implied by position.
      aria-controls="jh-sidebar"
      aria-label={hidden ? 'Show the navigation menu' : 'Hide the navigation menu'}
      title={hidden ? 'Show menu' : 'Hide menu'}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        {/* A panel with a rule down the left: the icon shows what the button
            acts on, and the arrow shows which way it goes. */}
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        {hidden ? <path d="M13 12h5M15.5 9.5 18 12l-2.5 2.5" /> : <path d="M18 12h-5M15.5 9.5 13 12l2.5 2.5" />}
      </svg>
      <span className="sr-only">{hidden ? 'Show the navigation menu' : 'Hide the navigation menu'}</span>
    </button>
  );
}
