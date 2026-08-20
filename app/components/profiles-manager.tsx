'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile, ProfileSummary, ReceivedInvitation } from '@/lib/types';
import { invitationProfileName, respondToInvitation } from '@/lib/invitations';
import { ProfileEditor, type ProfilePayload } from './profile-editor';
import { Toast, useToast } from './toast';

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; id: number };

const nameOf = (p: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string => [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Untitled profile';

/**
 * The Profiles page for every signed-in role.
 *
 * A user sees two kinds of profile: the ones they own (admins only — creating
 * is an admin action) and the ones they accepted an invitation to, which are
 * strictly read-only. `canEdit` comes from the API per profile rather than being
 * inferred from the role here, so the two can never disagree.
 */
export function ProfilesManager({
  initial,
  invitations,
  canCreate,
}: {
  initial: ProfileSummary[];
  /** Invitations addressed to this user; the pending ones need an answer. */
  invitations: ReceivedInvitation[];
  /** Whether this role may create profiles at all (admins and super admins). */
  canCreate: boolean;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileSummary[]>(initial);
  const [pending, setPending] = useState<ReceivedInvitation[]>(
    invitations.filter((i) => i.status === 'pending'),
  );
  const [view, setView] = useState<View>({ mode: 'list' });
  const [editing, setEditing] = useState<Profile | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  const owned = profiles.filter((p) => p.canEdit);
  const shared = profiles.filter((p) => !p.canEdit);

  async function refresh() {
    const res = await fetch('/api/profiles', { cache: 'no-store' });
    if (res.ok) setProfiles(await res.json());
  }

  async function openProfile(id: number) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setEditing(await res.json());
      setView({ mode: 'edit', id });
    } catch {
      setError('Could not load that profile.');
    } finally {
      setLoadingId(null);
    }
  }

  function openNew() {
    setEditing(null);
    setError(null);
    setView({ mode: 'new' });
  }

  async function backToList() {
    setView({ mode: 'list' });
    setEditing(null);
    await refresh();
  }

  async function save(data: ProfilePayload): Promise<boolean> {
    const isNew = view.mode === 'new';
    const url = isNew ? '/api/profiles' : `/api/profiles/${(view as { id: number }).id}`;
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await backToList();
      return true;
    }
    setError('Could not save the profile.');
    return false;
  }

  /**
   * Returns whether the delete actually succeeded, so the editor can reopen
   * itself instead of navigating away. Previously this ignored the response and
   * always went back to the list — a rejected delete looked identical to a
   * successful one until the refetched list showed the profile still there.
   */
  async function remove(): Promise<boolean> {
    if (view.mode !== 'edit') return false;
    const target = profiles.find((p) => p.id === view.id);
    const label = target ? nameOf(target) : 'Profile';
    try {
      const res = await fetch(`/api/profiles/${view.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        show(d?.error ?? `Could not delete the profile (${res.status})`, 'error');
        return false;
      }
      await backToList();
      show(`${label} deleted`);
      return true;
    } catch {
      show('Could not reach the server.', 'error');
      return false;
    }
  }

  /**
   * Accept or decline an invitation. Accepting is what actually grants access,
   * so the list is refetched rather than patched locally — the new profile has
   * to arrive carrying the `canEdit` the server decided, not one assumed here.
   */
  async function respond(invitation: ReceivedInvitation, status: 'accepted' | 'declined') {
    setAnsweringId(invitation.id);
    const result = await respondToInvitation(invitation.id, status);
    setAnsweringId(null);
    if (!result.ok) {
      show(result.error, 'error');
      return;
    }
    setPending((list) => list.filter((i) => i.id !== invitation.id));
    const label = invitationProfileName(invitation);
    if (status === 'accepted') {
      await refresh();
      show(`${label} added to your profiles`);
    } else {
      show(`Invitation to ${label} declined`);
    }
    // The header inbox badge is rendered on the server, so it only drops once
    // the route re-renders.
    router.refresh();
  }

  if (view.mode !== 'list') {
    const readOnly = view.mode === 'edit' && editing?.canEdit === false;
    return (
      <>
        <ProfileEditor
          profile={editing}
          onSave={save}
          onCancel={backToList}
          onDelete={view.mode === 'edit' && !readOnly ? remove : undefined}
          readOnly={readOnly}
          ownerEmail={editing?.owner?.email}
        />
        <Toast toast={toast} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <div>
      {pending.length > 0 && (
        <section className="mb-6 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/5 p-4">
          <h2 className="mb-1 text-sm font-semibold text-white">
            {pending.length} profile invitation{pending.length === 1 ? '' : 's'}
          </h2>
          <p className="mb-3 text-sm text-[var(--muted)]">
            Accept to use the profile for resumes. You will be able to view it, but not edit it.
          </p>
          <ul className="space-y-2">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">
                    {invitationProfileName(inv)}
                  </div>
                  <div className="truncate text-sm text-[var(--muted)]">
                    from {inv.invitedBy.email}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => respond(inv, 'declined')}
                    disabled={answeringId === inv.id}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => respond(inv, 'accepted')}
                    disabled={answeringId === inv.id}
                    className="jh-cta rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-60"
                  >
                    {answeringId === inv.id ? 'Saving…' : 'Accept'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {profiles.length} profile{profiles.length === 1 ? '' : 's'}
          {shared.length > 0 && ` · ${shared.length} shared with you`}
        </p>
        {canCreate && (
          <button
            onClick={openNew}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          >
            + New Profile
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          {canCreate
            ? 'No profiles yet. Create one to hold a candidate’s personal info, work experience, and education.'
            : 'No profiles yet. An admin can invite you to one of theirs from their Bidders page.'}
        </div>
      ) : (
        <div className="space-y-8">
          {owned.length > 0 && (
            <ProfileGroup
              title={shared.length > 0 ? 'Your profiles' : 'Profiles'}
              hint="You created these — you can edit and delete them."
              profiles={owned}
              loadingId={loadingId}
              onOpen={openProfile}
            />
          )}
          {shared.length > 0 && (
            <ProfileGroup
              title="Shared with you"
              hint="Invited by their owner. You can use them for resumes, but not edit them."
              profiles={shared}
              loadingId={loadingId}
              onOpen={openProfile}
            />
          )}
        </div>
      )}

      {/* Also mounted here, not only in the editor branch: a successful delete
          navigates back to the list before the toast is shown, so a toast that
          only existed on the editor screen would never be seen. */}
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

/** One titled band of profile cards — "Your profiles" or "Shared with you". */
function ProfileGroup({
  title,
  hint,
  profiles,
  loadingId,
  onOpen,
}: {
  title: string;
  hint: string;
  profiles: ProfileSummary[];
  loadingId: number | null;
  onOpen: (id: number) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mb-3 text-xs text-[var(--muted)]">{hint}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {profiles.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onOpen(p.id)}
              disabled={loadingId === p.id}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--border-strong)] disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-white">{nameOf(p)}</span>
                {loadingId === p.id ? (
                  <span className="shrink-0 text-xs text-[var(--muted)]">Loading…</span>
                ) : (
                  !p.canEdit && (
                    <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      View only
                    </span>
                  )
                )}
              </div>
              {(p.email || p.location) && (
                <div className="mt-1 truncate text-sm text-[var(--muted)]">
                  {[p.email, p.location].filter(Boolean).join(' · ')}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5">
                  {p._count.workExperiences} experience{p._count.workExperiences === 1 ? '' : 's'}
                </span>
                <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5">
                  {p._count.educations} education
                </span>
                {!p.canEdit && (
                  <span className="truncate rounded-md bg-[var(--surface-2)] px-2 py-0.5">
                    owner: {p.owner.email}
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
