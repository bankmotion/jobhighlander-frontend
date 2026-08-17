import { LoadingView } from '@/app/components/loading-view';

/** Suspense fallback for every route under `/` — shows the loading bar +
 *  skeleton in the content area (sidebar/topbar persist) while a page fetches. */
export default function Loading() {
  return <LoadingView />;
}
