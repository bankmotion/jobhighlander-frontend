import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Rename, recolour, reorder or archive — body: any subset. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/stage-types/${id}`, { method: 'PUT', body: parsed.body });
}

/** Delete when unused, archive when in use. The reply says which happened. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/stage-types/${id}`, { method: 'DELETE' });
}
