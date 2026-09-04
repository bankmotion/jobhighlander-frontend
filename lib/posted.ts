/**
 * When the job was posted — as opposed to when the scraper found it.
 *
 * 'today' and '3d' are CALENDAR windows in the viewer's zone, not rolling
 * hours. They sit next to a date-range picker, so they have to mean the same
 * kind of thing the picker does; "the last 72 hours" beside two date inputs
 * would be two different notions of a day in one control.
 */
export type PostedFilter = 'all' | 'today' | '3d' | 'custom';

export const POSTED_TABS: { value: PostedFilter; label: string }[] = [
  { value: 'all', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: '3d', label: '3 days' },
  { value: 'custom', label: 'Custom' },
];

export const isPostedFilter = (v: unknown): v is PostedFilter =>
  v === 'all' || v === 'today' || v === '3d' || v === 'custom';

export const parsePosted = (v: string | null | undefined): PostedFilter =>
  isPostedFilter(v) ? v : 'all';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Only well-formed dates travel; anything else is dropped rather than 400'd. */
export const parseDate = (v: string | null | undefined): string =>
  v && ISO_DATE.test(v) ? v : '';

/**
 * Is this filter actually narrowing anything?
 *
 * 'custom' with neither end set is not: the server treats it as no filter, and
 * the UI must agree or the "filtered" indicator lies.
 */
export const postedActive = (posted: PostedFilter, from: string, to: string): boolean =>
  posted === 'today' || posted === '3d' || (posted === 'custom' && Boolean(from || to));

/** Writes the posted params into a query string, omitting the defaults. */
export function writePosted(
  qs: URLSearchParams,
  posted: PostedFilter,
  from: string,
  to: string,
): void {
  if (posted === 'all') return;
  if (posted === 'custom') {
    // Dropped entirely when neither end is set — it would be a no-op parameter
    // that still makes the URL look filtered.
    if (!from && !to) return;
    qs.set('posted', 'custom');
    if (from) qs.set('postedFrom', from);
    if (to) qs.set('postedTo', to);
    return;
  }
  qs.set('posted', posted);
}

/** A short human summary for the active-filter chip. */
export function postedSummary(posted: PostedFilter, from: string, to: string): string | null {
  if (posted === 'today') return 'Posted today';
  if (posted === '3d') return 'Posted in 3 days';
  if (posted !== 'custom' || (!from && !to)) return null;
  if (from && to) return from === to ? `Posted ${from}` : `Posted ${from} → ${to}`;
  return from ? `Posted since ${from}` : `Posted until ${to}`;
}
