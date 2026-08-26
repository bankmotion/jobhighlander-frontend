'use client';

import { useDisplayZone } from '@/lib/display-zone';
import { zoneAbbrev } from '@/lib/tz';
import { dayKeyInZone, dayNumber, inMonth, parseIsoDate } from '@/lib/calendar';
import { shortZone } from './meeting-time';
import { EventChip, bucketByDay, hasManyProfiles } from './calendar-event';
import type { CalendarPanel } from '@/lib/interviews';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * A month of interview sittings.
 *
 * WHICH CALENDAR DAY AN EVENT FALLS ON IS A FUNCTION OF THE READER'S TIME ZONE.
 * A panel at 23:30 UTC is the 27th in London and the 28th in Tokyo — so the
 * server cannot bucket these into cells, because it does not know where the
 * reader is.
 *
 * The split that resolves it: the GRID is deterministic from its day keys and
 * renders on the server; the EVENTS are placed on the client once the zone is
 * known. The page paints its full shape immediately and fills in, rather than
 * either hydration-mismatching or silently bucketing by the server's zone.
 */
export function InterviewCalendar({
  days,
  anchorIso,
  panels,
}: {
  /** 42 "YYYY-MM-DD" keys, six weeks, Sunday-first. */
  days: string[];
  /** Any date inside the month being shown; decides which cells are greyed. */
  anchorIso: string;
  panels: CalendarPanel[];
}) {
  const viewerZone = useDisplayZone();
  const anchor = parseIsoDate(anchorIso);

  const byDay = viewerZone ? bucketByDay(panels, viewerZone) : new Map<string, CalendarPanel[]>();
  const todayKey = viewerZone ? dayKeyInZone(new Date(), viewerZone) : null;
  const showProfile = hasManyProfiles(panels);

  return (
    <div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-xl border border-b-0 border-[var(--border)] bg-[var(--border)]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-[var(--surface-2)] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]"
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-xl border border-[var(--border)] bg-[var(--border)]">
        {days.map((day) => {
          const events = byDay.get(day) ?? [];
          const isToday = day === todayKey;
          const current = anchor ? inMonth(day, anchor) : true;
          return (
            <div
              key={day}
              className={`min-h-[104px] p-1.5 ${
                current ? 'bg-[var(--surface)]' : 'bg-[var(--bg)]/60'
              }`}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                    isToday
                      ? 'bg-[var(--primary)] font-bold text-white'
                      : current
                        ? 'font-medium text-[var(--text)]'
                        : 'text-[var(--muted)]/50'
                  }`}
                >
                  {dayNumber(day)}
                </span>
              </div>

              <div className="space-y-1">
                {events.map((p) => (
                  <EventChip
                    key={p.panelId}
                    panel={p}
                    zone={viewerZone!}
                    showProfile={showProfile}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Without this the grid is just numbers: a time means nothing until you
          know which clock it is on. */}
      {viewerZone && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Times shown in {shortZone(viewerZone)} ({zoneAbbrev(new Date(), viewerZone)}) — change it
          in the top bar. Each entry names the zone its invitation was written in.
        </p>
      )}
    </div>
  );
}
