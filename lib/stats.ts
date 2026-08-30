/**
 * Bid-performance types and formatters.
 *
 * Client-safe: the dashboard is a client component and imports these as values,
 * so nothing here may reach into `next/headers`. The token-reading fetcher lives
 * in `stats.server.ts` for the same reason `ai-usage.server.ts` exists — see the
 * note there before merging the two.
 */

export type FunnelStage = 'applied' | 'interviewing' | 'offer' | 'accepted';

export interface BidPerformance {
  range: { days: number; from: string; to: string };
  totals: {
    applications: number;
    interviews: number;
    offers: number;
    accepted: number;
    rejected: number;
    discarded: number;
    companies: number;
    activeInterviews: number;
  };
  rates: { interview: number; offer: number; accepted: number };
  daily: { date: string; applications: number; interviews: number }[];
  funnel: { stage: FunnelStage; label: string; count: number }[];
  bySite: { site: string; applications: number; interviews: number; rate: number }[];
  byCompany: { company: string; applications: number; interviews: number }[];
  byProfile: { profileId: number; name: string; applications: number; interviews: number; offers: number }[];
  outcomes: { status: string; label: string; count: number }[];
}

/** Ranges the page offers. Bounded by what the API accepts. */
export const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
] as const;

/**
 * Chart palette — validated with the dataviz validator against this app's chart
 * surface (#12121b), not chosen by eye.
 *
 * `SERIES` is the single-series hue (all checks pass). `FUNNEL` is an ordinal
 * one-hue ramp, light→dark, which passed the monotonic-lightness, step-gap and
 * light-end-contrast checks. Status colours are deliberately NOT used to encode
 * outcomes: run through the categorical checks they fail the normal-vision floor
 * (warning vs serious ΔE 13.6, below 15), so outcome identity is carried by the
 * row label and magnitude by bar length instead.
 */
export const SERIES = '#3987e5';
export const FUNNEL_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'] as const;

export const SITE_LABELS: Record<string, string> = {
  indeed: 'Indeed',
  glassdoor: 'Glassdoor',
  jobright: 'JobRight',
  linkedin: 'LinkedIn',
  himalayas: 'Himalayas',
  findmyremote: 'FindMyRemote',
  jobicy: 'Jobicy',
  themuse: 'The Muse',
  weworkremotely: 'WeWorkRemotely',
  remoteok: 'RemoteOK',
  unknown: 'Unknown',
};

export const siteLabel = (s: string): string => SITE_LABELS[s] ?? s;

export const pctText = (n: number): string => `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;

export const shortDate = (iso: string): string =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/**
 * Bucket the daily series so a long range stays readable.
 *
 * A year of daily bars is 365 marks in a few hundred pixels — each one sub-pixel
 * and most of them zero, which reads as an empty chart rather than a sparse one.
 * Weekly buckets keep the shape while giving every mark room to exist.
 */
export function bucketDaily(
  daily: BidPerformance['daily'],
): { key: string; label: string; applications: number; interviews: number }[] {
  if (daily.length <= 31) {
    return daily.map((d) => ({ key: d.date, label: shortDate(d.date), ...d }));
  }
  const out: { key: string; label: string; applications: number; interviews: number }[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const week = daily.slice(i, i + 7);
    out.push({
      key: week[0].date,
      label: shortDate(week[0].date),
      applications: week.reduce((s, d) => s + d.applications, 0),
      interviews: week.reduce((s, d) => s + d.interviews, 0),
    });
  }
  return out;
}
