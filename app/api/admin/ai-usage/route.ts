import { proxy } from '@/lib/proxy';

const ALLOWED = ['days', 'preset', 'from', 'to', 'userId', 'profileId'] as const;

export async function GET(req: Request) {
  const from = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = from.get(key);
    if (value) q.set(key, value);
  }
  return proxy(`/api/ai-usage/all?${q.toString()}`);
}
