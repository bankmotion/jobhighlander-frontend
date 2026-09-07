'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProfileSummary } from '@/lib/types';
import {
  addBlacklistEntry,
  deleteBlacklistEntry,
  loadBlacklist,
  profileLabel,
  updateBlacklistEntry,
  type BlacklistEntry,
} from '@/lib/blacklist';

const profileName = (p: ProfileSummary) =>
  [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.email || `Profile #${p.id}`;

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * One company, and the profiles it is blacklisted for.
 *
 * The API stores a row per profile, but a person thinks in companies: adding
 * "CrowdStrike" for both your profiles is one decision, and showing it as two
 * identical rows would read as a duplicate rather than as a scope.
 */
interface Group {
  companyKey: string;
  company: string;
  entries: BlacklistEntry[];
  addedBy: string[];
  addedAt: string;
}

function groupByCompany(entries: BlacklistEntry[]): Group[] {
  const by = new Map<string, Group>();
  for (const e of entries) {
    const g = by.get(e.companyKey);
    if (g) {
      g.entries.push(e);
      if (!g.addedBy.includes(e.createdBy.email)) g.addedBy.push(e.createdBy.email);
      // The earliest add is when the decision was actually made.
      if (e.createdAt < g.addedAt) g.addedAt = e.createdAt;
    } else {
      by.set(e.companyKey, {
        companyKey: e.companyKey,
        company: e.company,
        entries: [e],
        addedBy: [e.createdBy.email],
        addedAt: e.createdAt,
      });
    }
  }
  return [...by.values()].sort((a, b) => a.company.localeCompare(b.company));
}

export function BlacklistManager({
  profiles,
  initial,
}: {
  profiles: ProfileSummary[];
  initial: BlacklistEntry[];
}) {
  const [entries, setEntries] = useState<BlacklistEntry[]>(initial);
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [company, setCompany] = useState('');
  const [scope, setScope] = useState<'all' | number[]>('all');

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editCompany, setEditCompany] = useState('');

  async function reload(profileId?: number) {
    setEntries(await loadBlacklist(profileId));
  }

  useEffect(() => {
    void reload(filter === 'all' ? undefined : filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const groups = useMemo(() => groupByCompany(entries), [entries]);
  const allMine = profiles.length;

  async function onAdd() {
    const name = company.trim();
    if (!name) return;
    if (scope !== 'all' && scope.length === 0) return;
    setBusy(true);
    setMsg(null);
    const res = await addBlacklistEntry(name, scope);
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.error ?? 'Could not add that company' });
      return;
    }
    const added = res.added ?? 0;
    const skipped = res.skipped ?? 0;
    setMsg({
      ok: true,
      // Names both halves: a silent success on a duplicate would leave you
      // wondering why the list did not grow.
      text: added
        ? `Blacklisted ${name} for ${added} profile${added === 1 ? '' : 's'}` +
          (skipped ? ` — ${skipped} already had it` : '')
        : `${name} was already blacklisted for ${skipped === 1 ? 'that profile' : 'those profiles'}`,
    });
    setCompany('');
    await reload(filter === 'all' ? undefined : filter);
  }

  async function onSaveEdit(g: Group) {
    const name = editCompany.trim();
    if (!name) return;
    setBusy(true);
    setMsg(null);
    // Renaming a company means renaming every row that stands for it.
    const results = await Promise.all(
      g.entries.map((e) => updateBlacklistEntry(e.id, { company: name })),
    );
    setBusy(false);
    const bad = results.find((r) => !r.ok);
    if (bad) {
      setMsg({ ok: false, text: bad.error ?? 'Could not save' });
      return;
    }
    setEditingKey(null);
    await reload(filter === 'all' ? undefined : filter);
  }

  async function onDeleteGroup(g: Group) {
    const where =
      g.entries.length === 1 ? profileLabel(g.entries[0]) : `${g.entries.length} profiles`;
    if (!confirm(`Remove "${g.company}" from the blacklist for ${where}?`)) return;
    setBusy(true);
    setMsg(null);
    const results = await Promise.all(g.entries.map((e) => deleteBlacklistEntry(e.id)));
    setBusy(false);
    const bad = results.find((r) => !r.ok);
    if (bad) setMsg({ ok: false, text: bad.error ?? 'Could not remove' });
    await reload(filter === 'all' ? undefined : filter);
  }

  async function onRemoveOne(e: BlacklistEntry) {
    setBusy(true);
    const res = await deleteBlacklistEntry(e.id);
    setBusy(false);
    if (!res.ok) setMsg({ ok: false, text: res.error ?? 'Could not remove' });
    await reload(filter === 'all' ? undefined : filter);
  }

  function toggleProfile(id: number) {
    setScope((cur) => {
      // Coming from "all", clicking one profile means "all except that one".
      if (cur === 'all') return profiles.map((p) => p.id).filter((x) => x !== id);
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });
  }

  return (
    <div className="space-y-5">
      {/* ── add ─────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Blacklist a company
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-[var(--text)]" htmlFor="bl-company">
              Company name
              <span className="ml-2 text-xs text-[var(--muted)]">
                matched on the whole name, not as a substring
              </span>
            </label>
            <input
              id="bl-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onAdd();
              }}
              placeholder="e.g. CrowdStrike"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)]"
            />
          </div>
          <button
            onClick={() => void onAdd()}
            disabled={busy || !company.trim() || (scope !== 'all' && scope.length === 0)}
            className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add to blacklist'}
          </button>
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-sm text-[var(--text)]">Applies to</span>
          {/* Said plainly, because "All" could easily be read as every profile
              in the system — it is not, and a rule you believe is team-wide but
              is not would be worse than no rule at all. */}
          <p className="mb-2 text-xs text-[var(--muted)]">
            Only your profiles — the ones you own plus any shared with you. Other users are not
            affected.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setScope('all')}
              aria-pressed={scope === 'all'}
              title="Every profile you can use right now"
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                scope === 'all'
                  ? 'bg-[var(--primary)] font-medium text-white'
                  : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              All my profiles ({allMine})
            </button>
            {profiles.map((p) => {
              const on = scope === 'all' || scope.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProfile(p.id)}
                  aria-pressed={on}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    on
                      ? 'bg-[var(--primary)] font-medium text-white'
                      : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {profileName(p)}
                </button>
              );
            })}
          </div>
          {scope !== 'all' && scope.length === 0 && (
            <p className="mt-2 text-xs text-amber-300">Pick at least one profile.</p>
          )}
        </div>

        {msg && (
          <p className={`mt-3 text-sm ${msg.ok ? 'text-green-300' : 'text-red-400'}`}>{msg.text}</p>
        )}
      </section>

      {/* ── list ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Blacklisted companies
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted)]" htmlFor="bl-filter">
              Show for
            </label>
            <select
              id="bl-filter"
              value={filter === 'all' ? 'all' : String(filter)}
              onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
            >
              <option value="all">All my profiles</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {profileName(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nothing blacklisted yet. Jobs from companies added here get a flag on the job list —
            they are never hidden.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="pb-2 pr-4 font-medium">Company</th>
                  <th className="pb-2 pr-4 font-medium">Applies to</th>
                  <th className="pb-2 pr-4 font-medium">Added by</th>
                  <th className="pb-2 pr-4 font-medium">Added</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const editing = editingKey === g.companyKey;
                  const everywhere = filter === 'all' && g.entries.length === allMine && allMine > 1;
                  return (
                    <tr key={g.companyKey} className="border-t border-[var(--border)] align-middle">
                      <td className="py-2.5 pr-4">
                        {editing ? (
                          <input
                            value={editCompany}
                            onChange={(ev) => setEditCompany(ev.target.value)}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
                          />
                        ) : (
                          <span className="font-medium text-white">{g.company}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {everywhere ? (
                          <span
                            title={g.entries.map((e) => profileLabel(e)).join(', ')}
                            className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-400/30"
                          >
                            All my profiles ({g.entries.length})
                          </span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {g.entries.map((e) => (
                              <span
                                key={e.id}
                                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text)] ring-1 ring-inset ring-[var(--border)]"
                              >
                                {profileLabel(e)}
                                {g.entries.length > 1 && (
                                  <button
                                    onClick={() => void onRemoveOne(e)}
                                    disabled={busy}
                                    title={`Stop blacklisting for ${profileLabel(e)}`}
                                    aria-label={`Remove ${g.company} for ${profileLabel(e)}`}
                                    className="text-[var(--muted)] transition hover:text-red-300"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-[var(--muted)]">{g.addedBy.join(', ')}</td>
                      <td className="py-2.5 pr-4 text-[var(--muted)]">{when(g.addedAt)}</td>
                      <td className="py-2.5 text-right">
                        {editing ? (
                          <span className="inline-flex gap-2">
                            <button
                              onClick={() => void onSaveEdit(g)}
                              disabled={busy || !editCompany.trim()}
                              className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-2">
                            <button
                              onClick={() => {
                                setEditingKey(g.companyKey);
                                setEditCompany(g.company);
                                setMsg(null);
                              }}
                              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void onDeleteGroup(g)}
                              disabled={busy}
                              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
