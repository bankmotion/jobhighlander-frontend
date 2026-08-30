import { getToken } from './auth';
import type { Profile, ProfileSummary, ReceivedInvitation, SharedProfile } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchProfiles(): Promise<ProfileSummary[]> {
  const res = await fetch(`${API_URL}/api/profiles`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProfile(id: number): Promise<Profile | null> {
  const res = await fetch(`${API_URL}/api/profiles/${id}`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSharedProfiles(): Promise<SharedProfile[]> {
  const res = await fetch(`${API_URL}/api/invitations/sent`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchMyInvitations(): Promise<ReceivedInvitation[]> {
  const res = await fetch(`${API_URL}/api/invitations`, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}
