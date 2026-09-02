import { proxy } from '@/lib/proxy';

// Allow-listed rather than forwarded wholesale, so a hand-crafted URL cannot
// smuggle `userId` through and read someone else's spend on the /me endpoint.
const ALLOWED = ['days', 'preset', 'from', 'to'] as const;

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = src.get(key);
    if (value) q.set(key, value);
  }
  // Nothing recognised means the caller sent no range at all; the server's own
  // default applies rather than a second, possibly different, default here.
  return proxy(`/api/ai-usage/me?${q.toString()}`);
}
