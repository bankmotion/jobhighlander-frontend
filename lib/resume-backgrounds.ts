/**
 * The decorative background choice for a rendered resume.
 *
 * The list is fetched, never hard-coded: the server owns the registry, and a
 * copy here would drift the moment a background is added or renamed. See
 * `backend/src/resume/backgrounds.ts`.
 *
 * The CHOICE is stored on the profile (`defaultBackground`), set from the
 * admin templates screen, with a per-resume override in the generator. It was
 * briefly kept in localStorage instead; that made it per-browser and
 * per-person, so two bidders on one profile produced different-looking
 * resumes -- which is exactly what the template default exists to prevent.
 */

export type BackgroundCategory =
  | 'plain'
  | 'tint'
  | 'dots'
  | 'geometric'
  | 'lines'
  | 'accent'
  | 'dark';

export interface ResumeBackground {
  key: string;
  name: string;
  description: string;
  category: BackgroundCategory;
}

export const NO_BACKGROUND = 'none';

/**
 * Ordered so the plain option is always first and the loud ones are last.
 * Dark closes the list: it is the one group that changes the text colour too.
 */
export const CATEGORY_ORDER: BackgroundCategory[] = [
  'plain',
  'tint',
  'lines',
  'dots',
  'geometric',
  'accent',
  'dark',
];

export const CATEGORY_LABEL: Record<BackgroundCategory, string> = {
  plain: 'Plain',
  tint: 'Tinted Paper',
  lines: 'Lines',
  dots: 'Dots',
  geometric: 'Geometric',
  accent: 'Accents',
  dark: 'Dark',
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
