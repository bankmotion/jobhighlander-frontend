import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function PATCH(req: Request, { params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/interviews/panels/${panelId}`, { method: 'PATCH', body: parsed.body });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  return proxy(`/api/interviews/panels/${panelId}`, { method: 'DELETE' });
}
