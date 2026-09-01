'use client';

import { useLayoutEffect } from 'react';
import { themeStore } from '@/lib/theme';
import type { Theme } from '@/lib/theme-init';

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  // Keeps native UI — scrollbars, date pickers, autofill — on the same side as
  // the page. Without it a light page still renders a dark calendar popup.
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  // `null` until hydrated: useSyncExternalStore's server snapshot. The button
  // renders its dark-theme face in that window, which matches the SSR default.
  const stored = themeStore.useValue();
  const theme: Theme = stored ?? 'dark';

  useLayoutEffect(() => {
    // Two jobs. Normally the inline script in the layout already set this and
    // re-applying is a no-op. But React's Strict Mode remount in development
    // resets <html> to the attributes it manages from JSX, dropping the one the
    // script set — so the page would silently fall back to dark. It also
    // re-applies when another tab changes the value, since the store's
    // `storage` listener updates `stored` here.
    if (stored) apply(stored);
  }, [stored]);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => {
        // Written before the DOM is touched so a failed write (private mode)
        // still flips this tab rather than appearing to ignore the click.
        themeStore.set(next);
        apply(next);
      }}
      role="switch"
      aria-checked={theme === 'light'}
      aria-label="Toggle light and dark theme"
      title={`Switch to ${next} theme`}
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
        {theme === 'dark' ? (
          // Showing a sun while dark: the icon is the destination, not the
          // current state, matching the title text.
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        ) : (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
      <span className="sr-only">{`Switch to ${next} theme`}</span>
    </button>
  );
}
