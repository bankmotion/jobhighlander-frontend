import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** One editable model instruction, as the admin page shows it. */
export interface PromptView {
  key: string;
  name: string;
  description: string;
  content: string;
  /** False when the stored text still matches the shipped default. */
  customised: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Every editable prompt. Super-admin only; anything else yields []. */
export async function fetchPrompts(): Promise<PromptView[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/api/prompts`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
