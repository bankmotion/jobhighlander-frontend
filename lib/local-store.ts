'use client';

import { useSyncExternalStore } from 'react';

export interface LocalStore<T> {
  useValue(): T | null;
  read(): T;
  stored(): T | null;
  set(value: T | null): void;
}

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
  key: string;
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
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
