import { fetchMyAiUsage } from '@/lib/ai-usage.server';
import { AiUsageDashboard } from '@/app/components/ai-usage-dashboard';

export const dynamic = 'force-dynamic';

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
