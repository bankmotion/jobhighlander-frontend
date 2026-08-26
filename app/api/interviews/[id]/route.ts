import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** One timeline, for the calendar's slide-over — which reads it on a click. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/interviews/${id}`);
}

/** Move the process to a new status — body: { status }. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/interviews/${id}`, { method: 'PATCH', body: parsed.body });
}

/** Delete the timeline and everything under it. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/interviews/${id}`, { method: 'DELETE' });
}
