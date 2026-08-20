import { proxy } from '@/lib/proxy';

/**
 * Every user's spend. Super admin only — enforced by the backend, which answers
 * 403 to anyone else, and relayed here unchanged by `proxy`.
 *
 * Forwards the caller's filter verbatim rather than reconstructing it. Unlike
 * `/api/ai-usage`, a user id here is legitimate: the backend has already
 * decided this caller may read every row, so `userId` narrows a view instead of
 * choosing a victim. That difference is the whole reason this is a separate
 * path from the `/me` one instead of a flag on it.
 */
const ALLOWED = ['days', 'userId', 'profileId'] as const;

export async function GET(req: Request) {
  const from = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = from.get(key);
    if (value) q.set(key, value);
  }
  return proxy(`/api/ai-usage/all?${q.toString()}`);
}
