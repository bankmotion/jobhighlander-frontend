'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { JobFilters } from '@/lib/types';
import type { AppliedFilter } from '@/lib/applications';
import type { DiscardedFilter } from '@/lib/discards';
import { MultiSelect } from './multi-select';
import { saveJobFilters } from '@/lib/job-filters';

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

  const { sites, remote, applied, discarded } = current;

  const [qDraft, setQDraft] = useState(current.q);
  const [committedQ, setCommittedQ] = useState(current.q);
  if (committedQ !== current.q) {
    setCommittedQ(current.q);
    setQDraft(current.q);
  }

  function navigate(next: {
    q?: string;
    sites?: string[];
    remote?: boolean;
    applied?: AppliedFilter;
    discarded?: DiscardedFilter;
  }) {
    const qs = new URLSearchParams();
    // The in-progress draft rides along, so toggling a source also applies
    // whatever has been typed but not yet submitted.
    const nextQ = (next.q ?? qDraft).trim();
    if (nextQ) qs.set('q', nextQ);
    (next.sites ?? sites).forEach((s) => qs.append('site', s));
    if (!(next.remote ?? remote)) qs.set('remote', '0'); // remote-only is the default
    const nextApplied = next.applied ?? applied;
    if (nextApplied !== 'all') qs.set('applied', nextApplied); // all is the default
    const nextDiscarded = next.discarded ?? discarded;
    if (nextDiscarded !== 'all') qs.set('discarded', nextDiscarded); // all is the default
    // Filters change WHAT is listed; they must never change WHOSE resumes are
    // reported alongside it.
    if (current.profile) qs.set('profile', String(current.profile));
    const s = qs.toString();
    // Remembered for the next visit. `profile` is stripped on the way in — the
    // candidate is chosen elsewhere and must not be pinned by a filter store.
    saveJobFilters(s);
    router.push(s ? `/?${s}` : '/');
  }

  const selectApplied = (next: AppliedFilter) => navigate({ applied: next });
  const selectDiscarded = (next: DiscardedFilter) => navigate({ discarded: next });
  const toggleRemote = () => navigate({ remote: !remote });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({});
  }

  function clearAll() {
    // The derived filters reset themselves once the URL below lands; only the
    // draft, which the URL does not own, has to be cleared by hand.
    setQDraft('');
    // Writing the EMPTY string is what makes clearing stick: without it the
    // restore on the next visit would put the filters straight back.
    saveJobFilters('');
    // Clearing FILTERS must not also reset the selected profile.
    router.push(current.profile ? `/?profile=${current.profile}` : '/');
  }

  // "Filtered" = anything other than the default (remote-only, everything else off).
  const hasFilters = Boolean(
    qDraft.trim() || sites.length || !remote || applied !== 'all' || discarded !== 'all',
  );

  return (
    <form
      onSubmit={submit}
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
    >
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
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder="Search jobs…"
          className={`w-full pl-9 ${inputCls}`}
        />
      </div>

      <MultiSelect
        placeholder="All sources"
        options={filters.sites.map((x) => ({ value: x, ...siteMeta(x) }))}
        selected={sites}
        onChange={(next) => navigate({ sites: next })}
      />

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

