import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/applications', { method: 'POST', body: parsed.body });
}

export async function DELETE(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/applications?${qs}`, { method: 'DELETE' });
}
