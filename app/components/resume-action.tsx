'use client';

import Link from 'next/link';

/**
 * Shared geometry and tones for the card controls.
 *
 * This file no longer renders a resume button — one `ApplicationAction` covers
 * both documents now. What survives is the visual contract that control is
 * built from, plus the profile notice the page header shows.
 *
 * Fixed geometry in every state, so the footer never reflows when one changes
 * and the chip lands in the same column on every card — twenty of them read as
 * a vertical stripe of state you can scan without reading a word.
 */
export const BOX =
  'relative inline-flex w-[8.75rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60';

/**
 * Each state's classes are a COMPLETE literal string. Tailwind v4 scans source
 * statically and there is no theme config here, so `bg-[var(--${tone})]` or a
 * composed `border-${c}-500/40` compiles to no CSS at all — silently, with no
 * build error.
 */
export const TONE = {
  none: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-strong)] hover:text-white',
  busy: 'cursor-wait border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--muted)]',
  // Violet, NOT emerald: the card already carries an emerald salary pill and a
  // green Remote pill, and a third green makes the row unreadable at a glance.
  ready:
    'border-[var(--primary)] bg-[var(--primary)]/12 font-medium text-white hover:bg-[var(--primary)]/20',
  error: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  // No hover affordance at all: the control is inert, and a border that lights
  // up under the cursor promises a click that does nothing.
  disabled: 'cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted)]',
} as const;

/**
 * 2.125rem is the chip's computed height (20px line + 12px padding + 2px
 * border). Hard-coded rather than `h-full`, because these sit in a wrapping
 * flex row where stretch height is whatever the tallest sibling happens to be.
 */
export const ICON_BOX =
  'inline-flex h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60 disabled:cursor-wait disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]';




/** Shown once in the page header instead of on every card. */
export function ResumeProfileNotice({ canManage }: { canManage: boolean }) {
  return (
    <p className="mb-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
      Resumes need a profile — it supplies your name, contact details and employment history.{' '}
      {canManage ? (
        <>
          <Link href="/profiles" className="text-[var(--text)] underline hover:text-white">
            Create one
          </Link>
          .
        </>
      ) : (
        // A bidder cannot create one, but they CAN be invited to an admin's, so
        // the Profiles page is a real destination for them now rather than the
        // dead end it used to be.
        <>
          Your account cannot create one — ask an admin to invite you to theirs, then accept it from
          your{' '}
          <Link href="/inbox" className="text-[var(--text)] underline hover:text-white">
            inbox
          </Link>
          .
        </>
      )}
    </p>
  );
}
