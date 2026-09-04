'use client';

import { createLocalStore } from './local-store';
import { browserZone } from './tz';
// Re-exported rather than redeclared: the inline <head> script writes this same
// cookie from this same key, and two copies of either would let them drift.
import { TZ_COOKIE, ZONE_KEY } from './zone-init';

export { TZ_COOKIE };

const store = createLocalStore<string>({
  key: ZONE_KEY,
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
 * The zone is ALSO mirrored into a cookie.
 *
 * localStorage is unreachable from a server component, and every stats page is
 * server-rendered — so without this the first paint is computed in UTC and only
 * corrects after a client round trip, which shows the wrong day and then
 * silently swaps it. A cookie is the one client preference the server can read
 * while rendering.
 *
 * Not httpOnly and not a secret: it is a formatting preference, and the client
 * is the thing that knows it.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

export function writeZoneCookie(zone: string): void {
  try {
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    // Blocked cookies degrade to UTC on the server, which is the old behaviour
    // rather than a failure.
  }
}

/** What the server will actually read on the next request, or null if unset. */
export function zoneCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const hit = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${TZ_COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(TZ_COOKIE.length + 1)) : null;
}

export const useDisplayZone = (): string | null => store.useValue();

export const storedZone = (): string | null => store.stored();

export const setDisplayZone = (zone: string | null): void => {
  store.set(zone);
  // `null` means "follow the device", so the cookie carries the resolved zone
  // rather than being cleared — the server cannot resolve "device" on its own.
  writeZoneCookie(zone ?? browserZone());
};
