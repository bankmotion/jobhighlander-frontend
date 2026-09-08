import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Create a bidder account. Admin-level; the backend enforces the role. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/auth/users', { method: 'POST', body: parsed.body });
}
