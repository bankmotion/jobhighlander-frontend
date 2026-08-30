'use client';

import { useDisplayZone } from '@/lib/display-zone';
import { formatInZone, timeInZone, zoneAbbrev } from '@/lib/tz';

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
  // Null while server-rendering; the second line simply waits a frame for it.
  const viewerZone = useDisplayZone();

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
          {timeInZone(date, viewerZone)} in {shortZone(viewerZone)}
        </div>
      )}
    </div>
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function shortZone(zone: string): string {
  const tail = zone.split('/').pop() ?? zone;
  return tail.replace(/_/g, ' ');
}
