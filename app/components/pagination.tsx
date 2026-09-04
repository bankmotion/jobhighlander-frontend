import type { AppliedFilter, OthersAppliedFilter } from '@/lib/applications';
import type { DiscardedFilter } from '@/lib/discards';
import type { InterviewFilter } from '@/lib/interviews';
import Link from 'next/link';
import type { Pagination as PaginationInfo } from '@/lib/types';
import { writePosted, type PostedFilter } from '@/lib/posted';

interface Props {
  pagination: PaginationInfo;
  query: {
    title: string;
    company: string;
    location: string;
    description: string;
    sites: string[];
    remote: boolean;
    profile?: number;
    applied?: AppliedFilter;
    othersApplied?: OthersAppliedFilter;
    discarded?: DiscardedFilter;
    interview?: InterviewFilter;
    posted?: PostedFilter;
    postedFrom?: string;
    postedTo?: string;
  };
}

function href(page: number, query: Props['query']): string {
  const qs = new URLSearchParams();
  // Every text field, from one list — page 2 must be the same query as page 1.
  for (const key of ['title', 'company', 'location', 'description'] as const) {
    if (query[key]) qs.set(key, query[key]);
  }
  query.sites.forEach((s) => qs.append('site', s));
  if (!query.remote) qs.set('remote', '0'); // remote-only is the default
  // Carried through, or paging would silently switch whose resumes the list
  // is reporting and every status chip on the next page would be wrong.
  if (query.profile) qs.set('profile', String(query.profile));
  // Paging must not silently widen the list back to every job.
  if (query.applied && query.applied !== 'all') qs.set('applied', query.applied);
  // Same reasoning: without this, page 2 quietly widens back to every job
  // regardless of who has applied.
  if (query.othersApplied && query.othersApplied !== 'all')
    qs.set('othersApplied', query.othersApplied);
  if (query.discarded && query.discarded !== 'all') qs.set('discarded', query.discarded);
  // Was missing: paging used to drop the interview filter and quietly widen the
  // list, which read as page 2 containing jobs page 1 had excluded.
  if (query.interview && query.interview !== 'all') qs.set('interview', query.interview);
  // Same reasoning as the filters above: paging must not widen the date window
  // back to every job ever posted.
  writePosted(qs, query.posted ?? 'all', query.postedFrom ?? '', query.postedTo ?? '');
  qs.set('page', String(page));
  return `/?${qs.toString()}`;
}

function pageList(current: number, total: number): (number | 'gap')[] {
  const delta = 2;
  const start = Math.max(1, current - delta);
  const end = Math.min(total, current + delta);
  const out: (number | 'gap')[] = [];
  if (start > 1) {
    out.push(1);
    if (start > 2) out.push('gap');
  }
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total) {
    if (end < total - 1) out.push('gap');
    out.push(total);
  }
  return out;
}

const nav =
  'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 transition hover:border-[var(--border-strong)] hover:text-white';
const navOff =
  'rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--muted)] opacity-40';
const num =
  'min-w-[36px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-center transition hover:border-[var(--border-strong)] hover:text-white';
const numOn =
  'min-w-[36px] rounded-lg border border-[var(--primary)] bg-[var(--primary)]/20 px-2.5 py-1.5 text-center font-medium text-white';

export function Pagination({ pagination, query }: Props) {
  const { page, totalPages, total } = pagination;
  if (total === 0) return null;
  return (
    <PageNav
      page={page}
      totalPages={totalPages}
      label={`Page ${page} of ${totalPages} · ${total} job${total === 1 ? '' : 's'}`}
      hrefFor={(p) => href(p, query)}
    />
  );
}

export function PageNav({
  page,
  totalPages,
  label,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  label: string;
  hrefFor: (page: number) => string;
}) {
  const pages = pageList(page, totalPages);

  return (
    // Sticky so the controls stay visible while scrolling the list. `jh-sticky-bar`
    // (globals.css) gives it an elevated surface + accent edge so it reads as a
    // floating control bar rather than part of the page.
    <nav className="jh-sticky-bar sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-t-xl px-4 py-3 text-sm text-[var(--muted)]">
      <span className="shrink-0">{label}</span>

      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={nav} aria-label="Previous page">
            ← Prev
          </Link>
        ) : (
          <span className={navOff}>← Prev</span>
        )}

        {pages.map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-[var(--muted)]">
              …
            </span>
          ) : p === page ? (
            <span key={p} className={numOn} aria-current="page">
              {p}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} className={num}>
              {p}
            </Link>
          ),
        )}

        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={nav} aria-label="Next page">
            Next →
          </Link>
        ) : (
          <span className={navOff}>Next →</span>
        )}
      </div>
    </nav>
  );
}
