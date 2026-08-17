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

/** Recent scraper runs (server-side, forwards the session JWT). Super-admin only. */
export async function fetchScrapeRuns(): Promise<ScrapeRun[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/scrape-runs`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to load scrape runs (${res.status})`);
  return res.json();
}
