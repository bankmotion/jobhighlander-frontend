import { proxy } from '@/lib/proxy';
import { displayZone } from '@/lib/zone.server';

const ALLOWED = ['days', 'preset', 'from', 'to', 'userId', 'profileId', 'limit', 'offset'] as const;

export async function GET(req: Request) {
  const from = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = from.get(key);
    if (value) q.set(key, value);
  }
  // Taken from the cookie here rather than accepted from the query: this route
  // already has the request, and a client that forgot to send it would get a
  // UTC day back while showing local times around it.
  q.set('tz', await displayZone());
  return proxy(`/api/ai-usage/calls?${q.toString()}`);
}
