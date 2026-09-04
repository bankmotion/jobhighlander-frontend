'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { JobFilters } from '@/lib/types';
import type { AppliedFilter } from '@/lib/applications';
import type { DiscardedFilter } from '@/lib/discards';
import type { InterviewFilter } from '@/lib/interviews';
import { MultiSelect } from './multi-select';
import { PostedFilterControl } from './posted-filter';
import { postedActive, writePosted, type PostedFilter } from '@/lib/posted';
import { useDisplayZone } from '@/lib/display-zone';
import { saveJobFilters } from '@/lib/job-filters';

const TEXT_KEYS = ['title', 'company', 'location', 'description'] as const;
type TextKey = (typeof TEXT_KEYS)[number];
type TextFilters = Record<TextKey, string>;

const EMPTY_TEXT: TextFilters = { title: '', company: '', location: '', description: '' };

const pickText = (src: Record<TextKey, string>): TextFilters =>
  Object.fromEntries(TEXT_KEYS.map((k) => [k, src[k] ?? ''])) as TextFilters;

const sameText = (a: TextFilters, b: TextFilters): boolean =>
  TEXT_KEYS.every((k) => a[k] === b[k]);

// Title leads and takes the flexible width: it is the field people reach for
// first, and it inherits the slot the catch-all search used to occupy.
const FIELD_INPUTS: { key: TextKey; placeholder: string; label: string; width: string }[] = [
  { key: 'title', placeholder: 'Job title', label: 'Filter by job title', width: 'min-w-[200px] flex-1' },
  { key: 'company', placeholder: 'Company', label: 'Filter by company', width: 'w-36' },
  { key: 'location', placeholder: 'Location', label: 'Filter by location', width: 'w-36' },
  { key: 'description', placeholder: 'In description', label: 'Filter by description text', width: 'w-40' },
];

interface Props {
  filters: JobFilters;
  current: {
    company: string;
    title: string;
    description: string;
    location: string;
    sites: string[];
    remote: boolean;
    profile?: number;
    applied: AppliedFilter;
    discarded: DiscardedFilter;
    interview: InterviewFilter;
    posted: PostedFilter;
    postedFrom: string;
    postedTo: string;
  };
  canFilterApplied: boolean;
}

const DISCARDED_TABS: { value: DiscardedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'undiscarded', label: 'Kept' },
  { value: 'discarded', label: 'Discarded' },
];

const INTERVIEW_TABS: { value: InterviewFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'started', label: 'Interviewing' },
  { value: 'notstarted', label: 'No interview' },
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
  linkedin: { label: 'LinkedIn', dot: '#0a66c2' },
  // Not a site. Jobs someone added by hand, so the dot is the app's own colour
  // rather than a brand's.
  other: { label: 'Added manually', dot: 'var(--primary)' },
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

  const { sites, remote, applied, discarded, interview, posted, postedFrom, postedTo } = current;

  // The date inputs are capped at the viewer's today, not the browser's UTC
  // day: a max of "tomorrow" is offerable in one zone and nonsense in another.
  const zone = useDisplayZone();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone ?? undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // All five text fields share one draft record rather than a useState pair
  // each. A draft is text typed but not yet submitted; it rides along when any
  // other control is used, so typing a company and then clicking a source
  // applies both instead of discarding what was typed.
  //
  // The committed snapshot is what detects a URL change from outside (Clear
  // All, the back button, a restored filter set) and resyncs the drafts.
  const [drafts, setDrafts] = useState<TextFilters>(() => pickText(current));
  const [committed, setCommitted] = useState<TextFilters>(() => pickText(current));
  const fromUrl = pickText(current);
  if (!sameText(committed, fromUrl)) {
    setCommitted(fromUrl);
    setDrafts(fromUrl);
  }
  const setDraft = (key: TextKey, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: value }));

  function navigate(next: {
    text?: Partial<TextFilters>;
    sites?: string[];
    remote?: boolean;
    applied?: AppliedFilter;
    discarded?: DiscardedFilter;
    interview?: InterviewFilter;
    posted?: PostedFilter;
    postedFrom?: string;
    postedTo?: string;
  }) {
    const qs = new URLSearchParams();
    // The in-progress draft rides along, so toggling a source also applies
    // whatever has been typed but not yet submitted.
    for (const key of TEXT_KEYS) {
      const value = (next.text?.[key] ?? drafts[key]).trim();
      if (value) qs.set(key, value);
    }
    (next.sites ?? sites).forEach((s) => qs.append('site', s));
    if (!(next.remote ?? remote)) qs.set('remote', '0'); // remote-only is the default
    const nextApplied = next.applied ?? applied;
    if (nextApplied !== 'all') qs.set('applied', nextApplied); // all is the default
    const nextDiscarded = next.discarded ?? discarded;
    if (nextDiscarded !== 'all') qs.set('discarded', nextDiscarded); // all is the default
    const nextInterview = next.interview ?? interview;
    if (nextInterview !== 'all') qs.set('interview', nextInterview); // all is the default
    // Switching AWAY from a custom range drops its dates rather than keeping
    // them primed to reappear the next time Custom is clicked.
    const nextPosted = next.posted ?? posted;
    const keepDates = nextPosted === 'custom';
    writePosted(
      qs,
      nextPosted,
      keepDates ? (next.postedFrom ?? postedFrom) : '',
      keepDates ? (next.postedTo ?? postedTo) : '',
    );
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
  const selectInterview = (next: InterviewFilter) => navigate({ interview: next });
  const toggleRemote = () => navigate({ remote: !remote });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({});
  }

  function clearAll() {
    // The derived filters reset themselves once the URL below lands; only the
    // drafts, which the URL does not own, have to be cleared by hand.
    setDrafts(EMPTY_TEXT);
    // Writing the EMPTY string is what makes clearing stick: without it the
    // restore on the next visit would put the filters straight back.
    saveJobFilters('');
    // Clearing FILTERS must not also reset the selected profile.
    router.push(current.profile ? `/?profile=${current.profile}` : '/');
  }

  // "Filtered" = anything other than the default (remote-only, everything else off).
  const hasFilters = Boolean(
    TEXT_KEYS.some((k) => drafts[k].trim()) ||
      sites.length ||
      !remote ||
      applied !== 'all' ||
      discarded !== 'all' ||
      interview !== 'all' ||
      postedActive(posted, postedFrom, postedTo),
  );

  return (
    <form
      onSubmit={submit}
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
    >
      {/* One box per column, AND-ed together. There is deliberately no
          search-everything box: it ORed across three columns, so a short word
          like "ai" matched "details" and "training" and returned 95% of the
          table. Naming the field is what makes the result mean something. */}
      {FIELD_INPUTS.map((f) => (
        <input
          key={f.key}
          type="text"
          value={drafts[f.key]}
          onChange={(e) => setDraft(f.key, e.target.value)}
          placeholder={f.placeholder}
          aria-label={f.label}
          className={`${f.width} ${inputCls}`}
        />
      ))}

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

      {canFilterApplied && (
        <div
          role="radiogroup"
          aria-label="Interview"
          className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          {INTERVIEW_TABS.map((t) => {
            const on = interview === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => selectInterview(t.value)}
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

      <PostedFilterControl
        value={posted}
        from={postedFrom}
        to={postedTo}
        today={today}
        onChange={navigate}
      />

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

