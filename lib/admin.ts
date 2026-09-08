import { getToken } from './auth';
import type { Role } from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  balanceMicroUsd: number;
  /** Null until they sign in for the first time after this was added. */
  lastLoginAt: string | null;
  createdAt: string;
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/auth/users`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
  return res.json();
}

/**
 * Sign-ups still waiting for a role.
 *
 * A separate call from `fetchUsers` rather than a filter over it, because the
 * two carry different permissions: this one an admin may read, the full roster
 * only a super admin. Filtering client-side would mean fetching what the reader
 * is not allowed to have.
 */
export async function fetchPendingUsers(): Promise<AdminUser[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/auth/users/pending`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to load pending sign-ups (${res.status})`);
  return res.json();
}
