import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/profiles/${id}`);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/profiles/${id}`, { method: 'PUT', body: parsed.body });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/profiles/${id}`, { method: 'DELETE' });
}
