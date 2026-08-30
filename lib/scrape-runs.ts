import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ScrapeRun {
  id: number;
  site: string;
  status: string; // running | success | failed
  startedAt: string;
  finishedAt: string | null;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  error: string | null;
  createdAt: string;
}

export interface ScrapeRunPage {
  runs: ScrapeRun[];
  filters: { sites: string[] };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function fetchScrapeRuns(
  page = 1,
  filters: { sites?: string[]; statuses?: string[] } = {},
): Promise<ScrapeRunPage> {
  const token = await getToken();
  const qs = new URLSearchParams({ page: String(page) });
  (filters.sites ?? []).forEach((s) => qs.append('site', s));
  (filters.statuses ?? []).forEach((s) => qs.append('status', s));
  const res = await fetch(`${API_URL}/api/scrape-runs?${qs.toString()}`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to load scrape runs (${res.status})`);
  return res.json();
}
