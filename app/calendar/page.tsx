import Link from 'next/link';
import { fetchCalendarPanels } from '@/lib/interviews.server';
import {
  CALENDAR_VIEWS,
  fetchRange,
  isCalendarView,
  isoDate,
  parseIsoDate,
  periodLabel,
  shiftAnchor,
  visibleDays,
  type CalendarView,
} from '@/lib/calendar';
import { InterviewCalendar } from '@/app/components/interview-calendar';
import { CalendarTimeGrid } from '@/app/components/calendar-time-grid';
import { CalendarAgenda } from '@/app/components/calendar-agenda';

export const dynamic = 'force-dynamic';

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
};

/**
 * Every interview sitting, across every profile, in whichever view suits the
 * question being asked.
 *
 * Deliberately NOT scoped to a profile the way `/interviews` is. The value of a
 * calendar is the collision check — two candidates booked into the same
 * afternoon is exactly what a per-profile view cannot show, and it is the thing
 * that actually goes wrong when several processes run at once.
 *
 * ONE ANCHOR DATE DRIVES ALL FOUR VIEWS. `?view=` and `?date=` together decide
 * the period, so switching Month → Week keeps you on the week you were looking
 * at instead of jumping to today. Prev/next then step by whatever unit the
 * current view moves in.
 *
 * The grids render here; the events are placed in the browser, because which
 * day — and which hour — an instant belongs to depends on the reader's zone.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view: viewParam, date: dateParam } = await searchParams;

  const view: CalendarView = isCalendarView(viewParam ?? '') ? (viewParam as CalendarView) : 'month';
  // The fallback reads the SERVER's clock, so within a few hours of midnight a
  // reader far enough east or west can land on the neighbouring day. Accepted:
  // the alternative is rendering nothing until the browser reports its zone,
  // and the arrows are right there. Once a date is in the URL it is exact.
  const anchor = parseIsoDate(dateParam) ?? new Date();

  const days = visibleDays(view, anchor);
  const { from, to } = fetchRange(view, anchor);
  const panels = await fetchCalendarPanels(from, to);

  const href = (v: CalendarView, d: Date) => `/calendar?view=${v}&date=${isoDate(d)}`;

  return (
    <div>
      <div className="mb-5">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Calendar</h1>
        <p className="text-sm text-[var(--muted)]">
          Every interview across every profile you can use. Click one to open its timeline.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1" aria-label="Period">
          <NavBtn href={href(view, shiftAnchor(view, anchor, -1))} label={`Previous ${view}`}>
            ‹
          </NavBtn>
          <span className="min-w-[13rem] text-center text-sm font-semibold text-white">
            {periodLabel(view, anchor)}
          </span>
          <NavBtn href={href(view, shiftAnchor(view, anchor, 1))} label={`Next ${view}`}>
            ›
          </NavBtn>
          <Link
            href={`/calendar?view=${view}`}
            className="ml-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)]"
          >
            Today
          </Link>
        </nav>

        {/* Switching view KEEPS the anchor date, so Month → Day lands on the
            day you were looking at rather than resetting to today. */}
        <div
          role="group"
          aria-label="Calendar view"
          className="flex overflow-hidden rounded-lg border border-[var(--border)]"
        >
          {CALENDAR_VIEWS.map((v) => (
            <Link
              key={v}
              href={href(v, anchor)}
              aria-current={v === view ? 'true' : undefined}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                v === view
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-white'
              }`}
            >
              {VIEW_LABELS[v]}
            </Link>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <InterviewCalendar days={days} anchorIso={isoDate(anchor)} panels={panels} />
      )}
      {(view === 'week' || view === 'day') && (
        <div className="overflow-x-auto">
          {/* The week track needs room for seven columns; below that width it
              scrolls rather than crushing each day to an unreadable sliver.
              Agenda is the view that actually suits a phone. */}
          <div className={view === 'week' ? 'min-w-[42rem]' : ''}>
            <CalendarTimeGrid days={days} panels={panels} />
          </div>
        </div>
      )}
      {view === 'agenda' && <CalendarAgenda days={days} panels={panels} />}
    </div>
  );
}

function NavBtn({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)]"
    >
      {children}
    </Link>
  );
}
