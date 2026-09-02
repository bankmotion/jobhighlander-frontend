'use client';

import { useState } from 'react';
import type { ProviderRate } from '@/lib/ai-usage';
import { Toast, useToast } from './toast';

const MIN = 0.01;
const MAX = 100;

/** "1.2" not "1.20" — trailing zeros read as more precision than is meant. */
const fmt = (n: number): string => String(Number(n.toFixed(4)));

const pct = (multiplier: number): string => {
  const delta = (multiplier - 1) * 100;
  if (Math.abs(delta) < 0.005) return 'at list price';
  return `${delta > 0 ? '+' : ''}${Number(delta.toFixed(2))}% on list price`;
};

/**
 * What this deployment charges over the vendor's list price, per provider.
 *
 * Only ever affects calls made from now on. Rows already in the usage table
 * were priced at the markup in force when they ran and are deliberately left
 * alone — otherwise editing this field would silently restate last month's
 * invoice, and no figure on any report would be stable.
 */
export function AiMarkupEditor({ initial }: { initial: ProviderRate[] }) {
  const [rates, setRates] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((r) => [r.provider, fmt(r.multiplier)])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const { toast, show: notify, dismiss } = useToast();

  async function save(rate: ProviderRate) {
    const raw = drafts[rate.provider]?.trim() ?? '';
    const multiplier = Number(raw);
    if (!raw || !Number.isFinite(multiplier) || multiplier < MIN || multiplier > MAX) {
      notify(`Enter a number between ${MIN} and ${MAX}.`, 'error');
      return;
    }

    setSaving(rate.provider);
    try {
      const res = await fetch('/api/admin/ai-usage/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: rate.provider, multiplier }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify(data?.error ?? `Could not save (${res.status})`, 'error');
        return;
      }
      const saved = data.rate as ProviderRate;
      setRates((prev) => prev.map((r) => (r.provider === saved.provider ? saved : r)));
      setDrafts((prev) => ({ ...prev, [saved.provider]: fmt(saved.multiplier) }));
      notify(`${saved.label} now bills at ${fmt(saved.multiplier)}× list price`);
    } catch {
      notify('Could not reach the server.', 'error');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-white">Cost markup</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        What this deployment charges over each vendor&apos;s published price. A markup of 1 bills
        exactly what the API costs; 1.2 adds 20%. Every figure on this page and on{' '}
        <span className="text-[var(--text)]">Statistics → AI usage</span> is calculated with it.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rates.map((r) => {
          const draft = drafts[r.provider] ?? '';
          const dirty = draft.trim() !== fmt(r.multiplier);
          const busy = saving === r.provider;
          const parsed = Number(draft);
          const preview = Number.isFinite(parsed) && parsed >= MIN && parsed <= MAX ? parsed : null;

          return (
            <div
              key={r.provider}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-white">{r.label}</span>
                <span className="truncate font-mono text-xs text-[var(--muted)]">{r.model}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <label className="sr-only" htmlFor={`markup-${r.provider}`}>
                  {r.label} cost markup
                </label>
                <input
                  id={`markup-${r.provider}`}
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  min={MIN}
                  max={MAX}
                  value={draft}
                  disabled={busy}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [r.provider]: e.target.value }))}
                  className="w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
                />
                <span className="text-sm text-[var(--muted)]">× list price</span>
                <button
                  type="button"
                  onClick={() => save(r)}
                  disabled={!dirty || busy}
                  className="ml-auto rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>

              <p className="mt-2 text-xs text-[var(--muted)]">
                {preview === null ? (
                  <span className="text-red-300">
                    Enter a number between {MIN} and {MAX}.
                  </span>
                ) : (
                  pct(preview)
                )}
                {dirty && preview !== null && (
                  <span className="text-amber-300"> · unsaved</span>
                )}
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]/80">
                {r.updatedByEmail
                  ? `Last set by ${r.updatedByEmail}`
                  : 'Never changed — billing at list price'}
                {/* Surfaced because it is the one-way door: it says the
                    historical rows have already been lifted, so running the
                    backfill again would be a double charge. */}
                {r.backfilledAt && ' · history backfilled'}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        Applies to calls made from now on. Generations already recorded keep the markup they were
        priced at, so past totals do not move when this changes.
      </p>

      <Toast toast={toast} onDismiss={dismiss} />
    </section>
  );
}
