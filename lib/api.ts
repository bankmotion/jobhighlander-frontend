import type { Job, JobFilters, Paginated } from './types';
import type { AppliedFilter } from './applications';
import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface JobQuery {
  q?: string;
  sites?: string[];
  /** When true, request only remote jobs. */
  remote?: boolean;
  /**
   * Applied is per profile, so this needs `profileId` to mean anything; the
   * backend ignores it without one rather than guessing.
   */
  applied?: AppliedFilter;
  profileId?: number | null;
  page?: number;
  pageSize?: number;
}

/** Auth header carrying the session JWT to the backend (server-side only). */
async function authHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchJobs(query: JobQuery = {}): Promise<Paginated<Job>> {
  const qs = new URLSearchParams();
  if (query.q) qs.set('q', query.q);
  (query.sites ?? []).forEach((s) => qs.append('site', s));
  if (query.remote) qs.set('remote', '1');
  // Filtering has to happen in the query, not on the returned page: trimming
  // client-side would leave `total` counting rows that were then removed, so
  // the pagination would promise pages that render empty.
  if (query.applied && query.applied !== 'all') qs.set('applied', query.applied);
  if (query.profileId) qs.set('profileId', String(query.profileId));
  if (query.page) qs.set('page', String(query.page));
  if (query.pageSize) qs.set('pageSize', String(query.pageSize));

  const res = await fetch(`${API_URL}/api/jobs?${qs.toString()}`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
  return res.json();
}

export async function fetchJob(id: number): Promise<Job | null> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load job (${res.status})`);
  return res.json();
}

export async function fetchFilters(): Promise<JobFilters> {
  const res = await fetch(`${API_URL}/api/jobs/filters`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return { sites: [], locations: [] };
  return res.json();
}
