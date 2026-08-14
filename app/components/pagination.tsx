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

const btn =
  'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 transition hover:border-[var(--border-strong)] hover:text-white';
const btnDisabled = 'rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--muted)] opacity-40';

export function Pagination({ pagination, query }: Props) {
  const { page, totalPages, total } = pagination;
  if (total === 0) return null;

  return (
    <nav className="mt-6 flex items-center justify-between text-sm text-[var(--muted)]">
      <span>
        Page {page} of {totalPages} · {total} job{total === 1 ? '' : 's'}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1, query)} className={btn}>
            ← Prev
          </Link>
        ) : (
          <span className={btnDisabled}>← Prev</span>
        )}
        {page < totalPages ? (
          <Link href={href(page + 1, query)} className={btn}>
            Next →
          </Link>
        ) : (
          <span className={btnDisabled}>Next →</span>
        )}
      </div>
    </nav>
  );
}
