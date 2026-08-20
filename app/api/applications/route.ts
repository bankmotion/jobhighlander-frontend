import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Mark a job as applied — body: { jobId, profileId }. Idempotent. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/applications', { method: 'POST', body: parsed.body });
}

/** Undo a mark — query: ?jobId=&profileId=. */
export async function DELETE(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/applications?${qs}`, { method: 'DELETE' });
}
