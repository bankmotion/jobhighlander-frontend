'use client';

import { createLocalStore } from './local-store';
import { browserZone } from './tz';

/**
 * The zone every time in the app is displayed in.
 *
 * Defaults to the device's own and can be overridden by the user, persisted
 * across sessions. The override earns its place because the device zone is
 * often the wrong answer: someone working US hours from elsewhere thinks in
 * Eastern, and a bidder covering a candidate in another country needs to read
 * the schedule as that candidate will live it. The OS clock cannot know either.
 *
 * THIS CHANGES DISPLAY ONLY. A panel still stores the UTC instant plus the zone
 * the recruiter quoted, both untouched by this setting — which is what keeps
 * "2:00 PM Eastern" reproducible no matter who is looking at it.
 */
const store = createLocalStore<string>({
  key: 'jh.display-zone',
  // Reject anything the runtime does not recognise. A stale or hand-edited zone
  // would otherwise reach `Intl.DateTimeFormat({ timeZone })`, which THROWS on
  // an unknown name — turning a bad preference into a crashed page.
  parse: (raw) => (isValidZone(raw) ? raw : null),
  serialize: (zone) => zone,
  fallback: browserZone,
});

function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The active display zone, or `null` while server-rendering.
 *
 * Callers MUST handle the null rather than substituting a default: painting a
 * time in the server's zone and correcting it a frame later is, in a component
 * whose whole job is being right about time, worse than painting nothing.
 */
export const useDisplayZone = (): string | null => store.useValue();

/** The user's explicit choice, or null when following the device. */
export const storedZone = (): string | null => store.stored();

/** Override the zone, or pass null to go back to following the device. */
export const setDisplayZone = (zone: string | null): void => store.set(zone);
