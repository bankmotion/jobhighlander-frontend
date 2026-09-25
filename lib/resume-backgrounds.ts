/**
 * The decorative background choice for a rendered resume.
 *
 * The list is fetched, never hard-coded: the server owns the registry, and a
 * copy here would drift the moment a background is added or renamed. See
 * `backend/src/resume/backgrounds.ts`.
 */

export type BackgroundCategory = 'plain' | 'dots' | 'geometric' | 'lines' | 'accent';

export interface ResumeBackground {
  key: string;
  name: string;
  description: string;
  category: BackgroundCategory;
}

export const NO_BACKGROUND = 'none';

/** Ordered so the plain option is always first and the loud ones are last. */
export const CATEGORY_ORDER: BackgroundCategory[] = [
  'plain',
  'lines',
  'dots',
  'geometric',
  'accent',
];

export const CATEGORY_LABEL: Record<BackgroundCategory, string> = {
  plain: 'Plain',
  lines: 'Lines',
  dots: 'Dots',
  geometric: 'Geometric',
  accent: 'Accents',
};

/**
 * Fetched through the Next proxy so the auth cookie is applied for us.
 *
 * Returns an empty list on any failure rather than throwing: a background is
 * decoration, and losing the picker must never stop a resume being rendered.
 */
export async function fetchBackgrounds(): Promise<ResumeBackground[]> {
  try {
    const res = await fetch('/api/resumes/templates', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.backgrounds) ? data.backgrounds : [];
  } catch {
    return [];
  }
}

const STORAGE_KEY = 'resume.background';

/**
 * Remembered per browser, like the download folder is.
 *
 * Deliberately not stored on the resume row: this is a presentation
 * preference, and someone who picked a background once means it for the next
 * one too. Re-picking it for every resume was the thing worth avoiding.
 */
export function loadBackground(): string {
  if (typeof window === 'undefined') return NO_BACKGROUND;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || NO_BACKGROUND;
  } catch {
    return NO_BACKGROUND;
  }
}

export function saveBackground(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Private browsing, or storage full. The choice still applies to this
    // render; it just will not be remembered.
  }
}
