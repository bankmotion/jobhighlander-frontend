import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/interviews/${id}`);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/interviews/${id}`, { method: 'PATCH', body: parsed.body });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/interviews/${id}`, { method: 'DELETE' });
}
