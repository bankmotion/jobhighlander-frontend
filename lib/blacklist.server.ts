/**
 * Server-only half of the blacklist client.
 *
 * Separate FILE, not just a separate function: importing `getToken` reaches
 * next/headers, and a client component that imports anything from the same
 * module drags that in and fails the build — which is exactly what happened
 * when both halves lived together. Mirrors lib/zone.server.ts.
 */
import { getToken } from './auth';
import type { BlacklistEntry } from './blacklist';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** SERVER ONLY — reads the auth cookie. Used to seed the page. */
export async function fetchBlacklist(profileId?: number): Promise<BlacklistEntry[]> {
  const token = await getToken();
  if (!token) return [];
  const qs = profileId ? `?profileId=${profileId}` : '';
  try {
    const res = await fetch(`${API_URL}/api/blacklist${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}
