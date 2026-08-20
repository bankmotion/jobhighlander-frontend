import { LoadingView } from '@/app/components/loading-view';

/** Covers every admin screen that is a table in one panel — users, keywords,
 *  scrape status, scraper settings. Segments with a different shape (bidders,
 *  templates) override this with their own `loading.tsx`. */
export default function Loading() {
  return <LoadingView variant="table" rows={6} />;
}
