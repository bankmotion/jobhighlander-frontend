import { fetchMyAiUsage } from '@/lib/ai-usage.server';
import { AiUsageDashboard } from '@/app/components/ai-usage-dashboard';

export const dynamic = 'force-dynamic';

/**
 * Your own AI spend. Open to every signed-in role, bidders included.
 *
 * Not gated behind admin on purpose: generating a resume spends real money on a
 * shared API key, and the person deciding whether to regenerate one more time is
 * the one who needs to see what that costs.
 *
 * Everyone sees their own spend and nobody sees anyone else's — there is no
 * admin view of the whole table, and the backend has no endpoint that would
 * serve one. The figures here are scoped to the session's user.
 */
export default async function MyAiUsagePage() {
  const usage = await fetchMyAiUsage(30);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">My AI usage</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        What your resume and cover letter generations have cost on the Claude API, priced at the
        published rate for each call.
      </p>

      {usage ? (
       <AiUsageDashboard initial={usage} />
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Usage could not be loaded. Check that the API server is running and try again.
        </p>
      )}
    </div>
  );
}
