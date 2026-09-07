'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProfileSummary } from '@/lib/types';
import {
  addBlacklistEntry,
  deleteBlacklistEntry,
  loadBlacklist,
  scopeLabel,
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

  // add form
  const [company, setCompany] = useState('');
  // 'all' or the chosen profile ids — the two scopes the API accepts.
  const [scope, setScope] = useState<'all' | number[]>('all');

  // inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState('');
  const [editScope, setEditScope] = useState<'all' | number>('all');

  async function reload(profileId?: number) {
    setEntries(await loadBlacklist(profileId));
  }

  useEffect(() => {
    void reload(filter === 'all' ? undefined : filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Global entries apply to every profile, so they stay visible under a profile
  // filter too — hiding them would make this page disagree with the flags on
  // the job list, which is the thing it exists to explain.
  const shown = entries;
  const globalCount = useMemo(() => shown.filter((e) => e.profileId === null).length, [shown]);

  async function onAdd() {
    const name = company.trim();
    if (!name) return;
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
      // Says what happened to BOTH halves: a silent success on a duplicate
      // would leave you wondering why the list did not grow.
      text: added
        ? `Added ${name}${skipped ? ` — ${skipped} already blacklisted` : ''}`
        : `${name} was already blacklisted for that scope`,
    });
    setCompany('');
    await reload(filter === 'all' ? undefined : filter);
  }

  async function onSaveEdit(id: number) {
    setBusy(true);
    setMsg(null);
    const res = await updateBlacklistEntry(id, {
      company: editCompany.trim(),
      profileId: editScope === 'all' ? null : editScope,
    });
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.error ?? 'Could not save' });
      return;
    }
    setEditingId(null);
    await reload(filter === 'all' ? undefined : filter);
  }

  async function onDelete(e: BlacklistEntry) {
    if (!confirm(`Remove "${e.company}" from the blacklist (${scopeLabel(e)})?`)) return;
    setBusy(true);
    setMsg(null);
    const res = await deleteBlacklistEntry(e.id);
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.error ?? 'Could not remove' });
      return;
    }
    await reload(filter === 'all' ? undefined : filter);
  }

  function toggleProfile(id: number) {
    setScope((cur) => {
      if (cur === 'all') return [id];
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
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
              placeholder="e.g. Bright Vision Technologies"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)]"
            />
          </div>
          <button
            onClick={() => void onAdd()}
            disabled={busy || !company.trim()}
            className="jh-cta mt-auto rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add to blacklist'}
          </button>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-sm text-[var(--text)]">Applies to</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setScope('all')}
              aria-pressed={scope === 'all'}
              title="Every profile, including ones added later"
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                scope === 'all'
                  ? 'bg-[var(--primary)] font-medium text-white'
                  : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              All profiles
            </button>
            {profiles.map((p) => {
              const on = scope !== 'all' && scope.includes(p.id);
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
            <p className="mt-2 text-xs text-amber-300">
              Pick at least one profile, or choose “All profiles”.
            </p>
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
              <option value="all">Every profile I can see</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {profileName(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filter !== 'all' && globalCount > 0 && (
          <p className="mb-3 text-xs text-[var(--muted)]">
            Includes {globalCount} entr{globalCount === 1 ? 'y' : 'ies'} that apply to all profiles —
            they affect this profile too.
          </p>
        )}

        {shown.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nothing blacklisted yet. Jobs from companies added here get a flag on the job list.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
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
                {shown.map((e) => {
                  const editing = editingId === e.id;
                  return (
                    <tr key={e.id} className="border-t border-[var(--border)] align-middle">
                      <td className="py-2.5 pr-4">
                        {editing ? (
                          <input
                            value={editCompany}
                            onChange={(ev) => setEditCompany(ev.target.value)}
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
                          />
                        ) : (
                          <span className="font-medium text-white">{e.company}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {editing ? (
                          <select
                            value={editScope === 'all' ? 'all' : String(editScope)}
                            onChange={(ev) =>
                              setEditScope(
                                ev.target.value === 'all' ? 'all' : Number(ev.target.value),
                              )
                            }
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
                          >
                            <option value="all">All profiles</option>
                            {profiles.map((p) => (
                              <option key={p.id} value={p.id}>
                                {profileName(p)}
                              </option>
                            ))}
                          </select>
                        ) : e.profileId === null ? (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-400/30">
                            All profiles
                          </span>
                        ) : (
                          <span className="text-[var(--text)]">{scopeLabel(e)}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-[var(--muted)]">{e.createdBy.email}</td>
                      <td className="py-2.5 pr-4 text-[var(--muted)]">{when(e.createdAt)}</td>
                      <td className="py-2.5 text-right">
                        {editing ? (
                          <span className="inline-flex gap-2">
                            <button
                              onClick={() => void onSaveEdit(e.id)}
                              disabled={busy || !editCompany.trim()}
                              className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex gap-2">
                            <button
                              onClick={() => {
                                setEditingId(e.id);
                                setEditCompany(e.company);
                                setEditScope(e.profileId === null ? 'all' : e.profileId);
                                setMsg(null);
                              }}
                              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void onDelete(e)}
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
