import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface PromptView {
  key: string;
  name: string;
  description: string;
  content: string;
  present: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

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
