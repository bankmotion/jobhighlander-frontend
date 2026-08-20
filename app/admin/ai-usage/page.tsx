import { NO_FILTER } from '@/lib/ai-usage';
import { fetchAiUsageCalls, fetchAllAiUsage } from '@/lib/ai-usage.server';
import { AdminAiUsageDashboard } from '@/app/components/admin-ai-usage-dashboard';

export const dynamic = 'force-dynamic';

/**
 * Every user's AI spend, across every profile. Super admin only.
 *
 * Under `/admin` on purpose: middleware gates that prefix to super admins
 * (everything except `/admin/bidders` and `/admin/templates`), and the backend
 * endpoint behind it carries its own `requireRole` check. The path is the first
 * gate, not the only one.
 *
 * Distinct from `/ai-usage`, which every role reaches and which shows only the
 * caller's own spend. Two pages rather than one that changes shape by role: the
 * question "what did this cost me" and the question "who is spending the shared
 * key" have different answers, different scopes and different audiences.
 */
export default async function AdminAiUsagePage() {
  // Both halves in parallel: the summary and the first page of the call log are
  // independent reads, and fetching them in sequence would make the slower one
  // wait on the faster for no reason.
  const [usage, calls] = await Promise.all([
    fetchAllAiUsage(30, NO_FILTER),
    fetchAiUsageCalls(30, NO_FILTER),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">AI usage — all users</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Everything the shared Claude API key has been charged for, attributed to the user who
        triggered it and the profile it was generated against. Pick a user or profile — or click a
        row — to narrow every figure on the page, including the call log at the bottom.
      </p>

      {usage ? (
        <AdminAiUsageDashboard initial={usage} initialCalls={calls} />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Usage could not be loaded. Check that the API server is running and that you are signed in
          as a super admin, then try again.
        </p>
      )}
    </div>
  );
}
