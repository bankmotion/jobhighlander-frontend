import { DEFAULT_RANGE, NO_FILTER } from '@/lib/ai-usage';
import { fetchAiRates, fetchAiUsageCalls, fetchAllAiUsage } from '@/lib/ai-usage.server';
import { AdminAiUsageDashboard } from '@/app/components/admin-ai-usage-dashboard';
import { AiMarkupEditor } from '@/app/components/ai-markup-editor';

export const dynamic = 'force-dynamic';

export default async function AdminAiUsagePage() {
  // Both halves in parallel: the summary and the first page of the call log are
  // independent reads, and fetching them in sequence would make the slower one
  // wait on the faster for no reason.
  const [usage, calls, rates] = await Promise.all([
    fetchAllAiUsage(DEFAULT_RANGE, NO_FILTER),
    fetchAiUsageCalls(DEFAULT_RANGE, NO_FILTER),
    fetchAiRates(),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">AI usage — all users</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Everything the shared Claude and OpenAI keys have been charged for, attributed to the user
        who triggered it and the profile it was generated against. Pick a user or profile — or click
        a row — to narrow every figure on the page, including the call log at the bottom.
      </p>

      {rates && <AiMarkupEditor initial={rates} />}

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
