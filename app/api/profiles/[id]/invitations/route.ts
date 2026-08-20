import { proxy } from '@/lib/proxy';
import { parseJsonBody } from '@/lib/http';

/** Who this profile is shared with. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxy(`/api/profiles/${id}/invitations`);
}

/** Invite a user to use this profile — body: { userId }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  return proxy(`/api/profiles/${id}/invitations`, { method: 'POST', body: parsed.body });
}
