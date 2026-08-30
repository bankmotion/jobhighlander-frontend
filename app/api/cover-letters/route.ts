import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/cover-letters?${qs}`);
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/cover-letters', { method: 'POST', body: parsed.body });
}

export async function PUT(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/cover-letters', { method: 'PUT', body: parsed.body });
}
