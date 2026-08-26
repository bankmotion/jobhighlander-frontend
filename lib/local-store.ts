'use client';

import { useSyncExternalStore } from 'react';

/**
 * A typed, SSR-safe, cross-tab-synced value in localStorage.
 *
 * WHY A STORE RATHER THAN `useState` + `useEffect`. A persisted preference has
 * four problems that plain component state does not solve, and every one of
 * them is a bug the first time it is skipped:
 *
 *   1. It lives OUTSIDE React, so React has to be told when it changes.
 *   2. The server cannot read it, so the first paint has no value — and
 *      inventing one there means either a hydration mismatch or silently
 *      rendering the server's answer as the user's.
 *   3. Every component reading it must re-render the moment it changes, without
 *      a provider threaded through pages that are otherwise server-rendered.
 *   4. Two open tabs must agree.
 *
 * `useSyncExternalStore` is the primitive for exactly this, and its server
 * snapshot gives the honest `null` that callers render around.
 *
 * WHAT CALLERS MUST HANDLE: `useValue()` returns `null` during SSR and on the
 * very first client render. That is deliberate. Render a neutral placeholder
 * for it rather than a guess — a preference painted wrong and then corrected is
 * worse than one that arrives a frame late.
 */
export interface LocalStore<T> {
  /**
   * React hook. Returns the stored value, else the fallback — and `null` while
   * server-rendering. Named `useValue` so the rules-of-hooks lint recognises
   * `store.useValue()` as a hook call.
   */
  useValue(): T | null;
  /** Current value outside React (client only): stored, else the fallback. */
  read(): T;
  /** The stored value alone, or null when nothing valid is persisted. */
  stored(): T | null;
  /** Persist a value, or pass null to clear back to the fallback. */
  set(value: T | null): void;
}

/**
 * Every store, by storage key, so ONE window listener serves all of them.
 *
 * Registering a listener per store — or worse, per subscriber — would attach
 * dozens on a page like the calendar, where every event on the grid subscribes.
 */
const registry = new Map<string, { invalidate: () => void }>();

let wired = false;

function wireOnce(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('storage', (e) => {
    // `key === null` means localStorage.clear() — no one key changed, so every
    // store has to re-read rather than none of them.
    if (e.key === null) {
      for (const s of registry.values()) s.invalidate();
      return;
    }
    registry.get(e.key)?.invalidate();
  });
}

export function createLocalStore<T>({
  key,
  parse,
  serialize,
  fallback,
}: {
  /** Storage key. Namespace it — `jh.` here — so it cannot collide. */
  key: string;
  /**
   * Turn a raw stored string into a value, or return null to REJECT it.
   *
   * Rejecting matters: storage outlives deploys. A value written by an older
   * version, hand-edited in devtools, or left over from a renamed option will
   * still be there, and a store that trusts it propagates the bad value into
   * every render instead of quietly falling back.
   */
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
  /** The value when nothing valid is stored. Called on the client only. */
  fallback: () => T;
}): LocalStore<T> {
  const listeners = new Set<() => void>();

  // `getSnapshot` must return a stable value between changes or
  // `useSyncExternalStore` re-renders forever. Caching also keeps a synchronous
  // storage read off every render of every consumer.
  let cache: T | null = null;
  let cacheValid = false;

  const invalidate = (): void => {
    cacheValid = false;
    for (const cb of listeners) cb();
  };

  registry.set(key, { invalidate });

  const stored = (): T | null => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : parse(raw);
    } catch {
      // Private mode, disabled storage, or a security policy. Not worth
      // surfacing — the app falls back, which is the default behaviour anyway.
      return null;
    }
  };

  const read = (): T => {
    if (!cacheValid) {
      cache = stored() ?? fallback();
      cacheValid = true;
    }
    return cache as T;
  };

  const subscribe = (cb: () => void): (() => void) => {
    wireOnce();
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  };

  const getServerSnapshot = (): null => null;

  return {
    useValue: () => useSyncExternalStore(subscribe, read, getServerSnapshot),
    read,
    stored,
    set(value: T | null) {
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, serialize(value));
      } catch {
        // Cannot persist, but this tab should still reflect the choice rather
        // than appear to ignore the click.
      }
      // Directly, because the `storage` event fires only in OTHER tabs.
      invalidate();
    },
  };
}

/**
 * The same thing for structured values — the common case for anything past a
 * single string (saved filters, column choices, collapsed sections).
 *
 * `validate` is not optional on purpose. `JSON.parse` returns `any`, so without
 * a guard the store hands unchecked storage content to callers as a typed value
 * and the first `.map` on a shape that changed between deploys throws.
 */
export function createJsonLocalStore<T>({
  key,
  validate,
  fallback,
}: {
  key: string;
  validate: (value: unknown) => value is T;
  fallback: () => T;
}): LocalStore<T> {
  return createLocalStore<T>({
    key,
    parse: (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        return validate(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
    fallback,
  });
}
