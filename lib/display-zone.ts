'use client';

import { createLocalStore } from './local-store';
import { browserZone } from './tz';

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

export const useDisplayZone = (): string | null => store.useValue();

export const storedZone = (): string | null => store.stored();

export const setDisplayZone = (zone: string | null): void => store.set(zone);
