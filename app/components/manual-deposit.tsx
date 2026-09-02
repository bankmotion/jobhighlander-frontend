'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usdt, type CreditableUser } from '@/lib/billing';
import { Toast, useToast } from './toast';

/**
 * Put credit on an account by hand, with no deposit claim behind it.
 *
 * Separate from the review queue on purpose: that flow answers "did this
 * transaction arrive", this one covers everything else — an opening balance, a
 * refund, a correction, a payment taken outside the app. Both land in the same
 * ledger, so the statement stays the single account of where money went.
 */
export function ManualDeposit({ users }: { users: CreditableUser[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [balances, setBalances] = useState(users);
  const { toast, show, dismiss } = useToast();

  const amountNum = Number(amount);
  // Negative is allowed and deliberate — taking credit back is a correction,
  // and forcing it through a separate screen would tempt someone to edit the
  // database instead, leaving no ledger entry at all.
  const valid = userId !== '' && Number.isFinite(amountNum) && amountNum !== 0 && note.trim() !== '';
  const target = balances.find((u) => u.id === userId);

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/payments/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amountUsd: amountNum, note: note.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        show(data?.error ?? `Could not apply (${res.status})`, 'error');
        return;
      }
      setBalances((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, balanceMicroUsd: data.balanceMicroUsd } : u)),
      );
      show(`${target?.email ?? 'Balance'} is now ${usdt(data.balanceMicroUsd)}`);
      setAmount('');
      setNote('');
      router.refresh();
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-white">Deposit manually</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Credit an account without a deposit claim — an opening balance, a correction, or a payment
        taken another way. A negative amount takes credit back. Every change is recorded on the
        user&apos;s statement.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Account
          </span>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
            disabled={busy}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-60"
          >
            <option value="">Choose a user…</option>
            {balances.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} — {usdt(u.balanceMicroUsd)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Amount (USDT)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            placeholder="25"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Reason <span className="font-normal normal-case">— required, shown on their statement</span>
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          disabled={busy}
          placeholder="Opening balance"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !valid}
          className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Applying…' : 'Apply'}
        </button>
        {target && Number.isFinite(amountNum) && amountNum !== 0 && (
          <span className="text-xs text-[var(--muted)]">
            {usdt(target.balanceMicroUsd)} →{' '}
            <span className="text-[var(--text)]">
              {usdt(target.balanceMicroUsd + Math.round(amountNum * 1_000_000))}
            </span>
          </span>
        )}
      </div>

      <Toast toast={toast} onDismiss={dismiss} />
    </section>
  );
}
