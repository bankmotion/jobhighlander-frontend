import { fetchScrapeRuns } from '@/lib/scrape-runs';
import { ScrapeRunsTable } from '@/app/components/scrape-runs-table';

export const dynamic = 'force-dynamic';

export default async function ScrapeRunsPage() {
  const runs = await fetchScrapeRuns().catch(() => []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Scrape status</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Every scraper run — when it started and finished, and how many jobs it found.
      </p>
      <ScrapeRunsTable runs={runs} />
    </div>
  );
}
