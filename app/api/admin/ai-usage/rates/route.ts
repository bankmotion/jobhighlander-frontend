import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function GET() {
  return proxy('/api/ai-usage/rates');
}

export async function PUT(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/ai-usage/rates', { method: 'PUT', body: parsed.body });
}
