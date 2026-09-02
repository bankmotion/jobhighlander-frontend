import { getToken } from './auth';
import type { Role } from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  balanceMicroUsd: number;
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
