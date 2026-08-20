import { proxy } from '@/lib/proxy';

/** Withdraw an invitation, or revoke an accepted one. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params;
  return proxy(`/api/profiles/${id}/invitations/${userId}`, { method: 'DELETE' });
}
