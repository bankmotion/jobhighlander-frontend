'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  STATUS_META,
  shortHash,
  usdt,
  type TopUpRequest,
} from '@/lib/billing';
import { Toast, useToast } from './toast';

const when = (iso: string) => new Date(iso).toLocaleString();

const EXPLORER: Record<string, string> = {
  bep20: 'https://bscscan.com/tx/',
  erc20: 'https://etherscan.io/tx/',
};

const CHAIN_LABEL: Record<string, string> = { bep20: 'BEP20', erc20: 'ERC20' };

/**
 * The super admin queue: deposit claims waiting on a decision.
 *
 * The amount box is pre-filled with what the user claimed but stays editable,
 * because the reviewer has looked at the chain and the user has not. Crediting
 * a figure that differs from the claim is a normal outcome here, not an error.
 */
export function TopUpReview({ initial }: { initial: TopUpRequest[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [amounts, setAmounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      initial.map((r) => [r.id, String(Number((r.claimedMicroUsd / 1_000_000).toFixed(2)))]),
    ),
  );
  const [notes, setNotes] = useState<Record<number, string>>({});
  const { toast, show, dismiss } = useToast();

  const pending = requests.filter((r) => r.status === 'pending');
  const settled = requests.filter((r) => r.status !== 'pending');

  async function act(r: TopUpRequest, action: 'credit' | 'reject') {
    const note = notes[r.id]?.trim() ?? '';
    if (action === 'reject' && !note) {
      show('Say why it was rejected — the user sees this.', 'error');
      return;
    }
    const amountUsd = Number(amounts[r.id]);
    if (action === 'credit' && (!Number.isFinite(amountUsd) || amountUsd <= 0)) {
      show('Enter the amount to credit.', 'error');
      return;
    }

    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/top-ups/${r.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'credit' ? { amountUsd, reviewNote: note } : { reviewNote: note },
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        show(data?.error ?? `Could not ${action} (${res.status})`, 'error');
        return;
      }
      const updated = data.request as TopUpRequest;
      setRequests((prev) =>
        prev.map((x) => (x.id === r.id ? { ...updated, user: x.user } : x)),
      );
      show(
        action === 'credit'
          ? `Credited ${usdt(updated.creditedMicroUsd ?? 0)} to ${r.user?.email ?? 'the user'}`
          : 'Marked as rejected',
      );
      router.refresh();
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
        No deposit claims. When someone tops up with USDT, their transaction hash appears here for
        checking.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold text-white">{r.user?.email ?? `User #${r.id}`}</span>
            <span className="text-xs text-[var(--muted)]">
              balance {usdt(r.user?.balanceMicroUsd ?? 0)}
            </span>
            <span className="ml-auto text-xs text-[var(--muted)]">{when(r.createdAt)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
              {CHAIN_LABEL[r.chain] ?? r.chain}
            </span>
            <span className="text-[var(--muted)]">claims {usdt(r.claimedMicroUsd)}</span>
            {/* The hash links straight to the right explorer for its chain —
                verifying is the whole job, so it should be one click. */}
            <a
              href={`${EXPLORER[r.chain] ?? ''}${r.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-[var(--primary)] underline"
            >
              {shortHash(r.txHash)} ↗
            </a>
          </div>

          {r.note && <p className="mt-1 text-sm text-[var(--muted)]">“{r.note}”</p>}

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Credit (USDT)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amounts[r.id] ?? ''}
                onChange={(e) => setAmounts((p) => ({ ...p, [r.id]: e.target.value }))}
                disabled={busyId === r.id}
                className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] disabled:opacity-60"
              />
            </label>
            <label className="block min-w-[200px] flex-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Note <span className="font-normal normal-case">— required to reject</span>
              </span>
              <input
                value={notes[r.id] ?? ''}
                onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                maxLength={500}
                disabled={busyId === r.id}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] disabled:opacity-60"
              />
            </label>
            <button
              type="button"
              onClick={() => act(r, 'credit')}
              disabled={busyId === r.id}
              className="jh-cta rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              {busyId === r.id ? 'Working…' : 'Credit'}
            </button>
            <button
              type="button"
              onClick={() => act(r, 'reject')}
              disabled={busyId === r.id}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {settled.length > 0 && (
        <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Already reviewed ({settled.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {settled.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <span className="text-[var(--text)]">{r.user?.email}</span>
                  <span className="text-[var(--muted)]">
                    {r.creditedMicroUsd != null ? usdt(r.creditedMicroUsd) : usdt(r.claimedMicroUsd)}
                  </span>
                  <a
                    href={`${EXPLORER[r.chain] ?? ''}${r.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[var(--muted)] underline hover:text-white"
                  >
                    {shortHash(r.txHash)}
                  </a>
                  {r.reviewNote && (
                    <span className="text-xs text-[var(--muted)]">— {r.reviewNote}</span>
                  )}
                  <span className="ml-auto text-xs text-[var(--muted)]">
                    {r.reviewedAt ? when(r.reviewedAt) : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
