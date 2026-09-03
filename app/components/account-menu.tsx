'use client';

import { useEffect, useRef, useState } from 'react';
import { LogoutButton } from './logout-button';
import { TimezonePicker } from './timezone-picker';
import type { Session } from '@/lib/session';

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-500/15 text-purple-300',
  admin: 'bg-blue-500/15 text-blue-300',
  bidder: 'bg-green-500/15 text-green-300',
  guest: 'bg-amber-500/15 text-amber-300',
};

const ROLE_RING: Record<string, string> = {
  super_admin: 'ring-purple-400/40',
  admin: 'ring-blue-400/40',
  bidder: 'ring-green-400/40',
  guest: 'ring-amber-400/40',
};

/**
 * Identity and account settings, behind one avatar.
 *
 * This absorbs four separate top-bar items — the email, the "Signed in" caption,
 * the role badge and the Logout button — plus the time zone picker. All five
 * were competing for attention with the balance, which is the one thing up
 * there that changes and gates what the user can do.
 *
 * The role still shows on the avatar as a coloured ring, so it is legible at a
 * glance without spending a whole chip on it.
 */
export function AccountMenu({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const initial = session.email.charAt(0).toUpperCase();

  // Click-away and Escape, matching every other popup in the app.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${session.email}`}
        className={`jh-press flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] pl-1 pr-2.5 transition hover:border-[var(--border-strong)] ${
          open ? 'border-[var(--border-strong)]' : ''
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]/20 text-xs font-semibold text-[var(--text)] ring-2 ${
            ROLE_RING[session.role] ?? 'ring-white/10'
          }`}
        >
          {initial}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 text-[var(--muted)] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          // NOT `overflow-hidden`. The time-zone control below is a custom
          // popover, not a native <select>, so it is a real DOM child rather
          // than an OS menu — clipping this panel to its rounded corners cuts
          // the zone list off. Nothing in here paints to the edge, so there is
          // no corner bleed to clip in the first place.
          className="jh-menu absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="truncate text-sm text-[var(--text)]" title={session.email}>
              {session.email}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                ROLE_BADGE[session.role] ?? 'bg-[var(--surface-2)] text-[var(--muted)]'
              }`}
            >
              {session.role}
            </span>
          </div>

          <div className="px-4 py-3">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Time zone
            </span>
            <TimezonePicker />
          </div>

          <div className="border-t border-[var(--border)] p-2">
            <LogoutButton full />
          </div>
        </div>
      )}
    </div>
  );
}
