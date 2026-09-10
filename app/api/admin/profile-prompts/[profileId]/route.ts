import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/profile-prompts/${profileId}`, { method: 'PUT', body: parsed.body });
}
