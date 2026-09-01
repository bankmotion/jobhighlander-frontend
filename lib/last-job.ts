'use client';

import { createLocalStore } from './local-store';

export const LAST_JOB_KEY = 'jh.lastJob';

// Which job was last acted on. Persisted rather than kept in React state, and
// that is the whole point: the reason to mark it is that the user left — to a
// job board, an email client, another tab — and needs to find their place when
// they come back. State that dies with the page would only survive the case
// where nothing was lost anyway.
//
// It also syncs across tabs through the store's `storage` listener, so opening
// a posting in a second tab and acting there moves the marker in the list tab.
export const lastJobStore = createLocalStore<number>({
  key: LAST_JOB_KEY,
  parse: (raw) => {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  },
  serialize: (value) => String(value),
  // 0 is "none", which no real job id can be.
  fallback: () => 0,
});
