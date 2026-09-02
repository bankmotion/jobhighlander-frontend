import {
  fetchAllTopUps,
  fetchCreditEntries,
  fetchCreditableUsers,
} from '@/lib/billing.server';
import { KIND_LABEL, signedUsdt, usdt } from '@/lib/billing';
import { TopUpReview } from '@/app/components/top-up-review';
import { ManualDeposit } from '@/app/components/manual-deposit';

export const dynamic = 'force-dynamic';

const when = (iso: string) => new Date(iso).toLocaleString();

export default async function PaymentsPage() {
  const [topUps, users, entries] = await Promise.all([
    fetchAllTopUps(),
    fetchCreditableUsers(),
    fetchCreditEntries(),
  ]);

  const pending = topUps?.filter((r) => r.status === 'pending').length ?? 0;
  const funded = users?.filter((u) => u.balanceMicroUsd > 0).length ?? 0;
  const held = users?.reduce((sum, u) => sum + u.balanceMicroUsd, 0) ?? 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Payments</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        USDT deposits, balances and the money history. Users send to the deposit address and submit
        a transaction hash; you verify it on-chain and credit what actually arrived.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Awaiting review</p>
          <p className={`mt-1 text-2xl font-bold ${pending > 0 ? 'text-amber-300' : 'text-white'}`}>
            {pending}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">deposit claims</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Held on account</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary)]">{usdt(held)}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">across all users</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Can use AI</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {funded}
            <span className="text-base font-medium text-[var(--muted)]">/{users?.length ?? 0}</span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">accounts in credit</p>
        </div>
      </div>

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

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Money history</h2>
        {!entries || entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">
            Nothing yet. Credits, manual adjustments and AI charges all appear here.
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)]">
                <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 pb-2 pt-3 font-medium">When</th>
                  <th className="px-4 pb-2 pt-3 font-medium">Account</th>
                  <th className="px-4 pb-2 pt-3 font-medium">What</th>
                  <th className="px-4 pb-2 pt-3 text-right font-medium">Amount</th>
                  <th className="px-4 pb-2 pt-3 text-right font-medium">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">
                      {when(e.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text)]">{e.user?.email ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="block text-[var(--text)]">{KIND_LABEL[e.kind]}</span>
                      {e.note && <span className="block text-xs text-[var(--muted)]">{e.note}</span>}
                      {/* Who granted it. Only credits have an author; an AI
                          charge is the system, and saying so would be noise. */}
                      {e.createdBy && (
                        <span className="block text-xs text-[var(--muted)]">
                          by {e.createdBy.email}
                        </span>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-medium ${
                        e.amountMicroUsd > 0 ? 'text-green-300' : 'text-[var(--text)]'
                      }`}
                    >
                      {signedUsdt(e.amountMicroUsd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[var(--muted)]">
                      {usdt(e.balanceAfterMicroUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
