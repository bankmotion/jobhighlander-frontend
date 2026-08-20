'use client';

import { useState } from 'react';
import type { Profile, ProfileSummary } from '@/lib/types';
import { ProfileEditor, type ProfilePayload } from './profile-editor';
import { Toast, useToast } from './toast';

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; id: number };

export function ProfilesManager({ initial }: { initial: ProfileSummary[] }) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>(initial);
  const [view, setView] = useState<View>({ mode: 'list' });
  const [editing, setEditing] = useState<Profile | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  async function refresh() {
    const res = await fetch('/api/admin/profiles', { cache: 'no-store' });
    if (res.ok) setProfiles(await res.json());
  }

  async function openProfile(id: number) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/profiles/${id}`, { cache: 'no-store' });
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
    const url = isNew ? '/api/admin/profiles' : `/api/admin/profiles/${(view as { id: number }).id}`;
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
    const name = profiles.find((p) => p.id === view.id);
    const label =
      [name?.firstName, name?.lastName].filter(Boolean).join(' ') || name?.email || 'Profile';
    try {
      const res = await fetch(`/api/admin/profiles/${view.id}`, { method: 'DELETE' });
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

  if (view.mode !== 'list') {
    return (
      <>
        <ProfileEditor
          profile={editing}
          onSave={save}
          onCancel={backToList}
          onDelete={view.mode === 'edit' ? remove : undefined}
        />
        <Toast toast={toast} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          {profiles.length} profile{profiles.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={openNew}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
        >
          + New Profile
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          No profiles yet. Create one to manage a candidate’s personal info, work experience, and education.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => {
            const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Untitled profile';
            return (
              <li key={p.id}>
                <button
                  onClick={() => openProfile(p.id)}
                  disabled={loadingId === p.id}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--border-strong)] disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-white">{name}</span>
                    {loadingId === p.id && <span className="text-xs text-[var(--muted)]">Loading…</span>}
                  </div>
                  {(p.email || p.location) && (
                    <div className="mt-1 truncate text-sm text-[var(--muted)]">
                      {[p.email, p.location].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5">
                      {p._count.workExperiences} experience{p._count.workExperiences === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5">
                      {p._count.educations} education
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Also mounted here, not only in the editor branch: a successful delete
          navigates back to the list before the toast is shown, so a toast that
          only existed on the editor screen would never be seen. */}
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
