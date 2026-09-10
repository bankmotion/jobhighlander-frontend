'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { JobFilters } from '@/lib/types';
import type { AppliedFilter, OthersAppliedFilter } from '@/lib/applications';
import type { DiscardedFilter } from '@/lib/discards';
import type { InterviewFilter } from '@/lib/interviews';
import type { ResumeFilter } from '@/lib/resumes';
import type { RejectedFilter } from '@/lib/rejections';
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
  /** Super admins only — see the render site for why. */
  canFilterOthersApplied?: boolean;
  current: {
    company: string;
    title: string;
    description: string;
    location: string;
    sites: string[];
    remote: boolean;
    profile?: number;
    applied: AppliedFilter;
    othersApplied: OthersAppliedFilter;
    discarded: DiscardedFilter;
    rejected: RejectedFilter;
    interview: InterviewFilter;
    resume: ResumeFilter;
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

//: Whether the EMPLOYER said no — the other half of the pair above, and not the
//: same question. Discarded is this profile passing on a posting; rejected is
//: the posting passing on this profile. A job can be neither, either or both.
const REJECTED_TABS: { value: RejectedFilter; label: string; hint: string }[] = [
  { value: 'all', label: 'All', hint: 'Every job, rejected or not' },
  { value: 'notrejected', label: 'Live', hint: 'Only jobs that have not been rejected' },
  { value: 'rejected', label: 'Rejected', hint: 'Only jobs the employer said no to' },
];

//: A select, not tabs. The other filters have three options and fit in a
//: segmented control; this one has ten, and a ten-wide strip would push every
//: control after it off the row. The two coarse answers stay at the top, above
//: a separator, because "any interview at all" is the commoner question and
//: should not be buried among the specific statuses.
const INTERVIEW_OPTIONS: { value: InterviewFilter; label: string }[] = [
  { value: 'all', label: 'Interview: any' },
  { value: 'started', label: 'Interviewing' },
  { value: 'notstarted', label: 'No interview' },
];

const INTERVIEW_STATUS_OPTIONS: { value: InterviewFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'offer', label: 'Offer' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'ghosted', label: 'Ghosted' },
  { value: 'on_hold', label: 'On hold' },
];

//: "Have I already written a resume for this?" Per profile, like the tabs
//: above, and hidden with no profile selected for the same reason: without one
//: there is nobody the resume would have been generated for.
const RESUME_TABS: { value: ResumeFilter; label: string; hint: string }[] = [
  { value: 'all', label: 'All', hint: 'Every job, resume or not' },
  { value: 'generated', label: 'Resume ready', hint: 'Only jobs you have generated a resume for' },
  { value: 'notgenerated', label: 'No resume', hint: 'Only jobs you have not generated a resume for' },
];

const APPLIED_TABS: { value: AppliedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'unapplied', label: 'Not applied' },
];

//: "Has anyone ELSE gone in on this?" — board-wide, which is a different
//: question from APPLIED_TABS above (that one is about the profile you are
//: viewing as). Shown even with no profile selected, where it simply means
//: "anyone at all has applied".
const OTHERS_APPLIED_TABS: { value: OthersAppliedFilter; label: string; hint: string }[] = [
  { value: 'all', label: 'All', hint: 'Every job, whoever has applied' },
  {
    value: 'others',
    label: 'Applied by another candidate',
    hint: 'Only jobs another profile has already applied to',
  },
  { value: 'none', label: 'None', hint: 'Only jobs no other profile has applied to yet' },
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
  dice: { label: 'Dice', dot: '#e11d48' },
  ziprecruiter: { label: 'ZipRecruiter', dot: '#0b6b3a' },
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

export function FiltersBar({ filters, current, canFilterApplied, canFilterOthersApplied }: Props) {
  const router = useRouter();
  // A filtered list is re-fetched on the server, so between the click and the
  // new rows there is a gap with nothing to show for it — long enough on a slow
  // query that the click reads as having been missed, and gets repeated.
  // `useTransition` is what surfaces that gap: `useLinkStatus` reports on a
  // <Link>, and every control here navigates with `router.push`.
  const [loading, startTransition] = useTransition();

  const {
    sites,
    remote,
    applied,
    othersApplied,
    discarded,
    rejected,
    interview,
    resume,
    posted,
    postedFrom,
    postedTo,
  } = current;

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
    othersApplied?: OthersAppliedFilter;
    discarded?: DiscardedFilter;
    rejected?: RejectedFilter;
    interview?: InterviewFilter;
    resume?: ResumeFilter;
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
    const nextOthers = next.othersApplied ?? othersApplied;
    if (nextOthers !== 'all') qs.set('othersApplied', nextOthers);
    const nextDiscarded = next.discarded ?? discarded;
    if (nextDiscarded !== 'all') qs.set('discarded', nextDiscarded); // all is the default
    const nextRejected = next.rejected ?? rejected;
    if (nextRejected !== 'all') qs.set('rejected', nextRejected); // all is the default
    const nextInterview = next.interview ?? interview;
    if (nextInterview !== 'all') qs.set('interview', nextInterview); // all is the default
    const nextResume = next.resume ?? resume;
    if (nextResume !== 'all') qs.set('resume', nextResume); // all is the default
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
    startTransition(() => router.push(s ? `/?${s}` : '/'));
  }

  const selectApplied = (next: AppliedFilter) => navigate({ applied: next });
  const selectOthersApplied = (next: OthersAppliedFilter) => navigate({ othersApplied: next });
  const selectDiscarded = (next: DiscardedFilter) => navigate({ discarded: next });
  const selectRejected = (next: RejectedFilter) => navigate({ rejected: next });
  const selectInterview = (next: InterviewFilter) => navigate({ interview: next });
  const selectResume = (next: ResumeFilter) => navigate({ resume: next });
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
    startTransition(() => router.push(current.profile ? `/?profile=${current.profile}` : '/'));
  }

  // "Filtered" = anything other than the default (remote-only, everything else off).
  const hasFilters = Boolean(
    TEXT_KEYS.some((k) => drafts[k].trim()) ||
      sites.length ||
      !remote ||
      applied !== 'all' ||
      othersApplied !== 'all' ||
      discarded !== 'all' ||
      rejected !== 'all' ||
      interview !== 'all' ||
      resume !== 'all' ||
      postedActive(posted, postedFrom, postedTo),
  );

  return (
    <form
      onSubmit={submit}
      // Announced rather than only drawn, so a screen reader is told the results
      // are being replaced instead of silently reading stale ones.
      aria-busy={loading}
      className="relative mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
    >
      {/* An indeterminate bar on the bar's own top edge. Indeterminate because
          the wait is a server query of unknown length — a percentage would be
          invented. Positioned here rather than over the results so the feedback
          appears where the click did. */}
      {loading && (
        // The clip lives on this 2px strip, NOT on the form. `overflow-hidden`
        // on the form cut off the source dropdown, which is absolutely
        // positioned inside it — a progress bar is not worth breaking a filter
        // over. Scoped here, the sweep is still bounded by the rounded corner.
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-xl"
        >
          <span className="jh-filter-progress absolute inset-y-0 left-0 w-1/3 bg-[var(--primary)]" />
        </span>
      )}
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

      {/* Super admins only, matching the "N profiles applied" badge. The
          question spans every profile on the board, including ones the viewer
          cannot see, so answering it for a bidder would tell them about other
          people's activity through a control rather than a label. The server
          applies the same rule, so this is the visible half of one gate and not
          the whole of it.

          Not gated on a selected profile, though: with none chosen it still
          answers "has anybody applied to this", which is useful on its own. */}
      {canFilterOthersApplied && (
        <div
          role="radiogroup"
          aria-label="Applied by another candidate"
          className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          {OTHERS_APPLIED_TABS.map((t) => {
            const on = othersApplied === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                title={t.hint}
                onClick={() => selectOthersApplied(t.value)}
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

      {/* Beside Discarded, because they are the two halves of one question and
          reading them apart is how you end up thinking a rejection was your
          own decision. Gated on a profile like the rest — a rejection belongs
          to the profile that was rejected. */}
      {canFilterApplied && (
        <div
          role="radiogroup"
          aria-label="Rejected"
          className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          {REJECTED_TABS.map((t) => {
            const on = rejected === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                title={t.hint}
                onClick={() => selectRejected(t.value)}
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
        <select
          aria-label="Interview status"
          value={interview}
          onChange={(e) => selectInterview(e.target.value as InterviewFilter)}
          className={`rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] ${
            interview === 'all'
              ? 'border-[var(--border)] text-[var(--muted)]'
              : // Reads as active, like the segmented controls beside it do
                // when they are off their default.
                'border-[var(--primary)] font-medium text-white'
          }`}
        >
          {INTERVIEW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <optgroup label="Status">
            {INTERVIEW_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        </select>
      )}

      {/* Gated on a profile, like the tabs above: a resume is generated FROM a
          profile, so with none selected there is nobody to have generated it
          and the server ignores the filter anyway. */}
      {canFilterApplied && (
        <div
          role="radiogroup"
          aria-label="Resume"
          className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          {RESUME_TABS.map((t) => {
            const on = resume === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                title={t.hint}
                onClick={() => selectResume(t.value)}
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
        zone={zone}
        onChange={navigate}
      />

      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
      >
        {loading && <Spinner />}
        {loading ? 'Loading…' : 'Filter'}
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

/** Ring with one bright quarter, so the rotation is visible on a solid button. */
function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="jh-spin h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}
