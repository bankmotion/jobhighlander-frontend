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
 *
 * Owned and shared profiles are split into two groups rather than listed flat.
 * Two profiles can carry the SAME person's name — an admin's own and one an
 * admin shared with them — and the name alone would not say which is which, or
 * that generating from the shared one writes onto a profile someone else owns.
 *
 * Shown only below `md`, where the sidebar is hidden and its per-profile Jobs
 * entries are unreachable. On a wide screen the sidebar IS this control, and
 * two selects driving one piece of state is a bug report waiting to happen.
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
        {/* Groups are omitted when one side is empty: a lone "Shared with you"
            heading over every option is a label, not a distinction. */}
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
