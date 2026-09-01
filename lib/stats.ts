import type { AppliedRow } from './applied';
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
  byUser: { userId: number; email: string; applications: number; interviews: number; offers: number }[];
  bidders: { userId: number; email: string }[];
  applied: AppliedRow[];
}

export const RANGES = [
  { days: 1, label: '24 hours' },
  { days: 3, label: '3 days' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
] as const;

export const dateInputValue = (d: Date): string => d.toISOString().slice(0, 10);

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
