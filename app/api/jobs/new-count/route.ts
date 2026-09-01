import { proxy } from '@/lib/proxy';

// Polled from the job list every five minutes. The whole query string is
// forwarded so the count is filtered exactly as the visible list is.
export async function GET(req: Request) {
  const qs = new URL(req.url).search;
  return proxy(`/api/jobs/new-count${qs}`);
}
