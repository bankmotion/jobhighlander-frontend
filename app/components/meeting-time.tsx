'use client';

import { useEffect, useState } from 'react';
import { browserZone, formatInZone, timeInZone, zoneAbbrev } from '@/lib/tz';

/**
 * A meeting time in BOTH the zone the invitation quoted and the reader's own.
 *
 * The two-line shape is the whole point of the component. A recruiter writes
 * "2:00 PM EST"; the candidate lives somewhere else; and a dashboard that
 * renders only one of those readings is either unverifiable against the email
 * or unusable for actually showing up. Showing both makes the conversion the
 * app's job instead of a thing done in someone's head at 6 a.m.
 *
 * THE FIRST LINE IS SERVER-RENDERABLE, THE SECOND IS NOT. The quoted zone is
 * stored on the row, so the primary line formats identically on both sides of
 * hydration. The reader's zone is knowable only in the browser, so that line
 * stays absent until after mount — rendering it during SSR would either print
 * the SERVER's zone as the user's (silently wrong, in a component whose entire
 * job is to be right about this) or tear the node down as a mismatch.
 */
export function MeetingTime({
  iso,
  timezone,
  durationMin,
  size = 'sm',
}: {
  iso: string | null;
  timezone: string | null;
  durationMin?: number | null;
  size?: 'sm' | 'md';
}) {
  const [viewerZone, setViewerZone] = useState<string | null>(null);
  useEffect(() => setViewerZone(browserZone()), []);

  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  // With no quoted zone the instant is all there is, so it is labelled UTC
  // rather than silently borrowed from the reader — an unlabelled time is the
  // failure this component exists to prevent.
  const sourceZone = timezone ?? 'UTC';
  const showViewer = viewerZone != null && viewerZone !== sourceZone;

  return (
    <div className={size === 'md' ? 'text-sm' : 'text-xs'}>
      <div className="flex flex-wrap items-baseline gap-x-2 font-medium text-[var(--text)]">
        <span>{formatInZone(date, sourceZone)}</span>
        <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {zoneAbbrev(date, sourceZone)}
        </span>
        {durationMin ? (
          <span className="text-[var(--muted)]">{formatDuration(durationMin)}</span>
        ) : null}
      </div>

      {showViewer && (
        <div className="mt-0.5 text-[var(--muted)]">
          {timeInZone(date, viewerZone)} your time
          {/* Named, not just "your time": a shared profile has several people
              in several places, and the label has to survive being read by a
              colleague over someone's shoulder. */}
          <span className="ml-1 opacity-60">({shortZone(viewerZone)})</span>
        </div>
      )}
    </div>
  );
}

/** "45 min" / "1h 30m" — compact enough to sit inline beside the stamp. */
function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "America/New_York" → "New York": the city is the identifying half. */
export function shortZone(zone: string): string {
  const tail = zone.split('/').pop() ?? zone;
  return tail.replace(/_/g, ' ');
}
