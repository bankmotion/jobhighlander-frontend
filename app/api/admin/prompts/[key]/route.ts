import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Save a prompt edit. An empty body resets it to the shipped default. */
export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/prompts/${key}`, { method: 'PUT', body: parsed.body });
}
