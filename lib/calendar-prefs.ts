'use client';

import { createLocalStore } from './local-store';

/**
 * The calendar's view and profile filter, remembered between visits.
 *
 * An allow-list, like `job-filters`, and for the same reason — but a shorter
 * one. `date` is deliberately NOT stored: reopening the calendar in a month you
 * were reading three weeks ago is disorienting, and "today" is almost always
 * where someone wants to start. View and profile are settings; the date is
 * where you happened to be.
 *
 * `profile` IS stored here, unlike on the job list. There it would silently
 * switch which candidate you are bidding as, which is a decision made
 * elsewhere; here it only narrows whose interviews are drawn, and losing it on
 * every visit is the annoyance rather than the safeguard.
 */
const PREF_KEYS = ['view', 'profile'] as const;

function keepPrefKeys(raw: string): string {
  const src = new URLSearchParams(raw);
  const out = new URLSearchParams();
  for (const key of PREF_KEYS) {
    const value = src.get(key);
    if (value) out.set(key, value);
  }
  return out.toString();
}

const store = createLocalStore<string>({
  key: 'jh.calendar-prefs',
  parse: keepPrefKeys,
  serialize: keepPrefKeys,
  // Nothing stored means no preference, not "the defaults" — the page applies
  // those itself.
  fallback: () => '',
});

export const storedCalendarPrefs = (): string => store.stored() ?? '';

export const saveCalendarPrefs = (queryString: string): void => store.set(keepPrefKeys(queryString));

export const hasCalendarPrefParams = (params: URLSearchParams): boolean =>
  PREF_KEYS.some((key) => params.has(key));
