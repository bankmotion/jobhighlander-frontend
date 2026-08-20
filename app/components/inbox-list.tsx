'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { InvitationStatus, ReceivedInvitation } from '@/lib/types';
import { invitationProfileName, respondToInvitation } from '@/lib/invitations';
import { Toast, useToast } from './toast';

const STATUS_META: Record<InvitationStatus, { label: string; cls: string }> = {
  pending: { label: 'Needs an answer', cls: 'bg-amber-500/15 text-amber-300' },
  accepted: { label: 'Accepted', cls: 'bg-green-500/15 text-green-300' },
  declined: { label: 'Declined', cls: 'bg-red-500/15 text-red-300' },
};

const when = (iso: string) => new Date(iso).toLocaleString();

/**
 * The invitation inbox.
 *
 * Answered invitations stay on the list rather than disappearing: an accepted
 * one is the only place that says WHERE a shared profile came from, and a
 * declined one that vanished would look like it was never sent.
 */
export function InboxList({ initial }: { initial: ReceivedInvitation[] }) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { toast, show, dismiss } = useToast();

  async function respond(inv: ReceivedInvitation, status: 'accepted' | 'declined') {
    setBusyId(inv.id);
    const result = await respondToInvitation(inv.id, status);
    setBusyId(null);
    if (!result.ok) {
      show(result.error, 'error');
      return;
    }
    setInvitations((list) =>
      list.map((i) =>
        i.id === inv.id ? { ...i, status, respondedAt: new Date().toISOString() } : i,
      ),
    );
    show(
      status === 'accepted'
        ? `${invitationProfileName(inv)} added to your profiles`
        : `Invitation to ${invitationProfileName(inv)} declined`,
    );
    // The header badge and the Profiles page are server-rendered.
    router.refresh();
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
        No invitations. When an admin shares one of their profiles with you, it shows up here.
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {invitations.map((inv) => {
          const meta = STATUS_META[inv.status];
          const name = invitationProfileName(inv);
          return (
            <li
              key={inv.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-white">{name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {inv.invitedBy.email} invited you to use this profile · {when(inv.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {inv.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => respond(inv, 'declined')}
                        disabled={busyId === inv.id}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => respond(inv, 'accepted')}
                        disabled={busyId === inv.id}
                        className="jh-cta rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-60"
                      >
                        {busyId === inv.id ? 'Saving…' : 'Accept'}
                      </button>
                    </>
                  ) : inv.status === 'accepted' ? (
                    <Link
                      href="/profiles"
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--primary)]"
                    >
                      Open in Profiles
                    </Link>
                  ) : (
                    <button
                      onClick={() => respond(inv, 'accepted')}
                      disabled={busyId === inv.id}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--primary)] disabled:opacity-50"
                    >
                      {busyId === inv.id ? 'Saving…' : 'Accept after all'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
