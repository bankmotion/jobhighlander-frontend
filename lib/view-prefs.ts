'use client';

import { createJsonLocalStore, createLocalStore } from './local-store';

// Per-page view settings, remembered between visits.
//
// The four dashboards split into two shapes and each needs its own treatment:
//
//   * The bid-performance pages drive everything from the URL, so what is
//     remembered is the query string. Restoring means navigating.
//   * The AI usage pages hold their filters in client state and fetch for
//     themselves, so what is remembered is a small object, restored by reading
//     it during the first render.
//
// Both live here so the storage keys sit in one place and cannot collide.

/** Keeps only the params a page actually understands, so a stored string
 *  cannot carry `page`, `profile` or anything else back into a later visit. */
function filterKeys(raw: string, keys: readonly string[]): string {
  const src = new URLSearchParams(raw);
  const out = new URLSearchParams();
  for (const key of keys) {
    for (const value of src.getAll(key)) out.append(key, value);
  }
  return out.toString();
}

export interface QueryPrefs {
  save(queryString: string): void;
  stored(): string;
  hasParams(params: URLSearchParams): boolean;
}

export function createQueryPrefs(key: string, keys: readonly string[]): QueryPrefs {
  const store = createLocalStore<string>({
    key,
    parse: (raw) => filterKeys(raw, keys),
    serialize: (value) => filterKeys(value, keys),
    // Nothing stored means "no preference", not "the defaults" — each page
    // already applies its own.
    fallback: () => '',
  });

  return {
    save: (queryString) => store.set(filterKeys(queryString, keys)),
    stored: () => store.stored() ?? '',
    hasParams: (params) => keys.some((k) => params.has(k)),
  };
}

// ── Bid performance (URL-driven) ──
// `profile` and `user` are included deliberately: unlike the job list, where
// the profile decides whose resumes are reported and must not be pinned by a
// filter store, here it is only ever a filter on what is being counted.
export const bidPrefs = createQueryPrefs('jh.prefs.bid-performance', [
  'days', 'from', 'to', 'profile', 'user',
]);

export const teamBidPrefs = createQueryPrefs('jh.prefs.team-bid-performance', [
  'days', 'from', 'to', 'profile',
]);

// ── AI usage (client state) ──
export interface AiUsagePrefs {
  days: number;
  userId: number | null;
  profileId: number | null;
}

const isAiPrefs = (v: unknown): v is AiUsagePrefs => {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  const idOk = (x: unknown) => x === null || (typeof x === 'number' && Number.isInteger(x) && x > 0);
  // The range is bounded here as well as on the server: a hand-edited value in
  // localStorage would otherwise be sent on every visit and rejected each time.
  return typeof p.days === 'number' && p.days >= 1 && p.days <= 365 &&
    idOk(p.userId) && idOk(p.profileId);
};

export const myAiUsagePrefs = createJsonLocalStore<AiUsagePrefs>({
  key: 'jh.prefs.ai-usage',
  validate: isAiPrefs,
  fallback: () => ({ days: 30, userId: null, profileId: null }),
});

export const allAiUsagePrefs = createJsonLocalStore<AiUsagePrefs>({
  key: 'jh.prefs.ai-usage-all',
  validate: isAiPrefs,
  fallback: () => ({ days: 30, userId: null, profileId: null }),
});
