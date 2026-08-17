import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ScraperSetting {
  key: string;
  value: string;
  updatedAt: string;
}

/** All scraper settings (server-side, forwards the session JWT). Super-admin only. */
export async function fetchScraperSettings(): Promise<ScraperSetting[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/scraper-settings`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to load scraper settings (${res.status})`);
  return res.json();
}
