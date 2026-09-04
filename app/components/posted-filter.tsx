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
  zone,
  onChange,
}: {
  value: PostedFilter;
  from: string;
  to: string;
  /** Today in the VIEWER's zone, so the max on the inputs is their today. */
  today: string;
  /** Named in the tooltips, because it is what "midnight" depends on. */
  zone: string | null;
  onChange: (next: { posted?: PostedFilter; postedFrom?: string; postedTo?: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Date posted"
        className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
      >
        {POSTED_TABS.map((t, i) => {
          const on = value === t.value;
          // The tooltip is wider than the button it hangs under, so centring the
          // last one pushes ~80px past the pill. On a narrow screen, where this
          // bar wraps and the pill can end up flush right, that is a horizontal
          // scrollbar on the whole page. The end tabs anchor to their own edge
          // instead.
          const first = i === 0;
          const last = i === POSTED_TABS.length - 1;
          const anchor = last
            ? 'right-0'
            : first
              ? 'left-0'
              : 'left-1/2 -translate-x-1/2';
          // Four words on a button cannot say whether "3 days" counts calendar
          // days or rolling hours, or whose midnight "Today" starts at. The
          // tooltip is where that lives — a native `title` would take a second
          // to appear and could not carry the second line.
          // Only the CALENDAR windows depend on the zone. Naming one on the
          // rolling window would imply it shifts with the viewer, which is the
          // one thing it does not do.
          const zoned = zone && (t.value === 'today' || t.value === '3d');
          return (
            <span key={t.value} className="group relative">
              <button
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

              {/* Below the buttons, not above: this bar sits under a sticky
                  header, and a tooltip opening upwards would slide behind it.
                  `pointer-events-none` so it can never sit between the cursor
                  and the button it describes. */}
              <span
                role="tooltip"
                className={`pointer-events-none absolute top-full z-20 mt-1.5 hidden w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-1.5 text-left text-xs font-normal leading-snug text-[var(--text)] shadow-xl group-hover:block group-focus-within:block ${anchor}`}
              >
                {t.hint}
                {zoned && (
                  <span className="mt-1 block text-[var(--muted)]">
                    Your time zone: {zone}.
                  </span>
                )}
                {t.note && <span className="mt-1 block text-[var(--muted)]">{t.note}</span>}
              </span>
            </span>
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
            title="Earliest posting date to include"
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
            title="Latest posting date to include"
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
