import { proxy } from '@/lib/proxy';

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get('status');
  return proxy(`/api/billing/top-ups/all${status ? `?status=${encodeURIComponent(status)}` : ''}`);
}
