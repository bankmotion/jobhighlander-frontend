'use client';

import { createLocalStore } from './local-store';

/**
 * The job list's filters, remembered between visits.
 *
 * STORED AS A QUERY STRING, not as an object, because the URL is already the
 * source of truth for these — every filter control writes one and the page
 * reads one. Persisting the same representation means there is no second shape
 * to keep in step, and restoring is a navigation rather than a re-derivation.
 *
 * `profile` is deliberately NOT among the persisted keys. Which candidate you
 * are looking at is chosen from the sidebar and the picker, and a filter store
 * that also pinned the profile would drag you back to yesterday's candidate
 * every time you opened the list.
 */
const FILTER_KEYS = ['q', 'site', 'remote', 'applied', 'discarded'] as const;

/**
 * Keep only the keys above, dropping everything else.
 *
 * This is the validation the store requires, and it is load-bearing rather than
 * tidiness: the stored string is fed straight back into the URL, so without a
 * whitelist a value left over from an older release — or edited by hand in
 * devtools — would inject arbitrary query parameters into the page's own
 * navigation.
 */
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

/** The remembered filter query, or "" when none is stored. */
export const storedJobFilters = (): string => store.stored() ?? '';

/**
 * Remember the current filters. Pass the page's full query string; the
 * non-filter keys are stripped on the way in.
 *
 * Called on EVERY filter change including "Clear all", which is what makes
 * clearing stick: writing the empty string is how the store learns the user
 * meant to see everything, instead of restoring yesterday's filters over the
 * top of a list they just reset.
 */
export const saveJobFilters = (queryString: string): void => store.set(keepFilterKeys(queryString));

/**
 * Whether a URL already carries filters of its own.
 *
 * A shared or bookmarked link must win over the store, so restoring is only
 * correct when the address bar says nothing about filtering. `profile` alone
 * does not count — arriving from the sidebar carries it and still means "show
 * me my list".
 */
export const hasFilterParams = (params: URLSearchParams): boolean =>
  FILTER_KEYS.some((key) => params.has(key));
