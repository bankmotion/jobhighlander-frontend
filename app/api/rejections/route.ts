import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Record or amend a rejection. The reason is required by the backend. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/rejections', { method: 'POST', body: parsed.body });
}

/** Back to active. */
export async function DELETE(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  return proxy(`/api/rejections?${qs}`, { method: 'DELETE' });
}
