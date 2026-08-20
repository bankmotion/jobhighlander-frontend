'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { ReceivedInvitation } from '@/lib/types';
import { invitationProfileName } from '@/lib/invitations';

/** How many invitations the hover preview shows before deferring to the inbox. */
const PREVIEW = 3;

const STATUS_DOT: Record<ReceivedInvitation['status'], string> = {
  pending: 'bg-amber-400',
  accepted: 'bg-green-400',
  declined: 'bg-red-400',
};

const ago = (iso: string): string => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/**
 * The header inbox: an icon with a pending-count badge, a hover preview of the
 * three most recent invitations, and a click through to the full inbox.
 *
 * Hover alone cannot be the only way in — it does not exist on touch, and it is
 * not keyboard-reachable — so the icon is a real link and the preview opens on
 * focus as well as on hover.
 */
export function InboxMenu({ invitations }: { invitations: ReceivedInvitation[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Rendered on the server, where relative times would be computed against the
  // wrong clock and mismatch the client's first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pending = invitations.filter((i) => i.status === 'pending').length;
  const preview = invitations.slice(0, PREVIEW);

  // Escape closes it, matching every other popup here.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // Focus anywhere inside opens it and leaving closes it, so the preview is
      // reachable by keyboard without a second control.
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Link
        href="/inbox"
        aria-label={pending > 0 ? `Inbox, ${pending} pending invitations` : 'Inbox'}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            d="M4 13h4l2 3h4l2-3h4M4 13l2.2-6.6A2 2 0 0 1 8.1 5h7.8a2 2 0 0 1 1.9 1.4L20 13v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {pending > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white">
            {pending > 9 ? '9+' : pending}
          </span>
        )}
      </Link>

      {open && (
        <div
          role="dialog"
          aria-label="Recent invitations"
          // `pt-2` keeps the gap between icon and panel INSIDE the hover target;
          // a margin would open a dead strip that closes the popup on the way
          // down to it.
          className="absolute right-0 top-full z-50 w-80 pt-2"
        >
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-2.5">
              <span className="text-sm font-semibold text-white">Invitations</span>
              {pending > 0 && (
                <span className="ml-2 text-xs text-[var(--muted)]">{pending} awaiting you</span>
              )}
            </div>

            {preview.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-[var(--muted)]">
                Nothing here yet.
              </p>
            ) : (
              <ul>
                {preview.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href="/inbox"
                      className="flex items-start gap-2.5 px-4 py-3 transition hover:bg-white/5"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[inv.status]}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[var(--text)]">
                          {invitationProfileName(inv)}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          from {inv.invitedBy.email}
                          {mounted && ` · ${ago(inv.createdAt)}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/inbox"
              className="block border-t border-[var(--border)] px-4 py-2.5 text-center text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
            >
              {invitations.length > PREVIEW
                ? `View all ${invitations.length} invitations`
                : 'Open inbox'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
