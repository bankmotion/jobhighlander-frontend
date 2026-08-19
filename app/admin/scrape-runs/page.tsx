import { fetchScrapeRuns } from '@/lib/scrape-runs';
import { ScrapeRunsTable } from '@/app/components/scrape-runs-table';
import { ScrapeRunsFilters } from '@/app/components/scrape-runs-filters';
import { PageNav } from '@/app/components/pagination';

export const dynamic = 'force-dynamic';

/** `?site=a&site=b` arrives as a string, an array, or nothing. */
function arr(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

export default async function ScrapeRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; site?: string | string[]; status?: string | string[] }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);
  const sites = arr(sp?.site);
  const statuses = arr(sp?.status);

  const data = await fetchScrapeRuns(page, { sites, statuses }).catch(() => null);
  const runs = data?.runs ?? [];
  const pg = data?.pagination;
  const siteOptions = data?.filters?.sites ?? [];

  // Carry the active filters on every pager link, or paging would reset them.
  const hrefFor = (p: number) => {
    const qs = new URLSearchParams();
    sites.forEach((s) => qs.append('site', s));
    statuses.forEach((s) => qs.append('status', s));
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `/admin/scrape-runs?${s}` : '/admin/scrape-runs';
  };

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Scrape status</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Every scraper run — when it started and finished, and how many jobs it found.
      </p>

      <ScrapeRunsFilters sites={siteOptions} current={{ sites, statuses }} />

      {runs.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          No runs match these filters.
        </p>
      ) : (
        <ScrapeRunsTable runs={runs} />
      )}

      {pg && pg.total > 0 && (
        <PageNav
          page={pg.page}
          totalPages={pg.totalPages}
          label={`Page ${pg.page} of ${pg.totalPages} · ${pg.total} run${pg.total === 1 ? '' : 's'}`}
          hrefFor={hrefFor}
        />
      )}
    </div>
  );
}
