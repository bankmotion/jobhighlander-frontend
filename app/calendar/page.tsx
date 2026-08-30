import Link from 'next/link';
import { fetchProfiles } from '@/lib/profiles';
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
import { CalendarViews } from '@/app/components/calendar-views';
import { CalendarProfilePicker } from '@/app/components/calendar-profile-picker';

export const dynamic = 'force-dynamic';

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; profile?: string; panel?: string }>;
}) {
  const {
    view: viewParam,
    date: dateParam,
    profile: profileParam,
    panel: panelParam,
  } = await searchParams;

  const view: CalendarView = isCalendarView(viewParam ?? '') ? (viewParam as CalendarView) : 'month';
  // The fallback reads the SERVER's clock, so within a few hours of midnight a
  // reader far enough east or west can land on the neighbouring day. Accepted:
  // the alternative is rendering nothing until the browser reports its zone,
  // and the arrows are right there. Once a date is in the URL it is exact.
  const anchor = parseIsoDate(dateParam) ?? new Date();

  const profiles = await fetchProfiles().catch(() => []);
  // Resolved against profiles the caller may actually use, so a hand-typed id
  // for someone else's falls back to "all" rather than rendering an empty
  // month that looks like a candidate with nothing booked.
  const activeProfile = profiles.find((p) => p.id === Number(profileParam)) ?? null;

  const days = visibleDays(view, anchor);
  const { from, to } = fetchRange(view, anchor);
  const panels = await fetchCalendarPanels(from, to, activeProfile?.id);

  // Every internal link carries the profile filter, so paging a month or
  // switching view cannot silently widen it back to the whole roster.
  const suffix = activeProfile ? `&profile=${activeProfile.id}` : '';
  const href = (v: CalendarView, d: Date) => `/calendar?view=${v}&date=${isoDate(d)}${suffix}`;

  return (
    <div>
      <div className="mb-5">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Calendar</h1>
        <p className="text-sm text-[var(--muted)]">
          {activeProfile
            ? `Interviews for ${[activeProfile.firstName, activeProfile.lastName].filter(Boolean).join(' ') || activeProfile.email || `Profile #${activeProfile.id}`}. Click one to open its timeline.`
            : 'Every interview across every profile you can use. Click one to open its timeline.'}
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
            href={`/calendar?view=${view}${suffix}`}
            className="ml-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--border-strong)]"
          >
            Today
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          {profiles.length > 1 && (
            <CalendarProfilePicker profiles={profiles} selectedId={activeProfile?.id ?? null} />
          )}

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
      </div>

      <CalendarViews
        view={view}
        days={days}
        anchorIso={isoDate(anchor)}
        panels={panels}
        initialPanelId={Number(panelParam) || null}
      />
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
