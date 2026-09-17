import { getToken } from './auth';
import type { GrantsData } from './grants';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchGrants(): Promise<GrantsData> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/grants`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  // Fails soft to "nothing granted", which is also the safe reading: the page
  // shows no permissions rather than implying ones it could not confirm.
  if (!res.ok) return { features: [], profiles: [] };
  return (await res.json()) as GrantsData;
}
