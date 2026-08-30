'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ProfileSummary } from '@/lib/types';

function label(p: ProfileSummary): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
}

export function ResumeProfilePicker({
  profiles,
  selectedId,
}: {
  profiles: ProfileSummary[];
  selectedId: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const owned = profiles.filter((p) => p.canEdit);
  const shared = profiles.filter((p) => !p.canEdit);

  function select(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set('profile', id);
    // Page 1: resume status is fetched for the jobs on screen, and keeping a
    // deep page while switching profiles shows a list the user did not ask for.
    next.delete('page');
    router.push(`/?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm md:hidden">
      <span className="text-[var(--muted)]">Resumes for</span>
      <select
        value={selectedId}
        onChange={(e) => select(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)]"
      >
        {owned.length > 0 && shared.length > 0 ? (
          <>
            <optgroup label="Your profiles">
              {owned.map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Shared with you">
              {shared.map((p) => (
                <option key={p.id} value={p.id}>
                  {label(p)} — {p.owner.email}
                </option>
              ))}
            </optgroup>
          </>
        ) : (
          profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {label(p)}
              {p.canEdit ? '' : ` — ${p.owner.email}`}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
