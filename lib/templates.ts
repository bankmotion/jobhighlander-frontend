import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Preset {
  key: string;
  name: string;
  category: string;
  layout: string;
  accent: string;
  fontPair: string;
  density: string;
  atsSafe: boolean;
}

export async function fetchPresets(): Promise<Preset[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/resumes/templates`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.presets ?? [];
}
