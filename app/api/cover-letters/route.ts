import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** The saved letter for ?jobId=&profileId=, or null. */
export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/cover-letters?${qs}`);
}

/** Generate or regenerate. 409 when no tailored resume exists yet. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/cover-letters', { method: 'POST', body: parsed.body });
}

/** Save a hand edit. */
export async function PUT(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/cover-letters', { method: 'PUT', body: parsed.body });
}
