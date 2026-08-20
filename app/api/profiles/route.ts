import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function GET() {
  return proxy('/api/profiles');
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/profiles', { method: 'POST', body: parsed.body });
}
