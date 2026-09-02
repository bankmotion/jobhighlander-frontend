import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/billing/top-ups/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: parsed.body,
  });
}
