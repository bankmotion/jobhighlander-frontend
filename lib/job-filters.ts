'use client';

import { createLocalStore } from './local-store';

// An allow-list, not a blocklist: `profile` and `page` travel in the same query
// string and must NOT be restored — the candidate is chosen elsewhere, and
// reopening the list on page 7 would be baffling.
//
// The cost of that choice is that a new filter is silently dropped until it is
// added here, which is exactly what happened to the posted-date filter.
const FILTER_KEYS = [
  'title', 'company', 'location', 'description',
  'site', 'remote', 'applied', 'othersApplied', 'discarded', 'interview',
  'posted', 'postedFrom', 'postedTo',
] as const;

function keepFilterKeys(raw: string): string {
  const src = new URLSearchParams(raw);
  const out = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    for (const value of src.getAll(key)) out.append(key, value);
  }
  return out.toString();
}

const store = createLocalStore<string>({
  key: 'jh.job-filters',
  parse: keepFilterKeys,
  serialize: keepFilterKeys,
  // Nothing stored means no filters, not "the defaults" — the page already
  // applies those itself.
  fallback: () => '',
});

export const storedJobFilters = (): string => store.stored() ?? '';

export const saveJobFilters = (queryString: string): void => store.set(keepFilterKeys(queryString));

export const hasFilterParams = (params: URLSearchParams): boolean =>
  FILTER_KEYS.some((key) => params.has(key));
