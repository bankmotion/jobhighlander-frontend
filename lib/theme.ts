'use client';

import { createLocalStore } from './local-store';
import { THEME_KEY, type Theme } from './theme-init';

export type { Theme };

const isTheme = (v: string): v is Theme => v === 'dark' || v === 'light';

// Persisted through the same store the timezone and job filters use, so the
// choice follows the `storage` event into every other open tab rather than
// each tab keeping its own idea of the theme.
//
// The fallback is `dark`, matching what the app looked like before a switch
// existed. The system preference is read in THEME_INIT_SCRIPT instead of here:
// by the time this store is first read, the browser has already painted.
export const themeStore = createLocalStore<Theme>({
  key: THEME_KEY,
  parse: (raw) => (isTheme(raw) ? raw : null),
  serialize: (value) => value,
  fallback: () => 'dark',
});
