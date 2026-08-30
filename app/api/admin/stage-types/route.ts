import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function GET() {
  return proxy('/api/stage-types?includeArchived=1');
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/stage-types', { method: 'POST', body: parsed.body });
}
