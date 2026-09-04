'use client';

import { useEffect, useState } from 'react';
import { loadProviders, priceHint, type ProviderInfo } from '@/lib/ai-providers';
import {
  setPreferredProvider,
  setSkipConfirm,
  skipActive,
  skipHoursLeft,
  useAiPreference,
} from '@/lib/ai-preference';

/**
 * Swap the AI provider from the top bar.
 *
 * Necessary once the confirm dialog can be switched off for a day: that dialog
 * was the only place the choice could be made, so suppressing it would
 * otherwise lock someone into whichever provider they picked on the way out.
 * The setting belongs next to the account and time zone — it is a preference
 * about how the app behaves, not an action on the page.
 */
export function ProviderSwitch() {
  const pref = useAiPreference();
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void loadProviders().then((r) => {
      if (!live) return;
      if (r.ok) setProviders(r.providers);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // `pref` is null only during hydration, before the store has read storage.
  const quiet = pref ? skipActive(pref) : false;
  const hoursLeft = pref ? skipHoursLeft(pref) : 0;
  const usable = (providers ?? []).filter((p) => p.enabled);

  if (failed) {
    return <p className="text-xs text-[var(--muted)]">Provider list unavailable.</p>;
  }

  if (providers === null) {
    return <p className="text-xs text-[var(--muted)]">Loading…</p>;
  }

  // With one key configured there is no choice to offer, so the control would
  // be a segmented control of one — stating which model runs is the whole of
  // the useful information.
  if (usable.length < 2) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {usable.length === 1 ? (
          <>
            Using <span className="text-[var(--text)]">{usable[0].label}</span> ({usable[0].model})
          </>
        ) : (
          'No AI provider is configured.'
        )}
      </p>
    );
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="AI provider"
        className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1"
      >
        {usable.map((p) => {
          const active = pref?.provider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreferredProvider(p.id)}
              title={priceHint(p) ?? p.model}
              className={`jh-press flex-1 rounded-md px-2 py-1.5 text-left transition ${
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              <span className="block text-xs font-medium">{p.label}</span>
              <span
                className={`block truncate font-mono text-[10px] ${
                  active ? 'text-white/70' : 'text-[var(--muted)]'
                }`}
              >
                {p.model}
              </span>
            </button>
          );
        })}
      </div>

      {/* The quiet period is stated wherever it can be ended. A setting that
          changes behaviour invisibly needs somewhere it visibly exists. */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        {quiet ? (
          <>
            <span className="text-[var(--muted)]">
              Not asking for {hoursLeft}h
            </span>
            <button
              type="button"
              onClick={() => setSkipConfirm(false)}
              className="jh-press rounded-md border border-[var(--border)] px-2 py-0.5 font-medium text-[var(--text)] transition hover:border-[var(--primary)]"
            >
              Ask each time
            </button>
          </>
        ) : (
          <span className="text-[var(--muted)]">Confirms before each generation</span>
        )}
      </div>
    </div>
  );
}
