'use client';

import { createJsonLocalStore } from './local-store';
import { isAiProvider, type AiProvider, type ProviderInfo } from './ai-providers';

/**
 * Which model to generate with, and whether to keep asking.
 *
 * One store rather than two keys because the two settings are only meaningful
 * together: suppressing the confirm dialog without a remembered provider would
 * silently spend money on whichever provider happened to sort first.
 */
export interface AiPreference {
  provider: AiProvider | null;
  /**
   * Epoch ms after which the confirm dialog comes back. 0 means "always ask".
   *
   * Stored as a deadline rather than a boolean so it expires on its own. A
   * plain "don't ask again" flag set during a busy afternoon is still set three
   * months later, when the person has forgotten which provider they are paying
   * for.
   */
  skipUntil: number;
}

export const SKIP_HOURS = 24;

const SKIP_MS = SKIP_HOURS * 60 * 60 * 1000;

/** The pre-store key, kept only so an existing choice survives the upgrade. */
const LEGACY_PROVIDER_KEY = 'jh:ai-provider';

const isPreference = (v: unknown): v is AiPreference => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    (p.provider === null || isAiProvider(p.provider)) &&
    typeof p.skipUntil === 'number' &&
    Number.isFinite(p.skipUntil)
  );
};

function legacyProvider(): AiProvider | null {
  try {
    const v = window.localStorage.getItem(LEGACY_PROVIDER_KEY);
    return isAiProvider(v) ? v : null;
  } catch {
    return null;
  }
}

const store = createJsonLocalStore<AiPreference>({
  key: 'jh.ai-preference',
  validate: isPreference,
  // Inherits the provider someone already picked, but never inherits a skip:
  // consent to stop asking has to be given under the current wording.
  fallback: () => ({ provider: legacyProvider(), skipUntil: 0 }),
});

export const readAiPreference = (): AiPreference => store.read();

/** Reactive: the top-bar switch and every open dialog move together. */
export const useAiPreference = (): AiPreference | null => store.useValue();

/**
 * Is the confirm dialog currently suppressed?
 *
 * Takes `now` so callers on a render path can pass a value they already have,
 * and so this stays testable without faking the clock.
 */
export const skipActive = (pref: AiPreference, now: number = Date.now()): boolean =>
  pref.skipUntil > now && pref.provider != null;

/** Whole hours left on the suppression, for telling the user when it lapses. */
export const skipHoursLeft = (pref: AiPreference, now: number = Date.now()): number =>
  Math.max(0, Math.ceil((pref.skipUntil - now) / (60 * 60 * 1000)));

export function setPreferredProvider(provider: AiProvider): void {
  store.set({ ...store.read(), provider });
}

/**
 * Start or end the quiet period.
 *
 * Turning it on requires a provider, because "don't ask me" is only safe once
 * the answer is known.
 */
export function setSkipConfirm(on: boolean, provider?: AiProvider): void {
  const current = store.read();
  const chosen = provider ?? current.provider;
  if (on && !chosen) return;
  store.set({
    provider: chosen,
    skipUntil: on ? Date.now() + SKIP_MS : 0,
  });
}

/**
 * The provider to generate with WITHOUT asking, or null to open the dialog.
 *
 * Checked against the live catalogue on every call: a key removed from the
 * server since the preference was stored would otherwise send a silent
 * generation straight into a 503, with no dialog on screen to explain it.
 */
export function autoProvider(catalogue: ProviderInfo[], now: number = Date.now()): AiProvider | null {
  const pref = store.read();
  if (!skipActive(pref, now)) return null;
  const usable = catalogue.find((p) => p.id === pref.provider && p.enabled);
  return usable ? usable.id : null;
}
