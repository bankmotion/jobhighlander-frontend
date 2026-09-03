import { fetchBalance, fetchDepositInfo, fetchLedger, fetchMyTopUps } from '@/lib/billing.server';
import { usdt } from '@/lib/billing';
import { TopUpPanel } from '@/app/components/top-up-panel';
import { StatementTable } from '@/app/components/statement-table';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const [balance, deposit, requests, ledger] = await Promise.all([
    fetchBalance(),
    fetchDepositInfo(),
    fetchMyTopUps(),
    fetchLedger(),
  ]);

  const empty = balance ? !balance.canSpend : false;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Billing</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        AI generations are charged against a prepaid USDT balance. Top up by sending USDT to the
        address below and giving an admin the transaction hash.
      </p>

      <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Current balance</p>
        <p
          className={`mt-1 text-3xl font-bold tracking-tight ${empty ? 'text-red-300' : 'text-[var(--primary)]'}`}
        >
          {balance ? usdt(balance.balanceMicroUsd) : '—'}
          <span className="ml-2 text-sm font-medium text-[var(--muted)]">USDT</span>
        </p>
        {empty && (
          <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Your balance is spent, so AI generation is switched off. It resumes as soon as an admin
            credits a deposit.
          </p>
        )}
      </div>

      {deposit ? (
        <TopUpPanel deposit={deposit} initial={requests} />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Deposit details could not be loaded. Check that the API server is running and try again.
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-white">Statement</h2>
        <StatementTable entries={ledger} />
      </section>
    </div>
  );
}
