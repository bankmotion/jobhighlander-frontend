export type LoadingVariant = 'list' | 'grid' | 'table' | 'article';

// Full-screen loading state.
//
// The overlay covers the viewport and dims what is behind it rather than
// replacing it, so the page you came from stays readable while the next one
// resolves — a skeleton that swaps the whole screen loses that context and
// reads as a navigation you did not ask for.
//
// The skeleton is still rendered underneath. It is what the overlay dims, and
// it is what remains if a very slow route keeps the overlay up: shape first,
// then content, rather than a blank field.
export function LoadingView({
  rows = 6,
  variant = 'list',
  label = 'Loading',
}: {
  rows?: number;
  variant?: LoadingVariant;
  label?: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>

      <div className="jh-overlay" role="status" aria-label={label}>
        <div className="flex items-center gap-3">
          <span className="jh-bars" aria-hidden>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="text-sm font-medium text-[var(--text)]">{label}…</span>
        </div>
        <div className="jh-overlay-track" />
      </div>

      <div aria-hidden className="jh-page">
        <div className="mb-2 h-7 w-52 animate-pulse rounded-md bg-[var(--surface-2)]" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded bg-[var(--surface-2)]" />
        <SkeletonBody rows={rows} variant={variant} />
      </div>
    </div>
  );
}

function SkeletonBody({ rows, variant }: { rows: number; variant: LoadingVariant }) {
  if (variant === 'grid') {
    return (
      <ul className="jh-stagger grid gap-3 sm:grid-cols-2">
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
        <div className="jh-stagger space-y-3">
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
    <div className="jh-stagger space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        />
      ))}
    </div>
  );
}
