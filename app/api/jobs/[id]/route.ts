import { proxy } from '@/lib/proxy';

/**
 * One posting, for client-side readers.
 *
 * The pages fetch jobs on the SERVER via `lib/api.ts`; this exists for the
 * calendar's slide-over, which cannot — it opens on a click, long after the
 * server render, and prefetching every visible panel's full description would
 * mean shipping a month of job descriptions to render a grid of time chips.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/jobs/${id}`);
}
