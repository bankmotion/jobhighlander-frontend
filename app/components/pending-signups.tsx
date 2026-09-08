'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser } from '@/lib/admin';

function when(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * People who signed in with Google and are waiting to be given a role.
 *
 * The reason this exists on the bidders page rather than only in super-admin
 * user management: an admin was already allowed to turn a guest into a bidder,
 * but had no way to find out a guest existed — the permission was real and
 * unreachable, so every sign-up waited on a super admin regardless. Someone who
 * has already signed up does not need an account created for them; they need
 * the one they have given a role, which is one button.
 *
 * Only guests are listed. Enough to clear the queue, and nothing about who else
 * holds an account.
 */
export function PendingSignups({ initial }: { initial: AdminUser[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (users.length === 0) return null;

  async function makeBidder(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'bidder' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Could not set that role (${res.status})`);
        return;
      }
      // Dropped from the list rather than re-fetched: they are no longer a
      // guest, so the queue this component shows genuinely no longer holds them.
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      // The rest of the page counts on the server's view of roles, so let it
      // catch up rather than leaving two versions of the truth on screen.
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="text-sm font-semibold text-white">
        {users.length === 1 ? '1 person is waiting' : `${users.length} people are waiting`}
      </h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        They signed in with Google and have no role yet, so they cannot use the board. Making
        someone a bidder takes effect immediately — no super admin has to approve it. There is no
        need to create an account below for anyone listed here; they already have one.
      </p>

      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-[var(--text)]">{u.email}</span>
              <span className="text-xs text-[var(--muted)]">Signed up {when(u.createdAt)}</span>
            </span>
            <button
              type="button"
              onClick={() => void makeBidder(u)}
              disabled={busyId === u.id}
              className="jh-cta shrink-0 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-60"
            >
              {busyId === u.id ? 'Setting…' : 'Make bidder'}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}
