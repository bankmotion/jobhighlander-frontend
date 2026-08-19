'use client';

import { useRouter } from 'next/navigation';
import { MultiSelect } from './multi-select';
import { siteMeta } from './filters-bar';

const STATUS_DOTS: Record<string, string> = {
  success: '#22c55e',
  failed: '#ef4444',
  running: '#eab308',
};
const STATUSES = ['success', 'failed', 'running'];

/** Site + status filters for the run log — the same multi-select the jobs page
 *  uses. Changing a filter drops back to page 1: keeping the old page number
 *  could land you past the end of a shorter filtered set. */
export function ScrapeRunsFilters({
  sites,
  current,
}: {
  sites: string[];
  current: { sites: string[]; statuses: string[] };
}) {
  const router = useRouter();

  function go(next: { sites?: string[]; statuses?: string[] }) {
    const qs = new URLSearchParams();
    (next.sites ?? current.sites).forEach((s) => qs.append('site', s));
    (next.statuses ?? current.statuses).forEach((s) => qs.append('status', s));
    const s = qs.toString();
    router.push(s ? `/admin/scrape-runs?${s}` : '/admin/scrape-runs');
  }

  const filtered = current.sites.length > 0 || current.statuses.length > 0;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <MultiSelect
        placeholder="All sites"
        options={sites.map((x) => ({ value: x, ...siteMeta(x) }))}
        selected={current.sites}
        onChange={(next) => go({ sites: next })}
      />
      <MultiSelect
        placeholder="Any status"
        options={STATUSES.map((x) => ({ value: x, label: x, dot: STATUS_DOTS[x] }))}
        selected={current.statuses}
        onChange={(next) => go({ statuses: next })}
      />
      <button
        type="button"
        onClick={() => router.push('/admin/scrape-runs')}
        disabled={!filtered}
        className="text-sm text-[var(--muted)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[var(--muted)]"
      >
        Clear
      </button>
    </div>
  );
}
