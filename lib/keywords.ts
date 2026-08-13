import { getToken } from './auth';
import type { Keyword } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** All emphasis keywords (any signed-in user — used to highlight descriptions). */
export async function fetchKeywords(): Promise<Keyword[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/keywords`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  return res.json();
}
