'use client';

import Link from 'next/link';
import { useDisplayZone } from '@/lib/display-zone';
import { timeInZone, zoneAbbrev } from '@/lib/tz';
import { shortZone } from './meeting-time';
import {
  CLOSED_STATUSES,
  INTERVIEW_STATUS_LABELS,
  STEP_RESULT_LABELS,
  type CalendarPanel,
} from '@/lib/interviews';

/**
 * A month of interview sittings.
 *
 * WHICH CALENDAR DAY AN EVENT FALLS ON IS A FUNCTION OF THE READER'S TIME ZONE,
 * and nothing else in this app has that problem. A panel at 23:30 UTC is the
 * 27th in London and the 28th in Tokyo — so the server cannot bucket these into
 * cells, because it does not know where the reader is.
 *
 * The split that resolves it: the GRID is deterministic from (year, month) and
 * renders on the server; the EVENTS are placed on the client once the zone is
 * known. So the page paints its full shape immediately and fills in, rather
 * than either hydration-mismatching or silently bucketing by the server's zone.
 */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function InterviewCalendar({
  year,
  month,
  panels,
}: {
  year: number;
  /** 1-12. */
  month: number;
  panels: CalendarPanel[];
}) {
  const viewerZone = useDisplayZone();

  const cells = monthGrid(year, month);
  const byDay = viewerZone ? bucketByDay(panels, viewerZone) : new Map<string, CalendarPanel[]>();
  const todayKey = viewerZone ? dayKey(new Date(), viewerZone) : null;

  // Only worth naming the candidate on each chip when more than one of them has
  // something this month; otherwise it is the same word on every entry.
  const manyProfiles = new Set(panels.map((p) => p.profileId)).size > 1;

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
        {cells.map((cell) => {
          const events = byDay.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;
          return (
            <div
              key={cell.key}
              className={`min-h-[104px] bg-[var(--surface)] p-1.5 ${
                cell.inMonth ? '' : 'bg-[var(--bg)]/60'
              }`}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                    isToday
                      ? 'bg-[var(--primary)] font-bold text-white'
                      : cell.inMonth
                        ? 'font-medium text-[var(--text)]'
                        : 'text-[var(--muted)]/50'
                  }`}
                >
                  {cell.day}
                </span>
              </div>

              <div className="space-y-1">
                {events.map((p) => (
                  <EventChip
                    key={p.panelId}
                    panel={p}
                    zone={viewerZone!}
                    showProfile={manyProfiles}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* The zone every time on this grid is shown in. Without it the grid is
          just numbers, and the whole point of storing the quoted zone is that
          a time means nothing until you know which clock it is on. */}
      {viewerZone && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Times shown in {shortZone(viewerZone)} ({zoneAbbrev(new Date(), viewerZone)}) —
          change it in the top bar. Each entry names the zone its invitation was
          written in.
        </p>
      )}
    </div>
  );
}

/** One sitting inside a day cell. */
function EventChip({
  panel,
  zone,
  showProfile,
}: {
  panel: CalendarPanel;
  zone: string;
  showProfile: boolean;
}) {
  const stage = panel.stages[0];
  const color = stage?.color ?? '#6c5cff';

  // Struck through rather than hidden: a cancelled round still happened to the
  // schedule, and a calendar that quietly drops it makes the week look wrong.
  const dead = panel.stepResult === 'cancelled' || CLOSED_STATUSES.has(panel.interviewStatus);

  const label = [
    panel.jobCompany ?? panel.jobTitle,
    panel.stages.map((s) => s.name).join(' + '),
    panel.stepTitle,
    panel.profileName,
    panel.timezone
      ? `Quoted ${timeInZone(new Date(panel.scheduledAt), panel.timezone)} ${zoneAbbrev(
          new Date(panel.scheduledAt),
          panel.timezone,
        )}`
      : null,
    panel.stepResult !== 'pending' ? STEP_RESULT_LABELS[panel.stepResult] : null,
    INTERVIEW_STATUS_LABELS[panel.interviewStatus],
  ]
    .filter(Boolean)
    .join(' · ');

  const body = (
    <>
      <span className="flex items-center gap-1">
        <span
          aria-hidden
          style={{ backgroundColor: color }}
          className="h-1.5 w-1.5 shrink-0 rounded-full"
        />
        <span className="shrink-0 font-semibold tabular-nums">
          {timeInZone(new Date(panel.scheduledAt), zone)}
        </span>
        <span className={`truncate ${dead ? 'line-through' : ''}`}>
          {panel.jobCompany ?? panel.jobTitle}
        </span>
      </span>
      {showProfile && (
        <span className="block truncate pl-2.5 text-[10px] opacity-70">{panel.profileName}</span>
      )}
    </>
  );

  const cls = `block w-full rounded px-1 py-0.5 text-left text-[11px] leading-tight transition ${
    dead ? 'text-[var(--muted)]' : 'text-[var(--text)]'
  } hover:bg-white/10`;

  // A pruned job leaves nothing to link to; the entry still renders, because
  // the sitting is real whether or not the posting still exists.
  return panel.jobId ? (
    <Link
      href={`/jobs/${panel.jobId}?tab=interview&profile=${panel.profileId}`}
      title={label}
      style={{ borderLeft: `2px solid ${color}` }}
      className={cls}
    >
      {body}
    </Link>
  ) : (
    <span title={label} style={{ borderLeft: `2px solid ${color}` }} className={cls}>
      {body}
    </span>
  );
}

/* ── grid maths ───────────────────────────────────────────────────────── */

interface Cell {
  /** "YYYY-MM-DD", the bucket key. */
  key: string;
  day: number;
  inMonth: boolean;
}

/**
 * Six weeks of cells covering `month`, Sunday-first.
 *
 * Always six rows, never five: a grid that changes height between months makes
 * the whole page jump when you page through it.
 *
 * Built in UTC deliberately. These are calendar dates, not instants — "the 3rd"
 * is the same square regardless of zone — and using local `Date` here would
 * make the SERVER's zone decide which square the month starts on.
 */
function monthGrid(year: number, month: number): Cell[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(firstOfMonth);
  start.setUTCDate(1 - firstOfMonth.getUTCDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return {
      key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1,
    };
  });
}

/**
 * "YYYY-MM-DD" for an instant as seen in `zone`.
 *
 * `en-CA` because it formats as ISO order; hand-assembling from `formatToParts`
 * would work too but this is one call and the locale is pinned, so it cannot
 * drift with the runtime.
 */
function dayKey(date: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function bucketByDay(panels: CalendarPanel[], zone: string): Map<string, CalendarPanel[]> {
  const out = new Map<string, CalendarPanel[]>();
  for (const p of panels) {
    const d = new Date(p.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d, zone);
    const list = out.get(key);
    if (list) list.push(p);
    else out.set(key, [p]);
  }
  // The API already sorts by instant, and bucketing preserves that order within
  // each day, so no second sort is needed.
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');
