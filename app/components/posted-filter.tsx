'use client';

import { POSTED_TABS, type PostedFilter } from '@/lib/posted';

/**
 * Narrow the list by when the job was POSTED.
 *
 * Distinct from every other filter in the bar, which asks about the job or what
 * the user did with it; this one asks about time, so it gets the date inputs
 * rather than another set of tabs.
 *
 * Choosing "Custom" reveals the inputs but does not filter anything until a
 * date is entered — an empty custom range is not a narrower list, and pretending
 * otherwise would show "0 jobs" the moment the tab was clicked.
 */
export function PostedFilterControl({
  value,
  from,
  to,
  today,
  onChange,
}: {
  value: PostedFilter;
  from: string;
  to: string;
  /** Today in the VIEWER's zone, so the max on the inputs is their today. */
  today: string;
  onChange: (next: { posted?: PostedFilter; postedFrom?: string; postedTo?: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Date posted"
        className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
      >
        {POSTED_TABS.map((t) => {
          const on = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange({ posted: t.value })}
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

      {value === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            max={to || today}
            aria-label="Posted on or after"
            onChange={(e) => onChange({ posted: 'custom', postedFrom: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />
          <span aria-hidden className="text-xs text-[var(--muted)]">
            →
          </span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={today}
            aria-label="Posted on or before"
            onChange={(e) => onChange({ posted: 'custom', postedTo: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          />
          {(from || to) && (
            <button
              type="button"
              onClick={() => onChange({ posted: 'custom', postedFrom: '', postedTo: '' })}
              className="jh-press rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
