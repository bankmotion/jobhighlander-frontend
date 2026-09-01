'use client';

import { createLocalStore } from './local-store';
import { NAV_KEY, type NavState } from './nav-init';

export type { NavState };

const isNav = (v: string): v is NavState => v === 'shown' || v === 'hidden';

// Same store the theme and timezone use, so collapsing the sidebar in one tab
// collapses it in the others through its `storage` listener.
export const navStore = createLocalStore<NavState>({
  key: NAV_KEY,
  parse: (raw) => (isNav(raw) ? raw : null),
  serialize: (value) => value,
  fallback: () => 'shown',
});
