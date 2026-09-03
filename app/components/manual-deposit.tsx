'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MICRO, usdt, type CreditableUser } from '@/lib/billing';
import { Toast, useToast } from './toast';

type Direction = 'credit' | 'deduct';

const DIRECTIONS: { key: Direction; label: string; hint: string }[] = [
  { key: 'credit', label: 'Add credit', hint: 'Opening balance, a deposit taken another way, a refund' },
  { key: 'deduct', label: 'Deduct', hint: 'Correct an over-credit, reverse a mistake, charge for something else' },
];

/**
 * Move a balance by hand, in either direction.
 *
 * The direction is a control, not a minus sign. The signed amount reaches the
 * server either way, but asking someone to type "-25" into a box labelled
 * Deposit hides half the feature and makes the destructive half the one you
 * reach by accident — a stray minus on a credit becomes a silent deduction.
 * Positive amount, explicit direction, and a preview of where the balance
 * lands before anything is submitted.
 */
export function ManualDeposit({ users }: { users: CreditableUser[] }) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>('credit');
  const [userId, setUserId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [balances, setBalances] = useState(users);
  const { toast, show, dismiss } = useToast();

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const valid = userId !== '' && amountValid && note.trim() !== '';
  const target = balances.find((u) => u.id === userId);

  const signed = direction === 'deduct' ? -amountNum : amountNum;
  const after = target ? target.balanceMicroUsd + Math.round(signed * MICRO) : null;
  // Crossing zero is the consequence worth naming: it is the point at which the
  // account stops being able to generate anything.
  const willBlock = after !== null && after <= 0 && target!.balanceMicroUsd > 0;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/payments/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amountUsd: signed, note: note.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        show(data?.error ?? `Could not apply (${res.status})`, 'error');
        return;
      }
      setBalances((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, balanceMicroUsd: data.balanceMicroUsd } : u)),
      );
      show(
        `${direction === 'deduct' ? 'Deducted' : 'Credited'} ${usdt(Math.abs(Math.round(signed * MICRO)))} — ` +
          `${target?.email ?? 'balance'} is now ${usdt(data.balanceMicroUsd)}`,
      );
      setAmount('');
      setNote('');
      router.refresh();
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const deducting = direction === 'deduct';

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-white">Adjust a balance</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Move an account&apos;s balance without a deposit claim behind it. Every change is recorded
        on the user&apos;s statement with the reason you give.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {DIRECTIONS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDirection(d.key)}
            aria-pressed={direction === d.key}
            title={d.hint}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              direction === d.key
                ? d.key === 'deduct'
                  ? 'border-red-500/50 bg-red-500/15 font-medium text-red-200'
                  : 'border-[var(--primary)] bg-[var(--primary)]/15 font-medium text-white'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-white'
            }`}
          >
            {d.label}
          </button>
        ))}
        <span className="self-center text-xs text-[var(--muted)]">
          {DIRECTIONS.find((d) => d.key === direction)?.hint}
        </span>
      </div>

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
            min="0"
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
          placeholder={deducting ? 'Correcting an over-credit' : 'Opening balance'}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
        />
      </label>

      {/* Where the balance lands, before committing. A deduction that crosses
          zero switches AI off for that account, which is the kind of thing to
          learn before clicking, not after. */}
      {target && amountValid && (
        <p className="mt-3 text-sm">
          <span className="text-[var(--muted)]">{target.email}: </span>
          <span className="tabular-nums text-[var(--muted)]">{usdt(target.balanceMicroUsd)}</span>
          <span className="text-[var(--muted)]"> → </span>
          <span
            className={`font-semibold tabular-nums ${
              after !== null && after > 0 ? 'text-[var(--text)]' : 'text-red-300'
            }`}
          >
            {usdt(after ?? 0)}
          </span>
          {willBlock && (
            <span className="ml-2 text-red-300">· this switches their AI off</span>
          )}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !valid}
          className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            deducting ? 'bg-red-600 hover:bg-red-700' : 'jh-cta'
          }`}
        >
          {busy ? 'Applying…' : deducting ? 'Deduct' : 'Add credit'}
        </button>
        {amount && !amountValid && (
          <span className="text-xs text-red-300">
            Enter a positive amount — use the buttons above to choose the direction.
          </span>
        )}
      </div>

      <Toast toast={toast} onDismiss={dismiss} />
    </section>
  );
}
