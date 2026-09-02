'use client';

import { createJsonLocalStore, createLocalStore } from './local-store';
import { DEFAULT_RANGE, type UsageRange } from './ai-usage';

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
  'days', 'preset', 'from', 'to', 'profile', 'user',
]);

export const teamBidPrefs = createQueryPrefs('jh.prefs.team-bid-performance', [
  'days', 'preset', 'from', 'to', 'profile', 'user',
]);

// ── AI usage (client state) ──
export interface AiUsagePrefs {
  range: UsageRange;
  userId: number | null;
  profileId: number | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRange(v: unknown): v is UsageRange {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  if (r.kind === 'preset') return r.preset === 'today' || r.preset === '24h';
  // Bounded here as well as on the server: a hand-edited value in localStorage
  // would otherwise be sent on every visit and rejected each time.
  if (r.kind === 'days') return typeof r.days === 'number' && r.days >= 1 && r.days <= 365;
  if (r.kind === 'custom') {
    return (
      typeof r.from === 'string' &&
      typeof r.to === 'string' &&
      ISO_DATE.test(r.from) &&
      ISO_DATE.test(r.to) &&
      r.from <= r.to
    );
  }
  return false;
}

// Anything stored under the previous `{ days }` shape simply fails validation
// and falls back to the default. Deliberate: a one-off reset to 30 days is a
// smaller cost than a migration path that has to be carried forever.
const isAiPrefs = (v: unknown): v is AiUsagePrefs => {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  const idOk = (x: unknown) => x === null || (typeof x === 'number' && Number.isInteger(x) && x > 0);
  return isRange(p.range) && idOk(p.userId) && idOk(p.profileId);
};

const aiPrefsFallback = (): AiUsagePrefs => ({
  range: DEFAULT_RANGE,
  userId: null,
  profileId: null,
});

export const myAiUsagePrefs = createJsonLocalStore<AiUsagePrefs>({
  key: 'jh.prefs.ai-usage',
  validate: isAiPrefs,
  fallback: aiPrefsFallback,
});

export const allAiUsagePrefs = createJsonLocalStore<AiUsagePrefs>({
  key: 'jh.prefs.ai-usage-all',
  validate: isAiPrefs,
  fallback: aiPrefsFallback,
});
