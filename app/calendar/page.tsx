import Link from 'next/link';
import { fetchCalendarPanels } from '@/lib/interviews.server';
import { InterviewCalendar } from '@/app/components/interview-calendar';

export const dynamic = 'force-dynamic';

/**
 * Every interview sitting, across every profile, on one month grid.
 *
 * Deliberately NOT scoped to a profile the way `/interviews` is. The value of a
 * calendar is the collision check — two candidates booked into the same
 * afternoon is exactly what a per-profile view cannot show you, and it is the
 * thing that actually goes wrong when several processes run at once.
 *
 * The grid renders here; the events are placed in the browser, because which
 * day an instant belongs to depends on the reader's time zone. See
 * `interview-calendar.tsx`.
 */
export default async function CalendarPage({
  searchParams,
}: {
  /** `month` as YYYY-MM. Absent means the current one. */
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonth(monthParam);

  // The grid shows up to six days either side of the month, and an event near a
  // boundary can land in a different day once shifted into the reader's zone.
  // Padding the fetch by a week each way costs nothing and means nothing can
  // fall off the visible grid.
  const from = new Date(Date.UTC(year, month - 1, 1));
  from.setUTCDate(from.getUTCDate() - 13);
  const to = new Date(Date.UTC(year, month, 1));
  to.setUTCDate(to.getUTCDate() + 13);

  const panels = await fetchCalendarPanels(from, to);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const heading = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  // Counted over the whole padded range rather than the visible month; close
  // enough for a "nothing here" hint, and it avoids re-doing the timezone
  // bucketing on the server where the zone is unknown.
  const empty = panels.length === 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Calendar</h1>
          <p className="text-sm text-[var(--muted)]">
            Every interview across every profile you can use. Click one to open its timeline.
          </p>
        </div>

        <nav className="flex items-center gap-1" aria-label="Month">
          <NavLink href={monthHref(prev)} label="Previous month">
            ‹
          </NavLink>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-white">
            {heading}
          </span>
          <NavLink href={monthHref(next)} label="Next month">
            ›
          </NavLink>
          <Link
            href="/calendar"
            className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)]"
          >
            Today
          </Link>
        </nav>
      </div>

      <InterviewCalendar year={year} month={month} panels={panels} />

      {empty && (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          Nothing scheduled around {heading}. Interview times are added on a job&apos;s Interview
          tab — open one from <Link href="/interviews" className="text-[var(--primary)] hover:underline">Interviews</Link>.
        </p>
      )}
    </div>
  );
}

function NavLink({
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

/**
 * `?month=YYYY-MM`, falling back to the current month.
 *
 * The fallback reads the SERVER's clock, so within a few hours of a month
 * boundary a reader far enough east or west can land on the neighbouring month.
 * Accepted deliberately: the alternative is rendering nothing until the browser
 * reports its zone, and the arrows are right there. Once a month is in the URL
 * it is exact.
 */
function parseMonth(param?: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(param ?? '');
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (year >= 1970 && year <= 2999 && month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    // `%` keeps the sign of the dividend in JS, so December of the previous
    // year would come out as -1 without the second modulo.
    month: (((zeroBased % 12) + 12) % 12) + 1,
  };
}

const monthHref = ({ year, month }: { year: number; month: number }) =>
  `/calendar?month=${year}-${String(month).padStart(2, '0')}`;
