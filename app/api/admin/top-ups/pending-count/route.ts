import { proxy } from '@/lib/proxy';

export async function GET() {
  return proxy('/api/billing/top-ups/pending-count');
}
