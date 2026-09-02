'use client';

import { useMemo, useState } from 'react';
import type { AdminProfileRow } from '@/lib/admin-profiles';
import { ROLE_TONE } from '@/lib/team-stats';

type Filter = 'all' | 'enabled' | 'disabled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'enabled', label: 'AI enabled' },
  { key: 'disabled', label: 'AI disabled' },
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export function AdminProfilesTable({ initial }: { initial: AdminProfileRow[] }) {
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Per-row, so one slow request cannot lock the whole table.
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'enabled' && !r.aiEnabled) return false;
      if (filter === 'disabled' && r.aiEnabled) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        r.owner.email.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  async function toggle(row: AdminProfileRow) {
    if (busy.has(row.id)) return;
    const next = !row.aiEnabled;
    setError(null);
    setBusy((prev) => new Set(prev).add(row.id));
    // Optimistic: the switch is the thing being clicked, so it has to move
    // immediately. Rolled back below if the server disagrees.
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, aiEnabled: next } : r)));
    try {
      const res = await fetch(`/api/profiles/${row.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, aiEnabled: row.aiEnabled } : r)));
      setError(`Could not change AI access for ${row.name}. It has been left as it was.`);
    } finally {
      setBusy((prev) => {
        const n = new Set(prev);
        n.delete(row.id);
        return n;
      });
    }
  }

  const enabled = rows.filter((r) => r.aiEnabled).length;

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Profiles" value={rows.length} />
        <Stat label="AI enabled" value={enabled} hint={`${rows.length - enabled} disabled`} />
        <Stat
          label="Resumes generated"
          value={rows.reduce((n, r) => n + r.resumes, 0)}
          hint="All time, across every profile"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by profile or owner"
          className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
        />
        <span className="ml-auto text-xs text-[var(--muted)]">
          {shown.length} of {rows.length}
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-5 py-3 font-medium">Profile</th>
              <th className="px-3 py-3 font-medium">Owner</th>
              <th className="px-3 py-3 text-right font-medium">Members</th>
              <th className="px-3 py-3 text-right font-medium">Bids</th>
              <th className="px-3 py-3 text-right font-medium">Resumes</th>
              <th className="px-3 py-3 font-medium">Updated</th>
              <th className="px-5 py-3 text-right font-medium">AI credit</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                  No profile matches.
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    r.aiEnabled ? '' : 'text-[var(--muted)]'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={r.aiEnabled ? 'font-medium text-[var(--text)]' : ''}>
                        {r.name}
                      </span>
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
                  <td className="px-3 py-3 text-xs">{fmtDate(r.updatedAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <span className={`text-xs ${r.aiEnabled ? 'text-emerald-300' : 'text-[var(--muted)]'}`}>
                        {r.aiEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.aiEnabled}
                        aria-label={`${r.aiEnabled ? 'Disable' : 'Enable'} AI credit for ${r.name}`}
                        disabled={busy.has(r.id)}
                        onClick={() => toggle(r)}
                        className={`relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-50 ${
                          r.aiEnabled
                            ? 'border-emerald-400/50 bg-emerald-500/80'
                            : 'border-[var(--border-strong)] bg-[var(--surface-2)]'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all ${
                            r.aiEnabled ? 'left-[1.5rem]' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </td>
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
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-white">{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
