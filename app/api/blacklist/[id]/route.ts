import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/blacklist/${id}`, { method: 'PATCH', body: parsed.body });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return proxy(`/api/blacklist/${id}`, { method: 'DELETE' });
}
