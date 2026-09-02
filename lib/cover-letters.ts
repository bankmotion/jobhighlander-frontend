import { getToken } from './auth';
import type { AiProvider } from './ai-providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface CoverLetter {
  body: string;
  reviewNotes: string[];
  edited: boolean;
  model: string;
  provider: AiProvider | null;
  providerLabel: string;
  updatedAt: string;
}

export async function fetchCoverLetter(
  jobId: number,
  profileId: number,
): Promise<CoverLetter | null> {
  const token = await getToken();
  if (!token) return null;
  const qs = new URLSearchParams({ jobId: String(jobId), profileId: String(profileId) });
  try {
    const res = await fetch(`${API_URL}/api/cover-letters?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface CoverLetterStatus {
  jobId: number;
  edited: boolean;
  updatedAt: string;
}

export type CoverLetterStatusMap = Record<number, CoverLetterStatus>;

export async function fetchCoverLetterStatus(
  profileId: number,
  jobIds: number[],
): Promise<CoverLetterStatusMap> {
  if (!profileId || jobIds.length === 0) return {};
  const token = await getToken();
  if (!token) return {};
  const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
  try {
    const res = await fetch(`${API_URL}/api/cover-letters/status?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
