'use client';

import { useDisplayZone } from '@/lib/display-zone';
import { timeInZone, zoneAbbrev } from '@/lib/tz';
import {
  dayKeyInZone,
  dayNumber,
  hourLabel,
  minutesInDay,
  weekdayLabel,
} from '@/lib/calendar';
import { shortZone } from './meeting-time';
import {
  EventLink,
  bucketByDay,
  eventColor,
  hasManyProfiles,
  isPast,
} from './calendar-event';
import type { CalendarPanel } from '@/lib/interviews';

/** Row height for one hour. Drives every vertical position on the track. */
const HOUR_PX = 52;

/** Assumed length when a panel has no duration, so it still has a block. */
const DEFAULT_MIN = 30;

/** Below this a block cannot hold its own text. */
const MIN_BLOCK_PX = 22;

interface Placed {
  panel: CalendarPanel;
  startMin: number;
  endMin: number;
  /** Column within its overlap cluster. */
  lane: number;
  /** How many columns that cluster needs. */
  lanes: number;
}

/**
 * Hour-by-hour track for the Day and Week views.
 *
 * THIS IS WHERE `durationMin` STOPS BEING TRIVIA. On the month grid a 30-minute
 * screen and a 3-hour onsite are the same one-line chip; here they are a short
 * block and a tall one, and two calls an hour apart visibly leave you an hour.
 * That is the question a day view gets asked — "can I fit this in?" — and it is
 * unanswerable from a list.
 *
 * Day is simply this with one column. Keeping them one component means the
 * overlap packing, the hour range and the now-line cannot drift apart between
 * two views that are meant to read identically.
 */
export function CalendarTimeGrid({
  days,
  panels,
}: {
  /** "YYYY-MM-DD" keys — 7 for a week, 1 for a day. */
  days: string[];
  panels: CalendarPanel[];
}) {
  const zone = useDisplayZone();

  // Null until the browser reports in. The frame is rendered anyway so the page
  // has its full height immediately and does not jump when events arrive.
  if (!zone) return <TrackSkeleton days={days} />;

  const byDay = bucketByDay(panels, zone);
  const showProfile = hasManyProfiles(panels);

  const laidOut = new Map<string, Placed[]>();
  for (const day of days) laidOut.set(day, layoutDay(byDay.get(day) ?? [], zone));

  const [fromHour, toHour] = hourRange([...laidOut.values()].flat());
  const height = (toHour - fromHour) * HOUR_PX;

  const todayKey = dayKeyInZone(new Date(), zone);
  const nowMin = minutesInDay(new Date(), zone);
  const nowVisible = days.includes(todayKey) && nowMin >= fromHour * 60 && nowMin <= toHour * 60;

  return (
    <div>
      {/* Day headers, offset by the hour gutter so they sit over their columns. */}
      <div className="flex border-b border-[var(--border)]">
        <div className="w-14 shrink-0" />
        {days.map((day) => {
          const isToday = day === todayKey;
          return (
            <div key={day} className="min-w-0 flex-1 px-1 py-2 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {weekdayLabel(day, days.length === 1)}
              </div>
              <div
                className={`mx-auto mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm ${
                  isToday ? 'bg-[var(--primary)] font-bold text-white' : 'text-[var(--text)]'
                }`}
              >
                {dayNumber(day)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex overflow-hidden rounded-b-xl border border-t-0 border-[var(--border)]">
        {/* Hour gutter */}
        <div className="w-14 shrink-0 border-r border-[var(--border)]">
          <div style={{ height }} className="relative">
            {range(fromHour, toHour).map((h) => (
              <div
                key={h}
                style={{ top: (h - fromHour) * HOUR_PX }}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-[var(--muted)]"
              >
                {h === fromHour ? '' : hourLabel(h)}
              </div>
            ))}
          </div>
        </div>

        {days.map((day) => (
          <div
            key={day}
            className="relative min-w-0 flex-1 border-r border-[var(--border)] last:border-r-0"
            style={{ height }}
          >
            {/* Hour lines */}
            {range(fromHour, toHour).map((h) => (
              <div
                key={h}
                style={{ top: (h - fromHour) * HOUR_PX }}
                className="pointer-events-none absolute inset-x-0 border-t border-[var(--border)]/60"
              />
            ))}

            {/* Where we are now. A snapshot at render, not a ticking clock —
                the top bar's refresh moves it, and a line that silently drifts
                out of date is worse than one you know the age of. */}
            {nowVisible && day === todayKey && (
              <div
                style={{ top: ((nowMin - fromHour * 60) / 60) * HOUR_PX }}
                className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
              >
                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
              </div>
            )}

            {(laidOut.get(day) ?? []).map((placed) => (
              <EventBlock
                key={placed.panel.panelId}
                placed={placed}
                fromHour={fromHour}
                zone={zone}
                showProfile={showProfile}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        Times shown in {shortZone(zone)} ({zoneAbbrev(new Date(), zone)}) — change it in the top
        bar. Blocks with no recorded duration are drawn as {DEFAULT_MIN} minutes.
      </p>
    </div>
  );
}

function EventBlock({
  placed,
  fromHour,
  zone,
  showProfile,
}: {
  placed: Placed;
  fromHour: number;
  zone: string;
  showProfile: boolean;
}) {
  const { panel, startMin, endMin, lane, lanes } = placed;
  const color = eventColor(panel);
  const dead = isPast(panel);

  const top = ((startMin - fromHour * 60) / 60) * HOUR_PX;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, MIN_BLOCK_PX);
  const width = 100 / lanes;

  return (
    <EventLink
      panel={panel}
      style={{
        top,
        height,
        left: `${lane * width}%`,
        width: `calc(${width}% - 3px)`,
        backgroundColor: dead ? 'transparent' : `${color}26`,
        borderColor: color,
      }}
      className={`absolute z-10 overflow-hidden rounded-md border-l-[3px] border-y border-r px-1.5 py-0.5 text-[11px] leading-tight transition hover:brightness-125 ${
        dead
          ? 'border-dashed text-[var(--muted)]'
          : 'border-transparent text-[var(--text)]'
      }`}
    >
      <span className={`block truncate font-semibold ${dead ? 'line-through' : ''}`}>
        {panel.jobCompany ?? panel.jobTitle}
      </span>
      {/* Only when the block is tall enough to hold a second line — squeezing
          it in regardless is what makes short blocks unreadable. */}
      {height >= 34 && (
        <span className="block truncate opacity-80">
          {timeInZone(new Date(panel.scheduledAt), zone)}
          {panel.stages[0] ? ` · ${panel.stages[0].name}` : ''}
        </span>
      )}
      {height >= 52 && showProfile && (
        <span className="block truncate text-[10px] opacity-70">{panel.profileName}</span>
      )}
    </EventLink>
  );
}

/** The frame, drawn before the reader's zone is known so nothing jumps later. */
function TrackSkeleton({ days }: { days: string[] }) {
  const height = 11 * HOUR_PX;
  return (
    <div>
      <div className="flex border-b border-[var(--border)]">
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div key={day} className="min-w-0 flex-1 px-1 py-2 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {weekdayLabel(day, days.length === 1)}
            </div>
            <div className="mt-0.5 text-sm text-[var(--text)]">{dayNumber(day)}</div>
          </div>
        ))}
      </div>
      <div
        style={{ height }}
        className="rounded-b-xl border border-t-0 border-[var(--border)] bg-[var(--surface)]"
      />
    </div>
  );
}

/* ── layout ───────────────────────────────────────────────────────────── */

/**
 * Position every sitting on one day, giving overlapping ones their own column.
 *
 * Two interviews at the same hour is not hypothetical here — it is precisely
 * the clash the calendar exists to reveal — so they must sit SIDE BY SIDE.
 * Stacked, the one underneath is invisible and the collision reads as a free
 * afternoon.
 *
 * Greedy interval packing: events are grouped into clusters of transitively
 * overlapping blocks, and within a cluster each takes the first column whose
 * previous occupant has finished. Every member of a cluster is then drawn at
 * the same width, so the columns line up.
 */
function layoutDay(events: CalendarPanel[], zone: string): Placed[] {
  const items = events
    .map((panel) => {
      const start = minutesInDay(new Date(panel.scheduledAt), zone);
      const minutes = panel.durationMin && panel.durationMin > 0 ? panel.durationMin : DEFAULT_MIN;
      // Clamped to the day: a late-evening block must not extend past midnight
      // and stretch the track by hours it has nothing to show in.
      return { panel, startMin: start, endMin: Math.min(start + minutes, 24 * 60) };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const out: Placed[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned = cluster.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMin);
      } else {
        laneEnds[lane] = item.endMin;
      }
      return { ...item, lane };
    });
    for (const a of assigned) out.push({ ...a, lanes: laneEnds.length });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of items) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return out;
}

/**
 * The hours to draw.
 *
 * Always covers 8am–7pm so an empty day still looks like a working day rather
 * than a sliver, and expands with an hour of margin to fit anything outside it.
 */
function hourRange(placed: Placed[]): [number, number] {
  if (placed.length === 0) return [8, 19];
  const earliest = Math.floor(Math.min(...placed.map((p) => p.startMin)) / 60);
  const latest = Math.ceil(Math.max(...placed.map((p) => p.endMin)) / 60);
  return [Math.max(0, Math.min(earliest - 1, 8)), Math.min(24, Math.max(latest + 1, 19))];
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, i) => from + i);
