import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Update a panel. An absent key leaves the field alone; null clears it. */
export async function PATCH(req: Request, { params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/interviews/panels/${panelId}`, { method: 'PATCH', body: parsed.body });
}

/** Delete a panel. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  return proxy(`/api/interviews/panels/${panelId}`, { method: 'DELETE' });
}
