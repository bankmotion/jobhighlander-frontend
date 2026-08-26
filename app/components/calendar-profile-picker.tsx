'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ProfileSummary } from '@/lib/types';

const ALL = 'all';

function label(p: ProfileSummary): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
}

/**
 * Narrow the calendar to one candidate.
 *
 * "All profiles" IS THE DEFAULT and stays first in the list, because the merged
 * view is the reason this page exists — two candidates booked into the same
 * afternoon is the thing a per-profile view structurally cannot show. This
 * control is for the other half of the job: preparing for one person's week
 * without the rest of the roster in the way.
 *
 * Shown at every width, unlike `ResumeProfilePicker`, which hides above `md`
 * because the sidebar's per-profile Jobs entries already are that control. The
 * Calendar nav entry is deliberately flat — see the sidebar — so there is no
 * wider-screen equivalent for this to duplicate.
 *
 * The choice goes in the URL rather than local state, so the SERVER fetch is
 * already narrowed. Holding it in component state would mean fetching every
 * profile's sittings and hiding most of them, which gets slower with each
 * candidate the agency takes on.
 */
export function CalendarProfilePicker({
  profiles,
  selectedId,
}: {
  profiles: ProfileSummary[];
  /** null = all profiles. */
  selectedId: number | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const owned = profiles.filter((p) => p.canEdit);
  const shared = profiles.filter((p) => !p.canEdit);

  function select(value: string) {
    // Built from the CURRENT params so `view` and `date` survive: switching
    // candidate must not also throw you back to this month.
    const next = new URLSearchParams(params.toString());
    if (value === ALL) next.delete('profile');
    else next.set('profile', value);
    router.push(`/calendar?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-[var(--muted)]">Showing</span>
      <select
        value={selectedId ?? ALL}
        onChange={(e) => select(e.target.value)}
        aria-label="Filter the calendar by profile"
        className="max-w-[13rem] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
      >
        <option value={ALL}>All profiles</option>
        {/* Groups are omitted when one side is empty: a lone "Shared with you"
            heading over every option is a label, not a distinction. Two
            profiles can also carry the SAME person's name — an admin's own and
            one shared with them — which the owner's email is what separates. */}
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
