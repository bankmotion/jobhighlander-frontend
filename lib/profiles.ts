import { getToken } from './auth';
import type { Profile, ProfileSummary } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** The current admin's profiles (summary list). */
export async function fetchProfiles(): Promise<ProfileSummary[]> {
  const res = await fetch(`${API_URL}/api/profiles`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

/** One profile with work experience + education, or null. */
export async function fetchProfile(id: number): Promise<Profile | null> {
  const res = await fetch(`${API_URL}/api/profiles/${id}`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}
