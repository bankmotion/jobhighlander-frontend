import { proxy } from '@/lib/proxy';

// The job drawer resolves a timeline from the browser, so this pairing needs a
// route handler. The server-side pages call the backend directly and never go
// through here.
export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams;
  const jobId = qs.get('jobId') ?? '';
  const profileId = qs.get('profileId') ?? '';
  return proxy(`/api/interviews/for-job?jobId=${jobId}&profileId=${profileId}`);
}
