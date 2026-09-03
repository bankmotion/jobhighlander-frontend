import {
  fetchAllTopUps,
  fetchBillingOverview,
  fetchCreditEntries,
  fetchCreditableUsers,
} from '@/lib/billing.server';
import { usdt } from '@/lib/billing';
import { TopUpReview } from '@/app/components/top-up-review';
import { ManualDeposit } from '@/app/components/manual-deposit';
import { PaymentAccounts } from '@/app/components/payment-accounts';
import { MoneyHistory } from '@/app/components/money-history';
import { MoneyChart } from '@/app/components/money-chart';
import { SpendShare } from '@/app/components/spend-share';
import { TopUpHistory } from '@/app/components/top-up-history';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const [topUps, users, entries, overview] = await Promise.all([
    fetchAllTopUps(),
    fetchCreditableUsers(),
    fetchCreditEntries(),
    fetchBillingOverview(),
  ]);

  const pending = topUps?.filter((r) => r.status === 'pending').length ?? 0;
  const t = overview?.totals;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Payments</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        USDT deposits, balances and the money history. Users send to the deposit address and submit
        a transaction hash; you verify it on-chain and credit what actually arrived.
      </p>

      {t && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="Awaiting review"
              value={String(pending)}
              hint="deposit claims"
              tone={pending > 0 ? 'warn' : undefined}
            />
            <Tile label="Held on account" value={usdt(t.heldMicroUsd)} hint="across all users" tone="primary" />
            <Tile
              label="Deposited"
              value={usdt(t.depositedMicroUsd)}
              hint={`${usdt(t.adjustedMicroUsd)} adjusted by hand`}
            />
            <Tile
              label="Can use AI"
              value={`${t.fundedAccounts}/${overview.accounts.length}`}
              hint="accounts in credit"
            />
          </div>

          {/* The markup is the whole reason charged and vendor cost differ, so
              the gap between them is stated rather than left to be worked out. */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="Billed to users"
              value={usdt(t.chargedMicroUsd)}
              hint={`${t.generations} generations, all time`}
            />
            <Tile label="Vendor cost" value={usdt(t.vendorCostMicroUsd)} hint="Anthropic + OpenAI, at list" />
            <Tile
              label="Margin"
              value={usdt(t.marginMicroUsd)}
              hint={
                t.vendorCostMicroUsd > 0
                  ? `${((t.marginMicroUsd / t.vendorCostMicroUsd) * 100).toFixed(0)}% over list`
                  : 'no usage yet'
              }
              tone="good"
            />
            <Tile
              label="Taken from balances"
              value={usdt(t.spentMicroUsd)}
              hint="charges that hit a balance"
            />
          </div>
        </>
      )}

      {overview && (
        <div className="mb-6 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          <MoneyChart series={overview.series} />
          <SpendShare accounts={overview.accounts} />
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-white">Deposit claims</h2>
        {topUps ? (
          <TopUpReview initial={topUps} />
        ) : (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
            Claims could not be loaded. Check that the API server is running and that you are signed
            in as a super admin.
          </p>
        )}
      </section>

      <div className="mb-6">{users && <ManualDeposit users={users} />}</div>

      {overview && (
        <div className="mb-6">
          <PaymentAccounts accounts={overview.accounts} />
        </div>
      )}

      {/* Three separate histories rather than one filtered table: a credit
          request, a manual deposit and an AI charge are different questions,
          and each is scanned on its own. */}
      <div className="space-y-8">
        <TopUpHistory requests={topUps ?? []} />
        <MoneyHistory
          entries={entries ?? []}
          kind="adjustment"
          title="Manual deposit history"
          empty="No manual deposits yet. Credits added by hand appear here."
        />
        <MoneyHistory
          entries={entries ?? []}
          kind="usage"
          title="AI usage history"
          empty="Nothing generated yet. Every AI charge taken from a balance appears here."
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'primary' | 'good' | 'warn';
}) {
  const cls =
    tone === 'primary'
      ? 'text-[var(--primary)]'
      : tone === 'good'
        ? 'text-emerald-300'
        : tone === 'warn'
          ? 'text-amber-300'
          : 'text-white';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${cls}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}
