import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Discard a job for a profile — body: { jobId, profileId }. Idempotent. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/discards', { method: 'POST', body: parsed.body });
}

/** Restore a discarded job — query: ?jobId=&profileId=. */
export async function DELETE(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/discards?${qs}`, { method: 'DELETE' });
}
