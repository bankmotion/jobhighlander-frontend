import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** What each profile is approved for. Super admin only; enforced by the backend. */
export async function GET() {
  return proxy('/api/grants');
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/grants', { method: 'POST', body: parsed.body });
}
