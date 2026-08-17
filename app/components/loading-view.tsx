/** Shared loading UI: an indeterminate top bar + a lightweight skeleton.
 *  Rendered by route `loading.tsx` files while a page's server data loads. */
export function LoadingView({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* the loading bar */}
      <div className="jh-loading-track mb-6" />

      {/* header skeleton */}
      <div className="mb-2 h-7 w-52 animate-pulse rounded-md bg-[var(--surface-2)]" />
      <div className="mb-6 h-4 w-72 animate-pulse rounded bg-[var(--surface-2)]" />

      {/* content skeleton */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  );
}
