import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Insert a step — body: { position?, title?, stageTypeIds? }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/interviews/${id}/steps`, { method: 'POST', body: parsed.body });
}
