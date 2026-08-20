import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** A stored cover letter — finished text, ready to paste. */
export interface CoverLetter {
  body: string;
  /** Claims the letter makes that the profile does not state. */
  reviewNotes: string[];
  /** True once edited by hand; regenerating then asks for confirmation. */
  edited: boolean;
  model: string;
  updatedAt: string;
}

/**
 * The saved letter for a (profile, job), or null.
 *
 * Fetched on the server so the tab renders its real state on first paint
 * instead of flashing "no letter yet" and correcting itself.
 */
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

/** What a job card needs: that a letter exists, not the letter itself. */
export interface CoverLetterStatus {
  jobId: number;
  edited: boolean;
  updatedAt: string;
}

/** Keyed by job id. A job with no letter is simply absent. */
export type CoverLetterStatusMap = Record<number, CoverLetterStatus>;

/**
 * Which of these jobs already have a letter, for a whole page at once.
 *
 * Resolved on the server so the first paint is already correct — fetching from
 * the client would paint every card as "no letter" and then correct itself.
 */
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
