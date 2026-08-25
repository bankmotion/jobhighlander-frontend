import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Update a step — body: { title?, result?, stageTypeIds? }. */
export async function PATCH(req: Request, { params }: { params: Promise<{ stepId: string }> }) {
  const { stepId } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/interviews/steps/${stepId}`, { method: 'PATCH', body: parsed.body });
}

/** Delete a step; its panels go with it. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ stepId: string }> }) {
  const { stepId } = await params;
  return proxy(`/api/interviews/steps/${stepId}`, { method: 'DELETE' });
}
