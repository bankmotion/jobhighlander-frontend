'use client';

import { useState } from 'react';
import { usdt, type AccountSummary } from '@/lib/billing';

/**
 * Which accounts the AI spend went to.
 *
 * A horizontal stacked bar, NOT a pie. Part-to-whole with long labels — email
 * addresses — is the case where a pie forces a legend of nine strings beside
 * slices nobody can order by eye. Stacked horizontally, the labels sit on the
 * rows and the ranking reads straight down.
 *
 * The tail folds into "Other" at four slots rather than growing a fifth hue: a
 * generated colour is indistinguishable from an existing one under colour-vision
 * deficiency, which is exactly what the palette gates exist to prevent.
 */
const SLOTS = ['var(--viz-in)', 'var(--viz-out)', 'var(--viz-3)', 'var(--viz-4)'];

const TOP = 4;

export function SpendShare({ accounts }: { accounts: AccountSummary[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const spenders = accounts
    .filter((a) => a.chargedMicroUsd > 0)
    .sort((a, b) => b.chargedMicroUsd - a.chargedMicroUsd);

  const total = spenders.reduce((n, a) => n + a.chargedMicroUsd, 0);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-white">Spend by account</h2>
        <div className="mt-3 flex h-[120px] items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] text-sm text-[var(--muted)]">
          Nothing has been generated yet.
        </div>
      </div>
    );
  }

  const head = spenders.slice(0, TOP);
  const tail = spenders.slice(TOP);
  const tailTotal = tail.reduce((n, a) => n + a.chargedMicroUsd, 0);

  const slices = [
    ...head.map((a, i) => ({
      key: a.email,
      label: a.email,
      value: a.chargedMicroUsd,
      color: SLOTS[i],
      sub: `${a.generations} generation${a.generations === 1 ? '' : 's'}`,
    })),
    ...(tailTotal > 0
      ? [
          {
            key: '__other',
            label: `Other (${tail.length})`,
            value: tailTotal,
            // Grey, not a fifth hue: the tail is context, not an identity.
            color: 'var(--border-strong)',
            sub: tail.map((a) => a.email).join(', '),
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Spend by account</h2>
        <span className="text-xs text-[var(--muted)]">{usdt(total)} billed, all time</span>
      </div>

      {/* A 2px surface gap between segments so adjacent fills never touch. */}
      <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-md">
        {slices.map((s) => (
          <div
            key={s.key}
            role="img"
            aria-label={`${s.label}: ${usdt(s.value)}`}
            title={`${s.label} — ${usdt(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              opacity: hover && hover !== s.key ? 0.45 : 1,
            }}
            className="transition-opacity"
          />
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {slices.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className={`flex flex-wrap items-baseline gap-x-2 text-xs transition-opacity ${
              hover && hover !== s.key ? 'opacity-50' : ''
            }`}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            {/* Labels wear text tokens; the swatch beside them carries identity,
                so the list stays readable if colour is unavailable. */}
            <span className="truncate text-[var(--text)]" title={s.sub}>
              {s.label}
            </span>
            <span className="ml-auto tabular-nums text-[var(--muted)]">
              {usdt(s.value)} · {((s.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
