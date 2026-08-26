import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** The log for one (job, profile) — query: ?jobId=&profileId=. */
export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/job-queries?${qs}`);
}

/** Ask a question — body: { jobId, profileId, question }. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/job-queries', { method: 'POST', body: parsed.body });
}
