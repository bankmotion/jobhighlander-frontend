import { getToken } from './auth';
import type { AiProvider } from './ai-providers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ResumeStatus {
  jobId: number;
  templateKey: string;
  model: string;
  provider: AiProvider | null;
  providerLabel: string;
  updatedAt: string;
  headline: string;
  inferredCount: number;
  reviewNoteCount: number;
}

export type ResumeStatusMap = Record<number, ResumeStatus>;

export async function fetchResumeStatus(
  profileId: number,
  jobIds: number[],
): Promise<ResumeStatusMap> {
  if (!profileId || jobIds.length === 0) return {};
  const token = await getToken();
  if (!token) return {};

  const qs = new URLSearchParams({ profileId: String(profileId), jobIds: jobIds.join(',') });
  try {
    const res = await fetch(`${API_URL}/api/resumes/status?${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
