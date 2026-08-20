'use client';

import { useState } from 'react';
import type { InvitationStatus, InvitedUser, SharedProfile } from '@/lib/types';
import type { Role } from '@/lib/session';
import { ConfirmModal } from './confirm-modal';
import { Toast, useToast } from './toast';

const ROLE_BADGE: Record<Role, string> = {
  super_admin: 'bg-purple-500/15 text-purple-300',
  admin: 'bg-blue-500/15 text-blue-300',
  bidder: 'bg-green-500/15 text-green-300',
  guest: 'bg-amber-500/15 text-amber-300',
};

const STATUS_META: Record<InvitationStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-300' },
  accepted: { label: 'Has access', cls: 'bg-green-500/15 text-green-300' },
  declined: { label: 'Declined', cls: 'bg-red-500/15 text-red-300' },
};

const profileName = (p: SharedProfile): string =>
  [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;

/** What removing an invitation means depends on whether it was ever accepted. */
type Removing = { profileId: number; user: InvitedUser; status: InvitationStatus };

/**
 * Per-profile sharing for the profiles this admin owns.
 *
 * Invitations are a request, not a grant: sending one only puts it in the other
 * user's inbox, and the row stays `pending` until they answer. That is why a
 * freshly invited user shows as "Pending" here rather than as having access.
 */
export function BiddersManager({ initial }: { initial: SharedProfile[] }) {
  const [profiles, setProfiles] = useState<SharedProfile[]>(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const { toast, show, dismiss } = useToast();

  async function refresh() {
    const res = await fetch('/api/admin/bidders', { cache: 'no-store' });
    if (res.ok) setProfiles(await res.json());
  }

  /** Resolves to true when the invitation went out, so the card can clear its input. */
  async function invite(profileId: number, email: string): Promise<boolean> {
    setBusyId(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // The backend distinguishes "no such account", "still awaiting
        // approval" and "already has access" — an admin who typed an address
        // needs to know which, so its message is shown rather than a generic one.
        show(data?.error ?? `Could not send the invitation (${res.status})`, 'error');
        return false;
      }
      await refresh();
      show(`Invitation sent to ${data?.user?.email ?? email}`);
      return true;
    } catch {
      show('Could not reach the server.', 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function revoke({ profileId, user }: Removing) {
    setBusyId(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}/invitations/${user.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        show(d?.error ?? `Could not remove the invitation (${res.status})`, 'error');
        return;
      }
      await refresh();
      show(`${user.email} removed`);
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusyId(null);
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      {profiles.map((p) => (
        <ProfileShareCard
          key={p.id}
          profile={p}
          busy={busyId === p.id}
          onInvite={(email) => invite(p.id, email)}
          onRemove={(inv) => setRemoving({ profileId: p.id, user: inv.user, status: inv.status })}
        />
      ))}

      <ConfirmModal
        open={removing !== null}
        title={removing?.status === 'accepted' ? 'Revoke access?' : 'Withdraw invitation?'}
        message={
          removing?.status === 'accepted'
            ? `${removing.user.email} will lose access to this profile and it will disappear from their Profiles page. Resumes already generated stay on the profile.`
            : `Withdraw the invitation to ${removing?.user.email ?? 'this user'}? You can send a new one later.`
        }
        confirmLabel={removing?.status === 'accepted' ? 'Revoke' : 'Withdraw'}
        busy={busyId !== null}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && revoke(removing)}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

/** One owned profile: who it is shared with, plus the invite-by-email control. */
function ProfileShareCard({
  profile,
  busy,
  onInvite,
  onRemove,
}: {
  profile: SharedProfile;
  busy: boolean;
  onInvite: (email: string) => Promise<boolean>;
  onRemove: (invitation: SharedProfile['invitations'][number]) => void;
}) {
  const [email, setEmail] = useState('');

  async function send() {
    const address = email.trim();
    if (!address) return;
    // Cleared only on success, so a rejected address stays in the field to be
    // corrected rather than having to be retyped from memory.
    if (await onInvite(address)) setEmail('');
  }

  const accepted = profile.invitations.filter((i) => i.status === 'accepted').length;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-white">{profileName(profile)}</h2>
          <p className="text-sm text-[var(--muted)]">
            {accepted === 0
              ? 'Not shared with anyone yet'
              : `${accepted} user${accepted === 1 ? '' : 's'} with access`}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex shrink-0 items-center gap-2"
        >
          <input
            type="email"
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="bidder@example.com"
            aria-label={`Email to invite to ${profileName(profile)}`}
            className="w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="jh-cta rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </div>

      {profile.invitations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          No invitations sent for this profile.
        </p>
      ) : (
        <ul className="space-y-2">
          {profile.invitations.map((inv) => {
            const meta = STATUS_META[inv.status];
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-2.5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm text-[var(--text)]">{inv.user.email}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[inv.user.role]}`}
                  >
                    {inv.user.role}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <button
                  onClick={() => onRemove(inv)}
                  disabled={busy}
                  className="shrink-0 text-xs text-[var(--muted)] transition hover:text-red-400 disabled:opacity-50"
                >
                  {inv.status === 'accepted' ? 'Revoke access' : 'Withdraw'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
