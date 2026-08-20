'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ProfileSummary } from '@/lib/types';

function label(p: ProfileSummary): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
}

/**
 * Which profile the list's resume actions build from.
 *
 * Rendered only when the user has more than one — with a single profile there
 * is no decision, and a control offering one option is just noise.
 *
 * The choice goes in the URL rather than local state so the server render is
 * already correct and the resume status for the page arrives with the first
 * paint.
 */
export function ResumeProfilePicker({
  profiles,
  selectedId,
}: {
  profiles: ProfileSummary[];
  selectedId: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function select(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set('profile', id);
    // Page 1: resume status is fetched for the jobs on screen, and keeping a
    // deep page while switching profiles shows a list the user did not ask for.
    next.delete('page');
    router.push(`/?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-[var(--muted)]">Resumes for</span>
      <select
        value={selectedId}
        onChange={(e) => select(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)]"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {label(p)}
          </option>
        ))}
      </select>
    </label>
  );
}
