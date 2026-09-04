/**
 * When the job was posted — as opposed to when the scraper found it.
 *
 * Two KINDS of window, deliberately both offered:
 *
 *   - 'today' and '3d' are CALENDAR windows in the viewer's zone. They answer
 *     "what came in on my Tuesday".
 *   - '24h' is a ROLLING window. It answers "what is new".
 *
 * Neither substitutes for the other, and the difference is at its widest
 * exactly when someone is most likely to look: shortly after local midnight,
 * 'today' is minutes long and near-empty while '24h' holds a full day of
 * postings. Offering only the calendar version made a correct filter useless.
 */
export type PostedFilter = 'all' | 'today' | '24h' | '3d' | 'custom';

export interface PostedTab {
  value: PostedFilter;
  label: string;
  /** What the tab does, shown on hover and focus. */
  hint: string;
  /**
   * Shown under the hint on the tabs that narrow the list.
   *
   * About 5% of jobs — nearly all of them Glassdoor — have no posting date, and
   * any date window drops them. Worth saying at the point of choosing rather
   * than leaving someone to wonder where a source went.
   */
  note?: string;
}

const UNDATED_NOTE = 'Jobs with no posting date are hidden.';

export const POSTED_TABS: PostedTab[] = [
  {
    value: 'all',
    label: 'Any date',
    hint: 'Every job, however old — including ones with no posting date.',
  },
  {
    value: 'today',
    label: 'Today',
    hint: 'Posted since midnight, on your calendar.',
    // The trap this tab sets, said before it is sprung: just after midnight
    // "today" is a few minutes long, and a near-empty list reads as a broken
    // filter rather than a correct one.
    note: `Just after midnight this covers very little — try 24 hours. ${UNDATED_NOTE}`,
  },
  {
    value: '24h',
    label: '24 hours',
    hint: 'Posted in the last 24 hours, counting back from right now.',
    note: UNDATED_NOTE,
  },
  {
    value: '3d',
    label: '3 days',
    hint: 'Posted today or in the two days before it.',
    note: UNDATED_NOTE,
  },
  {
    value: 'custom',
    label: 'Custom',
    hint: 'Pick the exact dates the job was posted between.',
    note: UNDATED_NOTE,
  },
];

export const isPostedFilter = (v: unknown): v is PostedFilter =>
  v === 'all' || v === 'today' || v === '24h' || v === '3d' || v === 'custom';

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
  posted === 'today' ||
  posted === '24h' ||
  posted === '3d' ||
  (posted === 'custom' && Boolean(from || to));

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
  if (posted === '24h') return 'Posted in 24 hours';
  if (posted === '3d') return 'Posted in 3 days';
  if (posted !== 'custom' || (!from && !to)) return null;
  if (from && to) return from === to ? `Posted ${from}` : `Posted ${from} → ${to}`;
  return from ? `Posted since ${from}` : `Posted until ${to}`;
}
