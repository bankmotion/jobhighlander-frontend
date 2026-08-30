'use client';

import { createLocalStore } from './local-store';

const FILTER_KEYS = ['q', 'site', 'remote', 'applied', 'discarded'] as const;

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
