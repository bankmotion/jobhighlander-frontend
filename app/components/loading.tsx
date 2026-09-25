/**
 * THE loading UI for the whole app. Every spinner in the product comes from
 * here.
 *
 * One module because these three are the same thing at three sizes, and when
 * they lived apart they drifted: the route fallbacks, the navigation overlay
 * and the pagination buttons each had their own copy of the same ring, so
 * changing the accent colour meant finding all of them. A reader should also
 * never be able to tell which mechanism produced a given spinner — a route
 * change and a param change are the same event to them.
 *
 *   Spinner      the ring alone, for placing inside an existing control
 *   LoadingBadge the ring plus a word, as a floating pill
 *   LoadingCard  the badge centred in the page, for `loading.tsx`
 *
 * The ring stops for `prefers-reduced-motion`; a spinner is decoration, and the
 * surrounding label already says what is happening.
 *
 * No `'use client'`: this is pure markup with a CSS animation, so it renders in
 * server and client components alike.
 */

/** The ring. Size and colour ride on `className` so callers can place it. */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`${className} inline-block animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--primary)] motion-reduce:animate-none`}
    />
  );
}

/** A floating pill. Used by the navigation overlay. */
export function LoadingBadge({ label = 'Loading…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--text)] shadow-2xl">
      <Spinner />
      {label}
    </span>
  );
}

/**
 * The route-level fallback, i.e. every `loading.tsx`.
 *
 * Sits high rather than dead-centre so it lands near where the page heading is
 * about to appear, which keeps the eye from jumping when content replaces it.
 */
export function LoadingCard({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-start justify-center">
      <div className="mt-24">
        <LoadingBadge label={label} />
      </div>
    </div>
  );
}
