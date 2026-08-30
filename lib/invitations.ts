import type { InvitationStatus, ReceivedInvitation } from './types';

export function invitationProfileName(inv: ReceivedInvitation): string {
  const p = inv.profile;
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
}

export type RespondResult = { ok: true } | { ok: false; error: string };

export async function respondToInvitation(
  id: number,
  status: Exclude<InvitationStatus, 'pending'>,
): Promise<RespondResult> {
  try {
    const res = await fetch(`/api/invitations/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return { ok: false, error: data?.error ?? `Could not answer the invitation (${res.status})` };
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
}
