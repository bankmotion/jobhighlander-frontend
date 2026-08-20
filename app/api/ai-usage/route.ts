import { proxy } from '@/lib/proxy';

/** The caller's own spend. The backend scopes it to the token's user — this
 *  handler deliberately forwards only `days`, never a user id. */
export async function GET(req: Request) {
  const days = new URL(req.url).searchParams.get('days') ?? '30';
  return proxy(`/api/ai-usage/me?days=${encodeURIComponent(days)}`);
}
