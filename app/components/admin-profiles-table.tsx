'use client';

import { useMemo, useState } from 'react';
import type { AdminProfileRow } from '@/lib/admin-profiles';
import { ROLE_TONE } from '@/lib/team-stats';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Every profile in the system, for oversight.
 *
 * Read-only. The per-profile AI switch that used to live here is gone: whether
 * a generation can happen is now decided by the user's prepaid balance alone.
 * Two controls for one decision meant a profile could be "enabled" with no
 * credit behind it, or funded while switched off, and neither screen explained
 * the other.
 */
export function AdminProfilesTable({ initial }: { initial: AdminProfileRow[] }) {
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        r.owner.email.toLowerCase().includes(q),
    );
  }, [initial, query]);

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Profiles" value={initial.length} />
        <Stat
          label="Bids marked"
          value={initial.reduce((n, r) => n + r.applications, 0)}
          hint="All time, across every profile"
        />
        <Stat
          label="Resumes generated"
          value={initial.reduce((n, r) => n + r.resumes, 0)}
          hint="All time, across every profile"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by profile or owner"
          className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
        />
        <span className="ml-auto text-xs text-[var(--muted)]">
          {shown.length} of {initial.length}
        </span>
      </div>

      <section className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-5 py-3 font-medium">Profile</th>
              <th className="px-3 py-3 font-medium">Owner</th>
              <th className="px-3 py-3 text-right font-medium">Members</th>
              <th className="px-3 py-3 text-right font-medium">Bids</th>
              <th className="px-3 py-3 text-right font-medium">Resumes</th>
              <th className="px-5 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                  No profile matches.
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--text)]">{r.name}</span>
                      <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
                        #{r.id}
                      </span>
                    </div>
                    {r.location && <p className="text-xs text-[var(--muted)]">{r.location}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs">{r.owner.email}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          ROLE_TONE[r.owner.role] ?? 'bg-[var(--surface-2)] text-[var(--muted)]'
                        }`}
                      >
                        {r.owner.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.memberCount}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.applications}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.resumes}</td>
                  <td className="px-5 py-3 text-xs">{fmtDate(r.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
