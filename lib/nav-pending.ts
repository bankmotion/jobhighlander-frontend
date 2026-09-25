/**
 * Whether a paging navigation is in flight.
 *
 * Exists because `app/loading.tsx` does not help here. A route-level loading
 * file is shown when a SEGMENT changes; paging only changes search params on
 * the same segment, so the segment is never remounted and the fallback never
 * appears. That is correct Next behaviour and not something to configure
 * around — it just leaves this case uncovered.
 *
 * `useLinkStatus` does report the pending state, but only inside the `<Link>`
 * that was clicked. This module is the one-hop bridge from there to a
 * page-level overlay: the clicked link publishes, the overlay subscribes.
 *
 * A counter rather than a boolean, so two links resolving out of order cannot
 * clear an overlay that another navigation still needs.
 */
let count = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function setNavPending(pending: boolean): void {
  count = Math.max(0, count + (pending ? 1 : -1));
  emit();
}

export function subscribeNavPending(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getNavPending = (): boolean => count > 0;

/** The server never has a navigation in flight. */
export const getNavPendingServer = (): boolean => false;
