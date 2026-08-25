import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** The catalogue with usage counts (super admin screen). */
export async function GET() {
  return proxy('/api/stage-types?includeArchived=1');
}

/** Add a badge — body: { name, color?, sortOrder? }. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/stage-types', { method: 'POST', body: parsed.body });
}
