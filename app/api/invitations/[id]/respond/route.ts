import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/invitations/${id}/respond`, { method: 'POST', body: parsed.body });
}
