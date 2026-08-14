import { fetchJobs, fetchFilters } from '@/lib/api';
import { FiltersBar } from '@/app/components/filters-bar';
import { JobCard } from '@/app/components/job-card';
import { Pagination } from '@/app/components/pagination';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}

function arr(v: string | string[] | undefined): string[] {
  const list = Array.isArray(v) ? v : v === undefined ? [] : [v];
  return list.map((s) => s.trim()).filter(Boolean);
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // Remote-only is the DEFAULT (checkbox checked); only `remote=0` shows all.
  const remote = str(sp.remote) !== '0';
  const query = { q: str(sp.q), sites: arr(sp.site), remote };
  const page = Math.max(1, Number(str(sp.page)) || 1);

  let data;
  let error: string | null = null;
  try {
    data = await fetchJobs({ ...query, page, pageSize: 20 });
  } catch {
    error = 'Could not reach the backend API. Is it running on http://localhost:4000 ?';
  }
  const filters = await fetchFilters().catch(() => ({ sites: [], locations: [] }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Jobs</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Postings scraped from job sites into the local database.
      </p>

      <FiltersBar filters={filters} current={query} />

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <ul className="grid gap-4">
            {data.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </ul>
          <Pagination pagination={data.pagination} query={query} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          No jobs yet. Run the Python scraper (<code>python main.py indeed</code>) to populate the
          database.
        </div>
      )}
    </div>
  );
}
