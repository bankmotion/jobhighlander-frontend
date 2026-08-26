'use client';

import { useDisplayZone } from '@/lib/display-zone';
import { timeInZone, zoneAbbrev } from '@/lib/tz';
import { dayKeyInZone, weekdayLabel, dayNumber } from '@/lib/calendar';
import { shortZone } from './meeting-time';
import { EventLink, bucketByDay, eventColor, isPast } from './calendar-event';
import { STEP_RESULT_LABELS, type CalendarPanel } from '@/lib/interviews';

/**
 * A chronological list of the week's sittings.
 *
 * The view that survives a narrow screen. A seven-column time grid at phone
 * width gives each day about forty pixels, which is not enough for a company
 * name — and the calendar is most likely to be opened on a phone precisely when
 * someone is about to walk into one of these.
 *
 * It also has room the grids do not: full titles, the quoted zone spelled out,
 * and the meeting link as something you can actually hit with a thumb.
 */
export function CalendarAgenda({ days, panels }: { days: string[]; panels: CalendarPanel[] }) {
  const zone = useDisplayZone();
  if (!zone) return <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>;

  const byDay = bucketByDay(panels, zone);
  const todayKey = dayKeyInZone(new Date(), zone);
  const withEvents = days.filter((d) => (byDay.get(d) ?? []).length > 0);

  if (withEvents.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted)]">
        Nothing scheduled this week.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Empty days are SKIPPED here, unlike the grids which must keep their
          shape. A list of blank headings is scrolling with nothing at the end
          of it. */}
      {withEvents.map((day) => (
        <section key={day}>
          <h3 className="mb-2 flex items-baseline gap-2 border-b border-[var(--border)] pb-1.5">
            <span
              className={`text-sm font-bold ${
                day === todayKey ? 'text-[var(--primary)]' : 'text-white'
              }`}
            >
              {weekdayLabel(day, true)} {dayNumber(day)}
            </span>
            {day === todayKey && (
              <span className="rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
                Today
              </span>
            )}
          </h3>

          <ul className="space-y-2">
            {(byDay.get(day) ?? []).map((panel) => (
              <li key={panel.panelId}>
                <AgendaRow panel={panel} zone={zone} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-[var(--muted)]">
        Times shown in {shortZone(zone)} ({zoneAbbrev(new Date(), zone)}) — change it in the top bar.
      </p>
    </div>
  );
}

function AgendaRow({ panel, zone }: { panel: CalendarPanel; zone: string }) {
  const at = new Date(panel.scheduledAt);
  const color = eventColor(panel);
  const dead = isPast(panel);

  return (
    <div
      style={{ borderLeftColor: color }}
      className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-lg border border-l-[3px] border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
    >
      <div className="w-20 shrink-0">
        <div
          className={`text-sm font-bold tabular-nums ${
            dead ? 'text-[var(--muted)] line-through' : 'text-white'
          }`}
        >
          {timeInZone(at, zone)}
        </div>
        {panel.durationMin && (
          <div className="text-[11px] text-[var(--muted)]">{panel.durationMin} min</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <EventLink
          panel={panel}
          className="block truncate text-sm font-semibold text-white transition hover:text-[var(--primary)]"
        >
          {panel.jobCompany ?? panel.jobTitle}
        </EventLink>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
          {panel.stages.length > 0 && <span>{panel.stages.map((s) => s.name).join(' + ')}</span>}
          {panel.stepTitle && <span>· {panel.stepTitle}</span>}
          <span>· {panel.profileName}</span>
          {panel.stepResult !== 'pending' && (
            <span>· {STEP_RESULT_LABELS[panel.stepResult]}</span>
          )}
        </div>
        {/* The quoted reading, spelled out. This is the line that is checked
            against the email, so the agenda gives it room the chips cannot. */}
        {panel.timezone && (
          <div className="mt-0.5 text-[11px] text-[var(--muted)]">
            Invitation said {timeInZone(at, panel.timezone)} {zoneAbbrev(at, panel.timezone)}
          </div>
        )}
      </div>

      {panel.meetingUrl && (
        <a
          href={panel.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition hover:border-[var(--primary)]/60"
        >
          Join ↗
        </a>
      )}
    </div>
  );
}
