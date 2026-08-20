/**
 * Shape of the skeleton, matched to the page it stands in for.
 *
 * A skeleton that does not resemble its page is worse than none: the content
 * arrives and everything jumps, which reads as a second load rather than the
 * end of the first one.
 */
export type LoadingVariant = 'list' | 'grid' | 'table' | 'article';

/** Shared loading UI: an indeterminate top bar + a lightweight skeleton.
 *  Rendered by route `loading.tsx` files while a page's server data loads. */
export function LoadingView({
  rows = 6,
  variant = 'list',
}: {
  rows?: number;
  variant?: LoadingVariant;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* the loading bar */}
      <div className="jh-loading-track mb-6" />

      {/* header skeleton */}
      <div className="mb-2 h-7 w-52 animate-pulse rounded-md bg-[var(--surface-2)]" />
      <div className="mb-6 h-4 w-72 animate-pulse rounded bg-[var(--surface-2)]" />

      <SkeletonBody rows={rows} variant={variant} />
    </div>
  );
}

function SkeletonBody({ rows, variant }: { rows: number; variant: LoadingVariant }) {
  if (variant === 'grid') {
    return (
      <ul className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </ul>
    );
  }

  if (variant === 'table') {
    // One bordered panel with thin rows inside it, not N free-floating cards —
    // the admin screens are tables in a single container.
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-4 h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-[var(--surface-2)]" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'article') {
    // Ragged line widths, because a stack of identical bars does not read as
    // prose and the job detail page is mostly prose.
    const widths = ['w-full', 'w-11/12', 'w-full', 'w-9/12', 'w-full', 'w-10/12', 'w-8/12'];
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-3 h-6 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mb-5 flex gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--surface-2)]" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-[var(--surface-2)]" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className={`h-3 animate-pulse rounded bg-[var(--surface-2)] ${widths[i % widths.length]}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        />
      ))}
    </div>
  );
}
