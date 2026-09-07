import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function GET(req: Request) {
  const profileId = new URL(req.url).searchParams.get('profileId');
  return proxy(`/api/blacklist${profileId ? `?profileId=${profileId}` : ''}`);
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy('/api/blacklist', { method: 'POST', body: parsed.body });
}
