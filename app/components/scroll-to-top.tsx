'use client';

import { useEffect, useState } from 'react';

// Back-to-top button, bottom right.
//
// Hidden until there is something to scroll back from — a control that does
// nothing is worse than no control, and at the top of the page this one does
// nothing. It fades in past a threshold rather than on any scroll at all, so a
// small nudge does not make it flicker.
//
// z-index sits below the loading overlay (60): while a route is resolving the
// overlay owns the screen, and a button floating over it would invite a click
// that goes nowhere.
export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function toTop() {
    // Honour the OS setting: smooth scrolling is motion, and someone who asked
    // for less of it should get an instant jump instead.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Scroll back to top"
      title="Back to top"
      className="jh-to-top fixed bottom-[5.25rem] right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)] shadow-lg transition hover:bg-[var(--primary)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
