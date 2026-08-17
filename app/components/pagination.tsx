import Link from 'next/link';
import type { Pagination as PaginationInfo } from '@/lib/types';

interface Props {
  pagination: PaginationInfo;
  query: { q: string; sites: string[]; remote: boolean };
}

function href(page: number, query: Props['query']): string {
  const qs = new URLSearchParams();
  if (query.q) qs.set('q', query.q);
  query.sites.forEach((s) => qs.append('site', s));
  if (!query.remote) qs.set('remote', '0'); // remote-only is the default
  qs.set('page', String(page));
  return `/?${qs.toString()}`;
}

/** Windowed page list with ellipses: 1 … 4 5 [6] 7 8 … 26 */
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
const navOff = 'rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--muted)] opacity-40';
const num =
  'min-w-[36px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-center transition hover:border-[var(--border-strong)] hover:text-white';
const numOn =
  'min-w-[36px] rounded-lg border border-[var(--primary)] bg-[var(--primary)]/20 px-2.5 py-1.5 text-center font-medium text-white';

export function Pagination({ pagination, query }: Props) {
  const { page, totalPages, total } = pagination;
  if (total === 0) return null;
  const pages = pageList(page, totalPages);

  return (
    // Sticky so the controls stay visible while scrolling the list.
    <nav className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-t border-[var(--border)] bg-[var(--bg)]/90 py-3 text-sm text-[var(--muted)] backdrop-blur">
      <span className="shrink-0">
        Page {page} of {totalPages} · {total} job{total === 1 ? '' : 's'}
      </span>

      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 ? (
          <Link href={href(page - 1, query)} className={nav} aria-label="Previous page">
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
            <Link key={p} href={href(p, query)} className={num}>
              {p}
            </Link>
          ),
        )}

        {page < totalPages ? (
          <Link href={href(page + 1, query)} className={nav} aria-label="Next page">
            Next →
          </Link>
        ) : (
          <span className={navOff}>Next →</span>
        )}
      </div>
    </nav>
  );
}
