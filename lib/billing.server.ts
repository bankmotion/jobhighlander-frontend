import { getToken } from './auth';
import type {
  Balance,
  CreditEntry,
  CreditableUser,
  DepositInfo,
  TopUpRequest,
} from './billing';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchBalance = (): Promise<Balance | null> => get<Balance>('/api/billing/balance');

export const fetchDepositInfo = (): Promise<DepositInfo | null> =>
  get<DepositInfo>('/api/billing/deposit');

export const fetchMyTopUps = async (): Promise<TopUpRequest[]> =>
  (await get<{ requests: TopUpRequest[] }>('/api/billing/top-ups'))?.requests ?? [];

export const fetchLedger = async (): Promise<CreditEntry[]> =>
  (await get<{ entries: CreditEntry[] }>('/api/billing/ledger'))?.entries ?? [];

// Super admin only. Returns null for anyone else — the endpoint 403s and `get`
// turns that into null, same as the usage fetchers.
export const fetchAllTopUps = async (): Promise<TopUpRequest[] | null> =>
  (await get<{ requests: TopUpRequest[] }>('/api/billing/top-ups/all'))?.requests ?? null;

export const fetchCreditEntries = async (): Promise<CreditEntry[] | null> =>
  (await get<{ entries: CreditEntry[] }>('/api/billing/entries'))?.entries ?? null;

export const fetchCreditableUsers = async (): Promise<CreditableUser[] | null> =>
  (await get<{ users: CreditableUser[] }>('/api/billing/users'))?.users ?? null;
