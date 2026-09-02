'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  STATUS_META,
  TX_HASH,
  shortHash,
  usdt,
  type CryptoChain,
  type DepositInfo,
  type TopUpRequest,
} from '@/lib/billing';
import { Toast, useToast } from './toast';

const when = (iso: string) => new Date(iso).toLocaleString();

/**
 * Send USDT, then tell us the transaction hash.
 *
 * Nothing here credits anything. The deposit is verified on-chain by a super
 * admin, who decides what to grant — so this screen's whole job is to make the
 * address impossible to get wrong and the hash easy to hand over.
 */
export function TopUpPanel({
  deposit,
  initial,
}: {
  deposit: DepositInfo;
  initial: TopUpRequest[];
}) {
  const router = useRouter();
  const [chain, setChain] = useState<CryptoChain>(deposit.chains[0]?.id ?? 'bep20');
  const [txHash, setTxHash] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState(initial);
  const { toast, show, dismiss } = useToast();

  const hashValid = TX_HASH.test(txHash.trim());
  const amountNum = Number(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum >= deposit.minUsd && amountNum <= deposit.maxUsd;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(deposit.address);
      show('Address copied');
    } catch {
      show('Could not copy — select the address and copy manually.', 'error');
    }
  }

  async function submit() {
    if (!hashValid || !amountValid) return;
    setBusy(true);
    try {
      const res = await fetch('/api/billing/top-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, txHash: txHash.trim(), amountUsd: amountNum, note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        show(data?.error ?? `Could not submit (${res.status})`, 'error');
        return;
      }
      setRequests((prev) => [data.request as TopUpRequest, ...prev]);
      setTxHash('');
      setAmount('');
      setNote('');
      show('Sent to the admins for review');
      // The balance in the top bar is server-rendered; nothing has changed yet,
      // but the pending row should appear everywhere it is listed.
      router.refresh();
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const explorer = deposit.chains.find((c) => c.id === chain)?.explorer ?? '';

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-white">1. Send USDT</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {deposit.chains.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChain(c.id)}
              aria-pressed={chain === c.id}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                chain === c.id
                  ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-white'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Deposit address
        </p>
        {/* Wrapped rather than truncated, and monospace: an address that is
            visually cut off is one somebody will retype wrong, and there is no
            getting the money back from a wrong address. */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="break-all rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-sm text-[var(--text)]">
            {deposit.address}
          </code>
          <button
            type="button"
            onClick={copyAddress}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition hover:border-[var(--primary)]"
          >
            Copy
          </button>
        </div>

        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Send <strong>USDT only</strong>, on the chain selected above. The same address works for
          both, but a transfer sent on any other network cannot be recovered.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-white">2. Send us the transaction hash</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          An admin checks it on-chain and adds the credit to your balance. Amounts are confirmed
          against the transaction, so what you enter here is a guide, not the final figure.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Transaction hash
            </span>
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              disabled={busy}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Amount (USDT)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={deposit.minUsd}
              max={deposit.maxUsd}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Note <span className="font-normal normal-case">— optional</span>
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            disabled={busy}
            placeholder="Anything the reviewer should know"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !hashValid || !amountValid}
            className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit for review'}
          </button>
          {txHash && !hashValid && (
            <span className="text-xs text-red-300">
              A hash is 0x followed by 64 characters.
            </span>
          )}
          {amount && !amountValid && (
            <span className="text-xs text-red-300">
              Between {deposit.minUsd} and {deposit.maxUsd.toLocaleString()} USDT.
            </span>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-white">Your deposits</h2>
        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
            Nothing submitted yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="font-semibold text-white">
                      {/* Once ruled on, the credited figure is the one that
                          matters — showing the claim beside it makes any
                          difference visible rather than surprising. */}
                      {r.creditedMicroUsd != null
                        ? usdt(r.creditedMicroUsd)
                        : usdt(r.claimedMicroUsd)}
                    </span>
                    {r.creditedMicroUsd != null &&
                      r.creditedMicroUsd !== r.claimedMicroUsd && (
                        <span className="text-xs text-[var(--muted)]">
                          (you said {usdt(r.claimedMicroUsd)})
                        </span>
                      )}
                    <a
                      href={`${explorer}${r.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-[var(--muted)] underline transition hover:text-white"
                    >
                      {shortHash(r.txHash)}
                    </a>
                    <span className="ml-auto text-xs text-[var(--muted)]">{when(r.createdAt)}</span>
                  </div>
                  {r.reviewNote && (
                    <p className="mt-1 text-xs text-[var(--muted)]">Admin: {r.reviewNote}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
