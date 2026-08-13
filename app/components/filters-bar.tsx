import type { JobFilters } from '@/lib/types';

interface Props {
  filters: JobFilters;
  current: { q: string; site: string; location: string };
}

const inputCls =
  'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)]';

/**
 * Plain GET form — submitting navigates to `/?q=...&site=...` and the server
 * re-renders. No client JS required.
 */
export function FiltersBar({ filters, current }: Props) {
  return (
    <form
      action="/"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
    >
      <input
        type="text"
        name="q"
        defaultValue={current.q}
        placeholder="Search jobs…"
        className={`min-w-[220px] flex-1 ${inputCls}`}
      />
      <select name="site" defaultValue={current.site} className={inputCls}>
        <option value="">All sources</option>
        {filters.sites.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="location"
        defaultValue={current.location}
        placeholder="Location"
        list="locations"
        className={inputCls}
      />
      <datalist id="locations">
        {filters.locations.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      <button
        type="submit"
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
      >
        Filter
      </button>
    </form>
  );
}
