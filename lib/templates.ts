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

/**
 * The template a resume renders with when nothing else is chosen.
 *
 * Mirrors FALLBACK_PRESET in the backend's templates/registry.ts, which is
 * what actually decides it. Kept here only so a control can SHOW the right
 * name: the default is a key, never "whichever preset happens to be listed
 * first", and the custom group now leads the list.
 */
export const FALLBACK_TEMPLATE_KEY = 'classic-ink';

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

export interface BackgroundDef {
  key: string;
  name: string;
  description: string;
  category: 'plain' | 'dots' | 'geometric' | 'lines' | 'accent';
}

/**
 * The background registry, for server components.
 *
 * Same endpoint as `fetchPresets` -- the admin screen needs both, and the API
 * returns them together so one request covers it.
 */
export async function fetchBackgroundDefs(): Promise<BackgroundDef[]> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/resumes/templates`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.backgrounds ?? [];
}
