import { fetchKeywords } from '@/lib/keywords';
import { KeywordManager } from '@/app/components/keyword-manager';

export const dynamic = 'force-dynamic';

export default async function KeywordsPage() {
  const keywords = await fetchKeywords();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Emphasis keywords</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        These words are highlighted in job descriptions wherever they appear (case-insensitive).
      </p>
      <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <KeywordManager initial={keywords} />
      </div>
    </div>
  );
}
