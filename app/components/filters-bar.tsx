'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { JobFilters } from '@/lib/types';
import type { AppliedFilter } from '@/lib/applications';
import type { DiscardedFilter } from '@/lib/discards';
import { MultiSelect } from './multi-select';

interface Props {
  filters: JobFilters;
  current: {
    q: string;
    sites: string[];
    remote: boolean;
    profile?: number;
    applied: AppliedFilter;
    discarded: DiscardedFilter;
  };
  /** Applied is per profile; without one the control has nothing to filter by. */
  canFilterApplied: boolean;
}

const DISCARDED_TABS: { value: DiscardedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'undiscarded', label: 'Kept' },
  { value: 'discarded', label: 'Discarded' },
];

const APPLIED_TABS: { value: AppliedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'unapplied', label: 'Not applied' },
];

const inputCls =
  'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)]';

/** Per-source display name + accent dot. Falls back to a capitalised label. */
export const SITE_META: Record<string, { label: string; dot: string }> = {
  indeed: { label: 'Indeed', dot: '#4f74e3' },
  glassdoor: { label: 'Glassdoor', dot: '#22c55e' },
  jobright: { label: 'JobRight', dot: '#8b5cf6' },
  weworkremotely: { label: 'WeWorkRemotely', dot: '#f59e0b' },
  himalayas: { label: 'Himalayas', dot: '#14b8a6' },
  findmyremote: { label: 'FindMyRemote', dot: '#ec4899' },
  jobicy: { label: 'Jobicy', dot: '#eab308' },
  themuse: { label: 'The Muse', dot: '#06b6d4' },
};
export function siteMeta(s: string) {
  return (
    SITE_META[s] ?? {
      label: s.charAt(0).toUpperCase() + s.slice(1),
      dot: 'var(--primary)',
    }
  );
}

export function FiltersBar({ filters, current, canFilterApplied }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(current.q);
  const [remote, setRemote] = useState(current.remote);
  const [sites, setSites] = useState<string[]>(current.sites);
  const [applied, setApplied] = useState<AppliedFilter>(current.applied);
  const [discarded, setDiscarded] = useState<DiscardedFilter>(current.discarded);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the sources dropdown on an outside click or Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function navigate(next: {
    q: string;
    sites: string[];
    remote: boolean;
    applied?: AppliedFilter;
    discarded?: DiscardedFilter;
  }) {
    const qs = new URLSearchParams();
    if (next.q.trim()) qs.set('q', next.q.trim());
    next.sites.forEach((s) => qs.append('site', s));
    if (!next.remote) qs.set('remote', '0'); // remote-only is the default
    const nextApplied = next.applied ?? applied;
    if (nextApplied !== 'all') qs.set('applied', nextApplied); // all is the default
    const nextDiscarded = next.discarded ?? discarded;
    if (nextDiscarded !== 'all') qs.set('discarded', nextDiscarded); // all is the default
    // Filters change WHAT is listed; they must never change WHOSE resumes are
    // reported alongside it.
    if (current.profile) qs.set('profile', String(current.profile));
    const s = qs.toString();
    router.push(s ? `/?${s}` : '/');
  }

  function selectApplied(next: AppliedFilter) {
    setApplied(next);
    navigate({ q, sites, remote, applied: next }); // applies instantly
  }

  function selectDiscarded(next: DiscardedFilter) {
    setDiscarded(next);
    navigate({ q, sites, remote, discarded: next }); // applies instantly
  }

  function toggleSite(s: string) {
    const next = sites.includes(s) ? sites.filter((x) => x !== s) : [...sites, s];
    setSites(next);
    navigate({ q, sites: next, remote }); // sources apply instantly
  }

  function clearSites() {
    setSites([]);
    navigate({ q, sites: [], remote });
  }

  function toggleRemote() {
    const next = !remote;
    setRemote(next);
    navigate({ q, sites, remote: next }); // applies instantly
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q, sites, remote });
  }

  function clearAll() {
    setQ('');
    setSites([]);
    setRemote(true); // back to the default (remote-only)
    setApplied('all');
    setDiscarded('all');
    // Clearing FILTERS must not also reset the selected profile.
    router.push(current.profile ? `/?profile=${current.profile}` : '/');
  }

  // "Filtered" = anything other than the default (remote-only, everything else off).
  const hasFilters = Boolean(
    q.trim() || sites.length || !remote || applied !== 'all' || discarded !== 'all',
  );

  return (
    <form
      onSubmit={submit}
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
    >
      {/* Search */}
      <div className="relative min-w-[220px] flex-1">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jobs…"
          className={`w-full pl-9 ${inputCls}`}
        />
      </div>

      {/* Sources — shared control, so this and the scrape-status filters behave
          identically (including Select all / Clear all). */}
      <MultiSelect
        placeholder="All sources"
        options={filters.sites.map((x) => ({ value: x, ...siteMeta(x) }))}
        selected={sites}
        onChange={(next) => {
          setSites(next);
          navigate({ q, sites: next, remote });
        }}
      />

      {/* Remote-only toggle (checked by default) */}
      <button
        type="button"
        role="checkbox"
        aria-checked={remote}
        onClick={toggleRemote}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
          remote
            ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-white'
            : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
        }`}
      >
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border transition ${
            remote ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border-strong)]'
          }`}
        >
          {remote && (
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        Remote only
      </button>

      {/* Applied — a segmented control rather than a checkbox, because there
          are three states and "all" is a real choice, not the absence of one.
          Hidden without a profile: applied is recorded per profile, so with
          none there is nothing the filter could select on. */}
      {canFilterApplied && (
        <div
          role="radiogroup"
          aria-label="Applied"
          className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          {APPLIED_TABS.map((t) => {
            const on = applied === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => selectApplied(t.value)}
                className={`rounded-md px-2.5 py-1.5 text-sm transition ${
                  on
                    ? 'bg-[var(--primary)] font-medium text-white'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Discarded — its own control rather than a fourth tab on the applied
          one: the two are independent, and "not discarded AND not applied" is
          the shortlist someone actually works from. Folding them into one
          three-state control would make that combination unreachable.

          "Kept" rather than "Not discarded": it is the state most of the list
          is in, and a segmented control reads better with a positive middle
          option than with a negated one. */}
      {canFilterApplied && (
        <div
          role="radiogroup"
          aria-label="Discarded"
          className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          {DISCARDED_TABS.map((t) => {
            const on = discarded === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => selectDiscarded(t.value)}
                className={`rounded-md px-2.5 py-1.5 text-sm transition ${
                  on
                    ? 'bg-[var(--primary)] font-medium text-white'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="submit"
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
      >
        Filter
      </button>
      <button
        type="button"
        onClick={clearAll}
        disabled={!hasFilters}
        className="text-sm text-[var(--muted)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[var(--muted)]"
      >
        Clear
      </button>
    </form>
  );
}

function RowButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
        selected ? 'bg-[var(--primary)]/10 text-white' : 'text-[var(--text)] hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
