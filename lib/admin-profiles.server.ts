import { getToken } from './auth';
import type { AdminProfileRow } from './admin-profiles';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Server-only, same split as the other admin fetchers: `getToken` reads
// `next/headers`, so it must not be reachable from a client component.
export async function fetchAllProfiles(): Promise<AdminProfileRow[] | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/profiles/all`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminProfileRow[];
  } catch {
    return null;
  }
}
