import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function POST(req: Request, { params }: { params: Promise<{ stepId: string }> }) {
  const { stepId } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/interviews/steps/${stepId}/panels`, { method: 'POST', body: parsed.body });
}
