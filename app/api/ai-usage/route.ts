import { proxy } from '@/lib/proxy';

export async function GET(req: Request) {
  const days = new URL(req.url).searchParams.get('days') ?? '30';
  return proxy(`/api/ai-usage/me?days=${encodeURIComponent(days)}`);
}
