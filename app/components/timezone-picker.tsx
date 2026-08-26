'use client';

import { setDisplayZone, storedZone, useDisplayZone } from '@/lib/display-zone';
import { allZones, browserZone, zoneAbbrev, zoneOffsetLabel } from '@/lib/tz';
import { shortZone } from './meeting-time';

const COMMON_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Warsaw',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

/** Sentinel for "follow this device" — the empty value a `<select>` can hold. */
const AUTO = '';

/**
 * Display-zone picker, in the top bar so it is reachable from every page.
 *
 * In the top bar rather than a settings screen because it is a READING aid, not
 * a configuration step: the moment you want it is while looking at a time you
 * cannot place, and a preference you have to navigate away to change is one
 * nobody changes.
 *
 * Renders nothing until the zone is known. During SSR `useDisplayZone` is null
 * by design, and a placeholder that guesses a zone would flash the wrong answer
 * in the one control whose entire purpose is to say which zone you are reading.
 */
export function TimezonePicker() {
  const zone = useDisplayZone();
  if (!zone) return <span aria-hidden className="hidden h-8 w-24 sm:block" />;

  const device = browserZone();
  const overridden = storedZone() !== null;
  const now = new Date();

  // The device zone always appears, plus the common list, plus whatever is
  // currently selected — a zone picked from the full list must not vanish from
  // the top group the next time the control renders.
  const all = allZones();
  const top = [device, zone, ...COMMON_ZONES].filter(
    (z, i, arr) => all.includes(z) && arr.indexOf(z) === i,
  );

  return (
    <label className="flex items-center gap-1.5" title="Time zone all times are shown in">
      <span aria-hidden className="text-sm">
        🌐
      </span>
      <span className="sr-only">Display time zone</span>
      <select
        value={overridden ? zone : AUTO}
        onChange={(e) => setDisplayZone(e.target.value === AUTO ? null : e.target.value)}
        className={`max-w-[9.5rem] rounded-lg border bg-[var(--surface-2)] px-2 py-1 text-xs outline-none transition focus:border-[var(--primary)] ${
          // An override is worth flagging: a schedule read in a zone you are not
          // in is exactly the state where a quiet control causes a missed call.
          overridden
            ? 'border-[var(--primary)]/50 text-[var(--text)]'
            : 'border-[var(--border)] text-[var(--muted)]'
        }`}
      >
        <option value={AUTO}>Device · {zoneAbbrev(now, device)}</option>
        <optgroup label="Common">
          {top.map((z) => (
            <option key={`top-${z}`} value={z}>
              {shortZone(z)} · {zoneOffsetLabel(now, z)}
            </option>
          ))}
        </optgroup>
        <optgroup label="All time zones">
          {all.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
