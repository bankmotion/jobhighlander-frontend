import { proxy } from '@/lib/proxy';

/**
 * The individual calls behind the totals. Super admin only, enforced by the
 * backend and relayed here.
 *
 * Same allow-list shape as the summary handler, plus paging. Copying named
 * parameters rather than forwarding the whole query string keeps a future
 * backend parameter from being reachable through this handler before anyone
 * decides it should be.
 */
const ALLOWED = ['days', 'userId', 'profileId', 'limit', 'offset'] as const;

export async function GET(req: Request) {
  const from = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = from.get(key);
    if (value) q.set(key, value);
  }
  return proxy(`/api/ai-usage/calls?${q.toString()}`);
}
