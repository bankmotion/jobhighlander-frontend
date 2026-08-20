import { getToken } from './auth';
import type { Profile, ProfileSummary, ReceivedInvitation, SharedProfile } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Profiles the signed-in user may use — owned first, then accepted invites. */
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

/** The caller's own profiles with who each is shared with (admins only). */
export async function fetchSharedProfiles(): Promise<SharedProfile[]> {
  const res = await fetch(`${API_URL}/api/invitations/sent`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

/**
 * Invitations addressed to the signed-in user.
 *
 * Fetched unfiltered: the Profiles page shows the pending ones as a prompt and
 * needs the answered ones only to know not to prompt again.
 */
export async function fetchMyInvitations(): Promise<ReceivedInvitation[]> {
  const res = await fetch(`${API_URL}/api/invitations`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}
