import { getToken } from './auth';
import type { ProfilePromptView } from './profile-prompts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchProfilePrompts(): Promise<ProfilePromptView[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API_URL}/api/profile-prompts`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
